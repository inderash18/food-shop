import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { requestOtp, verifyOtpCode, normalizeTarget } from '../services/otp.service';
import { User, RefreshToken, OtpToken } from '../models';
import * as authService from '../services/auth.service';
import * as emailService from '../services/email.service';
import { env } from '../config/env';

function computeTestHash(target: string, otp: string): string {
  const secretSalt = env.jwtAccessSecret || 'otp-salt-key';
  return createHash('sha256')
    .update(`${target}:${otp}:${secretSalt}`)
    .digest('hex');
}

describe('Gmail / Email OTP Verification System Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Email Normalization', () => {
    it('normalizes email by trimming whitespace and converting to lowercase', () => {
      const email = '   Student.ALEX@Gmail.COM  ';
      const normalized = normalizeTarget(email);
      expect(normalized).toBe('student.alex@gmail.com');
    });

    it('rejects invalid email formats', () => {
      expect(() => normalizeTarget('invalid-email-string@')).toThrow();
    });
  });

  describe('OTP Generation, Hashing & Storage', () => {
    it('generates a 6-digit cryptographically secure OTP and stores SHA-256 hash', async () => {
      let createdDoc: any = null;
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue(null);
      vi.spyOn(OtpToken, 'create').mockImplementation(async (doc: any) => {
        createdDoc = { ...doc, _id: 'otp_token_123' };
        return createdDoc;
      });

      const res = await requestOtp('alex@gmail.com', 'register');

      expect(res.otpCode).toMatch(/^\d{6}$/);
      expect(res.email).toBe('alex@gmail.com');
      expect(res.cooldownSeconds).toBe(60);
      expect(res.expiresInSeconds).toBe(300);

      expect(createdDoc).not.toBeNull();
      expect(createdDoc.email).toBe('alex@gmail.com');
      expect(createdDoc.target).toBe('alex@gmail.com');
      expect(createdDoc.otpHash).toBeDefined();
      expect(createdDoc.otpHash).not.toBe(res.otpCode); // Hashed, not plaintext
      expect(createdDoc.attempts).toBe(0);
      expect(createdDoc.maxAttempts).toBe(5);
    });

    it('enforces 60-second resend cooldown before allowing another OTP', async () => {
      const futureCooldown = new Date(Date.now() + 45 * 1000);
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'existing_token_id',
        email: 'alex@gmail.com',
        target: 'alex@gmail.com',
        resendCooldownUntil: futureCooldown,
        isVerified: false,
      } as any);

      await expect(requestOtp('alex@gmail.com', 'register')).rejects.toThrow(/Please wait/);
    });

    it('invalidates previous active OTP when generating a new OTP after cooldown', async () => {
      const pastCooldown = new Date(Date.now() - 10 * 1000);
      const deleteOneSpy = vi.spyOn(OtpToken, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'old_token_id',
        email: 'alex@gmail.com',
        target: 'alex@gmail.com',
        resendCooldownUntil: pastCooldown,
        isVerified: false,
      } as any);
      vi.spyOn(OtpToken, 'create').mockResolvedValue({ _id: 'new_token_id' } as any);

      await requestOtp('alex@gmail.com', 'register');

      expect(deleteOneSpy).toHaveBeenCalledWith({ _id: 'old_token_id' });
    });
  });

  describe('OTP Verification & Security Enforcement', () => {
    it('successfully verifies correct 6-digit OTP and deletes token to prevent reuse', async () => {
      const email = 'alex@gmail.com';
      const otpCode = '482910';
      const otpHash = computeTestHash(email, otpCode);

      const saveSpy = vi.fn();
      const deleteSpy = vi.spyOn(OtpToken, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);

      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'token_doc_1',
        email,
        target: email,
        otpHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300 * 1000),
        isVerified: false,
        save: saveSpy,
      } as any);

      const verifyRes = await verifyOtpCode(email, otpCode, 'register');
      expect(verifyRes.verified).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith({ _id: 'token_doc_1' });
    });

    it('increments attempts on wrong OTP and calculates remaining attempts', async () => {
      const saveSpy = vi.fn();
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'token_doc_2',
        email: 'alex@gmail.com',
        target: 'alex@gmail.com',
        otpHash: 'correct_sha256_hash',
        attempts: 1,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300 * 1000),
        isVerified: false,
        save: saveSpy,
      } as any);

      await expect(verifyOtpCode('alex@gmail.com', '000000', 'register')).rejects.toThrow(/Invalid verification code/);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('invalidates token and blocks verification when max attempts (5) exceeded', async () => {
      const deleteSpy = vi.spyOn(OtpToken, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'token_doc_3',
        email: 'alex@gmail.com',
        target: 'alex@gmail.com',
        otpHash: 'some_hash',
        attempts: 5,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300 * 1000),
        isVerified: false,
        save: vi.fn(),
      } as any);

      await expect(verifyOtpCode('alex@gmail.com', '123456', 'register')).rejects.toThrow(/Too many failed attempts/);
      expect(deleteSpy).toHaveBeenCalledWith({ _id: 'token_doc_3' });
    });

    it('rejects expired OTP token and cleans up from database', async () => {
      const deleteSpy = vi.spyOn(OtpToken, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'token_doc_4',
        email: 'alex@gmail.com',
        target: 'alex@gmail.com',
        otpHash: 'some_hash',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 10 * 1000), // Expired
        isVerified: false,
      } as any);

      await expect(verifyOtpCode('alex@gmail.com', '123456', 'register')).rejects.toThrow(/expired/);
      expect(deleteSpy).toHaveBeenCalledWith({ _id: 'token_doc_4' });
    });
  });

  describe('Auth Service Registration & Email Verification', () => {
    it('sendEmailAuthOtp invokes email service and sends verification code', async () => {
      const sendEmailSpy = vi.spyOn(emailService, 'sendVerificationOTP').mockResolvedValue({ success: true, messageId: 'msg_123' });
      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(OtpToken, 'findOne').mockResolvedValue(null);
      vi.spyOn(OtpToken, 'create').mockResolvedValue({ _id: 'new_token' } as any);

      const res = await authService.sendEmailAuthOtp('alex.kumar@gmail.com', 'register');

      expect(res.email).toBe('alex.kumar@gmail.com');
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alex.kumar@gmail.com',
          otp: expect.stringMatching(/^\d{6}$/),
        })
      );
    });

    it('verifyEmailAuthOtp creates new user with emailVerified=true and issues token pair', async () => {
      const email = 'alex.kumar@gmail.com';
      const otpCode = '654321';
      const otpHash = computeTestHash(email, otpCode);

      vi.spyOn(OtpToken, 'findOne').mockResolvedValue({
        _id: 'doc_1',
        email,
        target: email,
        otpHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300 * 1000),
        isVerified: false,
        save: vi.fn(),
      } as any);
      vi.spyOn(OtpToken, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);

      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      const mockUserId = '507f1f77bcf86cd799439011';
      const mockCreatedUser = {
        _id: mockUserId,
        id: mockUserId,
        name: 'Alex Kumar',
        email,
        emailNormalized: email,
        studentId: 'STU1024',
        emailVerified: true,
        phoneVerified: false,
        role: 'STUDENT',
        isActive: true,
        approved: true,
        createdAt: new Date(),
      };
      vi.spyOn(User, 'create').mockResolvedValue(mockCreatedUser as any);
      vi.spyOn(RefreshToken, 'create').mockResolvedValue({ _id: 'ref_doc_1' } as any);

      const result = await authService.verifyEmailAuthOtp(email, otpCode, {
        name: 'Alex Kumar',
        studentId: 'STU1024',
        purpose: 'register',
      });

      expect(result.user.emailVerified).toBe(true);
      expect(result.user.name).toBe('Alex Kumar');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });
});
