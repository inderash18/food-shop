import { AppError } from '../utils/errors';
import { logger } from './logger';

export const paytmConfig = {
  get mid(): string {
    const val = process.env.PAYTM_MID;
    if (!val) throw new AppError(500, 'INTERNAL_ERROR', 'Paytm configuration missing: PAYTM_MID is not set.');
    return val;
  },
  get merchantKey(): string {
    const val = process.env.PAYTM_MERCHANT_KEY;
    if (!val) throw new AppError(500, 'INTERNAL_ERROR', 'Paytm configuration missing: PAYTM_MERCHANT_KEY is not set.');
    return val;
  },
  get upiId(): string {
    const val = process.env.PAYTM_UPI_ID;
    if (!val) throw new AppError(500, 'INTERNAL_ERROR', 'Paytm configuration missing: PAYTM_UPI_ID is not set.');
    return val;
  },
  get merchantName(): string {
    const val = process.env.PAYTM_MERCHANT_NAME;
    if (!val) throw new AppError(500, 'INTERNAL_ERROR', 'Paytm configuration missing: PAYTM_MERCHANT_NAME is not set.');
    return val;
  },
  get website(): string {
    const val = process.env.PAYTM_WEBSITE || 'DEFAULT';
    return val;
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
  }
};

/**
 * Validates the Paytm configuration on backend startup.
 * Throws a fatal error if the server requires Paytm but the config is missing.
 */
export function validatePaytmConfig() {
  if (process.env.PAYMENT_PROVIDER === 'paytm') {
    try {
      // Accessing getters will trigger the validation
      const _mid = paytmConfig.mid;
      const _key = paytmConfig.merchantKey;
      logger.info(`Paytm config validated. Environment: ${paytmConfig.environment}`);
    } catch (error) {
      logger.error('Fatal startup error: Paytm configuration missing or invalid.');
      throw error;
    }
  }
}
