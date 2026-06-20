# MCQ Event Pipeline — Cross-Panel Data Flow

All cross-panel communication is event-driven. Each event updates core tables, recomputes snapshots, and may spawn governance actions.

---

## Event Types

### 1. `MarketDataUpdated`
**Payload:** `{ security_id, date_time, price, volume, factors }`

**Consumers:**
- Panel 1 → recompute `reverse_dcf_snapshot`, `expectations_bridge_row`
- Panel 2 → refresh `valuation_snapshot`, `peer_zscore_snapshot`
- Panel 3 → update `portfolio_equity_snapshot`, `drawdown_snapshot`, `factor_exposure_snapshot`
- Panel 4 → update `live_strategy_snapshot` (intraday attribution)
- Governance → check thresholds → emit `GovernanceAlert` if breached → write `action_item`

---

### 2. `FundamentalsUpdated`
**Payload:** `{ security_id, period_end }`

**Consumers:**
- Panel 1 → recalculate `security_projection`, then `reverse_dcf_snapshot`
- Panel 2 → refresh peer group membership rules, `peer_stats_snapshot`
- Governance → large estimate deltas spawn Research action items

---

### 3. `GovernanceScoreUpdated`
**Payload:** `{ entity_type, entity_id, as_of, governance_score, velocity, volume, shadow }`

**Consumers:**
- Update `governance_score_snapshot` → compute `governance_survival_snapshot`
- Panel 3 → recompute `position_governance_snapshot`, `portfolio_kelly_budget`
- Panel 5 → open `action_item` if enforcement_prob above threshold

---

### 4. `TradeExecuted`
**Payload:** `{ portfolio_id, security_id, side, quantity, price, strategy_id }`

**Consumers:**
- Update `position`, `portfolio_equity_snapshot`
- Panel 3 → refresh exposures, leverage, risk metrics; check `risk_limit`; write `risk_breach_event` if violated
- Panel 4 → tag trade to `strategy_id` for live vs backtest comparison
- Panel 5 → log `decision_log_entry` linked to originating `action_item`

---

### 5. `BacktestCompleted`
**Payload:** `{ backtest_id }`

**Consumers:**
- Panel 4 → write `backtest_trade`, `backtest_kpi_snapshot`, update `regime_performance_snapshot`
- Panel 3 → update `portfolio_kelly_budget` if W₀/R₀ changed materially
- Panel 5 → AI may open actions to raise/lower risk cap for updated strategies

---

### 6. `RegimeStateDetected`
**Payload:** `{ as_of, regime_label, vol_bucket, credit_spread_bucket, macro_features }`

**Consumers:**
- Panel 4 → update `regime_state_snapshot`, recompute `regime_adjustment_recommendation`
- Panel 3 → adjust target factor exposures or risk budget recommendations
- Panel 5 → surface as proposed actions for PM approval

---

### 7. `PolicyChanged`
**Payload:** `{ policy_id, rule_id, new_version }`

**Consumers:**
- Panel 5 → log to `policy_change_log`, expose new rulebook in UI
- Engine → recompute constraint checks for all relevant entities
- Alert → generate retroactive impact diagnostics

---

### 8. `ActionDecision`
**Payload:** `{ action_id, decision, user_id }`

**Consumers:**
- `approve` with trade payload → route to execution → `TradeExecuted` event
- `modify` → create new `action_item` with revised payload, close original
- `reject` → log to `action_approval` + `decision_log_entry`

---

## Pipeline Diagram

```
Market Data ──→ Panel 1 (DCF) ──→ Panel 2 (Comps) ──→ Action Queue
                    ↓                   ↓                   ↑
              Panel 3 (Risk) ──→ Panel 4 (Backtest) ────────┘
                    ↓
              Panel 5 (Gov) ←── GovernanceScoreUpdated
                    ↓
            Approve / Reject
                    ↓
              TradeExecuted → Audit Log
```
