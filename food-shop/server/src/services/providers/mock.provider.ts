import { createHmac } from 'crypto';
import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS } from '../../constants';
import { env } from '../../config/env';
import { signPayload, safeEqual } from '../../utils/crypto';
import { logger } from '../../config/logger';

/**
 * In-memory mock payment registry, keyed by providerPaymentId.
 * Single-instance only; swap for Redis if scaling mock provider across instances.
 */
const registry = new Map<string, { status: 'pending' | 'captured' | 'failed'; amount: number }>();

const pad = (n: number) => String(n).padStart(6, '0');

/**
 * Development payment provider. Simulates a real gateway:
 * - createPayment issues a mock providerPaymentId + clientSecret
 * - a signed "simulation" can be triggered to emulate the gateway webhook
 * - verifyPayment reflects the registry state
 * No real money moves. Do NOT use in production.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private counter = 0;

  async createPayment(input: CreatePaymentInput, _idempotencyKey: string) {
    this.counter += 1;
    const providerPaymentId = `mockpay_${new Date().getTime()}_${pad(this.counter)}`;
    registry.set(providerPaymentId, { status: 'pending', amount: input.amount });
    return {
      providerPaymentId,
      clientSecret: signPayload(providerPaymentId, env.webhookSecret),
      metadata: { mode: 'mock' },
    };
  }

  async verifyPayment(providerPaymentId: string) {
    const entry = registry.get(providerPaymentId);
    if (!entry) return { status: PAYMENT_STATUS.PENDING, verified: false };
    if (entry.status === 'captured') return { status: PAYMENT_STATUS.SUCCESS, verified: true };
    if (entry.status === 'failed') return { status: PAYMENT_STATUS.FAILED, verified: true };
    return { status: PAYMENT_STATUS.PENDING, verified: false };
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    const signature = headers['x-mock-signature'] ?? headers['x-signature'] ?? '';
    if (!signature) throw new Error('Missing webhook signature');
    const expected = signPayload(rawBody, env.webhookSecret);
    if (!safeEqual(signature, expected)) {
      logger.warn('Mock webhook signature verification failed');
      throw new Error('Invalid webhook signature');
    }
    const body = JSON.parse(rawBody) as { event: string; providerPaymentId: string; amount: number };
    return {
      providerPaymentId: body.providerPaymentId,
      event: body.event,
      amount: body.amount,
      rawBody,
      headers,
      signature,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    const entry = registry.get(providerPaymentId);
    if (entry) entry.status = 'pending';
  }

  async getPaymentStatus(providerPaymentId: string) {
    const entry = registry.get(providerPaymentId);
    if (!entry) return PAYMENT_STATUS.PENDING;
    return entry.status === 'captured' ? PAYMENT_STATUS.SUCCESS : entry.status === 'failed' ? PAYMENT_STATUS.FAILED : PAYMENT_STATUS.PENDING;
  }

  /**
   * Simulates the gateway capturing a payment and firing its webhook.
   * Used ONLY by the dev-only simulate endpoint.
   */
  simulatePayment(providerPaymentId: string, outcome: 'success' | 'failure'): { rawBody: string; signature: string } {
    const entry = registry.get(providerPaymentId);
    if (!entry) throw new Error('Unknown payment');
    entry.status = outcome === 'success' ? 'captured' : 'failed';
    const rawBody = JSON.stringify({
      event: outcome === 'success' ? 'payment.captured' : 'payment.failed',
      providerPaymentId,
      amount: entry.amount,
    });
    return { rawBody, signature: signPayload(rawBody, env.webhookSecret) };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
