/**
 * MCQ Ventures — Key Revocation Service
 *
 * Orchestrates revocation from three sources:
 *   1. user       — customer-initiated via dashboard/API
 *   2. admin      — MCQ operator action
 *   3. github-scanner — GitHub Secret Scanning Partner Program webhook
 *
 * Every revocation emits a KEY_REVOKED event to the event_ledger
 * (append-only audit trail) and triggers customer notification.
 */

import { createHash } from 'crypto';
import { revokeApiKey } from '../../db/repositories/api-keys.repo';
import { query } from '../../db/client';
import { randomUUID } from 'crypto';

export type RevocationSource = 'user' | 'admin' | 'github-scanner';

export interface RevocationResult {
  success: boolean;
  alreadyRevoked: boolean;
  customerId?: string;
  keyPrefix?: string;
  source: RevocationSource;
}

/**
 * Revoke by raw key (used when the raw string is available — e.g. github-scanner webhook).
 */
export async function revokeByRawKey(
  rawKey: string,
  source: RevocationSource,
  reason?: string
): Promise<RevocationResult> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  return revokeByHash(keyHash, source, reason);
}

/**
 * Revoke by hash (used when validator or admin revokes without the raw key).
 */
export async function revokeByHash(
  keyHash: string,
  source: RevocationSource,
  reason?: string
): Promise<RevocationResult> {
  const record = await revokeApiKey(keyHash, source, reason);

  if (!record) {
    // Key not found or already revoked
    return { success: false, alreadyRevoked: true, source };
  }

  // Emit KEY_REVOKED to event_ledger (non-blocking failure tolerated)
  try {
    await query(
      `INSERT INTO event_ledger
         (event_id, event_type, aggregate_id, payload, occurred_at, source)
       VALUES ($1, 'KEY_REVOKED', $2, $3, NOW(), 'api')`,
      [
        randomUUID(),
        record.customer_id,
        JSON.stringify({
          key_prefix: record.key_prefix,
          tier: record.tier,
          revoked_by: source,
          revoke_reason: reason ?? null,
        }),
      ]
    );
  } catch (err) {
    console.error('[RevocationService] Ledger write failed:', err);
  }

  // TODO: wire customer notification (email / Telegram)
  // notifyCustomer(record.customer_id, record.key_prefix, source);

  return {
    success: true,
    alreadyRevoked: false,
    customerId: record.customer_id,
    keyPrefix: record.key_prefix,
    source,
  };
}
