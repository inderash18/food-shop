import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  WifiOff,
  ShoppingBag,
  HelpCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import apiClient, { getErrorMessage, getErrorCode } from '../../api/client';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

const ORDER_CONFIRMED = 'ORDER_CONFIRMED';
const PAYMENT_SUCCESS = 'SUCCESS';
const PAYMENT_FAILED = 'FAILED';

type PaymentUIState =
  | 'INITIALIZING'
  | 'PAYMENT_READY'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export function PaymentPage() {
  const navigate = useNavigate();

  const [paymentId] = useState(() => sessionStorage.getItem('paymentId') ?? '');
  const [amount] = useState(() => Number(sessionStorage.getItem('paymentAmount') ?? 0));
  const [orderNumber] = useState(() => sessionStorage.getItem('orderNumber') ?? '');
  const [orderId] = useState(() => sessionStorage.getItem('orderId') ?? '');
  const [upiIntentUri] = useState(() => sessionStorage.getItem('upiIntentUri') ?? '');
  const [upiId] = useState(() => sessionStorage.getItem('merchantUpiId') ?? '');

  const [uiState, setUiState] = useState<PaymentUIState>('INITIALIZING');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes session
  const [isCopied, setIsCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasNotifiedNotConfigured, setHasNotifiedNotConfigured] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling helper
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Verification call with timeout and proper error mapping
  const performVerification = useCallback(
    async (isManual = false) => {
      if (!paymentId) return;

      if (isManual) {
        setIsChecking(true);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s client timeout

        const res = await apiClient.post(
          `/api/payments/verify`,
          { paymentId },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = res.data?.data;
        const paymentStatus = data?.payment?.status;
        const orderStatus = data?.order?.status;

        if (paymentStatus === PAYMENT_SUCCESS || orderStatus === ORDER_CONFIRMED) {
          stopPolling();
          setUiState('SUCCESS');
          sessionStorage.removeItem('paymentId');
          sessionStorage.removeItem('providerPaymentId');
          sessionStorage.removeItem('upiIntentUri');
          sessionStorage.removeItem('merchantUpiId');
          toast.success('Payment verified successfully! Order confirmed.');
          setTimeout(() => {
            navigate('/order-confirmation', { replace: true });
          }, 1500);
          return;
        }

        if (paymentStatus === PAYMENT_FAILED) {
          stopPolling();
          setUiState('FAILED');
          setStatusMessage('Payment verification failed. Your order has not been confirmed.');
          return;
        }

        // If still pending
        if (uiState !== 'PAYMENT_READY') {
          setUiState('PAYMENT_READY');
        }
      } catch (err: any) {
        const code = getErrorCode(err);
        const message = getErrorMessage(err);

        if (code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' || err.response?.status === 503) {
          stopPolling();
          setUiState('NOT_CONFIGURED');
          setStatusMessage(
            'Online payment is currently unavailable. Paytm payment credentials are not configured.'
          );
          if (!hasNotifiedNotConfigured) {
            setHasNotifiedNotConfigured(true);
            toast.error('Online payment unavailable: Provider not configured.');
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
        if (isManual) {
          setIsChecking(false);
        }
      }
    },
    [paymentId, navigate, stopPolling, uiState, hasNotifiedNotConfigured]
  );

  // Initial verification & polling setup
  useEffect(() => {
    if (!paymentId) {
      navigate('/cart', { replace: true });
      return;
    }

    setUiState('PAYMENT_READY');

    // Run first check
    performVerification(false);

    // Start 10-second polling interval (only if not unconfigured or finished)
    pollTimerRef.current = setInterval(() => {
      if (uiState !== 'NOT_CONFIGURED' && uiState !== 'SUCCESS' && uiState !== 'FAILED') {
        performVerification(false);
      }
    }, 10000);

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
      setTimeLeft((prev) => prev - 1);
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

  return (
    <div className="max-w-md mx-auto space-y-5 pt-4 pb-12 px-4">
      
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Complete Payment</h1>
        <div className="inline-flex items-center justify-center gap-2 text-emerald-800 font-black text-xl bg-emerald-50 border border-emerald-200/80 px-5 py-1.5 rounded-full shadow-3xs">
          {formatINR(amount)}
        </div>
        <p className="text-xs text-gray-500 font-bold">
          Order #{orderNumber || 'Pending'}
        </p>
      </div>

      {/* ========================================================= */}
      {/* STATE: NOT CONFIGURED (Deterministic 503 / Missing Paytm)   */}
      {/* ========================================================= */}
      {uiState === 'NOT_CONFIGURED' && (
        <div className="bg-white rounded-3xl border border-amber-200/90 shadow-2xs p-7 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-gray-900">Online Payment Unavailable</h2>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
              Paytm payment gateway has not been configured with production credentials yet.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" /> Order State Protected
            </p>
            <p className="text-amber-700">
              Your order <strong className="font-mono">#{orderNumber}</strong> remains safely recorded as{' '}
              <strong className="text-amber-900">PAYMENT_PENDING</strong>. No funds were charged.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {orderId ? (
              <Link
                to={`/orders/${orderId}`}
                className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-emerald transition-transform active:scale-98"
              >
                View Order Details
              </Link>
            ) : (
              <Link
                to="/orders"
                className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-emerald transition-transform active:scale-98"
              >
                View My Orders
              </Link>
            )}

            <Link
              to="/cart"
              className="block w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl border border-gray-200 transition-colors"
            >
              Return to Cart
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: SUCCESS                                            */}
      {/* ========================================================= */}
      {uiState === 'SUCCESS' && (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xs p-8 text-center space-y-4 animate-in">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900">Payment Verified!</h2>
            <p className="text-gray-500 text-xs">Your meal is officially placed. Redirecting to receipt...</p>
          </div>
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: FAILED                                             */}
      {/* ========================================================= */}
      {uiState === 'FAILED' && (
        <div className="bg-white rounded-3xl border border-rose-200 shadow-2xs p-8 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <XCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-rose-700">Payment Failed</h2>
            <p className="text-gray-600 text-xs">
              {statusMessage || 'Your payment could not be completed or was rejected by your bank.'}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => performVerification(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-emerald"
            >
              Retry Verification
            </button>
            <Link
              to="/checkout"
              className="block w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl border border-gray-200"
            >
              Back to Checkout
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: EXPIRED                                            */}
      {/* ========================================================= */}
      {uiState === 'EXPIRED' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-8 text-center space-y-4 animate-in">
          <div className="w-14 h-14 rounded-3xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-gray-900">Payment Session Expired</h2>
            <p className="text-gray-500 text-xs">This dynamic QR payment window has expired for security.</p>
          </div>
          <Link
            to="/cart"
            className="block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-emerald"
          >
            Generate Fresh Payment in Cart
          </Link>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATE: PAYMENT READY / SCAN QR                            */}
      {/* ========================================================= */}
      {uiState === 'PAYMENT_READY' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden relative animate-in">
          
          {/* Main QR Section */}
          <div className="p-6 sm:p-7 flex flex-col items-center space-y-5">
            <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/80 relative group shadow-3xs">
              {upiIntentUri ? (
                <QRCodeSVG
                  value={upiIntentUri}
                  size={200}
                  level="Q"
                  includeMargin={true}
                  className="rounded-2xl"
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                  <QrCode className="w-12 h-12 mb-2 text-gray-300" />
                  <span className="text-[11px] font-bold">Dynamic QR Code</span>
                </div>
              )}
            </div>

            <div className="text-center space-y-1 w-full">
              <p className="font-extrabold text-gray-900 text-xs tracking-wider uppercase">
                Scan with any UPI Application
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-bold pt-1">
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
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl font-black text-xs shadow-emerald transition-transform active:scale-98"
              >
                <Smartphone className="h-4 w-4" />
                Pay via Installed UPI App
              </a>
            )}
          </div>

          {/* UPI ID Section */}
          {upiId && (
            <div className="p-5 bg-gray-50/70 border-t border-gray-100 flex flex-col items-center space-y-2">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                Or Transfer to UPI VPA
              </p>

              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-2 pl-3.5 w-full shadow-3xs">
                <span className="text-xs font-mono font-bold text-gray-900 flex-1 truncate">{upiId}</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0"
                >
                  {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Status & Verification Footer */}
          <div className="bg-emerald-950 p-5 text-white space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold">256-Bit Bank Encryption</span>
              </div>
              <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl text-emerald-200 font-mono text-[11px] font-bold">
                <Clock className="w-3 h-3" />
                <span>{timeString}</span>
              </div>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-bold">
                {statusMessage}
              </div>
            )}

            <button
              onClick={() => performVerification(true)}
              disabled={isChecking}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-60"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-950" /> Verifying Bank Status...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 text-emerald-950" /> Check Payment Status
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" /> Need Help with this Payment?
        </Link>
      </div>
    </div>
  );
}
