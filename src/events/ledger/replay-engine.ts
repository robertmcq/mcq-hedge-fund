/**
 * Replay Engine — deterministic state rebuild from the event ledger.
 *
 * Risk mitigated:
 *   - Seed data masking real behavior: replay uses real ledger events.
 *   - Panel isolation leakage: each panel replays independently via consumer_id.
 *   - State integrity: panels can self-heal by replaying from their last cursor.
 */

import { readEvents, loadCursor, saveCursor } from './store';
import { bus } from '../bus';
import type { LedgerEvent, ReplayResult } from './types';

export interface ReplayOptions {
  consumer_id: string;
  from_seq?: number;
  to_seq?: number;
  batch_size?: number;
  emit_to_bus?: boolean;
  on_event?: (event: LedgerEvent) => Promise<void>;
}

export async function replayFromLedger(opts: ReplayOptions): Promise<ReplayResult> {
  const {
    consumer_id,
    from_seq,
    to_seq,
    batch_size = 500,
    emit_to_bus = false,
    on_event,
  } = opts;

  const start = Date.now();
  const cursor = await loadCursor(consumer_id);
  let currentSeq = from_seq ?? cursor.last_seq;
  let totalReplayed = 0;
  let lastSeq = currentSeq;
  const errors: ReplayResult['errors'] = [];

  console.log(
    `[replay] Starting for consumer=${consumer_id} from_seq=${currentSeq} emit_to_bus=${emit_to_bus}`
  );

  let hasMore = true;
  while (hasMore) {
    const batch = await readEvents({
      fromSeq: currentSeq + 1,
      toSeq:   to_seq,
      limit:   batch_size,
    });

    if (!batch.length) break;

    for (const event of batch) {
      totalReplayed++;
      lastSeq = event.seq!;

      try {
        if (emit_to_bus) {
          await bus.publish({
            event_type:  event.event_type,
            payload:     event.payload,
            occurred_at: event.occurred_at,
          });
        }
        if (on_event) {
          await on_event(event);
        }
      } catch (err) {
        errors.push({ seq: event.seq!, error: (err as Error).message });
        console.error(
          `[replay] Error at seq=${event.seq} type=${event.event_type}:`,
          (err as Error).message
        );
      }
    }

    currentSeq = lastSeq;
    await saveCursor({ consumer_id, last_seq: lastSeq, updated_at: new Date().toISOString() });

    if (batch.length < batch_size) hasMore = false;
  }

  const result: ReplayResult = {
    consumer_id,
    events_replayed: totalReplayed,
    last_seq:        lastSeq,
    duration_ms:     Date.now() - start,
    errors,
  };

  console.log(
    `[replay] Complete: consumer=${consumer_id} replayed=${totalReplayed} ` +
    `last_seq=${lastSeq} duration=${result.duration_ms}ms errors=${errors.length}`
  );

  return result;
}

export async function replayEventTypes(
  consumer_id: string,
  eventTypes: string[],
  opts?: Partial<ReplayOptions>
): Promise<ReplayResult> {
  const cursor = await loadCursor(consumer_id);
  const from_seq = opts?.from_seq ?? cursor.last_seq;

  const start = Date.now();
  const errors: ReplayResult['errors'] = [];
  let totalReplayed = 0;
  let lastSeq = from_seq;

  const batch = await readEvents({ fromSeq: from_seq + 1, eventTypes, limit: opts?.batch_size ?? 5000 });

  for (const event of batch) {
    totalReplayed++;
    lastSeq = event.seq!;
    try {
      if (opts?.emit_to_bus) {
        await bus.publish({ event_type: event.event_type, payload: event.payload, occurred_at: event.occurred_at });
      }
      if (opts?.on_event) await opts.on_event(event);
    } catch (err) {
      errors.push({ seq: event.seq!, error: (err as Error).message });
    }
  }

  await saveCursor({ consumer_id, last_seq: lastSeq, updated_at: new Date().toISOString() });
  return { consumer_id, events_replayed: totalReplayed, last_seq: lastSeq, duration_ms: Date.now() - start, errors };
}
