import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS, PaymentStatus } from '../../constants';
import { AppError, PaymentProviderNotConfiguredError } from '../../utils/errors';
import { env } from '../../config/env';
import { loadSettings } from '../order.service';

/**
 * Merchant UPI Payment Provider Abstraction.
 * This provider expects to connect to a real Bank or UPI Gateway API.
 */
export class MerchantUPIProvider implements PaymentProvider {
  readonly name = 'merchant-upi';

  private assertConfigured(): void {
    const isConfigured = Boolean(env.paymentKeyId && env.paymentKeySecret);

    if (!isConfigured) {
      throw new PaymentProviderNotConfiguredError(
        'Online payment is currently unavailable. Bank UPI Gateway credentials are not configured.'
      );
    }
  }

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    const settings = await loadSettings();
    if (!settings.merchantUpiId) {
      throw new PaymentProviderNotConfiguredError(
        'Online payment is currently unavailable. Shop does not have a verified Merchant UPI ID.'
      );
    }

    const upiIntentUri = `upi://pay?pa=${settings.merchantUpiId}&pn=${encodeURIComponent(
      settings.merchantName || settings.shopName
    )}&am=${input.amount}&cu=${input.currency}&tn=${input.orderId}`;

    return {
      providerPaymentId: `upi_${input.orderId}_${Date.now()}`,
      metadata: {
        upiIntentUri,
        merchantUpiId: settings.merchantUpiId,
      },
    };
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
    throw new PaymentProviderNotConfiguredError(
      'Online payment verification is not available until payment credentials are configured.'
    );
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    this.assertConfigured();
    throw new PaymentProviderNotConfiguredError('Webhook parsing is not configured.');
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    this.assertConfigured();
    throw new PaymentProviderNotConfiguredError('Refund is not configured.');
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const verification = await this.verifyPayment(providerPaymentId);
    return verification.status;
  }
}
