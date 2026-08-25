import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { paymentService } from '../services/payment.service';
import { Payment, Order, Product, PaymentTransaction } from '../models';
import { PAYMENT_STATUS, ORDER_STATUS } from '../constants';
import * as orderService from '../services/order.service';
import * as auditService from '../services/audit.service';
import * as notificationService from '../services/notification.service';
import { AppError, PaymentError } from '../utils/errors';

describe('UPI & Online Payment Verification Flow (Bug Fix Suite)', () => {
  const userId = new Types.ObjectId().toString();
  const unauthorizedUserId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();
  const paymentId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditService, 'recordAudit').mockResolvedValue({} as any);
    vi.spyOn(notificationService, 'notifyUser').mockResolvedValue({} as any);
    vi.spyOn(Payment, 'updateOne').mockResolvedValue({} as any);
    vi.spyOn(PaymentTransaction, 'findOne').mockResolvedValue(null);
    vi.spyOn(PaymentTransaction, 'create').mockResolvedValue({} as any);
  });

  // =========================================================================
  // Test 1 — Successful Payment
  // =========================================================================
  it('Test 1 — Successful Payment: Verifies gateway SUCCESS, confirms order, commits stock', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(paymentId),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      provider: 'phonepe',
      providerPaymentId: 'TXN_PHONEPE_SUCCESS_001',
      amount: 450,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockOrder = {
      _id: new Types.ObjectId(orderId),
      orderNumber: 'ORD-20260825-000101',
      tokenNumber: 'A101',
      userId: new Types.ObjectId(userId),
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      total: 450,
      items: [{ productId: 'p1', quantity: 2 }],
      save: vi.fn().mockResolvedValue(true),
    };

    const mockProvider = {
      name: 'phonepe',
      createPayment: vi.fn(),
      verifyPayment: vi.fn().mockResolvedValue({
        status: PAYMENT_STATUS.SUCCESS,
        verified: true,
        amount: 450,
        currency: 'INR',
        transactionId: 'BANK_TXN_999888',
      }),
      parseWebhook: vi.fn(),
      refundPayment: vi.fn(),
      getPaymentStatus: vi.fn(),
    };

    vi.spyOn(paymentService, 'getProvider').mockReturnValue(mockProvider as any);
    vi.spyOn(Payment, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockPayment),
    } as any);
    vi.spyOn(Payment, 'findById').mockResolvedValue(mockPayment as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

    const confirmOrderSpy = vi.spyOn(orderService, 'confirmOrder').mockResolvedValue({
      ...mockOrder,
      status: ORDER_STATUS.ORDER_CONFIRMED,
      paymentStatus: PAYMENT_STATUS.SUCCESS,
    } as any);

    vi.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({
      ...mockPayment,
      status: PAYMENT_STATUS.SUCCESS,
      verificationStatus: 'VERIFIED',
      providerTransactionId: 'BANK_TXN_999888',
    } as any);

    const { payment, order } = await paymentService.verifyPayment(paymentId, userId);

    expect(mockProvider.verifyPayment).toHaveBeenCalledWith('TXN_PHONEPE_SUCCESS_001');
    expect(confirmOrderSpy).toHaveBeenCalledWith(orderId);
    expect(payment.status).toBe(PAYMENT_STATUS.SUCCESS);
    expect(order.status).toBe(ORDER_STATUS.ORDER_CONFIRMED);
  });

  // =========================================================================
  // Test 2 — Cancelled / Failed Payment
  // =========================================================================
  it('Test 2 — Cancelled Payment: Cancelling UPI payment does NOT confirm order and marks PAYMENT_FAILED', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(paymentId),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      provider: 'phonepe',
      providerPaymentId: 'TXN_PHONEPE_CANCEL_002',
      amount: 300,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockOrder = {
      _id: new Types.ObjectId(orderId),
      orderNumber: 'ORD-20260825-000102',
      userId: new Types.ObjectId(userId),
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      total: 300,
      items: [{ productId: 'p2', quantity: 1 }],
      save: vi.fn().mockResolvedValue(true),
    };

    const mockProvider = {
      name: 'phonepe',
      createPayment: vi.fn(),
      verifyPayment: vi.fn().mockResolvedValue({
        status: PAYMENT_STATUS.FAILED,
        verified: true,
        amount: 300,
        currency: 'INR',
      }),
      parseWebhook: vi.fn(),
      refundPayment: vi.fn(),
      getPaymentStatus: vi.fn(),
    };

    vi.spyOn(paymentService, 'getProvider').mockReturnValue(mockProvider as any);
    vi.spyOn(Payment, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockPayment),
    } as any);
    vi.spyOn(Payment, 'findById').mockResolvedValue(mockPayment as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

    const updatePaymentSpy = vi.spyOn(Payment, 'updateOne').mockResolvedValue({} as any);
    const failOrderSpy = vi.spyOn(orderService, 'failOrder').mockResolvedValue({
      ...mockOrder,
      status: ORDER_STATUS.PAYMENT_FAILED,
      paymentStatus: PAYMENT_STATUS.FAILED,
    } as any);

    const confirmOrderSpy = vi.spyOn(orderService, 'confirmOrder');

    const result = await paymentService.verifyPayment(paymentId, userId);

    expect(mockProvider.verifyPayment).toHaveBeenCalledWith('TXN_PHONEPE_CANCEL_002');
    expect(confirmOrderSpy).not.toHaveBeenCalled();
    expect(failOrderSpy).toHaveBeenCalledWith(orderId);
    expect(updatePaymentSpy).toHaveBeenCalledWith(
      { _id: mockPayment._id },
      { $set: { status: PAYMENT_STATUS.FAILED, verificationStatus: 'REJECTED' } }
    );
    expect(result.payment.status).toBe(PAYMENT_STATUS.FAILED);
  });

  // =========================================================================
  // Test 3 — Pending Payment
  // =========================================================================
  it('Test 3 — Pending Payment: Keeps status as PENDING when gateway is processing', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(paymentId),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      provider: 'phonepe',
      providerPaymentId: 'TXN_PHONEPE_PENDING_003',
      amount: 250,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockOrder = {
      _id: new Types.ObjectId(orderId),
      orderNumber: 'ORD-20260825-000103',
      userId: new Types.ObjectId(userId),
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      total: 250,
    };

    const mockProvider = {
      name: 'phonepe',
      createPayment: vi.fn(),
      verifyPayment: vi.fn().mockResolvedValue({
        status: PAYMENT_STATUS.PENDING,
        verified: false,
        amount: 250,
        currency: 'INR',
      }),
      parseWebhook: vi.fn(),
      refundPayment: vi.fn(),
      getPaymentStatus: vi.fn(),
    };

    vi.spyOn(paymentService, 'getProvider').mockReturnValue(mockProvider as any);
    vi.spyOn(Payment, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockPayment),
    } as any);
    vi.spyOn(Payment, 'findById').mockResolvedValue(mockPayment as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

    const confirmOrderSpy = vi.spyOn(orderService, 'confirmOrder');
    const failOrderSpy = vi.spyOn(orderService, 'failOrder');

    const { payment, order } = await paymentService.verifyPayment(paymentId, userId);

    expect(confirmOrderSpy).not.toHaveBeenCalled();
    expect(failOrderSpy).not.toHaveBeenCalled();
    expect(payment.status).toBe(PAYMENT_STATUS.PENDING);
    expect(order.status).toBe(ORDER_STATUS.PAYMENT_PENDING);
  });

  // =========================================================================
  // Test 4 — Idempotency / Multiple Status Calls
  // =========================================================================
  it('Test 4 — Idempotency: Multiple verification calls on an already verified payment do not re-confirm or duplicate stock', async () => {
    const alreadyVerifiedPayment = {
      _id: new Types.ObjectId(paymentId),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      provider: 'phonepe',
      providerPaymentId: 'TXN_PHONEPE_SUCCESS_001',
      amount: 450,
      currency: 'INR',
      status: PAYMENT_STATUS.SUCCESS,
      verificationStatus: 'VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    const confirmedOrder = {
      _id: new Types.ObjectId(orderId),
      orderNumber: 'ORD-20260825-000101',
      tokenNumber: 'A101',
      userId: new Types.ObjectId(userId),
      status: ORDER_STATUS.ORDER_CONFIRMED,
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      total: 450,
    };

    vi.spyOn(Payment, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(alreadyVerifiedPayment),
    } as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(confirmedOrder as any);

    const confirmOrderSpy = vi.spyOn(orderService, 'confirmOrder');

    // Call verify 3 times consecutively
    await paymentService.verifyPayment(paymentId, userId);
    await paymentService.verifyPayment(paymentId, userId);
    const result = await paymentService.verifyPayment(paymentId, userId);

    expect(confirmOrderSpy).not.toHaveBeenCalled(); // Fast path: already verified, no redundant confirmation
    expect(result.payment.status).toBe(PAYMENT_STATUS.SUCCESS);
    expect(result.order.status).toBe(ORDER_STATUS.ORDER_CONFIRMED);
  });

  // =========================================================================
  // Test 5 — User Mismatch / Security
  // =========================================================================
  it('Test 5 — Security: Unauthorized user cannot verify or query another user payment', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(paymentId),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      provider: 'phonepe',
      providerPaymentId: 'TXN_PHONEPE_005',
    };

    // When unauthorized user tries to find the payment, findPaymentForUser filters by userId or rejects
    vi.spyOn(Payment, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as any);

    await expect(
      paymentService.verifyPayment(paymentId, unauthorizedUserId)
    ).rejects.toThrow(AppError);
  });

  // =========================================================================
  // Test 6 — Amount Tampering Prevention
  // =========================================================================
  it('Test 6 — Amount Tampering: Rejects and fails payment if gateway amount mismatches order amount', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(paymentId),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      provider: 'phonepe',
      providerPaymentId: 'TXN_PHONEPE_TAMPER_006',
      amount: 500, // Expected 500
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockOrder = {
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      total: 500,
    };

    const mockProvider = {
      name: 'phonepe',
      verifyPayment: vi.fn().mockResolvedValue({
        status: PAYMENT_STATUS.SUCCESS,
        verified: true,
        amount: 50, // Gateway only received 50 paise / INR (mismatch!)
        currency: 'INR',
      }),
    };

    vi.spyOn(paymentService, 'getProvider').mockReturnValue(mockProvider as any);
    vi.spyOn(Payment, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockPayment),
    } as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

    await expect(
      paymentService.verifyPayment(paymentId, userId)
    ).rejects.toThrow(/Amount mismatch/i);

    expect(mockPayment.status).toBe(PAYMENT_STATUS.FAILED);
    expect(mockPayment.verificationStatus).toBe('REJECTED');
  });
});
