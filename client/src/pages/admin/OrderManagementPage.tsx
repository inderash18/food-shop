import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Printer, Eye, RefreshCw, X } from 'lucide-react';
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(data); // update modal
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-xs text-gray-500">Manage digital bills and fulfill customer orders</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4 pt-2 rounded-t-2xl">
        <button
          onClick={() => { setActiveTab('confirmed'); setPage(1); }}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'confirmed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ACTIVE ORDERS
        </button>
        <button
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ALL ORDERS
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order # or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ORDER_CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready for Pickup</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
            <option value="PAYMENT_FAILED">Payment Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Grid (List) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading orders...</div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{order.userId?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">₹{order.total}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          order.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-700'
                            : order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : order.status === 'PAYMENT_PENDING'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors inline-flex"
                        title="View Bill"
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
          <div className="p-12 text-center text-xs text-gray-400">No orders found matching parameters</div>
        )}
      </div>

      {/* Digital Bill Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:max-h-none print:shadow-none">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden shrink-0">
              <h2 className="font-bold text-gray-900">Digital Bill / Ticket</h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bill Content */}
            <div className="p-8 overflow-y-auto print:p-0 flex-1">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-widest">FOOD SHOP</h1>
                <p className="text-sm text-gray-500">Receipt / Tax Invoice</p>
              </div>

              <div className="flex justify-between items-end mb-6 pb-6 border-b-2 border-dashed border-gray-200">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Billed To</p>
                  <p className="font-bold text-gray-900 text-lg">{selectedOrder.userId?.name}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.userId?.email}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Order No.</p>
                  <p className="font-bold font-mono text-gray-900 text-lg">{selectedOrder.orderNumber}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedOrder.createdAt).toLocaleDateString()} {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-900 text-left">
                    <th className="py-2 text-sm font-bold text-gray-900">Item</th>
                    <th className="py-2 text-sm font-bold text-gray-900 text-center">Qty</th>
                    <th className="py-2 text-sm font-bold text-gray-900 text-right">Price</th>
                    <th className="py-2 text-sm font-bold text-gray-900 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 text-sm text-gray-800">{item.productNameSnapshot}</td>
                      <td className="py-3 text-sm text-gray-800 text-center">{item.quantity}</td>
                      <td className="py-3 text-sm text-gray-800 text-right">₹{item.priceSnapshot}</td>
                      <td className="py-3 text-sm font-semibold text-gray-900 text-right">₹{item.priceSnapshot * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 border-t-2 border-dashed border-gray-200">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{selectedOrder.subtotal}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Discount</span>
                      <span>-₹{selectedOrder.discount}</span>
                    </div>
                  )}
                  {selectedOrder.serviceFee > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Service/Tax</span>
                      <span>₹{selectedOrder.serviceFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Grand Total</span>
                    <span>₹{selectedOrder.total}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl print:bg-transparent print:p-0">
                <div>
                  <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Payment Info</p>
                  <p className="font-medium text-gray-900">Status: {selectedOrder.paymentStatus}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Order Status</p>
                  <p className="font-bold text-blue-600">{selectedOrder.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Admin Controls (Hidden in Print) */}
            <div className="p-4 border-t border-gray-200 bg-white print:hidden shrink-0 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Status</p>
              <div className="flex flex-wrap gap-2">
                {['ORDER_CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].map((s) => (
                  <button
                    key={s}
                    disabled={updateStatusMutation.isPending || selectedOrder.status === s}
                    onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder._id, status: s })}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      selectedOrder.status === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
