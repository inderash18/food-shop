import { randomUUID, randomBytes } from 'crypto';
import { User, RefreshToken } from '../models';
import { hashPassword, verifyPassword, generateId } from '../utils/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { env } from '../config/env';
import { AppError, ConflictError, UnauthorizedError, ForbiddenError } from '../utils/errors';
import { ROLE, Role, AUDIT_ACTION } from '../constants';
import { recordAudit } from './audit.service';
import { logger } from '../config/logger';

import { requestOtp, verifyOtpCode } from './otp.service';
import { normalizeIndianMobile } from '../utils/phone';

interface RegisterInput {
  name: string;
  email?: string;
  studentId?: string;
  password?: string;
  phone?: string;
  mobileNumber?: string;
}

export async function requestAuthOtp(rawPhone: string, purpose: 'register' | 'login' = 'login') {
  return requestOtp(rawPhone, purpose);
}

export async function verifyAuthOtp(rawPhone: string, otp: string, name?: string) {
  const normalizedPhone = normalizeIndianMobile(rawPhone);
  if (!normalizedPhone) {
    throw new AppError(400, 'INVALID_PHONE', 'Please enter a valid 10-digit Indian mobile number');
  }

  await verifyOtpCode(normalizedPhone, otp);

  // Find or create customer user
  let user = await User.findOne({
    $or: [{ mobileNumber: normalizedPhone }, { phone: normalizedPhone }],
  });

  if (!user) {
    // Create new customer account
    const lastDigits = normalizedPhone.slice(-4);
    const defaultName = name?.trim() || `Customer ${lastDigits}`;
    user = await User.create({
      name: defaultName,
      mobileNumber: normalizedPhone,
      phone: normalizedPhone,
      role: ROLE.STUDENT,
      isActive: true,
      approved: true,
    });
    await recordAudit({ actorId: user.id, action: 'REGISTER', resource: 'user', resourceId: user.id, metadata: { method: 'OTP' } });
  } else {
    if (!user.isActive) {
      throw new ForbiddenError('Your account has been deactivated. Contact support.');
    }
    // Update user profile name if given
    if (name && name.trim().length >= 2 && user.name.startsWith('Customer ')) {
      user.name = name.trim();
      await user.save();
    }
    await user.updateOne({ $set: { lastLoginAt: new Date() } });
    await recordAudit({ actorId: user.id, action: 'LOGIN', resource: 'user', resourceId: user.id, metadata: { method: 'OTP' } });
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role);
  return { user: publicUser(user), accessToken, refreshToken };
}

export function assertDomainAllowed(email: string): void {
  if (!env.requireDomainCheck) return;
  if (env.allowedEmailDomains.length === 0) return;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || !env.allowedEmailDomains.includes(domain)) {
    throw new ForbiddenError('Registration is restricted to college email domains');
  }
}

export async function registerUser(input: RegisterInput) {
  const email = input.email ? input.email.trim() : `${Date.now()}@user.local`;
  const studentId = input.studentId ? input.studentId.trim().toUpperCase() : `STU${Date.now().toString().slice(-6)}`;
  const password = input.password || 'Customer@123';
  
  assertDomainAllowed(email);

  const emailNormalized = email.toLowerCase();
  const existing = await User.findOne({
    $or: [{ email: emailNormalized }, { studentId }, { emailNormalized }],
  });
  if (existing) {
    throw new ConflictError('An account with this email or student ID already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name: input.name.trim(),
    email: email,
    emailNormalized,
    studentId,
    phone: input.phone?.trim() || undefined,
    mobileNumber: input.mobileNumber?.trim() || undefined,
    passwordHash,
    role: ROLE.STUDENT,
  });

  await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'REGISTER', resource: 'user', resourceId: user.id });

  return publicUser(user);
}

export async function loginUser(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalized }, { emailNormalized: normalized }, { studentId: normalized.toUpperCase() }],
  }).select('+passwordHash');

  const invalid = async () => {
    await recordAudit({ actorEmail: normalized, action: 'LOGIN_FAILED', metadata: { identifier: normalized } });
    throw new UnauthorizedError('Invalid credentials');
  };

  if (!user) return invalid();
  if (!user.isActive) throw new ForbiddenError('Your account has been deactivated. Contact the administrator.');
  const ok = await verifyPassword(password, user.passwordHash || '');
  if (!ok) return invalid();

  await user.updateOne({ $set: { lastLoginAt: new Date() } });
  await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'LOGIN', resource: 'user', resourceId: user.id });

  return issueTokenPair(user.id, user.role);
}

