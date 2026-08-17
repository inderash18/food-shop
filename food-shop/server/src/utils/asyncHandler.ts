import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './errors';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function assertNever(value: never): never {
  throw new AppError(500, 'INTERNAL_ERROR', `Unexpected value: ${String(value)}`);
}
