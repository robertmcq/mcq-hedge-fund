/**
 * Panel 1 — Reverse DCF Engine
 *
 * Core algorithm:
 * 1. Start from current market price → compute enterprise value.
 * 2. Subtract PV of terminal value (using terminal_multiple or Gordon Growth).
 * 3. Remaining PV must come from FCF stream → back-solve implied FCF path.
 * 4. Derive implied revenue CAGR and FCF margin trajectory.
 * 5. Compute implied IRR (rate that equates market cap to projected FCF stream + terminal).
 * 6. Compute mispricing score vs house hurdle rate.
 * 7. Build expectations bridge vs house projections.
 */

import {
  ReverseDCFInput,
  DCFEngineResult,
  ReverseDCFSnapshot,
  ExpectationsBridgeRow,
  HouseProjection,
} from './types';
import {
  npv,
  irr,
  cagr,
  clamp,
  normalizeMispricingScore,
  terminalValuePV,
  uuidv4,
} from './utils';

/**
 * House projection builder.
 * Linear revenue growth from current to implied terminal, with margin expansion.
 * In production, replace with actual analyst estimates from `security_projection` table.
 */
function buildHouseProjections(
  baseRevenue: number,
  baseFcfMargin: number,
  houseRevenueCagr: number,
  houseFcfMarginTarget: number,
  horizonYears: number
): HouseProjection[] {
  const projections: HouseProjection[] = [];
  for (let t = 1; t <= horizonYears; t++) {
    const proj_revenue = baseRevenue * Math.pow(1 + houseRevenueCagr, t);
    // Linear margin expansion from base to target over horizon
    const marginProgress = t / horizonYears;
    const proj_fcf_margin =
      baseFcfMargin + (houseFcfMarginTarget - baseFcfMargin) * marginProgress;
    projections.push({
      year_offset: t,
      proj_revenue,
      proj_fcf_margin,
      proj_fcf: proj_revenue * proj_fcf_margin,
    });
  }
  return projections;
}

/**
 * Back-solve market-implied FCF path.
 * Assumes FCF grows at a constant implied rate from base FCF.
 * The implied rate is found by bisection: find g such that
 *   NPV(implied FCF path + terminal PV) = enterpriseValue
 */
