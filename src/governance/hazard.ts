/**
 * Governance Scoring Module — Hazard Function
 *
 * Implements the constant-hazard model:
 *   h(t | G, X) = h₀ · exp(βG·(1-G) + βᵀX)
 *
 * Where:
 *   G   = governance score [0, 1]
 *   X   = [velocity, volume, shadow, ...]
 *   h₀  = baseline hazard rate
 *   β   = calibrated coefficients
 */

import {
  GovernanceScoreInput,
  HazardParams,
  GovernanceSurvivalResult,
  RiskLabel,
} from './types';

/**
 * Default hazard parameters.
 * Override via environment variables or config injection.
 */
export const DEFAULT_HAZARD_PARAMS: HazardParams = {
  h0:            parseFloat(process.env['GOV_H0']            ?? '0.05'),
  beta_G:        parseFloat(process.env['GOV_BETA_G']        ?? '1.5'),
  beta_velocity: parseFloat(process.env['GOV_BETA_VELOCITY'] ?? '0.4'),
  beta_volume:   parseFloat(process.env['GOV_BETA_VOLUME']   ?? '0.3'),
  beta_shadow:   parseFloat(process.env['GOV_BETA_SHADOW']   ?? '0.6'),
};

/**
 * Compute instantaneous hazard rate h for given governance inputs.
 */
export function computeHazardRate(
  input: GovernanceScoreInput,
  params: HazardParams = DEFAULT_HAZARD_PARAMS
): number {
  const { governance_score: G, velocity, volume, shadow } = input;
  const { h0, beta_G, beta_velocity, beta_volume, beta_shadow } = params;

  const exponent =
    beta_G * (1 - G) +
    beta_velocity * velocity +
    beta_volume * volume +
    beta_shadow * shadow;

  return h0 * Math.exp(exponent);
}

/**
 * Compute survival probability S(T) = exp(-h·T).
 */
export function computeSurvivalProb(hazardRate: number, horizonDays: number): number {
  return Math.exp(-hazardRate * horizonDays);
}

/**
 * Classify risk level from enforcement probability.
 */
export function classifyRisk(enforcementProb: number): RiskLabel {
  if (enforcementProb < 0.10) return 'LOW';
  if (enforcementProb < 0.30) return 'MODERATE';
  if (enforcementProb < 0.60) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Full governance survival computation.
 * Returns S(T), P_enf(T), hazard rate, and risk label.
 */
export function computeGovernanceSurvival(
  input: GovernanceScoreInput,
  horizonDays: number,
  params: HazardParams = DEFAULT_HAZARD_PARAMS
): GovernanceSurvivalResult {
  const h = computeHazardRate(input, params);
  const survivalProb = computeSurvivalProb(h, horizonDays);
  const enforcementProb = 1 - survivalProb;

  return {
    entity_type:      input.entity_type,
    entity_id:        input.entity_id,
    as_of:            new Date().toISOString(),
    horizon_days:     horizonDays,
    hazard_rate:      h,
    survival_prob:    survivalProb,
    enforcement_prob: enforcementProb,
    governance_score: input.governance_score,
    risk_label:       classifyRisk(enforcementProb),
  };
}
