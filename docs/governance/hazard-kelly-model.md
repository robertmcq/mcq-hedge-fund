# MCQ Governance Math — Hazard & Kelly Model

This document defines the quantitative governance engine that converts policy and scoring
into capital allocation decisions.

It separates three layers clearly:
- **Established theory**: Cox proportional hazards, Kelly criterion, mean-variance optimisation
- **Industry practice**: fractional Kelly overlays, risk budgeting, drawdown discipline
- **MCQ implementation**: Governance Score G, the MCQ Governance Covariate Model
  (Velocity, Volume, Shadow), Enforcement Loss, and the five-panel architecture

---

## 1. Governance as a Hazard Process

MCQ models regulatory/enforcement risk as a continuous-time hazard process:

```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```

Where:
- `G` = MCQ Governance Score (0.0 – 1.0; higher = better governance)
- `X` = MCQ Governance Covariate Model vector: [Velocity, Volume, Shadow, …]
- `h₀(t)` = baseline hazard rate (calibrated from historical enforcement data)
- `βG`, `β` = coefficients (calibrated per entity class)

**MCQ proprietary note.** Governance Score G, Velocity, Volume, and Shadow are MCQ
implementation constructs. They are not standard academic or industry variables. The
proportional-hazard functional form is established theory (Cox, 1972); the specific
covariate definitions are MCQ IP.

---

## 2. Survival & Enforcement Probability

For a trade or exposure with horizon T (days):

```
H(T) = h · T                    # cumulative hazard (constant-hazard simplification)
S(T) = exp(-H(T))               # survival probability (no enforcement event by T)
P_enf(T) = 1 - S(T)            # enforcement probability
```

---

## 3. Governance-Adjusted Expected Value

Standard EV:
```
EV_baseline = P_win · AvgWin - P_loss · AvgLoss
```

With governance enforcement branch:
```
P_win + P_loss + P_enf(T) = 1  (renormalize P_win, P_loss after adding P_enf)

EV_gov = P_win · AvgWin - P_loss · AvgLoss - P_enf(T) · EnfLoss
```

`EnfLoss` = MCQ-modelled severity of an enforcement event (capital freeze, forced unwind,
regulatory fine, etc.). This construct is MCQ proprietary.

---

## 4. Governance-Adjusted Kelly Sizing

**Established theory.** The Kelly criterion (Kelly, 1956):
```
f_Kelly = W - (1-W)/R
  W = win rate
  R = AvgWin / AvgLoss
```

**MCQ implementation.** Governance discount applied via survival probability:
```
d = S(T)                        # MCQ survival probability as discount factor
W_eff = W₀ · d                  # governance reduces effective win rate
R_eff = R₀                      # or R₀ · d for aggressive haircut

f_Kelly_gov = W_eff - (1-W_eff)/R_eff
```

Operational size:
```
RiskPerTrade = AccountEquity · f_fraction · f_Kelly_gov
  f_fraction = 0.25 (fractional Kelly safety factor)
```

**Implementation note.** Fractional Kelly (25% here) reduces concentration risk relative
to full Kelly sizing, accounting for parameter uncertainty in win-rate and payoff ratio
estimates from finite backtests. The 25% figure is an MCQ implementation choice; it
should be reviewed per strategy and regime.

---

## 5. Sheets / Apps Script Implementation

```javascript
// Inputs per row
const G = 0.78;          // MCQ Governance Score
const V = 0.3;           // MCQ Velocity covariate
const Vol = 0.5;         // MCQ Volume covariate
const S_shadow = 0.2;    // MCQ Shadow covariate
const h0 = 0.05;         // baseline hazard
const betaG = 1.5;
const betaV = 0.4;
const betaVol = 0.3;
const betaS = 0.6;
const T = 10;            // horizon in days

const h = h0 * Math.exp(betaG*(1-G) + betaV*V + betaVol*Vol + betaS*S_shadow);
const S = Math.exp(-h * T);
const P_enf = 1 - S;
const d = S;

const W0 = 0.58;         // baseline win rate from backtest
const AvgWin = 1200;
const AvgLoss = 800;
const R = AvgWin / AvgLoss;

const W_eff = W0 * d;
const f_Kelly_gov = W_eff - (1 - W_eff) / R;
const f_fraction = 0.25;
const equity = 500000;

const riskPerTrade = equity * f_fraction * Math.max(0, f_Kelly_gov);
console.log(`Risk per trade: $${riskPerTrade.toFixed(2)}`);
```

---

## 6. Interpretation

| Governance Score G | Enforcement Prob P_enf | Effective Kelly | Effect |
|---|---|---|---|
| 0.9 (strong) | Very low | Close to baseline | Full position permitted |
| 0.6 (moderate) | Moderate | Reduced | Smaller position |
| 0.3 (weak) | High | Significantly reduced | Minimal or no position |
| 0.1 (failing) | Very high | Near zero or negative | Block — do not trade |

---

## 7. Theoretical References

The MCQ hazard-Kelly framework draws from three separate layers:

**Established theory.** The proportional-hazard form `h(t|X) = h₀(t)·exp(βᵀX)` follows
the Cox (1972) proportional hazards framework. The Kelly criterion (Kelly, 1956) provides
the sizing foundation. Mean-variance portfolio optimisation comes from Markowitz (1952).

**Industry practice.** Fractional Kelly overlays, risk budgeting, and governance escalation
ladders are widely used implementation patterns. Details vary by strategy and shop.

**MCQ implementation.** Governance Score G, the MCQ Governance Covariate Model
(Velocity, Volume, Shadow), Enforcement Loss, and the five-panel architecture are
MCQ proprietary constructs. They should not be interpreted as standard academic or
industry terminology.

A canonical reading list is maintained in `docs/references/bibliography.md`.
