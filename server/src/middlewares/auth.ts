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

/**
 * Authenticates the request via a Bearer access token.
 * Sets req.userId and req.userRole. Does not perform role checks.
 */
export function requireAuth(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(Object.assign(new Error('Not authenticated'), { statusCode: 401, code: 'UNAUTHORIZED' }));
    }
    const token = header.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.sub;
      req.userRole = payload.role;
      next();
    } catch {
      next(Object.assign(new Error('Invalid or expired session'), { statusCode: 401, code: 'UNAUTHORIZED' }));
    }
  };
}

/**
 * Restricts an authenticated route to the given roles.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(Object.assign(new Error('Not authenticated'), { statusCode: 401, code: 'UNAUTHORIZED' }));
    }
    if (!roles.includes(req.userRole!)) {
      return next(Object.assign(new Error('You do not have permission to perform this action'), { statusCode: 403, code: 'FORBIDDEN' }));
    }
    next();
  };
}
