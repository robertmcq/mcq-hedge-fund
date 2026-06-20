/**
 * Governance Scoring Module
 * Public API surface.
 */

export { computeHazardRate, computeSurvivalProb, computeGovernanceSurvival, classifyRisk, DEFAULT_HAZARD_PARAMS } from './hazard';
export { computeGovernanceKelly, baselineKelly, DEFAULT_FRACTIONAL_KELLY } from './kelly';
export { computeGovernanceEV } from './expected-value';
export { evaluateGovernanceAlert, evaluateGovernanceAlerts, DEFAULT_THRESHOLDS } from './alerts';
export { runGovernanceScorer } from './scorer';
export type {
  EntityType,
  GovernanceScoreInput,
  HazardParams,
  GovernanceSurvivalResult,
  RiskLabel,
  KellyInput,
  KellyResult,
  KellySignal,
  GovernanceAdjustedEV,
  GovernanceAlert,
} from './types';
export type { GovernanceDecision, GovernanceDecisionSummary, ScorerInput } from './scorer';
