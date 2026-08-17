import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Search, PlusCircle, MinusCircle, History, AlertTriangle } from 'lucide-react';
import { adminApi, type InventoryRow } from '../../api/admin';
import { Modal } from '../../components/admin/Modal';

export function InventoryManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Stock Adjust Modal State
  const [adjustingItem, setAdjustingItem] = useState<InventoryRow | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set' | 'waste'>('add');
  const [adjustQuantity, setAdjustQuantity] = useState(10);
  const [adjustReason, setAdjustReason] = useState('');

  const { data: inventoryData, isLoading: invLoading } = useQuery({
    queryKey: ['admin-inventory', search, statusFilter, page],
    queryFn: () => adminApi.inventory({ search, status: statusFilter || undefined, page, limit: 15 }),
    enabled: activeTab === 'inventory',
  });

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['admin-inventory-transactions', page],
    queryFn: () => adminApi.inventoryTransactions({ page, limit: 20 }),
    enabled: activeTab === 'history',
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: { type: 'add' | 'remove' | 'set' | 'waste'; quantity: number; reason: string };
    }) => adminApi.stockChange(productId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      setAdjustingItem(null);
      setAdjustReason('');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    if (!adjustReason.trim()) {
      alert('Please provide a reason for the inventory change for the audit log.');
      return;
    }
    adjustMutation.mutate({
      productId: adjustingItem.productId,
      body: {
        type: adjustType,
        quantity: adjustQuantity,
        reason: adjustReason.trim(),
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">IN STOCK</span>;
      case 'LOW_STOCK':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">LOW STOCK</span>;
      case 'OUT_OF_STOCK':
        return <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">OUT OF STOCK</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Stock Control</h1>
          <p className="text-xs text-slate-500">Track real-time stock levels, reservations, and inventory audit logs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl">
        <button
          onClick={() => {
            setActiveTab('inventory');
            setPage(1);
          }}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          CURRENT STOCK LEVELS
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            setPage(1);
          }}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          AUDIT LOGS & TRANSACTIONS
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-b-2xl border border-t-0 border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search food item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 bg-white"
            >
              <option value="">All Inventory Statuses</option>
              <option value="IN_STOCK">IN STOCK</option>
              <option value="LOW_STOCK">LOW STOCK</option>
              <option value="OUT_OF_STOCK">OUT OF STOCK</option>
            </select>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {invLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading inventory data...</div>
            ) : inventoryData?.rows && inventoryData.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 font-mono">Current Stock</th>
                      <th className="px-4 py-3 font-mono">Reserved</th>
                      <th className="px-4 py-3 font-mono">Available</th>
                      <th className="px-4 py-3 font-mono">Min. Threshold</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryData.rows.map((row) => (
                      <tr key={row.productId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{row.name}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800">{row.currentStock}</td>
                        <td className="px-4 py-3 font-mono text-amber-600">{row.reserved}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{row.available}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{row.minimumLevel}</td>
                        <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setAdjustingItem(row);
                              setAdjustQuantity(10);
                              setAdjustType('add');
                            }}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">No inventory records found</div>
            )}
          </div>
        </>
      ) : (
        /* History / Audit Logs Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {histLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
          ) : historyData?.rows && historyData.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3 font-mono">Qty Change</th>
                    <th className="px-4 py-3 font-mono">Stock (Old → New)</th>
                    <th className="px-4 py-3">Reason / Note</th>
                    <th className="px-4 py-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyData.rows.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{tx.type}</td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {tx.previousStock} → {tx.newStock}
                      </td>
                      <td className="px-4 py-3 text-slate-700 italic">{tx.reason || 'Manual Update'}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {typeof tx.actorId === 'object' && tx.actorId ? tx.actorId.name : 'System / Staff'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">No inventory transactions logged yet</div>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <Modal
          open={Boolean(adjustingItem)}
          onClose={() => setAdjustingItem(null)}
          title={`Adjust Stock — ${adjustingItem.name}`}
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-slate-500">Current Stock: <span className="font-bold font-mono text-slate-800">{adjustingItem.currentStock}</span></p>
                <p className="text-slate-500">Reserved: <span className="font-bold font-mono text-amber-600">{adjustingItem.reserved}</span></p>
              </div>
              <div>
                <p className="text-slate-500">Available: <span className="font-bold font-mono text-blue-700">{adjustingItem.available}</span></p>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Adjustment Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    adjustType === 'add' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" /> Add / Refill
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('remove')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    adjustType === 'remove' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" /> Remove / Spillage
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Reason for Audit Log (Mandatory)</label>
              <input
                type="text"
                required
                placeholder="e.g. Morning fresh batch refill, Spilled, Daily count correction"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                Confirm & Log Audit
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
