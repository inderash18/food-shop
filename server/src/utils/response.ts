import { Response } from 'express';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendError(res: Response, status: number, code: string, message: string, details?: unknown): void {
  const body: ApiErrorBody = { success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } };
  res.status(status).json(body);
}
