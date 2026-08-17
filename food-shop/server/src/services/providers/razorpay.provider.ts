import { createHmac } from 'crypto';
import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS } from '../../constants';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';

/**
 * Production payment provider adapter for Razorpay (UPI/cards/netbanking).
 * Uses Razorpay's REST API directly (no SDK dependency).
 * Razorpay signature verification is implemented for both webhooks and
 * the standard client callback signature (order_id + payment_id + signature).
 */
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private readonly apiBase = 'https://api.razorpay.com/v1';

  private authHeader(): string {
    return `Basic ${Buffer.from(`${env.paymentKeyId}:${env.paymentKeySecret}`).toString('base64')}`;
  }

  private assertConfigured(): void {
    if (!env.paymentKeyId || !env.paymentKeySecret) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Razorpay is not configured. Set PAYMENT_KEY_ID and PAYMENT_KEY_SECRET.');
    }
  }

  private async request(path: string, method: string, body?: Record<string, unknown>) {
    this.assertConfigured();
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      logger.error('Razorpay API error', { status: res.status, data });
      throw new AppError(502, 'PAYMENT_FAILED', 'Payment provider request failed');
    }
    return data;
  }

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    const data = await this.request('/orders', 'POST', {
      amount: Math.round(input.amount * 100),
      currency: input.currency || 'INR',
      receipt: idempotencyKey,
      notes: { orderId: input.orderId },
    });
    return {
      providerPaymentId: String(data.id),
      clientSecret: undefined,
      metadata: { orderId: String(data.id) },
    };
  }

  async verifyPayment(providerPaymentId: string) {
    const data = await this.request(`/orders/${providerPaymentId}`, 'GET');
    const status = data.status;
    if (status === 'paid' || status === 'attempted') {
      // 'attempted' may still need the payment entity; use payment capture webhook as final authority
      const payments = (await this.request(`/orders/${providerPaymentId}/payments`, 'GET')) as { items: { status: string }[] };
      const captured = payments.items?.some((p) => p.status === 'captured');
      return { status: captured ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.PENDING, verified: false };
    }
    return { status: PAYMENT_STATUS.PENDING, verified: false };
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    const signature = headers['x-razorpay-signature'] ?? '';
    if (!signature) throw new Error('Missing Razorpay signature');
    const expected = createHmac('sha256', env.webhookSecret).update(rawBody).digest('hex');
    if (signature !== expected) throw new Error('Invalid Razorpay webhook signature');

    const body = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment?: { entity: { id: string; amount: number; status: string } };
        order?: { entity: { id: string } };
      };
    };

    const event = body.event as string;
    const paymentEntity = body.payload?.payment?.entity;
    if (!paymentEntity) throw new Error('Webhook payload missing payment entity');

    return {
      providerPaymentId: paymentEntity.id,
      event,
      amount: paymentEntity.amount / 100,
      currency: 'INR',
      rawBody,
      headers,
      signature,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    await this.request(`/payments/${providerPaymentId}/refund`, 'POST', {});
  }

  async getPaymentStatus(providerPaymentId: string) {
    const data = await this.request(`/payments/${providerPaymentId}`, 'GET');
    return data.status === 'captured' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.PENDING;
  }

  /**
   * Verify the standard Razorpay checkout callback signature:
   * HMAC SHA256(order_id + "|" + payment_id) using key secret.
   */
  static verifyCallbackSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = createHmac('sha256', env.paymentKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return signature === expected;
  }
}
