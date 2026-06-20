# Panel 1 — Reverse DCF Engine

Answers: **What is the market assuming?**

---

## How It Works

The reverse DCF engine starts from the current market price and works backwards to determine what assumptions the market must be making about revenue growth, FCF margins, and terminal value in order to justify that price.

### Algorithm Steps

1. **Enterprise Value**: `EV = price × shares_out + net_debt`
2. **Implied FCF growth rate**: Bisection search finds `g` such that `NPV(FCF path + terminal PV) = EV`
3. **Market-implied FCF path**: `FCF_t = base_FCF × (1 + g)^t`
4. **Terminal value**: Gordon Growth Model — `TV = FCF_T × (1+g_T) / (r - g_T)`
5. **Implied terminal revenue**: Back-solved using assumed terminal FCF margin
6. **Implied revenue CAGR**: `(R_T / R_0)^(1/T) - 1`
7. **Implied IRR**: Bisection on `[-EV, FCF_1, ..., FCF_T + TV] = 0`
8. **Mispricing score**: `clip((implied_IRR - hurdle_rate) / 0.10, -1, 1)`
9. **Expectations bridge**: House view FCF vs market-implied FCF per year

---

## Usage

```typescript
import { runReverseDCF, formatSnapshot, formatBridge } from './index';
import type { ReverseDCFInput } from './index';

const input: ReverseDCFInput = {
  security: {
    security_id: 'sec-001',
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    asset_class: 'equity',
    sector: 'Technology',
    country: 'US',
    currency: 'USD',
    primary_exchange: 'NASDAQ',
  },
  fundamentals: {
    security_id: 'sec-001',
    period_end: '2025-01-31',
    freq: 'Y',
    revenue: 130_000_000_000,   // $130B
    ebit:     83_000_000_000,
    ebitda:   86_000_000_000,
    fcf:      60_000_000_000,   // $60B FCF
    shares_out: 24_400_000_000, // 24.4B diluted shares
    net_debt: -17_000_000_000,  // Net cash position
  },
  scenario: {
    scenario_id: 'scn-base',
    name: 'Base Case',
    description: 'House base case — moderate AI infrastructure growth',
    discount_rate: 0.10,         // 10% WACC
    terminal_growth_cap: 0.03,   // 3% max terminal growth
  },
  config: {
    security_id: 'sec-001',
    scenario_id: 'scn-base',
    horizon_years: 10,
    terminal_multiple: 25,
    tax_rate: 0.15,
    last_updated: new Date().toISOString(),
  },
  current_price: 135.00,
};

const result = runReverseDCF(input);
console.log(formatSnapshot(result.snapshot));
console.log(formatBridge(result));
```

---

## Mispricing Score Interpretation

| Score | Signal | Meaning |
|---|---|---|
| +0.5 to +1.0 | 🟢 ATTRACTIVE | Market implies conservative assumptions |
| +0.15 to +0.5 | 🟡 MILD UPSIDE | Market pricing modest growth |
| -0.15 to +0.15 | ⚪ FAIRLY PRICED | Roughly aligned with house view |
| -0.5 to -0.15 | 🟠 MILD DOWNSIDE | Market pricing optimistic assumptions |
| -1.0 to -0.5 | 🔴 EXPENSIVE | Market implies growth far above house view |

---

## Files

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript interfaces |
| `utils.ts` | NPV, IRR (bisection), CAGR, clamp, terminal value PV |
| `engine.ts` | Core reverse DCF algorithm |
| `formatter.ts` | Human-readable output formatters |
| `index.ts` | Public module exports |
| `__tests__/engine.test.ts` | Unit tests |
