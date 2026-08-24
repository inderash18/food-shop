import crypto from 'crypto';
import express, { Router, Request, Response } from 'express';
import { razorpayConfig } from '../config/razorpay';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { Payment, Order, PaymentTransaction } from '../models';
import { PAYMENT_STATUS } from '../constants';
import { confirmOrder } from '../services/order.service';

const router = Router();

/**
 * STEP 1: BACKEND - Create Order
 * POST /api/create-order
 * 
 * Request body: { amount (paise), currency?, receipt?, notes? }
 * Minimum amount: 100 paise
 * Returns: { order_id, amount, currency, id, key_id }
 */
router.post(
  '/create-order',
  asyncHandler(async (req: Request, res: Response) => {
    let { amount, currency = 'INR', receipt, notes } = req.body;

    // Validate amount
    if (amount === undefined || amount === null || typeof amount !== 'number' || isNaN(amount)) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing or invalid amount. Amount in paise is required.');
    }

    const amountInPaise = Math.round(amount);

    if (amountInPaise < 100) {
      throw new AppError(400, 'BAD_REQUEST', 'Amount must be at least 100 paise (₹1.00)');
    }

    if (!razorpayConfig.isConfigured) {
      throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Razorpay credentials are not configured on server.');
    }

    try {
      const razorpay = razorpayConfig.getInstance();
      const options = {
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${Date.now().toString().slice(-8)}`,
        notes: notes || {},
      };

      const razorpayOrder = await razorpay.orders.create(options);

      logger.info('Razorpay order created successfully', {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      });

      return res.status(200).json({
        success: true,
        order_id: razorpayOrder.id,
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        key_id: razorpayConfig.keyId,
      });
    } catch (error: any) {
      logger.error('Failed to create Razorpay order', {
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
  })
);

/**
 * STEP 3: BACKEND - Verify Signature
 * POST /api/verify-payment
 * 
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
router.post(
  '/verify-payment',
  asyncHandler(async (req: Request, res: Response) => {
    const order_id = req.body.razorpay_order_id || req.body.order_id;
    const payment_id = req.body.razorpay_payment_id || req.body.payment_id;
    const signature = req.body.razorpay_signature || req.body.signature;

    // Validate missing fields
    if (!order_id || !payment_id || !signature) {
      logger.warn('Razorpay signature verification missing fields', {
        hasOrderId: Boolean(order_id),
        hasPaymentId: Boolean(payment_id),
        hasSignature: Boolean(signature),
      });
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Missing required fields: order_id, payment_id, and signature are required.',
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
      logger.warn('Razorpay signature verification failed (mismatch)', {
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

    logger.info('Razorpay payment signature verified successfully', {
      order_id,
      payment_id,
    });

    // If there is an associated internal Payment record in DB, update it and confirm order
    try {
      const payment = await Payment.findOne({
        $or: [{ providerPaymentId: order_id }, { providerPaymentId: payment_id }],
      });

      if (payment) {
        // Save transaction
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

        payment.status = PAYMENT_STATUS.SUCCESS;
        payment.verificationStatus = 'VERIFIED';
        payment.providerTransactionId = payment_id;
        payment.verifiedAt = new Date();
        await payment.save();

        if (payment.orderId) {
          await confirmOrder(String(payment.orderId));
        }
      }
    } catch (dbErr: any) {
      logger.error('Error updating order/payment record on verification', {
        error: dbErr?.message,
      });
      // Verification itself still succeeded
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order_id,
      payment_id,
    });
  })
);

export default router;
