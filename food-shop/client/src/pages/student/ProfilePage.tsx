import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Mail, Shield, Award, Key, LogOut, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { apiGet, apiPost } from '../../api/client';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: userStats } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => apiGet<{ stats: { orderCount: number; totalSpent: number } }>('/api/orders/me/stats').then((d) => d.stats),
    enabled: Boolean(user),
  });

  const passwordMutation = useMutation({
    mutationFn: (body: { oldPassword: string; newPassword: string }) =>
      apiPost('/api/auth/change-password', body),
    onSuccess: () => {
      setSuccessMessage('Password changed successfully!');
      setErrorMessage('');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update password');
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    passwordMutation.mutate({ oldPassword, newPassword });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
          {user?.name?.slice(0, 2).toUpperCase() || 'ST'}
        </div>
        <div className="text-center sm:text-left space-y-1 flex-1">
          <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
          <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {user?.email}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <span className="bg-blue-50 text-blue-700 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-blue-100">
              ID: {user?.studentId}
            </span>
            <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      {/* Student Activity Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders Placed</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{userStats?.orderCount ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount Spent</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{userStats?.totalSpent ?? 0}</p>
        </div>
      </div>

      {/* Security: Change Password */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Security & Password</h2>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">New Password (Min. 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {passwordMutation.isPending ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
