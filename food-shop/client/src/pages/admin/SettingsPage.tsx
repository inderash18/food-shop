import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Store, Clock, DollarSign, Shield, Save, CheckCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState(false);

  const [formData, setFormData] = useState({
    collegeName: '',
    shopName: '',
    contactEmail: '',
    contactPhone: '',
    shopStatus: 'OPEN',
    minOrderAmount: 0,
    serviceFee: 0,
    currency: 'INR',
    noticeBanner: '',
    orderOpenTime: '',
    orderCloseTime: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: adminApi.settings,
  });

  useEffect(() => {
    if (data) {
      setFormData({
        collegeName: (data.collegeName as string) || '',
        shopName: (data.shopName as string) || '',
        contactEmail: (data.contactEmail as string) || '',
        contactPhone: (data.contactPhone as string) || '',
        shopStatus: (data.shopStatus as string) || 'OPEN',
        minOrderAmount: Number(data.minOrderAmount) || 0,
        serviceFee: Number(data.serviceFee) || 0,
        currency: (data.currency as string) || 'INR',
        noticeBanner: (data.noticeBanner as string) || '',
        orderOpenTime: (data.orderOpenTime as string) || '',
        orderCloseTime: (data.orderCloseTime as string) || '',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (body: typeof formData) => adminApi.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-settings'] });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Shop Settings</h1>
          <p className="text-xs text-slate-500">Configure food shop availability, operational hours, and ordering rules</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Settings successfully updated and applied!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Status Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Store className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Operational Shop Status</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                formData.shopStatus === 'OPEN'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="shopStatus"
                value="OPEN"
                checked={formData.shopStatus === 'OPEN'}
                onChange={(e) => setFormData({ ...formData, shopStatus: e.target.value })}
                className="sr-only"
              />
              <span className="font-bold text-xs">OPEN FOR ORDERS</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Students can browse & place orders</span>
            </label>

            <label
              className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                formData.shopStatus === 'PAUSED'
                  ? 'border-amber-500 bg-amber-50/50 text-amber-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="shopStatus"
                value="PAUSED"
                checked={formData.shopStatus === 'PAUSED'}
                onChange={(e) => setFormData({ ...formData, shopStatus: e.target.value })}
                className="sr-only"
              />
              <span className="font-bold text-xs">PAUSED (RUSH HOUR)</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Browse menu, ordering disabled</span>
            </label>

            <label
              className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                formData.shopStatus === 'CLOSED'
                  ? 'border-rose-500 bg-rose-50/50 text-rose-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="shopStatus"
                value="CLOSED"
                checked={formData.shopStatus === 'CLOSED'}
                onChange={(e) => setFormData({ ...formData, shopStatus: e.target.value })}
                className="sr-only"
              />
              <span className="font-bold text-xs">CLOSED</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Food shop is currently closed</span>
            </label>
          </div>
        </div>

        {/* General Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Branding & Contact Info</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">College Name</label>
              <input
                type="text"
                required
                value={formData.collegeName}
                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Food Shop Name</label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Support Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Support Phone</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-700 font-bold mb-1">Notice / Announcement Banner</label>
            <input
              type="text"
              placeholder="e.g. Special Breakfast Combo available until 10:30 AM today!"
              value={formData.noticeBanner}
              onChange={(e) => setFormData({ ...formData, noticeBanner: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Pricing Rules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Order Pricing Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Minimum Order Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Service / Packaging Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.serviceFee}
                onChange={(e) => setFormData({ ...formData, serviceFee: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving Settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
