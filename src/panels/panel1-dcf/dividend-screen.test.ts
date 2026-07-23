/**
 * panel1-dcf/dividend-screen.ts — unit tests
 *
 * Pure math functions — no fetch, no mocking required.
 *
 * Covers:
 *  - computeCAPM(): formula correctness, edge betas, env-var defaults
 *  - computeDDM(): valid spread, null on r≤g, exact boundary
 *  - computeDividendValuation(): UNDERVALUED, FAIRLY_VALUED, OVERVALUED,
 *    MODEL_INVALID path, premium_discount_pct sign, model_valid flag
 */

import { describe, expect, it } from 'vitest';
import {
  computeCAPM,
  computeDDM,
  computeDividendValuation,
  DEFAULT_CAPM,
} from './dividend-screen';
import type { CAPMInputs, DDMInputs } from './dividend-screen';

// ─── Reference CAPM inputs (Jul 2026) ────────────────────────────────────────
const CAPM_JUL26: CAPMInputs = {
  risk_free_rate: 0.0465,   // 4.65% U.S. 10-Year
  market_return:  0.10,     // 10% long-run
  beta:           0.8,
};

// ─── computeCAPM ─────────────────────────────────────────────────────────────

describe('computeCAPM', () => {
  it('returns correct required return for β=0.8 with Jul 2026 inputs', () => {
    // r = 0.0465 + 0.8 × (0.10 − 0.0465) = 0.0465 + 0.0428 = 0.0893
    expect(computeCAPM(CAPM_JUL26)).toBeCloseTo(0.0893, 6);
  });

  it('returns R_f when β=0 (risk-free asset)', () => {
    expect(computeCAPM({ ...CAPM_JUL26, beta: 0 })).toBeCloseTo(0.0465, 6);
  });

  it('returns R_m when β=1 (market portfolio)', () => {
    expect(computeCAPM({ ...CAPM_JUL26, beta: 1 })).toBeCloseTo(0.10, 6);
  });

  it('returns correct required return for low-risk stock β=0.7', () => {
    // r = 0.0465 + 0.7 × 0.0535 = 0.0465 + 0.03745 = 0.08395
    expect(computeCAPM({ ...CAPM_JUL26, beta: 0.7 })).toBeCloseTo(0.08395, 5);
  });

  it('returns correct required return for high-risk stock β=1.8', () => {
    // r = 0.0465 + 1.8 × 0.0535 = 0.0465 + 0.0963 = 0.1428
    expect(computeCAPM({ ...CAPM_JUL26, beta: 1.8 })).toBeCloseTo(0.1428, 5);
  });

  it('DEFAULT_CAPM has expected shape and value ranges', () => {
    expect(DEFAULT_CAPM.risk_free_rate).toBeGreaterThan(0);
    expect(DEFAULT_CAPM.market_return).toBeGreaterThan(DEFAULT_CAPM.risk_free_rate);
    expect(DEFAULT_CAPM.beta).toBeGreaterThan(0);
  });
});

// ─── computeDDM ──────────────────────────────────────────────────────────────

describe('computeDDM', () => {
  const ddmBase: DDMInputs = {
    next_dividend: 2.00,
    growth_rate:   0.04,
    current_price: 60.00,
  };

  it('computes intrinsic value correctly when r > g', () => {
    // r = 0.0893, g = 0.04 => spread = 0.0493 => P = 2.00 / 0.0493 ≈ 40.57
    const r = computeCAPM(CAPM_JUL26);
    expect(computeDDM(ddmBase, r)).toBeCloseTo(40.57, 1);
  });

  it('returns null when r = g (exact zero spread)', () => {
    const r = 0.04;
    expect(computeDDM(ddmBase, r)).toBeNull();
  });

  it('returns null when r < g (growth exceeds discount rate)', () => {
    const r = 0.03;
    expect(computeDDM(ddmBase, r)).toBeNull();
  });

  it('returns null for very small negative spread due to float comparison', () => {
    const r = 0.04 - Number.EPSILON;
    expect(computeDDM(ddmBase, r)).toBeNull();
  });

  it('returns a positive finite value for a small but positive spread', () => {
    const r = 0.041;
    const result = computeDDM(ddmBase, r);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
    expect(isFinite(result!)).toBe(true);
  });
});

