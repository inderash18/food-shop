import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toPaise, toRupees, isAmountEqual } from '../utils/money';
import { handleAdminLogin, handleAdminMe, handleAdminLogout } from '../controllers/admin.auth.controller';
import { ROLE } from '../constants';
import * as authService from '../services/auth.service';
import { Order, Payment } from '../models';
import { paymentService } from '../services/payment.service';
import { ForbiddenError } from '../utils/errors';

describe('Payment Amount Integrity & Separate Admin Portal Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Currency & Unit Conversion Helper Tests', () => {
    it('accurately converts INR rupees to paise for all required amounts (₹20, ₹50, ₹70, ₹100, ₹149, ₹199, ₹500, ₹999)', () => {
      expect(toPaise(20)).toBe(2000);
      expect(toPaise(50)).toBe(5000);
      expect(toPaise(70)).toBe(7000);
      expect(toPaise(100)).toBe(10000);
      expect(toPaise(149)).toBe(14900);
      expect(toPaise(199)).toBe(19900);
      expect(toPaise(500)).toBe(50000);
      expect(toPaise(999)).toBe(99900);
    });

    it('accurately converts paise back to rupees', () => {
      expect(toRupees(7000)).toBe(70);
      expect(toRupees(2000)).toBe(20);
      expect(toRupees(14900)).toBe(149);
      expect(toRupees(99900)).toBe(999);
    });

    it('multiplies price by quantity accurately (₹70 x 1 = ₹70, ₹70 x 2 = ₹140, ₹70 x 5 = ₹350)', () => {
      const unitPrice = 70;
      expect(toPaise(unitPrice * 1)).toBe(7000);
      expect(toPaise(unitPrice * 2)).toBe(14000);
      expect(toPaise(unitPrice * 5)).toBe(35000);
    });

    it('correctly compares amounts within 0.01 tolerance', () => {
      expect(isAmountEqual(70, 70.0)).toBe(true);
      expect(isAmountEqual(70, 20)).toBe(false);
      expect(isAmountEqual(69.999, 70)).toBe(true);
    });
  });

  describe('2. Pre-Payment Server Amount Validation', () => {
    it('rejects payment creation if input amount mismatches order total', async () => {
      const mockOrder = {
        _id: '507f1f77bcf86cd799439011',
        orderNumber: 'ORD-7001',
        total: 70,
        userId: '507f1f77bcf86cd799439012',
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

      await expect(
        paymentService.createPayment({
          orderId: mockOrder._id,
          userId: mockOrder.userId,
          amount: 20, // Intentional mismatch: ₹20 passed instead of ₹70
          currency: 'INR',
        })
      ).rejects.toThrow(/Payment amount \(₹20\) does not match order total \(₹70\)/);
    });

    it('creates payment intent using authoritative order total (₹70 -> ₹70)', async () => {
      const mockOrder = {
        _id: '507f1f77bcf86cd799439011',
        orderNumber: 'ORD-7001',
        total: 70,
        userId: '507f1f77bcf86cd799439012',
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);
      vi.spyOn(Payment, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      } as any);

      const mockProvider = {
        name: 'razorpay',
        createPayment: vi.fn().mockResolvedValue({
          providerPaymentId: 'order_test_70',
          metadata: { amount: 7000 },
        }),
        verifyPayment: vi.fn(),
        parseWebhook: vi.fn(),
        refundPayment: vi.fn(),
        getPaymentStatus: vi.fn(),
      };

      vi.spyOn(paymentService as any, 'getProvider').mockReturnValue(mockProvider);

      vi.spyOn(Payment, 'create').mockResolvedValue({
        _id: 'pay_7001' as any,
        orderId: mockOrder._id,
        userId: mockOrder.userId,
        provider: 'razorpay',
        providerPaymentId: 'order_test_70',
        amount: 70,
        currency: 'INR',
        status: 'PENDING',
        verificationStatus: 'NOT_VERIFIED',
      } as any);

      const intent = await paymentService.createPayment({
        orderId: mockOrder._id,
        userId: mockOrder.userId,
        amount: 70,
        currency: 'INR',
      });

      expect(intent.amount).toBe(70);
      expect(intent.providerPaymentId).toBe('order_test_70');
    });
  });

  describe('3. Dedicated Admin Portal Authentication Tests', () => {
    it('rejects student logins on adminLogin with ForbiddenError', async () => {
      vi.spyOn(authService, 'loginUser').mockResolvedValue({
        user: { _id: '507f1f77bcf86cd799439011', name: 'Student', email: 'stu@college.local', role: ROLE.STUDENT } as any,
        accessToken: 'mock_token',
        refreshToken: 'mock_refresh',
      });

      const req: any = {
        validatedBody: { identifier: 'stu@college.local', password: 'password' },
        ip: '127.0.0.1',
      };
      const res: any = {};
      res.cookie = vi.fn();
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);

      await expect(handleAdminLogin(req, res)).rejects.toThrow(ForbiddenError);
    });

    it('authenticates admin successfully and sets admin auth cookies', async () => {
      vi.spyOn(authService, 'loginUser').mockResolvedValue({
        user: { _id: '507f1f77bcf86cd799439011', name: 'Admin', email: 'admin@college.local', role: ROLE.ADMIN } as any,
        accessToken: 'admin_mock_token',
        refreshToken: 'admin_mock_refresh',
      });

      const req: any = {
        validatedBody: { identifier: 'admin@college.local', password: 'password' },
        ip: '127.0.0.1',
      };
      const res: any = {};
      res.cookie = vi.fn();
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);

      await handleAdminLogin(req, res);

      expect(res.cookie).toHaveBeenCalledWith('adminAccessToken', 'admin_mock_token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('adminRefreshToken', 'admin_mock_refresh', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: 'admin_mock_token',
            role: ROLE.ADMIN,
          }),
        })
      );
    });

    it('rejects non-admin role in adminMe', async () => {
      const req: any = { user: { _id: '507f1f77bcf86cd799439011', role: ROLE.STUDENT } };
      const res: any = {};
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);

      await expect(handleAdminMe(req, res)).rejects.toThrow(ForbiddenError);
    });

    it('clears admin cookies on adminLogout', async () => {
      const req: any = { cookies: { adminRefreshToken: 'token' }, userId: '507f1f77bcf86cd799439011' };
      const res: any = {};
      res.clearCookie = vi.fn();
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);

      await handleAdminLogout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('adminRefreshToken', { path: '/' });
      expect(res.clearCookie).toHaveBeenCalledWith('adminAccessToken', { path: '/' });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});
