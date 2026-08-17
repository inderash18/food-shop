import { Request, Response, NextFunction } from 'express';
import { isAppError, isZodError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../config/logger';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'Route not found');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const elapsed = Date.now() - req.startedAt;

  if (isAppError(err)) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    if (err.statusCode >= 500) {
      logger.error('Request failed', { requestId: req.id, message: err.message, code: err.code, elapsed });
    }
    return;
  }

  if (isZodError(err)) {
    const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', issues);
    return;
  }

  const typed = err as { statusCode?: number; code?: string; message?: string };
  const status = typed.statusCode && typed.statusCode >= 400 && typed.statusCode < 600 ? typed.statusCode : 500;
  const code = (typed.code as string) ?? 'INTERNAL_ERROR';

  if (status >= 500) {
    logger.error('Unhandled error', {
      requestId: req.id,
      message: typed.message ?? 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      elapsed,
    });
  }

  const message = status >= 500 ? 'Something went wrong. Please try again.' : typed.message ?? 'Request failed';
  sendError(res, status, code, message);
}