// ─── computeDividendValuation ─────────────────────────────────────────────────

describe('computeDividendValuation', () => {
  const ddmBase: DDMInputs = {
    next_dividend: 2.00,
    growth_rate:   0.04,
    current_price: 60.00,
  };

  it('returns MODEL_INVALID and model_valid=false when r ≤ g', () => {
    const result = computeDividendValuation(
      'TEST',
      { ...CAPM_JUL26, beta: 0.0 },   // r = R_f = 0.0465 > g=0.04 — let’s force r<g
      { ...ddmBase, growth_rate: 0.10 } // g=10% > r
    );

    expect(result.valuation_flag).toBe('MODEL_INVALID');
    expect(result.model_valid).toBe(false);
    expect(result.ddm_intrinsic_value).toBe(0);
    expect(result.premium_discount_pct).toBe(0);
    expect(result.ticker).toBe('TEST');
  });

  it('flags UNDERVALUED when market price is more than 15% below intrinsic', () => {
    // r ≈ 0.0893, intrinsic ≈ 40.57; price = 30 => discount ≈ -26% => UNDERVALUED
    const result = computeDividendValuation(
      'KO',
      CAPM_JUL26,
      { ...ddmBase, current_price: 30 }
    );

    expect(result.valuation_flag).toBe('UNDERVALUED');
    expect(result.premium_discount_pct).toBeLessThan(-15);
    expect(result.model_valid).toBe(true);
  });

  it('flags OVERVALUED when market price is more than 15% above intrinsic', () => {
    // price = 60 => premium ≈ +48% => OVERVALUED
    const result = computeDividendValuation(
      'KO',
      CAPM_JUL26,
      { ...ddmBase, current_price: 60 }
    );

    expect(result.valuation_flag).toBe('OVERVALUED');
    expect(result.premium_discount_pct).toBeGreaterThan(15);
  });

  it('flags FAIRLY_VALUED when price is within ±15% of intrinsic', () => {
    // price = intrinsic ≈ 40.57; use 42 => premium ≈ +3.5% => FAIRLY_VALUED
    const result = computeDividendValuation(
      'KO',
      CAPM_JUL26,
      { ...ddmBase, current_price: 42 }
    );

    expect(result.valuation_flag).toBe('FAIRLY_VALUED');
    expect(Math.abs(result.premium_discount_pct)).toBeLessThanOrEqual(15);
  });

  it('premium_discount_pct is positive when market price > intrinsic', () => {
    const result = computeDividendValuation('KO', CAPM_JUL26, { ...ddmBase, current_price: 50 });
    expect(result.premium_discount_pct).toBeGreaterThan(0);
  });

  it('premium_discount_pct is negative when market price < intrinsic', () => {
    const result = computeDividendValuation('KO', CAPM_JUL26, { ...ddmBase, current_price: 20 });
    expect(result.premium_discount_pct).toBeLessThan(0);
  });

  it('passes ticker through to the result object', () => {
    const result = computeDividendValuation('PG', CAPM_JUL26, ddmBase);
    expect(result.ticker).toBe('PG');
  });

  it('sets as_of to a valid ISO timestamp', () => {
    const result = computeDividendValuation('KO', CAPM_JUL26, ddmBase);
    expect(() => new Date(result.as_of)).not.toThrow();
    expect(new Date(result.as_of).getTime()).toBeGreaterThan(0);
  });

  it('exposes capm_required_return correctly', () => {
    const result = computeDividendValuation('KO', CAPM_JUL26, ddmBase);
    expect(result.capm_required_return).toBeCloseTo(computeCAPM(CAPM_JUL26), 10);
  });
});
