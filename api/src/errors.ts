import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'API_ERROR',
  ) {
    super(message);
  }
}

export function notFound(message = 'Resource not found'): never {
  throw new ApiError(404, message, 'NOT_FOUND');
}

export function forbidden(message = 'You do not have permission for this action'): never {
  throw new ApiError(403, message, 'FORBIDDEN');
}

export function unauthorized(message = 'Authentication required'): never {
  throw new ApiError(401, message, 'UNAUTHORIZED');
}

export function badRequest(message = 'Invalid request'): never {
  throw new ApiError(400, message, 'BAD_REQUEST');
}

export function serviceUnavailable(message = 'Service temporarily unavailable'): never {
  throw new ApiError(503, message, 'SERVICE_UNAVAILABLE');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      requestId: req.requestId,
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      ok: false,
      code: err.code,
      message: err.message,
      requestId: req.requestId,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown server error';
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  res.status(500).json({
    ok: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    requestId: req.requestId,
  });
}
