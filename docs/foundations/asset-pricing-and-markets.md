# Asset Pricing and Markets — Theoretical Foundations

This document records the theoretical foundations behind MCQ's quantitative decisions.

It separates three layers clearly:
- **Established finance theory**: Markowitz, CAPM, APT, no-arbitrage pricing
- **Industry practice**: multifactor models, benchmark-relative attribution, hedging workflows
- **MCQ implementation**: governance score, enforcement loss, panel architecture, and the
  MCQ Governance Covariate Model

Public university courses and open materials informed background reading for this file,
but this document is an original MCQ working paper. It does not imply endorsement,
affiliation, or derivation from any university course materials.

---

## 1. Risk and Return

The central result of modern portfolio theory is that investors care about the full
distribution of returns, not expected value alone. Diversification reduces idiosyncratic
risk without necessarily reducing expected return. The efficient frontier defines the set
of portfolios with maximum expected return for each level of variance.

**MCQ implementation.** Panel 3's optimisation logic should solve along a governance-
constrained efficient frontier. Risk aversion λ is treated as a configurable portfolio
parameter rather than a hidden assumption.

---

## 2. CAPM

The CAPM prices assets based on their covariance with the market portfolio:

```
E[R_i] = Rf + β_i · (E[Rm] - Rf)
```

Where β_i = Cov(R_i, R_m) / Var(R_m).

**Established theory.** CAPM is the baseline asset-pricing benchmark for market risk.

**MCQ implementation.** CAPM beta is the starting factor in Panel 3, and alpha is measured
relative to this baseline before moving to a richer multifactor decomposition in production.

**Limitation.** CAPM is too simple for real portfolios. Multifactor models are required to
separate true skill from systematic exposures.

---

## 3. APT and Multifactor Models

The Arbitrage Pricing Theory generalises asset pricing beyond a single market factor:

```
E[R_i] = Rf + Σ_k(β_ik · λ_k)
```

Where λ_k is the risk premium for factor k.

**Established theory.** APT and related factor frameworks motivate the use of market,
size, value, momentum, profitability, investment, and sector factors.

**Industry practice.** Investment firms typically implement these through multifactor
risk systems rather than by estimating a pure textbook APT directly.

**MCQ implementation.** Panel 3 decomposes gross P&L into factor contributions so that
returns attributable to systematic premia are not mislabelled as alpha.

---

## 4. Market Efficiency and Its Limits

The Efficient Market Hypothesis holds that prices reflect available information. In strong
form, persistent alpha should not exist after costs. Empirically, markets still exhibit
anomalies and behavioural dislocations that create opportunities for active managers.

**Established theory.** Market efficiency is the benchmark null hypothesis.

**Behavioural finance contribution.** Work associated with Yale's financial-markets tradition,
including Robert Shiller's excess-volatility and narrative perspectives, highlights that
prices can move more than fundamentals alone justify.

**MCQ implementation.** MCQ does not assume strong-form efficiency. It treats regime,
market narrative, and governance constraints as state variables that affect whether an
apparent edge is monetisable.

---

## 5. Derivatives and No-Arbitrage Pricing

A derivative is a contract whose payoff depends on an underlying asset. Under no-arbitrage,
there exists a pricing framework in which the current value is the discounted expectation of
the future payoff under a risk-neutral measure:

```
V₀ = e^(-rT) · E^Q[V_T]
```

**Established theory.** This is the basis of modern option pricing and hedge design.

**Industry practice.** Real desks price and hedge using market-implied volatilities,
funding adjustments, and liquidity spreads in addition to clean textbook formulas.

**MCQ implementation.** MCQ uses derivatives for hedging, convexity management, and
strategy expression. Hedge costs and basis risk are carried explicitly in governance-
adjusted expected value rather than treated as zero-friction abstractions.

---

## 6. Leverage, Liquidity Risk, and the MCQ Governance Covariate Model

Leverage amplifies both gains and losses. Liquidity risk is the risk that a position
cannot be exited at a fair price in a timely manner. In stress, leverage and liquidity
become path-dependent and can force losses to crystallise before a thesis has time to work.

**Established theory.** These are standard concerns in portfolio and derivatives risk.

**MCQ implementation.** MCQ formalises these pressures through the governance hazard model:

```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```

Here, the covariate vector X is part of the **MCQ Governance Covariate Model**. Velocity,
Volume, and Shadow are MCQ implementation variables — not standard academic factors. They
encode how fast governance quality is changing, how intensely the system is transacting, and
how much exposure sits in less transparent or weakly governed channels.

---

## 7. Absolute-Return Design

An absolute-return strategy targets positive returns across market states rather than simply
outperforming a benchmark during bull markets. That requires three capabilities:

1. The ability to hedge or short away uncompensated beta
2. Multiple, partially independent alpha sources
3. Strong drawdown governance to avoid ruin under adverse regimes

**MCQ implementation.** MCQ is designed for absolute-return mandates. Panel 3 measures market
and factor betas continuously, while Panel 5 treats excess uncompensated beta as a policy
issue rather than a cosmetic reporting detail.

The design goal is not benchmark hugging. The goal is to generate alpha that survives
liquidity stress, enforcement risk, and regime change.
