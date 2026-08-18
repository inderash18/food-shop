import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { BrandLogo } from '../../components/ui/BrandLogo';

interface RegisterForm {
  name: string;
  email: string;
  studentId: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const registerUser = useAuthStore((s) => s.register);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const passwordValue = watch('password', '');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'STUDENT' ? '/' : '/admin', { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (values: RegisterForm) => {
    setServerError('');
    try {
      const newUser = await registerUser({
        name: values.name.trim(),
        email: values.email.trim(),
        studentId: values.studentId.trim().toUpperCase(),
        phone: values.phone?.trim(),
        password: values.password,
      });
      toast.success(`Account created! Welcome, ${newUser.name.split(' ')[0]}.`);
      navigate('/login', { replace: true });
    } catch (err: any) {
      setServerError(getErrorMessage(err));
    }
  };

  // Password strength calculation
  const hasMinLength = passwordValue.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*]/.test(passwordValue);

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-100 selection:text-teal-900 antialiased">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center mb-1">
            <BrandLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-darkText tracking-tight">Create Account</h1>
          <p className="text-xs font-normal text-gray-500">Sign up in seconds for express food pre-orders.</p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-6 sm:p-7 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
            
            {/* Full Name */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Alex Kumar"
                  className="w-full pl-9 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name too short' } })}
                />
              </div>
              {errors.name && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.name.message}</p>}
            </div>

            {/* Campus Email */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Campus Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="alex@college.edu"
                  className="w-full pl-9 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                  })}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.email.message}</p>}
            </div>

            {/* Student ID */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Student Roll / ID Number</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. STU202684"
                  className="w-full pl-9 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-mono font-medium uppercase text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('studentId', { required: 'Student ID is required' })}
                />
              </div>
              {errors.studentId && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.studentId.message}</p>}
            </div>

            {/* Phone (Optional) */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Contact Phone (For order pickup SMS)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-10 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters required' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.password.message}</p>}

              {/* Password strength indicators */}
              {passwordValue && (
                <div className="flex gap-2 pt-1 text-[10px] font-semibold">
                  <span className={cn('flex items-center gap-1', hasMinLength ? 'text-[#389C9A]' : 'text-gray-400 font-normal')}>
                    <CheckCircle2 className="w-3 h-3" /> 8+ chars
                  </span>
                  <span className={cn('flex items-center gap-1', hasNumberOrSpecial ? 'text-[#389C9A]' : 'text-gray-400 font-normal')}>
                    <CheckCircle2 className="w-3 h-3" /> Numbers/Symbols
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Repeat your password"
                  className="w-full pl-9 pr-3.5 py-3 bg-secondaryBg border border-gray-200 rounded-xl text-xs font-normal text-darkText focus:bg-white focus:ring-2 focus:ring-[#389C9A] focus:outline-none transition-all"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (v) => v === watch('password') || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Server Error Notice */}
            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-semibold animate-in">
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign In Footer Link */}
        <p className="text-center text-xs text-stone-500 font-normal">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
