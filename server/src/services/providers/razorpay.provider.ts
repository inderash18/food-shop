import crypto from 'crypto';
import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS, PaymentStatus } from '../../constants';
import { AppError, PaymentProviderNotConfiguredError, PaymentError } from '../../utils/errors';
import { razorpayConfig } from '../../config/razorpay';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { toPaise, toRupees } from '../../utils/money';

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';

  private assertConfigured(): void {
    if (!razorpayConfig.isConfigured) {
      throw new PaymentProviderNotConfiguredError(
        'Online payment is currently unavailable. Razorpay payment credentials are not configured.'
      );
    }
  }

  /**
   * Generates and verifies HMAC-SHA256 signature for Razorpay payment.
   * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
   */
  static verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const keySecret = razorpayConfig.keySecret;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    } catch {
      return expectedSignature === signature;
    }
  }

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    this.assertConfigured();

    const orderId = input.orderId;
    // Authoritative amount in paise (minimum 100 paise)
    const amountInPaise = toPaise(input.amount);

    if (amountInPaise < 100) {
      throw new AppError(400, 'BAD_REQUEST', 'Order amount must be at least 100 paise (₹1.00)');
    }

    const receipt = `rcpt_${orderId.slice(-10)}_${Date.now()}`.slice(0, 40);

    try {
      logger.info('PAYMENT_CREATE_STARTED', { orderId, amount: input.amount, provider: 'razorpay' });

      const razorpay = razorpayConfig.getInstance();
      const options = {
        amount: amountInPaise,
        currency: input.currency || 'INR',
        receipt,
        notes: {
          orderId: String(orderId),
          userId: String(input.userId),
        },
      };

      const razorpayOrder = await razorpay.orders.create(options);

      logger.info('RAZORPAY_ORDER_CREATED', {
        orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
      });

      return {
        providerPaymentId: razorpayOrder.id,
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          keyId: razorpayConfig.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
      };
    } catch (error: any) {
      logger.error('RAZORPAY_CREATE_ORDER_FAILED', { error: error?.message, orderId });
      if (error?.statusCode === 401 || error?.error?.code === 'BAD_REQUEST_ERROR' && error?.error?.description?.includes('auth')) {
        throw new AppError(401, 'UNAUTHORIZED', 'Razorpay authentication failed. Invalid API credentials.');
      }
      throw new AppError(500, 'PAYMENT_FAILED', error?.error?.description || error?.message || 'Failed to create Razorpay order');
    }
  }

  async verifyPayment(
    providerPaymentId: string
  ): Promise<{
    status: PaymentStatus;
    verified: boolean;
    amount?: number;
    currency?: string;
    merchantAccountId?: string;
    transactionId?: string;
  }> {
    this.assertConfigured();

    try {
      logger.info('PAYMENT_VERIFY_STARTED', { providerPaymentId, provider: 'razorpay' });

      const razorpay = razorpayConfig.getInstance();
      
      // If providerPaymentId starts with 'order_', fetch order or payments associated with the order
      if (providerPaymentId.startsWith('order_')) {
        const paymentsResponse: any = await razorpay.orders.fetchPayments(providerPaymentId);
        const payments = paymentsResponse?.items || [];
        const successfulPayment = payments.find((p: any) => p.status === 'captured' || p.status === 'authorized');

        if (successfulPayment) {
          return {
            status: PAYMENT_STATUS.SUCCESS,
            verified: true,
            amount: toRupees(successfulPayment.amount),
            currency: successfulPayment.currency,
            merchantAccountId: razorpayConfig.keyId,
            transactionId: successfulPayment.id,
          };
        }

        const failedPayment = payments.find((p: any) => p.status === 'failed');
        if (failedPayment) {
          return {
            status: PAYMENT_STATUS.FAILED,
            verified: true,
            amount: toRupees(failedPayment.amount),
            currency: failedPayment.currency,
            merchantAccountId: razorpayConfig.keyId,
            transactionId: failedPayment.id,
          };
        }

        const orderDetails: any = await razorpay.orders.fetch(providerPaymentId);
        if (orderDetails.status === 'paid') {
          return {
            status: PAYMENT_STATUS.SUCCESS,
            verified: true,
            amount: toRupees(orderDetails.amount),
            currency: orderDetails.currency,
            merchantAccountId: razorpayConfig.keyId,
            transactionId: providerPaymentId,
          };
        }

        return {
          status: PAYMENT_STATUS.PENDING,
          verified: false,
          amount: toRupees(orderDetails.amount),
          currency: orderDetails.currency,
        };
      }

      // If providerPaymentId is a payment_id (pay_...)
      const payment: any = await razorpay.payments.fetch(providerPaymentId);
      let status: PaymentStatus = PAYMENT_STATUS.PENDING;

      if (payment.status === 'captured' || payment.status === 'authorized') {
        status = PAYMENT_STATUS.SUCCESS;
      } else if (payment.status === 'failed') {
        status = PAYMENT_STATUS.FAILED;
      }

      return {
        status,
        verified: status === PAYMENT_STATUS.SUCCESS,
        amount: payment.amount / 100,
        currency: payment.currency,
        merchantAccountId: razorpayConfig.keyId,
        transactionId: payment.id,
      };
    } catch (error: any) {
      logger.error('RAZORPAY_VERIFY_FAILED', { providerPaymentId, error: error?.message });
      throw new AppError(500, 'PAYMENT_FAILED', error?.error?.description || error?.message || 'Failed to verify transaction with Razorpay');
    }
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    this.assertConfigured();

    const signature = headers['x-razorpay-signature'];
    if (!signature) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing X-Razorpay-Signature header');
    }

    const secret = env.webhookSecret || razorpayConfig.keySecret;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid Razorpay webhook signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid JSON webhook payload');
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const providerPaymentId = orderEntity?.id || paymentEntity?.order_id || paymentEntity?.id;
    const amount = (paymentEntity?.amount || orderEntity?.amount || 0) / 100;
    const currency = paymentEntity?.currency || orderEntity?.currency || 'INR';

    return {
      providerPaymentId,
      event,
      amount,
      currency,
      signature,
      rawBody,
      headers,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    this.assertConfigured();

    try {
      const razorpay = razorpayConfig.getInstance();
      await razorpay.payments.refund(providerPaymentId, {});
    } catch (error: any) {
      logger.error('RAZORPAY_REFUND_FAILED', { providerPaymentId, error: error?.message });
      throw new AppError(500, 'INTERNAL_ERROR', error?.error?.description || error?.message || 'Failed to process Razorpay refund');
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const res = await this.verifyPayment(providerPaymentId);
    return res.status;
  }
}
