/**
 * Governance — Hazard Model Integration Scenarios
 * Tests representative governance states against expected risk labels.
 */

import { describe, it, expect } from 'vitest';
import { computeGovernanceSurvival, classifyRisk } from '../hazard';
import type { GovernanceScoreInput } from '../types';

const scenarios: Array<{ label: string; input: GovernanceScoreInput; expectedRisk: string[] }> = [
  {
    label: 'Blue-chip issuer — exemplary governance',
    input: { entity_type: 'issuer', entity_id: 'issuer-aaa', governance_score: 0.95, velocity: 0.05, volume: 0.10, shadow: 0.02 },
    expectedRisk: ['LOW'],
  },
  {
    label: 'Mid-tier strategy — moderate controls',
    input: { entity_type: 'strategy', entity_id: 'strat-mid', governance_score: 0.65, velocity: 0.40, volume: 0.50, shadow: 0.25 },
    expectedRisk: ['LOW', 'MODERATE'],
  },
  {
    label: 'High-velocity agent — borderline',
    input: { entity_type: 'agent', entity_id: 'agent-hv', governance_score: 0.50, velocity: 0.75, volume: 0.60, shadow: 0.40 },
    expectedRisk: ['MODERATE', 'HIGH'],
  },
  {
    label: 'Failing issuer — enforcement imminent',
    input: { entity_type: 'issuer', entity_id: 'issuer-fail', governance_score: 0.10, velocity: 0.95, volume: 0.90, shadow: 0.85 },
    expectedRisk: ['CRITICAL'],
  },
];

describe('Hazard model integration scenarios', () => {
  for (const scenario of scenarios) {
    it(`${scenario.label}`, () => {
      const result = computeGovernanceSurvival(scenario.input, 10);
      expect(scenario.expectedRisk).toContain(result.risk_label);
      // Survival prob always in [0,1]
      expect(result.survival_prob).toBeGreaterThanOrEqual(0);
      expect(result.survival_prob).toBeLessThanOrEqual(1);
    });
  }
});

describe('classifyRisk thresholds', () => {
  it('0%  enforcement → LOW',      () => expect(classifyRisk(0.00)).toBe('LOW'));
  it('9%  enforcement → LOW',      () => expect(classifyRisk(0.09)).toBe('LOW'));
  it('10% enforcement → MODERATE', () => expect(classifyRisk(0.10)).toBe('MODERATE'));
  it('30% enforcement → HIGH',     () => expect(classifyRisk(0.30)).toBe('HIGH'));
  it('60% enforcement → CRITICAL', () => expect(classifyRisk(0.60)).toBe('CRITICAL'));
});
