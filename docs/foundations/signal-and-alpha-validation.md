# Signal and Alpha Validation Standard

This document defines the MCQ pipeline for validating that a forecast signal carries
demonstrable positive drift (α) before it is permitted to enter the hazard-discounted
Kelly sizing framework.

It answers one question: **how does MCQ prove that a given μ has positive drift?**

This standard is the enforcement mechanism for the theoretical constraint stated in
`docs/risk/portfolio-construction-and-risk-control.md`, Section 7.x: survival probability
above the martingale baseline is only defensible when μ represents independently validated
alpha, not governance structure or factor beta mislabeled as skill.

This document is an original MCQ working paper. It does not imply endorsement, affiliation,
or derivation from any third-party course materials.

---

## 1. Scope and Definitions

**Candidate signal (μ_c).** A raw forecast — reverse DCF mispricing score, peer z-score,
momentum regime classifier output, or any other Panel 1–4 signal — that has not yet
completed the validation pipeline. A candidate signal may be used in research and
simulation but may not be used as an input to the survival-discounted Kelly formula
(`f_portfolio = f_Kelly_gov · S_portfolio(T)`) until it has graduated to Approved status.

**Approved signal (μ_a).** A candidate signal that has cleared all gates in this standard,
has a logged graduation record, and is eligible for use in production sizing.

**Alpha (α).** Residual return after stripping systematic factor premia. Returns attributable
to market beta, size, value, momentum, profitability, or investment factors (per
`docs/foundations/asset-pricing-and-markets.md`, Sections 2–3) are not credited as alpha.
α is defined as:

```
α = R_i − [Rf + β_i · (Rm − Rf) + Σ_k(β_ik · λ_k)]
```

Where the factor set includes at minimum Fama-French (1993) three factors plus the Carhart
(1997) momentum factor, extended as appropriate to the strategy class.

---

## 2. Signal Intake Criteria

Before statistical evaluation begins, a candidate signal must satisfy all of the following
intake conditions:

| Criterion | Minimum Standard |
|---|---|
| Data history | ≥ 5 years of clean, point-in-time data with no look-ahead bias |
| Liquidity floor | Tradeable at MCQ's target position size with ≤ 5% ADV participation |
| Asset class scope | Explicitly defined: equity, fixed income, macro, or multi-asset |
| Signal construction | Fully documented; no free parameters tuned to the evaluation period |
| Conflict of interest check | Signal developer has not observed the designated out-of-sample window |

Signals that fail any intake criterion are returned to research without entering the
statistical pipeline. This is a hard gate, not a soft recommendation.

---

## 3. Backtest Methodology Standard

**3.1 Walk-forward only.**
All backtests use a rolling walk-forward design. In-sample model fitting and
out-of-sample evaluation windows are strictly separated. Full-history optimization
followed by backtest on the same period is prohibited; any backtest produced under
that design is inadmissible for graduation.

**3.2 Window specification.**

| Parameter | Standard |
|---|---|
| Minimum total history | 5 years |
| In-sample training window | 3 years rolling |
| Walk-forward step size | 1 quarter |
| Minimum out-of-sample coverage | 2 years, held out from all model development |

**3.3 Transaction cost and implementation friction.**
Backtests must include realistic round-trip transaction costs, estimated market impact at
target size, and borrow cost for short positions. A backtest with zero-friction assumptions
does not meet this standard.

**3.4 Data snooping prohibition.**
If a signal was developed, parameterized, or modified after observing performance in the
designated out-of-sample window, that window is invalidated and a new out-of-sample period
must be designated before the signal may proceed.

---

## 4. Statistical Significance Thresholds

A candidate signal must clear all three of the following thresholds at the net-of-factor
level (post Section 5 attribution) to proceed to the out-of-sample gate:

| Metric | Minimum Threshold | Notes |
|---|---|---|
| Alpha t-statistic | ≥ 2.0 | On annualised residual α, full in-sample walk-forward period |
| Information Ratio | ≥ 0.5 | Net of factor premia and transaction costs |
| Hit rate | ≥ 52% | At the signal's primary holding-period horizon |

These are MCQ policy floors. A signal that clears all three is eligible for regime
segmentation and out-of-sample testing. A signal that clears two of three is a research
candidate, not an approved signal, regardless of absolute return magnitude.

---

## 5. Factor Neutralization Requirement

Before any metric in Section 4 is measured, signal returns must be attributed through a
multifactor regression and residualised:

**Step 1 — Factor attribution.**
Regress signal returns against the full MCQ factor set: market (Rm − Rf), size (SMB),
value (HML), momentum (UMD), profitability (RMW), investment (CMA). Additional factors
(credit spread, rates duration, volatility) are required for signals spanning fixed income
or macro instruments.

**Step 2 — Residual extraction.**
α is the intercept plus residual from that regression. Only this residual return is used
in the Section 4 significance tests.

**Step 3 — Exposure check.**
If any single factor beta (|β_k|) exceeds 0.3 after the intended hedge, the signal is
flagged for excess systematic exposure. It may still proceed if the excess exposure is
explicitly disclosed and governance-limited at the Panel 5 policy level; it may not
proceed if the excess exposure is the primary return driver.

