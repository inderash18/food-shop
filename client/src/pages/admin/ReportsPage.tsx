import React, { useState } from 'react';
import { Download, FileSpreadsheet, ShoppingBag, Package, TrendingUp, Calendar } from 'lucide-react';
import { downloadReport } from '../../api/admin';

export function ReportsPage() {
  const [days, setDays] = useState(7);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (kind: 'orders' | 'products' | 'inventory' | 'product-performance' | 'daily-sales') => {
    try {
      setDownloading(kind);
      await downloadReport(kind, days);
    } catch (err) {
      alert('Failed to generate report CSV. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Data Export</h1>
          <p className="text-xs text-slate-500">Download formatted CSV reports for accounting, auditing, and inventory reconciliations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Export Period:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-slate-200 rounded-xl text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Sales Report */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Daily Sales Summary</h3>
            <p className="text-xs text-slate-500">
              Aggregated daily revenue, confirmed order counts, and discount breakdowns for accounting.
            </p>
          </div>
          <button
            disabled={downloading === 'daily-sales'}
            onClick={() => handleDownload('daily-sales')}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloading === 'daily-sales' ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        {/* Orders Master Log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Orders Master Log</h3>
            <p className="text-xs text-slate-500">
              Comprehensive row-by-row transaction log of all student orders, payment status, totals, and timestamps.
            </p>
          </div>
          <button
            disabled={downloading === 'orders'}
            onClick={() => handleDownload('orders')}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloading === 'orders' ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        {/* Inventory Status Report */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Current Inventory Snapshot</h3>
            <p className="text-xs text-slate-500">
              Current stock on hand, reserved quantities, minimum threshold limits, and status flags.
            </p>
          </div>
          <button
            disabled={downloading === 'inventory'}
            onClick={() => handleDownload('inventory')}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloading === 'inventory' ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        {/* Product Performance Report */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Product Sales Performance</h3>
            <p className="text-xs text-slate-500">
              Total units sold, gross revenue generated, and preparation metrics per food catalog item.
            </p>
          </div>
          <button
            disabled={downloading === 'product-performance'}
            onClick={() => handleDownload('product-performance')}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {downloading === 'product-performance' ? 'Generating...' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
