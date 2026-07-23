# Dividend Income Sleeve — MCQ Strategy Document

This document defines the dividend income sleeve as an overlay strategy within the MCQ five-panel architecture.

It separates three layers clearly:
- **Established finance theory**: Dividend Discount Model (DDM), Gordon Growth Model, CAPM, SDE valuation
- **Industry practice**: dividend growth investing, DRIP, income laddering, payout sustainability screening
- **MCQ implementation**: governance-adjusted sustainability flag, Panel 3 income dashboard, Panel 5 yield/payout policy objects, lambda-driven live calendar

This document is an original MCQ working paper informed by standard quantitative finance pedagogy (see `docs/references/bibliography.md`). It does not imply endorsement, affiliation, or derivation from any third-party course materials.

---

## 1. Theoretical Foundation

**Established theory.** The Dividend Discount Model values a stock as the present value of all future dividends:

```
P₀ = D₁ / (r - g)
```

Where `D₁` is next period's dividend, `r` is the required return (from CAPM), and `g` is the sustainable long-run dividend growth rate. The Gordon Growth Model is the constant-growth special case.

**CAPM baseline.** Required return for a dividend payer is set by CAPM:

```
R_a = R_f + β(R_m - R_f)
```

Using current inputs: R_f = 4.65% (U.S. 10-Year Treasury), long-run R_m = 10%, Market Risk Premium = 5.35%.

| Beta Profile | Example | Expected Return |
|---|---|---|
| β = 0.7 (low-risk, e.g. consumer staple) | PG, KO, JNJ | R_a = 4.65% + 0.7(5.35%) = 8.40% |
| β = 1.0 (market) | S&P 500 | R_a = 4.65% + 5.35% = 10.00% |
| β = 1.8 (high-risk, e.g. semiconductor) | NVDA, AVGO | R_a = 4.65% + 1.8(5.35%) = 14.28% |

**Implementation note.** These CAPM expected returns set the *hurdle* for a dividend position. A stock yielding 0.85% (e.g. MSFT) requires capital appreciation to meet an 8.4% hurdle — it is a growth position, not an income position. MCQ's income sleeve applies a yield floor that filters out these names at the screening stage.

**Industry practice.** Dividend growth investing targets companies with long records of consecutive dividend increases (Dividend Aristocrats: 25+ years; Dividend Kings: 50+ years). The thesis is that sustained dividend growth signals durable earnings power and management discipline, not just current yield.

---

## 2. MCQ Yield and Payout Screens

All names must pass three filters before entering the income sleeve. These are MCQ policy objects stored in Panel 5.

**MCQ implementation.**

| Screen | Default Threshold | Configurable Via |
|---|---|---|
| Trailing yield floor | ≥ 2.5% | `INCOME_YIELD_FLOOR` env var / Panel 5 policy |
| Payout ratio ceiling (earnings) | ≤ 75% | `INCOME_PAYOUT_MAX_EARNINGS` |
| Payout ratio ceiling (FCF, for REITs) | ≤ 90% | `INCOME_PAYOUT_MAX_FCF` |
| Dividend growth streak minimum | ≥ 5 consecutive years of increases | `INCOME_GROWTH_STREAK_MIN` |

Under these screens, names like MSFT (~0.85–0.94% yield), AVGO (~0.8%), and WMT (~0.86%) fail the yield floor immediately. This is the correct outcome for an income sleeve — they are quality businesses but not income instruments.

---

## 3. Income Ladder Construction

**Industry practice.** Income laddering staggers dividend payment dates across calendar months so the portfolio generates cash flow in every month of the year. Most large-cap U.S. equities are quarterly payers, so a 12-month ladder requires careful scheduling across four quarterly cycles — typically March/June/September/December, January/April/July/October, and February/May/August/November cohorts.

**MCQ implementation.** The ladder is built programmatically, not from a static list. The `src/integrations/dividend-calendar.ts` adapter ingests live ex-dividend and payment dates. The `src/panels/panel3-risk/income-ladder.ts` module:

1. Groups passing names by **payment month** (not ex-dividend month)
2. Flags any calendar month with zero confirmed payers as a GAP
3. Flags any month with a single payer as CONCENTRATION risk
4. Outputs the ladder as a Panel 3 dashboard object, refreshed on each Lambda invocation

**Gap detection.** A month with no payer is flagged as a Panel 5 governance action item — the PM must either accept the gap or add a position to close it. This prevents the "monthly income" thesis from silently breaking when a company cuts or suspends its dividend.

---

## 4. Payout Sustainability — MCQ Governance Integration

**Established theory.** A dividend is a contractual cash commitment. Payout ratio and free cash flow coverage are the two primary sustainability signals. A payout ratio above 100% of earnings means the company is paying dividends from debt or asset sales — this is unsustainable.

**MCQ implementation.** Each position in the income sleeve carries a **Dividend Sustainability Flag** derived from the governance hazard model:

```
Sustainability_Flag = f(GovernanceScore_G, PayoutRatio, FCF_Coverage, VelocityCovariate)
```

- A deteriorating Governance Score (falling G) or rising Velocity covariate triggers a sustainability review for the dividend position
- A payout ratio breach (above ceiling) triggers a Panel 5 action item independent of G
- A dividend cut or suspension event sets the position to REVIEW status and blocks new additions to the ladder slot for that month

This connects the income sleeve directly to the MCQ Governance Covariate Model rather than treating dividend sustainability as a separate, unlinked process.

---

## 5. Panel Mapping

| Panel | Role in Income Sleeve |
|---|---|
| Panel 1 (DCF) | DDM / Gordon Growth valuation; intrinsic value vs. current price |
| Panel 2 (Comps) | Peer yield comparison; premium/discount to sector median yield |
| Panel 3 (Risk) | Live income ladder; payment calendar; factor exposure of sleeve |
| Panel 4 (Regime) | Yield curve regime flag — rising rate environments compress dividend valuations |
| Panel 5 (Governance) | Policy objects: yield floor, payout ceiling, growth streak min; gap and concentration alerts |

---

## 6. Yield Curve and Regime Sensitivity

**Established theory.** Dividend-paying equities are rate-sensitive. When the risk-free rate rises, the DDM discount rate rises and dividend stock prices compress, even if the dividend itself is unchanged. This is mechanically equivalent to bond duration risk.

**MCQ implementation.** Panel 4's regime classifier includes a yield-curve state variable. When the regime flag is RISING_RATES, the income sleeve's position sizing is automatically compressed via the governance Kelly discount. When the regime is FALLING_RATES or FLAT, the full sizing is restored. This prevents the sleeve from being overweight in a rate-driven drawdown without requiring manual PM intervention.

---

## 7. What Does Not Belong in This Sleeve

The following categories are explicitly excluded from the income sleeve, even if they appear in retail dividend content:

- **Sub-2.5% yielders repackaged as dividend stocks** (MSFT, AVGO, WMT, COST regular dividend) — these are growth positions. They may appear in other MCQ strategy sleeves but not here.
- **Static social-media stock lists** — no hardcoded ticker lists. The universe is defined by the screens in Section 2, applied dynamically.
- **Retail compounding projections without tax/inflation adjustment** — any return projection in MCQ investor-facing documents must be net of taxes, inflation-adjusted, and carry explicit sequence-of-returns assumptions.
- **SDE multiples for private digital businesses** — SDE (Seller's Discretionary Earnings) valuation is a private-market M&A framework, not a public equity income tool. It is documented in `docs/foundations/` for reference but does not apply to this sleeve.
