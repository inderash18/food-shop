import Razorpay from 'razorpay';
import { PaymentProviderNotConfiguredError } from '../utils/errors';
import { logger } from './logger';
import { env } from './env';

export const razorpayConfig = {
  get isConfigured(): boolean {
    return Boolean(
      (process.env.RAZORPAY_KEY_ID || env.razorpayKeyId) &&
      (process.env.RAZORPAY_KEY_SECRET || env.razorpayKeySecret)
    );
  },

  get keyId(): string {
    const val = process.env.RAZORPAY_KEY_ID || env.razorpayKeyId;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'Razorpay payment service is not configured. Please configure RAZORPAY_KEY_ID credentials.'
      );
    }
    return val;
  },

  get keySecret(): string {
    const val = process.env.RAZORPAY_KEY_SECRET || env.razorpayKeySecret;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'Razorpay payment service is not configured. Please configure RAZORPAY_KEY_SECRET credentials.'
      );
    }
    return val;
  },

  getInstance(): Razorpay {
    return new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  },
};

/**
 * Validates the Razorpay configuration on backend startup.
 * Logs whether Razorpay is configured.
 */
export function validateRazorpayConfig() {
  if (process.env.PAYMENT_PROVIDER === 'razorpay' || env.paymentProvider === 'razorpay') {
    if (razorpayConfig.isConfigured) {
      logger.info(`Razorpay config validated successfully. Key ID: ${razorpayConfig.keyId.substring(0, 8)}...`);
    } else {
      logger.warn(
        'PAYMENT_PROVIDER is set to razorpay, but credentials are missing. Payment requests will return 503 PAYMENT_PROVIDER_NOT_CONFIGURED.'
      );
    }
  }
}
