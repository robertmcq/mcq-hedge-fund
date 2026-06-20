/**
 * Governance Scoring Module — Kelly Sizing
 *
 * Governance-adjusted Kelly fraction:
 *   d = S(T)                         ← survival prob as discount
 *   W_eff = W₀ × d                   ← governance-discounted win rate
 *   f_Kelly_gov = W_eff - (1-W_eff)/R ← governance-adjusted Kelly fraction
 *   RiskPerTrade = Equity × f_fraction × max(0, f_Kelly_gov)
 */

import { KellyInput, KellyResult, KellySignal } from './types';

export const DEFAULT_FRACTIONAL_KELLY = parseFloat(
  process.env['KELLY_FRACTION_FACTOR'] ?? '0.25'
);

/**
 * Standard Kelly fraction (no governance adjustment).
 */
export function baselineKelly(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss <= 0) throw new Error('avgLoss must be positive');
  const R = avgWin / avgLoss;
  return winRate - (1 - winRate) / R;
}

/**
 * Classify Kelly sizing signal.
 */
function kellySignal(f: number): KellySignal {
  if (f <= 0)    return 'NO_TRADE';
  if (f < 0.05)  return 'MINIMAL_SIZE';
  if (f < 0.20)  return 'REDUCED_SIZE';
  return 'FULL_SIZE';
}

/**
 * Full governance-adjusted Kelly computation.
 */
export function computeGovernanceKelly(input: KellyInput): KellyResult {
  const {
    win_rate,
    avg_win,
    avg_loss,
    account_equity,
    survival_result,
    fractional_kelly_factor = DEFAULT_FRACTIONAL_KELLY,
  } = input;

  const { entity_id, survival_prob, as_of } = survival_result;

  if (avg_loss <= 0) throw new Error('avg_loss must be positive');
  const R = avg_win / avg_loss;

  // Baseline Kelly (no governance)
  const baseline_kelly = win_rate - (1 - win_rate) / R;

  // Governance discount
  const governance_discount = survival_prob; // d = S(T)
  const effective_win_rate = win_rate * governance_discount;

  // Governance-adjusted Kelly
  const governance_kelly = effective_win_rate - (1 - effective_win_rate) / R;

  // Operational position size
  const risk_per_trade =
    account_equity * fractional_kelly_factor * Math.max(0, governance_kelly);

  // Max position size assuming avg_loss as % of position
  const max_position_size =
    avg_loss > 0 ? risk_per_trade / (avg_loss / (avg_win + avg_loss)) : 0;

  const kelly_ratio =
    baseline_kelly !== 0 ? governance_kelly / baseline_kelly : 0;

  return {
    entity_id,
    as_of,
    baseline_kelly,
    governance_discount,
    effective_win_rate,
    governance_kelly,
    fractional_kelly_factor,
    risk_per_trade,
    max_position_size,
    kelly_ratio,
    signal: kellySignal(governance_kelly),
  };
}
