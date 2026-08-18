// @ts-ignore
import PaytmChecksum from 'paytmchecksum';
import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS, PaymentStatus } from '../../constants';
import { AppError, PaymentProviderNotConfiguredError } from '../../utils/errors';
import { paytmConfig } from '../../config/paytm';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export class PaytmProvider implements PaymentProvider {
  readonly name = 'paytm';

  private getApiUrl(path: string): string {
    return `${paytmConfig.apiBaseUrl}${path}`;
  }

  private assertConfigured(): void {
    if (!paytmConfig.isConfigured) {
      throw new PaymentProviderNotConfiguredError(
        'Online payment is currently unavailable. Paytm payment credentials are not configured.'
      );
    }
  }

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    this.assertConfigured();

    const orderId = input.orderId;
    const amount = input.amount.toFixed(2); // Paytm requires 2 decimal places

    const paytmParams = {
      body: {
        requestType: 'Payment',
        mid: paytmConfig.mid,
        websiteName: paytmConfig.website,
        orderId: orderId,
        callbackUrl: `${env.clientUrl}/api/payments/webhooks/paytm`,
        txnAmount: {
          value: amount,
          currency: input.currency,
        },
        userInfo: {
          custId: String(input.userId),
        },
      },
    };

    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      paytmConfig.merchantKey
    );
    (paytmParams as any).head = { signature };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      logger.info('PAYMENT_CREATE_STARTED', { orderId, amount, provider: 'paytm' });

      const response = await fetch(
        this.getApiUrl(`/theia/api/v1/initiateTransaction?mid=${paytmConfig.mid}&orderId=${orderId}`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paytmParams),
          signal: controller.signal,
        }
      );

      const data = (await response.json()) as any;

      if (data?.body?.resultInfo?.resultStatus !== 'S') {
        logger.error('PAYMENT_PROVIDER_ERROR', {
          orderId,
          resultCode: data?.body?.resultInfo?.resultCode,
          resultMsg: data?.body?.resultInfo?.resultMsg,
        });
        throw new AppError(500, 'PAYMENT_FAILED', 'Failed to initiate payment with Paytm');
      }

      const txnToken = data.body.txnToken;
      const upiIntentUri = `paytmmp://pay?pa=${paytmConfig.upiId}&pn=${encodeURIComponent(
        paytmConfig.merchantName
      )}&am=${amount}&cu=${input.currency}&tn=${orderId}`;

      return {
        providerPaymentId: orderId,
        metadata: {
          txnToken,
          upiIntentUri,
          merchantUpiId: paytmConfig.upiId,
          mid: paytmConfig.mid,
        },
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        logger.error('PAYMENT_PROVIDER_TIMEOUT', { orderId });
        throw new AppError(504, 'INTERNAL_ERROR', 'Paytm payment initiation timed out');
      }
      logger.error('PAYMENT_PROVIDER_ERROR', { error: error?.message });
      throw new AppError(500, 'PAYMENT_FAILED', 'Failed to connect to Paytm');
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

    const paytmParams = {
      body: {
        mid: paytmConfig.mid,
        orderId: providerPaymentId,
      },
    };

    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      paytmConfig.merchantKey
    );
    (paytmParams as any).head = { signature };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      logger.info('PAYMENT_VERIFY_STARTED', { providerPaymentId, provider: 'paytm' });

      const response = await fetch(this.getApiUrl('/v3/order/status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paytmParams),
        signal: controller.signal,
      });

      const data = (await response.json()) as any;
      const body = data?.body;

      if (!body) throw new AppError(500, 'INTERNAL_ERROR', 'Invalid response from Paytm');

      let status: PaymentStatus = PAYMENT_STATUS.PENDING;
      if (body.resultInfo?.resultStatus === 'TXN_SUCCESS') {
        status = PAYMENT_STATUS.SUCCESS;
      } else if (body.resultInfo?.resultStatus === 'TXN_FAILURE') {
        status = PAYMENT_STATUS.FAILED;
      }

      return {
        status,
        verified: true,
        amount: body.txnAmount ? parseFloat(body.txnAmount) : undefined,
        currency: 'INR',
        merchantAccountId: body.mid,
        transactionId: body.txnId,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        logger.error('PAYMENT_VERIFY_TIMEOUT', { providerPaymentId });
        throw new AppError(504, 'INTERNAL_ERROR', 'Paytm verification timed out');
      }
      logger.error('PAYMENT_VERIFY_FAILED', { error: error?.message });
      throw new AppError(500, 'PAYMENT_FAILED', 'Failed to verify transaction with Paytm');
    } finally {
      clearTimeout(timeout);
    }
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    this.assertConfigured();

    const params = new URLSearchParams(rawBody);
    const bodyObj: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      bodyObj[key] = value;
    }

    const checksum = bodyObj.CHECKSUMHASH;
    if (!checksum) {
      throw new AppError(400, 'BAD_REQUEST', 'Missing CHECKSUMHASH');
    }

    delete bodyObj.CHECKSUMHASH;

    const isValid = PaytmChecksum.verifySignature(bodyObj, paytmConfig.merchantKey, checksum);
    if (!isValid) {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid Paytm webhook signature');
    }

    let eventType = 'payment.unknown';
    if (bodyObj.STATUS === 'TXN_SUCCESS') eventType = 'payment.success';
    if (bodyObj.STATUS === 'TXN_FAILURE') eventType = 'payment.failed';

    logger.info('PAYMENT_WEBHOOK_RECEIVED', {
      orderId: bodyObj.ORDERID,
      status: bodyObj.STATUS,
    });

    return {
      providerPaymentId: bodyObj.ORDERID,
      event: eventType,
      amount: parseFloat(bodyObj.TXNAMOUNT),
      currency: bodyObj.CURRENCY,
      signature: checksum,
      rawBody: rawBody,
      headers: headers,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    this.assertConfigured();
    throw new AppError(500, 'INTERNAL_ERROR', 'Paytm refund API not fully implemented yet');
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const res = await this.verifyPayment(providerPaymentId);
    return res.status;
  }
}
