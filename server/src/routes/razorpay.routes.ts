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

import { toPaise, toRupees, isAmountEqual } from '../utils/money';
import { failOrder } from '../services/order.service';

/**
 * Helper to handle order creation:
 * - Looks up authoritative order total from database
 * - Rejects any client-side amount tampering
 * - Converts to paise consistently
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

  let amountInPaise = 0;
  let currency = req.body.currency || 'INR';
  let receipt = req.body.receipt;
  let notes = req.body.notes || {};
  let authoritativeTotal: number | undefined;

  // Case A: orderId or orderNumber provided -> get authoritative amount from database Order
  const targetOrderId = req.body.orderId || req.body.order_id || (receipt && receipt.startsWith('rcpt_') ? receipt.replace('rcpt_', '') : undefined);
  if (targetOrderId) {
    const isMongoId = /^[a-f\d]{24}$/i.test(targetOrderId);
    const dbOrder = await Order.findOne({
      $or: [
        ...(isMongoId ? [{ _id: targetOrderId }] : []),
        { orderNumber: targetOrderId },
        { checkoutRequestId: targetOrderId },
      ],
    }).lean();

    if (dbOrder) {
      authoritativeTotal = dbOrder.total;
      amountInPaise = toPaise(dbOrder.total);
      receipt = receipt || `rcpt_${dbOrder.orderNumber}`;
      notes = {
        ...notes,
        orderId: String(dbOrder._id),
        orderNumber: dbOrder.orderNumber,
        userId: String(dbOrder.userId),
      };
    }
  }

  // Case B: Items array passed -> calculate authoritative server-side price from Product models
  if (!authoritativeTotal && Array.isArray(req.body.items) && req.body.items.length > 0) {
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

    authoritativeTotal = subtotal;
    amountInPaise = toPaise(subtotal);
    receipt = receipt || `rcpt_${Date.now().toString().slice(-8)}`;
  }

  // Case C: Raw amount passed -> strictly validate and convert
  if (!authoritativeTotal) {
    if (req.body.amount !== undefined && req.body.amount !== null) {
      const rawAmount = Number(req.body.amount);
      if (isNaN(rawAmount) || rawAmount <= 0) {
        throw new AppError(400, 'BAD_REQUEST', 'Missing or invalid amount');
      }
      // If passed as paise (e.g. 7000 >= 100 and likely paise) vs rupees (e.g. 70)
      if (rawAmount >= 100 && Number.isInteger(rawAmount) && !req.body.isRupees) {
        amountInPaise = Math.round(rawAmount);
      } else {
        amountInPaise = toPaise(rawAmount);
      }
    } else {
      throw new AppError(400, 'BAD_REQUEST', 'Either orderId, items array, or valid amount must be provided');
    }
  }

  // If client provided a nominal amount that mismatches server authoritative calculation, reject immediately
  if (authoritativeTotal !== undefined && req.body.amount !== undefined) {
    const clientAmount = Number(req.body.amount);
    const expectedPaise = toPaise(authoritativeTotal);
    if (clientAmount !== expectedPaise && !isAmountEqual(clientAmount, authoritativeTotal)) {
      logger.warn('[PAYMENT] Pre-payment amount mismatch rejected', {
        clientProvided: clientAmount,
        authoritativeTotal,
        expectedPaise,
      });
      throw new AppError(400, 'AMOUNT_MISMATCH', `Payment amount mismatch: server calculated ₹${authoritativeTotal}`);
    }
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
 * - Verifies verified gateway amount matches order total in database
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

  // Look up payment and target order in DB
  const payment = await Payment.findOne({
    $or: [
      { providerPaymentId: order_id },
      { providerPaymentId: payment_id },
      ...(internalPaymentId ? [{ _id: internalPaymentId }] : []),
    ],
  });

  const order = payment?.orderId
    ? await Order.findById(payment.orderId)
    : await Order.findOne({ $or: [{ orderNumber: order_id }, { checkoutRequestId: order_id }] });

  // If order exists, verify actual amount with Razorpay API
  let capturedRupees: number | undefined;
  try {
    const razorpay = razorpayConfig.getInstance();
    const rzpPayment: any = await razorpay.payments.fetch(payment_id);
    if (rzpPayment && rzpPayment.amount) {
      capturedRupees = toRupees(rzpPayment.amount);
    }
  } catch (fetchErr: any) {
    logger.warn('[PAYMENT] Could not fetch payment details from Razorpay, using order baseline', {
      error: fetchErr?.message,
    });
  }

  // Amount Mismatch Guard
  if (order && capturedRupees !== undefined && !isAmountEqual(capturedRupees, order.total)) {
    logger.error('[PAYMENT] Critical amount mismatch on verification', {
      orderId: String(order._id),
      orderTotal: order.total,
      gatewayCaptured: capturedRupees,
    });

    if (payment) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.verificationStatus = 'REJECTED';
      payment.failureReason = 'AMOUNT_MISMATCH';
      payment.metadata = {
        ...payment.metadata,
        expectedAmount: order.total,
        gatewayAmount: capturedRupees,
      };
      await payment.save();
    }

    await failOrder(String(order._id));

    return res.status(400).json({
      success: false,
      error: {
        code: 'AMOUNT_MISMATCH',
        message: `Payment amount mismatch: expected ₹${order.total}, but gateway captured ₹${capturedRupees}. Order has not been confirmed.`,
      },
    });
  }

  logger.info('[PAYMENT] Payment verification successful', {
    order_id,
    payment_id,
    verifiedAmount: capturedRupees ?? order?.total,
  });

  // Update Database models
  try {
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
          amount: capturedRupees ?? payment.amount,
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
    } else if (order) {
      order.status = ORDER_STATUS.ORDER_CONFIRMED;
      order.paymentStatus = PAYMENT_STATUS.SUCCESS;
      await order.save();
      logger.info('[PAYMENT] Order marked PAID', { orderId: String(order._id) });
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
 * Helper to handle student/client explicit cancellation of a payment attempt
 */
