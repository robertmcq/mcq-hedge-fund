import { describe, it, expect } from 'vitest';
import { runPortfolioRiskEngine } from '../engine';
import type { PortfolioRiskEngineInput } from '../types';

const input: PortfolioRiskEngineInput = {
  portfolio: {
    portfolio_id: 'pf-001',
    name: 'Main Book',
    base_currency: 'USD',
  },
  positions: [
    {
      portfolio_id: 'pf-001',
      security_id: 'AAPL',
      date_time: '2026-06-20T12:00:00Z',
      quantity: 100,
      avg_cost: 180,
      side: 'long',
    },
    {
      portfolio_id: 'pf-001',
      security_id: 'TSLA',
      date_time: '2026-06-20T12:00:00Z',
      quantity: 50,
      avg_cost: 220,
      side: 'short',
    },
  ],
  prices: [
    { security_id: 'AAPL', price: 200, date_time: '2026-06-20T12:00:00Z' },
    { security_id: 'TSLA', price: 210, date_time: '2026-06-20T12:00:00Z' },
  ],
  cash: 100000,
  prior_equity_value: 105000,
  ytd_start_equity: 95000,
  equity_history: [
    { date_time: '2026-06-18T12:00:00Z', equity_value: 98000 },
    { date_time: '2026-06-19T12:00:00Z', equity_value: 102000 },
  ],
  kelly_inputs: [
    {
      portfolio_id: 'pf-001',
      security_id: 'AAPL',
      governance_score: 0.9,
      survival_prob: 0.92,
      enforcement_prob: 0.08,
      governance_kelly: 0.18,
      risk_per_trade: 4500,
    },
    {
      portfolio_id: 'pf-001',
      security_id: 'TSLA',
      governance_score: 0.6,
      survival_prob: 0.75,
      enforcement_prob: 0.25,
      governance_kelly: 0.06,
      risk_per_trade: 1500,
    },
  ],
  risk_limits: [
    {
      limit_id: 'lim-dd',
      portfolio_id: 'pf-001',
      limit_type: 'MAX_DRAWDOWN',
      threshold_value: 0.10,
      hard_flag: true,
    },
    {
      limit_id: 'lim-pos',
      portfolio_id: 'pf-001',
      limit_type: 'MAX_POSITION_PCT',
      threshold_value: 0.20,
      hard_flag: false,
    },
  ],
};

describe('runPortfolioRiskEngine', () => {
  it('builds equity and drawdown snapshots', () => {
    const result = runPortfolioRiskEngine(input);
    expect(result.equity_snapshot.portfolio_id).toBe('pf-001');
    expect(result.drawdown_snapshot.portfolio_id).toBe('pf-001');
  });

  it('creates one governance snapshot per Kelly input', () => {
    const result = runPortfolioRiskEngine(input);
    expect(result.position_governance_snapshots).toHaveLength(2);
  });

  it('aggregates Kelly budget totals', () => {
    const result = runPortfolioRiskEngine(input);
    expect(result.kelly_budget.max_total_risk).toBe(6000);
    expect(result.kelly_budget.max_risk_per_trade).toBe(4500);
  });

  it('marks positions and computes pnl', () => {
    const result = runPortfolioRiskEngine(input);
    const aapl = result.marked_positions.find((p) => p.security_id === 'AAPL');
    expect(aapl?.pnl).toBe(2000);
  });
});
