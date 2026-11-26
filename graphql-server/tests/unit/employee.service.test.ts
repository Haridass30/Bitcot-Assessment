import { beforeEach, describe, expect, it } from 'vitest';
import { EmployeeService } from '../../src/services/employee.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../../src/utils/errors.js';
import { InMemoryEmployeeRepository, validEmployeeInput } from '../helpers/inMemoryEmployeeRepository.js';

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    service = new EmployeeService(new InMemoryEmployeeRepository());
  });

  describe('createEmployee', () => {
    it('creates an employee with normalised data and timestamps', async () => {
      const employee = await service.createEmployee(validEmployeeInput({ email: 'JANE@Example.com' }));
      expect(employee).toMatchObject({ id: '1', name: 'Jane Doe', email: 'jane@example.com', status: 'ACTIVE' });
      expect(employee.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('defaults status to ACTIVE when omitted', async () => {
      const { status: _omit, ...input } = validEmployeeInput();
      expect((await service.createEmployee(input)).status).toBe('ACTIVE');
    });

    it('rejects invalid input without touching the repository', async () => {
      await expect(service.createEmployee(validEmployeeInput({ email: 'nope' }))).rejects.toBeInstanceOf(ValidationError);
      expect(await service.listEmployees()).toHaveLength(0);
    });

    it('rejects a duplicate email (case-insensitive)', async () => {
      await service.createEmployee(validEmployeeInput());
      await expect(service.createEmployee(validEmployeeInput({ email: 'JANE.DOE@example.com' }))).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('listEmployees', () => {
    beforeEach(async () => {
      await service.createEmployee(validEmployeeInput({ name: 'Alice Smith', email: 'alice@example.com', department: 'Engineering' }));
      await service.createEmployee(validEmployeeInput({ name: 'Bob Jones', email: 'bob@example.com', department: 'Sales', status: 'INACTIVE' }));
      await service.createEmployee(validEmployeeInput({ name: 'Alicia Keys', email: 'alicia@example.com', department: 'Sales' }));
    });

    it('returns all employees, newest first', async () => {
      expect((await service.listEmployees()).map((e) => e.name)).toEqual(['Alicia Keys', 'Bob Jones', 'Alice Smith']);
    });

    it('searches by name (case-insensitive, partial)', async () => {
      expect((await service.listEmployees({ search: 'ALIC' })).map((e) => e.name)).toEqual(['Alicia Keys', 'Alice Smith']);
    });

    it('filters by department and combines with search and status', async () => {
      expect(await service.listEmployees({ department: 'Sales' })).toHaveLength(2);
      expect((await service.listEmployees({ department: 'Sales', search: 'ali' })).map((e) => e.name)).toEqual(['Alicia Keys']);
      expect((await service.listEmployees({ status: 'INACTIVE' })).map((e) => e.name)).toEqual(['Bob Jones']);
    });
  });

  describe('getEmployee', () => {
    it('returns the employee or null', async () => {
      const created = await service.createEmployee(validEmployeeInput());
      expect(await service.getEmployee(created.id)).toEqual(created);
      expect(await service.getEmployee('999')).toBeNull();
    });

    it('rejects malformed IDs', async () => {
      await expect(service.getEmployee('abc')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('updateEmployee', () => {
    it('updates only the provided fields', async () => {
      const created = await service.createEmployee(validEmployeeInput());
      const updated = await service.updateEmployee(created.id, { designation: 'Staff Engineer', status: 'ON_LEAVE' });
      expect(updated).toMatchObject({ name: 'Jane Doe', designation: 'Staff Engineer', status: 'ON_LEAVE' });
      expect(updated.updatedAt > created.updatedAt).toBe(true);
    });

    it('throws NotFoundError for a missing employee', async () => {
      await expect(service.updateEmployee('404', { name: 'Ghost User' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects an email that belongs to another employee', async () => {
      await service.createEmployee(validEmployeeInput({ email: 'taken@example.com' }));
      const other = await service.createEmployee(validEmployeeInput({ email: 'other@example.com' }));
      await expect(service.updateEmployee(other.id, { email: 'taken@example.com' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('rejects an empty update', async () => {
      const created = await service.createEmployee(validEmployeeInput());
      await expect(service.updateEmployee(created.id, {})).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deleteEmployee', () => {
    it('deletes and returns the ID', async () => {
      const created = await service.createEmployee(validEmployeeInput());
      expect(await service.deleteEmployee(created.id)).toBe(created.id);
      expect(await service.getEmployee(created.id)).toBeNull();
    });

    it('throws NotFoundError when the employee does not exist', async () => {
      await expect(service.deleteEmployee('12345')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
