import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { GET_EMPLOYEE } from '../graphql/employees';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/StatusBadge';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import { formatDate, formatDateTime } from '../utils/format';
import { getErrorMessage } from '../utils/errors';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { deleteEmployee, loading: deleting } = useDeleteEmployee();
  const { data, loading, error, refetch } = useQuery(GET_EMPLOYEE, { variables: { id } });

  if (loading && !data) return <LoadingState message="Loading employee…" />;
  if (error && !data) return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  const employee = data?.employee;
  if (!employee) {
    return (
      <ErrorState
        title="Employee not found"
        message="The employee you are looking for does not exist or has been deleted."
      />
    );
  }

  const handleDelete = async () => {
    const ok = await deleteEmployee(employee);
    setConfirmOpen(false);
    if (ok) await navigate('/employees');
  };

  return (
    <>
      <div className="mb-4">
        <Link to="/employees" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Back to employees</Link>
      </div>
      <PageHeader
        title="Employee details"
        actions={
          <>
            <Link to={`/employees/${employee.id}/edit`} className="btn-secondary">Edit</Link>
            <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)}>Delete</button>
          </>
        }
      />
      <div className="card">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
          <Avatar name={employee.name} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">{employee.name}</h2>
            <p className="text-sm text-slate-500">{employee.designation} · {employee.department}</p>
          </div>
          <StatusBadge status={employee.status} />
        </div>
        <dl className="divide-y divide-slate-100 px-6 py-2">
          <Detail label="Employee ID">{employee.id}</Detail>
          <Detail label="Email"><a href={`mailto:${employee.email}`} className="text-indigo-600 hover:underline">{employee.email}</a></Detail>
          <Detail label="Department">{employee.department}</Detail>
          <Detail label="Designation">{employee.designation}</Detail>
          <Detail label="Joining date">{formatDate(employee.joiningDate)}</Detail>
          <Detail label="Employment status"><StatusBadge status={employee.status} /></Detail>
          <Detail label="Created">{formatDateTime(employee.createdAt)}</Detail>
          <Detail label="Last updated">{formatDateTime(employee.updatedAt)}</Detail>
        </dl>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete employee"
        message={`Are you sure you want to delete ${employee.name}? This action cannot be undone.`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
