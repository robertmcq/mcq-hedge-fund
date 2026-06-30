# MCQ Hedge Fund Strategy Playbook

This document defines the eight canonical hedge fund strategy families recognised by the
institutional investment community, maps each to MCQ panel schema objects, and identifies
the key risk vectors the governance engine must price into the hazard function.

Public university courses and open materials informed the background reading for this
file, but this document is an original MCQ working paper. It does not imply endorsement,
affiliation, or derivation from any university course materials.

---

## 1. Long / Short Equity

**Return driver.** A portfolio manager takes long positions in undervalued stocks and short
positions in overvalued ones within the same sector or market. Returns come from the spread
between longs and shorts converging toward fundamental value, with market beta partially
cancelled by the hedge.

**Signal types in MCQ.** Reverse DCF mispricing score (Panel 1), peer z-score and
premium/discount rank (Panel 2), and momentum regime flags (Panel 4).

**Key risk vectors.**
- Net long bias creeping above mandate during bull markets (exposure drift)
- Short squeeze: borrowed stock recalled, forced cover at a loss
- Factor crowding: if many funds hold the same longs/shorts, correlation spikes in drawdowns
- Financing cost on short leg (stock borrow fee) erodes carry

**Governance treatment.** Gross and net exposure bands are first-class MCQ policy objects in
Panel 5. Kelly sizing uses survival probability S(T) as a discount factor; high crowding
score raises the effective hazard budget for the affected position cluster.

---

## 2. Event-Driven

**Return driver.** Corporate events — mergers, spin-offs, bankruptcies, special dividends,
activist campaigns — create predictable (though not certain) price dislocations. The manager
buys the expected outcome and hedges the deal-break or restructuring scenario.

**Signal types in MCQ.** Panel 4 regime classifier flags earnings surprise windows,
M&A announcement dates, and index rebalance events. Panel 3 tracks gap risk (overnight
binary event exposure) separately from continuous-time VaR.

**Key risk vectors.**
- Deal break or regulatory block: binary loss event
- Timing risk: deal drags, capital tied up, opportunity cost mounts
- Regulatory and antitrust shift
- Illiquidity in distressed situations

**Governance treatment.** Each open event position carries an explicit EnfLoss estimate
in the governance-adjusted EV calculation. Panel 5 action queue requires PM sign-off before
any position exceeds the single-event concentration limit.

---

## 3. Global Macro

**Return driver.** The manager takes directional views on currencies, rates, commodities,
and equity indices driven by macroeconomic analysis — monetary policy divergence, fiscal
dynamics, geopolitical flows. Positions are typically implemented via liquid derivatives
(futures, options, swaps) rather than individual securities.

**Signal types in MCQ.** Macro regime classifier in Panel 4 (risk-on / risk-off /
stagflation / deflation quadrant). Cross-asset factor exposure heatmap in Panel 3.

**Key risk vectors.**
- Convexity of macro moves: positions can gap violently
- High leverage: small moves × large notional = large dollar P&L
- Liquidity in stress: bid-ask widens just when you want to exit
- Correlated scenario risk across seemingly unrelated positions

**Governance treatment.** Leverage ratio and maximum notional per asset class are hard
limits in Panel 5. The hazard budget incorporates macro-volatility regime as an MCQ
implementation input; when macro volatility spikes, position sizing compresses automatically.

---

## 4. Convertible Arbitrage

**Return driver.** A convertible bond contains an embedded equity option. The manager
buys the convertible and shorts the underlying equity to extract the mispricing between the
bond's implied option value and the market price of the same option. Profit comes from
delta-hedging the equity short as the stock moves.

**Signal types in MCQ.** Panel 1 provides implied equity value vs. bond floor analysis.
Panel 3 tracks delta, vega, and credit spread exposure of the convertible book.

**Key risk vectors.**
- Credit widening: convertible bond drops on issuer credit deterioration even if equity is flat
- Vega risk: implied volatility collapse destroys option premium
- Liquidity: convertible bonds are OTC instruments with wide bid-ask in stress
- Short rebate erosion on the equity hedge

**Governance treatment.** Credit exposure limits and convertible gross/net notional
caps are MCQ policy objects. The MCQ Governance Covariate Model applies issuer-level
credit quality as an additional implementation covariate alongside G, Velocity, Volume,
and Shadow.

---

## 5. Fixed Income Arbitrage

