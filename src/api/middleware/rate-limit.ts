/**
 * Rate limiting middleware — mcq-hedge-fund
 *
 * Global:        100 requests per 15 minutes per IP
 * Ledger replay: 10  requests per 60 seconds  per IP (destructive operation)
 * Investor:      60  requests per 60 seconds  per IP (sensitive financial data)
 */
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { ok: false, error: 'Too many requests — slow down' },
  skip: (req) => req.path === '/api/health',
});

export const replayRateLimit = rateLimit({
  windowMs:         60 * 1000,       // 1 minute
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { ok: false, error: 'Replay rate limit exceeded' },
});

export const investorRateLimit = rateLimit({
  windowMs:         60 * 1000,       // 1 minute
  max:              60,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { ok: false, error: 'Investor API rate limit exceeded' },
});
