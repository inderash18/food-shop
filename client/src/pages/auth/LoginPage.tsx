import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Mail, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { BrandLogo } from '../../components/ui/BrandLogo';

interface LoginForm {
  identifier: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      navigate(user.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (values: LoginForm) => {
    setServerError('');
    try {
      const loggedUser = await login(values.identifier.trim(), values.password);
      toast.success(`Welcome back, ${loggedUser.name.split(' ')[0]}!`);
      navigate(loggedUser.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    } catch (err: any) {
      setServerError(getErrorMessage(err));
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
          <h1 className="text-2xl font-bold text-darkText tracking-tight">Account Sign In</h1>
          <p className="text-xs font-normal text-gray-500">Access your pre-orders, passes, and account.</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-6 sm:p-7 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
            
            {/* Email / ID Field */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Campus Email or Student ID</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="student@college.edu or STU12345"
                  className="w-full pl-9 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('identifier', { required: 'Please enter your email or student ID' })}
                />
              </div>
              {errors.identifier && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-gray-700">Password</label>
                <Link to="/help" className="text-[11px] font-semibold text-[#389C9A] hover:underline">
                  Need help?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-normal text-zinc-950 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-950 dark:focus:border-white focus:outline-none transition-all"
                  {...register('password', { required: 'Please enter your password' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Server Error Notice */}
            {serverError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-[11px] text-rose-700 dark:text-rose-400 font-semibold animate-in">
                {serverError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 border border-amber-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="pt-2 text-center border-t border-stone-100 dark:border-stone-800">
            <p className="text-xs text-stone-500 font-normal">
              New to foodislice?{' '}
              <Link to="/register" className="font-bold text-amber-700 dark:text-amber-400 hover:underline">
                Create Student Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
