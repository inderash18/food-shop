import { randomInt, createHash } from 'crypto';
import { OtpToken } from '../models/OtpToken';
import { sendSMS } from './sms.service';
import { normalizeIndianMobile } from '../utils/phone';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

const OTP_EXPIRY_MINUTES = 5;
const COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

/**
 * Computes a secure SHA-256 hash of the OTP code combined with salt.
 */
function hashOtp(target: string, otp: string): string {
  const secretSalt = process.env.JWT_ACCESS_SECRET || 'otp-salt-key';
  return createHash('sha256')
    .update(`${target}:${otp}:${secretSalt}`)
    .digest('hex');
}

export function normalizeTarget(rawTarget: string): string {
  if (rawTarget.includes('@')) {
    const trimmed = rawTarget.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      throw new AppError(400, 'BAD_REQUEST', 'Please enter a valid email address');
    }
    return trimmed;
  }

  const phone = normalizeIndianMobile(rawTarget);
  if (!phone) {
    throw new AppError(400, 'INVALID_PHONE', 'Please provide a valid 10-digit Indian mobile number');
  }
  return phone;
}

export async function requestOtp(rawTarget: string, purpose: 'register' | 'login' | 'admin' = 'login') {
  const target = normalizeTarget(rawTarget);

  // Check existing active OTP for cooldown
  const existing = await OtpToken.findOne({ mobileNumber: target, purpose, isVerified: false });
  if (existing) {
    if (existing.resendCooldownUntil > new Date()) {
      const waitSeconds = Math.ceil((existing.resendCooldownUntil.getTime() - Date.now()) / 1000);
      throw new AppError(429, 'TOO_MANY_REQUESTS', `Please wait ${waitSeconds} seconds before requesting another OTP`);
    }
    // Invalidate previous OTP token
    await OtpToken.deleteOne({ _id: existing._id });
  }

  // Generate cryptographically random 6-digit OTP
  const otpCode = randomInt(100000, 999999).toString();
  const otpHash = hashOtp(target, otpCode);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendCooldownUntil = new Date(Date.now() + COOLDOWN_SECONDS * 1000);

  await OtpToken.create({
    mobileNumber: target,
    otpHash,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    resendCooldownUntil,
    expiresAt,
    isVerified: false,
    purpose,
  });

  // Log in dev environment ONLY (never in production)
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV OTP GENERATED] Target: ${target} | Code: ${otpCode}`);
  }

  // If phone, attempt SMS dispatch
  if (target.startsWith('+91')) {
    const smsMessage = `Your ${process.env.SHOP_NAME || 'Food Shop'} OTP code is: ${otpCode}. Valid for 5 minutes. Do not share this with anyone.`;
    await sendSMS({ to: target, message: smsMessage });
  }

  return {
    target,
    mobileNumber: target,
    otpCode,
    cooldownSeconds: COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
  };
}

export async function verifyOtpCode(rawTarget: string, rawOtp: string, purpose: 'register' | 'login' | 'admin' = 'login') {
  const target = normalizeTarget(rawTarget);

  const cleanOtp = rawOtp.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new AppError(400, 'INVALID_OTP_FORMAT', 'OTP must be a 6-digit number');
  }

  const record = await OtpToken.findOne({ mobileNumber: target, purpose, isVerified: false });
  if (!record) {
    throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired or was not requested. Please request a new OTP');
  }

  if (record.expiresAt < new Date()) {
    await OtpToken.deleteOne({ _id: record._id });
    throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired. Please request a new one');
  }

  if (record.attempts >= record.maxAttempts) {
    await OtpToken.deleteOne({ _id: record._id });
    throw new AppError(429, 'MAX_ATTEMPTS_EXCEEDED', 'Too many failed verification attempts. Please request a new OTP');
  }

  const inputHash = hashOtp(target, cleanOtp);
  if (inputHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    const remaining = record.maxAttempts - record.attempts;
    throw new AppError(400, 'INVALID_OTP', `Invalid OTP entered. ${remaining} attempt(s) remaining`);
  }

  // Mark as verified and delete token so it cannot be reused
  record.isVerified = true;
  await record.save();
  await OtpToken.deleteOne({ _id: record._id });

  return { target, mobileNumber: target, verified: true };
}
