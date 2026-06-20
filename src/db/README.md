# Database Layer — MCQ Hedge Fund

## Setup

```bash
# 1. Provision a Postgres 15+ database and set:
export DATABASE_URL=postgresql://user:password@host:5432/mcq_fund

# 2. Run schema migration:
psql $DATABASE_URL -f src/db/schema.sql
```

## Repositories

| File | Table(s) | Purpose |
|------|----------|---------|
| `action-item-repository.ts` | `action_items` | CRUD for Panel 5 action queue |
| `approval-repository.ts` | `action_approvals` | Write and read approval decisions |
| `decision-log-repository.ts` | `decision_log` | Append-only audit trail |
| `panel5-workflow-repository.ts` | all three above | Transactional approve/modify/reject |

## Panel 5 controller swap

In `src/api/controllers/panel5-controller.ts`, replace:
```ts
import { createActionItem } from '../../panels/panel5-governance/action-queue';
import { applyApprovalDecision } from '../../panels/panel5-governance/workflow';
```
with:
```ts
import { pgCreateAction as createActionItem, pgApplyApprovalDecision as applyApprovalDecision } from '../../db';
import { listActionItemsPg as listActions } from '../../db';
```
The function signatures are identical — no other changes needed.

## Security

- `DATABASE_URL` must be set via secret manager or environment injection — never committed.
- All queries use parameterised `$N` placeholders — no string interpolation.
- The `decision_log` table is append-only by convention; add a Postgres trigger to block UPDATEs/DELETEs for full immutability.
