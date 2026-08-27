import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, getRevenueChart, getRecentTransactions, getSettlements } from '../controllers/admin.dashboard.controller';
import { getAdminProducts } from '../controllers/catalog.controller';
import { User, Order, Product, Payment, PaymentTransaction } from '../models';

describe('Zero Error Hardening — Admin Dashboard & Pagination Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. getDashboardStats safely returns 200 with all zero values on empty collections', async () => {
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Order, 'aggregate').mockResolvedValue([]);
    vi.spyOn(Product, 'countDocuments').mockResolvedValue(0);

    const req: any = {};
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };
    const next = vi.fn();

    await getDashboardStats(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(responseData.data.totalUsers).toBe(0);
    expect(responseData.data.totalOrders).toBe(0);
    expect(responseData.data.todayRevenue).toBe(0);
    expect(responseData.data.pendingOrders).toBe(0);
    expect(responseData.data.failedPayments).toBe(0);
  });

  it('2. getRevenueChart safely handles 0 orders and returns 7 structured days with 0 revenue', async () => {
    vi.spyOn(Order, 'aggregate').mockResolvedValue([]);

    const req: any = {};
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };
    const next = vi.fn();

    await getRevenueChart(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBe(7);
    expect(responseData.data[0].revenue).toBe(0);
  });

  it('3. getRecentTransactions safely handles empty transactions and payments without throwing 500', async () => {
    vi.spyOn(PaymentTransaction, 'find').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(Payment, 'find').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    const req: any = {};
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };
    const next = vi.fn();

    await getRecentTransactions(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);
    expect(responseData.data.length).toBe(0);
  });

  it('4. getSettlements returns structured stats and transactions even when 0 settlements exist', async () => {
    vi.spyOn(PaymentTransaction, 'aggregate').mockResolvedValue([]);
    vi.spyOn(PaymentTransaction, 'find').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    const req: any = {};
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };
    const next = vi.fn();

    await getSettlements(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(responseData.data.stats.TOTAL).toBe(0);
    expect(responseData.data.stats.NOT_SETTLED).toBe(0);
    expect(responseData.data.stats.SETTLED).toBe(0);
    expect(responseData.data.transactions).toEqual([]);
  });

  it('5. getAdminProducts safely handles extreme pagination boundary (page=18, limit=15) with 0 records', async () => {
    vi.spyOn(Product, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    vi.spyOn(Product, 'countDocuments').mockResolvedValue(5);

    const req: any = { query: { page: '18', limit: '15' } };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };
    const next = vi.fn();

    await getAdminProducts(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(responseData.data.products).toEqual([]);
    expect(responseData.data.total).toBe(5);
    expect(responseData.data.page).toBe(18);
    expect(responseData.data.limit).toBe(15);
    expect(responseData.data.pages).toBe(1);
  });
});
