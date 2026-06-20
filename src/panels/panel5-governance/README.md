# Panel 5 — Governance Queue & Approval Workflow

Answers: **Are we inside our own rules?**

This module manages the central action queue, approval decisions, permission checks, superseding modified actions, and immutable audit logging.

## Components

- `types.ts` — queue, approval, permissions, and workflow types
- `utils.ts` — permission checks and queue sorting
- `action-queue.ts` — create action items
- `workflow.ts` — approve / modify / reject logic and audit logging
- `__tests__/workflow.test.ts` — end-to-end workflow tests
