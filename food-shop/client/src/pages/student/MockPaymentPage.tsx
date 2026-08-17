import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, CheckCircle2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import apiClient, { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';

export function MockPaymentPage() {
  const { paymentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentId) {
      setError('Invalid payment URL');
    }
  }, [paymentId]);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/payments/simulate', {
        paymentId,
        outcome: 'success',
      });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err) || 'Payment simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFail = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/payments/simulate', {
        paymentId,
        outcome: 'failure',
      });
      setSuccess(false);
      setError('Simulated payment failure sent successfully. The main tab will register this.');
    } catch (err) {
      setError(getErrorMessage(err) || 'Payment simulation failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-green-100 shadow-sm p-8 text-center space-y-4 max-w-sm w-full animate-in zoom-in duration-300">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-500 text-sm">
            You can close this tab. Your original page should automatically redirect you to the order confirmation.
          </p>
          <Button onClick={() => window.close()} className="w-full mt-4">
            Close Tab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 p-6 text-white text-center">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-xl font-bold">Mock Payment Gateway</h1>
          <p className="text-sm text-gray-400 mt-1">For development testing only</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-center text-gray-600 text-sm">
              You are simulating a payment for order ID:<br />
              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900 mt-2 block">{paymentId}</span>
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white border-0"
              onClick={handlePay}
              loading={loading}
              disabled={loading || !paymentId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" /> Simulate Success
                </>
              )}
            </Button>
            
            <Button
              size="lg"
              variant="secondary"
              className="w-full text-red-600 hover:bg-red-50"
              onClick={handleFail}
              disabled={loading || !paymentId}
            >
              Simulate Failure
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
