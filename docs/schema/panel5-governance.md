# Panel 5 Schema — Governance, Notes & Action Queue

## Purpose
Answer: **Are we inside our own rules?**

---

## Policy Tables

### `policy_document`
| Field | Type | Notes |
|---|---|---|
| policy_id | UUID PK | |
| name | TEXT | |
| version | TEXT | Semantic version e.g. 1.0a |
| status | ENUM | draft / active / retired |
| effective_from | DATE | |
| effective_to | DATE | Nullable |
| owner_user_id | UUID FK | |
| policy_blob_url | TEXT | Stored doc reference |

### `policy_rule`
| Field | Type | Notes |
|---|---|---|
| rule_id | UUID PK | |
| policy_id | UUID FK | |
| rule_code | TEXT | e.g. MAX_POSITION_CONC_05PCT |
| description | TEXT | Plain English |
| rule_type | ENUM | limit / prohibition / workflow |
| params_json | JSONB | Machine-readable parameters |
| severity | ENUM | info / warn / high / critical |

### `rule_version`
| Field | Type | Notes |
|---|---|---|
| rule_version_id | UUID PK | |
| rule_id | UUID FK | |
| version | TEXT | |
| change_summary | TEXT | |
| changed_by | UUID FK | user_id |
| changed_at | TIMESTAMPTZ | |

---

## Action Queue Tables

### `action_item`
| Field | Type | Notes |
|---|---|---|
| action_id | UUID PK | |
| created_at | TIMESTAMPTZ | |
| source_panel | TEXT | Expectations / Comps / Risk / Backtest / Gov |
| entity_type | TEXT | security / portfolio / strategy / agent |
| entity_id | UUID | |
| action_type | ENUM | Trade / Research / Governance |
| priority | INT | 1 (highest) – 5 (lowest) |
| confidence | NUMERIC | 0.0 – 1.0 |
| rationale_text | TEXT | Max 200 words |
| proposed_payload_json | JSONB | Structured action data |
| status | ENUM | open / approved / rejected / deferred |
| created_by_agent_flag | BOOLEAN | true if AI-generated |

### `action_approval`
| Field | Type | Notes |
|---|---|---|
| approval_id | UUID PK | |
| action_id | UUID FK | |
| user_id | UUID FK | |
| decision | ENUM | approve / modify / reject |
| decision_at | TIMESTAMPTZ | |
| comment | TEXT | |
| resulting_order_id | UUID | Nullable — links to execution |

### `decision_log_entry`
| Field | Type | Notes |
|---|---|---|
| decision_id | UUID PK | |
| entity_type | TEXT | |
| entity_id | UUID | |
| timestamp | TIMESTAMPTZ | |
| user_id | UUID | Or 'agent' |
| decision_type | TEXT | |
| context_panel | TEXT | |
| details_json | JSONB | Full context snapshot |

---

## Permissions Model

### `user`
| Field | Type |
|---|---|
| user_id | UUID PK |
| name | TEXT |
| email | TEXT |
| role_id | UUID FK |
| status | ENUM active/inactive |

### `role`
| role_id | name | description |
|---|---|---|
| (uuid) | PM | Portfolio Manager — full approval rights |
| (uuid) | Risk | Risk Officer — can veto, cannot approve trades |
| (uuid) | Analyst | Read + research actions only |
| (uuid) | Ops | Execution and settlement access |
| (uuid) | ReadOnly | View only |

### `role_permission` (key values)
| permission_key | Roles |
|---|---|
| TRADE_APPROVE | PM |
| TRADE_VIEW | PM, Risk, Analyst, Ops |
| POLICY_EDIT | PM |
| POLICY_VIEW | PM, Risk, Analyst |
| RISK_LIMIT_OVERRIDE | — (no role; hard limits are immutable) |
| AUDIT_VIEW | PM, Risk |
