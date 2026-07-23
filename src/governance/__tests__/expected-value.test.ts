import { describe, expect, it } from 'vitest';
import { computeGovernanceEV } from '../expected-value';
import type { GovernanceSurvivalResult } from '../types';

const baseSurvival: GovernanceSurvivalResult = {
  entity_type: 'issuer',
  entity_id: 'JNJ',
  as_of: '2026-07-22T00:00:00.000Z',
  horizon_days: 30,
  governance_score: 0.9,
  velocity: 0.1,
  volume: 0.2,
  shadow: 0.05,
  hazard_rate: 0.05,
  survival_prob: 0.95,
  enforcement_prob: 0.05,
  risk_label: 'LOW',
};

describe('expected-value.ts', () => {
  it('renormalizes p_win and p_loss after adding enforcement branch', () => {
    const result = computeGovernanceEV(0.6, 200, 100, 300, {
      ...baseSurvival,
      enforcement_prob: 0.1,
      survival_prob: 0.9,
    });

    expect(result.p_win).toBeCloseTo(0.54, 6);
    expect(result.p_loss).toBeCloseTo(0.36, 6);
    expect(result.p_win + result.p_loss + result.p_enf).toBeCloseTo(1, 6);
    expect(result.baseline_ev).toBeCloseTo(80, 6);
    expect(result.governance_ev).toBeCloseTo(42, 6);
  });

  it('returns zero haircut when baseline EV is zero and governance EV is also zero', () => {
    const result = computeGovernanceEV(0.5, 100, 100, 0, {
      ...baseSurvival,
      enforcement_prob: 0,
      survival_prob: 1,
    });

    expect(result.baseline_ev).toBe(0);
    expect(result.governance_ev).toBe(0);
    expect(result.ev_haircut_pct).toBe(0);
  });

  it('heavily penalizes governance EV under large enforcement loss', () => {
    const result = computeGovernanceEV(0.6, 200, 100, 5000, {
      ...baseSurvival,
      enforcement_prob: 0.2,
      survival_prob: 0.8,
    });

    expect(result.baseline_ev).toBeCloseTo(80, 6);
    expect(result.governance_ev).toBeLessThan(0);
    expect(result.ev_haircut_pct).toBeGreaterThan(1);
  });

  it('approaches negative enforcement loss as P_enf approaches 1', () => {
    const result = computeGovernanceEV(0.6, 200, 100, 1000, {
      ...baseSurvival,
      enforcement_prob: 0.999,
      survival_prob: 0.001,
    });

    expect(result.p_win).toBeCloseTo(0.0006, 6);
    expect(result.p_loss).toBeCloseTo(0.0004, 6);
    expect(result.governance_ev).toBeLessThan(-998);
  });
});
