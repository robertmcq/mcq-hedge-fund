/**
 * In-process domain event bus.
 * Pub/sub with typed subscribers. Errors in subscribers are caught and logged
 * so one bad handler never crashes the process.
 */

import type { DomainEvent } from './types';

type Handler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

class EventBus {
  private handlers = new Map<string, Handler[]>();

  subscribe<T>(eventType: string, handler: Handler<T>): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler as Handler);
    this.handlers.set(eventType, list);
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const list = this.handlers.get(event.event_type) ?? [];
    await Promise.all(
      list.map((h) =>
        (h(event as DomainEvent<unknown>) as Promise<void>).catch((err) => {
          console.error(`[bus] Handler error for ${event.event_type}:`, err);
        })
      )
    );
  }
}

export const bus = new EventBus();
