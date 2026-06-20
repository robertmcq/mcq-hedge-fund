/**
 * Governance Scoring Module — Alert Generation
 *
 * Generates GovernanceAlert records when enforcement probability
 * exceeds configured thresholds. These feed into Panel 5 action_item.
 */

import { v4 as uuidv4 } from 'uuid';
import { GovernanceSurvivalResult, GovernanceAlert } from './types';

export interface AlertThresholds {
  warn: number;     // e.g. 0.15
  high: number;     // e.g. 0.35
  critical: number; // e.g. 0.60
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  warn:     parseFloat(process.env['GOV_ALERT_WARN']     ?? '0.15'),
  high:     parseFloat(process.env['GOV_ALERT_HIGH']     ?? '0.35'),
  critical: parseFloat(process.env['GOV_ALERT_CRITICAL'] ?? '0.60'),
};

/**
 * Evaluate a survival result against thresholds.
 * Returns an alert if a threshold is breached, null otherwise.
 */
export function evaluateGovernanceAlert(
  result: GovernanceSurvivalResult,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): GovernanceAlert | null {
  const { entity_type, entity_id, enforcement_prob, as_of } = result;

  let severity: GovernanceAlert['severity'] | null = null;
  let threshold_breached = 0;
  let recommended_action = '';

  if (enforcement_prob >= thresholds.critical) {
    severity = 'critical';
    threshold_breached = thresholds.critical;
    recommended_action =
      'BLOCK — enforcement probability exceeds critical threshold. '
      + 'Do not initiate new positions. Review and remediate governance issues immediately.';
  } else if (enforcement_prob >= thresholds.high) {
    severity = 'high';
    threshold_breached = thresholds.high;
    recommended_action =
      'REDUCE — enforcement probability is high. '
      + 'Reduce position sizes to minimum Kelly. Escalate to Risk Officer.';
  } else if (enforcement_prob >= thresholds.warn) {
    severity = 'warn';
    threshold_breached = thresholds.warn;
    recommended_action =
      'MONITOR — enforcement probability above warning threshold. '
      + 'Apply governance discount to Kelly sizing. Log for PM review.';
  }

  if (!severity) return null;

  return {
    alert_id: uuidv4(),
    entity_type,
    entity_id,
    triggered_at: as_of,
    enforcement_prob,
    threshold_breached,
    severity,
    recommended_action,
  };
}

/**
 * Batch-evaluate multiple survival results.
 */
export function evaluateGovernanceAlerts(
  results: GovernanceSurvivalResult[],
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): GovernanceAlert[] {
  return results
    .map((r) => evaluateGovernanceAlert(r, thresholds))
    .filter((a): a is GovernanceAlert => a !== null);
}
