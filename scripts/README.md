# Scripts

Utility scripts for setup, seeding, and operations.

## Planned Scripts

| Script | Purpose |
|---|---|
| `setup.sh` | Initialize DB, run migrations, seed reference data |
| `seed-securities.ts` | Load initial security master |
| `seed-peer-groups.ts` | Define initial peer group rules |
| `seed-policy-rules.ts` | Load default governance rulebook (v1.0) |
| `backfill-dcf.ts` | Run reverse DCF for all securities in universe |
| `regime-classify.ts` | Run regime classifier against current macro data |
| `kelly-recalc.ts` | Recompute Kelly budgets for all portfolios |
