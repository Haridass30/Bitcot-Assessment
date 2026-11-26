import { describe, expect, it } from 'vitest';
import {
  validateCreateEmployee,
  validateFilter,
  validateId,
  validateUpdateEmployee,
} from '../../src/validation/employee.validation.js';
import { ValidationError } from '../../src/utils/errors.js';
import { validEmployeeInput } from '../helpers/inMemoryEmployeeRepository.js';

const NOW = new Date('2026-06-01T00:00:00Z');

function fieldErrors(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).fields ?? {};
  }
  throw new Error('Expected a ValidationError');
}

describe('validateCreateEmployee', () => {
  it('normalises valid input (trim, collapse whitespace, lowercase email, default status)', () => {
    const { status: _omit, ...input } = validEmployeeInput({
      name: '  Jane    Doe ',
      email: ' Jane.Doe@Example.COM ',
      designation: ' Senior   Engineer ',
    });
    expect(validateCreateEmployee(input, NOW)).toEqual({
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      department: 'Engineering',
      designation: 'Senior Engineer',
      joiningDate: '2024-01-15',
      status: 'ACTIVE',
    });
  });

  it('reports every invalid field at once', () => {
    const errors = fieldErrors(() =>
      validateCreateEmployee({ name: '', email: 'not-an-email', department: 'Space', designation: 'x', joiningDate: 'tomorrow' }, NOW),
    );
    expect(Object.keys(errors).sort()).toEqual(['department', 'designation', 'email', 'joiningDate', 'name']);
  });

  it.each([
    ['J', 'between 2 and 100'],
    ['A'.repeat(101), 'between 2 and 100'],
    ['Robert); DROP TABLE employees;--', 'may only contain'],
    ['123 Smith', 'may only contain'],
  ])('rejects name %j', (name, message) => {
    expect(fieldErrors(() => validateCreateEmployee(validEmployeeInput({ name }), NOW)).name).toContain(message);
  });

  it('accepts names with accents, apostrophes and hyphens', () => {
    expect(validateCreateEmployee(validEmployeeInput({ name: "Zoë O'Brien-Núñez" }), NOW).name).toBe("Zoë O'Brien-Núñez");
  });

  it.each(['2024-02-30', '2023-13-01', '24-01-01', '2024/01/01'])('rejects invalid date %s', (joiningDate) => {
    expect(fieldErrors(() => validateCreateEmployee(validEmployeeInput({ joiningDate }), NOW)).joiningDate).toBeDefined();
  });

  it('accepts a leap day and rejects dates before 1970 or over a year ahead', () => {
    expect(validateCreateEmployee(validEmployeeInput({ joiningDate: '2024-02-29' }), NOW).joiningDate).toBe('2024-02-29');
    expect(fieldErrors(() => validateCreateEmployee(validEmployeeInput({ joiningDate: '1969-12-31' }), NOW)).joiningDate).toContain('1970');
    expect(fieldErrors(() => validateCreateEmployee(validEmployeeInput({ joiningDate: '2027-06-02' }), NOW)).joiningDate).toContain('future');
    expect(validateCreateEmployee(validEmployeeInput({ joiningDate: '2027-06-01' }), NOW).joiningDate).toBe('2027-06-01');
  });

  it('rejects an unknown status', () => {
    const input = { ...validEmployeeInput(), status: 'RETIRED' as never };
    expect(fieldErrors(() => validateCreateEmployee(input, NOW)).status).toBeDefined();
  });
});

describe('validateUpdateEmployee', () => {
  it('returns only provided fields and ignores nulls', () => {
    expect(validateUpdateEmployee({ status: 'ON_LEAVE', name: null as never }, NOW)).toEqual({ status: 'ON_LEAVE' });
  });

  it('requires at least one field', () => {
    expect(() => validateUpdateEmployee({}, NOW)).toThrow('At least one field');
  });

  it('validates provided fields', () => {
    expect(fieldErrors(() => validateUpdateEmployee({ email: 'bad' }, NOW)).email).toBeDefined();
  });
});

describe('validateFilter', () => {
  it('drops empty values and trims search', () => {
    expect(validateFilter({ search: '  ann ', department: '' })).toEqual({ search: 'ann' });
    expect(validateFilter(null)).toEqual({});
  });

  it('rejects overly long search terms', () => {
    expect(fieldErrors(() => validateFilter({ search: 'x'.repeat(101) })).search).toBeDefined();
  });
});

describe('validateId', () => {
  it.each(['1', '42', ' 7 '])('accepts %j', (id) => expect(validateId(id)).toBe(id.trim()));
  it.each(['0', '-1', 'abc', '1.5', '', '99999999999', "1 OR 1=1"])('rejects %j', (id) => {
    expect(() => validateId(id)).toThrow(ValidationError);
  });
});
