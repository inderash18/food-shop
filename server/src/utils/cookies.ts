import { CookieOptions } from 'express';
import { env } from '../config/env';

/**
 * Returns standardized cookie options for secure authentication tokens.
 * Handles cross-origin deployments (e.g. Vercel frontend + Render backend)
 * by applying SameSite=None; Secure=true in production or when COOKIE_SECURE is true.
 */
export function getAuthCookieOptions(maxAgeMs?: number): CookieOptions {
  const isSecure = env.cookieSecure || env.isProd;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

export function getClearCookieOptions(): CookieOptions {
  const isSecure = env.cookieSecure || env.isProd;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    path: '/',
  };
}
