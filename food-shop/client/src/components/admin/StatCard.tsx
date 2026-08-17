import { ReactNode } from 'react';
import { Skeleton } from '../ui/Skeleton';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'primary' | 'green' | 'amber' | 'red' | 'violet' | 'gray';
  hint?: string;
  loading?: boolean;
}

const tones = {
  primary: 'bg-primary-50 text-primary-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  violet: 'bg-violet-50 text-violet-600',
  gray: 'bg-gray-100 text-gray-600',
};

export function StatCard({ label, value, icon, tone = 'primary', hint, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1.5" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
        <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>{icon}</span>
      </div>
    </div>
  );
}
