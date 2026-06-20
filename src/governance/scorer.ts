/**
 * Governance Scoring Module — Master Scorer
 *
 * Orchestrates the full governance pipeline for a single entity:
 *   1. Compute hazard rate
 *   2. Compute survival & enforcement probability
 *   3. Compute governance-adjusted EV
 *   4. Compute governance-adjusted Kelly sizing
 *   5. Evaluate alerts
 *   6. Return unified GovernanceDecision
 */

import { computeGovernanceSurvival } from './hazard';
import { computeGovernanceKelly } from './kelly';
import { computeGovernanceEV } from './expected-value';
import { evaluateGovernanceAlert } from './alerts';
import {
  GovernanceScoreInput,
  HazardParams,
  KellyResult,
  GovernanceSurvivalResult,
  GovernanceAdjustedEV,
  GovernanceAlert,
} from './types';

export interface GovernanceDecision {
  entity_id: string;
  entity_type: string;
  as_of: string;
  survival: GovernanceSurvivalResult;
  kelly: KellyResult;
  expected_value: GovernanceAdjustedEV;
  alert: GovernanceAlert | null;
  summary: GovernanceDecisionSummary;
}

export interface GovernanceDecisionSummary {
  risk_label: string;
  kelly_signal: string;
  enforcement_prob_pct: string;
  risk_per_trade_usd: string;
  governance_ev_usd: string;
  recommended_action: string;
}

export interface ScorerInput {
  governance: GovernanceScoreInput;
  horizon_days: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  enforcement_loss: number;
  account_equity: number;
  fractional_kelly_factor?: number;
  hazard_params?: HazardParams;
}

export function runGovernanceScorer(input: ScorerInput): GovernanceDecision {
  const {
    governance,
    horizon_days,
    win_rate,
    avg_win,
    avg_loss,
    enforcement_loss,
    account_equity,
    fractional_kelly_factor,
    hazard_params,
  } = input;

  // Step 1 & 2: Survival model
  const survival = computeGovernanceSurvival(
    governance,
    horizon_days,
    hazard_params
  );

  // Step 3: Governance EV
  const expected_value = computeGovernanceEV(
    win_rate,
    avg_win,
    avg_loss,
    enforcement_loss,
    survival
  );

  // Step 4: Kelly sizing
  const kelly = computeGovernanceKelly({
    win_rate,
    avg_win,
    avg_loss,
    account_equity,
    survival_result: survival,
    fractional_kelly_factor,
  });

  // Step 5: Alert evaluation
  const alert = evaluateGovernanceAlert(survival);

  // Step 6: Summary
  const summary: GovernanceDecisionSummary = {
    risk_label:           survival.risk_label,
    kelly_signal:         kelly.signal,
    enforcement_prob_pct: `${(survival.enforcement_prob * 100).toFixed(1)}%`,
    risk_per_trade_usd:   `$${kelly.risk_per_trade.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    governance_ev_usd:    `$${expected_value.governance_ev.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    recommended_action:   alert?.recommended_action ?? 'PROCEED — governance within acceptable thresholds.',
  };

  return {
    entity_id:      governance.entity_id,
    entity_type:    governance.entity_type,
    as_of:          survival.as_of,
    survival,
    kelly,
    expected_value,
    alert,
    summary,
  };
}