**Return driver.** Managers exploit mispricing relationships between related fixed income
instruments — on-the-run vs. off-the-run Treasuries, cash bonds vs. futures, swap spreads,
yield curve shape trades. Returns are thin per unit of notional but the strategy runs at
high leverage to generate meaningful dollar P&L.

**Signal types in MCQ.** Panel 1 (yield-implied growth and discount rate assumptions),
Panel 3 (duration, DV01, and factor sensitivity decomposition per position).

**Key risk vectors.**
- Leverage amplifies every adverse move
- Convergence may take much longer than financing horizon
- Liquidity crisis freezes both sides of the trade simultaneously
- Regulatory capital requirements force balance sheet compression at worst times

**Governance treatment.** DV01 limits and repo concentration limits are hard-coded
Panel 5 policy objects. This strategy class should use a more conservative fractional
Kelly setting than equity strategies because financing and liquidity tails dominate the
risk distribution.

---

## 6. Market Neutral

**Return driver.** The goal is zero net beta to the market index while generating alpha
from stock selection. The manager builds matched long/short books within sectors or factor
buckets so that overall portfolio beta ≈ 0, isolating the stock-specific return signal.

**Signal types in MCQ.** Panel 2 peer z-score (stock vs. sector median), Panel 3 beta
and factor neutralisation display, Panel 4 tracking error vs. flat-beta benchmark.

**Key risk vectors.**
- Hidden factor tilts can create unexpected drawdowns even with zero measured beta
- Transaction costs and borrow costs erode the thin spread between longs and shorts
- The neutrality assumption breaks in correlated sell-offs when dispersion collapses

**Governance treatment.** Factor exposure caps per factor are Panel 5 policy objects.
Beta neutrality is checked intraday and triggers a governance alert if net beta drifts
beyond tolerance.

---

## 7. Managed Futures / CTA

**Return driver.** Systematic trend-following on liquid futures markets across equities,
bonds, currencies, and commodities. Returns are based on momentum persistence — if a
trend is in place, the model adds; if the trend reverses, the model flips or stops out.

**Signal types in MCQ.** Panel 4 regime classifier is primary: bull trend / bear trend /
sideways/chopping. Trend strength score feeds the Kelly sizing module in Panel 3.

**Key risk vectors.**
- Whipsaw: markets reverse sharply and repeatedly; stop-outs compound losses
- Crowded momentum: when many CTAs hold the same trend, reversal is violent
- Low standalone Sharpe but strong diversification in multi-strategy context

**Governance treatment.** Trend strength is an MCQ implementation covariate in the
hazard budget; weak or reversing trend compresses position size automatically. The
strategy is flagged with a diversification annotation so sizing reflects cross-strategy
correlation benefits.

---

## 8. Multi-Strategy

**Return driver.** Capital allocated dynamically across several of the above strategies
within a single fund structure. The PM harvests diversification — strategies that are
negatively correlated in stress should smooth the overall equity curve.

**Signal types in MCQ.** All five panels operate simultaneously. Panel 5 Governance
Queue tracks cross-strategy concentration: total gross leverage, total notional by asset
class, and maximum drawdown per strategy bucket.

**Key risk vectors.**
- Risk aggregation failure: seemingly independent strategies all blow up simultaneously
- Capital allocation model becomes stale if regime assumptions change
- Operational complexity: multiple brokers, data feeds, risk systems

**Governance treatment.** MCQ is designed first for multi-strategy governance. The
cross-strategy risk budget is a top-level policy object; individual strategy Kelly
sizes are subordinated to a portfolio-level survival approximation calculated at the
aggregate level.

---

## Strategy → MCQ Panel Mapping

| Strategy | Primary Panels | Key Governance Object |
|---|---|---|
| Long / Short Equity | 1, 2, 3 | Net/Gross exposure bands |
| Event-Driven | 3, 4, 5 | Single-event concentration limit |
| Global Macro | 3, 4, 5 | Leverage ratio, notional by asset class |
| Convertible Arbitrage | 1, 3 | Credit limits, delta/vega caps |
| Fixed Income Arb | 1, 3, 5 | DV01 limit, repo concentration |
| Market Neutral | 2, 3, 4 | Factor exposure caps, beta neutrality |
| Managed Futures | 4, 3 | Trend strength → Kelly compression |
| Multi-Strategy | All | Total gross leverage, cross-strategy VaR |
