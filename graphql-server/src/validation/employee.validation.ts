import {
  DEPARTMENTS,
  EMPLOYEE_STATUSES,
  type CreateEmployeeInput,
  type EmployeeChanges,
  type EmployeeFilter,
  type EmployeeStatus,
  type NewEmployee,
  type UpdateEmployeeInput,
} from '../models/employee.js';
import { ValidationError } from '../utils/errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s.'-]*$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[1-9]\d{0,9}$/;
const MAX_SEARCH_LENGTH = 100;

type Errors = Record<string, string>;

function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function validateName(value: unknown, errors: Errors): string {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) errors.name = 'Name is required.';
  else if (name.length < 2 || name.length > 100) errors.name = 'Name must be between 2 and 100 characters.';
  else if (!NAME_PATTERN.test(name)) errors.name = 'Name may only contain letters, spaces, apostrophes, periods and hyphens.';
  return name;
}

function validateEmail(value: unknown, errors: Errors): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email) errors.email = 'Email is required.';
  else if (email.length > 255 || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  return email;
}

function validateDepartment(value: unknown, errors: Errors): string {
  const department = typeof value === 'string' ? value.trim() : '';
  if (!department) errors.department = 'Department is required.';
  else if (!(DEPARTMENTS as readonly string[]).includes(department)) {
    errors.department = `Department must be one of: ${DEPARTMENTS.join(', ')}.`;
  }
  return department;
}

function validateDesignation(value: unknown, errors: Errors): string {
  const designation = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!designation) errors.designation = 'Designation is required.';
  else if (designation.length < 2 || designation.length > 100) {
    errors.designation = 'Designation must be between 2 and 100 characters.';
  }
  return designation;
}

function validateJoiningDate(value: unknown, errors: Errors, now: Date): string {
  const date = typeof value === 'string' ? value.trim() : '';
  if (!date) errors.joiningDate = 'Joining date is required.';
  else if (!isValidCalendarDate(date)) errors.joiningDate = 'Joining date must be a valid date in YYYY-MM-DD format.';
  else {
    const limit = new Date(now);
    limit.setUTCFullYear(limit.getUTCFullYear() + 1);
    if (date < '1970-01-01') errors.joiningDate = 'Joining date cannot be before 1970.';
    else if (date > limit.toISOString().slice(0, 10)) errors.joiningDate = 'Joining date cannot be more than one year in the future.';
  }
  return date;
}

function validateStatus(value: unknown, errors: Errors): EmployeeStatus {
  if (typeof value !== 'string' || !(EMPLOYEE_STATUSES as readonly string[]).includes(value)) {
    errors.status = `Status must be one of: ${EMPLOYEE_STATUSES.join(', ')}.`;
    return 'ACTIVE';
  }
  return value as EmployeeStatus;
}

export function validateCreateEmployee(input: CreateEmployeeInput, now: Date = new Date()): NewEmployee {
  const errors: Errors = {};
  const result: NewEmployee = {
    name: validateName(input.name, errors),
    email: validateEmail(input.email, errors),
    department: validateDepartment(input.department, errors),
    designation: validateDesignation(input.designation, errors),
    joiningDate: validateJoiningDate(input.joiningDate, errors, now),
    status: input.status === undefined ? 'ACTIVE' : validateStatus(input.status, errors),
  };
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return result;
}

export function validateUpdateEmployee(input: UpdateEmployeeInput, now: Date = new Date()): EmployeeChanges {
  const errors: Errors = {};
  const changes: EmployeeChanges = {};
  // `null` from GraphQL means "not provided" for these non-nullable columns.
  if (input.name != null) changes.name = validateName(input.name, errors);
  if (input.email != null) changes.email = validateEmail(input.email, errors);
  if (input.department != null) changes.department = validateDepartment(input.department, errors);
  if (input.designation != null) changes.designation = validateDesignation(input.designation, errors);
  if (input.joiningDate != null) changes.joiningDate = validateJoiningDate(input.joiningDate, errors, now);
  if (input.status != null) changes.status = validateStatus(input.status, errors);

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  if (Object.keys(changes).length === 0) throw new ValidationError({}, 'At least one field must be provided to update.');
  return changes;
}

export function validateFilter(filter: EmployeeFilter | null | undefined): EmployeeFilter {
  if (!filter) return {};
  const errors: Errors = {};
  const result: EmployeeFilter = {};

  const search = filter.search?.trim();
  if (search) {
    if (search.length > MAX_SEARCH_LENGTH) errors.search = `Search must be at most ${MAX_SEARCH_LENGTH} characters.`;
    else result.search = search;
  }
  const department = filter.department?.trim();
  if (department) result.department = department;
  if (filter.status != null) result.status = validateStatus(filter.status, errors);

  if (Object.keys(errors).length > 0) throw new ValidationError(errors, 'Invalid filter.');
  return result;
}

/** IDs are MySQL INT UNSIGNED AUTO_INCREMENT values exposed as GraphQL ID strings. */
export function validateId(id: unknown): string {
  const value = typeof id === 'string' ? id.trim() : typeof id === 'number' ? String(id) : '';
  if (!ID_PATTERN.test(value) || Number(value) > 4294967295) {
    throw new ValidationError({ id: 'Invalid employee ID.' }, 'Invalid employee ID.');
  }
  return value;
}
