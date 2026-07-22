# MCQ Hedge Fund — System Status

Last updated: 2026-07-22  
Status: **Active Build — Phase 1**

> Internal operational details (endpoints, run commands, seed scripts) are maintained in the private ops mirror. This file reflects public-facing system architecture and design doctrine only.

---

## Architecture

```
External world
    │
    ├── Kalshi WS feed ──────────────────— tick events
    └── API layer (Express) ───────────— user / agent commands
              │
         LedgerBus
    (validate → persist → dispatch)
              │
    ┌─────────┃─────────┐
    │             │             │
Panel 1       Panel 3       Panel 5
Portfolio     Risk          Governance
Projection    Projection    Action Queue
(replay)      (replay)      (append)
    │             │             │
    └─────────┃─────────┘
              │
         event_ledger (PostgreSQL, append-only)
```

---

## Doctrine (Non-Negotiable)

1. All state is derived from events
2. No DB row represents truth except `event_ledger`
3. All panels are projections, not sources
4. Execution never mutates state directly
5. Every action emits an event first

---

## Build Checklist

- [x] Architecture designed
- [x] Full schema defined (5 panels + event pipeline)
- [x] Governance math engine specified
- [x] LedgerBus event integrity enforced
- [ ] Panel 1: Reverse DCF engine
- [ ] Panel 2: Peer comps grid
- [ ] Panel 3: Portfolio risk console
- [ ] Panel 4: Backtesting + regime classifier
- [ ] Panel 5: Governance queue + action approvals
- [ ] Agent Pay / Mastercard integration layer

---

*MCQ Ventures · Governance-first. Regulator-ready. Built to last.*
