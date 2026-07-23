# MCQ Hedge Fund — System Status

Last updated: July 2026

This file is the authoritative record of build status for every MCQ component. Update this file whenever a component moves between status levels. Readers — including LPs, auditors, and contractors — should consult this file first when assessing what is live vs. planned.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ Implemented | Code is written, reviewed, and on `main` |
| 🔧 In Progress | Active development; partial implementation exists |
| 📋 Planned | Scoped and documented; implementation deferred |
| ⚠️ Needs Tests | Implemented but test coverage is incomplete |
| ❌ Blocked | Blocked by dependency or decision |

---

## Core Governance Engine (`src/governance/`)

| File | Status | Notes |
|---|---|---|
| `hazard.ts` | ✅ Implemented | Hazard rate, survival probability, risk classification |
| `kelly.ts` | ⚠️ Needs Tests | Governance-adjusted Kelly sizing; `max_position_size` formula needs inline doc + unit tests |
| `expected-value.ts` | ⚠️ Needs Tests | EV with enforcement probability; renormalization logic needs dedicated unit tests |
| `alerts.ts` | ⚠️ Needs Tests | Three-threshold escalation ladder; needs isolated unit tests per severity bucket |
| `scorer.ts` | ✅ Implemented | Orchestrator with `assertScorerInput` runtime guard; regression test needed for flat-payload rejection |
| `types.ts` | ✅ Implemented | Full type definitions; extensible covariate index signature |

**Next action:** Add `kelly.test.ts`, `expected-value.test.ts`, `alerts.test.ts`, and flat-payload regression to `scorer.test.ts`.

---

## Strategy Modules

| Strategy | Doc | Code | Status |
|---|---|---|---|
| Hedge Fund Strategy Playbook | `docs/strategy/hedge-fund-strategy-playbook.md` | N/A (doc only) | ✅ Documented |
| Dividend Income Sleeve | `docs/strategy/dividend-income-sleeve.md` | `src/integrations/dividend-calendar.ts`, `src/panels/panel1-dcf/dividend-screen.ts`, `src/panels/panel3-risk/income-ladder.ts` | ⚠️ Needs Tests |

**Next action:** Add `dividend-calendar.test.ts` (screen logic) and `income-ladder.test.ts` (gap + concentration detection).

---

## Panels

| Panel | Directory | Status | Notes |
|---|---|---|---|
| Panel 1: Reverse DCF | `src/panels/panel1-dcf/` | 🔧 In Progress | `dividend-screen.ts` (DDM/CAPM) added; core reverse DCF engine pending |
| Panel 2: Peer Comps | `src/panels/panel2-comps/` | 🔧 In Progress | |
| Panel 3: Portfolio & Risk | `src/panels/panel3-risk/` | 🔧 In Progress | `income-ladder.ts` added; core risk console pending |
| Panel 4: Regime & Backtests | `src/panels/panel4-regime/` | 📋 Planned | See `src/panels/panel4-regime/README.md` for full scope and dependency map |
| Panel 5: Governance Queue | `src/panels/panel5-governance/` | 🔧 In Progress | |

**Panel 4 note:** All strategy and foundation docs reference Panel 4 as a live component. The implementation is intentionally deferred. The `panel4-regime/README.md` placeholder makes this explicit for any reader of the source tree.

---

## Integrations (`src/integrations/`)

| Integration | File | Status | Notes |
|---|---|---|---|
| Dividend Calendar | `dividend-calendar.ts` | ⚠️ Needs Tests | Polygon.io (default) + IEX Cloud (fallback); screens yield floor, payout ceiling, growth streak |
| Broker — GatesFX | Planned | 📋 Planned | FSCA FSP 46087 verified; offshore entity (St. Lucia IBC). For personal discretionary allocation only — not for LP capital. Integration to `src/integrations/` deferred until repo is private. |
| Broker — IBKR | Planned | 📋 Planned | Tier-1 regulated (FINRA/SIPC, FCA). Preferred counterparty for fund capital. |

---

## Documentation (`docs/`)

| Doc | Path | Status |
|---|---|---|
| Asset Pricing & Markets | `docs/foundations/asset-pricing-and-markets.md` | ✅ Complete |
| Portfolio Construction & Risk | `docs/risk/portfolio-construction-and-risk-control.md` | ✅ Complete |
| Hedge Fund Strategy Playbook | `docs/strategy/hedge-fund-strategy-playbook.md` | ✅ Complete |
| Dividend Income Sleeve | `docs/strategy/dividend-income-sleeve.md` | ✅ Complete |
| Hazard-Kelly Model | `docs/governance/hazard-kelly-model.md` | ✅ Complete |
| Bibliography | `docs/references/bibliography.md` | ✅ Complete |
| Investor Memo | `docs/investor/investor-memo.md` | 🔧 In Progress |
| Schema (all panels) | `docs/schema/` | 🔧 In Progress |
| Architecture | `docs/architecture/` | 🔧 In Progress |

---

## Infrastructure

| Component | Status | Notes |
|---|---|---|
| Dockerfile | ✅ Complete | Multi-stage build |
| docker-compose.yml | ✅ Complete | Local dev |
| docker-compose.ci.yml | ✅ Complete | CI pipeline |
| GitHub Actions CI | ✅ Complete | `.github/workflows/` |
| Vercel (UI layer) | 🔧 In Progress | `vercel.json` present |
| AWS Lambda path | 📋 Planned | For dividend calendar scheduled job |

---

## Open Test Coverage Gaps

The following modules are implemented but lack dedicated unit tests. These are **must-have** before any external capital deployment:

1. `src/governance/kelly.ts` — Add `kelly.test.ts`: negative Kelly, zero Kelly, positive Kelly, `max_position_size` output, `NO_TRADE` boundary.
2. `src/governance/expected-value.ts` — Add `expected-value.test.ts`: P renormalization, zero baseline EV, large enforcement loss, `P_enf → 1` edge case.
3. `src/governance/alerts.ts` — Add `alerts.test.ts`: warn/high/critical threshold transitions, no-alert path, environment-variable threshold override.
4. `src/governance/__tests__/scorer.test.ts` — Add flat-payload rejection regression test for `assertScorerInput` guard.
5. `src/integrations/dividend-calendar.ts` — Add `dividend-calendar.test.ts`: all three screen pass/fail cases, null API response, provider fallback.
6. `src/panels/panel3-risk/income-ladder.ts` — Add `income-ladder.test.ts`: GAP detection, CONCENTRATION detection, weighted yield calculation, Panel 5 alert output shape.

---

*Update this file on every PR that changes component status.*
