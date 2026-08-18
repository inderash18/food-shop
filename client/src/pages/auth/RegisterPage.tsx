import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { UtensilsCrossed } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';

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
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>();

  const onSubmit = async (values: RegisterForm) => {
    setServerError('');
    try {
      const user = await registerUser({
        name: values.name,
        email: values.email,
        studentId: values.studentId,
        phone: values.phone,
        password: values.password,
      });
      toast('success', `Welcome, ${user.name.split(' ')[0]}! Your account is ready.`);
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-flex h-12 w-12 rounded-2xl bg-primary-600 text-white items-center justify-center">
            <UtensilsCrossed className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500">Sign up to start ordering from the food shop</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Input
            label="Full name"
            placeholder="Your name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="student@college.edu"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })}
          />
          <Input
            label="Student ID"
            placeholder="e.g. STU12345"
            error={errors.studentId?.message}
            {...register('studentId', { required: 'Student ID is required', minLength: { value: 2, message: 'Student ID is too short' } })}
          />
          <Input
            label="Phone (optional)"
            placeholder="+91 98765 43210"
            error={errors.phone?.message}
            {...register('phone', { pattern: { value: /^[+\d\s-]{7,20}$/, message: 'Enter a valid phone number' } })}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === watch('password') || 'Passwords do not match',
            })}
          />

          {serverError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{serverError}</p>}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
