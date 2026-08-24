import { PaymentProviderNotConfiguredError } from '../utils/errors';
import { logger } from './logger';

export const phonepeConfig = {
  get isConfigured(): boolean {
    return Boolean(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY && process.env.PHONEPE_SALT_INDEX);
  },
  get merchantId(): string {
    const val = process.env.PHONEPE_MERCHANT_ID;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'PhonePe payment service is not configured. Please configure PHONEPE_MERCHANT_ID credentials.'
      );
    }
    return val;
  },
  get saltKey(): string {
    const val = process.env.PHONEPE_SALT_KEY;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'PhonePe payment service is not configured. Please configure PHONEPE_SALT_KEY credentials.'
      );
    }
    return val;
  },
  get saltIndex(): string {
    const val = process.env.PHONEPE_SALT_INDEX;
    if (!val) {
      throw new PaymentProviderNotConfiguredError(
        'PhonePe payment service is not configured. Please configure PHONEPE_SALT_INDEX credentials.'
      );
    }
    return val;
  },
  get isProduction(): boolean {
    return process.env.PHONEPE_ENV === 'PRODUCTION';
  },
  get environment(): string {
    return process.env.PHONEPE_ENV || 'STAGING';
  },
  get apiBaseUrl(): string {
    return this.isProduction
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  },
};

/**
 * Validates the PhonePe configuration on backend startup.
 * Logs whether PhonePe is configured.
 */
export function validatePhonePeConfig() {
  if (process.env.PAYMENT_PROVIDER === 'phonepe') {
    if (phonepeConfig.isConfigured) {
      logger.info(`PhonePe config validated. Environment: ${phonepeConfig.environment}`);
    } else {
      logger.warn(
        'PAYMENT_PROVIDER is set to phonepe, but credentials are missing. Payment requests will return 503 PAYMENT_PROVIDER_NOT_CONFIGURED.'
      );
    }
  }
}
