import { describe, expect, it } from 'vitest';
import { evaluateGovernanceAlert, evaluateGovernanceAlerts } from '../alerts';
import type { GovernanceSurvivalResult } from '../types';

const baseResult: GovernanceSurvivalResult = {
  entity_type: 'issuer',
  entity_id: 'PG',
  as_of: '2026-07-22T00:00:00.000Z',
  horizon_days: 30,
  governance_score: 0.82,
  velocity: 0.1,
  volume: 0.2,
  shadow: 0.05,
  hazard_rate: 0.1,
  survival_prob: 0.9,
  enforcement_prob: 0.1,
  risk_label: 'LOW',
};

const thresholds = { warn: 0.1, high: 0.25, critical: 0.5 };

describe('alerts.ts', () => {
  it('returns null when enforcement probability is below warning threshold', () => {
    const alert = evaluateGovernanceAlert({
      ...baseResult,
      enforcement_prob: 0.09,
    }, thresholds);

    expect(alert).toBeNull();
  });

  it('emits warn alert at warning threshold', () => {
    const alert = evaluateGovernanceAlert({
      ...baseResult,
      enforcement_prob: 0.1,
    }, thresholds);

    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe('warn');
    expect(alert?.threshold_breached).toBe(0.1);
    expect(alert?.recommended_action).toContain('MONITOR');
  });

  it('emits high alert at high threshold', () => {
    const alert = evaluateGovernanceAlert({
      ...baseResult,
      enforcement_prob: 0.25,
    }, thresholds);

    expect(alert?.severity).toBe('high');
    expect(alert?.threshold_breached).toBe(0.25);
    expect(alert?.recommended_action).toContain('REDUCE');
  });

  it('emits critical alert at critical threshold', () => {
    const alert = evaluateGovernanceAlert({
      ...baseResult,
      enforcement_prob: 0.5,
    }, thresholds);

    expect(alert?.severity).toBe('critical');
    expect(alert?.threshold_breached).toBe(0.5);
    expect(alert?.recommended_action).toContain('BLOCK');
  });

  it('batch-evaluates multiple results and filters null alerts', () => {
    const alerts = evaluateGovernanceAlerts([
      { ...baseResult, entity_id: 'A', enforcement_prob: 0.05 },
      { ...baseResult, entity_id: 'B', enforcement_prob: 0.2 },
      { ...baseResult, entity_id: 'C', enforcement_prob: 0.6 },
    ], thresholds);

    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.entity_id)).toEqual(['B', 'C']);
  });
});
