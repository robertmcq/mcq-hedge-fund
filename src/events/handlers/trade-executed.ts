/**
 * Handler: TradeExecuted
 * 1. Upserts or removes position in the portfolio store.
 * 2. Re-runs Panel 3 risk engine to refresh equity/drawdown/leverage snapshots.
 * 3. Logs risk limit breaches.
 */

import { bus } from '../bus';
import type { DomainEvent, TradeExecutedPayload } from '../types';
import { portfolioStore } from '../../state/portfolio-store';
import { runPortfolioRiskEngine } from '../../panels/panel3-risk/engine';

bus.subscribe<TradeExecutedPayload>(
  'TradeExecuted',
  async (event: DomainEvent<TradeExecutedPayload>) => {
    const { portfolio_id, security_id, side, quantity, price, executed_at } = event.payload;

    const entry = portfolioStore.getPortfolio(portfolio_id);
    if (!entry) {
      console.warn(`[TradeExecuted] Unknown portfolio ${portfolio_id} — skipping`);
      return;
    }

    // 1. Find existing position to compute new avg cost
    const existing = entry.positions.find(
      (p) => p.security_id === security_id && p.side === side
    );

    if (existing) {
      const totalQty = existing.quantity + quantity;
      const newAvgCost =
        (existing.avg_cost * existing.quantity + price * quantity) / totalQty;
      portfolioStore.upsertPosition(portfolio_id, {
        ...existing,
        quantity: totalQty,
        avg_cost: newAvgCost,
        date_time: executed_at,
      });
    } else {
      portfolioStore.upsertPosition(portfolio_id, {
        portfolio_id,
        security_id,
        side,
        quantity,
        avg_cost: price,
        date_time: executed_at,
      });
    }

    // 2. Update price cache
    portfolioStore.updatePrice({ security_id, price, date_time: executed_at });

    // 3. Re-run Panel 3
    const prices = portfolioStore.getPricesForPortfolio(portfolio_id);
    if (!prices.length) return;

    const result = runPortfolioRiskEngine({
      portfolio: entry.portfolio,
      positions: entry.positions,
      prices,
      cash: entry.cash,
      prior_equity_value: entry.prior_equity_value,
      ytd_start_equity: entry.ytd_start_equity,
      equity_history: entry.equity_history,
    });

    portfolioStore.appendEquityHistory(
      portfolio_id,
      executed_at,
      result.equity_snapshot.equity_value
    );

    console.log(
      `[TradeExecuted] ${side} ${quantity}x ${security_id} @${price} ` +
      `portfolio=${portfolio_id} ` +
      `equity=${result.equity_snapshot.equity_value.toFixed(2)} ` +
      `leverage=${result.equity_snapshot.leverage.toFixed(2)}x ` +
      `drawdown=${(result.drawdown_snapshot.current_drawdown_pct * 100).toFixed(2)}%`
    );

    for (const breach of result.risk_breaches) {
      console.warn(
        `[RiskBreach:TradeExecuted] ${breach.limit_type} ` +
        `observed=${breach.observed_value.toFixed(4)} ` +
        `threshold=${breach.threshold_value} ` +
        `severity=${breach.severity} action=${breach.auto_action}`
      );
    }
  }
);
