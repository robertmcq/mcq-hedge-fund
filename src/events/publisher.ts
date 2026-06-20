/**
 * Typed publish helpers — fire-and-forget domain events onto the bus.
 * Import and call from any handler or script.
 */

import { bus } from './bus';
import type {
  MarketDataUpdatedPayload,
  GovernanceScoreUpdatedPayload,
  TradeExecutedPayload,
  ActionDecisionPayload,
} from './types';

export const publish = {
  async marketDataUpdated(payload: MarketDataUpdatedPayload): Promise<void> {
    await bus.publish({ event_type: 'MarketDataUpdated', payload, occurred_at: new Date().toISOString() });
  },

  async governanceScoreUpdated(payload: GovernanceScoreUpdatedPayload): Promise<void> {
    await bus.publish({ event_type: 'GovernanceScoreUpdated', payload, occurred_at: new Date().toISOString() });
  },

  async tradeExecuted(payload: TradeExecutedPayload): Promise<void> {
    await bus.publish({ event_type: 'TradeExecuted', payload, occurred_at: new Date().toISOString() });
  },

  async actionDecision(payload: ActionDecisionPayload): Promise<void> {
    await bus.publish({ event_type: 'ActionDecision', payload, occurred_at: new Date().toISOString() });
  },
};
