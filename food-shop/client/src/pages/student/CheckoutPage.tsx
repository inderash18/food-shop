import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Lock, Tag, Loader2 } from 'lucide-react';
import { apiPost } from '../../api/client';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { formatINR } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

interface CheckoutResponse {
  checkout: {
    order: {
      _id: string;
      orderNumber: string;
      items: { productNameSnapshot: string; quantity: number; subtotal: number; priceSnapshot: number }[];
      subtotal: number;
      discount: number;
      couponCode?: string;
      serviceFee: number;
      total: number;
    };
    paymentIntent: { paymentId: string; provider: string; amount: number };
    requiresVerification: boolean;
  };
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { cart, isLoading } = useCart();
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const checkoutIdRef = useRef<string>(sessionStorage.getItem('checkoutRequestId') ?? `chk_${crypto.randomUUID()}`);

  const checkout = useMutation({
    mutationFn: () =>
      apiPost<CheckoutResponse>('/api/checkout', {
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        ...(coupon ? { couponCode: coupon } : {}),
        checkoutRequestId: checkoutIdRef.current,
      }),
    onSuccess: (data) => {
      sessionStorage.setItem('checkoutRequestId', checkoutIdRef.current);
      sessionStorage.setItem('paymentId', data.checkout.paymentIntent.paymentId);
      sessionStorage.setItem('providerPaymentId', data.checkout.paymentIntent.providerPaymentId);
      sessionStorage.setItem('paymentAmount', String(data.checkout.paymentIntent.amount));
      sessionStorage.setItem('orderId', data.checkout.order._id);
      sessionStorage.setItem('orderNumber', data.checkout.order.orderNumber);
      
      if (data.checkout.paymentIntent.provider === 'paytm') {
        sessionStorage.setItem('paytmToken', data.checkout.paymentIntent.clientSecret || '');
        sessionStorage.setItem('paytmMid', data.checkout.paymentIntent.metadata?.mid || '');
        sessionStorage.setItem('paytmEnvironment', data.checkout.paymentIntent.metadata?.environment || '');
        sessionStorage.setItem('paytmUpiId', data.checkout.paymentIntent.metadata?.upiId || '');
        sessionStorage.setItem('paytmUpiIntentUri', data.checkout.paymentIntent.metadata?.upiIntentUri || '');
      }

      navigate('/payment', { replace: true });
    },
    onError: (err) => {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('coupon')) setCouponError(message);
    },
  });

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">Please log in to check out.</p>
        <Button onClick={() => navigate('/login')}>Login</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
      </div>
    );
  }

  const unavailable = cart.items.filter((i) => !i.available);
  const canCheckout = unavailable.length === 0 && !checkout.isPending;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={() => navigate('/cart')} className="inline-flex items-center gap-1 text-sm font-medium text-gray-600">
        <ChevronLeft className="h-4 w-4" /> Back to cart
      </button>
      <h1 className="text-xl font-bold text-gray-900">Checkout</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Order summary</h2>
        <div className="space-y-2.5">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.name} <span className="text-gray-400">× {item.quantity}</span>
              </span>
              <span className="font-medium text-gray-900">{formatINR(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-4 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatINR(cart.subtotal)}</span>
          </div>
          {checkout.data ? (
            <>
              {checkout.data.checkout.order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({checkout.data.checkout.order.couponCode})</span>
                  <span>-{formatINR(checkout.data.checkout.order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Service fee</span>
                <span>{formatINR(checkout.data.checkout.order.serviceFee)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-gray-600">
              <span>Service fee</span>
              <span>At checkout</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-1">
            <span>Total</span>
            <span>{checkout.data ? formatINR(checkout.data.checkout.order.total) : formatINR(cart.subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-400" /> Coupon code
        </h2>
        <div className="flex gap-2">
          <input
            value={coupon}
            onChange={(e) => {
              setCoupon(e.target.value.toUpperCase());
              setCouponError('');
            }}
            placeholder="e.g. WELCOME10"
            className="flex-1 h-11 px-3.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button variant="secondary" onClick={() => setCouponError('')}>
            Apply
          </Button>
        </div>
        {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
        {checkout.data?.checkout.order.discount && checkout.data.checkout.order.discount > 0 && (
          <p className="mt-2 text-xs text-green-600">Coupon applied — you saved {formatINR(checkout.data.checkout.order.discount)}</p>
        )}
      </div>

      {unavailable.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Some items are out of stock. Remove them before checking out.
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        loading={checkout.isPending}
        disabled={!canCheckout}
        onClick={() => checkout.mutate()}
      >
        {checkout.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating secure payment...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> Continue to Payment
          </>
        )}
      </Button>
      <p className="text-center text-xs text-gray-400">You will be able to review the final amount before paying.</p>
    </div>
  );
}
