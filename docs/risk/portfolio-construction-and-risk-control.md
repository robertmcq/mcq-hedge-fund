# Portfolio Construction and Risk Control

This document specifies how MCQ constructs and governs portfolios.

It separates three layers clearly:
- **Established finance theory**: portfolio optimisation, factor models, performance attribution
- **Industry practice**: Barra-style decomposition, liquidity limits, drawdown governance
- **MCQ implementation**: governance-adjusted expected value, Panel 5 policy objects,
  and the MCQ Governance Covariate Model

Public university courses and open materials informed background reading for this file,
but this document is an original MCQ working paper. It does not imply endorsement,
affiliation, or derivation from any university course materials.

---

## 1. The Portfolio Construction Problem

A portfolio is not a list of trades. It is a solution to an optimisation problem with
three inputs:

1. **Expected returns** — signal-derived forecasts for each instrument
2. **Risk model** — covariance matrix Σ, typically decomposed into factors plus idiosyncratic risk
3. **Constraints** — policy objects from Panel 5: leverage, concentration, liquidity, factor caps

The classical mean-variance frontier (Markowitz) finds weights w that maximise:

```
U = wᵀμ - (λ/2) · wᵀΣw
```

Where μ is the expected return vector, Σ is the covariance matrix, and λ is the risk
aversion parameter.

**MCQ implementation.** MCQ exposes λ as a governance-configurable parameter. It also uses
governance-adjusted expected returns:

```
μ_gov = μ · S(T)
```

where S(T) is the MCQ survival probability used as a discount factor on forecast alpha.

In practice, raw Markowitz optimisation is unstable with noisy estimates. MCQ therefore
expects shrinkage on Σ, signal decay weighting, and policy hard limits to stabilise the
portfolio.

---

## 2. Factor Risk Decomposition

Industry risk systems commonly model returns as:

```
r_i = α_i + Σ_k(β_ik · f_k) + ε_i
```

Where f_k are common factor returns, β_ik are factor loadings, and ε_i is idiosyncratic
residual risk.

**Industry practice.** This is the basis of Barra-style and related multifactor risk models.
Typical factors include market, sector, size, value, momentum, quality, profitability,
and investment.

**MCQ implementation.** Panel 3 displays factor exposures in real time. A governance alert
fires when any single factor exposure breaches its policy limit, even if gross/net dollar
limits remain within mandate.

The practical value is simple: a portfolio can look diversified by name count and still be
dangerously concentrated in momentum or duration.

---

## 3. Risk Metrics and Limits

MCQ computes and governs the following risk measures continuously:

| Metric | Definition | Governance Limit Type |
|---|---|---|
| Gross Exposure | Σ|w_i| as % of NAV | Hard cap |
| Net Exposure | Σw_i as % of NAV | Band |
| VaR (95%, 1-day) | 5th percentile of daily P&L distribution | Soft alert |
| Expected Shortfall | Mean loss beyond VaR threshold | Hard cap |
| Max Drawdown | Peak-to-trough decline since inception | Alert ladder |
| Tracking Error | Annualised std dev of active returns vs benchmark | Mandated band |
| Leverage Ratio | Total notional / NAV | Hard cap |
| Single Name Concentration | Max position / NAV | Hard cap |
| Factor Exposure | Net β per factor | Band per factor |

**Industry practice.** Hard caps trigger risk reduction or trade blocks. Soft alerts escalate
to PM/risk review.

**MCQ implementation.** Panel 5 records these as machine-readable policy objects and routes
exceptions to the governance queue.

---

## 4. Liquidity-Aware Sizing

Position size is a function of both alpha and liquidity. In industry practice, liquidity
limits are often expressed as a fraction of ADV and a market-impact tolerance.

**MCQ implementation.** MCQ applies a liquidity haircut before Kelly sizing:

```
LiquidityScore_i = ADV_participation_rate · MarketImpact(size_i)
```

Positions with high estimated market impact are capped at the liquidity-adjusted size
regardless of Kelly output. In stressed regimes, the ADV participation cap should tighten
automatically.

This is an implementation choice, not an academic theorem.

---

## 5. Performance Evaluation

MCQ evaluates strategy performance on six dimensions:

```
Sharpe Ratio      = (Rp - Rf) / σp
Sortino Ratio     = (Rp - Rf) / σ_downside
Calmar Ratio      = CAGR / MaxDrawdown
Information Ratio = Active Return / Tracking Error
Hit Rate          = # profitable trades / total trades
Alpha (CAPM)      = Rp - [Rf + β(Rm - Rf)]
```

**Established theory.** Sharpe, CAPM alpha, and related attribution measures come from
standard asset pricing and performance evaluation literature.

**MCQ implementation.** Factor-adjusted alpha is the primary performance measure, not raw
Sharpe. A strategy with strong headline returns but uncompensated factor exposure should not
be credited as true skill.

---

## 6. Drawdown Governance

Drawdown is both a risk metric and an operating-control trigger.

An MCQ drawdown ladder can be implemented as follows:

| Drawdown Level | Action |
|---|---|
| > 5% from peak | Governance alert; no new positions without PM approval |
| > 10% from peak | Position sizing halved |
| > 15% from peak | New entries blocked; reduction queue opens |
| > 20% from peak | Full portfolio review required before trading resumes |

These thresholds are MCQ policy objects rather than universal industry standards.
The important principle is escalation discipline, versioned rules, and auditability.

---

## 7. Portfolio Survival Approximation

Individual positions have their own MCQ survival probability S_i(T) from the governance
hazard model. At the portfolio level, MCQ may use the following **portfolio survival
approximation**:

```
S_portfolio(T) = Π S_i(T)^(w_i / Σw_i)
```

This is an MCQ modelling assumption, not a general finance result. It is a useful way to
express that a portfolio of many marginal exposures may deserve a steeper governance haircut
than a portfolio of fewer, cleaner, higher-conviction positions.

A portfolio-level Kelly fraction can then be further discounted:

```
f_portfolio = f_Kelly_gov · S_portfolio(T)
```

In later calibration phases, this should be extended to allow explicit dependence and tail
correlation between positions rather than assuming separability.
