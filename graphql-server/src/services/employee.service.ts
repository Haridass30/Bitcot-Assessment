import type {
  CreateEmployeeInput,
  Employee,
  EmployeeFilter,
  UpdateEmployeeInput,
} from '../models/employee.js';
import type { EmployeeRepository } from '../repositories/employee.repository.js';
import { NotFoundError } from '../utils/errors.js';
import {
  validateCreateEmployee,
  validateFilter,
  validateId,
  validateUpdateEmployee,
} from '../validation/employee.validation.js';

/**
 * Employee business operations.
 *
 * This class has no dependency on Apollo, Express or HTTP. Each public method
 * maps 1:1 to a future AWS Lambda function (listEmployees, getEmployee,
 * createEmployee, updateEmployee, deleteEmployee): a Lambda handler only needs
 * to build a repository from a pool and call the corresponding method.
 */
export class EmployeeService {
  constructor(private readonly repository: EmployeeRepository) {}

  async listEmployees(filter?: EmployeeFilter | null): Promise<Employee[]> {
    return this.repository.findAll(validateFilter(filter));
  }

  async getEmployee(id: string): Promise<Employee | null> {
    return this.repository.findById(validateId(id));
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    return this.repository.create(validateCreateEmployee(input));
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const employeeId = validateId(id);
    const changes = validateUpdateEmployee(input);
    const updated = await this.repository.update(employeeId, changes);
    if (!updated) throw new NotFoundError(`Employee with ID ${employeeId} was not found.`);
    return updated;
  }

  /** Returns the ID of the deleted employee. */
  async deleteEmployee(id: string): Promise<string> {
    const employeeId = validateId(id);
    const deleted = await this.repository.delete(employeeId);
    if (!deleted) throw new NotFoundError(`Employee with ID ${employeeId} was not found.`);
    return employeeId;
  }
}
