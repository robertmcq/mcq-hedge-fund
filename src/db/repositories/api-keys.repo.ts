/**
 * MCQ Ventures — API Keys Repository
 * All DB operations for the api_keys table.
 * Raw keys are NEVER passed into or out of this module.
 * Only key_hash (SHA-256 of raw key) is stored or queried.
 */

import { query, withClient } from '../client';

export interface ApiKeyRecord {
  key_hash: string;
  key_prefix: string;
  tier: 'ENT' | 'PRO' | 'OPS';
  customer_id: string;
  label: string | null;
  revoked: boolean;
  revoked_at: Date | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  created_at: Date;
  last_used_at: Date | null;
  ledger_seq: bigint | null;
}

export interface InsertApiKeyInput {
  key_hash: string;
  key_prefix: string;
  tier: 'ENT' | 'PRO' | 'OPS';
  customer_id: string;
  label?: string;
  ledger_seq?: bigint;
}

/** Persist a newly issued key. Call immediately after generateApiKey(). */
export async function insertApiKey(input: InsertApiKeyInput): Promise<ApiKeyRecord> {
  const rows = await query<ApiKeyRecord>(
    `INSERT INTO api_keys
       (key_hash, key_prefix, tier, customer_id, label, ledger_seq)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.key_hash,
      input.key_prefix,
      input.tier,
      input.customer_id,
      input.label ?? null,
      input.ledger_seq ?? null,
    ]
  );
  return rows[0]!;
}

/** Primary lookup: used by validation middleware on every request. */
export async function getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
  const rows = await query<ApiKeyRecord>(
    'SELECT * FROM api_keys WHERE key_hash = $1',
    [keyHash]
  );
  return rows[0] ?? null;
}

/** Revoke a key. Source is recorded for audit. */
export async function revokeApiKey(
  keyHash: string,
  revokedBy: 'user' | 'admin' | 'github-scanner',
  reason?: string
): Promise<ApiKeyRecord | null> {
  const rows = await query<ApiKeyRecord>(
    `UPDATE api_keys
     SET revoked = TRUE,
         revoked_at = NOW(),
         revoked_by = $2,
         revoke_reason = $3
     WHERE key_hash = $1
       AND revoked = FALSE
     RETURNING *`,
    [keyHash, revokedBy, reason ?? null]
  );
  return rows[0] ?? null;
}

/** Stamp last_used_at. Call asynchronously — do not await in hot path. */
export async function touchApiKey(keyHash: string): Promise<void> {
  await query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1',
    [keyHash]
  );
}

/** List all keys for a customer (never returns key_hash to caller in API responses). */
export async function listCustomerKeys(customerId: string): Promise<ApiKeyRecord[]> {
  return query<ApiKeyRecord>(
    `SELECT key_hash, key_prefix, tier, customer_id, label,
            revoked, revoked_at, revoked_by, revoke_reason,
            created_at, last_used_at
     FROM api_keys
     WHERE customer_id = $1
     ORDER BY created_at DESC`,
    [customerId]
  );
}
