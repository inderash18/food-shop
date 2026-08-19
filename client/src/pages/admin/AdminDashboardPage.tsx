import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Users,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  PackageX
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminApi } from '../../api/admin';

export function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: adminApi.dashboard,
    refetchInterval: 15_000,
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['admin-revenue-chart'],
    queryFn: adminApi.revenueChart,
  });

  const { data: transactions } = useQuery({
    queryKey: ['admin-recent-transactions'],
    queryFn: adminApi.transactions,
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 text-gray-900 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time overview of users, orders, and revenue.</p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : stats?.totalUsers ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : stats?.totalOrders ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : stats?.todayOrders ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : `₹${stats?.todayRevenue?.toLocaleString('en-IN') ?? 0}`}
            </h3>
          </div>
        </div>

        {/* Row 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : stats?.pendingOrders ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : stats?.completedOrders ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cancelled Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
              {statsLoading ? '...' : stats?.cancelledOrders ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <PackageX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Out of Stock</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-0.5">
              {statsLoading ? '...' : stats?.outOfStockProducts ?? 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Revenue (Last 7 Days)
            </h2>
          </div>
          <div className="h-64">
            {revenueChart && revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dayName" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val}`} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                No revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Operational Shortcuts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Quick Controls</h2>
          <div className="space-y-2.5">
            <Link
              to="/admin/products"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100 group"
            >
              <div className="flex items-center gap-3">
                <PackageX className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Manage Products</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              to="/admin/orders"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100 group"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Order Management</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              to="/admin/settlements"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100 group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">View Settlements</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Today's Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions && transactions.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.slice(0, 10).map((tx: any) => (
                  <tr key={tx._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{tx.transactionId}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{tx.orderId?.orderNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{tx.orderId?.userId?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">₹{tx.amount?.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${tx.settlementStatus === 'SETTLED' ? 'bg-blue-50 text-blue-700' : tx.settlementStatus === 'PROCESSING' ? 'bg-purple-50 text-purple-700' : tx.settlementStatus === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-700'}`}>
                        {tx.settlementStatus?.replace('_', ' ') || 'NOT SETTLED'}
                      </span>
                    </td>
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
