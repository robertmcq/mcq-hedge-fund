/**
 * Core types for the MCQ Event Ledger.
 *
 * LedgerEvent is the canonical shape of a persisted event row.
 * aggregate_id scopes the event to its owning entity (portfolio, security, policy…)
 * which is required for replayAggregate() to build isolated projections.
 */

export type EventSchemaVersion = 1;

export interface LedgerEvent<T = unknown> {
  /** Monotonic sequence assigned by Postgres BIGSERIAL. Undefined before insert. */
  seq?:            number;
  event_id:        string;
  event_type:      string;
  /** Owning entity: portfolio_id, security_id, policy_id, 'system', etc. */
  aggregate_id:    string;
  schema_version:  EventSchemaVersion;
  payload:         T;
  occurred_at:     string;
  correlation_id?: string;
  source:          'feed' | 'api' | 'agent' | 'seed' | 'replay';
  metadata?:       unknown;
}

export interface ReplayCursor {
  consumer_id: string;
  last_seq:    number;
  updated_at:  string;
}

export interface ReplayResult {
  consumer_id:     string;
  events_replayed: number;
  last_seq:        number;
  duration_ms:     number;
  errors:          Array<{ seq: number; error: string }>;
}
