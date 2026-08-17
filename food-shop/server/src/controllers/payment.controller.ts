import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { paymentService } from '../services/payment.service';
import { Payment } from '../models';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { paymentId: string };
  const { payment: verified, order } = await paymentService.verifyPayment(body.paymentId, req.userId!);
  sendSuccess(res, { payment: verified, order });
});

export const webhookHandler = (providerName: string) =>
  asyncHandler(async (req: Request, res: Response) => {
    // If we used express.raw, req.body is a buffer. If it was already parsed, it's an object.
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ((req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {}));
    
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

export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  await paymentService.refundPayment(req.params.paymentId);
  sendSuccess(res, { message: 'Refund initiated successfully' });
});
