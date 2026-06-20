/**
 * Panel 2 — Peer Benchmarking & Comps
 * UI-ready formatting for z-score tiles and breach alerts.
 */

import { PeerZScoreSnapshot, PeerRuleBreachEvent, Panel2EngineResult } from './types';

export type ZScoreSignal = '\uD83D\uDFE2 CHEAP' | '\uD83D\uDFE1 FAIR' | '\uD83D\uDD34 EXPENSIVE' | '\u26AA IN-LINE';

export function zScoreSignal(zscore: number): ZScoreSignal {
  if (zscore <= -1.5) return '\uD83D\uDFE2 CHEAP';
  if (zscore >= 1.5)  return '\uD83D\uDD34 EXPENSIVE';
  if (Math.abs(zscore) <= 0.5) return '\u26AA IN-LINE';
  return '\uD83D\uDFE1 FAIR';
}

export function formatZScoreTile(snap: PeerZScoreSnapshot): string {
  const dir = snap.premium_discount_pct >= 0 ? '+' : '';
  return [
    `${snap.metric_name.padEnd(16)} z=${snap.zscore.toFixed(2).padStart(6)}  ${zScoreSignal(snap.zscore)}`,
    `  value=${snap.value.toFixed(2)}  peer_median=${snap.value / (1 + snap.premium_discount_pct) > 0
      ? (snap.value / (1 + snap.premium_discount_pct)).toFixed(2) : 'n/a'}`,
    `  premium=${dir}${(snap.premium_discount_pct * 100).toFixed(1)}%  pct_rank=${(snap.pct_rank * 100).toFixed(0)}th`,
  ].join('\n');
}

export function formatBreachAlert(breach: PeerRuleBreachEvent): string {
  return `[${breach.severity.toUpperCase()}] ${breach.rule_code} | ` +
    `${breach.metric_name} z=${breach.zscore.toFixed(2)} | security=${breach.security_id}`;
}

export function formatPanel2Summary(result: Panel2EngineResult): string {
  const lines: string[] = [
    `=== Panel 2: Peer Comps — ${result.target_security_id} vs group ${result.peer_group_id} ===`,
    `as_of: ${result.as_of}`,
    '',
    '--- Z-Score Tiles ---',
    ...result.target_zscores.map(formatZScoreTile),
  ];
  if (result.breaches.length) {
    lines.push('', '--- Governance Breaches ---');
    result.breaches.forEach((b) => lines.push(formatBreachAlert(b)));
  } else {
    lines.push('', '✅ No governance band breaches detected.');
  }
  return lines.join('\n');
}
