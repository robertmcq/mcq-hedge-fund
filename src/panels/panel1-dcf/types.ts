/**
 * Panel 1 — Reverse DCF Engine
 * Type definitions for all inputs, outputs, and intermediate structures.
 */

export interface Security {
  security_id: string;
  ticker: string;
  name: string;
  asset_class: 'equity' | 'fixed_income' | 'crypto';
  sector: string;
  country: string;
  currency: string;
  primary_exchange: string;
}

export interface Fundamentals {
  security_id: string;
  period_end: string;       // ISO date YYYY-MM-DD
  freq: 'Q' | 'Y';
  revenue: number;
  ebit: number;
  ebitda: number;
  fcf: number;              // Free cash flow
  shares_out: number;       // Diluted shares outstanding
  net_debt: number;
}

export interface ProjectionScenario {
  scenario_id: string;
  name: string;
  description: string;
  discount_rate: number;        // WACC / hurdle rate as decimal e.g. 0.10
  terminal_growth_cap: number;  // Max terminal growth rate e.g. 0.03
}

export interface ReverseDCFConfig {
  security_id: string;
  scenario_id: string;
  horizon_years: number;        // Projection horizon (typically 5–10)
  terminal_multiple: number;    // Exit EV/EBITDA or P/FCF
  tax_rate: number;             // Effective tax rate as decimal e.g. 0.21
  last_updated: string;         // ISO timestamp
}

export interface ReverseDCFInput {
  security: Security;
  fundamentals: Fundamentals;   // Most recent annual
  scenario: ProjectionScenario;
  config: ReverseDCFConfig;
  current_price: number;
  enterprise_value?: number;    // If available from market data; computed if not
}

export interface ReverseDCFSnapshot {
  security_id: string;
  as_of: string;                // ISO timestamp
  scenario_id: string;
  price: number;
  market_cap: number;
  enterprise_value: number;
  implied_revenue_cagr: number;         // Decimal e.g. 0.18 = 18%
  implied_fcf_margin_traj: number;      // Terminal FCF margin decimal
  implied_terminal_growth: number;      // Decimal
  implied_irr: number;                  // Decimal
  house_hurdle_rate: number;            // From scenario.discount_rate
  mispricing_score: number;             // -1 to 1
  irr_spread: number;                   // implied_irr - house_hurdle_rate
}

export interface ExpectationsBridgeRow {
  bridge_id: string;
  security_id: string;
  as_of: string;
  year_offset: number;          // 1, 2, 3 ... horizon_years
  market_implied_fcf: number;
  house_fcf: number;
  delta_fcf: number;            // house - market (positive = bullish vs market)
}

export interface HouseProjection {
  year_offset: number;
  proj_revenue: number;
  proj_fcf_margin: number;
  proj_fcf: number;
}

export interface DCFEngineResult {
  snapshot: ReverseDCFSnapshot;
  bridge: ExpectationsBridgeRow[];
  house_projections: HouseProjection[];
  market_implied_terminal_revenue: number;
  market_implied_fcf_path: number[]; // one per year
  pv_of_terminal: number;
  pv_of_fcfs: number;
  computed_at: string;
}
