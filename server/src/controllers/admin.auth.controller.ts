import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import {
  logoutSession,
  publicUser,
  issueTokenPair,
  refreshSession,
} from '../services/auth.service';
import { env } from '../config/env';
import { AppError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import { recordAudit } from '../services/audit.service';
import { ROLE } from '../constants';
import { User } from '../models';
import { verifyPassword } from '../utils/crypto';

import { getAuthCookieOptions, getClearCookieOptions } from '../utils/cookies';

const ADMIN_REFRESH_COOKIE = 'adminRefreshToken';
const ADMIN_ACCESS_COOKIE = 'adminAccessToken';

const ADMIN_ALLOWED_ROLES = [ROLE.ADMIN, ROLE.SUPER_ADMIN];

function setAdminAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));
  res.cookie(ADMIN_ACCESS_COOKIE, accessToken, getAuthCookieOptions(15 * 60 * 1000));
}

/**
 * Dedicated Admin Login Controller Handler
 * Strictly verifies admin role and rejects student logins.
 */
export async function handleAdminLogin(req: Request, res: Response) {
  const body = req.validatedBody as { identifier: string; password: string };
  const normalized = body.identifier.trim().toLowerCase();

  const user = await User.findOne({
    $or: [{ emailNormalized: normalized }, { studentId: body.identifier.trim() }],
  }).select('+passwordHash');

  if (!user) {
    await recordAudit({ actorEmail: normalized, action: 'LOGIN_FAILED', metadata: { identifier: normalized } });
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Your administrator account has been deactivated.');
  }

  const ok = await verifyPassword(body.password, user.passwordHash || '');
  if (!ok) {
    await recordAudit({ actorEmail: normalized, action: 'LOGIN_FAILED', metadata: { identifier: normalized } });
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!ADMIN_ALLOWED_ROLES.includes(user.role as any)) {
    await recordAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      action: 'LOGIN_FAILED',
      resource: 'admin_portal',
      resourceId: String(user._id),
      metadata: { role: user.role, ip: req.ip, reason: 'STUDENT_ROLE_DENIED' },
      ip: req.ip,
    });
    throw new ForbiddenError('Access denied: Administrator or Staff credentials required to access the Admin Portal.');
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role);
  setAdminAuthCookies(res, accessToken, refreshToken);

  await user.updateOne({ $set: { lastLoginAt: new Date() } });

  await recordAudit({
    actorId: String(user._id),
    actorEmail: user.email,
    action: 'LOGIN',
    resource: 'admin_portal',
    resourceId: String(user._id),
    metadata: { role: user.role, ip: req.ip },
    ip: req.ip,
  });

  return sendSuccess(res, {
    user: publicUser(user as never),
    accessToken,
    expiresIn: 900,
    role: user.role,
  });
}

export const adminLogin = asyncHandler(handleAdminLogin);

/**
 * Dedicated Admin /me verification
 */
export async function handleAdminMe(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  if (!ADMIN_ALLOWED_ROLES.includes(req.user.role as any)) {
    throw new ForbiddenError('Access denied: Administrator or Staff credentials required.');
  }
  return sendSuccess(res, { user: publicUser(req.user as never) });
}

export const adminMe = asyncHandler(handleAdminMe);

/**
 * Dedicated Admin Refresh Token Handler
 */
export async function handleAdminRefresh(req: Request, res: Response) {
  const token = req.cookies?.[ADMIN_REFRESH_COOKIE] ?? req.cookies?.refreshToken;
  if (!token) throw new UnauthorizedError('No admin refresh token provided');
  const { accessToken, refreshToken } = await refreshSession(token);
  setAdminAuthCookies(res, accessToken, refreshToken);
  return sendSuccess(res, { accessToken });
}

export const adminRefresh = asyncHandler(handleAdminRefresh);

/**
 * Dedicated Admin Logout
 */
export async function handleAdminLogout(req: Request, res: Response) {
  const token = req.cookies?.[ADMIN_REFRESH_COOKIE] ?? req.cookies?.refreshToken ?? '';
  if (token) {
    await logoutSession(token);
  }
  res.clearCookie(ADMIN_REFRESH_COOKIE, getClearCookieOptions());
  res.clearCookie(ADMIN_ACCESS_COOKIE, getClearCookieOptions());
  res.clearCookie('refreshToken', getClearCookieOptions());
  res.clearCookie('accessToken', getClearCookieOptions());

  if (req.userId) {
    await recordAudit({
      actorId: req.userId,
      action: 'LOGOUT',
      resource: 'admin_portal',
      resourceId: req.userId,
    });
  }
  return sendSuccess(res, { message: 'Admin logged out successfully' });
}

export const adminLogout = asyncHandler(handleAdminLogout);
