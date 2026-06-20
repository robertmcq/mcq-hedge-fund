/**
 * Ledger-aware event bus.
 *
 * Drop-in replacement for bus.ts that:
 *   1. Validates payload schema before any side-effect.
 *   2. Appends to the PostgreSQL event ledger (append-only).
 *   3. Then dispatches to in-process subscribers.
 *
 * Panel isolation contract:
 *   - Each panel subscribes independently.
 *   - No panel shares state with another except through this bus.
 *   - All state transitions are fully recorded in the ledger.
 *
 * Usage:
 *   Import { ledgerBus } instead of { bus } in handlers and publisher
 *   once DATABASE_URL is configured. Falls back to in-memory bus if DB unavailable.
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
   * Publish an event:
   *   1. Validate schema (throws on invalid payload — prevents silent drift).
   *   2. Append to ledger if enabled.
   *   3. Dispatch to in-process bus.
   */
  async publish<T>(
    event: DomainEvent<T>,
    opts: LedgerPublishOptions = {}
  ): Promise<{ seq?: number }> {
    // 1. Schema guard — hard fail before any side-effect
    validatePayload(event.event_type, event.payload);

    let seq: number | undefined;

    // 2. Append to ledger
    if (this.ledgerEnabled) {
      try {
        seq = await appendEvent({
          event_id:       randomUUID(),
          event_type:     event.event_type,
          schema_version: CURRENT_SCHEMA_VERSION,
          payload:        event.payload,
          occurred_at:    event.occurred_at,
          correlation_id: opts.correlation_id,
          source:         opts.source ?? 'api',
        });
      } catch (err) {
        // Ledger write failure is logged but does NOT block the live bus.
        // The system stays live; the operator is alerted.
        console.error('[ledger-bus] Ledger write failed (non-fatal):', (err as Error).message);
      }
    }

    // 3. Dispatch to in-process subscribers
    await bus.publish(event);

    return { seq };
  }

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>): void {
    bus.subscribe(eventType, handler);
  }
}

export const ledgerBus = new LedgerBus();
