import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'SHOP_CLOSED'
  | 'ORDER_LIMIT_REACHED'
  | 'INVALID_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'AMOUNT_MISMATCH'
  | 'PAYMENT_PROVIDER_NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class PaymentProviderNotConfiguredError extends AppError {
  constructor(
    message = 'Payment provider is not configured. Please configure Paytm credentials.'
  ) {
    super(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(409, 'CONFLICT', message);
  }
}

export class OutOfStockError extends AppError {
  constructor(message = 'Some items are out of stock') {
    super(409, 'OUT_OF_STOCK', message);
  }
}

export class ShopClosedError extends AppError {
  constructor(message = 'The food shop is currently closed') {
    super(409, 'SHOP_CLOSED', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, 'BAD_REQUEST', message);
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment could not be verified', code: ErrorCode = 'INVALID_PAYMENT') {
    super(400, code, message);
  }
}

export function isZodError(err: unknown): err is ZodError {
  return err instanceof ZodError;
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
