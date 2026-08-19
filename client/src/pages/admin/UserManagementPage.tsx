import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Key, Eye } from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { User } from '../../lib/types';
import { Modal } from '../../components/admin/Modal';
import { useAuthStore } from '../../stores/auth';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', studentId: '', role: 'ADMIN' as 'ADMIN' | 'STUDENT' });
  const [createdTempPass, setCreatedTempPass] = useState<string | null>(null);

  const [resetPassUserId, setResetPassUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () => adminApi.users({ search, role: roleFilter || undefined, page, limit: 15 }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.setUserActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.setUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const createUserMutation = useMutation({
    mutationFn: (body: typeof userForm) => adminApi.createStaff(body), // Reuse staff api to create users
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setCreatedTempPass(res.temporaryPassword);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => adminApi.resetPassword(id, newPassword),
    onSuccess: () => {
      alert('Password reset successfully!');
      setResetPassUserId(null);
      setNewPassword('');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-xs text-gray-500">Manage student profiles and administrators</p>
        </div>
        {currentUser?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => {
              setUserForm({ name: '', email: '', studentId: '', role: 'ADMIN' });
              setCreatedTempPass(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
          >
            <UserPlus className="w-4 h-4" /> Add Admin
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Name, Email, or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 bg-white"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="ADMIN">Admins</option>
          <option value="SUPER_ADMIN">Super Admins</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading user directory...</div>
        ) : data?.users && data.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 font-mono">College ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map((user) => (
                  <tr key={user._id} className={`hover:bg-gray-50/70 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{user.studentId}</td>
                    <td className="px-4 py-3">
                      {currentUser?.role === 'SUPER_ADMIN' && user._id !== currentUser._id ? (
                        <select
                          value={user.role}
                          onChange={(e) => setRoleMutation.mutate({ id: user._id, role: e.target.value })}
                          className="border border-gray-200 rounded-lg text-[11px] py-1 px-2 font-semibold bg-gray-50"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      ) : (
                        <span className="font-bold text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{user.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user._id === currentUser?._id ? (
                        <span className="text-emerald-600 font-bold">Active (You)</span>
                      ) : (
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: user._id, isActive: !user.isActive })}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            user.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {user.isActive ? 'ACTIVE' : 'BLOCKED'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setResetPassUserId(user._id)}
                        className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors inline-flex items-center gap-1 border border-gray-200"
                        title="Reset Password"
                      >
                        <Key className="w-3.5 h-3.5" /> Reset Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400">No users found</div>
        )}
      </div>

      {isCreateModalOpen && (
        <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Account">
          {createdTempPass ? (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <p className="text-emerald-800 font-bold">Account Created Successfully!</p>
                <div className="bg-white p-2.5 rounded-lg border font-mono font-bold text-gray-900">
                  Temporary Password: {createdTempPass}
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="w-full py-2 bg-gray-900 text-white rounded-xl font-semibold">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(userForm); }} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Name</label>
                <input type="text" required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Email Address</label>
                <input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">College ID</label>
                <input type="text" required value={userForm.studentId} onChange={(e) => setUserForm({ ...userForm, studentId: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Assigned Role</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'ADMIN' | 'STUDENT' })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="STUDENT">Student</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createUserMutation.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50">Create Account</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {resetPassUserId && (
        <Modal open={Boolean(resetPassUserId)} onClose={() => setResetPassUserId(null)} title="Reset Password">
          <form onSubmit={(e) => { e.preventDefault(); resetPasswordMutation.mutate({ id: resetPassUserId, newPassword }); }} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">New Password (Min 8 chars)</label>
              <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setResetPassUserId(null)} className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={resetPasswordMutation.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50">Reset Password</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
