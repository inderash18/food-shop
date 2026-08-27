import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Order, Payment, Product, PaymentWebhookEvent } from '../models';
import { ORDER_STATUS, PAYMENT_STATUS, ROLE } from '../constants';
import { confirmOrder, failOrder, cleanupStalePendingOrders } from '../services/order.service';
import { getMyOrders } from '../controllers/order.controller';
import { cancelPayment } from '../controllers/payment.controller';
import * as notificationService from '../services/notification.service';

describe('Payment & Order Lifecycle Verification Suite', () => {
  const studentUserId = '507f1f77bcf86cd799439011';
  const orderId = '507f1f77bcf86cd799439022';
  const productId = '507f1f77bcf86cd799439033';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('TEST A — Cancelled UPI Payment: releases reserved stock and excludes order from student My Orders', async () => {
    const mockOrder = {
      _id: orderId,
      orderNumber: 'ORD1001',
      tokenNumber: 'A101',
      userId: studentUserId,
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      items: [{ productId, quantity: 2 }],
      total: 70,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockPayment = {
      _id: 'pay_123',
      orderId,
      userId: studentUserId,
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);
    vi.spyOn(Product, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);

    // 1. Cancel payment
    const req: any = {
      body: { orderId, reason: 'CUSTOMER_CANCELLED' },
      userId: studentUserId,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((d) => d),
    };
    const next = vi.fn();

    // Mock payment service lookup
    const { paymentService } = await import('../services/payment.service');
    vi.spyOn(paymentService, 'findPaymentForUser').mockResolvedValue(mockPayment as any);

    await cancelPayment(req, res, next);

    expect(mockPayment.status).toBe(PAYMENT_STATUS.FAILED);
    expect(mockPayment.verificationStatus).toBe('REJECTED');
    expect(mockPayment.failureReason).toBe('CUSTOMER_CANCELLED');
    expect(mockOrder.status).toBe(ORDER_STATUS.PAYMENT_FAILED);
    expect(mockOrder.paymentStatus).toBe(PAYMENT_STATUS.FAILED);

    // Verify stock release was invoked
    expect(Product.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: productId }),
      expect.objectContaining({ $inc: { reservedStock: -2 } }),
      expect.anything()
    );

    // 2. Query student My Orders -> Ensure unconfirmed/failed order is NOT returned
    let capturedFilter: any = null;
    vi.spyOn(Order, 'find').mockImplementation((filter: any) => {
      capturedFilter = filter;
      return {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]), // Cancelled payment does not match
      } as any;
    });
    vi.spyOn(Order, 'countDocuments').mockResolvedValue(0);

    const ordersReq: any = { query: {}, userId: studentUserId };
    let ordersResponse: any = null;
    const ordersRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((payload) => {
        ordersResponse = payload;
        return ordersRes;
      }),
    };

    await getMyOrders(ordersReq, ordersRes, next);

    expect(capturedFilter).toBeDefined();
    expect(capturedFilter.paymentStatus).toBe(PAYMENT_STATUS.SUCCESS);
    expect(capturedFilter.status.$in).not.toContain(ORDER_STATUS.PAYMENT_PENDING);
    expect(capturedFilter.status.$in).not.toContain(ORDER_STATUS.PAYMENT_FAILED);
    expect(ordersResponse.data.orders).toHaveLength(0);
  });

  it('TEST B — Successful Payment: transitions order to CONFIRMED, commits stock, and shows in My Orders', async () => {
    vi.spyOn(notificationService, 'notifyUser').mockResolvedValue({} as any);

    const mockOrder = {
      _id: orderId,
      orderNumber: 'ORD1002',
      tokenNumber: 'A102',
      userId: studentUserId,
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      items: [{ productId, quantity: 1, productNameSnapshot: 'Veg Burger' }],
      total: 70,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);

    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);
    vi.spyOn(Product, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);

    // Confirm order
    const confirmedOrder = await confirmOrder(orderId);

    expect(confirmedOrder.status).toBe(ORDER_STATUS.ORDER_CONFIRMED);
    expect(confirmedOrder.paymentStatus).toBe(PAYMENT_STATUS.SUCCESS);
    expect(Product.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: productId }),
      expect.objectContaining({ $inc: { stock: -1, reservedStock: -1, totalOrders: 1 } }),
      expect.anything()
    );
  });

  it('TEST C — Amount Manipulation Protection: rejects verification when amount mismatches database total', async () => {
    const mockOrder = {
      _id: orderId,
      orderNumber: 'ORD1003',
      total: 70, // Authoritative total
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      items: [{ productId, quantity: 1 }],
      save: vi.fn().mockResolvedValue(true),
    };

    const mockPayment = {
      _id: 'pay_456',
      orderId,
      userId: studentUserId,
      amount: 70,
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    const { paymentService } = await import('../services/payment.service');
    vi.spyOn(paymentService, 'findPaymentForUser').mockResolvedValue(mockPayment as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

    const mockProvider = {
      name: 'razorpay',
      verifyPayment: vi.fn().mockResolvedValue({
        status: PAYMENT_STATUS.SUCCESS,
        amount: 20, // Tampered gateway amount!
        verified: true,
      }),
      createPayment: vi.fn(),
      parseWebhook: vi.fn(),
      refundPayment: vi.fn(),
      getPaymentStatus: vi.fn(),
    };
    vi.spyOn(paymentService, 'getProvider').mockReturnValue(mockProvider as any);
    vi.spyOn(Product, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);

    await expect(paymentService.verifyPayment('pay_456', studentUserId)).rejects.toThrow(
      /Amount mismatch/i
    );

    expect(mockPayment.status).toBe(PAYMENT_STATUS.FAILED);
    expect(mockPayment.verificationStatus).toBe('REJECTED');
    expect(mockPayment.failureReason).toBe('AMOUNT_MISMATCH');
    expect(mockOrder.status).toBe(ORDER_STATUS.PAYMENT_FAILED);
  });

  it('TEST D — Stale Order Expiry: automatically cleans up pending orders older than 15 mins', async () => {
    const staleOrder = {
      _id: 'stale_ord_1',
      orderNumber: 'ORD_OLD_1',
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      items: [{ productId, quantity: 3 }],
      createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Order, 'find').mockResolvedValue([staleOrder as any]);
    vi.spyOn(Order, 'findById').mockResolvedValue(staleOrder as any);
    vi.spyOn(Product, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);

    const cleanedCount = await cleanupStalePendingOrders(15);

    expect(cleanedCount).toBe(1);
    expect(staleOrder.status).toBe(ORDER_STATUS.PAYMENT_FAILED);
    expect(staleOrder.paymentStatus).toBe(PAYMENT_STATUS.FAILED);
    expect(Product.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: productId }),
      expect.objectContaining({ $inc: { reservedStock: -3 } }),
      expect.anything()
    );
  });
});
