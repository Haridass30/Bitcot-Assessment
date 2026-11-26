import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Employee, EmployeeChanges, EmployeeFilter, EmployeeStatus, NewEmployee } from '../models/employee.js';
import { ConflictError } from '../utils/errors.js';

/**
 * Data-access contract. Business logic depends on this interface, not on
 * MySQL, which keeps the service unit-testable and lets the implementation be
 * swapped (e.g. RDS Proxy, Aurora Data API) without touching business rules.
 */
export interface EmployeeRepository {
  findAll(filter?: EmployeeFilter): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  create(data: NewEmployee): Promise<Employee>;
  update(id: string, changes: EmployeeChanges): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
}

interface EmployeeRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  department: string;
  designation: string;
  joining_date: string;
  status: EmployeeStatus;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = 'id, name, email, department, designation, joining_date, status, created_at, updated_at';

/** Maps domain field names to column names; also acts as an allow-list for dynamic UPDATEs. */
const COLUMN_MAP: Record<keyof NewEmployee, string> = {
  name: 'name',
  email: 'email',
  department: 'department',
  designation: 'designation',
  joiningDate: 'joining_date',
  status: 'status',
};

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    department: row.department,
    designation: row.designation,
    joiningDate: row.joining_date,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function isDuplicateEntry(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY';
}

export class MySqlEmployeeRepository implements EmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(filter: EmployeeFilter = {}): Promise<Employee[]> {
    const where: string[] = [];
    const params: string[] = [];

    if (filter.search) {
      where.push('name LIKE ?');
      params.push(`%${escapeLike(filter.search)}%`);
    }
    if (filter.department) {
      where.push('department = ?');
      params.push(filter.department);
    }
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }

    const sql = `SELECT ${COLUMNS} FROM employees ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC`;
    const [rows] = await this.pool.execute<EmployeeRow[]>(sql, params);
    return rows.map(toEmployee);
  }

  async findById(id: string): Promise<Employee | null> {
    const [rows] = await this.pool.execute<EmployeeRow[]>(`SELECT ${COLUMNS} FROM employees WHERE id = ?`, [id]);
    const row = rows[0];
    return row ? toEmployee(row) : null;
  }

  async create(data: NewEmployee): Promise<Employee> {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(
        `INSERT INTO employees (name, email, department, designation, joining_date, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.name, data.email, data.department, data.designation, data.joiningDate, data.status],
      );
      const created = await this.findById(String(result.insertId));
      if (!created) throw new Error(`Employee ${result.insertId} not found after insert`);
      return created;
    } catch (error) {
      if (isDuplicateEntry(error)) throw duplicateEmail();
      throw error;
    }
  }

  async update(id: string, changes: EmployeeChanges): Promise<Employee | null> {
    const entries = Object.entries(changes) as [keyof NewEmployee, string][];
    if (entries.length > 0) {
      const assignments = entries.map(([field]) => `${COLUMN_MAP[field]} = ?`).join(', ');
      try {
        await this.pool.execute(`UPDATE employees SET ${assignments} WHERE id = ?`, [...entries.map(([, v]) => v), id]);
      } catch (error) {
        if (isDuplicateEntry(error)) throw duplicateEmail();
        throw error;
      }
    }
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>('DELETE FROM employees WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

function duplicateEmail(): ConflictError {
  return new ConflictError('An employee with this email already exists.', {
    email: 'An employee with this email already exists.',
  });
}
