/**
 * Panel 3 — Portfolio Live State & Risk
 * Types for positions, snapshots, Kelly budgets, and risk limits.
 */

export type PositionSide = 'long' | 'short';
export type LimitType = 'MAX_DRAWDOWN' | 'MAX_POSITION_PCT' | 'MAX_LEVERAGE' | 'MAX_FACTOR';

export interface Portfolio {
  portfolio_id: string;
  name: string;
  benchmark_id?: string;
  base_currency: string;
}

export interface Position {
  portfolio_id: string;
  security_id: string;
  date_time: string;
  quantity: number;
  avg_cost: number;
  side: PositionSide;
}

export interface PricePoint {
  security_id: string;
  price: number;
  date_time: string;
}

export interface PositionMark {
  portfolio_id: string;
  security_id: string;
  date_time: string;
  quantity: number;
  side: PositionSide;
  avg_cost: number;
  current_price: number;
  market_value: number;
  notional_exposure: number;
  pnl: number;
  pnl_pct: number;
  position_pct_of_equity: number;
}

export interface PortfolioEquitySnapshot {
  portfolio_id: string;
  date_time: string;
  equity_value: number;
  cash: number;
  gross_exposure: number;
  net_exposure: number;
  leverage: number;
  pnl_intraday: number;
  pnl_ytd: number;
}

export interface DrawdownSnapshot {
  portfolio_id: string;
  date_time: string;
  equity_high_watermark: number;
  current_drawdown_pct: number;
  rolling_max_drawdown_pct: number;
  window_days: number;
}

export interface RiskLimit {
  limit_id: string;
  portfolio_id: string;
  limit_type: LimitType;
  threshold_value: number;
  hard_flag: boolean;
}

export interface RiskBreachEvent {
  event_id: string;
  portfolio_id: string;
  date_time: string;
  limit_id: string;
  limit_type: LimitType;
  observed_value: number;
  threshold_value: number;
  severity: 'warn' | 'high' | 'critical';
  auto_action: 'alert' | 'resize' | 'block';
  details: string;
}

export interface PositionGovernanceSnapshot {
  portfolio_id: string;
  security_id: string;
  date_time: string;
  governance_score: number;
  survival_prob: number;
  enforcement_prob: number;
  kelly_fraction_eff: number;
  risk_per_trade: number;
}

export interface PortfolioKellyBudget {
  portfolio_id: string;
  date_time: string;
  total_equity: number;
  kelly_fraction_gov: number;
  fractional_kelly_factor: number;
  max_risk_per_trade: number;
  max_total_risk: number;
}

export interface PositionKellyInput {
  portfolio_id: string;
  security_id: string;
  governance_score: number;
  survival_prob: number;
  enforcement_prob: number;
  governance_kelly: number;
  risk_per_trade: number;
}

export interface PortfolioRiskEngineInput {
  portfolio: Portfolio;
  positions: Position[];
  prices: PricePoint[];
  cash: number;
  prior_equity_value?: number;
  ytd_start_equity?: number;
  equity_history?: Array<{ date_time: string; equity_value: number }>;
  kelly_inputs?: PositionKellyInput[];
  risk_limits?: RiskLimit[];
}

export interface PortfolioRiskEngineResult {
  marked_positions: PositionMark[];
  equity_snapshot: PortfolioEquitySnapshot;
  drawdown_snapshot: DrawdownSnapshot;
  kelly_budget: PortfolioKellyBudget;
  position_governance_snapshots: PositionGovernanceSnapshot[];
  risk_breaches: RiskBreachEvent[];
}
