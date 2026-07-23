# Panel 4 — Regime & Backtests

## Status

**Planned — not yet implemented.**

Panel 4 is the regime classification and backtest engine for the MCQ five-panel architecture. It is referenced throughout the documentation as a live component but the implementation is deferred.

## Intended Scope

- Macro regime classifier: risk-on / risk-off / stagflation / deflation quadrant
- Yield curve state variable (normal / flat / inverted / rising / falling)
- Earnings surprise and corporate-action date flagging (event-driven calendar)
- Rolling backtest engine for strategy P&L attribution by regime
- Trend strength score for managed futures / CTA strategy module

## Dependencies

- `src/governance/` — regime state feeds the MCQ Governance Covariate Model as an additional covariate
- `src/panels/panel3-risk/` — regime flag compresses position sizing via the Kelly discount in stressed regimes
- `src/panels/panel5-governance/` — regime-change events can trigger governance queue entries

## Planned Files

```
src/panels/panel4-regime/
  regime-classifier.ts    ← macro regime state machine
  yield-curve.ts          ← yield curve shape detection
  backtest-engine.ts      ← rolling P&L attribution by regime
  event-calendar.ts       ← earnings/M&A/index-rebalance date tracker
  index.ts
  __tests__/
```

## Reference

See `docs/strategy/hedge-fund-strategy-playbook.md` for how Panel 4 maps to each strategy type, and `docs/foundations/asset-pricing-and-markets.md` Section 4 for the market efficiency and regime framework.
