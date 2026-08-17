import { Types } from 'mongoose';
import { Order, Product, Cart, ShopSettings, Coupon, IOrder } from '../models';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  OrderStatus,
  ALLOWED_ORDER_TRANSITIONS,
  SHOP_STATUS,
} from '../constants';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  OutOfStockError,
  ShopClosedError,
  ConflictError,
} from '../utils/errors';
import { generateOrderNumber } from '../utils/orderNumber';
import { cache } from './cache.service';
import { emit } from '../events';
import { logger } from '../config/logger';
import { notifyUser } from './notification.service';
import { recordAudit } from './audit.service';
import { paymentService } from './payment.service';

export interface CheckoutLine {
  productId: string;
  quantity: number;
}

interface CheckoutResult {
  order: IOrder;
  paymentIntent: { paymentId: string; provider: string; amount: number; clientSecret?: string };
  requiresVerification: boolean;
}

async function getShopOpenState(): Promise<{ open: boolean; settings: Awaited<ReturnType<typeof loadSettings>> }> {
  const settings = await loadSettings();
  const status = settings.shopStatus;
  if (status === SHOP_STATUS.CLOSED || status === SHOP_STATUS.PAUSED) {
    throw new ShopClosedError(
      status === SHOP_STATUS.PAUSED ? 'The food shop is currently paused. Please try again later.' : 'The food shop is currently closed.'
    );
  }
  return { open: true, settings };
}

export async function loadSettings() {
  const cached = cache.get<ReturnType<typeof readSettings>>('settings');
  if (cached) return cached;
  const settings = await readSettings();
  cache.set('settings', settings, 30_000);
  return settings;
}

async function readSettings() {
  const settings = await ShopSettings.findOne().lean();
  if (!settings) {
    return {
      shopName: 'College Food Shop',
      collegeName: 'College',
      shopStatus: SHOP_STATUS.OPEN,
      minOrderAmount: 0,
      serviceFee: 0,
      currency: 'INR',
      orderOpenTime: undefined as string | undefined,
      orderCloseTime: undefined as string | undefined,
      orderCutoffMinutesBeforeClose: 0,
    };
  }
  return settings;
}

/**
 * Initiates checkout:
 * - idempotent (checkoutRequestId)
 * - server-side prices + totals
 * - validates stock and reserves it atomically
 * - creates order in PAYMENT_PENDING
 * - creates payment via the payment provider abstraction
 */
