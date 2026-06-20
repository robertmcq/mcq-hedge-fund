/**
 * Replay Engine — deterministic state rebuild from the event ledger.
 *
 * Usage:
 *   const result = await replayFromLedger({
 *     consumer_id: 'panel3-risk',
 *     from_seq: 0,          // rebuild from scratch
 *     batch_size: 500,
 *     handlers: { ... },   // same handlers as live bus
 *     emit_to_bus: false,  // dry-run rebuild, do not fire live side-effects
 *   });
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
  /** Override start seq (default: resume from saved cursor). */
  from_seq?: number;
  /** Override end seq (default: latest). */
  to_seq?: number;
  /** Events per DB fetch (default 500). */
  batch_size?: number;
  /** If true, publishes replayed events to the live bus so handlers run. */
  emit_to_bus?: boolean;
  /** Optional per-event callback for custom state projections. */
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
    `[replay] Starting for consumer=${consumer_id} from_seq=${currentSeq} ` +
    `emit_to_bus=${emit_to_bus}`
  );

  while (true) {
    const batch = await readEvents({
      fromSeq:    currentSeq + 1,
      toSeq:      to_seq,
      limit:      batch_size,
    });

    if (!batch.length) break;

    for (const event of batch) {
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
        lastSeq = event.seq!;
        totalReplayed++;
      } catch (err) {
        errors.push({ seq: event.seq!, error: (err as Error).message });
        console.error(
          `[replay] Error at seq=${event.seq} type=${event.event_type}:`,
          (err as Error).message
        );
      }
    }

    currentSeq = lastSeq;

    // Save cursor progress after each batch
    await saveCursor({ consumer_id, last_seq: lastSeq, updated_at: new Date().toISOString() });

    // If batch was smaller than batch_size, we've reached the end
    if (batch.length < batch_size) break;
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

/**
 * Convenience: replay only events matching specific types.
 * Useful for rebuilding a single panel without processing unrelated events.
 */
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
    try {
      if (opts?.emit_to_bus) {
        await bus.publish({ event_type: event.event_type, payload: event.payload, occurred_at: event.occurred_at });
      }
      if (opts?.on_event) await opts.on_event(event);
      lastSeq = event.seq!;
      totalReplayed++;
    } catch (err) {
      errors.push({ seq: event.seq!, error: (err as Error).message });
    }
  }

  await saveCursor({ consumer_id, last_seq: lastSeq, updated_at: new Date().toISOString() });

  return { consumer_id, events_replayed: totalReplayed, last_seq: lastSeq, duration_ms: Date.now() - start, errors };
}
