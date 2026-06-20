/**
 * Lightweight in-process event bus.
 * Replace emit() with a message broker (Redis Streams, SQS, etc.) for production.
 */

import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, DomainEventType } from './types';

type Handler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

class EventBus {
  private handlers = new Map<DomainEventType, Handler[]>();

  subscribe<T>(type: DomainEventType, handler: Handler<T>): void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler as Handler);
  }

  async emit<T>(type: DomainEventType, payload: T): Promise<void> {
    const event: DomainEvent<T> = {
      id: uuidv4(),
      type,
      occurred_at: new Date().toISOString(),
      payload,
    };
    const fns = this.handlers.get(type) ?? [];
    await Promise.all(fns.map((fn) => fn(event as DomainEvent)));
  }
}

export const bus = new EventBus();
