# Panel 3 Schema — Portfolio Live State & Risk

## Purpose
Answer: **Can we survive this path?**

---

## Core Tables

### `portfolio`
| Field | Type | Notes |
|---|---|---|
| portfolio_id | UUID PK | |
| name | TEXT | |
| benchmark_id | UUID FK | |
| base_currency | TEXT | ISO 4217 |

### `position`
| Field | Type | Notes |
|---|---|---|
| portfolio_id | UUID FK | |
| security_id | UUID FK | |
| date_time | TIMESTAMPTZ | |
| quantity | NUMERIC | |
| avg_cost | NUMERIC | |
| side | ENUM | long / short |

### `portfolio_equity_snapshot`
| Field | Type | Notes |
|---|---|---|
| portfolio_id | UUID FK | |
| date_time | TIMESTAMPTZ | |
| equity_value | NUMERIC | |
| cash | NUMERIC | |
| gross_exposure | NUMERIC | |
| net_exposure | NUMERIC | |
| leverage | NUMERIC | |
| pnl_intraday | NUMERIC | |
| pnl_ytd | NUMERIC | |

### `drawdown_snapshot`
| Field | Type | Notes |
|---|---|---|
| portfolio_id | UUID FK | |
| date_time | TIMESTAMPTZ | |
| equity_high_watermark | NUMERIC | |
| current_drawdown_pct | NUMERIC | |
| rolling_max_drawdown_pct | NUMERIC | |
| window_days | INT | Rolling window |

### `risk_limit`
| Field | Type | Notes |
|---|---|---|
| limit_id | UUID PK | |
| portfolio_id | UUID FK | |
| limit_type | TEXT | MAX_DRAWDOWN / MAX_POSITION_PCT / MAX_LEVERAGE / MAX_FACTOR |
| threshold_value | NUMERIC | |
| hard_flag | BOOLEAN | true = cannot be overridden by agent |

### `position_governance_snapshot`
| Field | Type | Notes |
|---|---|---|
| portfolio_id | UUID FK | |
| security_id | UUID FK | |
| date_time | TIMESTAMPTZ | |
| governance_score | NUMERIC | G (0–1) |
| survival_prob | NUMERIC | S(T) |
| enforcement_prob | NUMERIC | P_enf(T) |
| kelly_fraction_eff | NUMERIC | f_Kelly_gov |
| risk_per_trade | NUMERIC | $ at risk |

### `portfolio_kelly_budget`
| Field | Type | Notes |
|---|---|---|
| portfolio_id | UUID FK | |
| date_time | TIMESTAMPTZ | |
| total_equity | NUMERIC | |
| kelly_fraction_gov | NUMERIC | Aggregate governance-adjusted Kelly |
| fractional_kelly_factor | NUMERIC | Safety factor (e.g. 0.25) |
| max_risk_per_trade | NUMERIC | |
| max_total_risk | NUMERIC | |

---

## Key Formulas

```
P&L = (price - avg_cost) × quantity
Drawdown = 1 - equity / equity_high_watermark
d = S(T)                        # governance discount
W_eff = W₀ × d                  # effective win rate
f_Kelly_gov = W_eff - (1-W_eff)/R
RiskPerTrade = equity × f_fraction × f_Kelly_gov
```
