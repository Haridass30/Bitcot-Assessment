export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  /** Calendar date in YYYY-MM-DD format. */
  joiningDate: string;
  status: EmployeeStatus;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** ISO-8601 timestamp. */
  updatedAt: string;
}

export interface EmployeeInput {
  name: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: EmployeeStatus;
}

export interface EmployeeFilter {
  search?: string;
  department?: string;
  status?: EmployeeStatus;
}
