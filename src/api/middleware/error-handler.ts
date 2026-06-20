import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[errorHandler]', err.message, err.stack);
  res.status(500).json({ ok: false, error: err.message });
}
