/**
 * Handler: TradeExecuted
 * Updates positions, refreshes risk metrics, and writes audit log entry.
 */

import { bus } from '../bus';
import { TradeExecutedPayload, DomainEvent } from '../types';

bus.subscribe<TradeExecutedPayload>(
  'TradeExecuted',
  async (event: DomainEvent<TradeExecutedPayload>) => {
    const { portfolio_id, security_id, side, quantity, price, executed_at } = event.payload;
    console.log(
      `[TradeExecuted] portfolio=${portfolio_id} ${side} ${quantity}x ${security_id} @${price} at=${executed_at}`
    );
    // TODO: upsert position record
    // TODO: runPortfolioRiskEngine() -> refresh equity/drawdown/leverage snapshots
    // TODO: evaluate risk limits -> write risk_breach_event if needed
    // TODO: write decision_log_entry
  }
);
