-- MCQ Hedge Fund — PostgreSQL schema
-- Append-only event ledger + Panel 5 governance tables
-- Run: psql $DATABASE_URL -f src/db/schema.sql

-- ────────────────────────────────────────────────────────────────────
-- 1. EVENT LEDGER (append-only — no UPDATE, no DELETE ever)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_ledger (
  seq              BIGSERIAL PRIMARY KEY,
  event_id         UUID        NOT NULL UNIQUE,
  event_type       TEXT        NOT NULL,
  schema_version   SMALLINT    NOT NULL DEFAULT 1,
  payload          JSONB       NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL,
  correlation_id   UUID,
  source           TEXT        NOT NULL
    CHECK (source IN ('feed','api','agent','seed','replay')),
  inserted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce append-only: block DELETE and UPDATE at database level
CREATE OR REPLACE RULE event_ledger_no_delete AS
  ON DELETE TO event_ledger DO INSTEAD NOTHING;

CREATE OR REPLACE RULE event_ledger_no_update AS
  ON UPDATE TO event_ledger DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_event_ledger_event_type ON event_ledger (event_type);
CREATE INDEX IF NOT EXISTS idx_event_ledger_occurred_at ON event_ledger (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_ledger_correlation ON event_ledger (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- 2. REPLAY CURSORS (one row per consumer, upserted on progress)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS replay_cursors (
  consumer_id  TEXT        PRIMARY KEY,
  last_seq     BIGINT      NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
-- 3. PANEL 5 — GOVERNANCE (action queue, approvals, decision log)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_items (
  action_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_panel         TEXT        NOT NULL,
  entity_type          TEXT        NOT NULL,
  entity_id            TEXT        NOT NULL,
  action_type          TEXT        NOT NULL CHECK (action_type IN ('Trade','Research','Governance')),
  priority             SMALLINT    NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  confidence           NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  rationale_text       TEXT,
  proposed_payload_json JSONB,
  status               TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','approved','rejected','deferred','superseded')),
  created_by_agent_flag BOOLEAN    NOT NULL DEFAULT FALSE,
  ledger_seq           BIGINT      REFERENCES event_ledger(seq)
);

CREATE INDEX IF NOT EXISTS idx_action_items_status         ON action_items (status);
CREATE INDEX IF NOT EXISTS idx_action_items_entity         ON action_items (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_items_priority       ON action_items (priority, confidence DESC);

CREATE TABLE IF NOT EXISTS action_approvals (
  approval_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id          UUID        NOT NULL REFERENCES action_items(action_id),
  user_id            TEXT        NOT NULL,
  decision           TEXT        NOT NULL CHECK (decision IN ('approve','modify','reject')),
  decision_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment            TEXT,
  resulting_order_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_approvals_action ON action_approvals (action_id);

CREATE TABLE IF NOT EXISTS decision_log (
  decision_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT        NOT NULL,
  entity_id      TEXT        NOT NULL,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id        TEXT        NOT NULL,
  decision_type  TEXT        NOT NULL,
  context_panel  TEXT,
  details_json   JSONB,
  ledger_seq     BIGINT      REFERENCES event_ledger(seq)
);

CREATE INDEX IF NOT EXISTS idx_decision_log_entity ON decision_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_time   ON decision_log (timestamp DESC);

-- ────────────────────────────────────────────────────────────────────
-- 4. KALSHI TIME-SERIES (partitioned by captured_at date)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kalshi_ticker_snapshots (
  id              BIGSERIAL,
  market_ticker   TEXT        NOT NULL,
  yes_bid         NUMERIC(6,4),
  yes_ask         NUMERIC(6,4),
  last_price      NUMERIC(6,4),
  volume          BIGINT,
  open_interest   BIGINT,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (captured_at);

CREATE TABLE IF NOT EXISTS kalshi_orderbook_snapshots (
  id              BIGSERIAL,
  market_ticker   TEXT        NOT NULL,
  side            TEXT        NOT NULL CHECK (side IN ('yes','no')),
  price           NUMERIC(6,4) NOT NULL,
  size            INTEGER     NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (captured_at);
