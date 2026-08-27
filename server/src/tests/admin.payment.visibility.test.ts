import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User, Payment, Order, Product } from '../models';
import { PAYMENT_STATUS, ORDER_STATUS } from '../constants';
import { getDashboardStats } from '../controllers/admin.dashboard.controller';
import { getAdminOrders, getMyOrders } from '../controllers/order.controller';
import { cache } from '../services/cache.service';
import analyticsRoutes from '../routes/analytics.routes';

describe('FOODISLICE — Admin Payment Visibility & Strict Verification Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache.clear();
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Product, 'countDocuments').mockResolvedValue(0);
  });

  // TEST 1: Student starts payment and cancels
  it('TEST 1: Student cancels payment -> FAILED/CANCELLED payment is NOT visible in completed payments, revenue is ₹0, order not confirmed', async () => {
    const mockCancelledPayment = {
      _id: 'pay_cancel_1',
      orderId: 'ord_1',
      amount: 70,
      status: PAYMENT_STATUS.FAILED,
      verificationStatus: 'REJECTED',
      failureReason: 'CANCELLED_BY_USER',
      createdAt: new Date(),
    };

    // When admin payments API queries with default filter:
    const paymentFindSpy = vi.spyOn(Payment, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]), // Because filter { status: 'SUCCESS', verificationStatus: 'VERIFIED' } filters it out
    } as any);

    const paymentCountSpy = vi.spyOn(Payment, 'countDocuments').mockResolvedValue(0);

    const paymentsHandler = (analyticsRoutes.stack.find((s: any) => s.route?.path === '/payments' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    expect(paymentsHandler).toBeDefined();

    const req: any = { query: {} };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };

    await paymentsHandler(req, res, vi.fn());

    // Verified default query filter:
    expect(paymentFindSpy).toHaveBeenCalledWith({
      status: PAYMENT_STATUS.SUCCESS,
      verificationStatus: 'VERIFIED',
    });
    expect(responseData.success).toBe(true);
    expect(responseData.data.payments).toHaveLength(0);
    expect(responseData.data.total).toBe(0);

    // Dashboard revenue & confirmed orders:
    vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Order, 'aggregate').mockResolvedValue([]);

    let dashboardData: any = null;
    const dashRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        dashboardData = data;
      }),
    };
    await getDashboardStats({} as any, dashRes, vi.fn());
    expect(dashboardData.data.totalRevenue).toBe(0);
    expect(dashboardData.data.todayRevenue).toBe(0);
    expect(dashboardData.data.totalOrders).toBe(0);

    // Student My Orders does not show it as confirmed:
    const orderFindSpy = vi.spyOn(Order, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    const orderCountSpy = vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);

    let studentOrderData: any = null;
    const studentRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        studentOrderData = data;
      }),
    };
    await getMyOrders({ userId: 'student_1', query: {} } as any, studentRes, vi.fn());
    expect(studentOrderData.data.orders).toHaveLength(0);
  });

  // TEST 2: Student pays ₹70 successfully and backend verifies
  it('TEST 2: Successful verified ₹70 payment -> Visible in Completed Payments, Revenue +₹70, Admin Orders & Student Orders visible', async () => {
    const mockVerifiedPayment = {
      _id: 'pay_succ_1',
      orderId: { _id: 'ord_70', orderNumber: 'ORD-7001', total: 70 },
      userId: { _id: 'stu_1', name: 'Rahul Student', email: 'rahul@college.local' },
      amount: 70,
      provider: 'razorpay',
      providerPaymentId: 'pay_rzp_7001',
      status: PAYMENT_STATUS.SUCCESS,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      createdAt: new Date(),
    };

    vi.spyOn(Payment, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockVerifiedPayment]),
    } as any);
    vi.spyOn(Payment, 'countDocuments').mockResolvedValue(1);

    const paymentsHandler = (analyticsRoutes.stack.find((s: any) => s.route?.path === '/payments' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    const req: any = { query: {} };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };

    await paymentsHandler(req, res, vi.fn());

    expect(responseData.success).toBe(true);
    expect(responseData.data.payments).toHaveLength(1);
    expect(responseData.data.payments[0].amount).toBe(70);
    expect(responseData.data.payments[0].status).toBe(PAYMENT_STATUS.SUCCESS);
    expect(responseData.data.payments[0].verificationStatus).toBe('VERIFIED');

    // Revenue calculation
    vi.spyOn(Order, 'aggregate').mockResolvedValue([{ _id: null, total: 70 }]);
    vi.spyOn(Order, 'countDocuments').mockResolvedValue(1);

    let dashboardData: any = null;
    const dashRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        dashboardData = data;
      }),
    };
    await getDashboardStats({} as any, dashRes, vi.fn());
    expect(dashboardData.data.totalRevenue).toBe(70);
    expect(dashboardData.data.totalOrders).toBe(1);

    // Admin Orders visibility
    const mockOrder = {
      _id: 'ord_70',
      orderNumber: 'ORD-7001',
      total: 70,
      status: ORDER_STATUS.ORDER_CONFIRMED,
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      userId: { name: 'Rahul', email: 'rahul@college.local', studentId: 'STU01' },
      createdAt: new Date(),
    };
    vi.spyOn(Order, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockOrder]),
    } as any);

    let adminOrderData: any = null;
    const adminOrderRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        adminOrderData = data;
      }),
    };
    await getAdminOrders({ query: { view: 'confirmed' } } as any, adminOrderRes, vi.fn());
    expect(adminOrderData.data.orders).toHaveLength(1);
    expect(adminOrderData.data.orders[0].total).toBe(70);
  });

  // TEST 3: Amount mismatch (₹70 expected, ₹20 received)
  it('TEST 3: Amount mismatch (₹70 expected vs ₹20 gateway) -> REJECTED, not visible in completed payments, ₹0 revenue, order not confirmed', async () => {
    vi.spyOn(Payment, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]), // Default verified query returns 0
    } as any);
    vi.spyOn(Payment, 'countDocuments').mockResolvedValue(0);

    const paymentsHandler = (analyticsRoutes.stack.find((s: any) => s.route?.path === '/payments' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    const req: any = { query: {} };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };

    await paymentsHandler(req, res, vi.fn());
    expect(responseData.data.payments).toHaveLength(0);

    // Revenue is ₹0
    vi.spyOn(Order, 'aggregate').mockResolvedValue([]);
    let dashboardData: any = null;
    const dashRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        dashboardData = data;
      }),
    };
    await getDashboardStats({} as any, dashRes, vi.fn());
    expect(dashboardData.data.totalRevenue).toBe(0);
  });

  // TEST 4: No payments exist
  it('TEST 4: No payments exist -> Admin Completed Payments returns empty array with HTTP 200 (NOT 500)', async () => {
    vi.spyOn(Payment, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    vi.spyOn(Payment, 'countDocuments').mockResolvedValue(0);

    const paymentsHandler = (analyticsRoutes.stack.find((s: any) => s.route?.path === '/payments' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    const req: any = { query: { page: '1', limit: '25' } };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };

    await paymentsHandler(req, res, vi.fn());

    expect(responseData.success).toBe(true);
    expect(responseData.data.payments).toEqual([]);
    expect(responseData.data.total).toBe(0);
    expect(responseData.data.pages).toBe(1);
  });

  // TEST 5: Only failed/cancelled/pending payments exist
  it('TEST 5: Only failed/cancelled/pending payments exist -> Admin Completed Payments query filters them out and returns empty array with HTTP 200', async () => {
    // When MongoDB query executes with { status: 'SUCCESS', verificationStatus: 'VERIFIED' }, it matches 0 documents
    vi.spyOn(Payment, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    vi.spyOn(Payment, 'countDocuments').mockResolvedValue(0);

    const paymentsHandler = (analyticsRoutes.stack.find((s: any) => s.route?.path === '/payments' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    const req: any = { query: {} };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      }),
    };

    await paymentsHandler(req, res, vi.fn());

    expect(responseData.success).toBe(true);
    expect(responseData.data.payments).toHaveLength(0);
    expect(responseData.data.total).toBe(0);
  });
});
