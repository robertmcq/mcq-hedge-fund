-- MCQ Hedge Fund — Migration 004: API Keys
-- Idempotent. Run after 003 (or initial schema).
-- Tracks issued credentials: stored as SHA-256 hash only.
-- Raw key is shown to customer once at issuance and never stored.

CREATE TABLE IF NOT EXISTS api_keys (
  key_hash      TEXT         PRIMARY KEY,           -- SHA-256(raw_key)
  key_prefix    TEXT         NOT NULL,              -- e.g. MCQ_ENT — safe to log/display
  tier          TEXT         NOT NULL
    CHECK (tier IN ('ENT', 'PRO', 'OPS')),
  customer_id   TEXT         NOT NULL,
  label         TEXT,                               -- human-readable name set by customer
  revoked       BOOLEAN      NOT NULL DEFAULT FALSE,
  revoked_at    TIMESTAMPTZ,
  revoked_by    TEXT,                               -- 'user' | 'admin' | 'github-scanner'
  revoke_reason TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ,
  ledger_seq    BIGINT       REFERENCES event_ledger(seq)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_customer
  ON api_keys (customer_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier
  ON api_keys (tier);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked
  ON api_keys (revoked) WHERE revoked = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_created
  ON api_keys (created_at DESC);

-- Prevent UPDATE of key_hash, tier, customer_id, created_at after insert (immutable identity fields)
-- Only revoked, revoked_at, revoked_by, revoke_reason, last_used_at, label are mutable.
CREATE OR REPLACE RULE api_keys_no_identity_mutation AS
  ON UPDATE TO api_keys
  WHERE (
    NEW.key_hash      <> OLD.key_hash      OR
    NEW.tier          <> OLD.tier          OR
    NEW.customer_id   <> OLD.customer_id   OR
    NEW.created_at    <> OLD.created_at
  )
  DO INSTEAD NOTHING;
