import { Request, Response, NextFunction, RequestHandler } from 'express';
import { cache } from '../services/cache.service';

interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * Sliding-window in-memory rate limiter (single instance / dev).
 * When scaling to multiple instances, swap for a shared store (e.g. Redis).
 */
export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${options.keyPrefix}:${req.userId ?? req.ip ?? 'unknown'}`;
    const now = Date.now();
    let state = cache.get<WindowState>(key);

    if (!state || now > state.resetAt) {
      state = { count: 0, resetAt: now + options.windowMs };
    }
    state.count += 1;

    if (state.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a moment.' },
      });
    }

    cache.set(key, state, options.windowMs);
    next();
  };
}
