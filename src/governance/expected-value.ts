/**
 * Governance Scoring Module — Governance-Adjusted Expected Value
 *
 * EV_gov = P_win·AvgWin - P_loss·AvgLoss - P_enf(T)·EnfLoss
 *
 * Note: P_win + P_loss = 1 in baseline.
 * With enforcement: renormalize P_win and P_loss after adding P_enf branch.
 */

import { GovernanceSurvivalResult, GovernanceAdjustedEV } from './types';

export function computeGovernanceEV(
  p_win_baseline: number,       // Win rate from backtest
  avg_win: number,
  avg_loss: number,
  enforcement_loss: number,     // Modeled cost of enforcement event
  survival: GovernanceSurvivalResult
): GovernanceAdjustedEV {
  const { entity_id, as_of, enforcement_prob } = survival;

  // Baseline EV (no governance)
  const p_loss_baseline = 1 - p_win_baseline;
  const baseline_ev = p_win_baseline * avg_win - p_loss_baseline * avg_loss;

  // Renormalize for enforcement branch
  const p_enf = enforcement_prob;
  const scale = 1 - p_enf;  // Remaining probability for win/loss
  const p_win = p_win_baseline * scale;
  const p_loss = p_loss_baseline * scale;

  // Governance-adjusted EV
  const governance_ev =
    p_win * avg_win - p_loss * avg_loss - p_enf * enforcement_loss;

  const ev_haircut_pct =
    baseline_ev !== 0
      ? Math.abs((baseline_ev - governance_ev) / Math.abs(baseline_ev))
      : 0;

  return {
    entity_id,
    as_of,
    p_win,
    p_loss,
    p_enf,
    avg_win,
    avg_loss,
    enforcement_loss,
    baseline_ev,
    governance_ev,
    ev_haircut_pct,
  };
}
