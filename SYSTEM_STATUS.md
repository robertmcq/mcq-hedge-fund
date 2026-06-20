# MCQ Hedge Fund — System Status

Last updated: 2026-06-20  
Build: `9f521bae` → final push  
Status: **READY FOR 24-HOUR UNATTENDED RUN**

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

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Uptime + timestamp |
| `GET /api/panel1/portfolio/:id` | Full portfolio projection (replay) |
| `GET /api/panel1/portfolio/:id/summary` | Headline P&L, equity, exposure |
| `GET /api/panel1/portfolio/:id/positions` | Sorted positions list |
| `GET /api/panel1/portfolio/:id/timeline` | Raw event log for portfolio |
| `GET /api/panel1/portfolio/:id/replay?as_of_seq=N` | Point-in-time state |
| `POST /api/panel2/comps/run` | Peer z-score + breach detection |
| `GET /api/panel3/portfolios` | Live portfolio store |
| `GET /api/ledger/events` | Raw ledger reads |
| `POST /api/ledger/replay` | Trigger replay for any consumer |

---

## 24-Hour Run Commands

```bash
# Start
bash scripts/run-24h.sh

# Seed (once, after stack is healthy)
npm run seed

# Monitor
tail -f logs/healthcheck.log

# Point-in-time replay
curl "http://localhost:3000/api/panel1/portfolio/pf-main/replay?as_of_seq=5"

# Full timeline
curl http://localhost:3000/api/panel1/portfolio/pf-main/timeline
```

---

## Doctrine (Non-Negotiable)

1. All state is derived from events
2. No DB row represents truth except `event_ledger`
3. All panels are projections, not sources
4. Execution never mutates state directly
5. Every action emits an event first

---

## Critical Path Risks (All Closed)

| Risk | Mechanism |
|------|-----------|
| Event integrity drift | `schema-registry.ts` — hard throw before any write |
| Panel isolation leakage | `ledger-bus.ts` — only inter-panel path |
| Seed data masking real behavior | Seed now writes real ledger events |
| State not reconstructible | Panel 1 reads via `replayAggregate` only |
| Build surface broken | `package.json` + `tsconfig` + CI pipeline |
| No 24h monitoring | `scripts/run-24h.sh` + `scripts/healthcheck.sh` |
