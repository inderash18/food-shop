import { PaymentProviderNotConfiguredError } from '../utils/errors';
import { logger } from './logger';

export const paytmConfig = {
  get isConfigured(): boolean {
    return Boolean(process.env.PAYTM_MID && process.env.PAYTM_MERCHANT_KEY);
  },
  get mid(): string {
    const val = process.env.PAYTM_MID;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'Paytm payment service is not configured. Please configure PAYTM_MID credentials.'
      );
    }
    return val;
  },
  get merchantKey(): string {
    const val = process.env.PAYTM_MERCHANT_KEY;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'Paytm payment service is not configured. Please configure PAYTM_MERCHANT_KEY credentials.'
      );
    }
    return val;
  },
  get upiId(): string {
    return process.env.PAYTM_UPI_ID || '';
  },
  get merchantName(): string {
    return process.env.PAYTM_MERCHANT_NAME || 'Campus Food Shop';
  },
  get website(): string {
    return process.env.PAYTM_WEBSITE || 'DEFAULT';
  },
  get isProduction(): boolean {
    return process.env.PAYTM_ENV === 'PRODUCTION';
  },
  get environment(): string {
    return process.env.PAYTM_ENV || 'STAGING';
  },
  get apiBaseUrl(): string {
    return this.isProduction
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  },
};

/**
 * Validates the Paytm configuration on backend startup.
 * Logs whether Paytm is configured.
 */
export function validatePaytmConfig() {
  if (process.env.PAYMENT_PROVIDER === 'paytm') {
    if (paytmConfig.isConfigured) {
      logger.info(`Paytm config validated. Environment: ${paytmConfig.environment}`);
    } else {
      logger.warn(
        'PAYMENT_PROVIDER is set to paytm, but PAYTM_MID or PAYTM_MERCHANT_KEY is missing. Payment requests will return 503 PAYMENT_PROVIDER_NOT_CONFIGURED.'
      );
    }
  }
}
