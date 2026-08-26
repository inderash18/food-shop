import { logger } from '../config/logger';
import { requestOtp, verifyOtpCode } from './otp.service';
import { normalizeIndianMobile } from '../utils/phone';

export interface Msg91OtpResult {
  success: boolean;
  message: string;
  verified?: boolean;
  cooldownSeconds?: number;
  expiresInSeconds?: number;
}

function getMsg91Config() {
  return {
    authKey: process.env.MSG91_AUTH_KEY,
    templateId: process.env.MSG91_OTP_TEMPLATE_ID,
    expirySeconds: Number(process.env.MSG91_OTP_EXPIRY || 300),
    cooldownSeconds: Number(process.env.MSG91_OTP_RESEND_COOLDOWN || 60),
  };
}

/**
 * Sends OTP to a normalized mobile number using MSG91 official OTP API v5.
 * Falls back gracefully to internal cryptographic OTP engine if MSG91_AUTH_KEY is not configured or mock.
 */
export async function sendMsg91OTP(rawPhone: string, purpose: 'login' | 'register' | 'admin' = 'login'): Promise<Msg91OtpResult> {
  const normalizedPhone = normalizeIndianMobile(rawPhone);
  if (!normalizedPhone) {
    return { success: false, message: 'Please provide a valid 10-digit Indian mobile number' };
  }

  const config = getMsg91Config();
  const digitsOnly = normalizedPhone.replace('+', ''); // e.g. 919876543210

  if (config.authKey && config.authKey !== 'mock' && config.templateId) {
    try {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(config.templateId)}&mobile=${encodeURIComponent(digitsOnly)}&expiry=${Math.ceil(config.expirySeconds / 60)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authkey: config.authKey,
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as any;
      if (data.type === 'success' || response.ok) {
        logger.info('MSG91 OTP sent successfully', { mobile: digitsOnly });
        return {
          success: true,
          message: data.message || 'OTP sent successfully via MSG91',
          cooldownSeconds: config.cooldownSeconds,
          expiresInSeconds: config.expirySeconds,
        };
      }

      logger.warn('MSG91 OTP send failed, using fallback engine', { response: data });
    } catch (err: any) {
      logger.error('MSG91 API request failed', { error: err.message });
    }
  }

  // Fallback to internal cryptographic random OTP service
  const fallback = await requestOtp(normalizedPhone, purpose);
  return {
    success: true,
    message: 'OTP sent successfully',
    cooldownSeconds: fallback.cooldownSeconds,
    expiresInSeconds: fallback.expiresInSeconds,
  };
}

/**
 * Retries/resends OTP via MSG91 official retry API.
 */
export async function resendMsg91OTP(rawPhone: string, purpose: 'login' | 'register' | 'admin' = 'login'): Promise<Msg91OtpResult> {
  const normalizedPhone = normalizeIndianMobile(rawPhone);
  if (!normalizedPhone) {
    return { success: false, message: 'Please provide a valid 10-digit Indian mobile number' };
  }

  const config = getMsg91Config();
  const digitsOnly = normalizedPhone.replace('+', '');

  if (config.authKey && config.authKey !== 'mock') {
    try {
      const url = `https://control.msg91.com/api/v5/otp/retry?authkey=${encodeURIComponent(config.authKey)}&mobile=${encodeURIComponent(digitsOnly)}&retrytype=text`;
      const response = await fetch(url, { method: 'GET' });
      const data = (await response.json()) as any;

      if (data.type === 'success' || response.ok) {
        logger.info('MSG91 OTP resent successfully', { mobile: digitsOnly });
        return {
          success: true,
          message: data.message || 'OTP resent successfully',
          cooldownSeconds: config.cooldownSeconds,
          expiresInSeconds: config.expirySeconds,
        };
      }
    } catch (err: any) {
      logger.error('MSG91 retry request error', { error: err.message });
    }
  }

  // Fallback to sendMsg91OTP
  return sendMsg91OTP(normalizedPhone, purpose);
}

/**
 * Verifies submitted OTP against MSG91 verification API or local cryptographic store.
 */
export async function verifyMsg91OTP(rawPhone: string, otp: string, purpose: 'login' | 'register' | 'admin' = 'login'): Promise<Msg91OtpResult> {
  const normalizedPhone = normalizeIndianMobile(rawPhone);
  if (!normalizedPhone) {
    return { success: false, message: 'Please provide a valid 10-digit Indian mobile number' };
  }

  const config = getMsg91Config();
  const digitsOnly = normalizedPhone.replace('+', '');

  if (config.authKey && config.authKey !== 'mock') {
    try {
      const url = `https://control.msg91.com/api/v5/otp/verify?authkey=${encodeURIComponent(config.authKey)}&mobile=${encodeURIComponent(digitsOnly)}&otp=${encodeURIComponent(otp.trim())}`;
      const response = await fetch(url, { method: 'GET' });
      const data = (await response.json()) as any;

      if (data.type === 'success' || response.ok) {
        logger.info('MSG91 OTP verified successfully', { mobile: digitsOnly });
        return {
          success: true,
          verified: true,
          message: 'Phone number verified successfully',
        };
      }

      return {
        success: false,
        verified: false,
        message: data.message || 'Invalid or expired OTP',
      };
    } catch (err: any) {
      logger.error('MSG91 verify request error', { error: err.message });
    }
  }

  // Fallback to local cryptographic verification engine
  try {
    await verifyOtpCode(normalizedPhone, otp, purpose);
    return {
      success: true,
      verified: true,
      message: 'Phone number verified successfully',
    };
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      message: err.message || 'Invalid OTP entered',
    };
  }
}
