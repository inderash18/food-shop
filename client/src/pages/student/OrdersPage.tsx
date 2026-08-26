import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  Clock,
  MapPin,
  QrCode,
  Search,
  CheckCircle2,
  Utensils,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { formatINR } from '../../lib/format';
import { DigitalOrderPassModal } from '../../components/ticket/DigitalTicketModal';
import type { Order } from '../../lib/types';
import { cn } from '../../lib/utils';

function getFriendlyStatus(status: string) {
  switch (status) {
    case 'PAYMENT_PENDING':
      return { label: 'Payment Pending', badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200' };
    case 'CONFIRMED':
      return { label: 'Confirmed', badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200' };
    case 'PREPARING':
      return { label: 'Preparing', badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300' };
    case 'READY':
      return { label: 'Ready for Pickup', badgeClass: 'bg-[#FEDB71] text-amber-950 font-bold border border-amber-300 shadow-3xs' };
    case 'COMPLETED':
      return { label: 'Completed', badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
    case 'CANCELLED':
      return { label: 'Cancelled', badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200' };
    case 'PAYMENT_FAILED':
      return { label: 'Payment Failed', badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200' };
    default:
      return { label: status, badgeClass: 'bg-gray-100 text-gray-800 border border-gray-200' };
  }
}

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'READY' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPass, setSelectedPass] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiGet<{ orders: Order[] }>('/api/orders/mine'),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const orders = data?.orders || [];

  const filteredOrders = orders.filter((o) => {
    const isCancelled = o.status === 'CANCELLED' || o.status === 'PAYMENT_FAILED';
    const isCompleted = o.status === 'COMPLETED' || o.collectionStatus === 'COLLECTED';
    const isReady = o.status === 'READY' || o.collectionStatus === 'READY';
    const isActive = !isCancelled && !isCompleted;

    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'ACTIVE'
        ? isActive
        : activeTab === 'READY'
        ? isReady
        : isCompleted;

    const token = o.tokenNumber || o.orderNumber;
    const matchesSearch =
      token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.productNameSnapshot.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 antialiased">
      
      {/* Header Banner */}
      <div className="bg-white rounded-[28px] border border-amber-100 p-6 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-amber-950 tracking-tight flex items-center gap-2">
              <Utensils className="w-6 h-6 text-amber-600" /> My Orders
            </h1>
            <p className="text-xs font-normal text-stone-500 mt-0.5">
              Live updates on your food pre-orders, collection tokens, and receipts.
            </p>
          </div>

          <Link
            to="/menu"
            className="px-4 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-2xl shadow-3xs border border-amber-300 flex items-center justify-center gap-1.5 transition-transform active:scale-95 self-start sm:self-auto"
          >
            <Utensils className="w-3.5 h-3.5" /> Order Food
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md pt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token #A104, dish name, or order ref..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-amber-50/40 border border-amber-200/60 rounded-[20px] text-xs font-normal text-amber-950 placeholder:text-stone-400 focus:bg-white focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
        {(
          [
            { id: 'ALL', label: 'All Orders' },
            { id: 'ACTIVE', label: 'In Progress' },
            { id: 'READY', label: 'Ready for Pickup' },
            { id: 'COMPLETED', label: 'Completed' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all select-none',
              activeTab === tab.id
                ? 'bg-[#FEDB71] text-amber-950 font-bold border border-amber-300 shadow-3xs'
                : 'text-stone-600 hover:bg-amber-50/60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 bg-amber-50/40 rounded-[28px]" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-amber-100 p-12 text-center space-y-3 shadow-card">
          <Ticket className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-amber-950">No orders found in this section</h3>
          <p className="text-xs font-normal text-stone-500">Pre-order freshly prepared food online to skip the lines.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs border border-amber-300"
          >
            Browse Food Menu <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const token = order.tokenNumber || order.orderNumber;
            const statusInfo = getFriendlyStatus(order.status);

            return (
              <div
                key={order._id}
                className="bg-white rounded-[28px] border border-amber-100 shadow-card p-5 sm:p-6 space-y-4 hover:border-amber-300 transition-all"
              >
                {/* Header with Token */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-950 tabular-nums tracking-tight">
                      #{token}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono font-medium text-stone-400 uppercase tracking-wider">
                        {order.orderNumber}
                      </span>
                      <p className="text-xs text-stone-600 font-normal">
                        {order.collectionCounter || 'Counter 2 - Express Pick'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn('px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider', statusInfo.badgeClass)}>
                      {statusInfo.label}
                    </span>
                    <span className="text-xs font-bold text-amber-950 tabular-nums">{formatINR(order.total)}</span>
                  </div>
                </div>

                {/* Dishes Snapshot */}
                <div className="text-xs bg-secondaryBg p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-700 truncate">
                    <Utensils className="w-3.5 h-3.5 text-[#389C9A] shrink-0" />
                    <span className="truncate font-normal">
                      <strong className="font-semibold text-darkText">{order.itemCount || order.items.length} items:</strong>{' '}
                      {order.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#389C9A] uppercase tracking-wider shrink-0">
                    Paid Online
                  </span>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-[11px] font-normal text-gray-400 tabular-nums">
                    {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPass(order)}
                      className="px-4 py-2 bg-[#FEDB71] hover:bg-[#fedb71]/90 text-darkText font-semibold text-xs rounded-xl shadow-3xs flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Show QR Pass
                    </button>

                    <Link
                      to={`/orders/${order._id}`}
                      className="px-3.5 py-2 bg-secondaryBg hover:bg-gray-100 text-darkText font-semibold text-xs rounded-xl transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Digital Pass Modal */}
      <DigitalOrderPassModal
        booking={selectedPass}
        isOpen={!!selectedPass}
        onClose={() => setSelectedPass(null)}
      />
    </div>
  );
}

// Re-export alias
export { OrdersPage as BookingsPage };
