# MCQ Hedge Fund Agent

> **Governance & Capital-Allocation Orchestrator for Agent Pay-style Machine Commerce**
> Built by [MCQ Ventures](https://github.com/robertmcq) · Baltimore, MD

---

## What This Is

MCQ is a **governance-first, AI-powered hedge fund decision console** that operates across five panels. Every component answers one of three questions in real time:

- **What is the market pricing in?**
- **How does this compare to peers?**
- **Is the strategy behaving as designed under current regime?**

| Panel | Primary Question | Key Objects |
|---|---|---|
| 1. Reverse DCF | What is the market assuming? | Implied growth, margin, IRR; DDM / Gordon Growth valuation |
| 2. Peer Comps | How does this name stack up? | Premium/discount vs peers; z-score & pct rank |
| 3. Portfolio & Risk | Can we survive this path? | Drawdown, exposures, limits; income ladder |
| 4. Backtests & Regime | Is behavior on-spec? | Sharpe, regime performance *(planned)* |
| 5. Governance Queue | Are we inside our own rules? | Policy objects, alerts, audit log |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCQ DECISION CONSOLE                        │
├──────────────────────────┬──────────────────────────────────────┤
│  Panel 1: Reverse DCF    │  Panel 2: Peer Comps                 │
│  - Implied revenue CAGR  │  - P/E, EV/EBITDA, EV/Revenue        │
│  - Implied FCF margin    │  - Premium/discount bars             │
│  - DDM intrinsic value   │  - Peer z-score & pct rank           │
│  - CAPM hurdle rate      │  - Dynamic peer re-segmentation      │
├──────────────────────────┴──────────────────────────────────────┤
│  Panel 3: Portfolio Live State & Risk                           │
│  - Equity curve · Drawdown · Factor exposures                  │
│  - Sector/country heatmaps · VaR / Expected Shortfall          │
│  - Governance-adjusted Kelly sizing · Risk budget tile         │
│  - Dividend income ladder · Payment calendar · Gap detection   │
├──────────────────────────┬──────────────────────────────────────┤
│  Panel 4: Backtests &    │  Panel 5: Governance Queue           │
│  Regime Diagnostics      │  - Policy objects (versioned)        │
│  *(planned — see         │  - Action queue (approve/reject)     │
│   panel4-regime/README)* │  - Decision log (audit trail)        │
│  - Regime classifier     │  - Risk limits (machine-readable)    │
│  - Yield curve state     │  - Income sleeve policy params       │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## Governance Math Engine

MCQ treats governance as a **continuous-time hazard process**. The core math is implemented in `src/governance/` and fully documented in `docs/governance/hazard-kelly-model.md`.

### Hazard Function
```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```
- `G` = normalized governance score (0–1)
- `X` = covariate vector: Velocity, Volume, Shadow + extensible additional signals
- `h₀(t)` = baseline hazard

### Survival & Enforcement Probability
```
S(T) = exp(-h·T)          → probability of no enforcement event
P_enf(T) = 1 - S(T)       → enforcement probability over horizon T
```

### Governance-Adjusted Expected Value
```
EV_gov = P_win · AvgWin - P_loss · AvgLoss - P_enf(T) · EnfLoss
```

### Governance-Adjusted Kelly Sizing
```
d = S(T)                          → governance discount factor
W_eff = W₀ · d                    → effective win rate
f_Kelly_gov = W_eff - (1-W_eff)/R → governance-aware Kelly fraction
RiskPerTrade = Equity · f_fraction · f_Kelly_gov
```

See `docs/governance/hazard-kelly-model.md` for full derivation and parameter reference.

---

## Strategy Modules

MCQ implements multiple strategy overlays documented in `docs/strategy/`:

| Strategy | Doc | Status |
|---|---|---|
| Long/Short Equity | `hedge-fund-strategy-playbook.md` | Documented |
| Event-Driven | `hedge-fund-strategy-playbook.md` | Documented |
| Global Macro | `hedge-fund-strategy-playbook.md` | Documented |
| Dividend Income Sleeve | `dividend-income-sleeve.md` | Implemented |
| Managed Futures / CTA | `hedge-fund-strategy-playbook.md` | Documented |
| Market Neutral | `hedge-fund-strategy-playbook.md` | Documented |

---

## Academic Spine

MCQ's architecture is grounded in standard quantitative finance pedagogy. Key frameworks:

- **Asset Pricing & Derivatives** — No-arbitrage, CAPM/APT, DDM, derivatives pricing. See `docs/foundations/asset-pricing-and-markets.md`.
- **Portfolio Construction & Risk** — Mean-variance optimization, factor models, drawdown governance, performance attribution. See `docs/risk/portfolio-construction-and-risk-control.md`.
- **Hedge Fund Strategy Taxonomy** — Long/short equity, event-driven, global macro, market neutral, managed futures, convertible arbitrage, multi-strategy. See `docs/strategy/hedge-fund-strategy-playbook.md`.
- **CAPM Reference Inputs (Jul 2026):** R_f = 4.65% (U.S. 10-Year), R_m = 10.00%, MRP = 5.35%.

For full bibliography see `docs/references/bibliography.md`.

---

## Repo Structure

```
mcq-hedge-fund/
├── AGENTS.md                      # Agent behavior spec
├── SYSTEM_STATUS.md               # Live build status per component
├── docs/
│   ├── foundations/               # Asset pricing, derivatives, market theory
│   │   └── asset-pricing-and-markets.md
│   ├── governance/                # Hazard model, Kelly math, policy framework
│   │   └── hazard-kelly-model.md
│   ├── risk/                      # Portfolio construction & risk control
│   │   └── portfolio-construction-and-risk-control.md
│   ├── strategy/                  # Strategy playbooks (per sleeve)
│   │   ├── hedge-fund-strategy-playbook.md
│   │   └── dividend-income-sleeve.md
│   ├── schema/                    # Entity + field schemas per panel
│   ├── architecture/              # System design, event pipeline, data flow
│   ├── references/                # Bibliography and academic citations
│   └── investor/                  # Investor one-pager and positioning docs
├── src/
│   ├── governance/                # Hazard scoring, survival, Kelly, EV, alerts
│   │   ├── hazard.ts
│   │   ├── kelly.ts
│   │   ├── expected-value.ts
│   │   ├── alerts.ts
│   │   ├── scorer.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   ├── panels/
│   │   ├── panel1-dcf/            # Reverse DCF + DDM/CAPM dividend screen
│   │   ├── panel2-comps/          # Peer benchmarking
│   │   ├── panel3-risk/           # Portfolio risk, Kelly sizing, income ladder
│   │   ├── panel4-regime/         # Regime & backtests (PLANNED — see README)
│   │   └── panel5-governance/     # Policy, action queue, audit log
│   ├── integrations/              # Market data adapters (dividend calendar, brokers)
│   ├── api/                       # REST/webhook endpoints
│   ├── data/                      # Feeds, adapters, normalizers
│   ├── db/                        # Schema, migrations
│   ├── events/                    # Event pipeline
│   ├── projections/               # Forward projection models
│   ├── state/                     # State management
│   └── scripts/                   # Utilities and seed data
├── infrastructure/                # IaC, Docker, CI config
├── scripts/                       # Setup and utilities
└── .env.example                   # Environment variable template
```

---

## Agent Pay Integration

MCQ is designed to sit as the **governance control plane** above machine commerce rails:

| Layer | Provider | MCQ Role |
|---|---|---|
| Credentialing | Mastercard Agent Pay | Ingest agent identity → policy lookup |
| Permissioning | Mastercard / on-chain (Polygon, Solana, Base) | Map to MCQ rulebook |
| Transacting | Multi-rail (cards, accounts, stablecoins) | Hazard score → approve/resize/block |
| Settling | XRPL / RLUSD (Ripple) | Post-settlement audit log entry |

---

## Stack

- **Runtime:** Node.js / TypeScript
- **Test Runner:** Vitest
- **Data APIs:** Polygon.io (default), IEX Cloud (fallback)
- **Auth / Roles:** Role-based access (PM, Risk, Analyst, Ops, ReadOnly)
- **Infra:** Docker · GitHub Actions · Vercel (UI layer)
- **DB:** PostgreSQL (production) · DynamoDB (AWS Lambda path)

---

## Build Status

See `SYSTEM_STATUS.md` for full component-level status.

**Governance Engine** — ✅ Implemented (`src/governance/`)
**Dividend Income Sleeve** — ✅ Implemented (`src/integrations/`, `src/panels/panel1-dcf/`, `src/panels/panel3-risk/`)
**Panel 1 DCF** — 🔧 In progress
**Panel 2 Comps** — 🔧 In progress
**Panel 3 Risk** — 🔧 In progress
**Panel 4 Regime** — 📋 Planned (see `src/panels/panel4-regime/README.md`)
**Panel 5 Governance Queue** — 🔧 In progress
**Agent Pay Integration** — 📋 Planned

---

## Reference Repos

- **[tinyhumansai/openhuman](https://github.com/tinyhumansai/openhuman)** — Agent orchestration platform. Used for agent loop design and AGENTS.md spec pattern.
- **[vincentkoc/tokenjuice](https://github.com/vincentkoc/tokenjuice)** — Token management. Used for LLM token budgeting inside agent research loops.

---

*MCQ Ventures · Governance-first. Regulator-ready. Built to last.*
