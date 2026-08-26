import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Key, ChevronLeft, ChevronRight, Users, ShoppingBag, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { User } from '../../lib/types';
import { Modal } from '../../components/admin/Modal';
import { useAuthStore } from '../../stores/auth';

type ExtendedUser = User & {
  mobile?: string;
  mobileNumber?: string;
  phone?: string;
  status?: string;
  orderCount?: number;
  lastLoginAt?: string | null;
};

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'STUDENT' | 'ADMINS' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', studentId: '', role: 'ADMIN' as 'ADMIN' | 'STUDENT' });
  const [createdTempPass, setCreatedTempPass] = useState<string | null>(null);

  const [resetPassUserId, setResetPassUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Map filterTab to API params
  const roleParam = filterTab === 'STUDENT' ? 'STUDENT' : filterTab === 'ADMINS' ? 'ADMINS' : undefined;
  const statusParam = filterTab === 'ACTIVE' ? 'ACTIVE' : filterTab === 'INACTIVE' ? 'INACTIVE' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, filterTab, page],
    queryFn: () =>
      adminApi.users({
        search: search.trim() || undefined,
        role: roleParam,
        status: statusParam,
        page,
        limit,
      }),
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
    mutationFn: (body: typeof userForm) => adminApi.createStaff(body),
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

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to delete user');
    },
  });

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${userName}"? This will remove their account and related data.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const totalUsers = data?.total ?? 0;
  const totalPages = data?.pages || Math.max(1, Math.ceil(totalUsers / limit));
  const usersList = (data?.users || []) as ExtendedUser[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {totalUsers} {totalUsers === 1 ? 'Registered User' : 'Registered Users / Students'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Real authenticated students and store administrator from MongoDB</p>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, mobile number, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'STUDENT', label: 'Students' },
              { id: 'ADMINS', label: 'Admin' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'INACTIVE', label: 'Inactive' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterTab(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === tab.id
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading registered students...</div>
        ) : usersList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Mobile</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-4 py-3.5">Orders</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usersList.map((user) => {
                  const userId = (user as any).id || (user as any)._id || '';
                  const currentUserId = (currentUser as any)?.id || (currentUser as any)?._id || '';
                  const isSelf = Boolean(currentUserId && userId && currentUserId === userId);
                  const mobile = user.mobile || user.mobileNumber || user.phone || '—';
                  const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';
                  const orderCount = user.orderCount ?? 0;

                  return (
                    <tr
                      key={userId}
                      className={`hover:bg-gray-50/70 transition-colors ${!user.isActive ? 'opacity-60 bg-gray-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{user.name || 'Unnamed Student'}</div>
                        <div className="text-[11px] text-gray-500">{user.email || user.studentId || '—'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 font-medium">{mobile}</td>
                      <td className="px-4 py-3">
                        {currentUser?.role === 'SUPER_ADMIN' && !isSelf ? (
                          <select
                            value={user.role}
                            onChange={(e) => setRoleMutation.mutate({ id: userId, role: e.target.value })}
                            className="border border-gray-200 rounded-lg text-[11px] py-1 px-2 font-semibold bg-gray-50 cursor-pointer hover:border-gray-300"
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span
                            className={`font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                              user.role === 'STUDENT'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{joinedDate}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                          <ShoppingBag className="w-3 h-3 text-gray-500" />
                          {orderCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-emerald-600 font-bold text-[11px]">Active (You)</span>
                        ) : (
                          <button
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: userId, isActive: !user.isActive })
                            }
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                              user.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {user.isActive ? 'ACTIVE' : 'BLOCKED'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setResetPassUserId(userId)}
                          className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors inline-flex items-center gap-1 border border-gray-200 text-[11px]"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" /> Reset Pass
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteUser(userId, user.name || 'User')}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors inline-flex items-center gap-1 border border-rose-200 text-[11px]"
                            title="Delete User"
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400">No registered students or users found</div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing page <span className="font-bold text-gray-900">{page}</span> of{' '}
              <span className="font-bold text-gray-900">{totalPages}</span> ({totalUsers} total)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 inline-flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
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
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full py-2 bg-gray-900 text-white rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate(userForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">College ID</label>
                <input
                  type="text"
                  required
                  value={userForm.studentId}
                  onChange={(e) => setUserForm({ ...userForm, studentId: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Assigned Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'ADMIN' | 'STUDENT' })}
                  className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="STUDENT">Student</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetPassUserId && (
        <Modal open={Boolean(resetPassUserId)} onClose={() => setResetPassUserId(null)} title="Reset Password">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetPasswordMutation.mutate({ id: resetPassUserId, newPassword });
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-gray-700 font-bold mb-1">New Password (Min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetPassUserId(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

