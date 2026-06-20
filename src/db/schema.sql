-- MCQ Hedge Fund — Postgres schema
-- Run once against your database: psql $DATABASE_URL -f src/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Panel 5: Governance, Action Queue, Audit ──────────────────────────────

CREATE TABLE IF NOT EXISTS action_items (
  action_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  source_panel       TEXT             NOT NULL,
  entity_type        TEXT             NOT NULL,
  entity_id          UUID             NOT NULL,
  action_type        TEXT             NOT NULL CHECK (action_type IN ('Trade','Research','Governance')),
  priority           SMALLINT         NOT NULL CHECK (priority BETWEEN 1 AND 5),
  confidence         NUMERIC(5,4)     NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  rationale_text     TEXT,
  proposed_payload   JSONB,
  status             TEXT             NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','approved','rejected','deferred','superseded')),
  agent_created      BOOLEAN          NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_action_items_status   ON action_items (status);
CREATE INDEX IF NOT EXISTS idx_action_items_entity   ON action_items (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items (priority, confidence DESC);

CREATE TABLE IF NOT EXISTS action_approvals (
  approval_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id          UUID             NOT NULL REFERENCES action_items (action_id),
  user_id            UUID             NOT NULL,
  decision           TEXT             NOT NULL CHECK (decision IN ('approve','modify','reject')),
  decision_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  comment            TEXT,
  resulting_order_id UUID
);

CREATE TABLE IF NOT EXISTS decision_log (
  decision_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT        NOT NULL,
  entity_id      UUID        NOT NULL,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id        TEXT        NOT NULL,   -- UUID or literal 'agent'
  decision_type  TEXT        NOT NULL,
  context_panel  TEXT,
  details        JSONB
);

CREATE INDEX IF NOT EXISTS idx_decision_log_entity ON decision_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_time   ON decision_log (occurred_at DESC);

-- ─── Kalshi real-time orderbook cache ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS kalshi_orderbook_snapshots (
  ticker       TEXT        NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  yes_levels   JSONB       NOT NULL,  -- [[price, size], ...]
  no_levels    JSONB       NOT NULL,
  PRIMARY KEY (ticker, captured_at)
) PARTITION BY RANGE (captured_at);

CREATE TABLE IF NOT EXISTS kalshi_ticker_snapshots (
  ticker       TEXT        NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  yes_bid      INTEGER,
  yes_ask      INTEGER,
  no_bid       INTEGER,
  no_ask       INTEGER,
  last_price   INTEGER,
  volume       INTEGER,
  PRIMARY KEY (ticker, captured_at)
) PARTITION BY RANGE (captured_at);

COMMENT ON TABLE kalshi_orderbook_snapshots IS 'Written by the Kalshi WebSocket feed handler on each snapshot or reconciled delta.';
COMMENT ON TABLE kalshi_ticker_snapshots    IS 'Written by the Kalshi WebSocket feed handler on each ticker update.';
