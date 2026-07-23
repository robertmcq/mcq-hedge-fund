# MCQ Ventures — Investor Memo

> Governance-first. Regulator-ready. Built to last.

Confidential — for qualified investors only.

---

## The Opportunity

Machine commerce is arriving faster than governance infrastructure for it. As AI agents begin to transact, allocate, and settle capital autonomously, the institutions that will capture durable value are those that solve the governance layer first — not as an afterthought, but as the core product.

MCQ Ventures is building that governance layer.

---

## What MCQ Is

MCQ is a **governance-first hedge fund decision console** — an AI-powered system that scores, sizes, approves, and audits every capital allocation decision against a mathematically grounded policy framework. It is not a trading algorithm. It is not a robo-advisor. It is the control plane that sits above any strategy and enforces the rules the PM committed to before the trade was placed.

The core engine models governance as a **continuous-time hazard process**:

```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```

Every position carries a survival probability `S(T)`, an enforcement probability `P_enf(T)`, a governance-adjusted expected value `EV_gov`, and a governance-adjusted Kelly fraction. These are not decorative metrics — they gate whether a trade is sized, resized, or blocked.

---

## Architecture: Five Panels

| Panel | Question Answered | Governance Role |
|---|---|---|
| 1. Reverse DCF | What is the market pricing in? | Intrinsic value anchor; DDM/CAPM hurdle |
| 2. Peer Comps | How does this name stack up? | Relative mispricing flag |
| 3. Portfolio & Risk | Can we survive this path? | Kelly sizing; drawdown limits; income ladder |
| 4. Regime & Backtests | Is behavior on-spec? | Regime-conditioned strategy performance |
| 5. Governance Queue | Are we inside our own rules? | Policy objects; action queue; audit trail |

---

## Strategy Framework

MCQ operates multiple strategy overlays, each documented in `docs/strategy/`. The current implemented overlay is the **Dividend Income Sleeve** — a yield-screened, payout-sustainability-governed, monthly income ladder built on live dividend calendar data. Every strategy sleeve is conditioned on the same governance math engine; there is no strategy-specific override path.

CAPM reference inputs (Jul 2026): R_f = 4.65%, R_m = 10.00%, MRP = 5.35%. Required returns: β=0.7 → 8.40%, β=1.8 → 14.28%.

---

## Academic Grounding

MCQ's architecture is not a black box. Every model choice maps to a specific, peer-reviewed theoretical foundation:

- **Hazard / survival model** — Cox proportional hazards; standard in credit risk and regulatory enforcement modeling.
- **Kelly criterion** — Kelly (1956); the mathematically optimal bet-sizing framework under log-utility.
- **CAPM / APT** — Sharpe (1964), Lintner (1965), Ross (1976); standard asset pricing.
- **DDM / Gordon Growth** — Gordon (1959); dividend discount valuation.
- **Factor models** — Fama-French (1993, 2015); Carhart (1997).

Full bibliography: `docs/references/bibliography.md`.

---

## Agent Pay Integration

MCQ is designed to scale beyond discretionary PM decisions to **machine commerce governance** — the control plane for AI agents transacting on behalf of institutions. The integration architecture:

| Layer | Provider | MCQ Role |
|---|---|---|
| Credentialing | Mastercard Agent Pay | Ingest agent identity → policy lookup |
| Permissioning | On-chain (Polygon, Solana, Base) | Map credential to MCQ rulebook |
| Transacting | Multi-rail | Hazard score → approve / resize / block |
| Settling | XRPL / RLUSD | Post-settlement audit log |

---

## Team

**Robert Millhouse — Managing Partner, MCQ Ventures**
Baltimore, MD. Architect of the MCQ governance framework and decision console.

---

## Contact

For investor inquiries: contact via [github.com/robertmcq](https://github.com/robertmcq)

---

*This memo is for informational purposes only and does not constitute an offer or solicitation to invest. Past performance is not indicative of future results. All return projections are hypothetical, inflation-adjusted, and net of assumed tax drag unless otherwise stated.*
