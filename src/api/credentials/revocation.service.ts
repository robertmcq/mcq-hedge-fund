/**
 * MCQ Ventures — Key Revocation Service
 *
 * Orchestrates revocation from three sources:
 *   1. user           — customer-initiated via dashboard/API
 *   2. admin          — MCQ operator action
 *   3. github-scanner — GitHub Secret Scanning Partner Program webhook
 *
 * Every revocation:
 *   - Marks the key revoked in api_keys table
 *   - Emits KEY_REVOKED event to event_ledger (append-only audit trail)
 *   - Sends transactional email notification via AWS SES
 */

import { createHash, randomUUID } from 'crypto';
import { revokeApiKey, getApiKeyByHash } from '../../db/repositories/api-keys.repo';
import { query } from '../../db/client';
import { sendEmail } from '../notifications/email.service';
import { buildKeyRevokedEmail } from '../notifications/templates/key-revoked';

export type RevocationSource = 'user' | 'admin' | 'github-scanner';

export interface RevocationResult {
  success: boolean;
  alreadyRevoked: boolean;
  customerId?: string;
  keyPrefix?: string;
  source: RevocationSource;
  notificationCorrelationId?: string;
}

/**
 * Revoke by raw key (used when raw string is available — e.g. github-scanner webhook).
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
    return { success: false, alreadyRevoked: true, source };
  }

  // ── 1. Emit KEY_REVOKED to event_ledger ───────────────────────────────────
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

  // ── 2. Fetch customer email ───────────────────────────────────────────────────
  // customer_id is the Cognito sub or internal ID; email resolved from customers table.
  // TODO: replace raw query with customers.repo when that module is built.
  let customerEmail: string | null = null;
  try {
    const rows = await query<{ email: string }>(
      'SELECT email FROM customers WHERE customer_id = $1 LIMIT 1',
      [record.customer_id]
    );
    customerEmail = rows[0]?.email ?? null;
  } catch {
    // customers table not yet provisioned — skip notification, don't fail revocation
    console.warn('[RevocationService] Could not resolve customer email — customers table may not exist yet');
  }

  // ── 3. Send revocation email via SES ─────────────────────────────────────────
  let notificationCorrelationId: string | undefined;
  if (customerEmail) {
    const template = buildKeyRevokedEmail({
      keyPrefix: record.key_prefix,
      tier: record.tier,
      source,
      reason,
    });
    notificationCorrelationId = await sendEmail({
      to: customerEmail,
      subject: template.subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  return {
    success: true,
    alreadyRevoked: false,
    customerId: record.customer_id,
    keyPrefix: record.key_prefix,
    source,
    notificationCorrelationId,
  };
}
