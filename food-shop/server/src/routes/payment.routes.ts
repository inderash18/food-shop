import express, { Router } from 'express';
import { verifyPayment, simulatePayment, webhookHandler, getPaymentStatus } from '../controllers/payment.controller';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();

const verifySchema = z.object({ paymentId: z.string().min(1) });
const simulateSchema = z.object({
  paymentId: z.string().min(1),
  outcome: z.enum(['success', 'failure']).optional(),
});

router.post(
  '/verify',
  requireAuth(),
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'pay_verify' }),
  validate(verifySchema),
  verifyPayment
);

router.post('/simulate', requireAuth(), validate(simulateSchema), simulatePayment);

router.get('/status/:paymentId', requireAuth(), getPaymentStatus);

router.post('/webhook/mock', express.text({ type: '*/*' }), webhookHandler('mock'));
router.post('/webhook/razorpay', express.text({ type: '*/*' }), webhookHandler('razorpay'));

export default router;
