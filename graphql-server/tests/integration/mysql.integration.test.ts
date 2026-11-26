/**
 * End-to-end API tests against a REAL MySQL database (GraphQL -> service ->
 * MySqlEmployeeRepository -> MySQL). Skipped unless INTEGRATION_DB_HOST is set.
 *
 *   INTEGRATION_DB_HOST=127.0.0.1 INTEGRATION_DB_PORT=3307 \
 *   INTEGRATION_DB_USER=employee_app INTEGRATION_DB_PASSWORD=... INTEGRATION_DB_NAME=employee_db \
 *   npm run test:integration
 *
 * The suite only touches rows whose email ends with TEST_DOMAIN and removes them afterwards,
 * but it should still be pointed at a local/disposable database, never production.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { createPool, pingDatabase } from '../../src/db/connection.js';
import { MySqlEmployeeRepository } from '../../src/repositories/employee.repository.js';
import { EmployeeService } from '../../src/services/employee.service.js';
import { createServer, type AppServer } from '../../src/server.js';
import { EMPLOYEE_FIELDS, graphql } from '../helpers/graphqlClient.js';

const env = process.env;
const enabled = Boolean(env.INTEGRATION_DB_HOST);
const TEST_DOMAIN = 'integration-test.invalid';

describe.skipIf(!enabled)('GraphQL API + MySQL integration', () => {
  let pool: Pool;
  let server: AppServer;
  let gql: ReturnType<typeof graphql>;

  const cleanup = () => pool.execute('DELETE FROM employees WHERE email LIKE ?', [`%@${TEST_DOMAIN}`]);
  const input = (local: string, overrides: Record<string, string> = {}) => ({
    name: 'Integration User',
    email: `${local}@${TEST_DOMAIN}`,
    department: 'Operations',
    designation: 'Tester',
    joiningDate: '2024-04-01',
    ...overrides,
  });
  const CREATE = `mutation($input: CreateEmployeeInput!) { createEmployee(input: $input) { ${EMPLOYEE_FIELDS} } }`;

  beforeAll(async () => {
    pool = createPool({
      host: env.INTEGRATION_DB_HOST!,
      port: Number(env.INTEGRATION_DB_PORT ?? 3306),
      user: env.INTEGRATION_DB_USER ?? 'root',
      password: env.INTEGRATION_DB_PASSWORD ?? '',
      database: env.INTEGRATION_DB_NAME ?? 'employee_db',
      connectionLimit: 5,
      ssl: 'false',
    });
    // Ensure the schema exists (the migration is idempotent).
    const migration = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database/migrations/001_create_employees_table.sql');
    await pool.query(await readFile(migration, 'utf8'));
    await cleanup();

    server = await createServer({
      config: { isProduction: false, corsOrigins: ['http://localhost:5173'], introspection: true },
      employeeService: new EmployeeService(new MySqlEmployeeRepository(pool)),
      checkDatabase: () => pingDatabase(pool),
    });
    gql = graphql(server.app);
  });

  afterAll(async () => {
    if (pool) await cleanup();
    await server?.apollo.stop();
    await pool?.end();
  });

  it('reports a healthy database', async () => {
    const { default: request } = await import('supertest');
    const res = await request(server.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('up');
  });

  it('runs the full CRUD lifecycle against MySQL', async () => {
    const created = await gql<{ createEmployee: Record<string, string> }>(CREATE, { input: input('crud', { name: 'Crud Lifecycle' }) });
    expect(created.body.errors).toBeUndefined();
    const employee = created.body.data!.createEmployee;
    expect(employee).toMatchObject({ name: 'Crud Lifecycle', joiningDate: '2024-04-01', status: 'ACTIVE' });
    expect(new Date(employee.createdAt!).toISOString()).toBe(employee.createdAt);

    const fetched = await gql<{ employee: { name: string } }>('query($id: ID!) { employee(id: $id) { name } }', { id: employee.id });
    expect(fetched.body.data?.employee.name).toBe('Crud Lifecycle');

    const updated = await gql<{ updateEmployee: { status: string; joiningDate: string; updatedAt: string } }>(
      'mutation($id: ID!, $input: UpdateEmployeeInput!) { updateEmployee(id: $id, input: $input) { status joiningDate updatedAt } }',
      { id: employee.id, input: { status: 'INACTIVE', joiningDate: '2024-05-20' } },
    );
    expect(updated.body.data?.updateEmployee).toMatchObject({ status: 'INACTIVE', joiningDate: '2024-05-20' });
    expect(updated.body.data!.updateEmployee.updatedAt >= employee.updatedAt!).toBe(true);

    const deleted = await gql('mutation($id: ID!) { deleteEmployee(id: $id) }', { id: employee.id });
    expect(deleted.body.data).toEqual({ deleteEmployee: employee.id });
    const gone = await gql('query($id: ID!) { employee(id: $id) { id } }', { id: employee.id });
    expect(gone.body.data).toEqual({ employee: null });
  });

  it('enforces unique email case-insensitively via the database constraint', async () => {
    await gql(CREATE, { input: input('unique') });
    const dup = await gql(CREATE, { input: input('UNIQUE') });
    expect(dup.body.errors?.[0]?.extensions?.code).toBe('CONFLICT');
  });

  it('searches case-insensitively and treats LIKE wildcards literally', async () => {
    await gql(CREATE, { input: input('search1', { name: 'Zebulon Quartz', department: 'Finance' }) });
    await gql(CREATE, { input: input('search2', { name: 'Zebulon Pike', department: 'Design' }) });
    const query = 'query($f: EmployeeFilter) { employees(filter: $f) { name } }';

    const byName = await gql<{ employees: { name: string }[] }>(query, { f: { search: 'zebulon' } });
    expect(byName.body.data?.employees.map((e) => e.name).sort()).toEqual(['Zebulon Pike', 'Zebulon Quartz']);

    const combined = await gql<{ employees: { name: string }[] }>(query, { f: { search: 'ZEBULON', department: 'Finance' } });
    expect(combined.body.data?.employees).toEqual([{ name: 'Zebulon Quartz' }]);

    const wildcard = await gql<{ employees: { name: string }[] }>(query, { f: { search: '%' } });
    expect(wildcard.body.data?.employees).toEqual([]);
  });
});
