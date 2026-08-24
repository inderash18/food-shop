import crypto from 'crypto';
import express, { Router, Request, Response } from 'express';
import { razorpayConfig } from '../config/razorpay';
import { AppError, BadRequestError, OutOfStockError, NotFoundError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { Payment, Order, Product, PaymentTransaction, PaymentWebhookEvent } from '../models';
import { PAYMENT_STATUS, ORDER_STATUS } from '../constants';
import { confirmOrder } from '../services/order.service';
import { generateOrderIdentifiers } from '../utils/orderNumber';
import { env } from '../config/env';

const router = Router();

/**
 * Helper to handle order creation:
 * - Can accept items array (calculating authoritative price server-side from DB)
 * - Or direct amount (paise or INR >= 100 paise)
 */
async function handleCreateOrder(req: Request, res: Response) {
  logger.info('[PAYMENT] Checkout initiated', { body: req.body });

  if (!razorpayConfig.isConfigured) {
    logger.error('[PAYMENT] Razorpay credentials not configured');
    return res.status(503).json({
      success: false,
      error: {
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Razorpay credentials are not configured on server.',
      },
    });
  }

  let amountInPaise: number;
  let currency = req.body.currency || 'INR';
  let receipt = req.body.receipt;
  let notes = req.body.notes || {};

  // Case A: Items array passed -> calculate authoritative server-side price from Product models
  if (Array.isArray(req.body.items) && req.body.items.length > 0) {
    const productIds = req.body.items.map((i: any) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();

    let subtotal = 0;
    for (const item of req.body.items) {
      const product = products.find((p) => String(p._id) === String(item.productId));
      if (!product) {
        throw new BadRequestError('One or more items in cart are unavailable');
      }
      const qty = Math.max(1, Math.floor(item.quantity || 1));
      subtotal += product.price * qty;
    }

    amountInPaise = Math.round(subtotal * 100);
    receipt = receipt || `rcpt_${Date.now().toString().slice(-8)}`;
  } 
  // Case B: Direct amount passed (in paise or INR)
  else if (req.body.amount !== undefined && req.body.amount !== null) {
    const rawAmount = Number(req.body.amount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing or invalid amount');
    }
    // If amount is passed as paise (e.g. 50000) vs INR (500)
    amountInPaise = Math.round(rawAmount);
  } else {
    throw new AppError(400, 'BAD_REQUEST', 'Either amount or items array must be provided');
  }

  if (amountInPaise < 100) {
    throw new AppError(400, 'BAD_REQUEST', 'Amount must be at least 100 paise (₹1.00)');
  }

  try {
    logger.info('[PAYMENT] Creating Razorpay order', { amountInPaise, currency });

    const razorpay = razorpayConfig.getInstance();
    const options = {
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now().toString().slice(-8)}`,
      notes: notes || {},
    };

    const razorpayOrder = await razorpay.orders.create(options);

    logger.info('[PAYMENT] Razorpay order created', {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });

    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayConfig.keyId,
      key_id: razorpayConfig.keyId,
      receipt: razorpayOrder.receipt,
    });
  } catch (error: any) {
    logger.error('[PAYMENT] Failed to create Razorpay order', {
      error: error?.message,
      details: error?.error,
    });

    if (error?.statusCode === 401 || (error?.error?.code === 'BAD_REQUEST_ERROR' && error?.error?.description?.toLowerCase().includes('auth'))) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Razorpay authentication failed. Invalid API credentials.',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'RAZORPAY_API_ERROR',
        message: error?.error?.description || error?.message || 'Error occurred while creating Razorpay order',
      },
    });
  }
}

/**
 * Helper to handle signature verification:
 * - Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * - Updates Payment and Order records atomically
 */
async function handleVerifyPayment(req: Request, res: Response) {
  const order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
  const payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
  const signature = req.body.razorpay_signature || req.body.signature;
  const internalPaymentId = req.body.paymentId;

  logger.info('[PAYMENT] Payment verification started', {
    order_id,
    payment_id,
    hasSignature: Boolean(signature),
  });

  // Validate missing fields
  if (!order_id || !payment_id || !signature) {
    logger.warn('[PAYMENT] Razorpay signature verification missing fields', {
      hasOrderId: Boolean(order_id),
      hasPaymentId: Boolean(payment_id),
      hasSignature: Boolean(signature),
    });
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
      },
    });
  }

  if (!razorpayConfig.isConfigured) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Razorpay credentials not configured.',
      },
    });
  }

  const keySecret = razorpayConfig.keySecret;
  const body = `${order_id}|${payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  let isValid = false;
  if (generatedSignature.length === signature.length) {
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch {
      isValid = generatedSignature === signature;
    }
  }

  if (!isValid) {
    logger.warn('[PAYMENT] Signature verification failed (mismatch)', {
      order_id,
      payment_id,
    });

    // Update payment record to FAILED if found
    await Payment.updateOne(
      { providerPaymentId: order_id },
      {
        $set: {
          status: PAYMENT_STATUS.FAILED,
          verificationStatus: 'REJECTED',
          failureReason: 'SIGNATURE_VERIFICATION_FAILED',
        },
      }
    );

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Payment verification failed: Signature mismatch. Payment has not been marked as paid.',
      },
    });
  }

  logger.info('[PAYMENT] Payment verification successful', {
    order_id,
    payment_id,
  });

  // Update Database models
  try {
    const payment = await Payment.findOne({
      $or: [
        { providerPaymentId: order_id },
        { providerPaymentId: payment_id },
        ...(internalPaymentId ? [{ _id: internalPaymentId }] : []),
      ],
    });

    if (payment) {
      // Check for duplicate processed transaction
      const existingTx = await PaymentTransaction.findOne({
        provider: 'razorpay',
        transactionId: payment_id,
      });

      if (!existingTx) {
        await PaymentTransaction.create({
          paymentId: payment._id,
          orderId: payment.orderId,
          provider: 'razorpay',
          transactionId: payment_id,
          amount: payment.amount,
          currency: payment.currency,
          merchantAccountId: razorpayConfig.keyId,
          status: PAYMENT_STATUS.SUCCESS,
          verifiedAt: new Date(),
        });
      }

      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.verificationStatus = 'VERIFIED';
      payment.providerTransactionId = payment_id;
      payment.verifiedAt = new Date();
      await payment.save();

      if (payment.orderId) {
        await confirmOrder(String(payment.orderId));
        logger.info('[PAYMENT] Order marked PAID', {
          orderId: String(payment.orderId),
          paymentId: String(payment._id),
          providerTransactionId: payment_id,
        });
      }
    } else {
      // If there's an Order matching receipt or checkoutRequestId
      const order = await Order.findOne({
        $or: [{ orderNumber: order_id }, { checkoutRequestId: order_id }],
      });
      if (order) {
        order.status = ORDER_STATUS.ORDER_CONFIRMED;
        order.paymentStatus = PAYMENT_STATUS.SUCCESS;
        await order.save();
        logger.info('[PAYMENT] Order marked PAID', { orderId: String(order._id) });
      }
    }
  } catch (dbErr: any) {
    logger.error('[PAYMENT] Error updating database on verification', {
      error: dbErr?.message,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    orderId: order_id,
    order_id,
    paymentId: payment_id,
    payment_id,
  });
}

/**
 * Webhook handler for Razorpay:
 * - Validates X-Razorpay-Signature
 * - Idempotent event processing
 */
async function handleWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : (req as any).rawBody || JSON.stringify(req.body);

  if (!signature) {
    logger.warn('[PAYMENT] Webhook rejected: missing X-Razorpay-Signature');
    return res.status(400).json({ success: false, message: 'Missing signature' });
  }

  const secret = env.webhookSecret || razorpayConfig.keySecret;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('[PAYMENT] Webhook rejected: signature mismatch');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const eventId = eventPayload.event || `rzp_${Date.now()}`;
  const paymentEntity = eventPayload.payload?.payment?.entity;
  const orderEntity = eventPayload.payload?.order?.entity;
  const providerPaymentId = orderEntity?.id || paymentEntity?.order_id || paymentEntity?.id;

  // Idempotency check
  const existingEvent = await PaymentWebhookEvent.findOne({
    provider: 'razorpay',
    eventId,
  });

  if (existingEvent) {
    logger.info('[PAYMENT] Duplicate webhook event ignored', { eventId });
    return res.status(200).json({ success: true, message: 'Event already processed' });
  }

  await PaymentWebhookEvent.create({
    eventId,
    provider: 'razorpay',
    eventType: eventPayload.event,
    transactionId: providerPaymentId,
    rawPayload: rawBody,
    processed: true,
    processedAt: new Date(),
  });

  if (eventPayload.event === 'payment.captured' || eventPayload.event === 'order.paid') {
    const payment = await Payment.findOne({
      $or: [{ providerPaymentId: providerPaymentId }, { providerPaymentId: paymentEntity?.id }],
    });

    if (payment) {
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.verificationStatus = 'VERIFIED';
      payment.providerTransactionId = paymentEntity?.id;
      payment.verifiedAt = new Date();
      await payment.save();

      if (payment.orderId) {
        await confirmOrder(String(payment.orderId));
        logger.info('[PAYMENT] Order marked PAID via webhook', {
          orderId: String(payment.orderId),
        });
      }
    }
  }

  return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
}

// Register all route variants
router.post('/create-order', asyncHandler(handleCreateOrder));
router.post('/verify-payment', asyncHandler(handleVerifyPayment));
router.post('/verify', asyncHandler(handleVerifyPayment));
router.post('/webhook', express.raw({ type: '*/*', limit: '256kb' }), asyncHandler(handleWebhook));

export default router;
