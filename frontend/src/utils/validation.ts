import { DEPARTMENTS } from '../constants';
import type { EmployeeInput } from '../types/employee';

export type EmployeeFormErrors = Partial<Record<keyof EmployeeInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s.'-]*$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Client-side validation. Mirrors the server rules so users get instant
 * feedback; the server remains the source of truth.
 */
export function validateEmployee(values: EmployeeInput): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const designation = values.designation.trim();

  if (!name) errors.name = 'Name is required.';
  else if (name.length < 2 || name.length > 100) errors.name = 'Name must be between 2 and 100 characters.';
  else if (!NAME_PATTERN.test(name)) errors.name = 'Name may only contain letters, spaces, apostrophes, periods and hyphens.';

  if (!email) errors.email = 'Email is required.';
  else if (email.length > 255 || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';

  if (!values.department) errors.department = 'Department is required.';
  else if (!(DEPARTMENTS as readonly string[]).includes(values.department)) errors.department = 'Select a valid department.';

  if (!designation) errors.designation = 'Designation is required.';
  else if (designation.length < 2 || designation.length > 100) {
    errors.designation = 'Designation must be between 2 and 100 characters.';
  }

  if (!values.joiningDate) errors.joiningDate = 'Joining date is required.';
  else if (!isValidCalendarDate(values.joiningDate)) errors.joiningDate = 'Enter a valid date.';
  else {
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
    if (values.joiningDate < '1970-01-01') errors.joiningDate = 'Joining date cannot be before 1970.';
    else if (values.joiningDate > oneYearAhead.toISOString().slice(0, 10)) {
      errors.joiningDate = 'Joining date cannot be more than one year in the future.';
    }
  }

  if (!values.status) errors.status = 'Status is required.';

  return errors;
}
