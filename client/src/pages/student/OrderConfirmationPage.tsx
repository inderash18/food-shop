import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  Utensils,
  MapPin,
  ArrowRight,
  QrCode,
  Building,
  Home,
  Receipt,
  Navigation,
} from 'lucide-react';
import { apiGet } from '../../api/client';
import { formatINR } from '../../lib/format';
import { DigitalOrderPassModal } from '../../components/ticket/DigitalTicketModal';
import type { Order } from '../../lib/types';
import { cn } from '../../lib/utils';

export function OrderConfirmationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = sessionStorage.getItem('orderId') ?? searchParams.get('orderId') ?? '';
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['order-confirmation', orderId],
    queryFn: () => apiGet<{ order: Order }>(`/api/orders/${orderId}`),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const order = query.state.data?.order;
      if (!order) return false;
      return order.status === 'COMPLETED' || order.status === 'CANCELLED' ? false : 8000;
    },
  });

  const order = data?.order;

  const token = order?.tokenNumber || order?.orderNumber || 'A104';
  const qrData = order?.qrCodeData || token;
  const isReady = order?.status === 'READY' || order?.collectionStatus === 'READY';
  const isCollected = order?.status === 'COMPLETED' || order?.collectionStatus === 'COLLECTED';

  const prepSteps = [
    { label: 'Payment Verified', done: true },
    { label: 'Kitchen Preparing', done: order?.status === 'PREPARING' || isReady || isCollected, active: order?.status === 'PREPARING' },
    { label: 'Ready at Counter 2', done: isReady || isCollected, active: isReady },
    { label: 'Collected', done: isCollected },
  ];

  if (isLoading || !order) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-stone-400">Verifying payment & loading confirmation...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-28 pt-2 antialiased px-1 sm:px-0">
      
      {/* Top Success Banner */}
      <div className="bg-[#FEDB71] text-amber-950 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-card border border-amber-300 relative overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-white text-amber-950 flex items-center justify-center mx-auto shadow-3xs border border-amber-200">
          <CheckCircle2 className="w-8 h-8 text-amber-900" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-white/70 px-3 py-0.5 rounded-full border border-amber-300">
            ✓ Payment Verified
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-950 tracking-tight">Pre-Order Confirmed</h1>
          <p className="text-xs text-amber-900 font-medium">
            Order #{order.orderNumber} • Cheering chefs are preparing your meal.
          </p>
        </div>

        {/* Big Order Token */}
        <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-amber-300 max-w-xs mx-auto shadow-3xs">
          <p className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">Your Pickup Token Number</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-amber-950 font-mono mt-0.5 tracking-tight tabular-nums">
            #{token}
          </h2>
        </div>
      </div>

      {/* Embedded Digital Pass QR Code Box */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-card text-center space-y-4">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <div className="text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">Digital Order Pass</h3>
            <p className="text-[11px] text-stone-500 font-normal">Show Token #{token} or QR at Counter 2</p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            Status: {order.status}
          </span>
        </div>

        {/* QR Code */}
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 inline-block mx-auto shadow-3xs">
          <QRCodeSVG value={qrData} size={150} level="H" fgColor="#451A03" />
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setIsPassModalOpen(true)}
            className="px-6 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-2xl shadow-3xs flex items-center gap-1.5 transition-transform active:scale-95 border border-amber-300"
          >
            <QrCode className="w-4 h-4" /> Open Fullscreen Digital Pass
          </button>
        </div>
      </div>

      {/* Shop Information */}
      <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center font-bold shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-stone-400">Collection Counter</span>
            <p className="text-xs font-bold text-amber-950">Campus Main Canteen — Counter 2</p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-950 bg-[#FEDB71] px-2.5 py-1 rounded-lg border border-amber-300">
          Fast-Track
        </span>
      </div>

      {/* Live Preparation Timeline */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" /> Live Preparation Status
          </h3>
          <span className="text-xs font-bold text-amber-900 tabular-nums">
            Est. ~{order.estimatedReadyMinutes || 10} mins
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {prepSteps.map((s, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  s.done
                    ? 'bg-[#FEDB71] text-amber-950 border border-amber-300 shadow-3xs'
                    : s.active
                    ? 'bg-amber-200 text-amber-950 animate-pulse border border-amber-300'
                    : 'bg-stone-100 text-stone-400 font-normal'
                )}
              >
                {s.done ? '✓' : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight font-medium',
                  s.done ? 'text-amber-950 font-bold' : 'text-stone-400'
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-Ordered Dishes Summary */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-amber-700" /> Pre-Ordered Items
        </h3>

        <div className="divide-y divide-amber-100/80">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between text-xs font-normal">
              <span className="text-amber-950 font-medium">
                <span className="font-bold text-amber-900">{item.quantity}×</span>{' '}
                {item.productNameSnapshot}
              </span>
              <span className="font-bold text-amber-950 tabular-nums">{formatINR(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-amber-100 flex items-center justify-between text-xs">
          <span className="font-bold text-stone-600">Total Paid</span>
          <span className="text-lg font-bold text-amber-950 tabular-nums">{formatINR(order.total)}</span>
        </div>
      </div>

      {/* Action Buttons (Section 19 Spec) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Link
          to={`/orders/${order._id}`}
          className="py-3.5 px-4 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-2xl shadow-3xs text-center flex items-center justify-center gap-1.5 transition-transform active:scale-98 border border-amber-300"
        >
          <Navigation className="w-4 h-4" /> TRACK ORDER
        </Link>
        <Link
          to="/orders"
          className="py-3.5 px-4 bg-white hover:bg-amber-50 text-amber-950 font-bold text-xs rounded-2xl border border-amber-200 text-center flex items-center justify-center gap-1.5 transition-colors shadow-3xs"
        >
          <Receipt className="w-4 h-4 text-amber-700" /> VIEW ORDER
        </Link>
        <Link
          to="/menu"
          className="py-3.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-2xl text-center flex items-center justify-center gap-1.5 transition-colors"
        >
          <Home className="w-4 h-4 text-stone-600" /> BACK TO HOME
        </Link>
      </div>

      {/* Fullscreen Digital Pass Modal */}
      <DigitalOrderPassModal
        booking={order}
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
      />
    </div>
  );
}
