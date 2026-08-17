import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { UtensilsCrossed } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getErrorMessage } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface LoginForm {
  identifier: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    setServerError('');
    try {
      const user = await login(values.identifier, values.password);
      navigate(user.role === 'STUDENT' ? '/' : '/admin', { replace: true });
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
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">Log in with your email or student ID</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Input
            label="Email or Student ID"
            placeholder="student@college.edu"
            autoComplete="username"
            error={errors.identifier?.message}
            {...register('identifier', { required: 'Email or student ID is required' })}
          />
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <p className="mt-2 text-right text-xs text-gray-400">Forgot password? Contact the food shop.</p>
          </div>

          {serverError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{serverError}</p>}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Log in
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          New student?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
