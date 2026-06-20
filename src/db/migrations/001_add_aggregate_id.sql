-- Migration 001: add aggregate_id and metadata to event_ledger
-- Safe to run against existing data — backfills with 'system'
-- Run: psql $DATABASE_URL -f src/db/migrations/001_add_aggregate_id.sql

ALTER TABLE event_ledger
  ADD COLUMN IF NOT EXISTS aggregate_id TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS metadata     JSONB;

CREATE INDEX IF NOT EXISTS idx_event_ledger_aggregate
  ON event_ledger (aggregate_id, seq ASC);

COMMENT ON COLUMN event_ledger.aggregate_id IS
  'Scopes the event to its owning entity: portfolio_id, security_id, policy_id, etc.';

COMMENT ON COLUMN event_ledger.metadata IS
  'Optional envelope metadata: user_id, strategy_id, client_request_id, etc.';
