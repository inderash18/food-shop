import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { IndianRupee, Clock, CheckCircle, XCircle } from 'lucide-react';

export function SettlementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: adminApi.settlements,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading settlements...</div>;
  }

  const { stats = {} as any, transactions = [] } = (data || {}) as { stats?: any; transactions?: any[] };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 text-gray-900 p-6 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight">Payments & Settlements</h1>
        <p className="text-gray-500 text-sm mt-1">Track money collected, pending settlements, and settled amounts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><IndianRupee className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">₹{(stats?.TOTAL || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><IndianRupee className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Collected</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">₹{(stats?.TODAY_COLLECTED || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Settlement</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-0.5">₹{((stats?.NOT_SETTLED || 0) + (stats?.PROCESSING || 0)).toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settled Amount</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">₹{(stats?.SETTLED || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><XCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed Settlement</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-0.5">₹{(stats?.FAILED || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Transactions & Settlements List</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions && transactions.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Gateway Ref</th>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Status</th>
                  <th className="px-6 py-4">Settlement Status</th>
                  <th className="px-6 py-4">Settlement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx: any) => (
                  <tr key={tx._id || Math.random()} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">
                      {tx.transactionId || tx.providerPaymentId || String(tx._id).slice(-8)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{tx.providerReference || tx.providerPaymentId || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{tx.orderId?.orderNumber || (typeof tx.orderId === 'string' ? tx.orderId.slice(-8) : '—')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">₹{(tx.amount ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                        {tx.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${tx.settlementStatus === 'SETTLED' ? 'bg-blue-50 text-blue-700' : tx.settlementStatus === 'PROCESSING' ? 'bg-purple-50 text-purple-700' : tx.settlementStatus === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-700'}`}>
                        {tx.settlementStatus?.replace('_', ' ') || 'NOT SETTLED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{tx.settlementDate ? new Date(tx.settlementDate).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No transactions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