export async function initiateCheckout(userId: string, lines: CheckoutLine[], checkoutRequestId: string, couponCode?: string): Promise<CheckoutResult> {
  await getShopOpenState();

  const existing = await Order.findOne({ checkoutRequestId }).populate('items');
  if (existing) {
    if (existing.status !== ORDER_STATUS.PAYMENT_PENDING) {
      throw new ConflictError('This checkout has already been processed');
    }
    const payment = existing.paymentId ? await paymentService.getPaymentById(String(existing.paymentId)) : undefined;
    return {
      order: existing,
      paymentIntent: {
        paymentId: payment?._id ? String(payment._id) : '',
        provider: payment?.provider ?? '',
        amount: payment?.amount ?? existing.total,
      },
      requiresVerification: !payment,
    };
  }

  if (!lines || lines.length === 0) throw new BadRequestError('Cart is empty');

  const productIds = lines.map((l) => l.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();

  const items = [];
  for (const line of lines) {
    const product = products.find((p) => String(p._id) === String(line.productId));
    if (!product) throw new BadRequestError('One or more items are no longer available');

    const qty = Math.floor(line.quantity);
    if (qty < 1 || qty > 99) throw new BadRequestError('Invalid quantity');

    const available = Math.max(0, product.stock - product.reservedStock);
    if (qty > available) {
      throw new OutOfStockError(`${product.name} only has ${available} unit(s) left`);
    }

    items.push({
      productId: product._id,
      productNameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity: qty,
      subtotal: product.price * qty,
      isVeg: product.isVeg,
      imageUrl: product.imageUrl,
    });
  }

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const { settings } = await getShopOpenState();
  if (subtotal < settings.minOrderAmount) {
    throw new AppError(400, 'BAD_REQUEST', `Minimum order amount is ₹${settings.minOrderAmount}`);
  }

  let discount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true }).lean();
    if (!coupon) throw new BadRequestError('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestError('This coupon has expired');
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new BadRequestError('This coupon has reached its usage limit');
    if (subtotal < coupon.minOrder) throw new BadRequestError(`This coupon requires a minimum order of ₹${coupon.minOrder}`);
    const rawDiscount = coupon.type === 'PERCENTAGE' ? (subtotal * coupon.value) / 100 : coupon.value;
    discount = coupon.maxDiscount > 0 ? Math.min(rawDiscount, coupon.maxDiscount) : Math.min(rawDiscount, subtotal);
  }

  const serviceFee = settings.serviceFee;
  const total = Math.max(0, subtotal - discount + serviceFee);

  const orderNumber = await generateOrderNumber();
  const order = await Order.create({
    orderNumber,
    userId,
    items,
    itemCount,
    subtotal,
    discount,
    couponCode: couponCode?.trim().toUpperCase() || undefined,
    serviceFee,
    total,
    status: ORDER_STATUS.PAYMENT_PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    checkoutRequestId,
  });

  if (discount > 0) {
    await Coupon.updateOne({ code: couponCode!.trim().toUpperCase() }, { $inc: { usedCount: 1 } });
  }

  try {
    await reserveStock(order);
  } catch (err) {
    await order.updateOne({ $set: { status: ORDER_STATUS.CANCELLED } });
    throw err;
  }

  emit('orderCreated', { orderId: String(order._id), orderNumber, userId });

  const paymentIntent = await paymentService.createPayment({
    orderId: String(order._id),
    userId,
    amount: total,
    currency: settings.currency,
  });
  await order.updateOne({ $set: { paymentId: paymentIntent.paymentId } });

  return {
    order,
    paymentIntent: {
      paymentId: paymentIntent.paymentId,
      provider: paymentIntent.provider,
      amount: paymentIntent.amount,
      clientSecret: paymentIntent.clientSecret,
    },
    requiresVerification: paymentIntent.requiresVerification,
  };
}

/**
 * Atomically reserves stock by incrementing reservedStock.
 * Uses an atomic update that only succeeds while available stock is sufficient.
 */
export async function reserveStock(order: { _id: unknown; items: { productId: unknown; quantity: number }[] }): Promise<void> {
  for (const item of order.items) {
    const qty = Math.floor(item.quantity);
    const result = await Product.updateOne(
      { _id: item.productId, isActive: true, $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, qty] } },
      { $inc: { reservedStock: qty } }
    );
    if (result.modifiedCount === 0) {
      throw new OutOfStockError('Some items just went out of stock');
    }
  }
}

/**
 * Confirms an order after payment success. Idempotent.
 * Commits the reserved stock (decrement stock + reservedStock atomically).
 */
export async function confirmOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  if (order.status === ORDER_STATUS.ORDER_CONFIRMED || order.status === ORDER_STATUS.PREPARING || order.status === ORDER_STATUS.READY || order.status === ORDER_STATUS.COMPLETED) {
    return order;
  }

  for (const item of order.items) {
    const result = await Product.updateOne(
      { _id: item.productId, reservedStock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, reservedStock: -item.quantity } }
    );
    if (result.modifiedCount === 0) {
      logger.error('Failed to commit reserved stock', { orderId, productId: item.productId });
      throw new AppError(500, 'INTERNAL_ERROR', 'Could not confirm order');
    }
  }

  order.status = ORDER_STATUS.ORDER_CONFIRMED;
  order.paymentStatus = PAYMENT_STATUS.SUCCESS;
  await order.save();

  cache.delByPrefix('products');

  emit('orderStatusChanged', {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(order.userId),
    status: order.status,
  });

  await notifyUser({
    userId: String(order.userId),
    title: `Order #${order.orderNumber} confirmed`,
    body: 'Payment successful. Your food is being prepared.',
    type: 'order_confirmed',
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
  });

  await recordAudit({
    actorId: String(order.userId),
    action: 'ORDER_STATUS_CHANGED',
    resource: 'order',
    resourceId: String(order._id),
    metadata: { to: ORDER_STATUS.ORDER_CONFIRMED, orderNumber: order.orderNumber },
  });

  await Cart.updateOne({ userId: order.userId }, { $set: { items: [] } });

  return order;
}

