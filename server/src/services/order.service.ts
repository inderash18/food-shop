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
import { generateOrderIdentifiers } from '../utils/orderNumber';
import { cache } from './cache.service';
import { emit } from '../events';
import { logger } from '../config/logger';
import { notifyUser } from './notification.service';
import { recordAudit } from './audit.service';
import { paymentService } from './payment.service';

export interface CheckoutLine {
  productId: string;
  quantity: number;
  addons?: string[];
  instructions?: string;
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
      merchantUpiId: undefined as string | undefined,
      merchantName: undefined as string | undefined,
    };
  }
  return settings;
}

/**
 * Initiates pre-order checkout:
 * - idempotent (checkoutRequestId)
 * - server-side prices + totals
 * - generates Order Number & Short Pickup Token (e.g. #A104)
 * - generates QR Code Pass payload
 * - reserves stock atomically
 * - creates payment via the payment provider abstraction
 */
export async function initiateCheckout(
  userId: string,
  lines: CheckoutLine[],
  checkoutRequestId: string,
  couponCode?: string,
  notes?: string
): Promise<CheckoutResult> {
  await getShopOpenState();

  const existing = await Order.findOne({ checkoutRequestId });
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

  if (!lines || lines.length === 0) throw new BadRequestError('Pre-order list is empty');

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
      addons: line.addons || [],
      instructions: line.instructions || '',
      prepStatus: 'CONFIRMED' as const,
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

  const { orderNumber, tokenNumber } = await generateOrderIdentifiers();
  const estimatedReadyMinutes = 15;
  const estimatedReadyAt = new Date(Date.now() + estimatedReadyMinutes * 60 * 1000);

  const qrCodeData = Buffer.from(
    JSON.stringify({
      ord: orderNumber,
      tkn: tokenNumber,
      uid: userId,
      cnt: 'Counter 2 - Express Pick',
      dt: new Date().toISOString(),
    })
  ).toString('base64');

  const order = await Order.create({
    orderNumber,
    tokenNumber,
    userId,
    items,
    itemCount,
    subtotal,
    discount,
    couponCode: couponCode?.trim().toUpperCase() || undefined,
    serviceFee,
    total,
    collectionCounter: 'Counter 2 - Express Pick',
    collectionStatus: 'PENDING',
    qrCodeData,
    status: ORDER_STATUS.PAYMENT_PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    checkoutRequestId,
    notes,
    estimatedReadyMinutes,
    estimatedReadyAt,
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

  emit('orderCreated', { orderId: String(order._id), orderNumber, userId, tokenNumber });

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

export async function reserveStock(order: { items: { productId: unknown; quantity: number }[] }): Promise<void> {
  for (const item of order.items) {
    const res = await Product.updateOne(
      {
        _id: item.productId,
        isActive: true,
        $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, item.quantity] },
      },
      { $inc: { reservedStock: item.quantity } }
    );
    if (res.modifiedCount === 0) {
      throw new OutOfStockError('One or more items went out of stock during checkout');
    }
  }
}

export async function commitStock(order: { items: { productId: unknown; quantity: number }[] }): Promise<void> {
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: -item.quantity, reservedStock: -item.quantity, totalOrders: item.quantity } }
    );
  }
}

export async function releaseStock(order: { items: { productId: unknown; quantity: number }[] }): Promise<void> {
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.productId, reservedStock: { $gte: item.quantity } },
      { $inc: { reservedStock: -item.quantity } }
    );
  }
}

export async function confirmOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  if (order.status === ORDER_STATUS.ORDER_CONFIRMED || order.paymentStatus === PAYMENT_STATUS.SUCCESS) {
    return order;
  }

  await commitStock(order);
  order.status = ORDER_STATUS.ORDER_CONFIRMED;
  order.paymentStatus = PAYMENT_STATUS.SUCCESS;
  await order.save();

  cache.delByPrefix('products');
  emit('orderConfirmed', { orderId: String(order._id), orderNumber: order.orderNumber, tokenNumber: order.tokenNumber });

  await notifyUser({
    userId: String(order.userId),
    title: `Pre-Order #${order.tokenNumber} Confirmed!`,
    body: `Your pre-order is confirmed. Pick up at Counter 2 when ready.`,
    type: 'order_status',
    data: { orderId: String(order._id), orderNumber: order.orderNumber, tokenNumber: order.tokenNumber },
  });

  return order;
}

export async function cancelOrder(orderId: string, userId: string, isStaffOrAdmin = false): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  if (!isStaffOrAdmin && String(order.userId) !== userId) throw new AppError(404, 'NOT_FOUND', 'Order not found');

  const cancellable: OrderStatus[] = [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.PREPARING];
  if (!cancellable.includes(order.status)) {
    throw new ConflictError('This order cannot be cancelled at its current stage');
  }
  if (order.paymentStatus === PAYMENT_STATUS.SUCCESS && order.paymentId) {
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

export async function failOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  await releaseStock(order);
  order.status = ORDER_STATUS.PAYMENT_FAILED;
  order.paymentStatus = PAYMENT_STATUS.FAILED;
  await order.save();

  cache.delByPrefix('products');
  emit('paymentFailed', { orderId: String(order._id), orderNumber: order.orderNumber, userId: String(order.userId) });
  return order;
}

export function isConfirmedPaid(order: { status: OrderStatus; paymentStatus: string }): boolean {
  const confirmedStates: OrderStatus[] = [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED];
  return order.paymentStatus === PAYMENT_STATUS.SUCCESS && confirmedStates.includes(order.status);
}

