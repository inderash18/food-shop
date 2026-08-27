import { Types, HydratedDocument } from 'mongoose';
import { Payment, Order, IPayment, IOrder, PaymentTransaction, PaymentWebhookEvent } from '../models';
import { PAYMENT_STATUS, PaymentStatus } from '../constants';
import { AppError, NotFoundError, PaymentError, ConflictError, PaymentProviderNotConfiguredError } from '../utils/errors';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { recordAudit } from './audit.service';
import { confirmOrder, failOrder } from './order.service';
import { isAmountEqual, toPaise, toRupees } from '../utils/money';

export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
}

export interface PaymentIntent {
  paymentId: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  requiresVerification: boolean;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  providerPaymentId: string;
  event: string;
  amount: number;
  currency?: string;
  signature?: string;
  rawBody: string;
  headers: Record<string, string>;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput, idempotencyKey: string): Promise<{
    providerPaymentId: string;
    clientSecret?: string;
    metadata?: Record<string, unknown>;
  }>;
  verifyPayment(providerPaymentId: string): Promise<{ status: PaymentStatus; verified: boolean; amount?: number; currency?: string; merchantAccountId?: string; transactionId?: string; }>;
  parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload>;
  refundPayment(providerPaymentId: string): Promise<void>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>;
}

class PaymentGatewayService {
  private providers = new Map<string, PaymentProvider>();

