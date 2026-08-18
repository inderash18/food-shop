import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  Utensils,
  MapPin,
  Sparkles,
  ArrowRight,
  QrCode,
  Download,
  Share2,
  Ticket,
  ChevronRight,
} from 'lucide-react';
import { apiGet } from '../../api/client';
import { formatINR } from '../../lib/format';
import { DigitalOrderPassModal } from '../../components/ticket/DigitalTicketModal';
import type { Order } from '../../lib/types';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function OrderConfirmationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
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
    { label: 'Pre-Order Confirmed', done: true },
    { label: 'Kitchen Preparing', done: order?.status === 'PREPARING' || isReady || isCollected, active: order?.status === 'PREPARING' },
    { label: 'Ready at Counter 2', done: isReady || isCollected, active: isReady },
    { label: 'Collected', done: isCollected },
  ];

  if (isLoading || !order) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-2 border-[#389C9A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-gray-400">Loading order confirmation & digital pass...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 pt-2 antialiased">
      
      {/* Top Success Banner */}
      <div className="bg-[#389C9A] text-white rounded-[28px] p-6 sm:p-8 text-center space-y-3 shadow-teal relative overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-[#FEDB71]" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-100 bg-white/15 px-3 py-0.5 rounded-full">
            Payment Verified Online
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Pre-Order Confirmed!</h1>
          <p className="text-xs text-white/90 font-normal">
            Chefs are preparing your meal. Pick up at Counter 2 when announced.
          </p>
        </div>

        {/* Big Order Token #A104 */}
        <div className="p-4 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 max-w-xs mx-auto">
          <p className="text-[10px] uppercase font-semibold text-teal-100 tracking-wider">Your Pickup Token Number</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#FEDB71] font-mono mt-0.5 tracking-tight tabular-nums">
            #{token}
          </h2>
        </div>
      </div>

      {/* Embedded Digital QR Code Box */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card text-center space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="text-left">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-darkText">Digital Order Pass</h3>
            <p className="text-[11px] text-gray-400 font-normal">Scan at Counter 2 for 10-second pickup</p>
          </div>
          <span className="text-xs font-mono font-medium text-gray-400">REF: {order.orderNumber}</span>
        </div>

        {/* QR Presentation */}
        <div className="p-4 bg-secondaryBg rounded-2xl border border-gray-200/80 inline-block mx-auto shadow-3xs">
          <QRCodeSVG value={qrData} size={150} level="H" fgColor="#1D1D1D" />
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setIsPassModalOpen(true)}
            className="px-6 py-2.5 bg-[#FEDB71] hover:bg-[#fedb71]/90 text-darkText font-semibold text-xs rounded-2xl shadow-3xs flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <QrCode className="w-4 h-4" /> Open Fullscreen Pass
          </button>
        </div>
      </div>

      {/* Live Preparation Timeline */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-darkText flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#389C9A]" /> Live Preparation Status
          </h3>
          <span className="text-xs font-semibold text-[#389C9A] tabular-nums">
            Est. ~{order.estimatedReadyMinutes || 12} mins
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {prepSteps.map((s, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  s.done
                    ? 'bg-[#389C9A] text-white shadow-teal'
                    : s.active
                    ? 'bg-[#FEDB71] text-darkText animate-pulse'
                    : 'bg-secondaryBg text-gray-400 font-normal'
                )}
              >
                {s.done ? '✓' : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight font-medium',
                  s.done ? 'text-darkText font-semibold' : 'text-gray-400'
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Food Items Summary */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-darkText flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-[#389C9A]" /> Pre-Ordered Dishes
        </h3>

        <div className="divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between text-xs font-normal">
              <span className="text-darkText">
                <span className="font-semibold text-[#389C9A]">{item.quantity}x</span>{' '}
                {item.productNameSnapshot}
              </span>
              <span className="font-semibold text-darkText tabular-nums">{formatINR(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-500">Total Paid</span>
          <span className="text-base font-bold text-[#389C9A] tabular-nums">{formatINR(order.total)}</span>
        </div>
      </div>

      {/* Return to Food Menu */}
      <div className="flex gap-3">
        <Link
          to="/menu"
          className="flex-1 py-3.5 bg-secondaryBg hover:bg-gray-100 text-darkText font-semibold text-xs rounded-2xl shadow-3xs text-center flex items-center justify-center gap-1.5 transition-colors"
        >
          Back to Food Menu
        </Link>
        <Link
          to="/orders"
          className="flex-1 py-3.5 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-2xl shadow-teal text-center flex items-center justify-center gap-1.5 transition-transform active:scale-95"
        >
          View in My Orders <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Fullscreen Modal Pass */}
      <DigitalOrderPassModal
        booking={order}
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
      />
    </div>
  );
}
