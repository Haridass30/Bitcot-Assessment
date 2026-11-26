/**
 * Domain model - independent of GraphQL, Express and MySQL so the same types
 * can be reused by future AWS Lambda handlers.
 */

export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** Allowed departments. Kept in sync with frontend/src/constants.ts. */
export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
] as const;

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  /** YYYY-MM-DD */
  joiningDate: string;
  status: EmployeeStatus;
  /** ISO-8601 */
  createdAt: string;
  /** ISO-8601 */
  updatedAt: string;
}

export interface EmployeeFilter {
  search?: string;
  department?: string;
  status?: EmployeeStatus;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string;
  status?: EmployeeStatus;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

/** Validated + normalised data handed to the repository. */
export type NewEmployee = Required<CreateEmployeeInput>;
export type EmployeeChanges = Partial<NewEmployee>;
