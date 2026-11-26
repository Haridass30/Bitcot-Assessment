import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { GET_EMPLOYEES } from '../graphql/employees';
import { PageHeader } from '../components/PageHeader';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeTable } from '../components/EmployeeTable';
import { LoadingState, Spinner } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import type { Employee } from '../types/employee';
import { getErrorMessage } from '../utils/errors';

export function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const department = searchParams.get('department') ?? '';
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);
  const { deleteEmployee, loading: deleting } = useDeleteEmployee();

  const filter = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(department ? { department } : {}),
  };

  const { data, loading, error, refetch } = useQuery(GET_EMPLOYEES, { variables: { filter } });

  const updateParams = (next: { q?: string; department?: string }) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    setSearchParams(params, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateParams({ q: value.trim() });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteEmployee(pendingDelete);
    setPendingDelete(null);
  };

  const employees = data?.employees ?? [];
  const hasFilters = Boolean(debouncedSearch || department);

  let body;
  if (loading && !data) body = <LoadingState message="Loading employees…" />;
  else if (error && !data) body = <div className="p-4"><ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} /></div>;
  else if (employees.length === 0)
    body = hasFilters ? (
      <EmptyState title="No matching employees" description="Try a different name or department." />
    ) : (
      <EmptyState
        title="No employees yet"
        description="Get started by adding your first employee."
        action={<Link to="/employees/new" className="btn-primary">Add employee</Link>}
      />
    );
  else body = <EmployeeTable employees={employees} onDelete={setPendingDelete} />;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Search, filter and manage employee records."
        actions={<Link to="/employees/new" className="btn-primary">Add employee</Link>}
      />
      <section className="card overflow-hidden">
        <EmployeeFilters
          search={search}
          department={department}
          onSearchChange={handleSearchChange}
          onDepartmentChange={(value) => updateParams({ department: value })}
          onClear={() => {
            setSearch('');
            setSearchParams({}, { replace: true });
          }}
        />
        <div className="flex items-center justify-between px-5 py-2 text-xs text-slate-500">
          <span>
            {data ? `${employees.length} employee${employees.length === 1 ? '' : 's'}` : ' '}
          </span>
          {loading && data && (
            <span className="flex items-center gap-1"><Spinner className="h-3 w-3" /> Updating…</span>
          )}
        </div>
        {body}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete employee"
        message={`Are you sure you want to delete ${pendingDelete?.name ?? 'this employee'}? This action cannot be undone.`}
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
