# MCQ System Architecture — Overview

This document describes the high-level architecture of the MCQ decision console:
how data flows through the five-panel system, how the governance engine gates
every decision, and how the components connect.

Last updated: July 2026

---

## Design Principles

**Governance first.** No position is sized, approved, or logged without passing
through the governance engine. The hazard score, survival probability, and
Kelly fraction are not optional metadata — they are the decision output.

**Panel separation.** Each panel answers exactly one question. Panel 1 asks what
the market is pricing in. Panel 2 asks how a name compares to peers. Panel 3
asks whether the portfolio can survive the current path. Panel 4 asks whether
behavior is on-spec for the current regime. Panel 5 enforces the rules.

**Live over static.** All data inputs are pulled programmatically from market
data APIs (Polygon.io / IEX Cloud) on a scheduled basis. No hardcoded ticker
lists, static yield tables, or manually maintained spreadsheets in the data path.

**Audit by default.** Every decision — approve, reject, resize, flag — produces
an immutable audit log entry. The governance queue is append-only.

---

## Data Flow

```
External Sources
  ├─ Market Data API (Polygon.io / IEX Cloud)
  ├─ Dividend Calendar API
  ├─ Broker Feed (IBKR prime / GatesFX discretionary)
  └─ Agent Pay / Mastercard credential stream (planned)
          ↓
  src/integrations/          ← normalise + screen raw data
          ↓
  src/data/                  ← feed adapters + caching layer
          ↓
  src/db/                    ← PostgreSQL persistence layer
          ↓
  +-----------+-----------+-----------+-----------+
  | Panel 1   | Panel 2   | Panel 3   | Panel 4   |
  | DCF/DDM   | Comps     | Risk/     | Regime    |
  | Valuation | Benchmark | Ladder    | Backtest  |
  +-----------+-----------+-----+-----+-----------+
                                ↓
                    src/governance/          ← hazard → kelly → EV → alerts
                                ↓
                    Panel 5: Governance Queue
                      ├─ Policy objects (versioned)
                      ├─ Action queue (approve / reject / resize)
                      ├─ Decision log (append-only audit trail)
                      └─ Risk limits (machine-readable)
                                ↓
                    PM Review → Execution
```

---

## Governance Engine (`src/governance/`)

The governance engine is the decision gate. It is called for every proposed
position and produces five outputs:

| Output | File | Description |
|---|---|---|
| Hazard rate `h(t)` | `hazard.ts` | Instantaneous enforcement probability rate |
| Survival probability `S(T)` | `hazard.ts` | Probability of no enforcement over horizon T |
| Kelly fraction `f_gov` | `kelly.ts` | Governance-adjusted optimal position size |
| Expected value `EV_gov` | `expected-value.ts` | Risk-adjusted EV net of enforcement cost |
| Alert | `alerts.ts` | Severity-graded panel alert with recommended action |
| Composite score | `scorer.ts` | Orchestrated output combining all five above |

All inputs are validated by `assertScorerInput` in `scorer.ts` before any
computation runs. A malformed or flat payload throws with a descriptive error
rather than producing silent NaN.

---

## Dividend Income Sleeve

The dividend income sleeve is the first fully implemented strategy overlay.
It runs as a scheduled Lambda job (AWS path) or a cron-triggered service call:

```
dividend-calendar.ts          ← fetch + screen universe (Polygon/IEX)
        ↓
panel1-dcf/dividend-screen.ts ← CAPM hurdle + DDM intrinsic value per payer
        ↓
panel3-risk/income-ladder.ts  ← 12-month payment calendar + gap/concentration flags
        ↓
Panel 5 alerts                ← GAP / CONCENTRATION / YIELD_BELOW_FLOOR alerts
```

Screening thresholds are Panel 5 policy objects (env-var overridable):
yield floor ≥2.5%, payout ratio ≤75% earnings / ≤90% FCF, growth streak ≥5 years.

---

## Panel 4 — Planned

Panel 4 (regime classifier + backtest engine) is intentionally deferred. Its
planned scope is documented in `src/panels/panel4-regime/README.md`. When
implemented, Panel 4 will feed a yield-curve state variable into the governance
hazard function as an additional covariate, and compress income sleeve sizing
automatically in rising-rate regimes.

---

## Agent Pay Integration — Planned

MCQ is designed to scale from discretionary PM decisions to machine commerce
governance — the control plane for AI agents transacting autonomously. The
Agent Pay integration layer will sit between the credentialing layer
(Mastercard Agent Pay) and the MCQ governance engine, mapping agent identities
to policy objects and subjecting every machine-initiated transaction to the same
hazard/kelly/EV pipeline as a human PM decision.

See `docs/investor/investor-memo.md` for the strategic rationale.

---

## Infrastructure

| Component | Technology | Status |
|---|---|---|
| Containerisation | Docker + docker-compose | ✅ Live |
| CI/CD | GitHub Actions | ✅ Live |
| UI layer | Vercel | 🔧 In progress |
| Database | PostgreSQL (production), DynamoDB (Lambda path) | 📋 Planned |
| Scheduled jobs | AWS Lambda + EventBridge (dividend calendar) | 📋 Planned |
| Secret management | Environment variables → AWS Secrets Manager | 📋 Planned |

See `SYSTEM_STATUS.md` for full component status.
