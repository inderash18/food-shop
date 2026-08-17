import { PaymentProvider, CreatePaymentInput, WebhookPayload } from '../payment.service';
import { PAYMENT_STATUS } from '../../constants';
import { paytmConfig } from '../../config/paytm';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';

// @ts-ignore
import PaytmChecksum from 'paytmchecksum';

export class PaytmProvider implements PaymentProvider {
  readonly name = 'paytm';

  async createPayment(input: CreatePaymentInput, idempotencyKey: string) {
    const paytmParams: Record<string, any> = {
      body: {
        requestType: "Payment",
        mid: paytmConfig.mid,
        websiteName: paytmConfig.website,
        orderId: idempotencyKey,
        callbackUrl: `http://localhost:4000/api/payments/webhook`,
        txnAmount: {
          value: input.amount.toFixed(2),
          currency: "INR",
        },
        userInfo: {
          custId: input.userId,
        },
      }
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), paytmConfig.merchantKey);
    paytmParams.head = { signature: checksum };

    const url = `${paytmConfig.apiBaseUrl}/theia/api/v1/initiateTransaction?mid=${paytmConfig.mid}&orderId=${idempotencyKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paytmParams),
    });

    const data = await res.json() as any;
    
    if (data.body?.resultInfo?.resultStatus !== 'S') {
      logger.error('Paytm Initiate Transaction failed', { data });
      throw new AppError(502, 'PAYMENT_FAILED', 'Failed to initiate Paytm transaction');
    }

    // Construct Standard UPI Intent URI for Dynamic QR
    // Uses the idempotencyKey (Order ID) as the transaction reference (tr)
    const upiIntentUri = `upi://pay?pa=${encodeURIComponent(paytmConfig.upiId)}&pn=${encodeURIComponent(paytmConfig.merchantName)}&tr=${idempotencyKey}&am=${input.amount.toFixed(2)}&cu=INR`;

    return {
      providerPaymentId: idempotencyKey,
      clientSecret: data.body.txnToken,
      metadata: { 
        orderId: idempotencyKey,
        mid: paytmConfig.mid,
        environment: paytmConfig.environment,
        upiId: paytmConfig.upiId,
        upiIntentUri
      },
    };
  }

  async verifyPayment(providerPaymentId: string) {
    const paytmParams: Record<string, any> = {
      body: {
        mid: paytmConfig.mid,
        orderId: providerPaymentId,
      }
    };
    
    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), paytmConfig.merchantKey);
    paytmParams.head = { signature: checksum };

    const url = `${paytmConfig.apiBaseUrl}/v3/order/status`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paytmParams),
    });
    
    const data = await res.json() as any;
    
    if (data.body?.resultInfo?.resultStatus === 'TXN_SUCCESS') {
      return { status: PAYMENT_STATUS.SUCCESS, verified: true };
    }
    
    return { status: PAYMENT_STATUS.PENDING, verified: false };
  }

  async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookPayload> {
    // Note: Webhook handling depends on exactly how Paytm POSTs to the server.
    // For now, the primary verification path is `verifyPayment()` which polls the status API directly.
    return {
      providerPaymentId: '',
      event: 'payment.unknown',
      amount: 0,
      currency: 'INR',
      rawBody,
      headers,
    };
  }

  async refundPayment(providerPaymentId: string): Promise<void> {
    logger.warn('Refund not implemented for Paytm');
  }

  async getPaymentStatus(providerPaymentId: string) {
    const result = await this.verifyPayment(providerPaymentId);
    return result.status;
  }
}
