# MCQ Ventures — Investor One-Pager

## The Governance & Capital-Allocation Orchestrator for Agent Pay-Style Machine Commerce

---

## Problem

Machine commerce is becoming real infrastructure. On June 10, 2026, Mastercard launched Agent Pay for Machines — a governed, multi-rail payment network where AI agents transact with each other autonomously, backed by 30+ partners including Ripple, Coinbase, Stripe, and OKX. The settlement rails are live. The problem is what comes next: who decides what an agent is *allowed* to do, how much it's *allowed* to spend, and whether the action is *appropriate* given live risk conditions and enterprise policy? The payment rail cannot answer those questions. A governance layer must.

---

## Solution

**MCQ** is the governance and capital-allocation orchestrator for autonomous agent activity. It sits above the payment rail as the decision intelligence layer. It converts policy into executable controls, converts governance signals into hazard scores, and converts hazard scores into capital-allocation decisions — approving, resizing, throttling, or blocking agent actions before settlement.

---

## Integration with Mastercard / Ripple Architecture

| Mastercard Layer | MCQ Role |
|---|---|
| Credentialing | Ingest agent identity → policy lookup |
| Permissioning | Map permissions to MCQ enterprise rulebook |
| Transacting | Hazard score → approve / resize / block |
| Settling (XRPL/RLUSD) | Post-settlement audit log entry |

---

## Product: Five-Panel Decision Console

1. **Reverse DCF** — What is the market assuming for each security?
2. **Peer Comps** — How does this name rank against its peer group?
3. **Portfolio Risk** — Can we survive this path (drawdown, exposure, Kelly)?
4. **Backtesting & Regime** — Is the strategy behaving as designed?
5. **Governance Queue** — Are we inside our own rules? (approve/reject action items)

---

## Governance Math Engine (The Moat)

```
h(t|G,X) = h₀·exp(βG(1-G) + βᵀX)     # hazard function
S(T) = exp(-h·T)                        # survival probability
P_enf(T) = 1 - S(T)                    # enforcement probability
EV_gov = P_win·Win - P_loss·Loss - P_enf·EnfLoss   # governance-adjusted EV
f_Kelly_gov = W_eff - (1-W_eff)/R      # governance-adjusted Kelly fraction
RiskPerTrade = Equity · f_fraction · f_Kelly_gov
```

Governance is not a compliance checkbox. It is a quantitative risk parameter that shapes probability trees, expected value, and position sizing in real capital decisions.

---

## Market

Agentic commerce could represent a $3–5 trillion market by 2030. Every autonomous transaction in that market requires a governance and allocation layer. MCQ's initial wedge is financial services and enterprise AI deployments, with a direct expansion path into any vertical using Agent Pay-style machine commerce infrastructure.

---

## Business Model

- **Enterprise SaaS** — Governance console + policy engine subscription
- **Risk API** — Per-call hazard scoring and Kelly sizing for agent integrations
- **Policy Modules** — Jurisdiction-specific, mandate-specific rulebook products
- **Audit & Compliance** — Immutable decision log and reporting for LPs, regulators, boards

---

## Moat

MCQ is not a payment network. It is the governance layer that sits *above* any network, which means it can be embedded across providers — Mastercard, Ripple, Coinbase, and future rails — rather than tied to one. The moat is policy logic + audit trail + risk-adjusted sizing, all operating at machine speed.

---

## Traction & Status

- Architecture fully designed and schema-complete (5 panels, full event pipeline)
- Governance math engine specified and documented
- Reference integrations mapped to Mastercard AP4M and Ripple XRPL/RLUSD architectures
- Phase 1 build in progress: Panel 1 (Reverse DCF) + Panel 5 (Governance Queue)

---

## Team

**Robert Robinson — Founder & Managing Partner, MCQ Ventures**
Baltimore, MD · AI governance and compliance · Legal tech · Business automation
[github.com/robertmcq](https://github.com/robertmcq)

---

*MCQ Ventures · Governance-first. Regulator-ready. Built to last.*
