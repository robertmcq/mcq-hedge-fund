# Panel 3 — Portfolio Live State & Risk

Answers: **Can we survive this path?**

This module marks positions to market, computes portfolio equity and drawdown, aggregates governance-adjusted Kelly budgets, and evaluates breaches against hard and soft risk limits.

## Components

- `types.ts` — interfaces for portfolio, positions, marks, drawdown, Kelly budget, and risk breaches
- `utils.ts` — marking logic, exposure aggregation, drawdown math, and risk limit evaluation
- `kelly-budget.ts` — position governance snapshots and portfolio-level Kelly budget aggregation
- `engine.ts` — end-to-end orchestration for Panel 3
- `__tests__/engine.test.ts` — portfolio risk and Kelly integration tests
