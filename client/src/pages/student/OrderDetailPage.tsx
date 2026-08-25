import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  ChevronLeft,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  Utensils,
  Share2,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { formatINR } from '../../lib/format';
import { DigitalOrderPassModal } from '../../components/ticket/DigitalTicketModal';
import type { Order } from '../../lib/types';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => apiGet<{ order: Order }>(`/api/orders/${id}`),
    enabled: !!id,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.order?.status;
      if (status === 'COMPLETED' || status === 'CANCELLED') return false;
      return 20_000; // live kitchen fallback
    },
  });

  const order = data?.order;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-2 border-[#389C9A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-gray-400">Loading pre-order pass details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-[28px] border border-gray-100 text-center space-y-4 shadow-card">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-darkText">Pre-Order Not Found</h2>
        <p className="text-xs font-normal text-gray-500">This order does not exist or you do not have permission.</p>
        <Link
          to="/orders"
          className="inline-flex px-5 py-2.5 bg-[#389C9A] text-white font-semibold text-xs rounded-xl shadow-teal"
        >
          Back to My Orders
        </Link>
      </div>
    );
  }

  const token = order.tokenNumber || order.orderNumber || 'A104';
  const qrData = order.qrCodeData || token;
  const isReady = order.status === 'READY' || order.collectionStatus === 'READY';
  const isCollected = order.status === 'COMPLETED' || order.collectionStatus === 'COLLECTED';

  const prepSteps = [
    { title: 'Pre-Order Confirmed', desc: 'Payment verified online', done: true },
    {
      title: 'Kitchen Cooking',
      desc: 'Chefs preparing food freshly',
      done: order.status === 'PREPARING' || isReady || isCollected,
      active: order.status === 'PREPARING',
    },
    {
      title: 'Ready for Collection',
      desc: `Waiting at ${order.collectionCounter || 'Counter 2 - Express Pick'}`,
      done: isReady || isCollected,
      active: isReady,
    },
    {
      title: 'Collected',
      desc: isCollected ? 'Food handed over at counter' : 'Show QR pass upon arrival',
      done: isCollected,
      active: false,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 antialiased">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText transition-colors shadow-3xs flex items-center gap-1 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> All Pre-Orders
        </button>

        <span className="text-xs font-mono font-medium text-gray-400">
          REF: {order.orderNumber}
        </span>
      </div>

      {/* Main Digital Pass Banner */}
      <div className="bg-[#389C9A] rounded-[28px] p-6 sm:p-8 text-white shadow-teal space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider">
              Express Pre-Order
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-100">Pickup Token</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono tabular-nums">
              #{token}
            </h1>
            <p className="text-xs text-white/90 flex items-center gap-1 font-medium pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#FEDB71] shrink-0" />
              {order.collectionCounter || 'Counter 2 - Express Pick'}
            </p>
          </div>

          {/* Mini QR Box */}
          <div
            onClick={() => setIsPassModalOpen(true)}
            className="p-3 bg-white rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-transform flex flex-col items-center gap-1 self-start sm:self-auto"
          >
            <QRCodeSVG value={qrData} size={90} level="M" fgColor="#1D1D1D" />
            <span className="text-[9px] font-semibold text-[#389C9A] uppercase tracking-wider">Tap to Enlarge</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2 relative z-10">
          <button
            onClick={() => setIsPassModalOpen(true)}
            className="w-full py-3 bg-[#FEDB71] hover:bg-[#fedb71]/90 text-darkText font-semibold text-xs rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-98"
          >
            <QrCode className="w-4 h-4" /> Open Full-Screen QR Pass
          </button>
        </div>
      </div>

      {/* Live Preparation Timeline */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-darkText flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-[#389C9A]" /> Live Preparation Status
        </h2>

        <div className="space-y-4 pt-1">
          {prepSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div
                className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5',
                  step.done
                    ? 'bg-[#389C9A] text-white'
                    : step.active
                    ? 'bg-[#FEDB71] text-darkText animate-pulse'
                    : 'bg-secondaryBg text-gray-400'
                )}
              >
                {step.done ? '✓' : idx + 1}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-darkText">{step.title}</p>
                <p className="text-[11px] font-normal text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized Food List */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-darkText">
          Pre-Ordered Food & Drinks
        </h2>

        <div className="divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-normal">
              <span className="flex items-center gap-1.5 text-gray-800">
                <span className="font-semibold text-[#389C9A]">{item.quantity}x</span>{' '}
                {item.productNameSnapshot}
              </span>
              <span className="font-semibold text-darkText tabular-nums">{formatINR(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="p-3 bg-secondaryBg rounded-xl text-xs text-gray-600 font-normal">
            <span className="font-semibold text-darkText">Chef Notes:</span> {order.notes}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-500">Total Paid Online</span>
          <span className="font-bold text-base text-[#389C9A] tabular-nums">{formatINR(order.total)}</span>
        </div>
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

// Re-export alias
export { OrderDetailPage as BookingDetailPage };
