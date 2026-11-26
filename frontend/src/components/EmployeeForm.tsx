import { useState, type FormEvent } from 'react';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../constants';
import type { EmployeeInput } from '../types/employee';
import { validateEmployee, type EmployeeFormErrors } from '../utils/validation';
import { Spinner } from './Spinner';

export const EMPTY_EMPLOYEE: EmployeeInput = {
  name: '',
  email: '',
  department: '',
  designation: '',
  joiningDate: '',
  status: 'ACTIVE',
};

interface EmployeeFormProps {
  initialValues?: EmployeeInput;
  submitLabel: string;
  submitting?: boolean;
  /** Field errors returned by the API, keyed by field name. */
  serverErrors?: EmployeeFormErrors;
  onSubmit: (values: EmployeeInput) => void | Promise<void>;
  onCancel?: () => void;
}

type Field = keyof EmployeeInput;

export function EmployeeForm({
  initialValues = EMPTY_EMPLOYEE,
  submitLabel,
  submitting = false,
  serverErrors = {},
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeInput>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const clientErrors = validateEmployee(values);
  const errorFor = (field: Field): string | undefined =>
    (touched[field] || submitAttempted ? clientErrors[field] : undefined) ?? serverErrors[field];

  const update = (field: Field, value: string) => setValues((v) => ({ ...v, [field]: value }));
  const blur = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (Object.keys(clientErrors).length > 0) return;
    await onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      designation: values.designation.trim(),
    });
  };

  const inputClass = (field: Field) => `input ${errorFor(field) ? 'input-error' : ''}`;
  const describedBy = (field: Field) => (errorFor(field) ? `${field}-error` : undefined);
  const fieldError = (field: Field) =>
    errorFor(field) ? (
      <p id={`${field}-error`} className="mt-1 text-xs text-red-600">
        {errorFor(field)}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            className={inputClass('name')}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            onBlur={() => blur('name')}
            aria-invalid={Boolean(errorFor('name'))}
            aria-describedby={describedBy('name')}
            placeholder="Jane Doe"
            autoComplete="name"
          />
          {fieldError('name')}
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            className={inputClass('email')}
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            onBlur={() => blur('email')}
            aria-invalid={Boolean(errorFor('email'))}
            aria-describedby={describedBy('email')}
            placeholder="jane.doe@company.com"
            autoComplete="email"
          />
          {fieldError('email')}
        </div>

        <div>
          <label htmlFor="department" className="label">Department</label>
          <select
            id="department"
            className={inputClass('department')}
            value={values.department}
            onChange={(e) => update('department', e.target.value)}
            onBlur={() => blur('department')}
            aria-invalid={Boolean(errorFor('department'))}
            aria-describedby={describedBy('department')}
          >
            <option value="">Select a department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {fieldError('department')}
        </div>

        <div>
          <label htmlFor="designation" className="label">Designation</label>
          <input
            id="designation"
            className={inputClass('designation')}
            value={values.designation}
            onChange={(e) => update('designation', e.target.value)}
            onBlur={() => blur('designation')}
            aria-invalid={Boolean(errorFor('designation'))}
            aria-describedby={describedBy('designation')}
            placeholder="Software Engineer"
          />
          {fieldError('designation')}
        </div>

        <div>
          <label htmlFor="joiningDate" className="label">Joining date</label>
          <input
            id="joiningDate"
            type="date"
            className={inputClass('joiningDate')}
            value={values.joiningDate}
            onChange={(e) => update('joiningDate', e.target.value)}
            onBlur={() => blur('joiningDate')}
            aria-invalid={Boolean(errorFor('joiningDate'))}
            aria-describedby={describedBy('joiningDate')}
          />
          {fieldError('joiningDate')}
        </div>

        <div>
          <label htmlFor="status" className="label">Employment status</label>
          <select
            id="status"
            className={inputClass('status')}
            value={values.status}
            onChange={(e) => update('status', e.target.value)}
            onBlur={() => blur('status')}
          >
            {EMPLOYEE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {fieldError('status')}
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
