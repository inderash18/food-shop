import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket, Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { adminApi, type Coupon } from '../../api/admin';
import { Modal } from '../../components/admin/Modal';

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    value: 10,
    minOrder: 50,
    maxDiscount: 50,
    usageLimit: 500,
    isActive: true,
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: adminApi.coupons,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof formData) => adminApi.createCoupon(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof formData> }) =>
      adminApi.updateCoupon(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setEditingCoupon(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 50,
      maxDiscount: 50,
      usageLimit: 500,
      isActive: true,
    });
    setEditingCoupon(null);
  };

  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      maxDiscount: c.maxDiscount,
      usageLimit: c.usageLimit,
      isActive: c.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
    };
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon._id, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discount Coupons & Offers</h1>
          <p className="text-xs text-slate-500">Manage student discount promotional vouchers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading coupons...</div>
        ) : coupons && coupons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Min Order</th>
                  <th className="px-4 py-3">Max Cap</th>
                  <th className="px-4 py-3">Redeemed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <Ticket className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-bold text-blue-700 text-sm">{coupon.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {coupon.type === 'PERCENTAGE' ? `${coupon.value}% OFF` : `₹${coupon.value} FLAT`}
                    </td>
                    <td className="px-4 py-3 font-mono">₹{coupon.minOrder}</td>
                    <td className="px-4 py-3 font-mono">{coupon.maxDiscount ? `₹${coupon.maxDiscount}` : 'None'}</td>
                    <td className="px-4 py-3 font-mono">
                      {coupon.usedCount} / {coupon.usageLimit > 0 ? coupon.usageLimit : '∞'}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.isActive ? (
                        <span className="text-emerald-600 font-bold text-[11px]">ACTIVE</span>
                      ) : (
                        <span className="text-slate-400 font-bold text-[11px]">DISABLED</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(coupon)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete coupon ${coupon.code}?`)) {
                            deleteMutation.mutate(coupon._id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No active discount coupons</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingCoupon ? `Edit ${editingCoupon.code}` : 'Create New Coupon'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Coupon Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full p-2 border border-slate-200 rounded-xl font-mono uppercase font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. FESTIVE20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Discount Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERCENTAGE' | 'FLAT' })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Value {formData.type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Min. Order (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Max Cap (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Usage Limit</label>
                <input
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active Coupon
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {editingCoupon ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