/**
 * Marks a payment/order as failed and releases reserved stock.
 */
export async function failOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  const pendingStates: OrderStatus[] = [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.PAYMENT_PROCESSING];
  if (!pendingStates.includes(order.status)) return order;

  await releaseStock(order);
  order.status = ORDER_STATUS.PAYMENT_FAILED;
  order.paymentStatus = PAYMENT_STATUS.FAILED;
  await order.save();
  cache.delByPrefix('products');
  return order;
}

export async function releaseStock(order: { items: { productId: unknown; quantity: number }[] }): Promise<void> {
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.productId, reservedStock: { $gte: item.quantity } },
      { $inc: { reservedStock: -item.quantity } }
    );
  }
}

export async function cancelOrder(orderId: string, userId: string, isStaffOrAdmin = false): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  if (!isStaffOrAdmin && String(order.userId) !== userId) throw new AppError(404, 'NOT_FOUND', 'Order not found');

  const cancellable: OrderStatus[] = [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.PREPARING];
  if (!cancellable.includes(order.status)) {
    throw new ConflictError('This order cannot be cancelled at its current stage');
  }
  if (order.paymentStatus === PAYMENT_STATUS.SUCCESS) {
    // Attempt refund via provider abstraction (best effort, mock refunds instantly)
    await paymentService.refundPayment(String(order.paymentId));
  }

  await releaseStock(order);
  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  await order.save();
  cache.delByPrefix('products');

  emit('orderStatusChanged', {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(order.userId),
    status: order.status,
  });
  return order;
}

export function assertTransition(current: OrderStatus, next: OrderStatus): void {
  const allowed = ALLOWED_ORDER_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(409, 'CONFLICT', `Cannot change order from ${current} to ${next}`);
  }
}

export function isConfirmedPaid(order: { status: OrderStatus; paymentStatus: string }): boolean {
  const confirmedStates: OrderStatus[] = [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED];
  return order.paymentStatus === PAYMENT_STATUS.SUCCESS && confirmedStates.includes(order.status);
}

export async function updateOrderStatusAdmin(orderId: string, next: OrderStatus, actorId: string, actorEmail?: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  assertTransition(order.status, next);

  order.status = next;
  if (next === ORDER_STATUS.COMPLETED) order.completedAt = new Date();
  await order.save();

  cache.delByPrefix('products');
  emit('orderStatusChanged', {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(order.userId),
    status: next,
  });

  const messages: Record<string, string> = {
    [ORDER_STATUS.PREPARING]: 'Your food is being prepared.',
    [ORDER_STATUS.READY]: 'Your order is ready for pickup. Please collect your food.',
    [ORDER_STATUS.COMPLETED]: 'Your order has been completed. Thank you!',
  };
  if (messages[next]) {
    await notifyUser({
      userId: String(order.userId),
      title: `Order #${order.orderNumber}`,
      body: messages[next],
      type: 'order_status',
      data: { orderId: String(order._id), orderNumber: order.orderNumber, status: next },
    });
  }

  await recordAudit({
    actorId,
    actorEmail,
    action: 'ORDER_STATUS_CHANGED',
    resource: 'order',
    resourceId: orderId,
    metadata: { from: order.status, to: next, orderNumber: order.orderNumber },
  });
  return order;
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
