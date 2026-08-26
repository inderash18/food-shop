import { Request, Response, NextFunction } from 'express';
import { Order, User, Product, Payment, PaymentTransaction } from '../models';
import { ORDER_STATUS, ROLE, INVENTORY_STATUS, PAYMENT_STATUS, SETTLEMENT_STATUS } from '../constants';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { cache } from '../services/cache.service';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cachedStats = cache.get<Record<string, unknown>>('admin_dashboard_stats');
    if (cachedStats) {
      res.json(cachedStats);
      return;
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      totalUsers,
      totalOrders,
      todayOrders,
      totalRevenueResult,
      todayRevenueResult,
      pendingOrders,
      preparingOrders,
      readyOrders,
      completedOrders,
      cancelledOrders,
      failedPayments,
      outOfStockProducts,
    ] = await Promise.all([
      User.countDocuments({ role: ROLE.STUDENT }),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Order.aggregate([
        { $match: { status: ORDER_STATUS.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { status: ORDER_STATUS.COMPLETED, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.countDocuments({ status: { $in: [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.PAYMENT_PROCESSING, ORDER_STATUS.ORDER_CONFIRMED] } }),
      Order.countDocuments({ status: ORDER_STATUS.PREPARING }),
      Order.countDocuments({ status: ORDER_STATUS.READY }),
      Order.countDocuments({ status: ORDER_STATUS.COMPLETED }),
      Order.countDocuments({ status: ORDER_STATUS.CANCELLED }),
      Order.countDocuments({ $or: [{ status: ORDER_STATUS.PAYMENT_FAILED }, { paymentStatus: PAYMENT_STATUS.FAILED }] }),
      Product.countDocuments({ stock: { $lte: 0 } })
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    const payload = {
      totalUsers,
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      pendingOrders,
      preparingOrders,
      readyOrders,
      completedOrders,
      cancelledOrders,
      failedPayments,
      outOfStockProducts,
    };

    cache.set('admin_dashboard_stats', payload, 10_000); // 10s TTL
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const getRevenueChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cachedChart = cache.get<unknown[]>('admin_revenue_chart_7d');
    if (cachedChart) {
      res.json(cachedChart);
      return;
    }

    const days = 7;
    const startDate = startOfDay(subDays(new Date(), days - 1));

    const revenueData = await Order.aggregate([
      {
        $match: {
          status: ORDER_STATUS.COMPLETED,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing days
    const chart = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const dateStr = d.toISOString().split('T')[0];
      const match = revenueData.find((r: any) => r._id === dateStr);
      chart.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: match ? match.total : 0
      });
    }

    cache.set('admin_revenue_chart_7d', chart, 30_000); // 30s TTL
    res.json(chart);
  } catch (error) {
    next(error);
  }
};

export const getRecentTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transactions = await PaymentTransaction.find()
      .populate({ path: 'orderId', select: 'orderNumber userId total items', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const getSettlements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [statsResult, todayCollectedResult, transactions] = await Promise.all([
      PaymentTransaction.aggregate([
        {
          $group: {
            _id: '$settlementStatus',
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      PaymentTransaction.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd }, status: PAYMENT_STATUS.SUCCESS } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      PaymentTransaction.find()
        .populate({ path: 'orderId', select: 'orderNumber' })
        .sort({ createdAt: -1 })
        .limit(100)
    ]);

    const stats = {
      NOT_SETTLED: 0,
      PROCESSING: 0,
      SETTLED: 0,
      FAILED: 0,
      TOTAL: 0,
      TODAY_COLLECTED: todayCollectedResult[0]?.total || 0,
    };

    statsResult.forEach((s: any) => {
      if (stats[s._id as keyof typeof stats] !== undefined) {
        stats[s._id as keyof typeof stats] = s.totalAmount;
      }
      stats.TOTAL += s.totalAmount;
    });

    res.json({
      stats,
      transactions
    });
  } catch (error) {
    next(error);
  }
};
