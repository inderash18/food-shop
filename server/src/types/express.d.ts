import 'express';
import { Role } from '../constants';
import type { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startedAt: number;
      userId?: string;
      userRole?: Role;
      user?: IUser;
      validatedBody?: unknown;
      validatedQuery?: unknown;
      rawBody?: string;
    }
  }
}

export {};
