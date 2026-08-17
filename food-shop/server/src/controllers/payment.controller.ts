import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { paymentService } from '../services/payment.service';
import { mockPaymentProvider } from '../services/providers/mock.provider';
import { Payment, Order } from '../models';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Verify a payment after the client reports success (or to reconcile on reconnect).
 * The backend always verifies with the provider before confirming the order.
 */
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { paymentId: string };
  const payment = await Payment.findById(body.paymentId);
  if (!payment) throw new NotFoundError('Payment not found');
  if (String(payment.userId) !== req.userId) throw new ForbiddenError('You cannot verify this payment');

  const { payment: verified, order } = await paymentService.verifyPayment(body.paymentId);
  sendSuccess(res, { payment: verified, order });
});

export const simulatePayment = asyncHandler(async (req: Request, res: Response) => {
  if (env.isProd || env.paymentProvider !== 'mock') {
    throw new ForbiddenError('Mock payment simulation is disabled outside development');
  }
  const body = req.validatedBody as { paymentId: string; outcome?: 'success' | 'failure' };
  const outcome = body.outcome ?? 'success';

  const payment = await Payment.findById(body.paymentId);
  if (!payment) throw new NotFoundError('Payment not found');
  if (String(payment.userId) !== req.userId) throw new ForbiddenError('You cannot simulate this payment');

  const sim = mockPaymentProvider.simulatePayment(payment.providerPaymentId, outcome);
  // Route through the same webhook handler as a real gateway to exercise
  // signature verification + idempotency.
  const result = await paymentService.handleWebhook('mock', sim.rawBody, {
    'x-mock-signature': sim.signature,
  });

  const order = await Order.findById(payment.orderId);
  sendSuccess(res, { result, order });
});

/**
 * Generic gateway webhook endpoint. The provider dispatches on the path.
 */
export const webhookHandler = (providerName: string) =>
  asyncHandler(async (req: Request, res: Response) => {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    try {
      const result = await paymentService.handleWebhook(providerName, rawBody, req.headers as Record<string, string>);
      sendSuccess(res, { received: true, ...result });
    } catch (err) {
      logger.warn('Webhook rejected', { provider: providerName, error: (err as Error).message });
      // Acknowledge to avoid gateway retries while logging for investigation.
      sendSuccess(res, { received: true, accepted: false }, 200);
    }
  });

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findOne({ _id: req.params.paymentId, userId: req.userId });
  if (!payment) throw new NotFoundError('Payment not found');
  sendSuccess(res, { payment });
});
