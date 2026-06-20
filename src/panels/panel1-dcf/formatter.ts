/**
 * Panel 1 — Reverse DCF Engine
 * Human-readable formatters for UI display and logging.
 */

import { DCFEngineResult, ReverseDCFSnapshot } from './types';

const pct = (v: number, decimals = 1) => `${(v * 100).toFixed(decimals)}%`;
const usd = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const score = (v: number) => v.toFixed(3);

export function formatSnapshot(s: ReverseDCFSnapshot): Record<string, string> {
  return {
    'Security ID':          s.security_id,
    'As Of':                s.as_of,
    'Price':                usd(s.price),
    'Market Cap':           usd(s.market_cap),
    'Enterprise Value':     usd(s.enterprise_value),
    'Implied Rev CAGR':     pct(s.implied_revenue_cagr),
    'Implied FCF Margin':   pct(s.implied_fcf_margin_traj),
    'Implied Terminal g':   pct(s.implied_terminal_growth),
    'Implied IRR':          pct(s.implied_irr),
    'House Hurdle Rate':    pct(s.house_hurdle_rate),
    'IRR Spread':           pct(s.irr_spread),
    'Mispricing Score':     score(s.mispricing_score),
    'Signal': mispricingLabel(s.mispricing_score),
  };
}

function mispricingLabel(score: number): string {
  if (score >= 0.5)  return '🟢 ATTRACTIVE — implied assumptions conservative vs house view';
  if (score >= 0.15) return '🟡 MILD UPSIDE — market pricing in modest growth';
  if (score >= -0.15)return '⚪ FAIRLY PRICED — implied vs house roughly aligned';
  if (score >= -0.5) return '🟠 MILD DOWNSIDE — market pricing optimistic assumptions';
  return '🔴 EXPENSIVE — market implies growth far above house view';
}

export function formatBridge(result: DCFEngineResult): string {
  const rows = result.bridge.map((b) =>
    `  Year ${b.year_offset}: Market FCF ${usd(b.market_implied_fcf)} | House FCF ${usd(b.house_fcf)} | Delta ${usd(b.delta_fcf)}`
  );
  return [
    '--- Expectations Bridge ---',
    ...rows,
    `  PV of FCFs:     ${usd(result.pv_of_fcfs)}`,
    `  PV of Terminal: ${usd(result.pv_of_terminal)}`,
    `  Terminal Rev:   ${usd(result.market_implied_terminal_revenue)}`,
  ].join('\n');
}
