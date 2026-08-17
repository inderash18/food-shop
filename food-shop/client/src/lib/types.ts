export type Role = 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';

export type OrderStatus =
  | 'CART'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_FAILED'
  | 'ORDER_CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'EXPIRED';

export interface User {
  _id: string;
  id?: string;
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  approved?: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string | Category;
  imageUrl?: string;
  price: number;
  stock: number;
  reservedStock: number;
  minimumStock: number;
  prepMinutes: number;
  isVeg: boolean;
  isPopular: boolean;
  isActive: boolean;
  availableFrom?: string;
  availableUntil?: string;
  availableNow?: boolean;
  effectiveStock?: number;
  inventoryStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  available: boolean;
  stockAvailable: number;
  subtotal: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  cartCount: number;
  subtotal: number;
}

export interface OrderItem {
  productId: string;
  productNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
  isVeg?: boolean;
  imageUrl?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: { _id: string; name?: string; email?: string; studentId?: string } | any;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  checkoutRequestId: string;
  notes?: string;
  estimatedReadyAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  student?: { name: string; email: string; studentId: string } | null;
}

export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  collegeName: string;
  contactPhone?: string;
  contactEmail?: string;
  shopStatus: 'OPEN' | 'CLOSED' | 'PAUSED';
  minOrderAmount: number;
  serviceFee: number;
  currency: string;
  timezone: string;
  orderOpenTime?: string;
  orderCloseTime?: string;
  orderCutoffMinutesBeforeClose?: number;
  orderPreparationEnabled?: boolean;
  noticeBanner?: string;
}

export interface DashboardStats {
  totalOrders?: number;
  todaysOrders?: number;
  todayOrders?: number;
  todaysRevenue?: number;
  todayRevenue?: number;
  averageOrderValue?: number;
  pendingOrders?: number;
  preparingOrders?: number;
  preparing?: number;
  readyOrders?: number;
  ready?: number;
  lowStockCount?: number;
  lowStock?: number;
  outOfStock?: number;
}

export interface Paginated<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