  register(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new PaymentProviderNotConfiguredError(
        `Payment provider '${name}' is not configured. Please configure payment credentials.`
      );
    }
    return provider;
  }

  async findPaymentForUser(identifier: string, userId?: string): Promise<HydratedDocument<IPayment> | null> {
    const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
    const query: any = {
      $or: [
        ...(isObjectId ? [{ _id: new Types.ObjectId(identifier) }, { orderId: new Types.ObjectId(identifier) }] : []),
        { providerPaymentId: identifier },
        { idempotencyKey: identifier },
      ],
    };
    if (userId) {
      query.userId = /^[a-f\d]{24}$/i.test(userId) ? new Types.ObjectId(userId) : userId;
    }
    return Payment.findOne(query).sort({ createdAt: -1 });
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    // Verify order exists and validate authoritative amount directly from DB
    const order = await Order.findById(input.orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!isAmountEqual(input.amount, order.total)) {
      logger.error('Payment creation rejected: Amount mismatch with order total', {
        inputAmount: input.amount,
        orderTotal: order.total,
        orderId: input.orderId,
      });
      throw new AppError(400, 'AMOUNT_MISMATCH', `Payment amount (₹${input.amount}) does not match order total (₹${order.total})`);
    }

    const provider = this.getProvider(env.paymentProvider);

    const existingPayment = await Payment.findOne({ orderId: input.orderId }).sort({ createdAt: -1 });
    if (existingPayment) {
      return this.toIntent(existingPayment);
    }

    const idempotencyKey = `pay_${input.orderId}_${Date.now()}`;
    const created = await provider.createPayment(input, idempotencyKey);

    const payment = await Payment.create({
      orderId: input.orderId,
      userId: input.userId,
      provider: provider.name,
      providerPaymentId: created.providerPaymentId,
      amount: order.total, // Authoritative order total
      currency: input.currency || 'INR',
      status: PAYMENT_STATUS.PENDING,
      verificationStatus: 'NOT_VERIFIED',
      idempotencyKey,
      metadata: {
        ...(created.metadata ?? {}),
        orderNumber: order.orderNumber,
        expectedAmount: order.total,
      },
    });

    logger.info(`Payment created: ${String(payment._id)}`, { paymentId: String(payment._id), orderId: input.orderId, provider: provider.name });
    return this.toIntent(payment, created.clientSecret);
  }

  async verifyPayment(paymentIdOrIdentifier: string, studentId: string): Promise<{ payment: IPayment; order: IOrder }> {
    logger.info(`Payment verification started: ${paymentIdOrIdentifier}`);

    const payment = await this.findPaymentForUser(paymentIdOrIdentifier, studentId);
    if (!payment) throw new NotFoundError('Payment not found');
    if (String(payment.userId) !== studentId) throw new AppError(403, 'FORBIDDEN', 'Payment does not belong to you');

    if (payment.status === PAYMENT_STATUS.SUCCESS && payment.verificationStatus === 'VERIFIED') {
      const order = await Order.findById(payment.orderId);
      if (!order) throw new NotFoundError('Order not found');
      logger.info(`Gateway status: SUCCESS (already verified)`, { paymentId: String(payment._id), orderId: String(order._id) });
      return { payment, order };
    }

    const order = await Order.findById(payment.orderId);
    if (!order) throw new NotFoundError('Order not found');

    const provider = this.getProvider(payment.provider);
    
    payment.verificationStatus = 'VERIFYING';
    await payment.save();

    let result;
    try {
      result = await provider.verifyPayment(payment.providerPaymentId);
      logger.info(`Gateway status: ${result.status}`, { paymentId: String(payment._id), gatewayStatus: result.status });
    } catch (error) {
      payment.verificationStatus = 'NOT_VERIFIED';
      await payment.save();
      logger.error('Gateway verification request error', { paymentId: String(payment._id), error: (error as Error).message });
      throw error;
    }

    if (result.status === PAYMENT_STATUS.SUCCESS) {
      // 1. Verify transaction ID uniqueness
      if (result.transactionId) {
        const existingTx = await PaymentTransaction.findOne({ provider: provider.name, transactionId: result.transactionId });
        if (existingTx && String(existingTx.paymentId) !== String(payment._id)) {
          payment.status = PAYMENT_STATUS.FAILED;
          payment.verificationStatus = 'REJECTED';
          payment.failureReason = 'DUPLICATE_TRANSACTION';
          await payment.save();
          logger.warn(`Payment failed: ${String(payment._id)} - Duplicate transaction ID`);
          throw new PaymentError('Transaction has already been processed', 'INVALID_PAYMENT');
        }
      }

      // 2. Strict Amount Verification against Order Total in DB
      if (result.amount !== undefined && !isAmountEqual(result.amount, order.total)) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.verificationStatus = 'REJECTED';
        payment.failureReason = 'AMOUNT_MISMATCH';
        payment.metadata = {
          ...payment.metadata,
          expectedAmount: order.total,
          gatewayAmount: result.amount,
        };
        await payment.save();

        await failOrder(String(payment.orderId));

        logger.warn(`Payment failed: ${String(payment._id)} - Amount mismatch: expected ₹${order.total}, got ₹${result.amount}`);
        throw new PaymentError(`Amount mismatch: expected ₹${order.total}, got ₹${result.amount}`, 'AMOUNT_MISMATCH');
      }

      // 3. Verify Currency
      if (result.currency && result.currency !== payment.currency) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.verificationStatus = 'REJECTED';
        payment.failureReason = 'CURRENCY_MISMATCH';
        await payment.save();

        await failOrder(String(payment.orderId));

        logger.warn(`Payment failed: ${String(payment._id)} - Currency mismatch: expected ${payment.currency}, got ${result.currency}`);
        throw new PaymentError('Currency mismatch', 'INVALID_PAYMENT');
      }

      // 4. Verify Merchant (if returned)
      if (result.merchantAccountId && payment.merchantAccountId && result.merchantAccountId !== payment.merchantAccountId) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.verificationStatus = 'REJECTED';
        payment.failureReason = 'MERCHANT_MISMATCH';
        await payment.save();
        
        await recordAudit({
          actorId: studentId,
          action: 'PAYMENT_FAILED',
          resource: 'payment',
          resourceId: String(payment._id),
          metadata: { expected: payment.merchantAccountId, actual: result.merchantAccountId, reason: 'MERCHANT_MISMATCH' },
        });
        
        logger.warn(`Payment failed: ${String(payment._id)} - Merchant account mismatch`);
        throw new PaymentError('Merchant account mismatch', 'INVALID_PAYMENT');
      }

      // Save Transaction Record
      if (result.transactionId) {
        const existingTx = await PaymentTransaction.findOne({ provider: provider.name, transactionId: result.transactionId });
        if (!existingTx) {
          await PaymentTransaction.create({
            paymentId: payment._id,
            orderId: order._id,
            provider: provider.name,
            transactionId: result.transactionId,
            amount: result.amount ?? payment.amount,
            currency: result.currency ?? payment.currency,
            merchantAccountId: result.merchantAccountId ?? payment.merchantAccountId ?? 'unknown',
            status: PAYMENT_STATUS.SUCCESS,
            verifiedAt: new Date(),
          });
        }
        payment.providerTransactionId = result.transactionId;
      }

      // Confirm Order atomically & idempotently
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, verificationStatus: { $ne: 'VERIFIED' } },
        {
          $set: {
            status: PAYMENT_STATUS.SUCCESS,
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
            providerTransactionId: result.transactionId || payment.providerTransactionId,
          }
        },
        { new: true }
      );

      if (!updatedPayment) {
        // Another process already verified it
        const alreadyVerified = await Payment.findById(payment._id);
        const confirmedOrder = await confirmOrder(String(payment.orderId));
        logger.info(`Order confirmed: ${String(order._id)}`);
        return { payment: alreadyVerified!, order: confirmedOrder };
      }

      const confirmedOrder = await confirmOrder(String(payment.orderId));
      logger.info(`Order confirmed: ${String(order._id)}`);
      return { payment: updatedPayment, order: confirmedOrder };
    }

    if (result.status === PAYMENT_STATUS.FAILED) {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: PAYMENT_STATUS.FAILED, verificationStatus: 'REJECTED' } }
      );
      await failOrder(String(payment.orderId));
      logger.warn(`Payment failed: ${String(payment._id)}`);
      payment.status = PAYMENT_STATUS.FAILED;
      payment.verificationStatus = 'REJECTED';
      const updatedOrder = await Order.findById(payment.orderId);
      return { payment, order: updatedOrder || order };
    }

    // Still pending / processing
    await Payment.updateOne({ _id: payment._id }, { $set: { verificationStatus: 'NOT_VERIFIED' } });
    payment.verificationStatus = 'NOT_VERIFIED';
    return { payment, order };
  }

  /**
   * Handle a webhook from a payment gateway. Verifies signature, is idempotent.
   */
  async handleWebhook(providerName: string, rawBody: string, headers: Record<string, string>): Promise<{ handled: boolean; paymentId?: string }> {
    const provider = this.getProvider(providerName);
    const payload = await provider.parseWebhook(rawBody, headers);

    // Idempotency Check
    const existingEvent = await PaymentWebhookEvent.findOne({ provider: providerName, eventId: payload.event });
    if (existingEvent) {
      logger.info('Duplicate webhook event ignored', { eventId: payload.event });
      return { handled: true, paymentId: existingEvent.transactionId };
    }

    const eventRecord = await PaymentWebhookEvent.create({
      eventId: payload.event,
      provider: providerName,
      eventType: payload.event,
      transactionId: payload.providerPaymentId,
      rawPayload: rawBody,
    });

    const payment = await Payment.findOne({ providerPaymentId: payload.providerPaymentId });
    if (!payment) {
      logger.warn('Webhook for unknown payment ignored', { providerPaymentId: payload.providerPaymentId });
      return { handled: false };
    }

    // Rather than confirming it straight away, we trigger verifyPayment to run the full strict verification
    // But since verifyPayment requires the studentId to log the mismatch (or we pass it a system identifier),
    // we can just call it with a 'system' actor or bypass the user check.
    // Let's abstract the core of verifyPayment into a private method or just call it:
    try {
      if (payload.event === 'payment.captured' || payload.event === 'payment.success') {
        const { payment: verifiedPayment } = await this.verifyPayment(String(payment._id), String(payment.userId));
        eventRecord.processed = true;
        eventRecord.processedAt = new Date();
        await eventRecord.save();
        return { handled: true, paymentId: String(verifiedPayment._id) };
      }

      if (payload.event === 'payment.failed') {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.verificationStatus = 'REJECTED';
        await payment.save();
        await failOrder(String(payment.orderId));
        eventRecord.processed = true;
        eventRecord.processedAt = new Date();
        await eventRecord.save();
        return { handled: true, paymentId: String(payment._id) };
      }
    } catch (error) {
      logger.error('Error processing webhook verification', { error: (error as Error).message });
    }

    return { handled: false, paymentId: String(payment._id) };
  }

  async refundPayment(paymentId: string): Promise<void> {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status !== PAYMENT_STATUS.SUCCESS) return;

    const provider = this.getProvider(payment.provider);
    await provider.refundPayment(payment.providerPaymentId);
    payment.status = PAYMENT_STATUS.REFUNDED;
    await payment.save();
  }

  async getPaymentById(paymentId: string) {
    return Payment.findById(paymentId);
  }

  private toIntent(payment: {
    _id: Types.ObjectId;
    provider: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
  }, clientSecret?: string): PaymentIntent {
    return {
      paymentId: String(payment._id),
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      clientSecret,
      requiresVerification: true,
      metadata: (payment as any).metadata,
    };
  }
}

export const paymentService = new PaymentGatewayService();
export function registerProvider(provider: PaymentProvider): void {
  paymentService.register(provider);
}

export { ConflictError as PaymentConflictError };
