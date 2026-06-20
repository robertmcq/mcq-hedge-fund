/**
 * Panel 2 — Peer Benchmarking & Comps
 * Main engine: computes peer distribution stats, target z-scores,
 * premium/discount, and detects governance band breaches.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Panel2EngineInput,
  Panel2EngineResult,
  PeerStatsSnapshot,
  PeerZScoreSnapshot,
  PeerRuleBreachEvent,
  ValuationMetric,
  PeerGovernanceBand,
  ValuationSnapshot,
} from './types';
import { sortedValues, percentile, median, stdDev, zScore, percentileRank } from './stats';

const ALL_METRICS: ValuationMetric[] = [
  'pe_fwd', 'ev_ebitda_fwd', 'ev_revenue_fwd', 'ev_fcf', 'fcf_yield', 'div_yield',
];

function getMetricValue(snap: ValuationSnapshot, metric: ValuationMetric): number | undefined {
  return snap[metric];
}

function buildPeerStats(
  peer_group_id: string,
  as_of: string,
  metric: ValuationMetric,
  values: number[]
): PeerStatsSnapshot {
  const s = sortedValues(values);
  return {
    peer_group_id,
    as_of,
    metric_name: metric,
    median: median(values),
    p25: percentile(s, 25),
    p75: percentile(s, 75),
    min: s[0] ?? 0,
    max: s[s.length - 1] ?? 0,
    std_dev: stdDev(values),
  };
}

function buildZScore(
  security_id: string,
  peer_group_id: string,
  as_of: string,
  metric: ValuationMetric,
  value: number,
  stats: PeerStatsSnapshot,
  peerValues: number[]
): PeerZScoreSnapshot {
  const z = zScore(value, stats.median, stats.std_dev);
  const pctRank = percentileRank(sortedValues(peerValues), value);
  const premium = stats.median !== 0 ? value / stats.median - 1 : 0;
  return {
    security_id,
    peer_group_id,
    as_of,
    metric_name: metric,
    value,
    zscore: parseFloat(z.toFixed(4)),
    pct_rank: parseFloat(pctRank.toFixed(4)),
    premium_discount_pct: parseFloat(premium.toFixed(4)),
  };
}

function detectBreaches(
  zscoreSnap: PeerZScoreSnapshot,
  bands: PeerGovernanceBand[]
): PeerRuleBreachEvent[] {
  const breaches: PeerRuleBreachEvent[] = [];
  for (const band of bands) {
    if (band.metric_name !== zscoreSnap.metric_name) continue;
    const outside = zscoreSnap.zscore < band.min_z || zscoreSnap.zscore > band.max_z;
    if (outside) {
      const dir = zscoreSnap.zscore > band.max_z ? 'ABOVE' : 'BELOW';
      breaches.push({
        event_id: uuidv4(),
        security_id: zscoreSnap.security_id,
        peer_group_id: zscoreSnap.peer_group_id,
        as_of: zscoreSnap.as_of,
        metric_name: zscoreSnap.metric_name,
        value: zscoreSnap.value,
        zscore: zscoreSnap.zscore,
        rule_code: `PEER_ZSCORE_${dir}_BAND_${band.severity_level.toUpperCase()}`,
        severity: band.severity_level,
        has_fundamental_event_flag: false,
      });
    }
  }
  return breaches;
}

export function runPanel2Engine(input: Panel2EngineInput): Panel2EngineResult {
  const as_of = input.as_of ?? new Date().toISOString();
  const metrics = input.metrics ?? ALL_METRICS;
  const { target_security_id, peer_group, valuations, governance_bands } = input;

  const targetSnap = valuations.find((v) => v.security_id === target_security_id);
  if (!targetSnap) throw new Error(`No valuation snapshot found for target ${target_security_id}`);

  const peerSnaps = valuations.filter((v) => v.security_id !== target_security_id);

  const peer_stats: PeerStatsSnapshot[] = [];
  const target_zscores: PeerZScoreSnapshot[] = [];
  const breaches: PeerRuleBreachEvent[] = [];

  for (const metric of metrics) {
    const peerValues = peerSnaps
      .map((s) => getMetricValue(s, metric))
      .filter((v): v is number => v !== undefined && isFinite(v));

    if (peerValues.length < 2) continue; // need at least 2 peers for stats

    const stats = buildPeerStats(peer_group.peer_group_id, as_of, metric, peerValues);
    peer_stats.push(stats);

    const targetValue = getMetricValue(targetSnap, metric);
    if (targetValue === undefined || !isFinite(targetValue)) continue;

    const zsnap = buildZScore(
      target_security_id,
      peer_group.peer_group_id,
      as_of,
      metric,
      targetValue,
      stats,
      peerValues
    );
    target_zscores.push(zsnap);

    const metricBreaches = detectBreaches(zsnap, governance_bands);
    breaches.push(...metricBreaches);
  }

  return {
    peer_stats,
    target_zscores,
    breaches,
    as_of,
    peer_group_id: peer_group.peer_group_id,
    target_security_id,
  };
}
