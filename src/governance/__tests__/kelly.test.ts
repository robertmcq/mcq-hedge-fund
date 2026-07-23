import { describe, expect, it } from 'vitest';
import { baselineKelly, computeGovernanceKelly } from '../kelly';
import type { GovernanceSurvivalResult } from '../types';

const survivalResult: GovernanceSurvivalResult = {
  entity_type: 'issuer',
  entity_id: 'KO',
  as_of: '2026-07-22T00:00:00.000Z',
  horizon_days: 30,
  governance_score: 0.8,
  velocity: 0.1,
  volume: 0.2,
  shadow: 0.05,
  hazard_rate: 0.08,
  survival_prob: 0.9,
  enforcement_prob: 0.1,
  risk_label: 'LOW',
};

describe('kelly.ts', () => {
  it('computes positive governance-adjusted Kelly and max position size', () => {
    const result = computeGovernanceKelly({
      win_rate: 0.6,
      avg_win: 200,
      avg_loss: 100,
      account_equity: 100000,
      survival_result: survivalResult,
      fractional_kelly_factor: 0.25,
    });

    expect(result.baseline_kelly).toBeCloseTo(0.4, 6);
    expect(result.effective_win_rate).toBeCloseTo(0.54, 6);
    expect(result.governance_kelly).toBeCloseTo(0.31, 6);
    expect(result.risk_per_trade).toBeCloseTo(7750, 6);
    expect(result.max_position_size).toBeCloseTo(23250, 6);
    expect(result.signal).toBe('FULL_SIZE');
  });

  it('returns NO_TRADE when governance Kelly is negative', () => {
    const result = computeGovernanceKelly({
      win_rate: 0.45,
      avg_win: 100,
      avg_loss: 120,
      account_equity: 50000,
      survival_result: survivalResult,
      fractional_kelly_factor: 0.25,
    });

    expect(result.governance_kelly).toBeLessThanOrEqual(0);
    expect(result.risk_per_trade).toBe(0);
    expect(result.max_position_size).toBe(0);
    expect(result.signal).toBe('NO_TRADE');
  });

  it('returns MINIMAL_SIZE when Kelly is small but positive', () => {
    const result = computeGovernanceKelly({
      win_rate: 0.52,
      avg_win: 100,
      avg_loss: 100,
      account_equity: 100000,
      survival_result: {
        ...survivalResult,
        survival_prob: 0.98,
        enforcement_prob: 0.02,
      },
      fractional_kelly_factor: 0.25,
    });

    expect(result.governance_kelly).toBeGreaterThan(0);
    expect(result.governance_kelly).toBeLessThan(0.05);
    expect(result.signal).toBe('MINIMAL_SIZE');
  });

  it('returns REDUCED_SIZE for moderate positive Kelly values', () => {
    const result = computeGovernanceKelly({
      win_rate: 0.55,
      avg_win: 120,
      avg_loss: 100,
      account_equity: 100000,
      survival_result: survivalResult,
      fractional_kelly_factor: 0.25,
    });

    expect(result.governance_kelly).toBeGreaterThanOrEqual(0.05);
    expect(result.governance_kelly).toBeLessThan(0.2);
    expect(result.signal).toBe('REDUCED_SIZE');
  });

  it('baselineKelly throws when avgLoss is non-positive', () => {
    expect(() => baselineKelly(0.6, 100, 0)).toThrow('avgLoss must be positive');
  });
});
