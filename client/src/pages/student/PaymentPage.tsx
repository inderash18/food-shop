import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Loader2,
  Copy,
  CheckCircle2,
  QrCode,
  RefreshCcw,
  Smartphone,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  Clock,
  ShoppingBag,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import apiClient, { getErrorMessage, getErrorCode } from '../../api/client';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { useAuthStore } from '../../stores/auth';

const ORDER_CONFIRMED = 'ORDER_CONFIRMED';
const PAYMENT_SUCCESS = 'SUCCESS';
const PAYMENT_FAILED = 'FAILED';

type PaymentUIState =
  | 'INITIALIZING'
  | 'REDIRECTING'
  | 'PAYMENT_READY'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'PENDING'
  | 'EXPIRED'
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  // Extract from searchParams first (in case of redirect from UPI app) or fallback to sessionStorage
  const paramPaymentId = searchParams.get('paymentId') || searchParams.get('orderId') || searchParams.get('order_id') || searchParams.get('providerPaymentId');
  const [paymentId] = useState(() => paramPaymentId || sessionStorage.getItem('paymentId') || sessionStorage.getItem('orderId') || '');
  const [providerPaymentId] = useState(() => searchParams.get('providerPaymentId') || sessionStorage.getItem('providerPaymentId') || '');
  const [amount] = useState(() => Number(sessionStorage.getItem('paymentAmount') || 0));
  const [orderNumber] = useState(() => sessionStorage.getItem('orderNumber') || '');
  const [orderId] = useState(() => searchParams.get('orderId') || sessionStorage.getItem('orderId') || '');
  const [upiIntentUri] = useState(() => sessionStorage.getItem('upiIntentUri') || '');
  const [upiId] = useState(() => sessionStorage.getItem('merchantUpiId') || '');

  const [uiState, setUiState] = useState<PaymentUIState>('VERIFYING');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes session
  const [isCopied, setIsCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasNotifiedNotConfigured, setHasNotifiedNotConfigured] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const uiStateRef = useRef<PaymentUIState>('VERIFYING');
  const pollCountRef = useRef(0);

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);

  // Clear polling helper
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Verification call with timeout and server-side status check
  const performVerification = useCallback(
    async (isManual = false) => {
      if (!paymentId || isCheckingRef.current) return;
      isCheckingRef.current = true;

      if (isManual) {
        setIsChecking(true);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s client timeout

        const res = await apiClient.get(
          `/api/payment/status/${paymentId}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = res.data?.data;
        const paymentStatus = data?.status || data?.payment?.status;
        const orderStatus = data?.order?.status;

        if (paymentStatus === PAYMENT_SUCCESS || orderStatus === ORDER_CONFIRMED) {
          stopPolling();
          setUiState('SUCCESS');
          sessionStorage.removeItem('paymentId');
          sessionStorage.removeItem('providerPaymentId');
          sessionStorage.removeItem('upiIntentUri');
          sessionStorage.removeItem('merchantUpiId');
          toast.success('Payment verified successfully! Pre-order confirmed.');
          setTimeout(() => {
            navigate('/order-confirmation', { replace: true });
          }, 1500);
          return;
        }

        if (paymentStatus === PAYMENT_FAILED || paymentStatus === 'REJECTED') {
          stopPolling();
          setUiState('FAILED');
          setStatusMessage('Payment failed. Your order has not been confirmed.');
          return;
        }

        if (paymentStatus === 'CANCELLED') {
          stopPolling();
          setUiState('CANCELLED');
          setStatusMessage('Payment cancelled. You have not been charged successfully.');
          return;
        }

        // If still pending, increment poll count
        pollCountRef.current += 1;
        if (pollCountRef.current > 18) {
          stopPolling();
          setUiState('TIMEOUT');
          setStatusMessage('Payment verification is taking longer than expected. Please check your order or payment status.');
        } else if (uiStateRef.current === 'VERIFYING') {
          setUiState('PAYMENT_READY');
        }
      } catch (err: any) {
        const code = getErrorCode(err);
        const message = getErrorMessage(err);

        if (code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' || err.response?.status === 503) {
          stopPolling();
          setUiState('NOT_CONFIGURED');
          setStatusMessage(
            'Online payment is currently unavailable. Payment service configuration is pending.'
          );
          if (!hasNotifiedNotConfigured) {
            setHasNotifiedNotConfigured(true);
            toast.error('Online payment unavailable: Payment service configuration is pending.');
          }
          return;
        }

        if (err.code === 'ECONNABORTED' || err.name === 'AbortError') {
          if (isManual) {
            setUiState('TIMEOUT');
            setStatusMessage('Verification request timed out. Please try again in a few moments.');
          }
          return;
        }

        if (!err.response) {
          if (isManual) {
            setUiState('NETWORK_ERROR');
            setStatusMessage('Network connection lost. Please check your internet.');
          }
          return;
        }

        if (isManual) {
          setStatusMessage(message || 'Unable to verify payment status.');
        }
      } finally {
        isCheckingRef.current = false;
        if (isManual) {
          setIsChecking(false);
        }
      }
    },
    [paymentId, navigate, stopPolling, hasNotifiedNotConfigured]
  );

  // Initial verification & responsive 2.5-second polling setup
  useEffect(() => {
    if (!paymentId) {
      navigate('/cart', { replace: true });
      return;
    }

    // Run first check immediately on page open / return
    performVerification(false);

    // Start 2.5-second polling interval
    pollTimerRef.current = setInterval(() => {
      const current = uiStateRef.current;
      if (current !== 'NOT_CONFIGURED' && current !== 'SUCCESS' && current !== 'FAILED' && current !== 'CANCELLED' && current !== 'TIMEOUT' && current !== 'EXPIRED') {
        performVerification(false);
      } else {
        stopPolling();
      }
    }, 2500);

    return () => {
      stopPolling();
    };
  }, [paymentId, navigate, performVerification, stopPolling]);

  // Session Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      stopPolling();
      setUiState('EXPIRED');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, stopPolling]);

  const handleCopy = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setIsCopied(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleOpenRazorpay = () => {
    const rzpOrderId = providerPaymentId && providerPaymentId.startsWith('order_') ? providerPaymentId : undefined;
    if (rzpOrderId) {
      launchRazorpayModal(rzpOrderId);
    } else {
      setIsChecking(true);
      apiClient
        .post('/api/create-order', {
          orderId: orderId || paymentId,
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: `rcpt_${(orderId || paymentId).slice(-8)}`,
        })
        .then((res) => {
          if (res.data?.order_id) {
            sessionStorage.setItem('providerPaymentId', res.data.order_id);
            launchRazorpayModal(res.data.order_id);
          } else {
            toast.error('Failed to create Razorpay order');
          }
        })
        .catch((err) => {
          toast.error(getErrorMessage(err) || 'Failed to initialize Razorpay checkout');
        })
        .finally(() => {
          setIsChecking(false);
        });
    }
  };

  const launchRazorpayModal = (rzpOrderId: string) => {
    openRazorpayCheckout({
      orderId: rzpOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'Campus Food Shop',
      description: `Order #${orderNumber || 'Pre-Order'}`,
      prefill: {
        name: user?.name,
        email: user?.email,
        contact: user?.phone,
      },
      onSuccess: async (resp) => {
        try {
          toast.info('Verifying payment signature with server...');
          const verifyRes = await apiClient.post('/api/verify-payment', {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            paymentId,
          });

          if (verifyRes.data?.success) {
            stopPolling();
            setUiState('SUCCESS');
            sessionStorage.removeItem('paymentId');
            sessionStorage.removeItem('providerPaymentId');
            toast.success('Payment verified successfully! Pre-order confirmed.');
            setTimeout(() => {
              navigate('/order-confirmation', { replace: true });
            }, 1500);
          } else {
            toast.error('Payment signature mismatch.');
          }
        } catch (err: any) {
          toast.error(getErrorMessage(err) || 'Signature verification failed.');
        }
      },
      onDismiss: () => {
        stopPolling();
        setUiState('CANCELLED');
        apiClient.post('/api/payment/cancel', {
          paymentId,
          orderId,
          reason: 'CUSTOMER_CANCELLED',
        }).catch(() => {});
        toast.info('Payment cancelled. Your order has not been confirmed.');
      },
      onError: (err) => {
        stopPolling();
        setUiState('FAILED');
        apiClient.post('/api/payment/cancel', {
          paymentId,
          orderId,
          reason: err?.description || 'GATEWAY_ERROR',
        }).catch(() => {});
        toast.error(err?.description || 'Payment failed. Please retry.');
      },
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pt-4 pb-16 px-3 sm:px-0 antialiased">
      
      {/* Header */}
      <div className="text-center space-y-1.5 bg-white p-5 rounded-3xl border border-amber-100 shadow-card">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Secure Payment Transition</span>
        <h1 className="text-2xl font-bold text-amber-950 tracking-tight">Order #{orderNumber || 'Pending'}</h1>
        <div className="inline-flex items-center justify-center gap-2 text-amber-950 font-bold text-2xl bg-[#FEDB71] border border-amber-300 px-6 py-1.5 rounded-full shadow-3xs">
          {formatINR(amount)}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STATE: NOT CONFIGURED (Section 8 Spec: Paytm Missing)     */}
      {/* ========================================================= */}
      {uiState === 'NOT_CONFIGURED' && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-card p-6 sm:p-7 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-amber-950">Online payment is currently unavailable.</h2>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
              Payment service configuration is pending. Real Paytm merchant credentials have not been configured yet.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" /> Safe Order State
            </p>
            <p className="text-stone-600 font-normal">
              Your order <strong className="font-mono text-amber-950">#{orderNumber}</strong> remains safely recorded in{' '}
              <strong className="text-amber-950 font-bold">PAYMENT_PENDING</strong> state. No funds were charged.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              to="/checkout"
              className="block w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300 transition-transform active:scale-98 text-center"
            >
              BACK TO CHECKOUT
            </Link>

            <Link
              to="/cart"
              className="block w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors text-center"
            >
              RETURN TO CART
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: VERIFYING (Returning from UPI App)                 */}
      {/* ========================================================= */}
      {uiState === 'VERIFYING' && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-card p-8 text-center space-y-4 animate-in">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-3xs">
            <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-amber-950">Checking payment status...</h2>
            <p className="text-stone-500 text-xs font-normal">
              Please wait while we verify your payment status directly with the payment gateway.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: TIMEOUT (Verification taking longer than expected) */}
      {/* ========================================================= */}
      {uiState === 'TIMEOUT' && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-card p-7 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-amber-950">Payment Verification Pending</h2>
            <p className="text-stone-600 text-xs font-normal">
              {statusMessage || 'Payment verification is taking longer than expected. Please check your order or payment status.'}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setUiState('VERIFYING');
                performVerification(true);
              }}
              className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300 transition-transform active:scale-98"
            >
              RE-CHECK PAYMENT STATUS
            </button>
            <Link
              to="/orders"
              className="block w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors text-center"
            >
              VIEW MY ORDERS
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: SUCCESS (Section 9 Spec: Payment Verified)          */}
      {/* ========================================================= */}
      {uiState === 'SUCCESS' && (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-card p-8 text-center space-y-4 animate-in">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-3xs">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-amber-950">Payment Verified!</h2>
            <p className="text-stone-500 text-xs font-normal">Your pre-order has been confirmed. Redirecting to receipt pass...</p>
          </div>
          <Loader2 className="w-5 h-5 text-amber-950 animate-spin mx-auto" />
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: FAILED (Section 10 Spec: Payment Failed)            */}
      {/* ========================================================= */}
      {uiState === 'FAILED' && (
        <div className="bg-white rounded-3xl border border-rose-200 shadow-card p-7 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <XCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-rose-700">Payment failed</h2>
            <p className="text-stone-600 text-xs font-normal">
              {statusMessage || 'Your order has not been confirmed.'}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => performVerification(true)}
              className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300 transition-transform active:scale-98"
            >
              TRY PAYMENT AGAIN
            </button>
            <Link
              to="/cart"
              className="block w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              BACK TO CART
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: CANCELLED (Payment Cancelled / Abandoned)           */}
      {/* ========================================================= */}
      {uiState === 'CANCELLED' && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-card p-7 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-amber-950">Payment Cancelled</h2>
            <p className="text-stone-600 text-xs font-normal">
              Your payment was not completed. Your order has not been confirmed.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleOpenRazorpay}
              className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300 transition-transform active:scale-98"
            >
              TRY PAYMENT AGAIN
            </button>
            <Link
              to="/menu"
              className="block w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors text-center"
            >
              BACK TO MENU
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: EXPIRED (Session Timeout)                          */}
      {/* ========================================================= */}
      {uiState === 'EXPIRED' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-card p-7 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-amber-950">Payment Session Expired</h2>
            <p className="text-stone-500 text-xs font-normal">This dynamic payment session has timed out for security.</p>
          </div>
          <Link
            to="/cart"
            className="block w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300 text-center"
          >
            Generate Fresh Pre-Order in Cart
          </Link>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: PAYMENT READY / REDIRECTING / VERIFYING PENDING    */}
      {/* ========================================================= */}
      {uiState === 'PAYMENT_READY' && (
        <div className="bg-white rounded-3xl border border-amber-100 shadow-card overflow-hidden relative animate-in">
          
          {/* Main QR Section */}
          <div className="p-6 sm:p-7 flex flex-col items-center space-y-5">
            <div className="bg-amber-50/60 p-4 rounded-3xl border border-amber-200/80 relative shadow-3xs">
              {upiIntentUri ? (
                <QRCodeSVG
                  value={upiIntentUri}
                  size={200}
                  level="Q"
                  includeMargin={true}
                  className="rounded-2xl"
                  fgColor="#451A03"
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-amber-50/50 rounded-2xl flex flex-col items-center justify-center text-amber-800 p-4 text-center border border-amber-100">
                  <QrCode className="w-12 h-12 mb-2 text-amber-600" />
                  <span className="text-[11px] font-bold">Secure Online Payment</span>
                </div>
              )}
            </div>

            <div className="text-center space-y-1 w-full">
              <p className="font-bold text-amber-950 text-xs tracking-wider uppercase">
                Scan with any UPI Application
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 font-medium pt-1">
                <span>Google Pay</span>
                <span>•</span>
                <span>PhonePe</span>
                <span>•</span>
                <span>Paytm</span>
                <span>•</span>
                <span>BHIM</span>
              </div>
            </div>

            {isMobile && upiIntentUri && (
              <a
                href={upiIntentUri}
                className="w-full flex items-center justify-center gap-2 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 py-3.5 px-4 rounded-2xl font-bold text-xs shadow-3xs border border-amber-300 transition-transform active:scale-98"
              >
                <Smartphone className="h-4 w-4" />
                Pay via Installed UPI App
              </a>
            )}
          </div>

          {/* UPI ID Section */}
          {upiId && (
            <div className="p-5 bg-amber-50/40 border-t border-amber-100 flex flex-col items-center space-y-2">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Or Transfer to Merchant UPI VPA
              </p>

              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-2xl p-2 pl-3.5 w-full shadow-3xs">
                <span className="text-xs font-mono font-bold text-amber-950 flex-1 truncate">{upiId}</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 border border-amber-300"
                >
                  {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-950" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Status & Verification Footer */}
          <div className="bg-amber-950 p-5 text-white space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-amber-200">
                <ShieldCheck className="w-4 h-4 text-[#FEDB71]" />
                <span className="font-bold">256-Bit Bank Encryption</span>
              </div>
              <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl text-amber-200 font-mono text-[11px] font-bold">
                <Clock className="w-3 h-3 text-[#FEDB71]" />
                <span>{timeString}</span>
              </div>
            </div>

            <button
              onClick={handleOpenRazorpay}
              disabled={isChecking}
              className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-60 border border-amber-300"
            >
              <Lock className="h-4 w-4 text-amber-950" /> Pay with Razorpay (UPI, Card, NetBanking)
            </button>

            <button
              onClick={() => performVerification(true)}
              disabled={isChecking}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-200" /> Verifying Status...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 text-amber-200" /> Check Payment Status Manually
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Need Help link */}
      <div className="text-center">
        <Link
          to={`/help?orderId=${orderNumber}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Need Help with this Pre-Order Payment?
        </Link>
      </div>
    </div>
  );
}
