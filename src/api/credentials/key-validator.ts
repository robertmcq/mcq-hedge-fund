/**
 * MCQ Ventures — API Key Validation Middleware
 * Validates incoming x-api-key headers against the MCQ key format,
 * extracts tier, verifies checksum, and checks revocation state via DB.
 *
 * Usage:
 *   router.use(validateApiKey(['ENT', 'PRO']));
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import type { KeyTier } from './key-generator';
import { getApiKeyByHash, touchApiKey } from '../../db/repositories/api-keys.repo';

// ─── Checksum (must match generator) ─────────────────────────────────────────
function checksum32(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

// ─── Format + checksum validation (no DB) ──────────────────────────────────
export function parseApiKey(raw: string): {
  valid: boolean;
  tier?: KeyTier;
  reason?: string;
} {
  const pattern = /^MCQ_(ENT|PRO|OPS)_([0-9A-Za-z]+)_([0-9A-Za-z]{20,})_([0-9a-f]{8})$/;
  const match = raw.match(pattern);

  if (!match) return { valid: false, reason: 'MALFORMED_KEY' };

  const [, tier, timestamp, entropy, providedCrc] = match;
  const body = `MCQ_${tier}_${timestamp}_${entropy}`;
  const expectedCrc = checksum32(body);

  if (providedCrc !== expectedCrc) return { valid: false, reason: 'CHECKSUM_MISMATCH' };

  return { valid: true, tier: tier as KeyTier };
}

// ─── Express middleware factory ───────────────────────────────────────────────
export function validateApiKey(allowedTiers: KeyTier[] = ['ENT', 'PRO', 'OPS']) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const raw = req.headers['x-api-key'];

    if (!raw || typeof raw !== 'string') {
      res.status(401).json({ error: 'MISSING_API_KEY' });
      return;
    }

    // Gate 1: format + checksum (pure computation, no I/O)
    const parsed = parseApiKey(raw);
    if (!parsed.valid) {
      res.status(401).json({ error: parsed.reason });
      return;
    }

    // Gate 2: tier authorization (no I/O)
    if (!allowedTiers.includes(parsed.tier!)) {
      res.status(403).json({ error: 'TIER_NOT_AUTHORIZED', required: allowedTiers });
      return;
    }

    // Gate 3: DB revocation check
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const record = await getApiKeyByHash(keyHash);

    if (!record) {
      res.status(401).json({ error: 'KEY_NOT_FOUND' });
      return;
    }

    if (record.revoked) {
      res.status(401).json({ error: 'KEY_REVOKED' });
      return;
    }

    // Stamp last_used_at asynchronously — do not block response
    touchApiKey(keyHash).catch((err) =>
      console.error('[KeyValidator] touchApiKey failed:', err)
    );

    // Attach parsed context for downstream handlers
    (req as Request & { mcqKey: { tier: KeyTier; customerId: string; prefix: string } }).mcqKey = {
      tier: parsed.tier!,
      customerId: record.customer_id,
      prefix: record.key_prefix,
    };

    next();
  };
}
