import { DEPARTMENTS } from '../constants';

interface EmployeeFiltersProps {
  search: string;
  department: string;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onClear: () => void;
}

export function EmployeeFilters({ search, department, onSearchChange, onDepartmentChange, onClear }: EmployeeFiltersProps) {
  const hasFilters = search !== '' || department !== '';
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="employee-search" className="sr-only">Search employees by name</label>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="employee-search"
          type="search"
          className="input pl-9"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="sm:w-56">
        <label htmlFor="department-filter" className="sr-only">Filter by department</label>
        <select
          id="department-filter"
          className="input"
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <button type="button" className="btn-ghost" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
