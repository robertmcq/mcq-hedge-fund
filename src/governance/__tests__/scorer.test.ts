/**
 * Governance Scoring Module Tests
 *
 * All survival calls use horizon_days=1 unless explicitly testing horizon effects.
 * With default params (h0=0.05) and strong governance (G=0.90):
 *   h ≈ 0.066  →  P_enf(T=1) ≈ 0.064  →  below warn threshold (0.15) → no alert.
 * Using T=10 would push P_enf to ~0.48, triggering a spurious alert in the
 * 'strong governance → PROCEED' test.
 */

import { describe, it, expect } from 'vitest';
import { runGovernanceScorer } from '../scorer';
import { computeHazardRate, computeGovernanceSurvival } from '../hazard';
import { computeGovernanceKelly } from '../kelly';
import type { ScorerInput, GovernanceScoreInput } from '../index';

const strongGovernance: GovernanceScoreInput = {
  entity_type: 'strategy',
  entity_id: 'strat-001',
  governance_score: 0.90,
  velocity: 0.10,
  volume: 0.20,
  shadow: 0.05,
};

const weakGovernance: GovernanceScoreInput = {
  entity_type: 'strategy',
  entity_id: 'strat-002',
  governance_score: 0.20,
  velocity: 0.80,
  volume: 0.90,
  shadow: 0.70,
};

const baseScorerInput: ScorerInput = {
  governance: strongGovernance,
  horizon_days: 1,   // T=1: P_enf(strong) ≈0.064 < 0.15 warn threshold → no alert
  win_rate: 0.58,
  avg_win: 1200,
  avg_loss: 800,
  enforcement_loss: 50_000,
  account_equity: 500_000,
};

describe('computeHazardRate', () => {
  it('lower governance score → higher hazard rate', () => {
    const hStrong = computeHazardRate(strongGovernance);
    const hWeak   = computeHazardRate(weakGovernance);
    expect(hWeak).toBeGreaterThan(hStrong);
  });

  it('hazard rate is always positive', () => {
    expect(computeHazardRate(strongGovernance)).toBeGreaterThan(0);
    expect(computeHazardRate(weakGovernance)).toBeGreaterThan(0);
  });
});

describe('computeGovernanceSurvival', () => {
  it('survival_prob is in [0, 1]', () => {
    const r = computeGovernanceSurvival(strongGovernance, 1);
    expect(r.survival_prob).toBeGreaterThanOrEqual(0);
    expect(r.survival_prob).toBeLessThanOrEqual(1);
  });

  it('enforcement_prob = 1 - survival_prob', () => {
    const r = computeGovernanceSurvival(strongGovernance, 1);
    expect(r.enforcement_prob).toBeCloseTo(1 - r.survival_prob, 10);
  });

  it('strong governance → lower enforcement prob than weak', () => {
    const rStrong = computeGovernanceSurvival(strongGovernance, 1);
    const rWeak   = computeGovernanceSurvival(weakGovernance, 1);
    expect(rWeak.enforcement_prob).toBeGreaterThan(rStrong.enforcement_prob);
  });

  it('longer horizon → lower survival prob', () => {
    const r10  = computeGovernanceSurvival(strongGovernance, 10);
    const r100 = computeGovernanceSurvival(strongGovernance, 100);
    expect(r100.survival_prob).toBeLessThan(r10.survival_prob);
  });
});

describe('computeGovernanceKelly', () => {
  it('governance_kelly <= baseline_kelly for any enforcement risk', () => {
    const survival = computeGovernanceSurvival(strongGovernance, 1);
    const kelly = computeGovernanceKelly({
      win_rate: 0.58,
      avg_win: 1200,
      avg_loss: 800,
      account_equity: 500_000,
      survival_result: survival,
    });
    expect(kelly.governance_kelly).toBeLessThanOrEqual(kelly.baseline_kelly);
  });

  it('weak governance → NO_TRADE or MINIMAL_SIZE signal', () => {
    const survival = computeGovernanceSurvival(weakGovernance, 1);
    const kelly = computeGovernanceKelly({
      win_rate: 0.55,
      avg_win: 1000,
      avg_loss: 900,
      account_equity: 500_000,
      survival_result: survival,
    });
    expect(['NO_TRADE', 'MINIMAL_SIZE']).toContain(kelly.signal);
  });

  it('risk_per_trade is zero when governance_kelly <= 0', () => {
    const survival = computeGovernanceSurvival(weakGovernance, 1);
    const kelly = computeGovernanceKelly({
      win_rate: 0.40,
      avg_win: 800,
      avg_loss: 900,
      account_equity: 500_000,
      survival_result: survival,
    });
    expect(kelly.risk_per_trade).toBe(0);
    expect(kelly.signal).toBe('NO_TRADE');
  });
});

describe('runGovernanceScorer (full pipeline)', () => {
  it('returns all required fields', () => {
    const decision = runGovernanceScorer(baseScorerInput);
    expect(decision.survival).toBeDefined();
    expect(decision.kelly).toBeDefined();
    expect(decision.expected_value).toBeDefined();
    expect(decision.summary).toBeDefined();
  });

  it('strong governance → PROCEED recommended action (no alert)', () => {
    // T=1: P_enf ≈0.064 < 0.15 → evaluateGovernanceAlert returns null
    const decision = runGovernanceScorer(baseScorerInput);
    expect(decision.alert).toBeNull();
    expect(decision.summary.recommended_action).toContain('PROCEED');
  });

  it('weak governance → generates an alert', () => {
    const weakInput: ScorerInput = { ...baseScorerInput, governance: weakGovernance };
    const decision = runGovernanceScorer(weakInput);
    expect(decision.alert).not.toBeNull();
    expect(['warn', 'high', 'critical']).toContain(decision.alert?.severity);
  });

  it('governance EV is less than or equal to baseline EV', () => {
    const decision = runGovernanceScorer(baseScorerInput);
    expect(decision.expected_value.governance_ev).toBeLessThanOrEqual(
      decision.expected_value.baseline_ev
    );
  });
});
