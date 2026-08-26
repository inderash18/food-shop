import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, User, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { OtpInput } from '../../components/auth/OtpInput';

export function RegisterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const sendPhoneOTP = useAuthStore((s) => s.sendPhoneOTP);
  const verifyPhoneOTP = useAuthStore((s) => s.verifyPhoneOTP);
  const sendEmailOTP = useAuthStore((s) => s.sendEmailOTP);
  const verifyEmailOTP = useAuthStore((s) => s.verifyEmailOTP);

  const [mode, setMode] = useState<'PHONE' | 'EMAIL'>('EMAIL');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Redirect if logged in
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

    if (mode === 'PHONE') {
      const cleaned = phone.trim().replace(/\D/g, '');
      if (cleaned.length < 10) {
        setError('Please enter a valid 10-digit mobile number');
        return;
      }
      setLoading(true);
      try {
        const res = await sendPhoneOTP(cleaned, 'register');
        toast.success('Verification OTP sent to your phone!');
        setStep('OTP');
        setCooldown(res.cooldownSeconds || 60);
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    } else {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        setError('Please enter a valid email address');
        return;
      }
      setLoading(true);
      try {
        const res = await sendEmailOTP(cleanEmail, 'register');
        toast.success('Verification code sent to your email!');
        setStep('OTP');
        setCooldown(res.cooldownSeconds || 60);
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      let newUser;
      if (mode === 'PHONE') {
        newUser = await verifyPhoneOTP(phone, otp.trim(), name);
      } else {
        newUser = await verifyEmailOTP(email, otp.trim(), name);
      }
      toast.success(`Account created! Welcome, ${newUser.name}!`);
      navigate(newUser.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const maskedTarget = mode === 'PHONE'
    ? `+91 ******${phone.slice(-4)}`
    : `${email.slice(0, 2)}***@${email.split('@')[1] || 'email.com'}`;

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-100 selection:text-teal-900 antialiased">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center mb-1">
            <BrandLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-darkText tracking-tight">Create Account</h1>
          <p className="text-xs text-gray-500">Sign up securely using Email or Phone OTP.</p>
        </div>

        {/* Mode Selector Tabs */}
        {step === 'INPUT' && (
          <div className="flex bg-stone-200/70 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('EMAIL')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'EMAIL' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => setMode('PHONE')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'PHONE' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Phone SMS OTP
            </button>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-6 sm:p-7 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-semibold animate-in">
              {error}
            </div>
          )}

          {step === 'INPUT' ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Full Name (Optional)</label>
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

              {mode === 'EMAIL' ? (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                      autoFocus
                      className="w-full pl-10 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500 font-semibold border-r pr-2 border-gray-200">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      required
                      autoFocus
                      className="w-full pl-16 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-semibold tracking-wider text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending Code...
                  </>
                ) : (
                  <>
                    Send Verification Code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-darkText text-sm">Verify your {mode === 'EMAIL' ? 'email' : 'phone'}</h3>
                <p className="text-[11px] text-gray-500">
                  Enter the 6-digit verification code sent to <br />
                  <span className="font-mono font-bold text-stone-800">{maskedTarget}</span>
                </p>

                {/* 6-Digit Accessible OTP Input Component */}
                <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                <button
                  type="button"
                  onClick={() => {
                    setStep('INPUT');
                    setOtp('');
                  }}
                  className="text-[11px] text-[#389C9A] hover:underline font-semibold pt-1"
                >
                  Change {mode === 'EMAIL' ? 'Email' : 'Number'}
                </button>
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
                    Verify & Create Account <ArrowRight className="w-4 h-4" />
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
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
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
