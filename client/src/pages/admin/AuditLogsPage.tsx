import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/admin';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs', search, actionFilter, page],
    queryFn: () => adminApi.auditLogs({ search, action: actionFilter || undefined, page, limit: 20 }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Trail</h1>
          <p className="text-xs text-slate-500">Immutable security and operational log of all administrative actions</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 bg-white"
        >
          <option value="">All Actions</option>
          <option value="ORDER_STATUS_CHANGED">ORDER_STATUS_CHANGED</option>
          <option value="STOCK_ADJUSTED">STOCK_ADJUSTED</option>
          <option value="PRODUCT_CREATED">PRODUCT_CREATED</option>
          <option value="PRODUCT_UPDATED">PRODUCT_UPDATED</option>
          <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
          <option value="USER_ACTIVATED">USER_ACTIVATED</option>
          <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : data?.logs && data.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Target Resource</th>
                  <th className="px-4 py-3">Metadata / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {typeof log.actorId === 'object' && log.actorId ? log.actorId.name : log.actorEmail || 'System'}
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        {typeof log.actorId === 'object' && log.actorId ? log.actorId.email : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <span className="capitalize">{log.resource}</span>: {log.resourceId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 max-w-xs truncate text-[11px]">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No audit logs found</div>
        )}
      </div>
    </div>
  );
}
