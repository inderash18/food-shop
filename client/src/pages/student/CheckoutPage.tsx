import { useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  Lock,
  Loader2,
  MapPin,
  Clock,
  ShieldCheck,
  Building,
  Utensils,
  AlertTriangle,
  User,
  ShoppingBag,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { apiPost, getErrorMessage } from '../../api/client';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../stores/auth';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

import { openRazorpayCheckout } from '../../lib/razorpay';
import apiClient from '../../api/client';

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
    paymentIntent: {
      paymentId: string;
      provider: string;
      amount: number;
      metadata?: any;
      providerPaymentId?: string;
    };
    requiresVerification: boolean;
  };
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { cart, itemCount, subtotal, clearCart } = useCart();

  const stateNotes = (location.state as any)?.notes || '';
  const stateCoupon = (location.state as any)?.coupon || '';

  const [cookingNotes] = useState(stateNotes);
  const [unconfiguredModalOpen, setUnconfiguredModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const checkoutIdRef = useRef<string>(
    sessionStorage.getItem('checkoutRequestId') ?? `chk_${crypto.randomUUID()}`
  );

  const handleRazorpaySuccess = async (response: RazorpayPaymentSuccessResponse, paymentId: string) => {
    setIsVerifying(true);
    try {
      toast.info('Verifying payment signature with server...');
      
      // Call POST /api/verify-payment with order_id, payment_id, and signature
      const verifyRes = await apiClient.post('/api/verify-payment', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        paymentId,
      });

      if (verifyRes.data?.success) {
        toast.success('Payment verified successfully! Pre-order confirmed.');
        sessionStorage.removeItem('checkoutRequestId');
        sessionStorage.removeItem('paymentId');
        sessionStorage.removeItem('providerPaymentId');
        sessionStorage.removeItem('paymentAmount');
        clearCart();
        navigate('/order-confirmation', { replace: true });
      } else {
        throw new Error(verifyRes.data?.error?.message || 'Payment verification failed');
      }
    } catch (err: any) {
      const msg = getErrorMessage(err) || 'Signature verification failed. Payment not confirmed.';
      setCheckoutError(msg);
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

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

      const provider = data.checkout.paymentIntent.provider;
      const providerPaymentId = data.checkout.paymentIntent.providerPaymentId;
      const redirectUrl = data.checkout.paymentIntent.metadata?.redirectUrl;

      // If Razorpay provider or Razorpay order ID is returned, open Razorpay modal directly
      if (provider === 'razorpay' || (providerPaymentId && providerPaymentId.startsWith('order_'))) {
        const razorpayOrderId = providerPaymentId || data.checkout.paymentIntent.metadata?.razorpayOrderId;
        
        if (razorpayOrderId) {
          openRazorpayCheckout({
            orderId: razorpayOrderId,
            amount: Math.round(data.checkout.paymentIntent.amount * 100),
            currency: 'INR',
            name: 'Campus Food Shop',
            description: `Order #${data.checkout.order.orderNumber}`,
            prefill: {
              name: user?.name,
              email: user?.email,
              contact: user?.phone,
            },
            onSuccess: (resp) => {
              handleRazorpaySuccess(resp, data.checkout.paymentIntent.paymentId);
            },
            onDismiss: () => {
              toast.info('Payment window closed. You can complete your payment anytime.');
            },
            onError: (err) => {
              const msg = err?.description || err?.message || 'Payment failed. Please try again.';
              setCheckoutError(msg);
              toast.error(msg);
            },
          });
          return;
        }
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        navigate('/payment', { replace: true });
      }
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code;
      const message = getErrorMessage(err);

      if (code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' || err.response?.status === 503) {
        setUnconfiguredModalOpen(true);
        setCheckoutError('Online payment is currently unavailable. Payment service configuration is pending.');
      } else {
        setCheckoutError(message);
        toast.error(message);
      }
    },
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-amber-100 text-center space-y-4 shadow-card">
        <User className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-amber-950">Please sign in to proceed to checkout</h2>
        <p className="text-xs text-stone-500">You need to sign in to place and track your food pre-orders.</p>
        <Link
          to="/login"
          state={{ from: location }}
          className="inline-flex px-5 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-amber-100 text-center space-y-4 shadow-card">
        <Utensils className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-amber-950">No items in your pre-order</h2>
        <Link
          to="/menu"
          className="inline-flex px-5 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300"
        >
          Back to Food Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28 pt-2 antialiased px-1 sm:px-0">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/cart')}
          className="p-2 rounded-2xl bg-amber-50/70 hover:bg-amber-100/60 text-amber-950 transition-colors border border-amber-200/60 flex items-center gap-1 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4 text-amber-700" /> Edit Cart
        </button>

        <span className="text-xs font-bold text-amber-950 bg-[#FEDB71] px-3 py-1 rounded-full border border-amber-300 shadow-3xs">
          Express Pre-Order Checkout
        </span>
      </div>

      {/* Shop Information Banner */}
      <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FEDB71] text-amber-950 border border-amber-300 flex items-center justify-center font-bold shrink-0">
            <Building className="w-5 h-5 text-amber-900" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">SHOP LOCATION</h2>
            <p className="text-sm font-bold text-amber-950">Campus Main Canteen — Counter 2</p>
            <p className="text-[11px] text-stone-500 font-normal">Order Type: <strong className="font-bold text-amber-950">PRE-ORDER</strong></p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-50 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 shrink-0">
          Single Shop
        </span>
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-card space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
          <User className="w-4 h-4 text-amber-700" /> Customer Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-amber-50/40 p-3.5 rounded-2xl border border-amber-100">
          <div>
            <span className="text-[10px] uppercase font-semibold text-stone-400">Student Name</span>
            <p className="font-bold text-amber-950">{user?.name || 'Student'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-stone-400">Student ID / Email</span>
            <p className="font-bold text-amber-950">{user?.studentId || user?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Selected Items Review */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-amber-700" /> Pre-Order Items ({itemCount})
          </h2>
          <Link to="/cart" className="text-xs font-bold text-amber-800 hover:underline">
            Modify Cart
          </Link>
        </div>

        <div className="divide-y divide-amber-100/80">
          {cart.items.map((i) => (
            <div key={i.productId} className="py-2.5 flex items-center justify-between text-xs">
              <span className="font-medium text-amber-950">
                <span className="font-bold text-amber-900">{i.quantity}×</span> {i.name}
              </span>
              <span className="font-bold text-amber-950 tabular-nums">{formatINR(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>

        {cookingNotes && (
          <div className="p-3 bg-amber-50/60 rounded-xl text-xs text-amber-950 font-normal border border-amber-200/50">
            <span className="font-bold">Chef Instructions:</span> {cookingNotes}
          </div>
        )}
      </div>

      {/* Payment Section */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-card space-y-4">
        <div className="border-b border-amber-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-amber-700" /> PAYMENT METHOD
          </h2>
          <p className="text-xs text-stone-500 font-normal mt-0.5">
            Secure online payment via Instant UPI. You will be redirected to the payment provider.
          </p>
        </div>

        {/* Single Payment Method Option: Instant UPI / QR */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-amber-950 flex items-center justify-between shadow-3xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEDB71] border border-amber-300 flex items-center justify-center font-bold text-amber-950 shrink-0">
              ⚡
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">Instant UPI / QR Code</p>
              <p className="text-[11px] text-stone-600 font-normal">Google Pay, PhonePe, Paytm, BHIM</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-white text-amber-950 text-[10px] font-bold rounded-lg border border-amber-300 shadow-3xs">
            Selected
          </span>
        </div>

        <div className="flex justify-between items-center bg-amber-50/40 p-4 rounded-2xl border border-amber-200/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Amount to pay</span>
            <span className="text-xs font-medium text-stone-600">Authoritative server total</span>
          </div>
          <span className="text-2xl font-bold text-amber-950 tabular-nums">{formatINR(subtotal)}</span>
        </div>

        {checkoutError && (
          <div className="p-3.5 bg-rose-50 text-rose-800 text-xs font-semibold rounded-2xl border border-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{checkoutError}</span>
          </div>
        )}

        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="w-full py-4 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-sm sm:text-base rounded-2xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
        >
          {checkout.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-amber-950" /> Preparing secure payment...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> PAY & PLACE PRE-ORDER • <span className="tabular-nums">{formatINR(subtotal)}</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-stone-400 font-normal text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Your order stays in PAYMENT_PENDING state until payment is verified.
        </p>
      </div>

      {/* Paytm Unconfigured Error Modal (Section 8 Spec) */}
      {unconfiguredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-center border border-amber-200 animate-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-amber-950">Online payment is currently unavailable.</h3>
              <p className="text-xs font-normal text-stone-600 leading-relaxed">
                Payment service configuration is pending. Real Paytm credentials have not been configured on the server yet.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200 text-left space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Safe Order State
              </p>
              <p className="text-stone-600 font-normal">
                No funds were deducted. Your order is not confirmed without real payment verification.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setUnconfiguredModalOpen(false)}
                className="w-full py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300"
              >
                BACK TO CHECKOUT
              </button>
              <Link
                to="/cart"
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl text-center"
              >
                RETURN TO CART
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
