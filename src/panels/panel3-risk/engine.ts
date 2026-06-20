/**
 * Panel 3 — Portfolio Live State & Risk
 * Main engine for marking positions, building equity snapshot,
 * computing drawdown, aggregating Kelly budget, and checking limits.
 */

import {
  PortfolioRiskEngineInput,
  PortfolioRiskEngineResult,
  PositionMark,
} from './types';
import {
  priceMap,
  markPosition,
  aggregateEquitySnapshot,
  computeDrawdownSnapshot,
  evaluateRiskLimits,
} from './utils';
import { buildPositionGovernanceSnapshots, aggregateKellyBudget } from './kelly-budget';

export function runPortfolioRiskEngine(input: PortfolioRiskEngineInput): PortfolioRiskEngineResult {
  const now = new Date().toISOString();
  const pMap = priceMap(input.prices);

  const provisionalNetExposure = input.positions.reduce((acc, p) => {
    const px = pMap.get(p.security_id)?.price ?? p.avg_cost;
    const signedQty = p.side === 'long' ? p.quantity : -p.quantity;
    return acc + signedQty * px;
  }, 0);
  const provisionalEquity = input.cash + provisionalNetExposure;

  const marked_positions: PositionMark[] = input.positions.map((pos) => {
    const px = pMap.get(pos.security_id)?.price;
    if (px === undefined) throw new Error(`Missing price for security ${pos.security_id}`);
    return markPosition(pos, px, provisionalEquity);
  });

  const equity_snapshot = aggregateEquitySnapshot(
    input.portfolio.portfolio_id,
    now,
    marked_positions,
    input.cash,
    input.prior_equity_value,
    input.ytd_start_equity
  );

  const drawdown_snapshot = computeDrawdownSnapshot(
    input.portfolio.portfolio_id,
    now,
    equity_snapshot.equity_value,
    input.equity_history ?? []
  );

  const position_governance_snapshots = buildPositionGovernanceSnapshots(
    now,
    input.kelly_inputs ?? []
  );

  const fractionalKelly = position_governance_snapshots.length ? 0.25 : 0.25;
  const kelly_budget = aggregateKellyBudget({
    portfolio_id: input.portfolio.portfolio_id,
    date_time: now,
    total_equity: equity_snapshot.equity_value,
    fractional_kelly_factor: fractionalKelly,
    position_snapshots: position_governance_snapshots,
  });

  const risk_breaches = evaluateRiskLimits({
    portfolio_id: input.portfolio.portfolio_id,
    date_time: now,
    limits: input.risk_limits ?? [],
    drawdown_pct: drawdown_snapshot.current_drawdown_pct,
    leverage: equity_snapshot.leverage,
    marked_positions,
  });

  return {
    marked_positions,
    equity_snapshot,
    drawdown_snapshot,
    kelly_budget,
    position_governance_snapshots,
    risk_breaches,
  };
}
