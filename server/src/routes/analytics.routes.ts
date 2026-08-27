import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { Order, Product, Category, Payment, InventoryTransaction } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ROLE, PAYMENT_STATUS, ORDER_STATUS } from '../constants';

const router = Router();
router.use(requireAuth(), loadUser(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN));

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const [totalOrders, todaysOrders, todaysRevenue, lowStock, outOfStock, pendingOrders, preparing, ready] = await Promise.all([
    Order.countDocuments({ paymentStatus: PAYMENT_STATUS.SUCCESS, status: { $ne: ORDER_STATUS.CART } }),
    Order.countDocuments({ paymentStatus: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Product.countDocuments({ isActive: true, $expr: { $lte: [{ $subtract: ['$stock', '$reservedStock'] }, '$minimumStock'] } }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Order.countDocuments({ status: ORDER_STATUS.ORDER_CONFIRMED, paymentStatus: PAYMENT_STATUS.SUCCESS }),
    Order.countDocuments({ status: ORDER_STATUS.PREPARING }),
    Order.countDocuments({ status: ORDER_STATUS.READY }),
  ]);

  const avgOrderValue = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: today } } },
    { $group: { _id: null, avg: { $avg: '$total' } } },
  ]);

  sendSuccess(res, {
    stats: {
      totalOrders,
      todaysOrders,
      todaysRevenue: todaysRevenue[0]?.total ?? 0,
      averageOrderValue: avgOrderValue[0]?.avg ?? 0,
      pendingOrders,
      preparing,
      ready,
      lowStock,
      outOfStock,
    },
  });
}));

router.get('/orders-by-hour', asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: today } } },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, revenue: 0 }));
  for (const row of rows) hours[row._id] = { hour: row._id, count: row.count, revenue: row.revenue };
  sendSuccess(res, { hours });
}));

router.get('/revenue-by-day', asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 7;
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  sendSuccess(res, { days: rows });
}));

router.get('/popular-products', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.productNameSnapshot' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: limit },
  ]);
  sendSuccess(res, { products: rows });
}));

router.get('/category-sales', asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).lean();
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$product.categoryId', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
  ]);
  const named = rows.map((r) => {
    const cat = categories.find((c) => String(c._id) === String(r._id));
    return { category: cat?.name ?? 'Unknown', quantity: r.quantity, revenue: r.revenue };
  });
  sendSuccess(res, { categories: named });
}));

router.get('/stock-consumption', asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 7;
  const from = new Date();
  from.setDate(from.getDate() - days);
  const rows = await InventoryTransaction.aggregate([
    { $match: { createdAt: { $gte: from }, type: 'SOLD' } },
    { $group: { _id: '$productId', quantity: { $sum: '$quantity' } } },
    { $sort: { quantity: -1 } },
    { $limit: 15 },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
  ]);
  sendSuccess(res, { products: rows.map((r) => ({ name: r.product?.name ?? 'Unknown', quantity: r.quantity })) });
}));

router.get('/peak-hours', asyncHandler(async (_req, res) => {
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS } },
    { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 3 },
  ]);
  sendSuccess(res, { peaks: rows });
}));

router.get('/payments', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, view, status } = req.query as {
    page?: string;
    limit?: string;
    view?: string;
    status?: string;
  };
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));

  const filter: Record<string, any> = {};

  if (view === 'mismatch') {
    filter.$or = [
      { failureReason: 'AMOUNT_MISMATCH' },
      { verificationStatus: 'REJECTED' },
    ];
  } else if (view === 'all') {
    if (status && status !== 'ALL') {
      filter.status = status;
    }
  } else {
    // CRITICAL REQUIREMENT: Show ONLY payments that have been successfully completed and verified
    filter.status = PAYMENT_STATUS.SUCCESS;
    filter.verificationStatus = 'VERIFIED';
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('orderId', 'orderNumber total status paymentStatus expectedAmount createdAt')
      .populate('userId', 'name email studentId')
      .lean(),
    Payment.countDocuments(filter),
  ]);

  sendSuccess(res, {
    payments: payments || [],
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  });
}));

export default router;
