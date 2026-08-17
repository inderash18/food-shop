import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { Order, Product, InventoryTransaction } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ROLE, PAYMENT_STATUS } from '../constants';
import { stringify } from 'csv-stringify/sync';

const router = Router();
router.use(requireAuth(), loadUser(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN));

function csvResponse(res: { setHeader: (k: string, v: string) => void; send: (b: string) => void; status: (n: number) => { send: (b: string) => void } }, filename: string, rows: Record<string, unknown>[]) {
  const csv = stringify(rows, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

const dateFromDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get('/orders', asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 7;
  const orders = await Order.find({
    createdAt: { $gte: dateFromDays(days) },
    paymentStatus: PAYMENT_STATUS.SUCCESS,
  }).populate('userId', 'name email studentId').lean();

  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: o.createdAt.toISOString(),
    student: (o.userId as unknown as { name?: string })?.name ?? '',
    email: (o.userId as unknown as { email?: string })?.email ?? '',
    items: o.items.map((i) => `${i.productNameSnapshot} x${i.quantity}`).join('; '),
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
  }));
  csvResponse(res, `orders-${days}d.csv`, rows);
}));

router.get('/products', asyncHandler(async (_req, res) => {
  const products = await Product.find({ isActive: true }).populate('categoryId', 'name').lean();
  const rows = products.map((p) => ({
    name: p.name,
    category: (p.categoryId as unknown as { name?: string })?.name ?? '',
    price: p.price,
    stock: p.stock,
    reserved: p.reservedStock,
    available: Math.max(0, p.stock - p.reservedStock),
    minimumStock: p.minimumStock,
    isVeg: p.isVeg,
  }));
  csvResponse(res, 'products.csv', rows);
}));

router.get('/inventory', asyncHandler(async (_req, res) => {
  const products = await Product.find({}).sort({ name: 1 }).lean();
  const rows = products.map((p) => ({
    name: p.name,
    currentStock: p.stock,
    reserved: p.reservedStock,
    available: Math.max(0, p.stock - p.reservedStock),
    minimumStock: p.minimumStock,
    active: p.isActive,
  }));
  csvResponse(res, 'inventory.csv', rows);
}));

router.get('/product-performance', asyncHandler(async (_req, res) => {
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productNameSnapshot',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
  csvResponse(res, 'product-performance.csv', rows);
}));

router.get('/daily-sales', asyncHandler(async (_req, res) => {
  const rows = await Order.aggregate([
    { $match: { paymentStatus: PAYMENT_STATUS.SUCCESS } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  csvResponse(res, 'daily-sales.csv', rows.map((r) => ({ date: r._id, orders: r.orders, revenue: r.revenue })));
}));

export default router;
