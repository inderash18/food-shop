import client, { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Order, User, Product, Category, Paginated, DashboardStats } from '../lib/types';

export interface InventoryRow {
  productId: string;
  name: string;
  currentStock: number;
  reserved: number;
  available: number;
  minimumLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  isActive: boolean;
}

export interface InventoryTransaction {
  _id: string;
  productId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  actorId?: { name: string; email: string } | null;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  type: 'PERCENTAGE' | 'FLAT';
  value: number;
  minOrder: number;
  maxDiscount: number;
  expiresAt?: string | null;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actorId?: { name: string; email: string } | null;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface PaymentRecord {
  _id: string;
  orderId: { _id: string; orderNumber: string; total: number } | string;
  userId?: { name: string; email: string } | null;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface OrderCounts {
  NEW: number;
  PREPARING: number;
  READY: number;
  PAYMENT_PENDING: number;
}

export interface KitchenBoard {
  NEW: Order[];
  PREPARING: Order[];
  READY: Order[];
  COMPLETED: Order[];
}

export interface HourRow {
  hour: number;
  count: number;
  revenue: number;
}

export interface RevenueDay {
  _id: string;
  orders: number;
  revenue: number;
}

export interface PopularProduct {
  _id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface CategorySale {
  category: string;
  quantity: number;
  revenue: number;
}

export const adminApi = {
  dashboard: () => apiGet<any>('/api/admin/dashboard/stats'),
  revenueChart: () => apiGet<any>('/api/admin/dashboard/revenue-chart'),
  transactions: () => apiGet<any>('/api/admin/transactions'),
  settlements: () => apiGet<any>('/api/admin/settlements'),

  ordersByHour: () => apiGet<{ hours: HourRow[] }>('/api/admin/analytics/orders-by-hour').then((d) => d.hours),
  popularProducts: (limit = 10) => apiGet<{ products: PopularProduct[] }>(`/api/admin/analytics/popular-products?limit=${limit}`).then((d) => d.products),
  categorySales: () => apiGet<{ categories: CategorySale[] }>('/api/admin/analytics/category-sales').then((d) => d.categories),
  stockConsumption: (days = 7) => apiGet<{ products: { name: string; quantity: number }[] }>(`/api/admin/analytics/stock-consumption?days=${days}`).then((d) => d.products),
  peakHours: () => apiGet<{ peaks: { _id: number; count: number }[] }>('/api/admin/analytics/peak-hours').then((d) => d.peaks),

  orders: (params: {
    page?: number;
    limit?: number;
    view?: 'confirmed' | 'all';
    status?: string;
    paymentStatus?: string;
    search?: string;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.view) q.set('view', params.view);
    if (params.status) q.set('status', params.status);
    if (params.paymentStatus) q.set('paymentStatus', params.paymentStatus);
    if (params.search) q.set('search', params.search);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    return apiGet<Paginated<Order> & { orders: Order[] }>(`/api/orders/admin?${q.toString()}`);
  },

  orderCounts: () => apiGet<{ counts: OrderCounts }>('/api/orders/admin/counts').then((d) => d.counts),
  kitchenBoard: () => apiGet<{ board: KitchenBoard }>('/api/orders/admin/kitchen').then((d) => d.board),
  updateOrderStatus: (orderId: string, status: string) => apiPatch<{ order: Order }>(`/api/orders/admin/${orderId}/status`, { status }).then((d) => d.order),

  products: (params: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    return apiGet<Paginated<Product> & { products: Product[] }>(`/api/admin/products?${q.toString()}`);
  },
  createProduct: (body: Record<string, unknown>) => apiPost<{ product: Product }>('/api/admin/products', body).then((d) => d.product),
  updateProduct: (id: string, body: Record<string, unknown>) => apiPatch<{ product: Product }>(`/api/admin/products/${id}`, body).then((d) => d.product),
  deleteProduct: (id: string) => apiDelete<{ product: Product }>(`/api/admin/products/${id}`).then((d) => d.product),

  categories: () => apiGet<{ categories: Category[] }>('/api/categories').then((d) => d.categories),
  createCategory: (body: Record<string, unknown>) => apiPost<{ category: Category }>('/api/admin/categories', body).then((d) => d.category),
  updateCategory: (id: string, body: Record<string, unknown>) => apiPatch<{ category: Category }>(`/api/admin/categories/${id}`, body).then((d) => d.category),
  deleteCategory: (id: string) => apiDelete<{ category: Category }>(`/api/admin/categories/${id}`).then((d) => d.category),

  inventory: (params: { page?: number; limit?: number; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    return apiGet<Paginated<InventoryRow> & { rows: InventoryRow[] }>(`/api/admin/inventory?${q.toString()}`);
  },
  stockChange: (productId: string, body: { type: 'add' | 'remove' | 'set' | 'waste'; quantity: number; reason: string }) =>
    apiPost<{ result: { previousStock: number; newStock: number } }>(`/api/admin/inventory/${productId}/stock`, body).then((d) => d.result),
  updateMinimumStock: (productId: string, minimumStock: number) =>
    apiPatch<{ product: Product }>(`/api/admin/inventory/${productId}/minimum`, { minimumStock }).then((d) => d.product),
  inventoryTransactions: (params: { page?: number; limit?: number; productId?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.productId) q.set('productId', params.productId);
    return apiGet<Paginated<InventoryTransaction> & { rows: InventoryTransaction[] }>(
      `/api/admin/inventory-transactions${q.toString() ? `?${q.toString()}` : ''}`
    );
  },

  coupons: () => apiGet<{ coupons: Coupon[] }>('/api/admin/coupons').then((d) => d.coupons),
  createCoupon: (body: Record<string, unknown>) => apiPost<{ coupon: Coupon }>('/api/admin/coupons', body).then((d) => d.coupon),
  updateCoupon: (id: string, body: Record<string, unknown>) => apiPatch<{ coupon: Coupon }>(`/api/admin/coupons/${id}`, body).then((d) => d.coupon),
  deleteCoupon: (id: string) => apiDelete<{ message: string }>(`/api/admin/coupons/${id}`),

  users: (params: { page?: number; limit?: number; search?: string; role?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.role) q.set('role', params.role);
    return apiGet<Paginated<User> & { users: User[] }>(`/api/admin/users?${q.toString()}`);
  },
  userDetail: (id: string) => apiGet<{ user: User; stats: { orderCount: number; totalSpend: number } }>(`/api/admin/users/${id}`),
  setUserActive: (id: string, isActive: boolean) => apiPatch<{ user: User }>(`/api/admin/users/${id}/active`, { isActive }).then((d) => d.user),
  setUserRole: (id: string, role: string) => apiPatch<{ user: User }>(`/api/admin/users/${id}/role`, { role }).then((d) => d.user),
  createStaff: (body: { name: string; email: string; studentId: string; role?: 'STAFF' | 'ADMIN' }) =>
    apiPost<{ user: User; temporaryPassword: string }>('/api/admin/users/staff', body),
  resetPassword: (id: string, newPassword: string) => apiPost<{ message: string }>(`/api/admin/users/${id}/reset-password`, { newPassword }),

  payments: (params: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return apiGet<Paginated<PaymentRecord> & { payments: PaymentRecord[] }>(`/api/admin/analytics/payments?${q.toString()}`);
  },

  auditLogs: (params: { page?: number; limit?: number; action?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.action) q.set('action', params.action);
    if (params.search) q.set('search', params.search);
    return apiGet<Paginated<AuditLog> & { logs: AuditLog[] }>(`/api/admin/audit-logs?${q.toString()}`);
  },

  settings: () => apiGet<{ settings: Record<string, unknown> }>('/api/settings').then((d) => d.settings),
  updateSettings: (body: Record<string, unknown>) => apiPatch<{ settings: Record<string, unknown> }>('/api/settings', body).then((d) => d.settings),
};

export async function downloadReport(kind: 'orders' | 'products' | 'inventory' | 'product-performance' | 'daily-sales', days = 7): Promise<void> {
  const suffix = kind === 'orders' ? `?days=${days}` : '';
  const res = await client.get(`/api/admin/reports/${kind}${suffix}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${kind}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
