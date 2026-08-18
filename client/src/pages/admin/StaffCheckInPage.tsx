import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  MapPin,
  Clock,
  Loader2,
  Sparkles,
  Ticket,
  User,
  ShieldCheck,
} from 'lucide-react';
import { apiPost } from '../../api/client';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import type { Order } from '../../lib/types';

export function StaffCheckInPage() {
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    order: Order;
    alreadyCollected: boolean;
    message: string;
  } | null>(null);

  const collectMutation = useMutation({
    mutationFn: (qrOrToken: string) =>
      apiPost<{ order: Order; alreadyCollected: boolean; message: string }>('/api/orders/admin/counter-collect', {
        qrOrToken,
      }),
    onSuccess: (data) => {
      setScanResult(data);
      if (data.alreadyCollected) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Order or Token Not Found';
      toast.error(msg);
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    collectMutation.mutate(scanInput.trim());
  };

  const order = scanResult?.order;
  const token = order?.tokenNumber || order?.orderNumber;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 antialiased">
      {/* Header */}
      <div className="bg-[#389C9A] rounded-[28px] p-6 sm:p-7 text-white space-y-2 shadow-teal">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider">
          <QrCode className="w-3 h-3 text-[#FEDB71]" /> Express Counter 2 Station
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">QR Pass & Token Collection</h1>
        <p className="text-xs font-normal text-white/90">
          Enter customer's Order Token (e.g. #A104) or scan their digital QR pass to verify and hand over fresh meals.
        </p>
      </div>

      {/* Scanner Form Input */}
      <form onSubmit={handleScanSubmit} className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-card space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-darkText">
          Enter Order Token (e.g. A104) or Paste QR Data
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="e.g. A104 or scan QR code..."
              className="w-full pl-10 pr-4 py-3 bg-secondaryBg border border-transparent rounded-2xl text-xs font-mono font-medium text-darkText focus:bg-white focus:border-[#389C9A] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={collectMutation.isPending || !scanInput.trim()}
            className="px-6 py-3 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-2xl shadow-teal flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
          >
            {collectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" /> Verify & Dispatch
              </>
            )}
          </button>
        </div>
      </form>

      {/* Verified Order Card */}
      {order && (
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-card p-6 space-y-5 animate-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider">
                {order.orderNumber}
              </span>
              <h2 className="text-3xl font-bold font-mono text-[#389C9A] tabular-nums">#{token}</h2>
            </div>

            {scanResult.alreadyCollected ? (
              <span className="px-3 py-1 rounded-full bg-secondaryBg text-gray-600 text-xs font-semibold uppercase tracking-wider">
                Already Handed Over
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#FEDB71] text-darkText text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Collected ✓
              </span>
            )}
          </div>

          {/* Student details */}
          <div className="p-3 bg-secondaryBg rounded-2xl text-xs space-y-1 text-gray-600">
            <p className="font-semibold text-darkText">Customer Name: {(order as any).userName || (order.userId as any)?.name || 'Student'}</p>
            <p className="font-normal">Collection Counter: <strong className="font-semibold">{order.collectionCounter || 'Counter 2'}</strong></p>
            <p className="text-[11px] text-gray-400 font-normal">Status: {order.status} • Payment: {order.paymentStatus}</p>
          </div>

          {/* Items Checklist */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-darkText">
              Order Items Checklist ({order.items.length})
            </h3>
            <div className="divide-y divide-gray-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-normal text-darkText flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-teal-50 text-[#389C9A] font-semibold flex items-center justify-center text-[10px] tabular-nums">
                      {item.quantity}x
                    </span>
                    {item.productNameSnapshot}
                  </span>
                  <span className="font-semibold text-darkText tabular-nums">{formatINR(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {order.notes && (
            <div className="p-3 bg-teal-50 border border-teal-200/60 rounded-2xl text-xs text-[#225353] font-normal">
              <strong className="font-semibold">Chef Notes:</strong> {order.notes}
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="font-medium text-gray-500">Order Total</span>
            <span className="text-base font-bold text-[#389C9A] tabular-nums">{formatINR(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
