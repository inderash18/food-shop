import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Loader2, Copy, CheckCircle2, QrCode, RefreshCcw, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '../../api/client';
import { formatINR } from '../../lib/format';
import { Button } from '../../components/ui/Button';

const ORDER_CONFIRMED = 'ORDER_CONFIRMED';
const PAYMENT_SUCCESS = 'SUCCESS';
const PAYMENT_FAILED = 'FAILED';

export function PaymentPage() {
  const navigate = useNavigate();

  const [paymentId] = useState(() => sessionStorage.getItem('paymentId') ?? '');
  const [providerPaymentId] = useState(() => sessionStorage.getItem('providerPaymentId') ?? '');
  const [amount] = useState(() => Number(sessionStorage.getItem('paymentAmount') ?? 0));
  const [orderNumber] = useState(() => sessionStorage.getItem('orderNumber') ?? '');
  const [upiIntentUri] = useState(() => sessionStorage.getItem('paytmUpiIntentUri') ?? '');
  const [upiId] = useState(() => sessionStorage.getItem('paytmUpiId') ?? '');

  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isCopied, setIsCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Poll for payment status every 5 seconds
  const { data: statusData, isError, error } = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      // We directly query our backend status which should reflect verified state
      // if webhook arrived, or we can use the /verify endpoint.
      // Wait, to actively verify, we should use POST /verify to make backend check Paytm.
      // We will use POST /api/payments/verify for active verification.
      const res = await apiClient.post(`/api/payments/verify`, { paymentId });
      return res.data.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (isExpired) return false;
      if (data?.payment?.status === PAYMENT_SUCCESS || data?.order?.status === ORDER_CONFIRMED) {
        return false;
      }
      if (data?.payment?.status === PAYMENT_FAILED) {
        return false;
      }
      return 5000;
    },
    enabled: !!paymentId && !isExpired,
  });

  useEffect(() => {
    if (!paymentId) {
      navigate('/cart', { replace: true });
    }
  }, [paymentId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (statusData?.payment?.status === PAYMENT_SUCCESS || statusData?.order?.status === ORDER_CONFIRMED) {
      sessionStorage.removeItem('paymentId');
      sessionStorage.removeItem('providerPaymentId');
      sessionStorage.removeItem('paytmUpiIntentUri');
      sessionStorage.removeItem('paytmUpiId');
      navigate('/order-confirmation', { replace: true });
    }
  }, [statusData, navigate]);

  const handleCopy = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isFailed = statusData?.payment?.status === PAYMENT_FAILED;
  const isSuccess = statusData?.payment?.status === PAYMENT_SUCCESS;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="max-w-md mx-auto space-y-6 pt-6 pb-12 px-4">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
        <div className="flex items-center justify-center gap-2 text-primary-700 font-semibold text-xl bg-primary-50 w-fit mx-auto px-4 py-1.5 rounded-full">
          {formatINR(amount)}
        </div>
        <p className="text-sm text-gray-500 font-medium">Order #{orderNumber}</p>
      </div>

      {isSuccess ? (
        <div className="bg-white rounded-3xl border border-green-100 shadow-sm p-8 text-center space-y-4 animate-in zoom-in duration-300">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-500 text-sm">Redirecting you to order confirmation...</p>
        </div>
      ) : isFailed ? (
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-red-600">Payment Failed</h2>
          <p className="text-gray-600 text-sm">Your payment could not be completed.</p>
          <Button onClick={() => navigate('/cart', { replace: true })} className="w-full">
            Back to Checkout
          </Button>
        </div>
      ) : isExpired ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Session Expired</h2>
          <p className="text-gray-500 text-sm">Your payment session has expired.</p>
          <Button onClick={() => navigate('/cart', { replace: true })} className="w-full">
            Generate New Payment
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative">
          
          {/* Main QR Section */}
          <div className="p-8 flex flex-col items-center space-y-6">
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 relative group cursor-pointer transition-transform hover:scale-105">
              <a href={upiIntentUri} target="_blank" rel="noopener noreferrer" className="block relative">
                <QRCodeSVG 
                  value={upiIntentUri} 
                  size={220} 
                  level="Q"
                  includeMargin={true}
                  className="rounded-2xl"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                    <QrCode className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
              </a>
            </div>
            
            <div className="text-center space-y-1 w-full">
              <p className="font-semibold text-gray-900 text-sm tracking-wide uppercase">Scan to Pay securely</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium pt-2">
                <span>GPay</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>PhonePe</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>Paytm</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>BHIM</span>
              </div>
            </div>

            {isMobile && (
              <a 
                href={upiIntentUri} 
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3.5 px-4 rounded-2xl font-medium transition-colors"
              >
                <Smartphone className="h-5 w-5" />
                Pay via UPI App
              </a>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 border-dashed" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-300 font-bold tracking-widest">or</span>
            </div>
          </div>

          {/* UPI ID Section */}
          <div className="p-6 bg-gray-50/50 flex flex-col items-center space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pay to UPI ID</p>
            
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 pl-4 w-full shadow-sm">
              <span className="text-sm font-medium text-gray-900 flex-1 truncate">{upiId}</span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleCopy}
                className="bg-gray-50 hover:bg-gray-100 text-gray-600 shrink-0 border-0 shadow-none h-8"
              >
                {isCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1.5">{isCopied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Footer Status Section */}
          <div className="bg-gray-900 p-5 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Secure UPI Payment</span>
            </div>
            
            <div className="flex items-center justify-between w-full text-xs font-medium px-2">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Waiting for payment...
              </div>
              <div className="flex items-center gap-1.5 bg-gray-800 text-gray-300 px-2 py-1 rounded-md">
                <RefreshCcw className="h-3 w-3" />
                <span className={`${timeLeft < 60 ? 'text-red-400' : ''}`}>{timeString}</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
