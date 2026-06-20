# Governance Scoring Module

Converts governance inputs into hazard rates, survival probabilities, enforcement risk, governance-adjusted expected value, and Kelly-based position sizing.

---

## Architecture

```
GovernanceScoreInput (G, velocity, volume, shadow)
        │
        ▼
   hazard.ts  →  h = h₀·exp(βG(1-G) + βᵀX)
        │
        ▼
  S(T) = exp(-h·T)   P_enf = 1 - S(T)
        │
   ┌────┴────────────────────┐
   ▼                         ▼
kelly.ts                expected-value.ts
W_eff = W₀·S(T)         EV_gov = P_win·Win - P_loss·Loss - P_enf·EnfLoss
f_Kelly_gov              ev_haircut_pct
RiskPerTrade
        │
        ▼
   alerts.ts  →  GovernanceAlert (→ Panel 5 action_item)
        │
        ▼
   scorer.ts  →  GovernanceDecision (unified output)
```

---

## Quick Start

```typescript
import { runGovernanceScorer } from './index';
import type { ScorerInput } from './index';

const input: ScorerInput = {
  governance: {
    entity_type: 'strategy',
    entity_id:   'strat-momentum-001',
    governance_score: 0.72,  // G — strong governance
    velocity:         0.35,  // moderate decision velocity
    volume:           0.50,  // moderate volume
    shadow:           0.10,  // low shadow exposure
  },
  horizon_days:       10,
  win_rate:           0.58,
  avg_win:            1200,
  avg_loss:           800,
  enforcement_loss:   50_000,  // modeled cost of enforcement event
  account_equity:     500_000,
};

const decision = runGovernanceScorer(input);
console.table(decision.summary);
// Example output:
// ┌──────────────────────┬───────────────────────────────────────────────┐
// │ risk_label           │ LOW                                           │
// │ kelly_signal         │ FULL_SIZE                                     │
// │ enforcement_prob_pct │ 4.8%                                          │
// │ risk_per_trade_usd   │ $18,432                                       │
// │ governance_ev_usd    │ $289                                          │
// │ recommended_action   │ PROCEED — governance within thresholds.       │
// └──────────────────────┴───────────────────────────────────────────────┘
```

---

## Hazard Model Parameters

Configured via `.env` or injected at runtime:

| Variable | Default | Meaning |
|---|---|---|
| `GOV_H0` | `0.05` | Baseline hazard rate |
| `GOV_BETA_G` | `1.5` | Governance score coefficient |
| `GOV_BETA_VELOCITY` | `0.4` | Velocity covariate coefficient |
| `GOV_BETA_VOLUME` | `0.3` | Volume covariate coefficient |
| `GOV_BETA_SHADOW` | `0.6` | Shadow exposure coefficient |
| `KELLY_FRACTION_FACTOR` | `0.25` | Fractional Kelly safety factor |

---

## Alert Thresholds

| Variable | Default | Severity |
|---|---|---|
| `GOV_ALERT_WARN` | `0.15` | ⚠️ WARN — monitor, apply discount |
| `GOV_ALERT_HIGH` | `0.35` | 🔴 HIGH — reduce size, escalate |
| `GOV_ALERT_CRITICAL` | `0.60` | 🚨 CRITICAL — block, remediate |

---

## Files

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript interfaces |
| `hazard.ts` | Hazard rate + survival computation |
| `kelly.ts` | Governance-adjusted Kelly sizing |
| `expected-value.ts` | Governance-adjusted EV |
| `alerts.ts` | Alert generation for Panel 5 |
| `scorer.ts` | Unified orchestration (all steps) |
| `index.ts` | Public module exports |
| `__tests__/scorer.test.ts` | Unit tests |
