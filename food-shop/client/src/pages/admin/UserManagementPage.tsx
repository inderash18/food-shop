import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, UserPlus, Shield, Key, CheckCircle, XCircle, Eye } from 'lucide-react';
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
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', studentId: '', role: 'STAFF' as 'STAFF' | 'ADMIN' });
  const [createdStaffTempPass, setCreatedStaffTempPass] = useState<string | null>(null);

  const [selectedUserDetail, setSelectedUserDetail] = useState<{ user: User; stats: { orderCount: number; totalSpend: number } } | null>(null);
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

  const createStaffMutation = useMutation({
    mutationFn: (body: typeof staffForm) => adminApi.createStaff(body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setCreatedStaffTempPass(res.temporaryPassword);
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

  const handleOpenDetail = async (id: string) => {
    const detail = await adminApi.userDetail(id);
    setSelectedUserDetail(detail);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>;
      case 'ADMIN':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">ADMIN</span>;
      case 'STAFF':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">KITCHEN STAFF</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">STUDENT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User & Staff Accounts</h1>
          <p className="text-xs text-slate-500">Manage student profiles, kitchen staff permissions, and administrators</p>
        </div>
        {currentUser?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => {
              setStaffForm({ name: '', email: '', studentId: '', role: 'STAFF' });
              setCreatedStaffTempPass(null);
              setIsStaffModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff / Admin
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, Email, or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 bg-white"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admins</option>
          <option value="SUPER_ADMIN">Super Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading user directory...</div>
        ) : data?.users && data.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3 font-mono">College ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900">{user.name}</p>
                        <p className="text-slate-400 text-[11px]">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{user.studentId}</td>
                    <td className="px-4 py-3">
                      {currentUser?.role === 'SUPER_ADMIN' && user._id !== currentUser._id ? (
                        <select
                          value={user.role}
                          onChange={(e) => setRoleMutation.mutate({ id: user._id, role: e.target.value })}
                          className="border border-slate-200 rounded-lg text-[11px] py-1 px-2 font-semibold bg-slate-50"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="STAFF">STAFF</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      ) : (
                        getRoleBadge(user.role)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user._id === currentUser?._id ? (
                        <span className="text-emerald-600 font-bold">Active (You)</span>
                      ) : (
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: user._id, isActive: !user.isActive })}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            user.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {user.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenDetail(user._id)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                        title="View Stats"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setResetPassUserId(user._id)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No users found</div>
        )}
      </div>

      {/* User Stats Modal */}
      {selectedUserDetail && (
        <Modal
          open={Boolean(selectedUserDetail)}
          onClose={() => setSelectedUserDetail(null)}
          title={`User Profile — ${selectedUserDetail.user.name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-900">{selectedUserDetail.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">College ID:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedUserDetail.user.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <div>{getRoleBadge(selectedUserDetail.user.role)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3.5 rounded-xl text-center">
                <p className="text-[11px] text-blue-600 font-bold uppercase">Total Orders</p>
                <p className="text-xl font-bold text-blue-950 mt-1">{selectedUserDetail.stats.orderCount}</p>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl text-center">
                <p className="text-[11px] text-emerald-600 font-bold uppercase">Total Spend</p>
                <p className="text-xl font-bold text-emerald-950 mt-1">₹{selectedUserDetail.stats.totalSpend}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Staff Modal */}
      {isStaffModalOpen && (
        <Modal
          open={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          title="Create Staff / Admin Account"
        >
          {createdStaffTempPass ? (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <p className="text-emerald-800 font-bold">Staff Account Created Successfully!</p>
                <p className="text-emerald-700">Please securely share these temporary credentials with the staff member:</p>
                <div className="bg-white p-2.5 rounded-lg border font-mono font-bold text-slate-900">
                  Temporary Password: {createdStaffTempPass}
                </div>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createStaffMutation.mutate(staffForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Staff / Employee ID</label>
                <input
                  type="text"
                  required
                  value={staffForm.studentId}
                  onChange={(e) => setStaffForm({ ...staffForm, studentId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as 'STAFF' | 'ADMIN' })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="STAFF">Kitchen Staff (Order processing only)</option>
                  <option value="ADMIN">Administrator (Full catalog, orders & reports access)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
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
        <Modal
          open={Boolean(resetPassUserId)}
          onClose={() => setResetPassUserId(null)}
          title="Reset User Password"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetPasswordMutation.mutate({ id: resetPassUserId, newPassword });
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-700 font-bold mb-1">New Password (Min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetPassUserId(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
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
