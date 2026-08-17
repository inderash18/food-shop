import { ZodSchema } from 'zod';
import { Request, Response, NextFunction, RequestHandler } from 'express';

type Source = 'body' | 'query' | 'params';

/**
 * Validates a request part against a Zod schema. On failure sends 400 VALIDATION_ERROR.
 */
export function validate(schema: ZodSchema, source: Source = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(
        Object.assign(new Error('Validation failed'), {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: issues,
        })
      );
    }
    (req as Request & Record<string, unknown>)[source === 'body' ? 'validatedBody' : `validated${source.charAt(0).toUpperCase()}${source.slice(1)}`] =
      result.data;
    next();
  };
}
