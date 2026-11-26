import type { Employee } from '../types/employee';

export const makeEmployee = (overrides: Partial<Employee> = {}): Employee & { __typename: 'Employee' } => ({
  __typename: 'Employee',
  id: '1',
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  department: 'Engineering',
  designation: 'Software Engineer',
  joiningDate: '2024-01-15',
  status: 'ACTIVE',
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
  ...overrides,
});
