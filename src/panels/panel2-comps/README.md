# Panel 2 — Peer Benchmarking & Comps

Answers: **Is this name cheap or expensive relative to its peers?**

## Components

| File | Purpose |
|------|---------|
| `types.ts` | All Panel 2 data contracts |
| `stats.ts` | Median, percentile, std dev, z-score, pct rank |
| `engine.ts` | Peer stats, z-scores, premium/discount, breach detection |
| `formatter.ts` | UI-ready tile and alert formatting |
| `__tests__/engine.test.ts` | Unit tests |

## Engine flow

1. Collect peer valuation snapshots for all members of a `PeerGroup`
2. Compute distribution stats (median, p25, p75, std dev) per metric
3. Compute z-score and percentile rank for the target security
4. Compare against `PeerGovernanceBand` thresholds
5. Emit `PeerRuleBreachEvent` for each band violation
6. Optionally route breaches to Panel 5 `action_item` queue

## Signals

| Z-score | Signal |
|---------|--------|
| ≤ −1.5 | 🟢 CHEAP |
| −1.5 to −0.5 | 🟡 FAIR |
| −0.5 to +0.5 | ⚪ IN-LINE |
| +0.5 to +1.5 | 🟡 FAIR |
| ≥ +1.5 | 🔴 EXPENSIVE |
