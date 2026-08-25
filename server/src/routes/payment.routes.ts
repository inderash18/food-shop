import express, { Router } from 'express';
import { verifyPayment, webhookHandler, getPaymentStatus, requestRefund } from '../controllers/payment.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { ROLE } from '../constants';
import { validate } from '../middlewares/validate';
import { z } from 'zod';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

const verifySchema = z
  .object({
    paymentId: z.string().min(1).optional(),
    razorpay_order_id: z.string().min(1).optional(),
    razorpay_payment_id: z.string().min(1).optional(),
    razorpay_signature: z.string().min(1).optional(),
    order_id: z.string().min(1).optional(),
    payment_id: z.string().min(1).optional(),
    signature: z.string().min(1).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.paymentId ||
          data.razorpay_order_id ||
          data.razorpay_payment_id ||
          data.order_id ||
          data.payment_id
      ),
    {
      message: 'At least one payment identifier must be provided',
    }
  );

router.post(
  '/verify',
  requireAuth(),
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'pay_verify' }),
  validate(verifySchema),
  verifyPayment
);

router.post(
  '/verify-payment',
  requireAuth(),
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'pay_verify' }),
  validate(verifySchema),
  verifyPayment
);

router.get('/status/:paymentId', requireAuth(), getPaymentStatus);
router.get('/:paymentId', requireAuth(), getPaymentStatus);

// Admin / specific roles for refund
router.post('/:paymentId/refund', requireAuth(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN), requestRefund);

router.post('/webhooks/paytm', express.raw({ type: '*/*', limit: '256kb' }), webhookHandler('paytm'));
router.post('/webhooks/phonepe', express.json({ limit: '256kb' }), webhookHandler('phonepe'));
router.post('/webhooks/razorpay', express.raw({ type: '*/*', limit: '256kb' }), webhookHandler('razorpay'));
router.post('/webhook', express.raw({ type: '*/*', limit: '256kb' }), webhookHandler('razorpay'));

export default router;

