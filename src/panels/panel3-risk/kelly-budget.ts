/**
 * Panel 3 — Kelly Budget Aggregation
 * Aggregates governance-adjusted Kelly outputs across live positions.
 */

import {
  PositionGovernanceSnapshot,
  PortfolioKellyBudget,
  PositionKellyInput,
} from './types';

export function buildPositionGovernanceSnapshots(
  date_time: string,
  kellyInputs: PositionKellyInput[]
): PositionGovernanceSnapshot[] {
  return kellyInputs.map((k) => ({
    portfolio_id: k.portfolio_id,
    security_id: k.security_id,
    date_time,
    governance_score: k.governance_score,
    survival_prob: k.survival_prob,
    enforcement_prob: k.enforcement_prob,
    kelly_fraction_eff: k.governance_kelly,
    risk_per_trade: k.risk_per_trade,
  }));
}

export function aggregateKellyBudget(params: {
  portfolio_id: string;
  date_time: string;
  total_equity: number;
  fractional_kelly_factor: number;
  position_snapshots: PositionGovernanceSnapshot[];
}): PortfolioKellyBudget {
  const {
    portfolio_id,
    date_time,
    total_equity,
    fractional_kelly_factor,
    position_snapshots,
  } = params;

  const governanceKellyValues = position_snapshots.map((p) => Math.max(0, p.kelly_fraction_eff));
  const avgKelly = governanceKellyValues.length
    ? governanceKellyValues.reduce((a, b) => a + b, 0) / governanceKellyValues.length
    : 0;

  const max_risk_per_trade = position_snapshots.length
    ? Math.max(...position_snapshots.map((p) => p.risk_per_trade))
    : 0;

  const max_total_risk = position_snapshots.reduce((a, p) => a + p.risk_per_trade, 0);

  return {
    portfolio_id,
    date_time,
    total_equity,
    kelly_fraction_gov: avgKelly,
    fractional_kelly_factor,
    max_risk_per_trade,
    max_total_risk,
  };
}
