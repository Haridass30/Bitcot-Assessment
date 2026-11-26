import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  accent: string;
}

export function StatCard({ label, value, hint, icon, accent }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
