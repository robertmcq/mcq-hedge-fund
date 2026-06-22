/**
 * Projection Core — aggregate replay.
 *
 * replayAggregate rebuilds current state for one aggregate by:
 *   1. Loading all events from the ledger scoped to aggregate_id
 *   2. Applying them in seq order through the panel reducer
 *   3. Returning the final projection state
 *
 * as_of_seq enables point-in-time replay ("state at seq 12345").
 *
 * Discipline rule: routes read ONLY via replayAggregate, never from
 * mutable in-memory state directly.
 */

import { getLedgerPool } from '../../events/ledger/store';
import { applyEvents, Reducer } from './reducer';
import type { LedgerEvent } from '../../events/ledger/types';

export async function loadAggregateEvents(
  aggregate_id: string,
  as_of_seq?: number
): Promise<LedgerEvent[]> {
  const db = getLedgerPool();
  const params: unknown[] = [aggregate_id];
  let seqClause = '';
  if (as_of_seq !== undefined) {
    params.push(as_of_seq);
    seqClause = `AND seq <= $${params.length}`;
  }

  const { rows } = await db.query<{
    seq: string; event_id: string; event_type: string; aggregate_id: string;
    schema_version: number; payload: unknown; occurred_at: Date;
    correlation_id: string | null; source: string; metadata: unknown;
  }>(
    `SELECT seq, event_id, event_type, aggregate_id, schema_version, payload,
            occurred_at, correlation_id, source, metadata
     FROM event_ledger
     WHERE aggregate_id = $1 ${seqClause}
     ORDER BY seq ASC`,
    params
  );

  return rows.map((r) => ({
    seq:            Number(r.seq),
    event_id:       r.event_id,
    event_type:     r.event_type,
    aggregate_id:   r.aggregate_id,
    schema_version: r.schema_version as 1,
    payload:        r.payload,
    occurred_at:    r.occurred_at.toISOString(),
    correlation_id: r.correlation_id ?? undefined,
    source:         r.source as LedgerEvent['source'],
    metadata:       r.metadata ?? undefined,
  }));
}

export async function replayAggregate<S>(
  aggregate_id: string,
  reducer: Reducer<S>,
  initialState: S,
  as_of_seq?: number
): Promise<{ state: S; event_count: number; last_seq: number | null }> {
  const events = await loadAggregateEvents(aggregate_id, as_of_seq);
  const state = applyEvents(events, reducer, initialState);
  const last_seq = events.length ? events[events.length - 1].seq! : null;
  return { state, event_count: events.length, last_seq };
}
