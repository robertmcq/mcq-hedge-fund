/**
 * Event Ledger — canonical types.
 *
 * Every domain event written to the ledger carries:
 *  - a monotonic sequence number (assigned by the store)
 *  - a schema_version so consumers can detect drift
 *  - a correlation_id for tracing causal chains
 *
 * NEVER mutate a ledger record. Corrections are new events.
 */

export type EventSchemaVersion = 1;

export interface LedgerEvent<T = unknown> {
  /** Auto-assigned by the store. Undefined before persistence. */
  seq?: number;
  event_id: string;                  // UUID v4
  event_type: string;                // e.g. 'MarketDataUpdated'
  schema_version: EventSchemaVersion;
  payload: T;
  occurred_at: string;               // ISO-8601
  correlation_id?: string;           // trace chain across events
  source: 'feed' | 'api' | 'agent' | 'seed' | 'replay';
}

/** Replay cursor — tracks how far a consumer has replayed. */
export interface ReplayCursor {
  consumer_id: string;
  last_seq: number;
  updated_at: string;
}

/** Result returned by the replay engine after rebuilding state. */
export interface ReplayResult {
  consumer_id: string;
  events_replayed: number;
  last_seq: number;
  duration_ms: number;
  errors: Array<{ seq: number; error: string }>;
}
