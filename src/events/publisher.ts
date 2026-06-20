/**
 * Typed publisher helpers — call these from controllers and adapters.
 */

import { bus } from './bus';
import {
  MarketDataUpdatedPayload,
  FundamentalsUpdatedPayload,
  GovernanceScoreUpdatedPayload,
  TradeExecutedPayload,
  ActionDecisionPayload,
} from './types';

export const publish = {
  marketDataUpdated: (payload: MarketDataUpdatedPayload) =>
    bus.emit('MarketDataUpdated', payload),

  fundamentalsUpdated: (payload: FundamentalsUpdatedPayload) =>
    bus.emit('FundamentalsUpdated', payload),

  governanceScoreUpdated: (payload: GovernanceScoreUpdatedPayload) =>
    bus.emit('GovernanceScoreUpdated', payload),

  tradeExecuted: (payload: TradeExecutedPayload) =>
    bus.emit('TradeExecuted', payload),

  actionDecision: (payload: ActionDecisionPayload) =>
    bus.emit('ActionDecision', payload),
};
