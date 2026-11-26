import { Link } from 'react-router';
import type { Employee } from '../types/employee';
import { formatDate } from '../utils/format';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';

interface EmployeeTableProps {
  employees: Employee[];
  onDelete: (employee: Employee) => void;
}

function RowActions({ employee, onDelete }: { employee: Employee; onDelete: (e: Employee) => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link to={`/employees/${employee.id}`} className="btn-ghost" aria-label={`View ${employee.name}`}>View</Link>
      <Link to={`/employees/${employee.id}/edit`} className="btn-ghost" aria-label={`Edit ${employee.name}`}>Edit</Link>
      <button
        type="button"
        className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => onDelete(employee)}
        aria-label={`Delete ${employee.name}`}
      >
        Delete
      </button>
    </div>
  );
}

export function EmployeeTable({ employees, onDelete }: EmployeeTableProps) {
  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3">Employee</th>
              <th scope="col" className="px-5 py-3">Department</th>
              <th scope="col" className="px-5 py-3">Designation</th>
              <th scope="col" className="px-5 py-3">Joining date</th>
              <th scope="col" className="px-5 py-3">Status</th>
              <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={employee.name} />
                    <div className="min-w-0">
                      <Link to={`/employees/${employee.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {employee.name}
                      </Link>
                      <p className="truncate text-slate-500">{employee.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-700">{employee.department}</td>
                <td className="px-5 py-3 text-slate-700">{employee.designation}</td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-700">{formatDate(employee.joiningDate)}</td>
                <td className="px-5 py-3"><StatusBadge status={employee.status} /></td>
                <td className="px-5 py-3"><RowActions employee={employee} onDelete={onDelete} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {employees.map((employee) => (
          <li key={employee.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar name={employee.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/employees/${employee.id}`} className="font-medium text-slate-900">
                    {employee.name}
                  </Link>
                  <StatusBadge status={employee.status} />
                </div>
                <p className="truncate text-sm text-slate-500">{employee.email}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {employee.designation} · {employee.department}
                </p>
                <p className="text-xs text-slate-400">Joined {formatDate(employee.joiningDate)}</p>
              </div>
            </div>
            <div className="mt-2"><RowActions employee={employee} onDelete={onDelete} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}