This step enforces the principle stated in `docs/foundations/asset-pricing-and-markets.md`,
Section 3: returns attributable to systematic premia are not credited as alpha.

---

## 6. Regime Segmentation Requirement

A signal that achieves threshold alpha in a single-regime backtest is a candidate exposure
to regime transition, not a validated drift process. Before graduation, the signal's alpha
must be evaluated across regime partitions as defined by the Panel 4 regime classifier:

| Regime | Required result |
|---|---|
| Bull trend | Positive α with t-stat ≥ 1.5 OR documented hedging provision |
| Bear trend | Positive α with t-stat ≥ 1.5 OR documented hedging provision |
| Sideways / choppy | α not materially negative (t-stat ≥ −1.0) |
| Stress / volatility spike | Drawdown bounded within strategy mandate; no structural blow-up |

A signal that produces positive alpha only in bull-trend regimes and negative alpha in
bear regimes is a market-directional beta, not a skill-based drift. It may not graduate
under this standard unless the strategy mandate explicitly limits deployment to bull regimes
and the Panel 5 policy objects enforce that constraint.

---

## 7. Out-of-Sample Confirmation Gate

The out-of-sample window is the hardest gate in this pipeline. It is the primary evidence
an LP or regulator will examine when assessing whether MCQ's μ represents genuine positive
drift.

**Requirements:**

1. The out-of-sample window must be a minimum of 2 years and must post-date all model
   development and parameter selection.
2. The signal must achieve an out-of-sample Information Ratio ≥ 0.4 (a 20% concession
   from the in-sample threshold, reflecting parameter uncertainty).
3. The out-of-sample α t-statistic must be ≥ 1.65 (one-tailed, 5% significance).
4. No parameter changes are permitted during the out-of-sample period. Any modification
   to the signal during this period restarts the out-of-sample clock.

A signal that clears the in-sample gates (Sections 4–6) but fails the out-of-sample gate
is returned to research as a candidate signal. It may be re-evaluated after a new
out-of-sample window has accumulated — it may not be manually passed on the basis of
qualitative argument.

---

## 8. Graduation Record and Versioning

Upon clearing all gates, a signal is promoted to Approved status and assigned a
graduation record. The record is logged and version-controlled in
`docs/references/signal-graduation-log.md` (to be created at first graduation).

Each graduation record contains:

| Field | Content |
|---|---|
| Signal ID | Unique identifier (e.g., `SIG-001`) |
| Signal name | Human-readable description |
| Strategy class | Corresponding playbook strategy family |
| Approval date | ISO 8601 date |
| Validated α estimate | Annualised, net-of-factor, with confidence interval |
| In-sample IR | Final walk-forward IR |
| Out-of-sample IR | Confirmed OOS IR |
| Regime coverage | Regimes cleared per Section 6 |
| Factor residualization | Factor set used; residual β exposures |
| Backtest commit SHA | Git commit containing the full backtest artifacts |
| Approving PM | Initials or identifier of approving portfolio manager |

**Deprecation.** An approved signal may be deprecated if: (a) live performance diverges
from the validated α estimate by more than 2 standard errors over a rolling 12-month
window, (b) a structural regime change invalidates the signal's operating assumptions, or
(c) the data source underpinning the signal becomes unavailable or materially altered.
Deprecated signals are logged in the graduation record with a deprecation date and reason;
they are removed from production sizing immediately upon deprecation.

---

## 9. Relationship to the Hazard-Discounted Framework

This standard is the enforcement mechanism for the theoretical constraint in
`docs/risk/portfolio-construction-and-risk-control.md`, Section 7.x:

> "The validation of μ as demonstrable alpha is governed by the MCQ Signal and Alpha
> Validation Standard (`docs/foundations/signal-and-alpha-validation.md`); no signal may
> be used as an input to the hazard-discounted Kelly framework until it has cleared the
> graduation criteria specified therein."

The survival-probability discount (`f_portfolio = f_Kelly_gov · S_portfolio(T)`) is a
capital-preservation mechanism, not an alpha-generation mechanism. It functions correctly
only when μ is an independently validated positive drift. Where μ reflects factor beta or
unvalidated forecast, the discount reduces exposure to a fair or unfavorable process; it
does not create edge where none exists.

This constraint is the application of the Optional Stopping Theorem to MCQ's sizing
framework: no bounded stopping rule or repositioning overlay can extract positive expected
value from a zero-drift process. Governance discipline is not a substitute for validated
alpha.

*Theoretical framing informed by standard martingale theory (Optional Stopping Theorem),
per MIT OpenCourseWare, 18.S096 Topics in Mathematics with Applications in Finance,
Lecture 5 (Dr. Choongbum Lee), used under CC BY-NC-SA 4.0
(https://creativecommons.org/licenses/by-nc-sa/4.0/). This document does not imply
endorsement, affiliation, or derivation from MIT course materials.*
