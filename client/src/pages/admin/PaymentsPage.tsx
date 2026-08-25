import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { formatINR } from '../../lib/format';

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'ALL' | 'MISMATCH' | 'FAILED' | 'SUCCESS'>('ALL');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payments', page],
    queryFn: () => adminApi.payments({ page, limit: 30 }),
  });

  const rawPayments = data?.payments || [];
  const mismatchCount = rawPayments.filter(
    (p: any) => p.failureReason === 'AMOUNT_MISMATCH' || (p.metadata?.expectedAmount && p.metadata?.gatewayAmount && p.metadata.expectedAmount !== p.metadata.gatewayAmount)
  ).length;

  const payments = rawPayments.filter((p: any) => {
    if (filter === 'MISMATCH') {
      return p.failureReason === 'AMOUNT_MISMATCH' || (p.metadata?.expectedAmount && p.metadata?.gatewayAmount && p.metadata.expectedAmount !== p.metadata.gatewayAmount);
    }
    if (filter === 'FAILED') return p.status === 'FAILED';
    if (filter === 'SUCCESS') return p.status === 'SUCCESS';
    return true;
  });

  const getStatusBadge = (p: any) => {
    const isMismatch = p.failureReason === 'AMOUNT_MISMATCH' || (p.metadata?.expectedAmount && p.metadata?.gatewayAmount && p.metadata.expectedAmount !== p.metadata.gatewayAmount);

    if (isMismatch) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-black px-2 py-0.5 rounded-full">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> AMOUNT MISMATCH
        </span>
      );
    }

    switch (p.status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SUCCESS
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> FAILED ({p.failureReason || 'REJECTED'})
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
            REFUNDED
          </span>
        );
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">{p.status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Transactions & Integrity Audit</h1>
          <p className="text-xs text-slate-500">Live payment gateway transactions, gateway amount verification, and mismatch security</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Payment Integrity Monitoring Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Payment Integrity Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-emerald-700">Strict Server Verification Active</p>
          <p className="text-[11px] text-slate-400">Order amount authoritative from DB</p>
        </div>

        <div
          onClick={() => setFilter(filter === 'MISMATCH' ? 'ALL' : 'MISMATCH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-1 ${
            mismatchCount > 0
              ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Amount Mismatches Detected</span>
            <AlertTriangle className={`w-4 h-4 ${mismatchCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-black ${mismatchCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {mismatchCount}
          </p>
          <p className="text-[11px] text-slate-400">
            {mismatchCount > 0 ? 'Click to inspect flagged mismatch events' : 'Zero mismatches — 100% integrity'}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Gateway Unit Policy</span>
            <span className="font-mono text-xs font-bold text-slate-700">INR / Paise</span>
          </div>
          <p className="text-lg font-bold text-slate-800">1 INR = 100 Paise</p>
          <p className="text-[11px] text-slate-400">Exact round-trip verification</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            filter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Payments ({rawPayments.length})
        </button>
        <button
          onClick={() => setFilter('MISMATCH')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            filter === 'MISMATCH' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Amount Mismatches ({mismatchCount})
        </button>
        <button
          onClick={() => setFilter('FAILED')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            filter === 'FAILED' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Failed
        </button>
        <button
          onClick={() => setFilter('SUCCESS')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            filter === 'SUCCESS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Verified Success
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading payments...</div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Payment ID / Ref</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 font-mono">Expected (DB)</th>
                  <th className="px-4 py-3 font-mono">Gateway Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 font-mono">Gateway Txn ID</th>
                  <th className="px-4 py-3">Created Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p: any) => {
                  const expectedAmount = p.metadata?.expectedAmount ?? p.amount;
                  const gatewayAmount = p.metadata?.gatewayAmount ?? (p.status === 'SUCCESS' ? p.amount : undefined);
                  const isMismatch = p.failureReason === 'AMOUNT_MISMATCH' || (expectedAmount && gatewayAmount && expectedAmount !== gatewayAmount);

                  return (
                    <tr
                      key={p._id}
                      className={`transition-colors ${
                        isMismatch ? 'bg-rose-50/70 hover:bg-rose-100/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {p.providerPaymentId || p._id}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {typeof p.orderId === 'object' && p.orderId !== null ? p.orderId.orderNumber || p.orderId._id : p.orderId}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.userId?.name || 'Customer'} ({p.userId?.email || 'N/A'})
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {formatINR(expectedAmount)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {gatewayAmount !== undefined ? (
                          <span className={isMismatch ? 'text-rose-600' : 'text-emerald-700'}>
                            {formatINR(gatewayAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Pending / N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(p)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {p.providerTransactionId || p.transactionId || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(p.createdAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No payment records found matching filter</div>
        )}
      </div>
    </div>
  );
}
