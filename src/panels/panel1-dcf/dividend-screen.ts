/**
 * Panel 1 (DCF) — Dividend Screen
 *
 * Applies DDM / Gordon Growth Model valuation to dividend payers.
 * Computes intrinsic value vs. current price and flags over/undervaluation.
 *
 * Also computes CAPM-implied required return for each payer so the hurdle
 * rate is explicit rather than implicit.
 *
 * Established theory: Gordon Growth Model (Gordon, 1959), CAPM (Sharpe, 1964).
 * MCQ implementation: hurdle comparison, valuation flag, Panel 1 output schema.
 */

export interface CAPMInputs {
  risk_free_rate: number;    // e.g. 0.0465 for 4.65%
  market_return: number;     // e.g. 0.10 for 10%
  beta: number;
}

export interface DDMInputs {
  next_dividend: number;     // D₁ — next period's expected dividend per share
  growth_rate: number;       // g — long-run sustainable dividend growth rate
  current_price: number;     // P₀ — current market price
}

export interface DividendValuationResult {
  ticker: string;
  capm_required_return: number;   // r from CAPM
  ddm_intrinsic_value: number;    // P₀ = D₁ / (r - g)
  current_price: number;
  premium_discount_pct: number;   // (market_price - intrinsic) / intrinsic × 100
  valuation_flag: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED' | 'MODEL_INVALID';
  model_valid: boolean;           // false when r ≤ g (Gordon Growth assumes r > g)
  as_of: string;
}

/**
 * Default CAPM inputs — current U.S. market conditions (Jul 2026).
 * Override via config injection for different rate environments.
 */
export const DEFAULT_CAPM: CAPMInputs = {
  risk_free_rate:  parseFloat(process.env['CAPM_RF']  ?? '0.0465'),  // 4.65% U.S. 10-Year
  market_return:   parseFloat(process.env['CAPM_RM']  ?? '0.10'),    // 10% long-run
  beta:            parseFloat(process.env['CAPM_BETA'] ?? '0.8'),    // Typical dividend payer
};

/**
 * Compute CAPM-implied required return.
 * r = R_f + β(R_m - R_f)
 */
export function computeCAPM(inputs: CAPMInputs): number {
  const { risk_free_rate, market_return, beta } = inputs;
  return risk_free_rate + beta * (market_return - risk_free_rate);
}

/**
 * Compute Gordon Growth Model intrinsic value.
 * P₀ = D₁ / (r - g)
 *
 * Returns null if r ≤ g (model is invalid — growth rate exceeds discount rate).
 */
export function computeDDM(
  ddm: DDMInputs,
  required_return: number
): number | null {
  const { next_dividend, growth_rate } = ddm;
  const spread = required_return - growth_rate;
  if (spread <= 0) return null;  // Model invalid — cannot value a perpetuity growing faster than discount rate
  return next_dividend / spread;
}

/**
 * Full dividend valuation: CAPM hurdle + DDM intrinsic value + valuation flag.
 */
export function computeDividendValuation(
  ticker: string,
  capm_inputs: CAPMInputs,
  ddm_inputs: DDMInputs
): DividendValuationResult {
  const required_return = computeCAPM(capm_inputs);
  const intrinsic = computeDDM(ddm_inputs, required_return);

  if (intrinsic === null) {
    return {
      ticker,
      capm_required_return: required_return,
      ddm_intrinsic_value: 0,
      current_price: ddm_inputs.current_price,
      premium_discount_pct: 0,
      valuation_flag: 'MODEL_INVALID',
      model_valid: false,
      as_of: new Date().toISOString(),
    };
  }

  const premium_discount_pct =
    ((ddm_inputs.current_price - intrinsic) / intrinsic) * 100;

  let valuation_flag: DividendValuationResult['valuation_flag'];
  if (premium_discount_pct < -15) {
    valuation_flag = 'UNDERVALUED';
  } else if (premium_discount_pct > 15) {
    valuation_flag = 'OVERVALUED';
  } else {
    valuation_flag = 'FAIRLY_VALUED';
  }

  return {
    ticker,
    capm_required_return: required_return,
    ddm_intrinsic_value: intrinsic,
    current_price: ddm_inputs.current_price,
    premium_discount_pct,
    valuation_flag,
    model_valid: true,
    as_of: new Date().toISOString(),
  };
}
