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

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'READY' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPass, setSelectedPass] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiGet<{ orders: Order[] }>('/api/orders/mine'),
    enabled: !!user,
    staleTime: 20_000,
    refetchInterval: 15_000,
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
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-darkText tracking-tight flex items-center gap-2">
              <Utensils className="w-6 h-6 text-[#389C9A]" /> My Pre-Orders & Digital Passes
            </h1>
            <p className="text-xs font-normal text-gray-500 mt-0.5">
              Track live food preparation, access Order Tokens, and show QR passes at Counter 2.
            </p>
          </div>

          <Link
            to="/menu"
            className="px-4 py-2.5 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-2xl shadow-teal flex items-center justify-center gap-1.5 transition-transform active:scale-95 self-start sm:self-auto"
          >
            <Utensils className="w-3.5 h-3.5" /> New Pre-Order
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md pt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token #A104, dish name, or order ref..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-secondaryBg border border-transparent rounded-[20px] text-xs font-normal text-darkText placeholder:text-gray-400 focus:bg-white focus:border-[#389C9A] focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2">
        {[
          { id: 'ALL', label: `All (${orders.length})` },
          {
            id: 'ACTIVE',
            label: `Active (${orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length})`,
          },
          {
            id: 'READY',
            label: `Ready for Pick (${orders.filter((o) => o.status === 'READY' || o.collectionStatus === 'READY').length})`,
          },
          {
            id: 'COMPLETED',
            label: `Collected (${orders.filter((o) => o.status === 'COMPLETED').length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all select-none',
              activeTab === tab.id
                ? 'bg-[#389C9A] text-white font-semibold shadow-teal'
                : 'text-gray-600 hover:bg-secondaryBg'
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
            <div key={n} className="h-40 bg-secondaryBg rounded-[28px]" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-gray-100 p-12 text-center space-y-3 shadow-card">
          <Ticket className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-darkText">No pre-orders found in this tab</h3>
          <p className="text-xs font-normal text-gray-400">Pre-order freshly prepared food online to skip waiting lines.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#389C9A] text-white font-semibold text-xs rounded-xl shadow-teal"
          >
            Browse Food Menu <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const token = order.tokenNumber || order.orderNumber;
            const isReady = order.status === 'READY' || order.collectionStatus === 'READY';
            const isCollected = order.status === 'COMPLETED' || order.collectionStatus === 'COLLECTED';

            return (
              <div
                key={order._id}
                className="bg-white rounded-[28px] border border-gray-100 shadow-card p-5 sm:p-6 space-y-4 hover:border-teal-200 transition-all"
              >
                {/* Header with Token */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#389C9A] tabular-nums tracking-tight">
                      #{token}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider">
                        {order.orderNumber}
                      </span>
                      <p className="text-xs text-gray-500 font-normal">
                        {order.collectionCounter || 'Counter 2 - Express Pick'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCollected ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-secondaryBg text-gray-600 text-[10px] font-semibold uppercase tracking-wider">
                        Collected
                      </span>
                    ) : isReady ? (
                      <span className="px-3 py-1 rounded-full bg-[#FEDB71] text-darkText text-[11px] font-semibold uppercase tracking-wider animate-bounce shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Ready for Collection!
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-[#225353] text-[10px] font-semibold uppercase tracking-wider">
                        Kitchen Preparing
                      </span>
                    )}
                    <span className="text-xs font-bold text-darkText tabular-nums">{formatINR(order.total)}</span>
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
