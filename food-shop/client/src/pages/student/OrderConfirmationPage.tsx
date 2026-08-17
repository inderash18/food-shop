import { useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, ChefHat, Package, ShoppingBag, ChevronRight } from 'lucide-react';
import { apiGet } from '../../api/client';
import { formatINR, formatDateTime } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Order } from '../../lib/types';

const steps: { status: Order['status']; label: string; icon: typeof Clock }[] = [
  { status: 'ORDER_CONFIRMED', label: 'Order confirmed', icon: CheckCircle2 },
  { status: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { status: 'READY', label: 'Ready for pickup', icon: Package },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

const rank: Record<Order['status'], number> = {
  CART: 0,
  PAYMENT_PENDING: 0,
  PAYMENT_PROCESSING: 0,
  PAYMENT_FAILED: 0,
  ORDER_CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
  CANCELLED: -1,
};

export function OrderConfirmationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const orderId = sessionStorage.getItem('orderId') ?? searchParams.get('orderId') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiGet<{ order: Order }>(`/api/orders/${orderId}`),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const order = query.state.data?.order;
      if (!order) return false;
      return order.status === 'COMPLETED' || order.status === 'CANCELLED' ? false : 8000;
    },
  });

  useEffect(() => {
    if (!orderId) navigate('/menu', { replace: true });
    return () => {
      sessionStorage.removeItem('orderId');
      sessionStorage.removeItem('orderNumber');
      sessionStorage.removeItem('checkoutRequestId');
      sessionStorage.removeItem('paymentAmount');
    };
  }, [orderId, navigate]);

  useEffect(() => {
    if (data?.order?.status === 'COMPLETED' || data?.order?.status === 'CANCELLED') {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
    }
  }, [data, queryClient]);

  const order = data?.order;

  if (isLoading || !order) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentRank = rank[order.status];
  const confirmed = order.status !== 'PAYMENT_FAILED' && order.status !== 'CANCELLED' && currentRank >= 1;

  return (
    <div className="max-w-md mx-auto space-y-5 pt-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
        {confirmed ? (
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
        ) : (
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="h-9 w-9 text-amber-500" />
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900">
          {confirmed ? 'Order placed!' : order.status === 'CANCELLED' ? 'Order cancelled' : 'Payment pending'}
        </h1>
        <p className="text-sm text-gray-500">
          {order.status === 'CANCELLED'
            ? 'This order was cancelled. If you were charged, the refund will be processed.'
            : confirmed
              ? `Thanks ${order.student?.name?.split(' ')[0] ?? ''}! Your order has been confirmed.`
              : 'We are confirming your payment. Please wait a moment.'}
        </p>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-5 py-3">
          <ShoppingBag className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Order</span>
          <span className="font-bold text-gray-900">#{order.orderNumber}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatINR(order.total)}
          {order.paymentStatus === 'SUCCESS' && <span className="text-xs font-medium text-green-600 ml-2">Paid</span>}
        </p>
        {order.estimatedReadyAt && (
          <p className="text-sm text-gray-500">
            Estimated ready by <span className="font-semibold text-gray-700">{formatDateTime(order.estimatedReadyAt)}</span>
          </p>
        )}
      </div>

      {confirmed && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">Order status</h2>
          <ol className="space-y-4">
            {steps.map((step, i) => {
              const reached = currentRank > i;
              const current = currentRank === i + 1;
              const done = currentRank >= i + 1;
              return (
                <li key={step.status} className="flex items-center gap-3">
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      done ? 'bg-green-500 text-white' : current ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <step.icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${done ? 'text-gray-900' : current ? 'text-primary-700' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {reached && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2.5">
        {order.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.productNameSnapshot} <span className="text-gray-400">× {item.quantity}</span>
            </span>
            <span className="font-medium text-gray-900">{formatINR(item.subtotal)}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 pt-2.5 space-y-1.5 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatINR(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Service fee</span>
            <span>{formatINR(order.serviceFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatINR(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button size="lg" className="w-full" onClick={() => navigate('/orders')}>
          Track my order <ChevronRight className="h-4 w-4" />
        </Button>
        <Link to="/menu">
          <Button variant="secondary" size="lg" className="w-full">
            Keep browsing
          </Button>
        </Link>
      </div>
    </div>
  );
}
