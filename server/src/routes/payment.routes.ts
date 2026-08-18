import express, { Router } from 'express';
import { verifyPayment, webhookHandler, getPaymentStatus, requestRefund } from '../controllers/payment.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { ROLE } from '../constants';
import { validate } from '../middlewares/validate';
import { z } from 'zod';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

const verifySchema = z.object({ paymentId: z.string().min(1) });

router.post(
  '/verify',
  requireAuth(),
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'pay_verify' }),
  validate(verifySchema),
  verifyPayment
);

router.get('/status/:paymentId', requireAuth(), getPaymentStatus);

// Admin / specific roles for refund
router.post('/:paymentId/refund', requireAuth(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN), requestRefund);

router.post('/webhooks/paytm', express.raw({ type: '*/*', limit: '256kb' }), webhookHandler('paytm'));

export default router;
