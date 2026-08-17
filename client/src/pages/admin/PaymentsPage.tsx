import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/admin';

export function PaymentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payments', page],
    queryFn: () => adminApi.payments({ page, limit: 15 }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SUCCESS
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" /> PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-rose-600" /> FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
            REFUNDED
          </span>
        );
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Transactions</h1>
          <p className="text-xs text-slate-500">Live payment gateway transactions, verifications, and audit status</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading payments...</div>
        ) : data?.payments && data.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Transaction Reference</th>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3 font-mono">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {p.providerPaymentId || p._id}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      {typeof p.orderId === 'object' && p.orderId !== null ? p.orderId.orderNumber : p.orderId}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.userId?.name || 'Student'} ({p.userId?.email || 'N/A'})
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                        {p.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">₹{p.amount}</td>
                    <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(p.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No payment records found</div>
        )}
      </div>
    </div>
  );
}
