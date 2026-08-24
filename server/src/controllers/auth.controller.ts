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
} from '../services/auth.service';
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
