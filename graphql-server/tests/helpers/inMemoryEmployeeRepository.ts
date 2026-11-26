import type { EmployeeRepository } from '../../src/repositories/employee.repository.js';
import type { Employee, EmployeeChanges, EmployeeFilter, NewEmployee } from '../../src/models/employee.js';
import { ConflictError } from '../../src/utils/errors.js';

/** Test double that mimics MySqlEmployeeRepository semantics (case-insensitive unique email, newest first). */
export class InMemoryEmployeeRepository implements EmployeeRepository {
  private rows = new Map<string, Employee>();
  private nextId = 1;
  private clock = Date.UTC(2025, 0, 1);

  private tick(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  private assertUniqueEmail(email: string, exceptId?: string): void {
    for (const row of this.rows.values()) {
      if (row.id !== exceptId && row.email.toLowerCase() === email.toLowerCase()) {
        throw new ConflictError('An employee with this email already exists.', {
          email: 'An employee with this email already exists.',
        });
      }
    }
  }

  async findAll(filter: EmployeeFilter = {}): Promise<Employee[]> {
    return [...this.rows.values()]
      .filter((e) => !filter.search || e.name.toLowerCase().includes(filter.search.toLowerCase()))
      .filter((e) => !filter.department || e.department === filter.department)
      .filter((e) => !filter.status || e.status === filter.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || Number(b.id) - Number(a.id));
  }

  async findById(id: string): Promise<Employee | null> {
    return this.rows.get(id) ?? null;
  }

  async create(data: NewEmployee): Promise<Employee> {
    this.assertUniqueEmail(data.email);
    const now = this.tick();
    const employee: Employee = { id: String(this.nextId++), ...data, createdAt: now, updatedAt: now };
    this.rows.set(employee.id, employee);
    return employee;
  }

  async update(id: string, changes: EmployeeChanges): Promise<Employee | null> {
    const existing = this.rows.get(id);
    if (!existing) return null;
    if (changes.email) this.assertUniqueEmail(changes.email, id);
    const updated: Employee = { ...existing, ...changes, updatedAt: this.tick() };
    this.rows.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id);
  }
}

export const validEmployeeInput = (overrides: Partial<NewEmployee> = {}): NewEmployee => ({
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  department: 'Engineering',
  designation: 'Software Engineer',
  joiningDate: '2024-01-15',
  status: 'ACTIVE',
  ...overrides,
});
