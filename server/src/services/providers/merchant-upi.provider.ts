import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS, PaymentStatus } from '../../constants';
import { AppError } from '../../utils/errors';
import { env } from '../../config/env';
import { loadSettings } from '../order.service';

/**
 * Merchant UPI Payment Provider Abstraction.
 * This provider expects to connect to a real Bank or UPI Gateway API.
 */
export class MerchantUPIProvider implements PaymentProvider {
  readonly name = 'merchant-upi';

  private assertConfigured(): void {
    // TODO: Replace these with your actual provider credentials env vars
    // e.g., env.merchantApiUrl, env.merchantApiKey
    const isConfigured = false; 
    
    if (!isConfigured) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        'Merchant UPI Provider is not configured. Please provide actual Bank/UPI Gateway API credentials.'
      );
    }
  }

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    const settings = await loadSettings();
    if (!settings.merchantUpiId) {
      throw new AppError(400, 'BAD_REQUEST', 'Shop does not have a verified Merchant UPI ID.');
    }

    // In a real integration, you might call the bank API to generate a dynamic QR or intent
    // this.assertConfigured();
    // const data = await fetch('...');

    // Since UPI intents can be generated statelessly, we can construct it here
    const upiIntentUri = `upi://pay?pa=${settings.merchantUpiId}&pn=${encodeURIComponent(settings.merchantName || settings.shopName)}&am=${input.amount}&cu=${input.currency}&tn=${input.orderId}`;

    return {
      providerPaymentId: `upi_${input.orderId}_${Date.now()}`,
      metadata: {
        upiIntentUri,
        merchantUpiId: settings.merchantUpiId,
      },
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<{ status: PaymentStatus; verified: boolean; amount?: number; currency?: string; merchantAccountId?: string; transactionId?: string; }> {
    this.assertConfigured();

    // TODO: Implement actual API call to your Bank/UPI Gateway to verify the transaction
    // Example:
    // const res = await fetch(`${env.merchantApiUrl}/transactions/${providerPaymentId}`, { headers: { 'Authorization': `Bearer ${env.merchantApiKey}` } });
    // const data = await res.json();
    // return {
    //   status: data.status === 'SUCCESS' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.PENDING,
    //   verified: true,
    //   amount: data.amount,
    //   currency: data.currency,
    //   merchantAccountId: data.merchantId,
    //   transactionId: data.bankTransactionId
    // };

    throw new AppError(500, 'INTERNAL_ERROR', 'verifyPayment is not implemented for the real provider yet.');
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    this.assertConfigured();

    // TODO: Implement actual webhook signature verification and parsing according to your provider's spec
    // Example:
    // const signature = headers['x-provider-signature'];
    // verifyHmac(rawBody, signature, env.merchantWebhookSecret);
    // const data = JSON.parse(rawBody);
    // return { ... }

    throw new AppError(500, 'INTERNAL_ERROR', 'parseWebhook is not implemented for the real provider yet.');
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    this.assertConfigured();
    
    // TODO: Implement actual refund API call
    throw new AppError(500, 'INTERNAL_ERROR', 'refundPayment is not implemented for the real provider yet.');
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const verification = await this.verifyPayment(providerPaymentId);
    return verification.status;
  }
}
