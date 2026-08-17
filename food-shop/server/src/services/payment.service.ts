import { Types } from 'mongoose';
import { Payment, Order, IPayment, IOrder } from '../models';
import { PAYMENT_STATUS, PaymentStatus } from '../constants';
import { AppError, NotFoundError, PaymentError, ConflictError } from '../utils/errors';
import { env } from '../config/env';
import { logger } from '../config/logger';

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
  verifyPayment(providerPaymentId: string): Promise<{ status: PaymentStatus; verified: boolean }>;
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
    if (!provider) throw new AppError(500, 'INTERNAL_ERROR', `Payment provider '${name}' not configured`);
    return provider;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
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
      amount: input.amount,
      currency: input.currency,
      status: PAYMENT_STATUS.PENDING,
      idempotencyKey,
      metadata: created.metadata ?? {},
    });

    logger.info('Payment created', { paymentId: String(payment._id), provider: provider.name });
    return this.toIntent(payment, created.clientSecret);
  }

  /**
   * Verify a payment with the provider. Only confirms the order when the
   * provider reports success (source of truth, not the frontend).
   */
  async verifyPayment(paymentId: string): Promise<{ payment: IPayment; order: IOrder }> {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      const order = await Order.findById(payment.orderId);
      if (!order) throw new NotFoundError('Order not found');
      return { payment, order };
    }

    const provider = this.getProvider(payment.provider);
    const result = await provider.verifyPayment(payment.providerPaymentId);

    if (result.status === PAYMENT_STATUS.SUCCESS) {
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.verifiedAt = new Date();
      await payment.save();

      const { confirmOrder } = await import('./order.service');
      const order = await confirmOrder(String(payment.orderId));
      return { payment, order };
    }

    if (result.status === PAYMENT_STATUS.PENDING) {
      const order = await Order.findById(payment.orderId);
      if (!order) throw new NotFoundError('Order not found');
      return { payment, order };
    }

    const order = await Order.findById(payment.orderId);
    throw new PaymentError(
      'Payment failed',
      'PAYMENT_FAILED'
    );
  }

  /**
   * Handle a webhook from a payment gateway. Verifies signature, is idempotent.
   */
  async handleWebhook(providerName: string, rawBody: string, headers: Record<string, string>): Promise<{ handled: boolean; paymentId?: string }> {
    const provider = this.getProvider(providerName);
    const payload = await provider.parseWebhook(rawBody, headers);

    const payment = await Payment.findOne({ providerPaymentId: payload.providerPaymentId });
    if (!payment) {
      logger.warn('Webhook for unknown payment ignored', { providerPaymentId: payload.providerPaymentId });
      return { handled: false };
    }

    if (payload.event === 'payment.captured' || payload.event === 'payment.success') {
      if (payment.status === PAYMENT_STATUS.SUCCESS) {
        return { handled: true, paymentId: String(payment._id) };
      }
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.verifiedAt = new Date();
      await payment.save();

      const { confirmOrder } = await import('./order.service');
      const order = await confirmOrder(String(payment.orderId));
      logger.info('Webhook confirmed order', { orderNumber: order.orderNumber, paymentId: String(payment._id) });
      return { handled: true, paymentId: String(payment._id) };
    }

    if (payload.event === 'payment.failed') {
      const { failOrder } = await import('./order.service');
      payment.status = PAYMENT_STATUS.FAILED;
      await payment.save();
      await failOrder(String(payment.orderId));
      return { handled: true, paymentId: String(payment._id) };
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
