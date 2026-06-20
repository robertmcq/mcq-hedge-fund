/**
 * Governance Scoring Module
 * Type definitions for hazard model, Kelly sizing, and governance outputs.
 */

export type EntityType = 'issuer' | 'strategy' | 'agent' | 'portfolio';

export interface GovernanceScoreInput {
  entity_type: EntityType;
  entity_id: string;
  governance_score: number;  // G ∈ [0, 1] — 1 = best governance
  velocity: number;          // Decision/transaction velocity covariate [0, 1]
  volume: number;            // Transaction volume covariate [0, 1]
  shadow: number;            // Shadow exposure covariate [0, 1]
  [key: string]: unknown;    // Extensible for additional covariates
}

export interface HazardParams {
  h0: number;           // Baseline hazard rate
  beta_G: number;       // Coefficient on (1 - G)
  beta_velocity: number;
  beta_volume: number;
  beta_shadow: number;
}

export interface GovernanceSurvivalResult {
  entity_type: EntityType;
  entity_id: string;
  as_of: string;             // ISO timestamp
  horizon_days: number;      // T
  hazard_rate: number;       // h
  survival_prob: number;     // S(T) = exp(-h·T)
  enforcement_prob: number;  // P_enf = 1 - S(T)
  governance_score: number;  // G (input, echoed)
  risk_label: RiskLabel;
}

export type RiskLabel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface KellyInput {
  win_rate: number;          // W₀ from backtest (0–1)
  avg_win: number;           // Average win in $ or units
  avg_loss: number;          // Average loss in $ or units (positive number)
  account_equity: number;   // Total account equity $
  survival_result: GovernanceSurvivalResult;
  fractional_kelly_factor?: number; // Default 0.25
}

export interface KellyResult {
  entity_id: string;
  as_of: string;
  baseline_kelly: number;        // f_Kelly = W - (1-W)/R
  governance_discount: number;   // d = S(T)
  effective_win_rate: number;    // W_eff = W₀ × d
  governance_kelly: number;      // f_Kelly_gov
  fractional_kelly_factor: number;
  risk_per_trade: number;        // $ at risk
  max_position_size: number;     // risk_per_trade expressed as position size
  kelly_ratio: number;           // f_Kelly_gov / f_Kelly (1 = no gov haircut)
  signal: KellySignal;
}

export type KellySignal = 'FULL_SIZE' | 'REDUCED_SIZE' | 'MINIMAL_SIZE' | 'NO_TRADE';

export interface GovernanceAdjustedEV {
  entity_id: string;
  as_of: string;
  p_win: number;
  p_loss: number;
  p_enf: number;          // P_enf(T) from survival model
  avg_win: number;
  avg_loss: number;
  enforcement_loss: number; // Modeled severity of enforcement event
  baseline_ev: number;     // P_win × AvgWin - P_loss × AvgLoss
  governance_ev: number;   // Baseline EV - P_enf × EnfLoss
  ev_haircut_pct: number;  // (baseline_ev - gov_ev) / |baseline_ev|
}

export interface GovernanceAlert {
  alert_id: string;
  entity_type: EntityType;
  entity_id: string;
  triggered_at: string;
  enforcement_prob: number;
  threshold_breached: number;
  severity: 'warn' | 'high' | 'critical';
  recommended_action: string;
}
