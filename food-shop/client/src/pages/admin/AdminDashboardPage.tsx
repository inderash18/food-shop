import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Flame,
  ChevronRight,
  TrendingUp,
  ChefHat,
  Package,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminApi } from '../../api/admin';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: adminApi.dashboard,
    refetchInterval: 15_000,
  });

  const { data: ordersByHour } = useQuery({
    queryKey: ['admin-orders-by-hour'],
    queryFn: adminApi.ordersByHour,
  });

  const { data: revenueByDay } = useQuery({
    queryKey: ['admin-revenue-by-day'],
    queryFn: () => adminApi.revenueByDay(7),
  });

  const { data: categorySales } = useQuery({
    queryKey: ['admin-category-sales'],
    queryFn: adminApi.categorySales,
  });

  const { data: popularProducts } = useQuery({
    queryKey: ['admin-popular-products'],
    queryFn: () => adminApi.popularProducts(5),
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Campus Food Shop Operations</h1>
          <p className="text-blue-100 text-sm mt-1">Real-time overview of orders, revenue, inventory, and kitchen state.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/kitchen"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow"
          >
            <ChefHat className="w-4 h-4" />
            Kitchen Board
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {statsLoading ? '...' : `₹${stats?.todayRevenue?.toLocaleString('en-IN') ?? 0}`}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Orders</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {statsLoading ? '...' : stats?.todayOrders ?? 0}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preparing / Ready</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {statsLoading ? '...' : `${(stats?.preparingOrders ?? 0) + (stats?.readyOrders ?? 0)}`}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-0.5">
              {statsLoading ? '...' : stats?.lowStockCount ?? 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Order Velocity */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Hourly Order Velocity (Today)
            </h2>
            <span className="text-xs text-slate-500 font-medium">Updated live</span>
          </div>
          <div className="h-64">
            {ordersByHour && ordersByHour.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ordersByHour}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    formatter={(val: number) => [`${val} orders`, 'Orders']}
                    labelFormatter={(h) => `Hour: ${h}:00`}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No hourly data available yet today
              </div>
            )}
          </div>
        </div>

        {/* Category Sales Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Category Breakdown</h2>
          <div className="h-64 flex items-center justify-center">
            {categorySales && categorySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySales}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {categorySales.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No category sales recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Grid & Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Food Items */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              Top Selling Food Items
            </h2>
            <Link to="/admin/products" className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
              Manage Catalog <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {popularProducts && popularProducts.length > 0 ? (
              popularProducts.map((item, idx) => (
                <div key={item._id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} units sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">₹{item.revenue.toLocaleString('en-IN')}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No popular items data yet</p>
            )}
          </div>
        </div>

        {/* Operational Shortcuts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Quick Controls</h2>
          <div className="space-y-2.5">
            <Link
              to="/admin/inventory"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 transition-colors border border-slate-100 group"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-slate-800">Inventory & Stock Refill</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/admin/orders"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 transition-colors border border-slate-100 group"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-slate-800">Order Management</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 transition-colors border border-slate-100 group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-slate-800">Export CSV Reports</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
