# Panel 1 Schema — Market Expectations / Reverse DCF

## Purpose
Answer: **What is the market assuming?**

---

## Core Tables

### `security`
| Field | Type | Notes |
|---|---|---|
| security_id | UUID PK | Canonical ID |
| ticker | TEXT | Exchange ticker |
| name | TEXT | Full legal name |
| asset_class | TEXT | equity / fixed_income / crypto |
| sector | TEXT | GICS sector |
| country | TEXT | ISO 3166 |
| currency | TEXT | ISO 4217 |
| primary_exchange | TEXT | NYSE / NASDAQ / XRPL / etc |

### `fundamentals`
| Field | Type | Notes |
|---|---|---|
| security_id | UUID FK | |
| period_end | DATE | |
| freq | ENUM | Q / Y |
| revenue | NUMERIC | |
| ebit | NUMERIC | |
| ebitda | NUMERIC | |
| fcf | NUMERIC | Free cash flow |
| shares_out | NUMERIC | Diluted |
| net_debt | NUMERIC | |

### `reverse_dcf_config`
| Field | Type | Notes |
|---|---|---|
| security_id | UUID FK | |
| scenario_id | UUID FK | |
| horizon_years | INT | Projection horizon |
| terminal_multiple | NUMERIC | Exit EV/EBITDA or P/FCF |
| tax_rate | NUMERIC | Effective tax rate |
| last_updated | TIMESTAMPTZ | |

### `reverse_dcf_snapshot`
| Field | Type | Notes |
|---|---|---|
| security_id | UUID FK | |
| as_of | TIMESTAMPTZ | Calc timestamp |
| scenario_id | UUID FK | |
| price | NUMERIC | Market price at calc time |
| market_cap | NUMERIC | |
| implied_revenue_cagr | NUMERIC | % |
| implied_fcf_margin_traj | NUMERIC | % terminal margin |
| implied_terminal_growth | NUMERIC | % |
| implied_irr | NUMERIC | % |
| house_hurdle_rate | NUMERIC | % from scenario |
| mispricing_score | NUMERIC | -1 to 1 (implied_irr - hurdle, normalized) |

### `expectations_bridge_row`
| Field | Type | Notes |
|---|---|---|
| bridge_id | UUID PK | |
| security_id | UUID FK | |
| as_of | TIMESTAMPTZ | |
| year_offset | INT | 1, 2, 3... horizon |
| market_implied_fcf | NUMERIC | |
| house_fcf | NUMERIC | |
| delta_fcf | NUMERIC | house - market |

---

## Governance Tables

### `governance_score_snapshot`
| Field | Type | Notes |
|---|---|---|
| entity_type | TEXT | issuer / strategy / agent |
| entity_id | UUID | |
| as_of | TIMESTAMPTZ | |
| governance_score | NUMERIC | 0.0 – 1.0 (G) |
| velocity | NUMERIC | Decision velocity covariate |
| volume | NUMERIC | Transaction volume covariate |
| shadow | NUMERIC | Shadow exposure covariate |

### `governance_survival_snapshot`
| Field | Type | Notes |
|---|---|---|
| entity_type | TEXT | |
| entity_id | UUID | |
| as_of | TIMESTAMPTZ | |
| horizon_days | INT | T in h·T |
| hazard_rate | NUMERIC | h = h₀·exp(βG(1-G)+βᵀX) |
| survival_prob | NUMERIC | S(T) = exp(-h·T) |
| enforcement_prob | NUMERIC | P_enf = 1 - S(T) |

---

## Key Formulas

```
Implied CAGR = (R_T / R_0)^(1/T) - 1
Mispricing score = clip(implied_irr - house_hurdle_rate, -1, 1)
h = h₀ · exp(βG·(1-G) + βv·v + βV·V + βS·S)
S(T) = exp(-h·T)
P_enf(T) = 1 - S(T)
```
