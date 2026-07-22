/**
 * MCQ Ventures — API Key Validation Middleware
 * Validates incoming x-api-key headers against the MCQ key format,
 * extracts tier, verifies checksum, and checks revocation state.
 *
 * Usage:
 *   router.use(validateApiKey(['ENT', 'PRO']));
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import type { KeyTier } from './key-generator';

// ─── Checksum (must match generator) ─────────────────────────────────────────
function checksum32(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

// ─── Format validation ────────────────────────────────────────────────────────
export function parseApiKey(raw: string): {
  valid: boolean;
  tier?: KeyTier;
  reason?: string;
} {
  const pattern = /^MCQ_(ENT|PRO|OPS)_([0-9A-Za-z]+)_([0-9A-Za-z]{20,})_([0-9a-f]{8})$/;
  const match = raw.match(pattern);

  if (!match) {
    return { valid: false, reason: 'MALFORMED_KEY' };
  }

  const [, tier, timestamp, entropy, providedCrc] = match;
  const body = `MCQ_${tier}_${timestamp}_${entropy}`;
  const expectedCrc = checksum32(body);

  if (providedCrc !== expectedCrc) {
    return { valid: false, reason: 'CHECKSUM_MISMATCH' };
  }

  return { valid: true, tier: tier as KeyTier };
}

// ─── DB revocation check (interface — wire to your db layer) ──────────────────
// Replace with actual DB call against your api_keys table.
// Table schema: { key_hash TEXT PK, tier TEXT, revoked BOOLEAN, created_at TIMESTAMPTZ }
async function isKeyRevoked(keyHash: string): Promise<boolean> {
  // TODO: wire to src/db — SELECT revoked FROM api_keys WHERE key_hash = $1
  void keyHash;
  return false;
}

// ─── Express middleware factory ───────────────────────────────────────────────
export function validateApiKey(allowedTiers: KeyTier[] = ['ENT', 'PRO', 'OPS']) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const raw = req.headers['x-api-key'];

    if (!raw || typeof raw !== 'string') {
      res.status(401).json({ error: 'MISSING_API_KEY' });
      return;
    }

    const parsed = parseApiKey(raw);

    if (!parsed.valid) {
      res.status(401).json({ error: parsed.reason });
      return;
    }

    if (!allowedTiers.includes(parsed.tier!)) {
      res.status(403).json({ error: 'TIER_NOT_AUTHORIZED', required: allowedTiers });
      return;
    }

    const keyHash = createHash('sha256').update(raw).digest('hex');
    const revoked = await isKeyRevoked(keyHash);

    if (revoked) {
      res.status(401).json({ error: 'KEY_REVOKED' });
      return;
    }

    // Attach parsed context to request for downstream handlers
    (req as Request & { mcqKeyTier: KeyTier }).mcqKeyTier = parsed.tier!;
    next();
  };
}