export async function issueTokenPair(userId: string, role: Role) {
  const tokenId = randomUUID();
  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId, tokenId);

  const ttlMs = parseTtl(env.jwtRefreshExpiresIn);
  await RefreshToken.create({
    userId,
    tokenId,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return { accessToken, refreshToken };
}

export async function refreshSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const stored = await RefreshToken.findOne({ tokenId: payload.tokenId });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Session has expired. Please log in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Session is no longer valid');
  }

  await stored.updateOne({ $set: { revoked: true } });
  return issueTokenPair(user.id, user.role);
}

export async function logoutSession(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await RefreshToken.updateMany({ tokenId: payload.tokenId }, { $set: { revoked: true } });
  } catch {
    // Ignore invalid tokens on logout
  }
}

export async function getAuthUser(userId: string) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new UnauthorizedError('Session is no longer valid');
  return user;
}

export async function createAdminAccount(input: RegisterInput & { role?: Role; approved?: boolean }) {
  const role: Role = input.role && Object.values(ROLE).includes(input.role) ? input.role : ROLE.STAFF;
  if (role === ROLE.STUDENT) throw new AppError(400, 'BAD_REQUEST', 'Cannot create student via admin creation');

  const email = input.email ? input.email.trim().toLowerCase() : undefined;
  const studentId = input.studentId ? input.studentId.trim().toUpperCase() : undefined;
  if (!email || !studentId || !input.password) {
    throw new AppError(400, 'BAD_REQUEST', 'Email, Student/Admin ID, and Password are required for admin creation');
  }

  const existing = await User.findOne({
    $or: [{ email }, { studentId }, { emailNormalized: email }],
  });
  if (existing) throw new ConflictError('A user with this email or ID already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name.trim(),
    email: email,
    emailNormalized: email,
    studentId: studentId,
    passwordHash,
    role,
    approved: true,
  });
  logger.info('Admin/staff account created', { id: user.id, role });
  return user;
}

export function publicUser(user: {
  _id: unknown;
  studentId?: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  isActive: boolean;
  approved: boolean;
  createdAt: Date;
}) {
  return {
    id: String(user._id),
    studentId: user.studentId || '',
    name: user.name,
    email: user.email || '',
    mobileNumber: user.mobileNumber || user.phone || '',
    phone: user.phone || user.mobileNumber || '',
    avatarUrl: user.avatarUrl ?? undefined,
    role: user.role,
    isActive: user.isActive,
    approved: user.approved,
    createdAt: user.createdAt,
  };
}

export function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function parseTtl(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
  return n * ms;
}

export function generateIdFor(name: string): string {
  return generateId(name.toLowerCase());
}

export async function updateUserProfile(userId: string, data: { name?: string; phone?: string; avatarUrl?: string | null }) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

  if (data.name && data.name.trim().length >= 2) {
    user.name = data.name.trim();
  }
  if (data.phone !== undefined) {
    user.phone = data.phone ? data.phone.trim() : undefined;
  }
  if (data.avatarUrl !== undefined) {
    user.avatarUrl = data.avatarUrl ? data.avatarUrl : undefined;
  }

  await user.save();
  await recordAudit({ actorId: user.id, actorEmail: user.email, action: 'USER_UPDATED', resource: 'user', resourceId: user.id });
  return publicUser(user);
}

export async function changeUserPassword(userId: string, currentPass: string, newPass: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

  const valid = await verifyPassword(currentPass, user.passwordHash || '');
  if (!valid) throw new UnauthorizedError('Current password does not match');

  user.passwordHash = await hashPassword(newPass);
  await user.save();
  await recordAudit({ actorId: user.id, actorEmail: user.email, action: AUDIT_ACTION.USER_UPDATED, resource: 'user', resourceId: user.id });
  return { message: 'Password updated successfully' };
}
