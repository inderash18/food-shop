import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RazorpayProvider } from '../services/providers/razorpay.provider';
import { razorpayConfig } from '../config/razorpay';
import { PaymentProviderNotConfiguredError, AppError } from '../utils/errors';
import razorpayRoutes from '../routes/razorpay.routes';
import { Payment, PaymentTransaction } from '../models';

describe('Razorpay Integration & Standard Checkout', () => {
  const testKeyId = 'rzp_test_TTYAXG7VWTlIRe';
  const testSecret = 'yB1ESmQed76ooaTxvS9ZLagA';
  const testOrderId = 'order_test_9876543210';
  const testPaymentId = 'pay_test_1234567890';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration & Unconfigured Safety', () => {
    it('detects if Razorpay is configured properly from environment', () => {
      expect(razorpayConfig.isConfigured).toBe(true);
      expect(razorpayConfig.keyId).toBeTruthy();
      expect(razorpayConfig.keySecret).toBeTruthy();
    });

    it('throws PaymentProviderNotConfiguredError when credentials are unset', async () => {
      vi.spyOn(razorpayConfig, 'isConfigured', 'get').mockReturnValue(false);
      const provider = new RazorpayProvider();

      await expect(
        provider.createPayment(
          { orderId: 'ord_123', userId: 'user_1', amount: 500, currency: 'INR' },
          'idemp_1'
        )
      ).rejects.toThrow(PaymentProviderNotConfiguredError);

      await expect(provider.verifyPayment('order_123')).rejects.toThrow(
        PaymentProviderNotConfiguredError
      );
    });
  });

  describe('STEP 1: Backend - Create Order', () => {
    it('enforces minimum amount >= 100 paise (₹1.00)', async () => {
      const provider = new RazorpayProvider();

      // 0.50 INR = 50 paise, which is < 100 paise
      await expect(
        provider.createPayment(
          { orderId: 'ord_99', userId: 'user_1', amount: 0.5, currency: 'INR' },
          'idemp_99'
        )
      ).rejects.toThrow(AppError);
    });

    it('successfully calls Razorpay API and returns providerPaymentId and metadata', async () => {
      const provider = new RazorpayProvider();
      const mockRazorpayInstance = {
        orders: {
          create: vi.fn().mockResolvedValue({
            id: testOrderId,
            amount: 50000,
            currency: 'INR',
            receipt: 'rcpt_12345',
            status: 'created',
          }),
        },
      };

      vi.spyOn(razorpayConfig, 'getInstance').mockReturnValue(mockRazorpayInstance as any);

      const result = await provider.createPayment(
        { orderId: 'ord_1234567890', userId: 'user_1', amount: 500, currency: 'INR' },
        'idemp_123'
      );

      expect(result.providerPaymentId).toBe(testOrderId);
      expect(result.metadata?.razorpayOrderId).toBe(testOrderId);
      expect(result.metadata?.amount).toBe(50000);
      expect(result.metadata?.currency).toBe('INR');
      expect(mockRazorpayInstance.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000,
          currency: 'INR',
        })
      );
    });
  });

  describe('STEP 3: Backend - Verify Signature Algorithm (HMAC-SHA256)', () => {
    it('verifies valid HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)', () => {
      const validSignature = crypto
        .createHmac('sha256', razorpayConfig.keySecret)
        .update(`${testOrderId}|${testPaymentId}`)
        .digest('hex');

      const isValid = RazorpayProvider.verifySignature(testOrderId, testPaymentId, validSignature);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or mismatched signature', () => {
      const tamperedSignature = crypto
        .createHmac('sha256', 'wrong_secret')
        .update(`${testOrderId}|${testPaymentId}`)
        .digest('hex');

      const isValid = RazorpayProvider.verifySignature(testOrderId, testPaymentId, tamperedSignature);
      expect(isValid).toBe(false);
    });

    it('rejects malformed signature strings safely', () => {
      expect(RazorpayProvider.verifySignature(testOrderId, testPaymentId, 'random_garbage_string')).toBe(false);
      expect(RazorpayProvider.verifySignature(testOrderId, testPaymentId, '')).toBe(false);
    });
  });

  describe('Verify Payment Provider Status & Fetch', () => {
    it('fetches captured payments from Razorpay and marks status as SUCCESS', async () => {
      const provider = new RazorpayProvider();
      const mockRazorpayInstance = {
        orders: {
          fetchPayments: vi.fn().mockResolvedValue({
            items: [
              {
                id: testPaymentId,
                status: 'captured',
                amount: 50000,
                currency: 'INR',
              },
            ],
          }),
        },
      };

      vi.spyOn(razorpayConfig, 'getInstance').mockReturnValue(mockRazorpayInstance as any);

      const verification = await provider.verifyPayment(testOrderId);
      expect(verification.status).toBe('SUCCESS');
      expect(verification.verified).toBe(true);
      expect(verification.transactionId).toBe(testPaymentId);
      expect(verification.amount).toBe(500);
      expect(verification.currency).toBe('INR');
    });
  });
});
