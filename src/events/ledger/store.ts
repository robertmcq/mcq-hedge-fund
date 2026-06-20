/**
 * Event Ledger Store — append-only PostgreSQL backend.
 *
 * Guarantees:
 *   - Events are written atomically with a monotonic sequence (BIGSERIAL).
 *   - No UPDATE or DELETE is ever issued against event_ledger.
 *   - Reads are keyed by seq range for replay and by event_type for filtering.
 *
 * Risk mitigated: audit backbone for every state transition.
 */

import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import type { LedgerEvent, ReplayCursor } from './types';
import { validatePayload, CURRENT_SCHEMA_VERSION } from './schema-registry';

let pool: Pool | null = null;

export function initLedgerPool(connectionString?: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString ?? process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
    pool.on('error', (err) => console.error('[ledger:pool] Unexpected error:', err));
  }
  return pool;
}

export function getLedgerPool(): Pool {
  if (!pool) throw new Error('[ledger] Pool not initialised. Call initLedgerPool() first.');
  return pool;
}

/**
 * Append a single event to the ledger.
 * Validates schema before writing. Returns the assigned seq number.
 */
export async function appendEvent<T>(
  event: Omit<LedgerEvent<T>, 'seq'>,
  client?: PoolClient
): Promise<number> {
  validatePayload(event.event_type, event.payload);

  const eventId = event.event_id ?? randomUUID();
  const db = client ?? getLedgerPool();

  const { rows } = await db.query<{ seq: string }>(
    `INSERT INTO event_ledger
       (event_id, event_type, schema_version, payload, occurred_at, correlation_id, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING seq`,
    [
      eventId,
      event.event_type,
      event.schema_version ?? CURRENT_SCHEMA_VERSION,
      JSON.stringify(event.payload),
      event.occurred_at,
      event.correlation_id ?? null,
      event.source,
    ]
  );

  return Number(rows[0].seq);
}

/**
 * Read events from the ledger in seq order.
 * @param fromSeq  inclusive lower bound (default 0 = from the beginning)
 * @param toSeq    inclusive upper bound (default = latest)
 * @param eventTypes  optional filter
 * @param limit    max rows per call (default 1000)
 */
export async function readEvents<T = unknown>(opts: {
  fromSeq?: number;
  toSeq?: number;
  eventTypes?: string[];
  limit?: number;
}): Promise<LedgerEvent<T>[]> {
  const { fromSeq = 0, toSeq, eventTypes, limit = 1000 } = opts;
  const db = getLedgerPool();

  const conditions: string[] = ['seq >= $1'];
  const params: unknown[] = [fromSeq];

  if (toSeq !== undefined) {
    params.push(toSeq);
    conditions.push(`seq <= $${params.length}`);
  }
  if (eventTypes && eventTypes.length) {
    params.push(eventTypes);
    conditions.push(`event_type = ANY($${params.length})`);
  }

  params.push(limit);
  const limitClause = `LIMIT $${params.length}`;

  const { rows } = await db.query<{
    seq: string; event_id: string; event_type: string;
    schema_version: number; payload: unknown; occurred_at: Date;
    correlation_id: string | null; source: string;
  }>(
    `SELECT seq, event_id, event_type, schema_version, payload, occurred_at, correlation_id, source
     FROM event_ledger
     WHERE ${conditions.join(' AND ')}
     ORDER BY seq ASC
     ${limitClause}`,
    params
  );

  return rows.map((r) => ({
    seq:            Number(r.seq),
    event_id:       r.event_id,
    event_type:     r.event_type,
    schema_version: r.schema_version as 1,
    payload:        r.payload as T,
    occurred_at:    r.occurred_at.toISOString(),
    correlation_id: r.correlation_id ?? undefined,
    source:         r.source as LedgerEvent['source'],
  }));
}

/** Persist a replay cursor position. */
export async function saveCursor(cursor: ReplayCursor): Promise<void> {
  const db = getLedgerPool();
  await db.query(
    `INSERT INTO replay_cursors (consumer_id, last_seq, updated_at)
     VALUES ($1,$2,$3)
     ON CONFLICT (consumer_id) DO UPDATE
       SET last_seq = EXCLUDED.last_seq, updated_at = EXCLUDED.updated_at`,
    [cursor.consumer_id, cursor.last_seq, cursor.updated_at]
  );
}

/** Load a replay cursor (returns seq=0 if not found). */
export async function loadCursor(consumer_id: string): Promise<ReplayCursor> {
  const db = getLedgerPool();
  const { rows } = await db.query<{ last_seq: string; updated_at: Date }>(
    'SELECT last_seq, updated_at FROM replay_cursors WHERE consumer_id=$1',
    [consumer_id]
  );
  if (!rows.length) return { consumer_id, last_seq: 0, updated_at: new Date().toISOString() };
  return {
    consumer_id,
    last_seq:   Number(rows[0].last_seq),
    updated_at: rows[0].updated_at.toISOString(),
  };
}
