/**
 * Handler: MarketDataUpdated
 * 1. Updates the price cache in the portfolio store.
 * 2. Re-runs Panel 3 risk engine for every portfolio that holds the security.
 * 3. Logs any risk limit breaches.
 */

import { bus } from '../bus';
import type { DomainEvent, MarketDataUpdatedPayload } from '../types';
import { portfolioStore } from '../../state/portfolio-store';
import { runPortfolioRiskEngine } from '../../panels/panel3-risk/engine';

bus.subscribe<MarketDataUpdatedPayload>(
  'MarketDataUpdated',
  async (event: DomainEvent<MarketDataUpdatedPayload>) => {
    const { security_id, price, volume, date_time } = event.payload;

    // 1. Update price cache
    portfolioStore.updatePrice({ security_id, price, date_time });

    // 2. Refresh every portfolio holding this security
    const affected = portfolioStore.allPortfolios().filter((entry) =>
      entry.positions.some((p) => p.security_id === security_id)
    );

    for (const entry of affected) {
      const prices = portfolioStore.getPricesForPortfolio(entry.portfolio.portfolio_id);
      if (prices.length === 0) continue;

      try {
        const result = runPortfolioRiskEngine({
          portfolio: entry.portfolio,
          positions: entry.positions,
          prices,
          cash: entry.cash,
          prior_equity_value: entry.prior_equity_value,
          ytd_start_equity: entry.ytd_start_equity,
          equity_history: entry.equity_history,
        });

        // Append equity snapshot to history for drawdown tracking
        portfolioStore.appendEquityHistory(
          entry.portfolio.portfolio_id,
          date_time,
          result.equity_snapshot.equity_value
        );

        // Log any breaches
        if (result.risk_breaches.length > 0) {
          for (const breach of result.risk_breaches) {
            console.warn(
              `[RiskBreach] portfolio=${entry.portfolio.portfolio_id} ` +
              `type=${breach.limit_type} observed=${breach.observed_value.toFixed(4)} ` +
              `threshold=${breach.threshold_value} severity=${breach.severity} ` +
              `action=${breach.auto_action}`
            );
          }
        }

        console.log(
          `[MarketDataUpdated] ${security_id}@${price} ` +
          `→ portfolio=${entry.portfolio.portfolio_id} ` +
          `equity=${result.equity_snapshot.equity_value.toFixed(2)} ` +
          `drawdown=${(result.drawdown_snapshot.current_drawdown_pct * 100).toFixed(2)}% ` +
          `breaches=${result.risk_breaches.length}` +
          (volume !== undefined ? ` vol=${volume}` : '')
        );
      } catch (err) {
        console.error(
          `[MarketDataUpdated] Panel 3 engine error for portfolio ` +
          `${entry.portfolio.portfolio_id}:`,
          (err as Error).message
        );
      }
    }
  }
);
