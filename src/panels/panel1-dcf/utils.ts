/**
 * Panel 1 — Reverse DCF Engine
 * Math utilities: NPV, IRR (bisection), CAGR, clamp.
 */

import { v4 as uuidv4 } from 'uuid';
export { uuidv4 };

/**
 * Compute present value of a series of cash flows discounted at `rate`.
 * cashFlows[0] = year 1, cashFlows[n-1] = year n.
 */
export function npv(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((acc, cf, i) => {
    return acc + cf / Math.pow(1 + rate, i + 1);
  }, 0);
}

/**
 * Compute IRR via bisection method.
 * Finds rate r such that NPV(cashFlows, r) ≈ 0.
 * The first element of cashFlows should be the initial outlay (negative).
 */
export function irr(
  cashFlows: number[],
  tolerance = 1e-7,
  maxIterations = 1000
): number {
  let low = -0.9999;
  let high = 10.0; // 1000% upper bound

  const f = (r: number) =>
    cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i), 0);

  if (f(low) * f(high) > 0) {
    // No sign change — fallback to NaN
    return NaN;
  }

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }
    if (f(low) * fMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * Compound annual growth rate from start to end over T years.
 */
export function cagr(start: number, end: number, years: number): number {
  if (start <= 0 || years <= 0) return NaN;
  return Math.pow(end / start, 1 / years) - 1;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a spread (e.g. IRR - hurdle) to [-1, 1] using a sigmoid-like scaling.
 * spreadScale: the spread value that maps to ±1 (default ±10%).
 */
export function normalizeMispricingScore(
  spread: number,
  spreadScale = 0.10
): number {
  return clamp(spread / spreadScale, -1, 1);
}

/**
 * Present value of terminal value using Gordon Growth Model:
 * TV = FCF_terminal * (1 + g) / (r - g)
 * Then discounted back: PV_TV = TV / (1 + r)^T
 */
export function terminalValuePV(
  fcfTerminal: number,
  terminalGrowth: number,
  discountRate: number,
  horizonYears: number
): number {
  if (discountRate <= terminalGrowth) {
    throw new Error(
      `Discount rate (${discountRate}) must exceed terminal growth rate (${terminalGrowth})`
    );
  }
  const tv = (fcfTerminal * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  return tv / Math.pow(1 + discountRate, horizonYears);
}
