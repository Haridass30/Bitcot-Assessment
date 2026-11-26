import type { EmployeeService } from '../services/employee.service.js';

export interface GraphQLContext {
  employeeService: EmployeeService;
}
