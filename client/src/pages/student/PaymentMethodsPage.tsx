import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
  Lock,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { usePaymentMethodsStore, SavedPaymentMethod } from '../../stores/paymentMethods';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function PaymentMethodsPage() {
  const {
    methods,
    walletBalance,
    addMethod,
    removeMethod,
    setDefaultMethod,
    topUpWallet,
  } = usePaymentMethodsStore();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);

  // Add UPI State
  const [upiProvider, setUpiProvider] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay');
  const [upiId, setUpiId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState<number>(200);

  const handleAddUpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.includes('@') || upiId.length < 5) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }

    const titles: Record<string, string> = {
      gpay: 'Google Pay UPI',
      phonepe: 'PhonePe UPI',
      paytm: 'Paytm UPI',
    };

    addMethod({
      type: 'upi',
      title: titles[upiProvider],
      subtitle: 'Instant campus checkout',
      identifier: upiId.trim(),
      isDefault: methods.length === 0,
      iconType: upiProvider,
    });

    toast.success('UPI payment method saved');
    setUpiId('');
    setAddModalOpen(false);
  };

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount <= 0) return;
    topUpWallet(topUpAmount);
    toast.success(`Wallet topped up with ${formatINR(topUpAmount)}!`);
    setTopUpModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payment Methods & Wallet</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your verified UPI handles and quick campus dining balance.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-emerald transition-transform active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Payment Method
        </button>
      </div>

      {/* Campus Food Wallet Card */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-emerald-500/20">
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
              ⚡ Campus 1-Tap Pay
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1">Campus Food Wallet</h2>
            <p className="text-xs text-emerald-100/80">Zero transaction failures at canteen & hostel counters</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-emerald-200 uppercase">Available Balance</span>
            <p className="text-3xl font-black text-white">{formatINR(walletBalance)}</p>
          </div>
        </div>

        <div className="relative z-10 pt-4 flex items-center justify-between border-t border-white/15">
          <div className="flex items-center gap-1.5 text-xs text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted & Bank-Grade Security</span>
          </div>
          <button
            onClick={() => setTopUpModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1"
          >
            + Top Up Wallet
          </button>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Saved Payment Methods List */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
          Saved UPI & Digital Accounts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className={cn(
                'bg-white rounded-3xl border p-5 space-y-3 relative transition-all shadow-2xs',
                method.isDefault
                  ? 'border-emerald-300 ring-2 ring-emerald-100'
                  : 'border-gray-100 hover:border-gray-200'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center font-black text-amber-700 text-xs shrink-0 shadow-3xs">
                    {method.iconType === 'wallet' ? <Wallet className="w-5 h-5" /> : 'UPI'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900">{method.title}</h3>
                    <p className="font-mono text-xs text-gray-600">{method.identifier}</p>
                  </div>
                </div>

                {method.isDefault && (
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Default
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs font-bold">
                {!method.isDefault ? (
                  <button
                    onClick={() => {
                      setDefaultMethod(method.id);
                      toast.success(`Set ${method.title} as default`);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Set as Default
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 font-medium">Selected for 1-click checkout</span>
                )}

                {methods.length > 1 && (
                  <button
                    onClick={() => {
                      removeMethod(method.id);
                      toast.success('Payment method removed');
                    }}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADD UPI MODAL                                             */}
      {/* ========================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Add UPI Payment Handle</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUpi} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">App Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['gpay', 'phonepe', 'paytm'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setUpiProvider(p)}
                      className={cn(
                        'py-2.5 px-2 rounded-xl font-bold uppercase text-[11px] border transition-all text-center',
                        upiProvider === p
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      )}
                    >
                      {p === 'gpay' ? 'GPay' : p === 'phonepe' ? 'PhonePe' : 'Paytm'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Your Virtual UPI ID (VPA)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. username@okhdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Find your UPI ID in your GPay / PhonePe / Paytm profile.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-emerald"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP UP WALLET MODAL                                       */}
      {/* ========================================================= */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Top Up Food Wallet</h3>
              <button
                onClick={() => setTopUpModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTopUp} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-2">Select Amount</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={cn(
                        'py-2.5 rounded-xl font-extrabold text-xs border transition-all',
                        topUpAmount === amt
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      )}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-base focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-emerald"
              >
                Add {formatINR(topUpAmount)} to Wallet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
