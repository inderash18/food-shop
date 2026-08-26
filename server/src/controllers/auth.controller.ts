import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  createAdminAccount,
  publicUser,
  updateUserProfile,
  changeUserPassword,
  issueTokenPair,
  requestAuthOtp,
  verifyAuthOtp,
  sendEmailAuthOtp,
  verifyEmailAuthOtp,
} from '../services/auth.service';
import { sendMsg91OTP, verifyMsg91OTP, resendMsg91OTP } from '../services/msg91.service';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { recordAudit } from '../services/audit.service';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  // Set refresh token cookie (7 days)
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Set access token cookie (15 minutes)
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { name: string; email: string; studentId: string; password: string; phone?: string };
  const user = await registerUser(body);
  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { user: publicUser(user as never), accessToken }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { identifier: string; password: string };
  const { accessToken, refreshToken } = await loginUser(body.identifier, body.password);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { accessToken, expiresIn: 900 });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'No refresh token provided');
  const { accessToken, refreshToken } = await refreshSession(token);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] ?? '';
  if (token) {
    await logoutSession(token);
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  if (req.userId) {
    await recordAudit({ actorId: req.userId, action: 'LOGOUT', resource: 'user', resourceId: req.userId });
  }
  sendSuccess(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  sendSuccess(res, { user: publicUser(req.user as never) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  const body = req.validatedBody as { name?: string; phone?: string; avatarUrl?: string | null };
  const user = await updateUserProfile(req.userId, body);
  sendSuccess(res, { user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  const body = req.validatedBody as { currentPassword: string; newPassword: string };
  const result = await changeUserPassword(req.userId, body.currentPassword, body.newPassword);
  sendSuccess(res, result);
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { name: string; email: string; studentId: string; password: string; role?: string };
  const user = await createAdminAccount({ ...body, role: body.role as never });
  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: 'ADMIN_CREATED',
    resource: 'user',
    resourceId: String(user.id),
    metadata: { role: user.role },
    ip: req.ip,
  });
  sendSuccess(res, { user: publicUser(user as never) }, 201);
});

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobileNumber, purpose } = req.body as { mobileNumber: string; purpose?: 'register' | 'login' };
  const phone = mobileNumber || (req.body as any).phone;
  if (!phone) {
    throw new AppError(400, 'INVALID_PHONE', 'Mobile number is required');
  }
  const result = await requestAuthOtp(phone, purpose || 'login');
  sendSuccess(res, {
    success: true,
    message: 'OTP sent successfully via SMS',
    mobileNumber: result.mobileNumber,
    cooldownSeconds: result.cooldownSeconds,
    expiresInSeconds: result.expiresInSeconds,
  });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobileNumber, otp, name } = req.body as { mobileNumber: string; otp: string; name?: string };
  const phone = mobileNumber || (req.body as any).phone;
  if (!phone || !otp) {
    throw new AppError(400, 'MISSING_FIELDS', 'Mobile number and OTP are required');
  }
  const { user, accessToken, refreshToken } = await verifyAuthOtp(phone, otp, name);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { success: true, verified: true, user, accessToken, message: 'Authenticated successfully' });
});

export const sendEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body as { email: string; purpose?: 'register' | 'login' };
  if (!email) {
    throw new AppError(400, 'BAD_REQUEST', 'Email address is required');
  }
  const result = await sendEmailAuthOtp(email, purpose || 'login');
  sendSuccess(res, {
    success: true,
    message: 'Verification code sent successfully',
    email: result.email,
    cooldownSeconds: result.cooldownSeconds,
    expiresInSeconds: result.expiresInSeconds,
  });
});

export const verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody || req.body;
  const { email, otp, name, studentId, password, purpose } = body as {
    email: string;
    otp: string;
    name?: string;
    studentId?: string;
    password?: string;
    purpose?: 'register' | 'login' | 'admin';
  };
  if (!email || !otp) {
    throw new AppError(400, 'MISSING_FIELDS', 'Email address and verification code are required');
  }
  const { user, accessToken, refreshToken } = await verifyEmailAuthOtp(email, otp, { name, studentId, password, purpose });
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { success: true, verified: true, user, accessToken, message: 'Email verified successfully' });
});

export const resendEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body as { email: string; purpose?: 'register' | 'login' };
  if (!email) {
    throw new AppError(400, 'BAD_REQUEST', 'Email address is required');
  }
  const result = await sendEmailAuthOtp(email, purpose || 'login');
  sendSuccess(res, {
    success: true,
    message: 'Verification code resent successfully',
    email: result.email,
    cooldownSeconds: result.cooldownSeconds,
    expiresInSeconds: result.expiresInSeconds,
  });
});

export const sendPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose } = req.body as { phone: string; purpose?: 'register' | 'login' };
  if (!phone) {
    throw new AppError(400, 'INVALID_PHONE', 'Phone number is required');
  }
  const result = await sendMsg91OTP(phone, purpose || 'login');
  if (!result.success) {
    throw new AppError(400, 'BAD_REQUEST', result.message);
  }
  sendSuccess(res, {
    success: true,
    message: result.message || 'OTP sent successfully',
    cooldownSeconds: result.cooldownSeconds || 60,
    expiresInSeconds: result.expiresInSeconds || 300,
  });
});

export const verifyPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp, name } = req.body as { phone: string; otp: string; name?: string };
  if (!phone || !otp) {
    throw new AppError(400, 'MISSING_FIELDS', 'Phone number and OTP are required');
  }
  const msg91Result = await verifyMsg91OTP(phone, otp, 'login');
  if (!msg91Result.success) {
    throw new AppError(400, 'INVALID_OTP', msg91Result.message);
  }

  const { user, accessToken, refreshToken } = await verifyAuthOtp(phone, otp, name);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, { success: true, verified: true, user, accessToken, message: 'Phone number verified successfully' });
});

export const resendPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose } = req.body as { phone: string; purpose?: 'register' | 'login' };
  if (!phone) {
    throw new AppError(400, 'INVALID_PHONE', 'Phone number is required');
  }
  const result = await resendMsg91OTP(phone, purpose || 'login');
  if (!result.success) {
    throw new AppError(400, 'BAD_REQUEST', result.message);
  }
  sendSuccess(res, {
    success: true,
    message: result.message || 'OTP resent successfully',
    cooldownSeconds: result.cooldownSeconds || 60,
    expiresInSeconds: result.expiresInSeconds || 300,
  });
});
