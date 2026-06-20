# MCQ Hedge Fund Agent

> **Governance & Capital-Allocation Orchestrator for Agent Pay-style Machine Commerce**
> Built by [MCQ Ventures](https://github.com/robertmcq) · Baltimore, MD

---

## What This Is

This repository is the core build for the **MCQ decision console** — a governance-first, AI-powered hedge fund agent that operates across five panels:

| Panel | Primary Question | Key Objects |
|---|---|---|
| 1. Reverse DCF | What is the market assuming? | Implied growth, margin, IRR |
| 2. Peer Comps | How does this name stack up? | Premium/discount vs peers |
| 3. Portfolio & Risk | Can we survive this path? | Drawdown, exposures, limits |
| 4. Backtests & Regime | Is behavior on-spec? | Sharpe, regime performance |
| 5. Governance Queue | Are we inside our own rules? | Limits, alerts, approvals |

The agent is not a reporting layer. Every widget answers one of three questions in real time:
- **What is the market pricing in?**
- **How does this compare to peers?**
- **Is the strategy behaving as designed under current regime?**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCQ DECISION CONSOLE                       │
├──────────────────────────┬──────────────────────────────────────┤
│  Panel 1: Reverse DCF    │  Panel 2: Peer Comps                 │
│  - Implied revenue CAGR  │  - P/E, EV/EBITDA, EV/Revenue        │
│  - Implied FCF margin    │  - Premium/discount bars             │
│  - Implied IRR vs hurdle │  - Peer z-score & pct rank           │
│  - Mispricing score      │  - Dynamic peer re-segmentation      │
├──────────────────────────┴──────────────────────────────────────┤
│  Panel 3: Portfolio Live State & Risk                           │
│  - Equity curve · Drawdown · Factor exposures                  │
│  - Sector/country heatmaps · VaR / Expected Shortfall          │
│  - Governance-adjusted Kelly sizing · Risk budget tile         │
├──────────────────────────┬──────────────────────────────────────┤
│  Panel 4: Backtests &    │  Panel 5: Governance Queue           │
│  Regime Diagnostics      │  - Policy documents (versioned)      │
│  - Sharpe/Sortino/DD     │  - Action queue (approve/reject)     │
│  - Tracking error        │  - Decision log (audit trail)        │
│  - Regime classifier     │  - Risk limits (machine-readable)    │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## Governance Math Engine

MCQ treats governance as a **continuous-time hazard process**. The core math:

### Hazard Function
```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```
- `G` = normalized governance score (0–1)
- `X` = covariate vector (Velocity, Volume, Shadow + other signals)
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

---

## Reference Repos

This project draws architectural patterns from:

- **[tinyhumansai/openhuman](https://github.com/tinyhumansai/openhuman)** — Agent orchestration platform (Rust + TypeScript, pnpm monorepo). Used for agent loop design, multi-LLM routing, and AGENTS.md spec pattern.
- **[vincentkoc/tokenjuice](https://github.com/vincentkoc/tokenjuice)** — Token management and optimization (TypeScript). Used for LLM token budgeting inside the agent's research and analysis loops.

---

## Repo Structure

```
mcq-hedge-fund/
├── AGENTS.md                  # Agent behavior spec (what the AI can/cannot do)
├── docs/
│   ├── schema/                # Full entity + field schemas per panel
│   ├── governance/            # Hazard model, Kelly math, policy framework
│   ├── architecture/          # System design, event pipeline, data flow
│   └── investor/              # Investor one-pager and positioning docs
├── src/
│   ├── agent/                 # Core agent loop and orchestration
│   ├── panels/                # Panel-specific data logic
│   │   ├── panel1-dcf/        # Reverse DCF engine
│   │   ├── panel2-comps/      # Peer benchmarking
│   │   ├── panel3-risk/       # Portfolio risk & Kelly sizing
│   │   ├── panel4-backtest/   # Backtesting & regime detection
│   │   └── panel5-governance/ # Policy, action queue, audit log
│   ├── governance/            # Hazard scoring, survival functions, Kelly
│   ├── data/                  # Feeds, adapters, normalizers
│   └── api/                   # REST/webhook endpoints
├── scripts/                   # Setup, seed data, utilities
├── tests/                     # Unit + integration tests
└── .env.example               # Environment variable template
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

- **Runtime:** Node.js / TypeScript (primary), Python (governance math)
- **Agent Layer:** Inspired by openhuman agent orchestration patterns
- **Token Management:** tokenjuice for LLM token budgeting
- **Data:** Google Sheets (MVP) → Postgres / BigQuery (production)
- **Auth / Roles:** Role-based access (PM, Risk, Analyst, Ops, ReadOnly)
- **Infra:** Google Cloud / DigitalOcean · Docker · GitHub Actions

---

## Status

🚧 **Active build — Phase 1**

- [x] Architecture designed
- [x] Full schema defined (5 panels + event pipeline)
- [x] Governance math engine specified
- [ ] Panel 1: Reverse DCF engine
- [ ] Panel 2: Peer comps grid
- [ ] Panel 3: Portfolio risk console
- [ ] Panel 4: Backtesting + regime classifier
- [ ] Panel 5: Governance queue + action approvals
- [ ] Agent Pay / Mastercard integration layer

---

*MCQ Ventures · Governance-first. Regulator-ready. Built to last.*
