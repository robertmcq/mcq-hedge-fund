/**
 * Panel 2 — Peer Benchmarking & Comps
 * Types for peer groups, valuation snapshots, z-scores, and breach events.
 */

export type PeerGroupMethod = 'manual' | 'rules-based';

export interface PeerGroup {
  peer_group_id: string;
  name: string;
  label: string;
  method: PeerGroupMethod;
  created_by: string;
}

export interface PeerGroupRule {
  peer_group_id: string;
  sector_in?: string[];
  min_growth?: number;
  max_growth?: number;
  min_margin?: number;
  max_margin?: number;
  size_bucket?: string;
}

export interface PeerMembership {
  peer_group_id: string;
  security_id: string;
  as_of: string;
  source: 'manual' | 'auto';
}

export type ValuationMetric =
  | 'pe_fwd'
  | 'ev_ebitda_fwd'
  | 'ev_revenue_fwd'
  | 'ev_fcf'
  | 'fcf_yield'
  | 'div_yield';

export interface ValuationSnapshot {
  security_id: string;
  as_of: string;
  pe_fwd?: number;
  ev_ebitda_fwd?: number;
  ev_revenue_fwd?: number;
  ev_fcf?: number;
  fcf_yield?: number;
  div_yield?: number;
}

export interface PeerStatsSnapshot {
  peer_group_id: string;
  as_of: string;
  metric_name: ValuationMetric;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  std_dev: number;
}

export interface PeerZScoreSnapshot {
  security_id: string;
  peer_group_id: string;
  as_of: string;
  metric_name: ValuationMetric;
  value: number;
  zscore: number;
  pct_rank: number;         // 0–1 percentile rank within peer group
  premium_discount_pct: number; // (value / median) - 1
}

export interface PeerGovernanceBand {
  metric_name: ValuationMetric;
  min_z: number;
  max_z: number;
  severity_level: 'info' | 'warn' | 'high' | 'critical';
}

export interface PeerRuleBreachEvent {
  event_id: string;
  security_id: string;
  peer_group_id: string;
  as_of: string;
  metric_name: ValuationMetric;
  value: number;
  zscore: number;
  rule_code: string;
  severity: 'info' | 'warn' | 'high' | 'critical';
  has_fundamental_event_flag: boolean;
}

export interface SecurityFundamentals {
  security_id: string;
  revenue_growth?: number;   // YoY %
  ebit_margin?: number;
  sector?: string;
  size_bucket?: 'small' | 'mid' | 'large' | 'mega';
}

export interface Panel2EngineInput {
  target_security_id: string;
  peer_group: PeerGroup;
  members: PeerMembership[];
  valuations: ValuationSnapshot[];       // all members + target
  governance_bands: PeerGovernanceBand[];
  as_of?: string;
  metrics?: ValuationMetric[];           // defaults to all
}

export interface Panel2EngineResult {
  peer_stats: PeerStatsSnapshot[];
  target_zscores: PeerZScoreSnapshot[];
  breaches: PeerRuleBreachEvent[];
  as_of: string;
  peer_group_id: string;
  target_security_id: string;
}
