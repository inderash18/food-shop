import { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        {icon ?? <PackageOpen className="h-7 w-7 text-gray-400" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
