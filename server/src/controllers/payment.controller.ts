import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { paymentService } from '../services/payment.service';
import { Payment, Order } from '../models';
import { PAYMENT_STATUS } from '../constants';
import { NotFoundError, AppError, PaymentError } from '../utils/errors';
import { logger } from '../config/logger';
import { RazorpayProvider } from '../services/providers/razorpay.provider';

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    paymentId?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  const paymentIdOrIdentifier = body.paymentId || body.razorpay_order_id || body.razorpay_payment_id;
  if (!paymentIdOrIdentifier) {
    throw new AppError(400, 'BAD_REQUEST', 'Missing payment identifier');
  }

  // If Razorpay signature is explicitly supplied, verify HMAC signature
  if (body.razorpay_order_id && body.razorpay_payment_id && body.razorpay_signature) {
    const isValid = RazorpayProvider.verifySignature(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature
    );

    if (!isValid) {
      logger.warn('Razorpay signature verification failed', {
        orderId: body.razorpay_order_id,
        paymentId: body.razorpay_payment_id,
      });

      const payment = await paymentService.findPaymentForUser(paymentIdOrIdentifier, req.userId);
      if (payment) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.verificationStatus = 'REJECTED';
        payment.failureReason = 'SIGNATURE_VERIFICATION_FAILED';
        await payment.save();
        const { failOrder } = await import('../services/order.service');
        await failOrder(String(payment.orderId));
      }

      throw new PaymentError('Payment verification failed: Signature mismatch', 'INVALID_PAYMENT');
    }
  }

  const { payment: verified, order } = await paymentService.verifyPayment(paymentIdOrIdentifier, req.userId!);
  sendSuccess(res, { payment: verified, order, status: verified.status });
});

export const webhookHandler = (providerName: string) =>
  asyncHandler(async (req: Request, res: Response) => {
    // If we used express.raw, req.body is a buffer. If it was already parsed, it's an object.
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : ((req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {}));

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
  const payment = await paymentService.findPaymentForUser(req.params.paymentId, req.userId);
  if (!payment) throw new NotFoundError('Payment not found');

  const order = await Order.findById(payment.orderId);

  // If already verified SUCCESS, return verified result directly
  if (payment.status === PAYMENT_STATUS.SUCCESS && payment.verificationStatus === 'VERIFIED') {
    return sendSuccess(res, { payment, order, status: PAYMENT_STATUS.SUCCESS });
  }

  // If already permanently marked FAILED / REJECTED, return failed status
  if (payment.status === PAYMENT_STATUS.FAILED && payment.verificationStatus === 'REJECTED') {
    return sendSuccess(res, { payment, order, status: PAYMENT_STATUS.FAILED });
  }

  // Active server-side verification with the payment gateway
  try {
    const { payment: verifiedPayment, order: verifiedOrder } = await paymentService.verifyPayment(
      String(payment._id),
      req.userId!
    );
    sendSuccess(res, {
      payment: verifiedPayment,
      order: verifiedOrder,
      status: verifiedPayment.status,
    });
  } catch (err: any) {
    logger.warn('Payment status query verification check info', {
      paymentId: String(payment._id),
      message: err?.message,
    });
    const latestPayment = await Payment.findById(payment._id);
    const latestOrder = await Order.findById(payment.orderId);
    sendSuccess(res, {
      payment: latestPayment || payment,
      order: latestOrder || order,
      status: latestPayment?.status || PAYMENT_STATUS.PENDING,
    });
  }
});

export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  await paymentService.refundPayment(req.params.paymentId);
  sendSuccess(res, { message: 'Refund initiated successfully' });
});

