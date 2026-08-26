import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, RefreshCw, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { OtpInput } from '../../components/auth/OtpInput';

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loginWithPassword = useAuthStore((s) => s.login);
  const sendEmailOTP = useAuthStore((s) => s.sendEmailOTP);
  const verifyEmailOTP = useAuthStore((s) => s.verifyEmailOTP);

  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'EMAIL_OTP'>('PASSWORD');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // If logged in, navigate home
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or Student ID');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await loginWithPassword(identifier.trim(), password);
      toast.success(`Welcome back, ${loggedUser.name}!`);
      navigate(loggedUser.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await sendEmailOTP(cleanEmail, 'login');
      toast.success('Verification code sent to your email!');
      setStep('OTP');
      setCooldown(res.cooldownSeconds || 60);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const loggedUser = await verifyEmailOTP(cleanEmail, otp.trim(), { purpose: 'login' });
      toast.success(`Welcome back, ${loggedUser.name}!`);
      navigate(loggedUser.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (raw: string) => {
    const clean = raw.trim().toLowerCase();
    const parts = clean.split('@');
    if (parts.length !== 2) return clean;
    const [local, domain] = parts;
    const visiblePrefix = local.slice(0, Math.min(2, local.length));
    return `${visiblePrefix}***@${domain}`;
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-100 selection:text-teal-900 antialiased">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center mb-1">
            <BrandLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-darkText tracking-tight">Customer Sign In</h1>
          <p className="text-xs text-gray-500">Sign in to your account with password or email OTP.</p>
        </div>

        {/* Mode Selector Tabs */}
        {step === 'INPUT' && (
          <div className="flex bg-stone-200/70 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('PASSWORD');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMethod === 'PASSWORD' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('EMAIL_OTP');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMethod === 'EMAIL_OTP' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Email OTP
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

          {authMethod === 'PASSWORD' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email or Student ID</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="alex@gmail.com or STU1024"
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : step === 'INPUT' ? (
            <form onSubmit={handleSendEmailOtp} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email / Gmail Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@gmail.com"
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending Code...
                    </>
                  ) : (
                    <>
                      Send Login Code <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmailOtp} className="space-y-4 text-xs">
              <div className="text-center space-y-1.5">
                <div className="w-10 h-10 bg-teal-50 text-[#389C9A] rounded-full flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-darkText text-sm">Verify your email address</h3>
                <p className="text-[11px] text-gray-500">
                  Enter the 6-digit code sent to <br />
                  <span className="font-mono font-bold text-stone-800">{maskEmail(email)}</span>
                </p>

                {/* 6-Digit Accessible OTP Input */}
                <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                <button
                  type="button"
                  onClick={() => {
                    setStep('INPUT');
                    setOtp('');
                  }}
                  className="text-[11px] text-[#389C9A] hover:underline font-semibold pt-1"
                >
                  Change Email
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className="w-full py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Verify & Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleSendEmailOtp()}
                  className="text-xs text-[#389C9A] hover:underline font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* Switch to Register */}
          <div className="pt-2 text-center border-t border-stone-100">
            <p className="text-xs text-stone-500 font-normal">
              New customer?{' '}
              <Link to="/register" className="font-bold text-amber-700 hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link to="/admin/login" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Staff & Admin Login Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}

