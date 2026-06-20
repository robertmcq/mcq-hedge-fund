import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  status?: number;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal server error';
  console.error(`[${req.headers['x-request-id']}] ${status} ${message}`);
  res.status(status).json({
    error: message,
    request_id: req.headers['x-request-id'],
  });
}
