/**
 * Panel 1 — Reverse DCF Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { runReverseDCF } from '../engine';
import type { ReverseDCFInput } from '../types';

const baseInput: ReverseDCFInput = {
  security: {
    security_id: 'test-sec-001',
    ticker: 'TEST',
    name: 'Test Corp',
    asset_class: 'equity',
    sector: 'Technology',
    country: 'US',
    currency: 'USD',
    primary_exchange: 'NASDAQ',
  },
  fundamentals: {
    security_id: 'test-sec-001',
    period_end: '2025-12-31',
    freq: 'Y',
    revenue:    10_000_000_000, // $10B
    ebit:        2_000_000_000,
    ebitda:      2_500_000_000,
    fcf:         1_500_000_000, // $1.5B FCF
    shares_out:  1_000_000_000, // 1B shares
    net_debt:      500_000_000, // $500M net debt
  },
  scenario: {
    scenario_id: 'scn-base',
    name: 'Base',
    description: 'Test base scenario',
    discount_rate: 0.10,
    terminal_growth_cap: 0.03,
  },
  config: {
    security_id: 'test-sec-001',
    scenario_id: 'scn-base',
    horizon_years: 10,
    terminal_multiple: 20,
    tax_rate: 0.21,
    last_updated: new Date().toISOString(),
  },
  current_price: 50.00, // $50/share → $50B market cap → $50.5B EV
};

describe('runReverseDCF', () => {
  it('returns a snapshot with all required fields', () => {
    const result = runReverseDCF(baseInput);
    const { snapshot } = result;

    expect(snapshot.security_id).toBe('test-sec-001');
    expect(snapshot.price).toBe(50);
    expect(snapshot.market_cap).toBe(50_000_000_000);
    expect(snapshot.enterprise_value).toBe(50_500_000_000);
    expect(typeof snapshot.implied_revenue_cagr).toBe('number');
    expect(typeof snapshot.implied_irr).toBe('number');
    expect(typeof snapshot.mispricing_score).toBe('number');
  });

  it('mispricing_score is clamped between -1 and 1', () => {
    const result = runReverseDCF(baseInput);
    const s = result.snapshot.mispricing_score;
    expect(s).toBeGreaterThanOrEqual(-1);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('bridge has one row per horizon year', () => {
    const result = runReverseDCF(baseInput);
    expect(result.bridge).toHaveLength(baseInput.config.horizon_years);
  });

  it('delta_fcf = house_fcf - market_implied_fcf', () => {
    const result = runReverseDCF(baseInput);
    for (const row of result.bridge) {
      expect(row.delta_fcf).toBeCloseTo(
        row.house_fcf - row.market_implied_fcf,
        5
      );
    }
  });

  it('implied_irr is positive for a high-priced stock', () => {
    const result = runReverseDCF({ ...baseInput, current_price: 200 });
    // Very high price → market is pricing in strong growth → high IRR implied
    expect(result.snapshot.implied_irr).toBeGreaterThan(0);
  });

  it('house_hurdle_rate equals scenario discount_rate', () => {
    const result = runReverseDCF(baseInput);
    expect(result.snapshot.house_hurdle_rate).toBe(
      baseInput.scenario.discount_rate
    );
  });

  it('pv_of_fcfs + pv_of_terminal approximates enterprise_value', () => {
    const result = runReverseDCF(baseInput);
    const reconstructed = result.pv_of_fcfs + result.pv_of_terminal;
    // Allow 5% tolerance due to rounding in bisection
    const ev = result.snapshot.enterprise_value;
    expect(Math.abs(reconstructed - ev) / ev).toBeLessThan(0.05);
  });
});
