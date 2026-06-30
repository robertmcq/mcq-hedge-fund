# Portfolio Construction and Risk Control

This document specifies how MCQ constructs and governs portfolios.

It separates three layers clearly:
- **Established finance theory**: portfolio optimisation, factor models, performance attribution
- **Industry practice**: Barra-style decomposition, liquidity limits, drawdown governance
- **MCQ implementation**: governance-adjusted expected value, Panel 5 policy objects,
  and the MCQ Governance Covariate Model

This document is an original MCQ working paper informed by standard quantitative finance
pedagogy (see `docs/references/bibliography.md`). It does not imply endorsement,
affiliation, or derivation from any third-party course materials.

---

## 1. The Portfolio Construction Problem

A portfolio is not a list of trades. It is a solution to an optimisation problem with
three inputs:

1. **Expected returns** — signal-derived forecasts for each instrument
2. **Risk model** — covariance matrix Σ, typically decomposed into factors plus idiosyncratic risk
3. **Constraints** — policy objects from Panel 5: leverage, concentration, liquidity, factor caps

**Established theory.** The classical mean-variance frontier (Markowitz, 1952) finds weights
w that maximise:

```
U = wᵀμ - (λ/2) · wᵀΣw
```

Where μ is the expected return vector, Σ is the covariance matrix, and λ is risk aversion.

**MCQ implementation.** MCQ exposes λ as a governance-configurable parameter and applies
governance-adjusted expected returns:

```
μ_gov = μ · S(T)
```

where S(T) is the MCQ survival probability used as a discount factor on forecast alpha.

In practice, raw Markowitz optimisation is unstable with noisy estimates. MCQ therefore
applies covariance shrinkage, signal decay weighting, and hard policy constraints to
stabilise the solution.

---

## 2. Factor Risk Decomposition

**Established theory.** Factor models decompose asset returns as:

```
r_i = α_i + Σ_k(β_ik · f_k) + ε_i
```

Where f_k are common factor returns, β_ik are factor loadings, and ε_i is idiosyncratic
residual risk.

**Industry practice.** Barra-style multifactor risk systems implement this decomposition
using market, sector, size, value, momentum, quality, profitability, and investment factors.

**MCQ implementation.** Panel 3 displays factor exposures in real time. A governance alert
fires when any single factor exposure breaches its Panel 5 policy limit, even if gross/net
dollar limits remain within mandate. A portfolio can look diversified by name count and
still be dangerously concentrated in a single factor.

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
exceptions to the governance queue with a versioned audit trail.

---

## 4. Liquidity-Aware Sizing

Position size is a function of both alpha and liquidity. Industry practice expresses
liquidity limits as a fraction of ADV and a market-impact tolerance.

**MCQ implementation.** MCQ applies a liquidity haircut before Kelly sizing:

```
LiquidityScore_i = ADV_participation_rate · MarketImpact(size_i)
```

Positions with high estimated market impact are capped at the liquidity-adjusted size
regardless of Kelly output.

Fractional Kelly (25% here) reduces concentration risk relative to full Kelly sizing,
accounting for parameter uncertainty in win-rate and payoff ratio estimates from finite
backtests. The fractional setting is an MCQ implementation choice; it should be reviewed
per strategy and regime.

In stressed regimes, the ADV participation cap tightens automatically. This is an
MCQ governance implementation choice, not an academic theorem.

---

## 5. Performance Evaluation

**Established theory.** Standard performance metrics:

```
Sharpe Ratio      = (Rp - Rf) / σp
Sortino Ratio     = (Rp - Rf) / σ_downside
Calmar Ratio      = CAGR / MaxDrawdown
Information Ratio = Active Return / Tracking Error
Hit Rate          = # profitable trades / total trades
Alpha (CAPM)      = Rp - [Rf + β(Rm - Rf)]
```

**MCQ implementation.** Factor-adjusted alpha is the primary performance measure, not raw
Sharpe. A strategy with strong headline returns but uncompensated factor exposure does not
represent demonstrable skill. Panel 4 decomposes returns into factor contributions and
residual alpha on a rolling window.

---

## 6. Drawdown Governance

Drawdown is both a risk metric and an active operating-control trigger.

**MCQ implementation.** MCQ drawdown escalation ladder:

| Drawdown Level | Action |
|---|---|
| > 5% from peak | Governance alert; no new positions without PM approval |
| > 10% from peak | Position sizing halved |
| > 15% from peak | New entries blocked; reduction queue opens |
| > 20% from peak | Full portfolio review required before trading resumes |

These thresholds are MCQ policy objects, not universal industry standards. The critical
principle is escalation discipline, versioned rules, and auditability.

---

## 7. Portfolio Survival Approximation

Individual positions have their own MCQ survival probability S_i(T) from the governance
hazard model.

**MCQ approximation.** At the portfolio level, MCQ approximates portfolio-level survival
probability as the geometric weighted product of individual position survival probabilities,
adjusted for tail dependence in stress regimes:

```
S_portfolio(T) = Π S_i(T)^(w_i / Σw_i)
```

This is an MCQ modelling assumption, not a general finance theorem. It is a tractable
approximation that penalises portfolios of many marginal exposures relative to portfolios
of fewer, higher-conviction, cleaner-governance positions.

In later calibration phases, this should be extended to model explicit tail dependence
between positions rather than assuming separability. In a regulatory deposition or LP
review, this formula should always be presented as an MCQ approximation.

A portfolio-level Kelly fraction is then further discounted:

```
f_portfolio = f_Kelly_gov · S_portfolio(T)
```
