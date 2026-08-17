import { ReactNode } from 'react';

type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet';

const tones: Record<BadgeTone, string> = {
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  gray: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    PAYMENT_PENDING: { tone: 'amber', label: 'Payment Pending' },
    PAYMENT_PROCESSING: { tone: 'blue', label: 'Processing Payment' },
    PAYMENT_FAILED: { tone: 'red', label: 'Payment Failed' },
    ORDER_CONFIRMED: { tone: 'green', label: 'Confirmed' },
    PREPARING: { tone: 'amber', label: 'Preparing' },
    READY: { tone: 'violet', label: 'Ready' },
    COMPLETED: { tone: 'green', label: 'Completed' },
    CANCELLED: { tone: 'red', label: 'Cancelled' },
    CART: { tone: 'gray', label: 'Cart' },
  };
  const item = map[status] ?? { tone: 'gray' as BadgeTone, label: status };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}
