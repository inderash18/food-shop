import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { apiGet, apiPost, getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { formatINR, formatDateTime, timeAgo } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import type { Order } from '../../lib/types';

const cancellable = new Set(['PAYMENT_PENDING', 'ORDER_CONFIRMED', 'PREPARING']);

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => apiGet<{ orders: Order[] }>('/api/orders/mine?limit=50'),
    enabled: !!user,
  });

  const cancel = useMutation({
    mutationFn: (orderId: string) => apiPost<{ order: Order }>(`/api/orders/${orderId}/cancel`),
    onSuccess: (_data, orderId) => {
      toast('success', 'Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err) => toast('error', getErrorMessage(err)),
  });

  if (!user) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-7 w-7 text-gray-400" />}
        title="Log in to see your orders"
        description="Your order history and live tracking will appear here."
        action={
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        }
      />
    );
  }

  if (isLoading) return <ListSkeleton rows={4} />;

  const orders = data?.orders ?? [];

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-7 w-7 text-gray-400" />}
        title="No orders yet"
        description="When you place an order, it will show up here with live tracking."
        action={
          <Link to="/menu">
            <Button>Browse Menu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-gray-900">Your Orders</h1>
      {orders.map((order) => (
        <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <Link to={`/order-confirmation?orderId=${order._id}`} className="block">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">
                  #{order.orderNumber}
                  <span className="text-xs font-medium text-gray-400 ml-2">{formatDateTime(order.createdAt)}</span>
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {order.itemCount} item{order.itemCount > 1 ? 's' : ''} · {formatINR(order.total)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </div>
          </Link>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">{timeAgo(order.createdAt)}</p>
            {cancellable.has(order.status) && (
              <button
                onClick={() => cancel.mutate(order._id)}
                disabled={cancel.isPending}
                className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
