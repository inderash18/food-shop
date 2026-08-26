import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User, KeyRound, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { BrandLogo } from '../../components/ui/BrandLogo';

export function RegisterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'MOBILE' | 'OTP'>('MOBILE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // If already logged in, redirect home
  useEffect(() => {
    if (user) {
      navigate(user.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    }
  }, [user, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleaned = mobileNumber.trim().replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(cleaned, 'register');
      toast.success('OTP sent successfully to your mobile number!');
      setStep('OTP');
      setCooldown(res.cooldownSeconds || 60);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code sent to your phone');
      return;
    }

    setLoading(true);
    try {
      const newUser = await verifyOtp(mobileNumber, otp.trim(), name);
      toast.success(`Account created! Welcome, ${newUser.name}!`);
      navigate(newUser.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-100 selection:text-teal-900 antialiased">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center mb-1">
            <BrandLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-darkText tracking-tight">Simple Registration</h1>
          <p className="text-xs text-gray-500">Create an account with just your mobile number and OTP.</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-6 sm:p-7 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-semibold animate-in">
              {error}
            </div>
          )}

          {step === 'MOBILE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Mobile Number</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500 font-semibold border-r pr-2 border-gray-200">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    required
                    autoFocus
                    className="w-full pl-16 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-semibold tracking-wider text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Your Name (Optional)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Kumar"
                    className="w-full pl-10 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || mobileNumber.trim().length < 10}
                className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...
                  </>
                ) : (
                  <>
                    Send Registration OTP <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-gray-700">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('MOBILE');
                      setOtp('');
                    }}
                    className="text-[11px] text-[#389C9A] hover:underline font-semibold"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-sm font-bold tracking-widest text-center text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">OTP sent to +91 {mobileNumber}</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Verify & Complete Registration <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-xs text-[#389C9A] hover:underline font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Switch to Login */}
          <div className="pt-2 text-center border-t border-stone-100">
            <p className="text-xs text-stone-500 font-normal">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-amber-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
