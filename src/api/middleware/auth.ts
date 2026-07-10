/**
 * API Key authentication middleware — mcq-hedge-fund
 *
 * All routes require a valid x-api-key header.
 * The expected key is read from process.env.API_KEY (injected from AWS Secrets Manager).
 *
 * Exempt routes:
 *   GET /api/health  — unauthenticated health probe for ECS/ALB health checks
 *
 * Usage in app.ts:
 *   import { requireApiKey } from './middleware/auth';
 *   app.use(requireApiKey);
 */
import { Request, Response, NextFunction } from 'express';

const HEALTH_PATH = '/api/health';

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Always allow health probes through
  if (req.path === HEALTH_PATH && req.method === 'GET') {
    next();
    return;
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Fail closed: if the env var isn't set, deny all non-health requests
    res.status(503).json({
      ok:    false,
      error: 'Service misconfigured — API_KEY not set',
    });
    return;
  }

  const provided = req.headers['x-api-key'];
  if (!provided || provided !== apiKey) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  next();
}
