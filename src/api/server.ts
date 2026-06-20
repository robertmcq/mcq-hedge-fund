/**
 * MCQ Hedge Fund — API entry point.
 *
 * Boot sequence:
 *   1. Initialise Postgres ledger pool (if DATABASE_URL set)
 *   2. Enable ledger persistence on the ledger-aware bus
 *   3. Start HTTP server
 *   4. Connect Kalshi WebSocket feed
 */

import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { initLedgerPool } from '../events/ledger/store';
import { ledgerBus } from '../events/ledger-bus';
import { createKalshiFeed, bridgeFeedToEventBus } from '../integrations/kalshi/websocket';
import { loadPrivateKeyPem } from '../integrations/kalshi/auth';

const PORT = Number(process.env.PORT ?? 3000);

// ── 1. Ledger pool ──────────────────────────────────────────────────────────
if (process.env.DATABASE_URL) {
  try {
    initLedgerPool(process.env.DATABASE_URL);
    ledgerBus.enable();
    console.log('[server] Ledger persistence ENABLED');
  } catch (err) {
    console.warn('[server] Ledger pool init failed (running without persistence):', (err as Error).message);
  }
} else {
  console.warn('[server] DATABASE_URL not set — running WITHOUT ledger persistence');
}

// ── 2. HTTP server ──────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[server] MCQ Hedge Fund API listening on port ${PORT}`);
  console.log(`[server] ENV=${process.env.NODE_ENV ?? 'development'}`);
  console.log(`[server] Health: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  console.error('[server] Fatal listen error:', err);
  process.exit(1);
});

// ── 3. Kalshi WebSocket feed ──────────────────────────────────────────────────
function startKalshiFeed(): void {
  const wsUrl = process.env.KALSHI_WS_URL;
  const keyId = process.env.KALSHI_API_KEY_ID;
  if (!wsUrl || !keyId) {
    console.warn('[feed] KALSHI_WS_URL or KALSHI_API_KEY_ID not set — feed disabled');
    return;
  }
  let pem: string;
  try { pem = loadPrivateKeyPem(); }
  catch (err) {
    console.warn('[feed] Private key not configured — feed disabled:', (err as Error).message);
    return;
  }

  const feed = createKalshiFeed(pem);
  bridgeFeedToEventBus(feed);

  feed.on('connected', () => {
    console.log('[feed] Kalshi WebSocket connected');
    const tickers = process.env.KALSHI_TICKERS
      ? process.env.KALSHI_TICKERS.split(',').map((t) => t.trim())
      : [];
    if (tickers.length) {
      feed.subscribe({ channels: ['ticker', 'orderbook_delta', 'trade'], tickers });
      console.log(`[feed] Subscribed: ${tickers.join(', ')}`);
    } else {
      feed.subscribe({ channels: ['fill', 'user_orders'] });
      console.log('[feed] No KALSHI_TICKERS — subscribed to fills + user_orders');
    }
  });

  feed.on('disconnected', (code: number) =>
    console.warn(`[feed] Disconnected (${code}) — reconnecting`)
  );

  feed.connect();
}

startKalshiFeed();

// ── 4. Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM — shutting down gracefully');
  server.close(() => { console.log('[server] Closed'); process.exit(0); });
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('uncaughtException', (err) => { console.error('[server] Uncaught:', err); process.exit(1); });
process.on('unhandledRejection', (r) => console.error('[server] Unhandled rejection:', r));
