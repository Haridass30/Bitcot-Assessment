import { useMemo } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { GET_EMPLOYEES } from '../graphql/employees';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { LoadingState } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errors';

const RECENT_LIMIT = 5;
const icon = { viewBox: '0 0 24 24', className: 'h-6 w-6', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;

export function DashboardPage() {
  const { data, loading, error, refetch } = useQuery(GET_EMPLOYEES);
  const employees = useMemo(() => data?.employees ?? [], [data]);

  const stats = useMemo(() => {
    const byDepartment = new Map<string, number>();
    for (const e of employees) byDepartment.set(e.department, (byDepartment.get(e.department) ?? 0) + 1);
    return {
      total: employees.length,
      active: employees.filter((e) => e.status === 'ACTIVE').length,
      onLeave: employees.filter((e) => e.status === 'ON_LEAVE').length,
      departments: [...byDepartment.entries()].sort((a, b) => b[1] - a[1]),
      recent: [...employees].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, RECENT_LIMIT),
    };
  }, [employees]);

  const header = (
    <PageHeader
      title="Dashboard"
      description="Overview of your organization's workforce."
      actions={<Link to="/employees/new" className="btn-primary">Add employee</Link>}
    />
  );

  if (loading && !data) return <>{header}<LoadingState message="Loading dashboard…" /></>;
  if (error && !data) return <>{header}<ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} /></>;

  return (
    <>
      {header}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total employees"
          value={stats.total}
          accent="bg-indigo-50 text-indigo-600"
          icon={<svg {...icon}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.7.8 2.9 2.5 3.5 5.2" /></svg>}
        />
        <StatCard
          label="Active employees"
          value={stats.active}
          hint={stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of workforce` : undefined}
          accent="bg-emerald-50 text-emerald-600"
          icon={<svg {...icon}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>}
        />
        <StatCard
          label="Departments"
          value={stats.departments.length}
          accent="bg-sky-50 text-sky-600"
          icon={<svg {...icon}><path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" /></svg>}
        />
        <StatCard
          label="On leave"
          value={stats.onLeave}
          accent="bg-amber-50 text-amber-600"
          icon={<svg {...icon}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="recent-heading" className="text-base font-semibold text-slate-900">Recently added employees</h2>
            <Link to="/employees" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          {stats.recent.length === 0 ? (
            <EmptyState
              title="No employees yet"
              description="Add your first employee to see them here."
              action={<Link to="/employees/new" className="btn-primary">Add employee</Link>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recent.map((e) => (
                <li key={e.id}>
                  <Link to={`/employees/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar name={e.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{e.name}</p>
                      <p className="truncate text-xs text-slate-500">{e.designation} · {e.department}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <StatusBadge status={e.status} />
                      <p className="mt-1 text-xs text-slate-400">Joined {formatDate(e.joiningDate)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="departments-heading">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 id="departments-heading" className="text-base font-semibold text-slate-900">Employees by department</h2>
          </div>
          {stats.departments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No department data yet.</p>
          ) : (
            <ul className="space-y-4 px-5 py-4">
              {stats.departments.map(([department, count]) => (
                <li key={department}>
                  <div className="mb-1 flex justify-between text-sm">
                    <Link to={`/employees?department=${encodeURIComponent(department)}`} className="text-slate-700 hover:text-indigo-600">
                      {department}
                    </Link>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(count / stats.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