export function assertTransition(current: OrderStatus, next: OrderStatus): void {
  const allowed = ALLOWED_ORDER_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(409, 'CONFLICT', `Cannot change order from ${current} to ${next}`);
  }
}

/**
 * Staff / Counter: Mark Order Collected via QR string or Token #A104
 */
export async function markOrderCollected(qrOrToken: string, staffId: string, staffEmail?: string) {
  let order = await Order.findOne({
    $or: [{ tokenNumber: qrOrToken.toUpperCase() }, { orderNumber: qrOrToken }, { qrCodeData: qrOrToken }],
  });

  if (!order) {
    try {
      const decoded = JSON.parse(Buffer.from(qrOrToken, 'base64').toString('utf8'));
      if (decoded.ord) {
        order = await Order.findOne({ orderNumber: decoded.ord });
      }
    } catch {
      // not base64
    }
  }

  if (!order) {
    throw new NotFoundError('Order or Token not found');
  }

  if (order.collectionStatus === 'COLLECTED' || order.status === ORDER_STATUS.COMPLETED) {
    return {
      success: true,
      alreadyCollected: true,
      order,
      message: `Already Collected at ${order.collectedAt?.toLocaleTimeString() || 'earlier'}`,
    };
  }

  order.collectionStatus = 'COLLECTED';
  order.status = ORDER_STATUS.COMPLETED;
  order.completedAt = new Date();
  order.collectedAt = new Date();
  order.items = order.items.map((i) => ({ ...i, prepStatus: 'COLLECTED' }));
  await order.save();

  emit('orderStatusChanged', {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(order.userId),
    status: ORDER_STATUS.COMPLETED,
  });

  await recordAudit({
    actorId: staffId,
    actorEmail: staffEmail,
    action: 'ORDER_STATUS_CHANGED',
    resource: 'Order',
    resourceId: String(order._id),
    metadata: { tokenNumber: order.tokenNumber, collected: true },
  });

  return {
    success: true,
    alreadyCollected: false,
    order,
    message: `Order #${order.tokenNumber} Collected Successfully!`,
  };
}

/**
 * Kitchen Status Transition: NEW ➔ PREPARING ➔ READY ➔ COLLECTED
 */
export async function updateKitchenPrepStatus(
  orderId: string,
  prepStatus: 'CONFIRMED' | 'PREPARING' | 'READY_FOR_COLLECTION' | 'COLLECTED',
  staffId: string,
  staffEmail?: string
) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  let nextStatus: OrderStatus = order.status;
  if (prepStatus === 'PREPARING') nextStatus = ORDER_STATUS.PREPARING;
  if (prepStatus === 'READY_FOR_COLLECTION') nextStatus = ORDER_STATUS.READY;
  if (prepStatus === 'COLLECTED') nextStatus = ORDER_STATUS.COMPLETED;

  order.status = nextStatus;
  order.collectionStatus = prepStatus === 'READY_FOR_COLLECTION' ? 'READY' : prepStatus === 'COLLECTED' ? 'COLLECTED' : 'PENDING';
  order.items = order.items.map((i) => ({ ...i, prepStatus }));

  if (prepStatus === 'COLLECTED') {
    order.completedAt = new Date();
    order.collectedAt = new Date();
  }

  await order.save();

  // Send High Priority Notification when Ready
  if (prepStatus === 'READY_FOR_COLLECTION') {
    await notifyUser({
      userId: String(order.userId),
      title: `Order #${order.tokenNumber} is Ready!`,
      body: `Your food is freshly prepared and waiting at ${order.collectionCounter || 'Counter 2'}.`,
      type: 'order_status',
      data: { orderId: String(order._id), orderNumber: order.orderNumber, tokenNumber: order.tokenNumber, status: 'READY' },
    });
  }

  emit('orderStatusChanged', {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(order.userId),
    status: nextStatus,
  });

  await recordAudit({
    actorId: staffId,
    actorEmail: staffEmail,
    action: 'ORDER_STATUS_CHANGED',
    resource: 'Order',
    resourceId: String(order._id),
    metadata: { tokenNumber: order.tokenNumber, prepStatus },
  });

  return order;
}

export async function updateOrderStatusAdmin(
  orderId: string,
  next: OrderStatus,
  actorId: string,
  actorEmail?: string
): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');
  assertTransition(order.status, next);

  order.status = next;
  if (next === ORDER_STATUS.COMPLETED) {
    order.completedAt = new Date();
    order.collectionStatus = 'COLLECTED';
    order.collectedAt = new Date();
  }
  if (next === ORDER_STATUS.READY) {
    order.collectionStatus = 'READY';
  }
  await order.save();

  cache.delByPrefix('products');
  emit('orderStatusChanged', {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    userId: String(order.userId),
    status: next,
  });

  const messages: Record<string, string> = {
    [ORDER_STATUS.PREPARING]: `Your order #${order.tokenNumber} is being prepared in the kitchen.`,
    [ORDER_STATUS.READY]: `Your order #${order.tokenNumber} is READY for collection at ${order.collectionCounter}!`,
    [ORDER_STATUS.COMPLETED]: `Your order #${order.tokenNumber} was collected. Enjoy your meal!`,
  };
  if (messages[next]) {
    await notifyUser({
      userId: String(order.userId),
      title: `Order #${order.tokenNumber}`,
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
    metadata: { from: order.status, to: next, orderNumber: order.orderNumber, tokenNumber: order.tokenNumber },
  });
  return order;
}
