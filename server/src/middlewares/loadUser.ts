import { Request, Response, NextFunction, RequestHandler } from 'express';
import { User, IUser } from '../models';
import { Role } from '../constants';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

import { UnauthorizedError } from '../utils/errors';

/**
 * Loads the full user document from the database for the authenticated request.
 * Enforces backend-as-source-of-truth for role and account status.
 * Use on sensitive/role-bound routes (admin, checkout).
 */
export function loadUser(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Not authenticated');
      }
      const user = await User.findById(req.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('Session is no longer valid');
      }
      req.user = user;
      req.userRole = user.role as Role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