function solveImpliedFcfGrowth(
  baseFcf: number,
  enterpriseValue: number,
  discountRate: number,
  terminalGrowthRate: number,
  horizonYears: number,
  tolerance = 1e-6,
  maxIter = 200
): number {
  const objective = (g: number): number => {
    const fcfs = Array.from({ length: horizonYears }, (_, i) =>
      baseFcf * Math.pow(1 + g, i + 1)
    );
    const fcfTerminal = fcfs[horizonYears - 1];
    const pvFcfs = npv(fcfs, discountRate);
    let pvTerminal: number;
    try {
      pvTerminal = terminalValuePV(
        fcfTerminal,
        terminalGrowthRate,
        discountRate,
        horizonYears
      );
    } catch {
      pvTerminal = 0;
    }
    return pvFcfs + pvTerminal - enterpriseValue;
  };

  let low = -0.5;
  let high = 2.0; // 200% implied FCF growth — extreme upper bound

  if (objective(low) * objective(high) > 0) {
    // Fallback: return rate that minimizes absolute error
    let best = low;
    let bestErr = Math.abs(objective(low));
    for (let g = low; g <= high; g += 0.01) {
      const err = Math.abs(objective(g));
      if (err < bestErr) { bestErr = err; best = g; }
    }
    return best;
  }

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const fMid = objective(mid);
    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) return mid;
    if (objective(low) * fMid < 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

/**
 * Main reverse DCF engine entry point.
 */
export function runReverseDCF(input: ReverseDCFInput): DCFEngineResult {
  const { security, fundamentals, scenario, config, current_price } = input;
  const {
    horizon_years,
    terminal_multiple,
    tax_rate,
  } = config;
  const { discount_rate, terminal_growth_cap } = scenario;

  const now = new Date().toISOString();

  // ── Step 1: Enterprise Value ──────────────────────────────────────────────
  const market_cap = current_price * fundamentals.shares_out;
  const enterprise_value =
    input.enterprise_value ?? market_cap + fundamentals.net_debt;

  // ── Step 2: Base financials ───────────────────────────────────────────────
  const base_revenue = fundamentals.revenue;
  const base_fcf = fundamentals.fcf;
  const base_fcf_margin = base_revenue > 0 ? base_fcf / base_revenue : 0;

  // ── Step 3: Terminal growth rate (capped at discount_rate - 1%) ───────────
  const terminal_growth = Math.min(
    terminal_growth_cap,
    discount_rate - 0.01
  );

  // ── Step 4: Implied FCF growth rate ─────────────────────────────────────
  const implied_fcf_growth = solveImpliedFcfGrowth(
    base_fcf,
    enterprise_value,
    discount_rate,
    terminal_growth,
    horizon_years
  );

  // ── Step 5: Build market-implied FCF path ────────────────────────────────
  const market_implied_fcf_path = Array.from(
    { length: horizon_years },
    (_, i) => base_fcf * Math.pow(1 + implied_fcf_growth, i + 1)
  );
  const market_implied_terminal_fcf =
    market_implied_fcf_path[horizon_years - 1];

  // ── Step 6: PV components ────────────────────────────────────────────────
  const pv_of_fcfs = npv(market_implied_fcf_path, discount_rate);
  let pv_of_terminal: number;
  try {
    pv_of_terminal = terminalValuePV(
      market_implied_terminal_fcf,
      terminal_growth,
      discount_rate,
      horizon_years
    );
  } catch {
    // Fallback: terminal multiple on EBITDA discounted back
    const terminal_ebitda = market_implied_terminal_fcf / (1 - tax_rate) * 1.3;
    pv_of_terminal =
      (terminal_ebitda * terminal_multiple) /
      Math.pow(1 + discount_rate, horizon_years);
  }

  // ── Step 7: Implied revenue at terminal year ─────────────────────────────
  // Assume FCF margin reaches a steady state. Back-solve terminal revenue
  // using market-implied FCF and assumed terminal margin = base_fcf_margin * 1.2
  const assumed_terminal_margin = Math.min(
    Math.max(base_fcf_margin * 1.2, 0.05),
    0.5
  );
  const market_implied_terminal_revenue =
    assumed_terminal_margin > 0
      ? market_implied_terminal_fcf / assumed_terminal_margin
      : 0;

  // ── Step 8: Implied revenue CAGR ────────────────────────────────────────
  const implied_revenue_cagr =
    market_implied_terminal_revenue > 0 && base_revenue > 0
      ? cagr(base_revenue, market_implied_terminal_revenue, horizon_years)
      : NaN;

  // ── Step 9: Implied terminal FCF margin ─────────────────────────────────
  const implied_fcf_margin_traj = assumed_terminal_margin;

  // ── Step 10: Implied IRR ─────────────────────────────────────────────────
  // IRR: rate such that NPV([-EV, ...fcf_path, terminal_value]) = 0
  const terminal_value_nominal =
    (market_implied_terminal_fcf * (1 + terminal_growth)) /
    (discount_rate - terminal_growth);
  const irr_cash_flows = [
    -enterprise_value,
    ...market_implied_fcf_path.slice(0, -1),
    market_implied_fcf_path[horizon_years - 1] + terminal_value_nominal,
  ];
  const implied_irr = irr(irr_cash_flows);

  // ── Step 11: Mispricing score ────────────────────────────────────────────
  const irr_spread = isNaN(implied_irr)
    ? 0
    : implied_irr - discount_rate;
  const mispricing_score = normalizeMispricingScore(irr_spread, 0.10);

  // ── Step 12: House projections ────────────────────────────────────────────
  // Default house view: modest conservatism vs market-implied
  const house_revenue_cagr = implied_revenue_cagr * 0.85;
  const house_fcf_margin_target = base_fcf_margin * 1.15;
  const house_projections = buildHouseProjections(
    base_revenue,
    base_fcf_margin,
    isNaN(house_revenue_cagr) ? 0.10 : house_revenue_cagr,
    house_fcf_margin_target,
    horizon_years
  );

  // ── Step 13: Expectations bridge ─────────────────────────────────────────
  const bridge: ExpectationsBridgeRow[] = house_projections.map((hp, i) => ({
    bridge_id: uuidv4(),
    security_id: security.security_id,
    as_of: now,
    year_offset: hp.year_offset,
    market_implied_fcf: market_implied_fcf_path[i] ?? 0,
    house_fcf: hp.proj_fcf,
    delta_fcf: hp.proj_fcf - (market_implied_fcf_path[i] ?? 0),
  }));

  // ── Assemble snapshot ────────────────────────────────────────────────────
  const snapshot: ReverseDCFSnapshot = {
    security_id: security.security_id,
    as_of: now,
    scenario_id: scenario.scenario_id,
    price: current_price,
    market_cap,
    enterprise_value,
    implied_revenue_cagr: isNaN(implied_revenue_cagr) ? 0 : implied_revenue_cagr,
    implied_fcf_margin_traj,
    implied_terminal_growth: terminal_growth,
    implied_irr: isNaN(implied_irr) ? 0 : implied_irr,
    house_hurdle_rate: discount_rate,
    mispricing_score: clamp(mispricing_score, -1, 1),
    irr_spread: isNaN(irr_spread) ? 0 : irr_spread,
  };

  return {
    snapshot,
    bridge,
    house_projections,
    market_implied_terminal_revenue,
    market_implied_fcf_path,
    pv_of_terminal,
    pv_of_fcfs,
    computed_at: now,
  };
}
