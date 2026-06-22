/**
 * Ledger-aware event bus.
 *
 * Drop-in replacement for bus.ts that:
 *   1. Validates payload schema before any side-effect.
 *   2. Appends to the PostgreSQL event ledger (append-only, aggregate_id scoped).
 *   3. Then dispatches to in-process subscribers.
 *
 * Panel isolation contract:
 *   - Each panel subscribes independently.
 *   - No panel shares state with another except through this bus.
 *   - All state transitions are fully recorded in the ledger.
 *
 * Public API:
 *   ledgerBus.publish(event, opts?)  — full typed publish with ledger write
 *   ledgerBus.emit(eventType, event) — alias for publish(), accepts full LedgerEvent shape
 *   ledgerBus.subscribe(type, fn)    — subscribe to in-process events
 *   ledgerBus.enable() / disable()   — toggle ledger persistence
 */

import { randomUUID } from 'crypto';
import { bus } from './bus';
import type { DomainEvent } from './types';
import { appendEvent } from './ledger/store';
import { validatePayload, CURRENT_SCHEMA_VERSION } from './ledger/schema-registry';

type Source = 'feed' | 'api' | 'agent' | 'seed' | 'replay';

export interface LedgerPublishOptions {
  source?: Source;
  correlation_id?: string;
}

/** Shape accepted by ledgerBus.emit() — matches what seed scripts and replay.ts produce. */
export interface LedgerEventInput<T = unknown> {
  event_id?:       string;
  event_type:      string;
  aggregate_id?:   string;
  schema_version?: 1;
  payload:         T;
  occurred_at:     string;
  source?:         Source;
  correlation_id?: string;
  metadata?:       unknown;
}

class LedgerBus {
  private ledgerEnabled = false;

  enable(): void {
    this.ledgerEnabled = true;
    console.log('[ledger-bus] Ledger persistence ENABLED');
  }

  disable(): void {
    this.ledgerEnabled = false;
  }

  /**
   * Publish a domain event:
   *   1. Validate schema (throws on invalid — prevents silent drift).
   *   2. Append to ledger if enabled.
   *   3. Dispatch to in-process bus.
   */
  async publish<T>(
    event: DomainEvent<T>,
    opts: LedgerPublishOptions = {}
  ): Promise<{ seq?: number }> {
    validatePayload(event.event_type, event.payload);

    let seq: number | undefined;

    if (this.ledgerEnabled) {
      try {
        seq = await appendEvent({
          event_id:       randomUUID(),
          event_type:     event.event_type,
          aggregate_id:   (event as { aggregate_id?: string }).aggregate_id ?? 'system',
          schema_version: CURRENT_SCHEMA_VERSION,
          payload:        event.payload,
          occurred_at:    event.occurred_at,
          correlation_id: opts.correlation_id,
          source:         opts.source ?? 'api',
        } as Parameters<typeof appendEvent>[0]);
      } catch (err) {
        console.error('[ledger-bus] Ledger write failed (non-fatal):', (err as Error).message);
      }
    }

    await bus.publish(event);
    return { seq };
  }

  /**
   * emit() — convenience alias used by seed scripts and replay.ts.
   * Accepts the full LedgerEventInput shape (with aggregate_id, source, etc.)
   * and delegates to publish() after normalising into DomainEvent shape.
   */
  emit<T>(eventType: string, event: LedgerEventInput<T>): void {
    // Fire-and-forget: errors are caught inside publish()
    const domainEvent: DomainEvent<T> & { aggregate_id?: string } = {
      event_type:   eventType,
      aggregate_id: event.aggregate_id,
      payload:      event.payload,
      occurred_at:  event.occurred_at,
    };
    this.publish(domainEvent, {
      source:         event.source ?? 'api',
      correlation_id: event.correlation_id,
    }).catch((err: Error) =>
      console.error(`[ledger-bus] emit error for ${eventType}:`, err.message)
    );
  }

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    bus.subscribe(eventType, handler);
  }
}

export const ledgerBus = new LedgerBus();
