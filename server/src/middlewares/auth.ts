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

/**
 * Authenticates the request via Bearer header or HTTP-only auth cookies.
 * Sets req.userId and req.userRole.
 */
export function requireAuth(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      token = header.slice(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.cookies?.token) {
      token = req.cookies.token;
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

    // Check refresh token cookie if access token was missing or expired
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const { refreshSession } = await import('../services/auth.service');
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshSession(refreshToken);

        res.cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: env.cookieSecure,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: env.cookieSecure,
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60 * 1000,
        });

        res.setHeader('X-New-Access-Token', newAccessToken);

        const payload = verifyAccessToken(newAccessToken);
        req.userId = payload.sub;
        req.userRole = payload.role;
        return next();
      } catch {
        // Refresh token was also invalid/expired
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
