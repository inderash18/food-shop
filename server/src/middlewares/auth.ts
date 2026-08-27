import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { Role } from '../constants';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
    }
  }
}

import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { getAuthCookieOptions } from '../utils/cookies';
import { refreshSession } from '../services/auth.service';

/**
 * Authenticates the request via Bearer header or HTTP-only auth cookies.
 * Supports both student (accessToken/refreshToken) and admin (adminAccessToken/adminRefreshToken).
 * Sets req.userId and req.userRole.
 */
export function requireAuth(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies?.adminAccessToken) {
      token = req.cookies.adminAccessToken;
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.userId = payload.sub;
        req.userRole = payload.role;
        return next();
      } catch {
        // Access token invalid or expired; continue to check refresh token cookie below
      }
    }

    // Check admin refresh token cookie
    const adminRefreshToken = req.cookies?.adminRefreshToken;
    if (adminRefreshToken) {
      try {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshSession(adminRefreshToken);

        res.cookie('adminRefreshToken', newRefreshToken, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));
        res.cookie('adminAccessToken', newAccessToken, getAuthCookieOptions(15 * 60 * 1000));
        res.setHeader('X-New-Access-Token', newAccessToken);

        const payload = verifyAccessToken(newAccessToken);
        req.userId = payload.sub;
        req.userRole = payload.role;
        return next();
      } catch {
        // Admin refresh token invalid or expired
      }
    }

    // Check student refresh token cookie
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshSession(refreshToken);

        res.cookie('refreshToken', newRefreshToken, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));
        res.cookie('accessToken', newAccessToken, getAuthCookieOptions(15 * 60 * 1000));
        res.setHeader('X-New-Access-Token', newAccessToken);

        const payload = verifyAccessToken(newAccessToken);
        req.userId = payload.sub;
        req.userRole = payload.role;
        return next();
      } catch {
        // Student refresh token invalid or expired
      }
    }

    return next(new UnauthorizedError('Not authenticated'));
  };
}

/**
 * Restricts an authenticated route to the given roles.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    if (!roles.includes(req.userRole!)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
}
