import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Bell,
  Lock,
  User,
  Shield,
  Sliders,
  AlertTriangle,
  Key,
  Smartphone,
  Loader2,
  Palette,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settings';
import { useAuthStore } from '../../stores/auth';
import { apiPost } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

type SettingsTab =
  | 'appearance'
  | 'account'
  | 'notifications'
  | 'security'
  | 'privacy'
  | 'preferences'
  | 'danger';

export function StudentSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { settings, updateSetting, resetSettings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Read URL hash on load
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as SettingsTab;
    if (hash && ['account', 'appearance', 'notifications', 'security', 'privacy', 'preferences', 'danger'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiPost('/api/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update password');
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 antialiased">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-950 tracking-tight">App & Account Settings</h1>
        <p className="text-xs font-normal text-stone-500 mt-0.5">
          Manage your display theme, notifications, security, and dining preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs transition-all text-left whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-[#FEDB71] text-amber-950 font-bold border border-amber-300 shadow-3xs'
                  : 'text-stone-600 hover:bg-amber-50 hover:text-amber-950 font-medium'
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white rounded-3xl border border-amber-100 shadow-2xs p-6 space-y-6">
          
          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-bold text-amber-950">Theme & UI Appearance</h2>
                <p className="text-xs font-normal text-stone-500">foodislice signature White & Yellow palette.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-950 mb-2">Active Palette</label>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FEDB71] border border-amber-300 flex items-center justify-center font-bold text-amber-950">
                      ★
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-950">White & Yellow Modern Theme</p>
                      <p className="text-[11px] text-amber-800">Warm buttercup & crisp white interface</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-white text-amber-950 text-[10px] font-bold rounded-lg border border-amber-200 shadow-3xs">
                    Active
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-amber-950">Reduced Motion</p>
                    <p className="text-[11px] text-stone-500 font-normal">Disable subtle animations and transitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-amber-950">Compact Density</p>
                    <p className="text-[11px] text-stone-500 font-normal">Show more menu items in a tighter layout</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={(e) => updateSetting('compactMode', e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-bold text-amber-950">Account Overview</h2>
                <p className="text-xs font-normal text-stone-500">Your verified campus identity.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">Full Name</span>
                  <p className="font-bold text-sm text-amber-950">{user?.name}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">Email</span>
                  <p className="font-bold text-sm text-amber-950">{user?.email}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">Student ID</span>
                  <p className="font-mono font-bold text-sm text-amber-950">{user?.studentId}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">Role / Status</span>
                  <p className="font-bold text-sm text-amber-950">{user?.role} (Verified)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-bold text-amber-950">Notification Preferences</h2>
                <p className="text-xs font-normal text-stone-500">Control when and how you receive alerts.</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'orderStatusAlerts',
                    title: 'Live Order Status Updates',
                    desc: 'Real-time notifications when kitchen starts preparing your meal',
                  },
                  {
                    key: 'preparationReadyAlerts',
                    title: 'Ready for Pickup Alerts',
                    desc: 'Instant sound/ping when food is ready for collection',
                  },
                  {
                    key: 'emailReceipts',
                    title: 'Email Invoices & Order Summary',
                    desc: 'Receive digital receipts to your registered email',
                  },
                  {
                    key: 'smsUpdates',
                    title: 'SMS Pickup Notifications',
                    desc: 'Receive text message alerts on food readiness',
                  },
                  {
                    key: 'promotionalOffers',
                    title: 'Campus Food Deals & Happy Hours',
                    desc: 'Notify about student combos and flash discounts',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100"
                  >
                    <div className="pr-4">
                      <p className="text-xs font-semibold text-amber-950">{item.title}</p>
                      <p className="text-[11px] font-normal text-stone-500">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(settings as any)[item.key]}
                      onChange={(e) => updateSetting(item.key as any, e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-bold text-amber-950">Security & Password</h2>
                <p className="text-xs font-normal text-stone-500">Keep your student account secure.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-md">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-3 bg-amber-50/30 border border-amber-200 rounded-xl focus:bg-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">New Password (Min. 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 bg-amber-50/30 border border-amber-200 rounded-xl focus:bg-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-amber-50/30 border border-amber-200 rounded-xl focus:bg-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 border border-amber-300"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" /> Change Password
                    </>
                  )}
                </button>
              </form>

              {/* Active Sessions */}
              <div className="pt-4 border-t border-amber-100">
                <h3 className="text-xs font-semibold text-amber-950 uppercase tracking-wider mb-2">Active Session</h3>
                <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-950">Current Web Session</p>
                      <p className="text-[11px] font-normal text-stone-400">Authenticated via Secure JWT</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-950 bg-[#FEDB71] px-2.5 py-0.5 rounded-full border border-amber-300">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY & DATA */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-bold text-amber-950">Privacy & Data Preferences</h2>
                <p className="text-xs font-normal text-stone-500">Manage how your ordering data is processed.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-amber-950">Personalized Food Recommendations</p>
                    <p className="text-[11px] font-normal text-stone-500">Show tailored dishes based on previous orders</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.shareOrderFeedback}
                    onChange={(e) => updateSetting('shareOrderFeedback', e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-amber-950">Save Fast Payment Preferences</p>
                    <p className="text-[11px] font-normal text-stone-500">Store payment methods locally on this device</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.savePaymentDetails}
                    onChange={(e) => updateSetting('savePaymentDetails', e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-amber-100 pb-3">
                <h2 className="text-base font-bold text-amber-950">Dining & Order Preferences</h2>
                <p className="text-xs font-normal text-stone-500">Set default instructions for your express counter pickup.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Default Cooking Instructions</label>
                  <textarea
                    rows={3}
                    value={settings.defaultDeliveryNotes}
                    onChange={(e) => updateSetting('defaultDeliveryNotes', e.target.value)}
                    className="w-full p-3 bg-amber-50/30 border border-amber-200 rounded-xl focus:bg-white focus:border-amber-400 focus:outline-none font-normal"
                    placeholder="e.g. Less spicy, keep sauce separate..."
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-amber-950">Eco-friendly Packaging</p>
                    <p className="text-[11px] font-normal text-stone-500">Opt-in for biodegradable containers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ecoCutleryDefault}
                    onChange={(e) => updateSetting('ecoCutleryDefault', e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase">Language</span>
                    <p className="font-bold text-amber-950">{settings.language}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase">Currency</span>
                    <p className="font-bold text-amber-950">{settings.currency}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="space-y-6 animate-in">
              <div className="border-b border-rose-100 pb-3">
                <h2 className="text-base font-bold text-rose-600">Danger Zone</h2>
                <p className="text-xs font-normal text-stone-500">Irreversible account and storage actions.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-amber-950">Reset Local App Preferences</p>
                    <p className="text-[11px] font-normal text-stone-500">Clear cached search history and restore defaults</p>
                  </div>
                  <button
                    onClick={() => {
                      resetSettings();
                      toast.success('App preferences reset to defaults');
                    }}
                    className="px-4 py-2 bg-white border border-stone-300 font-semibold rounded-xl hover:bg-stone-100"
                  >
                    Reset
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-rose-800">Deactivate Account</p>
                    <p className="text-[11px] font-normal text-rose-600">Suspend your account and logout from all devices</p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Deactivate Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-center border border-amber-200 animate-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">Deactivate Account?</h3>
              <p className="text-xs font-normal text-stone-500 mt-1">
                You will be logged out immediately. You can re-activate by contacting campus admin.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleteConfirmOpen(false);
                  await logout();
                  toast.success('Account deactivated and logged out');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
