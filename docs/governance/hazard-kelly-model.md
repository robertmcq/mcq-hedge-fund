# MCQ Governance Math — Hazard & Kelly Model

This document defines the quantitative governance engine that converts policy and scoring into capital allocation decisions.

---

## 1. Governance as a Hazard Process

MCQ models regulatory/enforcement risk as a continuous-time hazard process:

```
h(t | G, X) = h₀(t) · exp(βG·(1-G) + βᵀX)
```

Where:
- `G` = normalized governance score (0.0 – 1.0; higher = better governance)
- `X` = covariate vector: [Velocity, Volume, Shadow, ...]
- `h₀(t)` = baseline hazard rate (calibrated from historical enforcement data)
- `βG`, `β` = coefficients (calibrated per entity class)

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

`EnfLoss` = modeled severity of an enforcement event (capital freeze, forced unwind, regulatory fine, etc.)

---

## 4. Governance-Adjusted Kelly Sizing

Baseline Kelly:
```
f_Kelly = W - (1-W)/R
  W = win rate
  R = AvgWin / AvgLoss
```

Governance discount:
```
d = S(T)                        # survival probability as discount factor
W_eff = W₀ · d                  # governance reduces effective win rate
R_eff = R₀                      # or R₀ · d for aggressive haircut

f_Kelly_gov = W_eff - (1-W_eff)/R_eff
```

Operational size:
```
RiskPerTrade = AccountEquity · f_fraction · f_Kelly_gov
  f_fraction = 0.25 (fractional Kelly safety factor, adjustable)
```

---

## 5. Sheets / Apps Script Implementation

```javascript
// Inputs per row
const G = 0.78;          // governance score
const V = 0.3;           // velocity
const Vol = 0.5;         // volume
const S_shadow = 0.2;    // shadow
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
