import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, CheckCircle, Clock, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { Order } from '../../lib/types';
import { Modal } from '../../components/admin/Modal';

export function OrderManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'confirmed' | 'all'>('confirmed');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', activeTab, search, statusFilter, paymentFilter, page],
    queryFn: () =>
      adminApi.orders({
        view: activeTab,
        search,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        page,
        limit: 15,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (selectedOrder) setSelectedOrder(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ORDER_CONFIRMED':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">CONFIRMED</span>;
      case 'PREPARING':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">PREPARING</span>;
      case 'READY':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">READY</span>;
      case 'COMPLETED':
        return <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">COMPLETED</span>;
      case 'PAYMENT_PENDING':
        return <span className="bg-amber-50 text-amber-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">PAYMENT PENDING</span>;
      case 'PAYMENT_FAILED':
        return <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">PAYMENT FAILED</span>;
      case 'CANCELLED':
        return <span className="bg-rose-50 text-rose-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">CANCELLED</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="text-xs font-bold text-emerald-600">✓ PAID</span>;
      case 'PENDING':
        return <span className="text-xs font-bold text-amber-600">PENDING</span>;
      case 'FAILED':
        return <span className="text-xs font-bold text-rose-600">FAILED</span>;
      default:
        return <span className="text-xs font-bold text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-xs text-slate-500">Track and manage all campus food orders in real-time</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl">
        <button
          onClick={() => {
            setActiveTab('confirmed');
            setPage(1);
          }}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'confirmed'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          CONFIRMED PAID ORDERS
        </button>
        <button
          onClick={() => {
            setActiveTab('all');
            setPage(1);
          }}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ALL ORDERS (INC. PENDING / FAILED)
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-b-2xl border border-t-0 border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order # or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 bg-white"
          >
            <option value="">All Order Statuses</option>
            <option value="ORDER_CONFIRMED">ORDER_CONFIRMED</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY">READY</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 bg-white"
          >
            <option value="">All Payment Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading orders...</div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{order.userId?.name || 'Student'}</div>
                      <div className="text-slate-400 text-[10px]">{order.userId?.studentId}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      {order.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-bold font-mono text-slate-900">₹{order.total}</td>
                    <td className="px-4 py-3">{getPaymentBadge(order.paymentStatus)}</td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No orders found matching parameters</div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <Modal isOpen={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title={`Order #${selectedOrder.orderNumber}`}>
          <div className="space-y-4 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="font-bold text-slate-900">{selectedOrder.userId?.name}</p>
                <p className="text-slate-500">{selectedOrder.userId?.email}</p>
                <p className="text-slate-400 font-mono">ID: {selectedOrder.userId?.studentId}</p>
              </div>
              <div className="text-right">
                <div>{getStatusBadge(selectedOrder.status)}</div>
                <p className="mt-1">{getPaymentBadge(selectedOrder.paymentStatus)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Items Ordered</p>
              <div className="divide-y divide-slate-100 bg-slate-50 p-3 rounded-xl">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <span>
                      <span className="font-bold text-blue-600 mr-1">{item.quantity}×</span>
                      {item.productNameSnapshot}
                    </span>
                    <span className="font-mono font-semibold">₹{item.priceSnapshot * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-100">
              <span>Total Amount</span>
              <span className="font-mono text-blue-700">₹{selectedOrder.total}</span>
            </div>

            {/* Admin Override Controls */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Update Order Status</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder._id, status: 'PREPARING' })}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-lg font-semibold border border-amber-200"
                >
                  PREPARING
                </button>
                <button
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder._id, status: 'READY' })}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg font-semibold border border-emerald-200"
                >
                  READY FOR PICKUP
                </button>
                <button
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder._id, status: 'COMPLETED' })}
                  className="bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-semibold col-span-2"
                >
                  MARK COMPLETED
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
