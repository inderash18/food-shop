import { useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  Lock,
  Tag,
  Loader2,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Building,
  Utensils,
  AlertCircle,
} from 'lucide-react';
import { apiPost, getErrorMessage } from '../../api/client';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../stores/auth';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

interface CheckoutResponse {
  checkout: {
    order: {
      _id: string;
      orderNumber: string;
      tokenNumber?: string;
      items: { productNameSnapshot: string; quantity: number; subtotal: number; priceSnapshot: number }[];
      subtotal: number;
      discount: number;
      couponCode?: string;
      serviceFee: number;
      total: number;
    };
    paymentIntent: { paymentId: string; provider: string; amount: number; metadata?: any; providerPaymentId?: string };
    requiresVerification: boolean;
  };
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { cart, itemCount, subtotal } = useCart();

  const stateNotes = (location.state as any)?.notes || '';
  const stateCoupon = (location.state as any)?.coupon || '';

  const [cookingNotes, setCookingNotes] = useState(stateNotes);
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'paytm' | 'card'>('upi');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkoutIdRef = useRef<string>(
    sessionStorage.getItem('checkoutRequestId') ?? `chk_${crypto.randomUUID()}`
  );

  const checkout = useMutation({
    mutationFn: () => {
      setCheckoutError(null);
      return apiPost<CheckoutResponse>('/api/checkout', {
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          addons: i.addons,
          instructions: i.instructions,
        })),
        couponCode: stateCoupon || undefined,
        notes: cookingNotes,
        checkoutRequestId: checkoutIdRef.current,
      });
    },
    onSuccess: (data) => {
      sessionStorage.setItem('checkoutRequestId', checkoutIdRef.current);
      sessionStorage.setItem('paymentId', data.checkout.paymentIntent.paymentId);
      if (data.checkout.paymentIntent.providerPaymentId) {
        sessionStorage.setItem('providerPaymentId', data.checkout.paymentIntent.providerPaymentId);
      }
      sessionStorage.setItem('paymentAmount', String(data.checkout.paymentIntent.amount));
      sessionStorage.setItem('orderId', data.checkout.order._id);
      sessionStorage.setItem('orderNumber', data.checkout.order.orderNumber);

      navigate('/payment', { replace: true });
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code;
      const message = getErrorMessage(err);

      if (code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' || err.response?.status === 503) {
        setCheckoutError('Payment gateway is currently simulated/unconfigured.');
      } else {
        setCheckoutError(message);
      }
      toast.error(message);
    },
  });

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-[28px] border border-gray-100 text-center space-y-4 shadow-card">
        <Utensils className="w-10 h-10 text-gray-300 mx-auto" />
        <h2 className="text-base font-bold text-darkText">No items in your pre-order</h2>
        <Link
          to="/menu"
          className="inline-flex px-5 py-2.5 bg-[#389C9A] text-white font-semibold text-xs rounded-xl shadow-teal"
        >
          Back to Food Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 antialiased">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/cart')}
          className="p-2 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText transition-colors shadow-3xs flex items-center gap-1 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Edit Pre-Order
        </button>

        <span className="text-xs font-semibold text-[#389C9A] bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
          Fast-Track Express Collection
        </span>
      </div>

      {/* Pickup Station Banner */}
      <div className="bg-[#389C9A] rounded-[28px] p-6 text-white shadow-teal space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider">
          Pickup Station
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Counter 2 - Express Pick</h1>
        <p className="text-xs text-white/90 font-normal">
          Food is freshly cooked and assigned your Order Token upon payment confirmation.
        </p>
      </div>

      {/* Selected Items Breakdown */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-darkText">
            Pre-Order Items ({itemCount})
          </h2>
          <Link to="/cart" className="text-xs font-semibold text-[#389C9A] hover:underline">
            Modify
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {cart.items.map((i) => (
            <div key={i.productId} className="py-2.5 flex items-center justify-between text-xs">
              <span className="font-medium text-darkText">
                <span className="font-semibold text-[#389C9A]">{i.quantity}x</span> {i.name}
              </span>
              <span className="font-semibold text-darkText tabular-nums">{formatINR(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>

        {cookingNotes && (
          <div className="p-3 bg-secondaryBg rounded-xl text-xs text-gray-600 font-normal">
            <span className="font-semibold text-darkText">Chef Notes:</span> {cookingNotes}
          </div>
        )}
      </div>

      {/* Online Payment Method Selection */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-darkText">
          Select Online Payment Method
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'upi', name: 'Instant UPI / QR', desc: 'Google Pay, PhonePe, Paytm' },
            { id: 'paytm', name: 'Paytm Wallet / NetBanking', desc: 'Direct Wallet & Bank' },
            { id: 'card', name: 'Campus Smart Card', desc: 'Student Prepaid Balance' },
          ].map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setSelectedMethod(method.id as any)}
              className={cn(
                'p-4 rounded-2xl border text-left flex flex-col justify-between space-y-1 transition-all',
                selectedMethod === method.id
                  ? 'bg-teal-50 border-[#389C9A] text-darkText shadow-3xs'
                  : 'bg-secondaryBg border-transparent text-gray-700 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-darkText">{method.name}</span>
                <span
                  className={cn(
                    'w-3 h-3 rounded-full',
                    selectedMethod === method.id ? 'bg-[#389C9A]' : 'border border-gray-300'
                  )}
                />
              </div>
              <p className="text-[10px] text-gray-400 font-normal">{method.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Final Total & Place Order Action */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-4">
        <div className="flex justify-between items-center text-sm font-bold text-darkText">
          <span>Total Amount to Pay</span>
          <span className="text-xl text-[#389C9A] tabular-nums">{formatINR(subtotal)}</span>
        </div>

        {checkoutError && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {checkoutError}
          </div>
        )}

        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="w-full py-4 bg-[#FEDB71] hover:bg-[#fedb71]/90 text-darkText font-semibold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
        >
          {checkout.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing Pre-Order...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> Pay & Place Pre-Order • <span className="tabular-nums">{formatINR(subtotal)}</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-gray-400 font-normal text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#389C9A]" /> Instant Order Token & Digital Pass generated immediately.
        </p>
      </div>
    </div>
  );
}
