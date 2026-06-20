# API Layer — MCQ Hedge Fund

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Liveness check |
| POST | /api/panel1/reverse-dcf/run | Run reverse DCF engine |
| POST | /api/governance/score | Score governance + Kelly |
| POST | /api/panel3/portfolio/evaluate | Mark portfolio, drawdown, Kelly budget, risk limits |
| GET | /api/panel5/actions | List action queue |
| POST | /api/panel5/actions | Create action item |
| POST | /api/panel5/actions/:id/decision | Approve / modify / reject action |
| GET | /api/kalshi/markets | List Kalshi markets |
| GET | /api/kalshi/markets/:ticker | Get single market |
| GET | /api/kalshi/markets/:ticker/orderbook | Get orderbook |
| GET | /api/kalshi/portfolio/balance | Get Kalshi balance |
| GET | /api/kalshi/portfolio/positions | Get Kalshi positions |
| POST | /api/kalshi/orders | Place Kalshi order |
| DELETE | /api/kalshi/orders/:orderId | Cancel Kalshi order |

## Starting the server

```bash
cp .env.example .env   # fill in real values — never commit .env
npx ts-node src/api/server.ts
```

## Security model

- Kalshi RSA private key is **never stored in the repo**.
- Set `KALSHI_PRIVATE_KEY_PEM` (secret manager) or `KALSHI_PRIVATE_KEY_PATH` (Docker secret / mounted file).
- All authenticated Kalshi requests are signed via RSA-PSS SHA-256 per the Kalshi API spec.
- Rotate your Kalshi key immediately if it was ever shared outside a secret manager.
