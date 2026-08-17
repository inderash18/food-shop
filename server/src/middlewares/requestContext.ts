import { Request, Response, NextFunction, RequestHandler } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startedAt: number;
    }
  }
}

export function requestContext(): RequestHandler {
  return (req, _res, next) => {
    req.id = req.headers['x-request-id'] as string ?? randomUUID();
    req.startedAt = Date.now();
    next();
  };
}
