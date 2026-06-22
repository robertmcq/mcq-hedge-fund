/**
 * Governance Scoring Module — Master Scorer
 *
 * Orchestrates the full governance pipeline for a single entity:
 *   1. Validate input shape (runtime guard — catches flat-payload mismatches from ledger)
 *   2. Compute hazard rate
 *   3. Compute survival & enforcement probability
 *   4. Compute governance-adjusted EV
 *   5. Compute governance-adjusted Kelly sizing
 *   6. Evaluate alerts
 *   7. Return unified GovernanceDecision
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

/**
 * Runtime shape guard — throws early with a descriptive error rather than
 * silently producing NaN survival probabilities from an undefined governance object.
 *
 * This catches the most common live-data mismatch: a ledger event written with
 * flat governance fields at the top level instead of the expected nested shape.
 */
function assertScorerInput(input: unknown): asserts input is ScorerInput {
  if (!input || typeof input !== 'object') {
    throw new TypeError('[GovernanceScorer] Input must be a non-null object');
  }
  const i = input as Record<string, unknown>;

  if (!i['governance'] || typeof i['governance'] !== 'object') {
    throw new TypeError(
      '[GovernanceScorer] input.governance is missing or not an object. ' +
      'Expected nested GovernanceScoreInput shape. ' +
      'Got: ' + JSON.stringify(i['governance'])
    );
  }

  const g = i['governance'] as Record<string, unknown>;
  const requiredGovFields: Array<keyof GovernanceScoreInput> = [
    'entity_type', 'entity_id', 'governance_score', 'velocity', 'volume', 'shadow',
  ];
  for (const field of requiredGovFields) {
    if (g[field] === undefined || g[field] === null) {
      throw new TypeError(
        `[GovernanceScorer] input.governance.${field} is missing. ` +
        'Check that the event payload uses the nested governance shape.'
      );
    }
  }

  const numericFields: Array<keyof ScorerInput> = [
    'horizon_days', 'win_rate', 'avg_win', 'avg_loss', 'enforcement_loss', 'account_equity',
  ];
  for (const field of numericFields) {
    if (typeof i[field] !== 'number' || isNaN(i[field] as number)) {
      throw new TypeError(
        `[GovernanceScorer] input.${field} must be a finite number. Got: ${i[field]}`
      );
    }
  }
}

export function runGovernanceScorer(input: ScorerInput): GovernanceDecision {
  // Guard first — surfaces shape mismatches as thrown errors so the replay
  // engine captures them in errors[] rather than silently producing NaN output.
  assertScorerInput(input);

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

  // Step 2 & 3: Survival model
  const survival = computeGovernanceSurvival(
    governance,
    horizon_days,
    hazard_params
  );

  // Step 4: Governance EV
  const expected_value = computeGovernanceEV(
    win_rate,
    avg_win,
    avg_loss,
    enforcement_loss,
    survival
  );

  // Step 5: Kelly sizing
  const kelly = computeGovernanceKelly({
    win_rate,
    avg_win,
    avg_loss,
    account_equity,
    survival_result: survival,
    fractional_kelly_factor,
  });

  // Step 6: Alert evaluation
  const alert = evaluateGovernanceAlert(survival);

  // Step 7: Summary
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
