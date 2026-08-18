import { Request, Response } from 'express';
import { Order } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cancelOrder, isConfirmedPaid, markOrderCollected, updateKitchenPrepStatus } from '../services/order.service';
import { PAYMENT_STATUS, ORDER_STATUS } from '../constants';
import { Types } from 'mongoose';

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query as { page?: string; limit?: string };
  const [orders, total] = await Promise.all([
    Order.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Order.countDocuments({ userId: req.userId }),
  ]);
  sendSuccess(res, { orders, total, page: Number(page), limit: Number(limit), pages: Math.max(1, Math.ceil(total / Number(limit))) });
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({ _id: req.params.orderId, userId: req.userId });
  if (!order) throw new NotFoundError('Order not found');
  sendSuccess(res, { order });
});

export const getOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({
    $or: [{ orderNumber: req.params.orderNumber.toUpperCase() }, { tokenNumber: req.params.orderNumber.toUpperCase() }],
  });
  if (!order) throw new NotFoundError('Order not found');
  if (String(order.userId) !== req.userId && req.userRole === 'STUDENT') {
    throw new ForbiddenError('You can only view your own orders');
  }
  sendSuccess(res, { order });
});

export const cancelMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await cancelOrder(req.params.orderId, req.userId!);
  sendSuccess(res, { order, message: 'Order cancelled' });
});

export const counterCollectOrder = asyncHandler(async (req: Request, res: Response) => {
  const { qrOrToken } = req.body;
  if (!qrOrToken || typeof qrOrToken !== 'string') {
    throw new BadRequestError('qrOrToken parameter is required');
  }
  const result = await markOrderCollected(qrOrToken.trim(), req.userId!, req.user?.email);
  sendSuccess(res, result);
});

export const updateKitchenPrepStatusController = asyncHandler(async (req: Request, res: Response) => {
  const { prepStatus } = req.body;
  if (!['CONFIRMED', 'PREPARING', 'READY_FOR_COLLECTION', 'COLLECTED'].includes(prepStatus)) {
    throw new BadRequestError('Invalid prepStatus');
  }
  const order = await updateKitchenPrepStatus(req.params.orderId, prepStatus, req.userId!, req.user?.email);
  sendSuccess(res, { order, message: `Status updated to ${prepStatus}` });
});

export const getAdminOrders = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as {
    page?: string;
    limit?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
    from?: string;
    to?: string;
    view?: 'confirmed' | 'all';
  };
  const page = Number(q.page) || 1;
  const limit = Math.min(Number(q.limit) || 50, 200);

  const filter: Record<string, any> = {};
  if (q.view === 'confirmed') {
    filter.paymentStatus = PAYMENT_STATUS.SUCCESS;
    filter.status = { $in: [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED] };
  }
  if (q.status) {
    const statuses = q.status.split(',');
    filter.status = { $in: statuses };
  }
  if (q.paymentStatus) {
    const statuses = q.paymentStatus.split(',');
    filter.paymentStatus = { $in: statuses };
  }
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(q.to);
  }
  if (q.search?.trim()) {
    const term = q.search.trim().toUpperCase();
    const isObjectId = /^[a-f\d]{24}$/i.test(term);
    filter.$or = [
      { orderNumber: new RegExp(term, 'i') },
      { tokenNumber: new RegExp(term, 'i') },
      { userId: isObjectId ? new Types.ObjectId(term) : null },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email studentId')
      .lean(),
    Order.countDocuments(filter),
  ]);

  const rows = orders.map((o) => ({
    ...o,
    student: o.userId
      ? {
          name: (o.userId as unknown as { name: string }).name,
          email: (o.userId as unknown as { email: string }).email,
          studentId: (o.userId as unknown as { studentId: string }).studentId,
        }
      : null,
  }));

  sendSuccess(res, { orders: rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const getKitchenBoard = asyncHandler(async (_req: Request, res: Response) => {
  const [newOrders, preparing, ready, completed] = await Promise.all([
    Order.find({
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      status: ORDER_STATUS.ORDER_CONFIRMED,
    })
      .sort({ createdAt: 1 })
      .populate('userId', 'name')
      .lean(),
    Order.find({ status: ORDER_STATUS.PREPARING }).sort({ createdAt: 1 }).populate('userId', 'name').lean(),
    Order.find({ status: ORDER_STATUS.READY }).sort({ createdAt: 1 }).populate('userId', 'name').lean(),
    Order.find({ status: ORDER_STATUS.COMPLETED }).sort({ updatedAt: -1 }).limit(10).populate('userId', 'name').lean(),
  ]);

  sendSuccess(res, {
    board: {
      NEW: newOrders,
      PREPARING: preparing,
      READY: ready,
      COMPLETED: completed,
    },
  });
});

export const getOrderCounts = asyncHandler(async (_req: Request, res: Response) => {
  const [confirmed, preparing, ready, pendingPayment] = await Promise.all([
    Order.countDocuments({ paymentStatus: PAYMENT_STATUS.SUCCESS, status: ORDER_STATUS.ORDER_CONFIRMED }),
    Order.countDocuments({ status: ORDER_STATUS.PREPARING }),
    Order.countDocuments({ status: ORDER_STATUS.READY }),
    Order.countDocuments({ paymentStatus: PAYMENT_STATUS.PENDING }),
  ]);
  sendSuccess(res, { counts: { NEW: confirmed, PREPARING: preparing, READY: ready, PAYMENT_PENDING: pendingPayment } });
});

export const getMyActiveOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({
    userId: req.userId,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    status: { $in: [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY] },
  })
    .sort({ createdAt: -1 })
    .lean();
  sendSuccess(res, { order: order ?? null });
});

export const reorder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new NotFoundError('Order not found');
  if (String(order.userId) !== req.userId) throw new ForbiddenError('Not your order');

  const { addToCart } = await import('../services/cart.service');
  const { Product } = await import('../models');
  const added: string[] = [];
  for (const item of order.items) {
    const product = await Product.findOne({ _id: item.productId, isActive: true });
    if (product && product.stock > 0) {
      await addToCart(req.userId!, String(item.productId), Math.min(item.quantity, product.stock, 10));
      added.push(product.name);
    }
  }
  sendSuccess(res, { message: added.length ? 'Items added to cart with current prices' : 'None of the items are available right now', added });
});
