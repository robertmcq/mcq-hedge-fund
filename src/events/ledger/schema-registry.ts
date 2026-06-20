/**
 * Schema Registry — enforces event payload shape at publish time.
 *
 * Risk mitigated: Event integrity drift.
 * If a producer publishes an event with an unknown type or wrong shape,
 * the registry throws before the event reaches the bus or ledger.
 *
 * To add a new event type:
 *   1. Add its Zod-style validator (or simple structural check) here.
 *   2. Bump CURRENT_SCHEMA_VERSION if the payload shape changes.
 *   3. Old version records remain valid in the ledger (append-only).
 */

import type { MarketDataUpdatedPayload, GovernanceScoreUpdatedPayload, TradeExecutedPayload, ActionDecisionPayload } from '../types';

export const CURRENT_SCHEMA_VERSION = 1 as const;

type Validator<T> = (payload: unknown) => payload is T;

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}
function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

const validators: Record<string, Validator<unknown>> = {
  MarketDataUpdated: (p): p is MarketDataUpdatedPayload => {
    const x = p as Record<string, unknown>;
    return isString(x.security_id) && isNumber(x.price) && isString(x.date_time);
  },

  GovernanceScoreUpdated: (p): p is GovernanceScoreUpdatedPayload => {
    const x = p as Record<string, unknown>;
    return (
      isString(x.entity_type) &&
      isString(x.entity_id) &&
      isNumber(x.governance_score) &&
      isString(x.as_of)
    );
  },

  TradeExecuted: (p): p is TradeExecutedPayload => {
    const x = p as Record<string, unknown>;
    return (
      isString(x.portfolio_id) &&
      isString(x.security_id) &&
      (x.side === 'long' || x.side === 'short') &&
      isNumber(x.quantity) &&
      isNumber(x.price) &&
      isString(x.executed_at)
    );
  },

  ActionDecision: (p): p is ActionDecisionPayload => {
    const x = p as Record<string, unknown>;
    return (
      isString(x.action_id) &&
      ['approve', 'modify', 'reject'].includes(x.decision as string) &&
      isString(x.user_id)
    );
  },
};

export function validatePayload(event_type: string, payload: unknown): void {
  const validator = validators[event_type];
  if (!validator) {
    throw new Error(
      `[SchemaRegistry] Unknown event type '${event_type}'. ` +
      `Register it in src/events/ledger/schema-registry.ts.`
    );
  }
  if (!validator(payload)) {
    throw new Error(
      `[SchemaRegistry] Payload validation failed for '${event_type}'. ` +
      `Payload: ${JSON.stringify(payload)}`
    );
  }
}
