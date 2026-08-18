import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Clock,
  MapPin,
  CheckCircle2,
  Download,
  Share2,
  Utensils,
  Sparkles,
  Ticket,
  AlertCircle,
} from 'lucide-react';
import type { Booking, Order } from '../../lib/types';
import { formatINR } from '../../lib/format';
import { toast } from '../ui/Toast';
import { cn } from '../../lib/utils';

interface DigitalOrderPassModalProps {
  booking: Order | Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DigitalOrderPassModal({ booking, isOpen, onClose }: DigitalOrderPassModalProps) {
  if (!isOpen || !booking) return null;

  const token = booking.tokenNumber || booking.bookingNumber || booking.orderNumber;
  const qrData = booking.qrCodeData || token;
  const isReady = booking.status === 'READY' || booking.collectionStatus === 'READY';
  const isCollected = booking.status === 'COMPLETED' || booking.collectionStatus === 'COLLECTED';

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    toast.success(`Order Token #${token} copied to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in antialiased">
      <div
        className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Pass Area */}
        <div className="overflow-y-auto p-0 flex-1">
          
          {/* Header Banner in Warm Yellow */}
          <div className="bg-[#FEDB71] p-6 text-amber-950 text-center relative border-b border-amber-300 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/40 text-amber-950 text-[10px] font-bold uppercase tracking-wider border border-amber-300">
              <Ticket className="w-3 h-3 text-amber-900" /> Express Pre-Order Pass
            </div>

            {/* Prominent Order Token #A104 */}
            <div className="py-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Order Token</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-amber-950 font-mono tabular-nums">
                #{token}
              </h2>
            </div>

            <p className="text-xs text-amber-900 flex items-center justify-center gap-1 font-bold">
              <MapPin className="w-3.5 h-3.5 text-amber-800" />
              {booking.collectionCounter || 'Counter 2 - Express Pick'}
            </p>

            {/* Status Pill */}
            <div className="pt-1">
              {isCollected ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-amber-950 text-[11px] font-bold uppercase tracking-wider shadow-xs border border-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-900" /> Collected ✓
                </span>
              ) : isReady ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-amber-950 text-[11px] font-bold uppercase tracking-wider animate-bounce shadow-md border border-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-900" /> Ready for Collection!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-200/60 text-amber-950 text-[11px] font-bold uppercase tracking-wider border border-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-900" /> Preparing in Kitchen
                </span>
              )}
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 space-y-5 bg-white relative">
            
            {/* Perforated Notches */}
            <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-amber-100"></div>
            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-amber-100"></div>

            {/* High Contrast QR Code Presentation Box */}
            <div className="flex flex-col items-center justify-center p-5 bg-amber-50/50 rounded-2xl border border-amber-200/80 shadow-3xs space-y-2">
              <div className="p-3.5 bg-white rounded-xl shadow-xs border border-amber-100">
                <QRCodeSVG
                  value={qrData}
                  size={160}
                  level="H"
                  includeMargin={false}
                  fgColor="#451A03"
                />
              </div>
              <p className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider pt-1">
                REF: {booking.orderNumber}
              </p>
              <p className="text-[11px] font-bold text-amber-900 text-center">
                ⚡ Show this QR or Token #{token} at Counter 2
              </p>
            </div>

            {/* Pre-Order Items List */}
            {booking.items && booking.items.length > 0 && (
              <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950 border-b border-amber-200/60 pb-2">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-amber-700" /> Pre-Ordered Food & Drinks
                  </span>
                  <span className="text-[10px] font-bold text-amber-950 bg-[#FEDB71] px-2 py-0.5 rounded-md tabular-nums border border-amber-300">
                    {booking.itemCount || booking.items.length} Items
                  </span>
                </div>
                <div className="divide-y divide-amber-100 text-xs">
                  {booking.items.map((item, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between text-stone-700">
                      <span className="font-normal text-amber-950">
                        <span className="font-bold text-amber-900">{item.quantity}x</span>{' '}
                        {item.productNameSnapshot}
                      </span>
                      <span className="font-bold text-amber-950 tabular-nums">{formatINR(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleCopyToken}
                className="flex-1 py-3 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                Copy Token #{token}
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-3 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText font-semibold text-xs transition-colors"
                title="Print or Save PDF"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
