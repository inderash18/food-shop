import crypto from 'crypto';
import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS, PaymentStatus } from '../../constants';
import { AppError, PaymentProviderNotConfiguredError } from '../../utils/errors';
import { phonepeConfig } from '../../config/phonepe';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { toPaise, toRupees } from '../../utils/money';

export class PhonePeProvider implements PaymentProvider {
  readonly name = 'phonepe';

  private getApiUrl(path: string): string {
    return `${phonepeConfig.apiBaseUrl}${path}`;
  }

  private assertConfigured(): void {
    if (!phonepeConfig.isConfigured) {
      throw new PaymentProviderNotConfiguredError(
        'Online payment is currently unavailable. PhonePe payment credentials are not configured.'
      );
    }
  }

  private generateChecksum(payload: string, endpoint: string): string {
    const stringToHash = payload + endpoint + phonepeConfig.saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${sha256}###${phonepeConfig.saltIndex}`;
  }

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    this.assertConfigured();

    const orderId = input.orderId;
    const amountInPaise = toPaise(input.amount);

    const payload = {
      merchantId: phonepeConfig.merchantId,
      merchantTransactionId: orderId,
      merchantUserId: String(input.userId),
      amount: amountInPaise,
      redirectUrl: `${env.clientUrl}/payment?paymentId=${orderId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${env.clientUrl}/api/payments/webhooks/phonepe`, // Using clientUrl in dev if tunneling, ideally server URL
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const endpoint = '/pg/v1/pay';
    const checksum = this.generateChecksum(base64Payload, endpoint);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      logger.info('PAYMENT_CREATE_STARTED', { orderId, amount: input.amount, provider: 'phonepe' });

      const response = await fetch(this.getApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({ request: base64Payload }),
        signal: controller.signal,
      });

      const data = (await response.json()) as any;

      if (!data.success || data.code !== 'PAYMENT_INITIATED') {
        logger.error('PAYMENT_PROVIDER_ERROR', {
          orderId,
          code: data?.code,
          message: data?.message,
        });
        throw new AppError(500, 'PAYMENT_FAILED', 'Failed to initiate payment with PhonePe');
      }

      const redirectUrl = data.data.instrumentResponse.redirectInfo.url;

      return {
        providerPaymentId: orderId,
        metadata: {
          redirectUrl,
          merchantId: phonepeConfig.merchantId,
        },
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        logger.error('PAYMENT_PROVIDER_TIMEOUT', { orderId });
        throw new AppError(504, 'INTERNAL_ERROR', 'PhonePe payment initiation timed out');
      }
      logger.error('PAYMENT_PROVIDER_ERROR', { error: error?.message });
      throw new AppError(500, 'PAYMENT_FAILED', 'Failed to connect to PhonePe');
    } finally {
      clearTimeout(timeout);
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

    const endpoint = `/pg/v1/status/${phonepeConfig.merchantId}/${providerPaymentId}`;
    const checksum = this.generateChecksum('', endpoint);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      logger.info('PAYMENT_VERIFY_STARTED', { providerPaymentId, provider: 'phonepe' });

      const response = await fetch(this.getApiUrl(endpoint), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': phonepeConfig.merchantId,
        },
        signal: controller.signal,
      });

      const data = (await response.json()) as any;

      if (!data.success && data.code !== 'PAYMENT_ERROR' && data.code !== 'PAYMENT_DECLINED' && data.code !== 'PAYMENT_PENDING') {
         throw new AppError(500, 'INTERNAL_ERROR', data.message || 'Invalid response from PhonePe');
      }

      let status: PaymentStatus = PAYMENT_STATUS.PENDING;
      if (data.code === 'PAYMENT_SUCCESS') {
        status = PAYMENT_STATUS.SUCCESS;
      } else if (
        data.code === 'PAYMENT_ERROR' ||
        data.code === 'PAYMENT_DECLINED' ||
        data.code === 'PAYMENT_CANCELLED' ||
        data.code === 'TIMED_OUT' ||
        data.code === 'TRANSACTION_NOT_FOUND' ||
        data.code === 'AUTHORIZATION_FAILED'
      ) {
        status = PAYMENT_STATUS.FAILED;
      }

      const amountInPaise = data.data?.amount;
      const amount = amountInPaise ? amountInPaise / 100 : undefined;

      return {
        status,
        verified: true,
        amount,
        currency: 'INR', // PhonePe only supports INR
        merchantAccountId: phonepeConfig.merchantId,
        transactionId: data.data?.transactionId,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        logger.error('PAYMENT_VERIFY_TIMEOUT', { providerPaymentId });
        throw new AppError(504, 'INTERNAL_ERROR', 'PhonePe verification timed out');
      }
      logger.error('PAYMENT_VERIFY_FAILED', { error: error?.message });
      throw new AppError(500, 'PAYMENT_FAILED', 'Failed to verify transaction with PhonePe');
    } finally {
      clearTimeout(timeout);
    }
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    this.assertConfigured();

    let bodyObj: any;
    try {
      bodyObj = JSON.parse(rawBody);
    } catch {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid JSON body');
    }

    const base64Payload = bodyObj.response;
    if (!base64Payload) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing response payload');
    }

    const receivedChecksum = headers['x-verify'];
    if (!receivedChecksum) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing X-VERIFY header');
    }

    const expectedChecksum = this.generateChecksum(base64Payload, '');
    if (receivedChecksum !== expectedChecksum) {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid PhonePe webhook signature');
    }

    const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedPayload);

    let eventType = 'payment.unknown';
    if (payload.code === 'PAYMENT_SUCCESS') eventType = 'payment.success';
    if (payload.code === 'PAYMENT_ERROR' || payload.code === 'PAYMENT_DECLINED') eventType = 'payment.failed';

    logger.info('PAYMENT_WEBHOOK_RECEIVED', {
      orderId: payload.data.merchantTransactionId,
      status: payload.code,
    });

    return {
      providerPaymentId: payload.data.merchantTransactionId,
      event: eventType,
      amount: payload.data.amount / 100,
      currency: 'INR',
      signature: receivedChecksum,
      rawBody: rawBody,
      headers: headers,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    this.assertConfigured();
    throw new AppError(500, 'INTERNAL_ERROR', 'PhonePe refund API not implemented yet');
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const res = await this.verifyPayment(providerPaymentId);
    return res.status;
  }
}