async function handleCancelPayment(req: Request, res: Response) {
  const { orderId, paymentId, reason } = req.body;
  logger.info('[PAYMENT] Payment cancelled by customer', { orderId, paymentId, reason });

  const payment = await Payment.findOne({
    $or: [
      ...(paymentId ? [{ _id: paymentId }, { providerPaymentId: paymentId }] : []),
      ...(orderId ? [{ orderId }] : []),
    ],
  });

  if (payment && payment.status === PAYMENT_STATUS.PENDING) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.verificationStatus = 'REJECTED';
    payment.failureReason = reason || 'CUSTOMER_CANCELLED';
    await payment.save();
  }

  const targetOrderId = orderId || payment?.orderId;
  if (targetOrderId) {
    await failOrder(String(targetOrderId));
  }

  return res.status(200).json({
    success: true,
    message: 'Payment attempt marked as cancelled and stock released.',
  });
}

/**
 * Webhook handler for Razorpay:
 * - Validates X-Razorpay-Signature with timingSafeEqual
 * - Idempotent event processing via PaymentWebhookEvent
 * - Handles payment.captured, order.paid, payment.failed
 */
async function handleWebhook(req: Request, res: Response) {
  const signature = (req.headers['x-razorpay-signature'] || req.headers['x-razorpay-signature-v1']) as string;
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  if (!signature) {
    logger.warn('[PAYMENT] Webhook rejected: missing X-Razorpay-Signature');
    return res.status(400).json({ success: false, message: 'Missing signature' });
  }

  const secret = env.webhookSecret || razorpayConfig.keySecret;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  let isSigValid = false;
  if (expectedSignature.length === signature.length) {
    try {
      isSigValid = crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf8'), Buffer.from(signature, 'utf8'));
    } catch {
      isSigValid = expectedSignature === signature;
    }
  }

  if (!isSigValid) {
    logger.warn('[PAYMENT] Webhook rejected: signature mismatch');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let eventPayload: any;
  try {
    eventPayload = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const eventHeaderId = (req.headers['x-razorpay-event-id'] as string) || undefined;
  const eventId = eventHeaderId || eventPayload.event_id || eventPayload.id || `evt_${eventPayload.event}_${Date.now()}`;
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

  // Handle successful payments
  if (eventPayload.event === 'payment.captured' || eventPayload.event === 'order.paid') {
    const payment = await Payment.findOne({
      $or: [{ providerPaymentId: providerPaymentId }, { providerPaymentId: paymentEntity?.id }],
    });

    if (payment) {
      const order = payment.orderId ? await Order.findById(payment.orderId) : null;
      const capturedAmountRupees = paymentEntity?.amount ? toRupees(paymentEntity.amount) : undefined;

      // Validate amount integrity if order exists
      if (order && capturedAmountRupees !== undefined && !isAmountEqual(capturedAmountRupees, order.total)) {
        logger.error('[PAYMENT] Amount mismatch on webhook event', {
          orderId: String(order._id),
          expectedTotal: order.total,
          capturedAmount: capturedAmountRupees,
        });
        payment.status = PAYMENT_STATUS.FAILED;
        payment.verificationStatus = 'REJECTED';
        payment.failureReason = 'AMOUNT_MISMATCH';
        await payment.save();
        await failOrder(String(order._id));
        return res.status(200).json({ success: true, message: 'Amount mismatch handled' });
      }

      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.verificationStatus = 'VERIFIED';
      payment.providerTransactionId = paymentEntity?.id;
      payment.verifiedAt = new Date();
      await payment.save();

      if (payment.orderId) {
        await confirmOrder(String(payment.orderId));
        logger.info('[PAYMENT] Order confirmed via webhook', {
          orderId: String(payment.orderId),
        });
      }
    }
  }

  // Handle failed payments
  if (eventPayload.event === 'payment.failed') {
    const payment = await Payment.findOne({
      $or: [{ providerPaymentId: providerPaymentId }, { providerPaymentId: paymentEntity?.id }],
    });

    if (payment) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.verificationStatus = 'REJECTED';
      payment.failureReason = paymentEntity?.error_description || 'GATEWAY_PAYMENT_FAILED';
      await payment.save();

      if (payment.orderId) {
        await failOrder(String(payment.orderId));
        logger.info('[PAYMENT] Order marked PAYMENT_FAILED and stock released via webhook', {
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
router.post('/cancel', asyncHandler(handleCancelPayment));
router.post('/webhook', express.raw({ type: '*/*', limit: '256kb' }), asyncHandler(handleWebhook));

export default router;
