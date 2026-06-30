# References and Bibliography

This document maintains the canonical bibliography for the MCQ documentation set.

It separates foundational theory from MCQ implementation concepts so that readers,
LPs, and regulators can trace precisely what comes from established literature and
what is MCQ proprietary.

---

## Foundational Theory

- Harry Markowitz (1952) — *Portfolio Selection*, Journal of Finance
- John L. Kelly Jr. (1956) — *A New Interpretation of Information Rate*, Bell System Technical Journal
- William F. Sharpe (1964) — *Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk*, Journal of Finance
- Eugene F. Fama (1970) — *Efficient Capital Markets: A Review of Theory and Empirical Work*, Journal of Finance
- David R. Cox (1972) — *Regression Models and Life-Tables*, Journal of the Royal Statistical Society
- Stephen A. Ross (1976) — *The Arbitrage Theory of Capital Asset Pricing*, Journal of Economic Theory

---

## Factor Models and Performance Attribution

- Eugene F. Fama and Kenneth R. French (1993) — *Common Risk Factors in the Returns on Stocks and Bonds*, Journal of Financial Economics
- Mark M. Carhart (1997) — *On Persistence in Mutual Fund Performance*, Journal of Finance

---

## Behavioural Finance and Market Regimes

- Robert J. Shiller (1981) — *Do Stock Prices Move Too Much to Be Justified by Subsequent Changes in Dividends?*, American Economic Review
- Robert J. Shiller (2015) — *Irrational Exuberance*, 3rd Edition, Princeton University Press

---

## MCQ Proprietary Constructs

The following are MCQ implementation concepts. They are not taken from, nor attributed
to, any academic or third-party source.

| Construct | Description |
|---|---|
| Governance Score G | Normalised (0–1) entity-level governance quality metric |
| Enforcement Loss (EnfLoss) | Modelled severity of an enforcement or regulatory event |
| MCQ Governance Covariate Model | Covariate vector X = [Velocity, Volume, Shadow, …] |
| Velocity | Rate of change of the Governance Score over time |
| Volume | Transaction intensity relative to baseline |
| Shadow | Off-balance-sheet or weakly governed channel exposure |
| Five-Panel Architecture | Decision console panels 1–5 with governance queue |
| Portfolio Survival Approximation | MCQ geometric weighted product for S_portfolio(T) |

These constructs should be presented as MCQ proprietary in all external-facing documents,
including LP decks, regulatory filings, and product documentation.
