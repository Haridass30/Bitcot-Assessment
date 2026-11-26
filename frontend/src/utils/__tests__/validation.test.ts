import { validateEmployee } from '../validation';
import type { EmployeeInput } from '../../types/employee';

const valid: EmployeeInput = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  department: 'Engineering',
  designation: 'Engineer',
  joiningDate: '2024-01-15',
  status: 'ACTIVE',
};

describe('validateEmployee', () => {
  it('accepts valid input', () => {
    expect(validateEmployee(valid)).toEqual({});
  });

  it.each([
    ['name', { name: 'J' }],
    ['name', { name: 'R2-D2' }],
    ['email', { email: 'jane@' }],
    ['department', { department: 'Space Exploration' }],
    ['designation', { designation: ' ' }],
    ['joiningDate', { joiningDate: '2024-02-30' }],
    ['joiningDate', { joiningDate: '1960-01-01' }],
  ] as const)('flags invalid %s', (field, override) => {
    expect(validateEmployee({ ...valid, ...override })).toHaveProperty(field);
  });
});
