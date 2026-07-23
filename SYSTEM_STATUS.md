# MCQ Hedge Fund — System Status

Last updated: July 2026

This file is the authoritative record of build status for every MCQ component. Update this file whenever a component moves between status levels. Readers — including LPs, auditors, and contractors — should consult this file first when assessing what is live vs. planned.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ Implemented | Code is written, reviewed, on `main`, and test-covered |
| 🔧 In Progress | Active development; partial implementation exists |
| 📋 Planned | Scoped and documented; implementation deferred |
| ⚠️ Needs Tests | Implemented but test coverage is incomplete |
| ❌ Blocked | Blocked by dependency or decision |

---

## Core Governance Engine (`src/governance/`)

| File | Status | Test File | Notes |
|---|---|---|---|
| `hazard.ts` | ✅ Implemented | `hazard.integration.test.ts` | Hazard rate, survival probability, risk classification |
| `kelly.ts` | ✅ Implemented | `kelly.test.ts` | Governance-adjusted Kelly sizing; positive, NO_TRADE, MINIMAL_SIZE, REDUCED_SIZE, error path |
| `expected-value.ts` | ✅ Implemented | `expected-value.test.ts` | P renormalization, zero EV, large enforcement loss, P_enf→1 edge case |
| `alerts.ts` | ✅ Implemented | `alerts.test.ts` | warn/high/critical transitions, null path, batch filtering |
| `scorer.ts` | ✅ Implemented | `scorer.test.ts`, `scorer.runtime-guard.test.ts` | Full pipeline + flat-payload rejection regression |
| `types.ts` | ✅ Implemented | (types only) | Full type definitions; extensible covariate index signature |

---

## Strategy Modules

| Strategy | Doc | Code | Test | Status |
|---|---|---|---|---|
| Hedge Fund Strategy Playbook | `docs/strategy/hedge-fund-strategy-playbook.md` | N/A | N/A | ✅ Documented |
| Dividend Income Sleeve | `docs/strategy/dividend-income-sleeve.md` | `src/integrations/dividend-calendar.ts`, `src/panels/panel1-dcf/dividend-screen.ts`, `src/panels/panel3-risk/income-ladder.ts` | `dividend-calendar.test.ts`, `dividend-calendar.fetch.test.ts`, `dividend-screen.test.ts`, `income-ladder.test.ts` | ✅ Implemented |

---

## Panels

| Panel | Directory | Status | Notes |
|---|---|---|---|
| Panel 1: Reverse DCF | `src/panels/panel1-dcf/` | 🔧 In Progress | `dividend-screen.ts` fully test-covered (PR #10); core reverse DCF engine pending |
| Panel 2: Peer Comps | `src/panels/panel2-comps/` | 🔧 In Progress | |
| Panel 3: Portfolio & Risk | `src/panels/panel3-risk/` | 🔧 In Progress | `income-ladder.ts` implemented and test-covered; core risk console pending |
| Panel 4: Regime & Backtests | `src/panels/panel4-regime/` | 📋 Planned | See `src/panels/panel4-regime/README.md` for full scope and dependency map |
| Panel 5: Governance Queue | `src/panels/panel5-governance/` | 🔧 In Progress | |

---

## Integrations (`src/integrations/`)

| Integration | File | Status | Test | Notes |
|---|---|---|---|---|
| Dividend Calendar — screen logic | `dividend-calendar.ts` | ✅ Implemented | `dividend-calendar.test.ts` (10 unit tests) | `screenDividendRecord()` fully covered |
| Dividend Calendar — fetch layer | `dividend-calendar.ts` | ✅ Implemented | `dividend-calendar.fetch.test.ts` (12 tests) | `fetchDividendData()` and `buildScreenedUniverse()` covered via `vi.stubGlobal('fetch', vi.fn())` |
| Broker — GatesFX | Planned | 📋 Planned | N/A | FSCA FSP 46087 verified; offshore entity (St. Lucia IBC). Personal discretionary allocation only — not for LP capital. Integration deferred until repo is private. |
| Broker — IBKR | Planned | 📋 Planned | N/A | Tier-1 regulated (FINRA/SIPC, FCA). Preferred counterparty for fund capital. |

---

## Documentation (`docs/`)

| Doc | Path | Status |
|---|---|---|
| Asset Pricing & Markets | `docs/foundations/asset-pricing-and-markets.md` | ✅ Complete |
| Portfolio Construction & Risk | `docs/risk/portfolio-construction-and-risk-control.md` | ✅ Complete |
| Hedge Fund Strategy Playbook | `docs/strategy/hedge-fund-strategy-playbook.md` | ✅ Complete |
| Dividend Income Sleeve | `docs/strategy/dividend-income-sleeve.md` | ✅ Complete |
| Hazard-Kelly Model | `docs/governance/hazard-kelly-model.md` | ✅ Complete |
| Architecture Overview | `docs/architecture/overview.md` | ✅ Complete |
| Bibliography | `docs/references/bibliography.md` | ✅ Complete |
| Investor Memo | `docs/investor/investor-memo.md` | 🔧 In Progress |
| Schema (all panels) | `docs/schema/` | 🔧 In Progress |

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

## Open Integration Test Gaps

**None.** All previously identified gaps are now closed as of PR #10.

The fetch-mock approach (`vi.stubGlobal('fetch', vi.fn())`) is available via Node 24's built-in `fetch` and Vitest globals. No MSW installation was required.

---

## Closed Test Coverage Gaps

| Module | Tests Added | Test File | PR |
|---|---|---|---|
| `src/governance/kelly.ts` | 5 | `kelly.test.ts` | #8 |
| `src/governance/expected-value.ts` | 4 | `expected-value.test.ts` | #8 |
| `src/governance/alerts.ts` | 5 | `alerts.test.ts` | #8 |
| `src/governance/scorer.ts` (regression) | 1 | `scorer.runtime-guard.test.ts` | #8 |
| `src/integrations/dividend-calendar.ts` (screen) | 10 | `dividend-calendar.test.ts` | #8 |
| `src/panels/panel3-risk/income-ladder.ts` | 12 | `income-ladder.test.ts` | #8 |
| `src/integrations/dividend-calendar.ts` (fetch) | 12 | `dividend-calendar.fetch.test.ts` | #10 |
| `src/panels/panel1-dcf/dividend-screen.ts` | 21 | `dividend-screen.test.ts` | #10 |

**Total unit + integration tests: 70**

---

*Update this file on every PR that changes component status.*
