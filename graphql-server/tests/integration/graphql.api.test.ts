/**
 * GraphQL API integration tests: real Express + Apollo Server stack over HTTP,
 * backed by the in-memory repository (no database required).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer, type AppServer } from '../../src/server.js';
import { EmployeeService } from '../../src/services/employee.service.js';
import { InMemoryEmployeeRepository } from '../helpers/inMemoryEmployeeRepository.js';
import { EMPLOYEE_FIELDS, graphql } from '../helpers/graphqlClient.js';

let server: AppServer;
let dbUp = true;
let gql: ReturnType<typeof graphql>;

const CREATE = `mutation Create($input: CreateEmployeeInput!) { createEmployee(input: $input) { ${EMPLOYEE_FIELDS} } }`;
const input = {
  name: 'Grace Hopper',
  email: 'grace@example.com',
  department: 'Engineering',
  designation: 'Principal Engineer',
  joiningDate: '2023-03-01',
};

beforeAll(async () => {
  server = await createServer({
    config: { isProduction: true, corsOrigins: ['https://app.example.com'], introspection: false },
    employeeService: new EmployeeService(new InMemoryEmployeeRepository()),
    checkDatabase: async () => {
      if (!dbUp) throw new Error('connection refused');
    },
  });
  gql = graphql(server.app);
});

afterAll(async () => {
  await server.apollo.stop();
});

describe('GET /health', () => {
  it('returns 200 when the database is reachable', async () => {
    const res = await request(server.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    dbUp = false;
    const res = await request(server.app).get('/health');
    dbUp = true;
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', database: 'down' });
  });
});

describe('Employee CRUD over GraphQL', () => {
  let id: string;

  it('createEmployee returns the new employee with ACTIVE default status', async () => {
    const { status, body } = await gql<{ createEmployee: Record<string, string> }>(CREATE, { input });
    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data?.createEmployee).toMatchObject({ ...input, status: 'ACTIVE' });
    id = body.data!.createEmployee.id!;
  });

  it('employees lists, searches and filters', async () => {
    await gql(CREATE, { input: { ...input, name: 'Alan Turing', email: 'alan@example.com', department: 'Product' } });

    const all = await gql<{ employees: { name: string }[] }>('{ employees { name } }');
    expect(all.body.data?.employees.map((e) => e.name)).toEqual(['Alan Turing', 'Grace Hopper']);

    const search = await gql<{ employees: { name: string }[] }>(
      'query($f: EmployeeFilter) { employees(filter: $f) { name } }',
      { f: { search: 'grace' } },
    );
    expect(search.body.data?.employees).toEqual([{ name: 'Grace Hopper' }]);

    const dept = await gql<{ employees: { name: string }[] }>(
      'query($f: EmployeeFilter) { employees(filter: $f) { name } }',
      { f: { department: 'Product' } },
    );
    expect(dept.body.data?.employees).toEqual([{ name: 'Alan Turing' }]);
  });

  it('employee(id) returns one employee, or null when missing', async () => {
    const found = await gql<{ employee: { email: string } | null }>('query($id: ID!) { employee(id: $id) { email } }', { id });
    expect(found.body.data?.employee).toEqual({ email: 'grace@example.com' });

    const missing = await gql('query { employee(id: "9999") { id } }');
    expect(missing.body.errors).toBeUndefined();
    expect(missing.body.data).toEqual({ employee: null });
  });

  it('updateEmployee applies a partial update', async () => {
    const { body } = await gql<{ updateEmployee: { status: string; designation: string; name: string } }>(
      'mutation($id: ID!, $input: UpdateEmployeeInput!) { updateEmployee(id: $id, input: $input) { name status designation } }',
      { id, input: { status: 'ON_LEAVE', designation: 'Rear Admiral' } },
    );
    expect(body.data?.updateEmployee).toEqual({ name: 'Grace Hopper', status: 'ON_LEAVE', designation: 'Rear Admiral' });
  });

  it('deleteEmployee returns the ID, then NOT_FOUND on repeat', async () => {
    const first = await gql('mutation($id: ID!) { deleteEmployee(id: $id) }', { id });
    expect(first.body.data).toEqual({ deleteEmployee: id });

    const second = await gql('mutation($id: ID!) { deleteEmployee(id: $id) }', { id });
    expect(second.body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

describe('Error handling', () => {
  it('returns BAD_USER_INPUT with per-field messages for invalid input', async () => {
    const { body } = await gql(CREATE, { input: { ...input, email: 'invalid', joiningDate: '2024-02-31' } });
    expect(body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(Object.keys(body.errors?.[0]?.extensions?.fields ?? {}).sort()).toEqual(['email', 'joiningDate']);
  });

  it('returns CONFLICT for a duplicate email', async () => {
    await gql(CREATE, { input: { ...input, email: 'dupe@example.com' } });
    const { body } = await gql(CREATE, { input: { ...input, email: 'DUPE@example.com' } });
    expect(body.errors?.[0]?.extensions).toMatchObject({ code: 'CONFLICT', fields: { email: expect.any(String) } });
  });

  it('rejects invalid enum values at the GraphQL layer', async () => {
    const { status, body } = await gql(CREATE, { input: { ...input, email: 'x@example.com', status: 'RETIRED' } });
    expect(status).toBe(400);
    expect(body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('does not leak stack traces in production mode', async () => {
    const { body } = await gql('query { employee(id: "abc") { id } }');
    expect(body.errors?.[0]?.extensions).toEqual({ code: 'BAD_USER_INPUT', fields: { id: 'Invalid employee ID.' } });
  });

  it('disables introspection when configured', async () => {
    const { body } = await gql('{ __schema { types { name } } }');
    expect(body.errors?.[0]?.extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(server.app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});

describe('CORS', () => {
  it('allows configured origins', async () => {
    const res = await request(server.app)
      .options('/graphql')
      .set('Origin', 'https://app.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('does not allow other origins', async () => {
    const res = await request(server.app)
      .post('/graphql')
      .set('Origin', 'https://evil.example.com')
      .set('Content-Type', 'application/json')
      .send({ query: '{ employees { id } }' });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
