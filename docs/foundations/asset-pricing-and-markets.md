# Asset Pricing and Markets — Theoretical Foundations

This document records the theoretical foundations behind MCQ's quantitative decisions.

It separates three layers clearly:
- **Established finance theory**: Markowitz, CAPM, APT, no-arbitrage pricing
- **Industry practice**: multifactor risk systems, benchmark-relative attribution
- **MCQ implementation**: Governance Score G, Enforcement Loss, Panel architecture,
  and the MCQ Governance Covariate Model

This document is an original MCQ working paper informed by standard quantitative finance
pedagogy (see `docs/references/bibliography.md`). It does not imply endorsement,
affiliation, or derivation from any third-party course materials.

---

## 1. Risk and Return

**Established theory.** Modern portfolio theory holds that investors care about the full
distribution of returns, not expected value alone. Diversification reduces idiosyncratic
risk without necessarily reducing expected return. The efficient frontier defines the set
of portfolios with maximum expected return for each level of variance.

**MCQ implementation.** Panel 3's optimisation logic solves along a governance-constrained
efficient frontier. Risk aversion λ is a configurable portfolio policy parameter rather
than a hidden assumption baked into the engine.

---

## 2. CAPM

**Established theory.** The CAPM prices assets based on their covariance with the market
portfolio:

```
E[R_i] = Rf + β_i · (E[Rm] - Rf)
```

Where β_i = Cov(R_i, R_m) / Var(R_m). Assets with high market beta command higher expected
return as compensation for non-diversifiable systematic risk.

**MCQ implementation.** CAPM beta is the baseline factor in Panel 3. Alpha — realised
return minus CAPM-implied return — is the primary performance metric in Panel 4 before
moving to a richer multifactor decomposition.

**Limitation.** CAPM is empirically too simple for real portfolios. Multifactor models are
required to separate genuine skill from systematic factor exposures.

---

## 3. APT and Multifactor Models

**Established theory.** The Arbitrage Pricing Theory generalises beyond a single market
factor:

```
E[R_i] = Rf + Σ_k(β_ik · λ_k)
```

Where λ_k is the risk premium for factor k. Common equity factors include market (Rm - Rf),
size (SMB), value (HML), momentum (UMD), profitability (RMW), and investment (CMA).

**Industry practice.** Investment firms typically implement these through multifactor risk
systems rather than estimating a textbook APT directly.

**MCQ implementation.** Panel 3 decomposes gross P&L into factor contributions. Returns
attributable to systematic premia are not credited as alpha.

---

## 4. Market Efficiency and Its Limits

**Established theory.** The Efficient Market Hypothesis holds that prices reflect available
information. In strong form, persistent alpha should not exist after costs.

**Behavioural finance.** Empirical work in this tradition highlights that prices can
move more than fundamentals alone justify — excess volatility, narrative dynamics, and
institutional risk appetite create systematic deviations from strong-form efficiency.

**MCQ implementation.** MCQ does not assume strong-form efficiency. It treats regime,
market narrative, and governance posture as state variables that affect whether an
apparent edge is monetisable in a given environment.

---

## 5. Derivatives and No-Arbitrage Pricing

**Established theory.** Under no-arbitrage, a derivative's current value is the discounted
expectation of its future payoff under a risk-neutral measure:

```
V₀ = e^(-rT) · E^Q[V_T]
```

This underpins option pricing, futures valuation, and dynamic hedging.

**Industry practice.** Real desks price and hedge using market-implied volatilities,
funding adjustments, and liquidity spreads in addition to clean theoretical formulas.

**MCQ implementation.** MCQ uses derivatives for hedging, convexity management, and
strategy expression. Hedge costs and basis risk are carried explicitly in
governance-adjusted expected value rather than treated as zero-friction abstractions.

---

## 6. Leverage, Liquidity Risk, and the MCQ Governance Covariate Model

**Established theory.** Leverage amplifies both gains and losses. Liquidity risk is the
risk that a position cannot be exited at a fair price in a timely manner. In stress,
these two risk types become correlated and path-dependent.

**MCQ implementation.** The MCQ Governance Covariate Model formalises these pressures
through the hazard function:

```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```

Here G is the MCQ Governance Score and X is the MCQ Governance Covariate Model vector.
Velocity, Volume, and Shadow are MCQ-specific implementation variables — they are not
standard academic factors. They encode the rate of governance score change, transaction
intensity, and off-balance-sheet or weakly governed channel exposure respectively.

This model is MCQ proprietary. It should always be presented as such rather than attributed
to the academic or industry literature on hazard models.

---

## 7. Absolute-Return Design

**Industry practice.** An absolute-return strategy targets positive returns across market
states. This requires the ability to hedge or short away uncompensated beta, multiple
partially independent alpha sources, and robust drawdown governance.

**MCQ implementation.** MCQ is designed for absolute-return mandates. Panel 3 measures
market and factor betas continuously, while Panel 5 treats excess uncompensated beta as a
policy issue. The design goal is to generate alpha that survives liquidity stress,
enforcement risk, and regime change — the three real threats to absolute-return strategies
that standard risk metrics systematically understate.
