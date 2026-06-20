/**
 * MCQ Hedge Fund — API entry point.
 * On boot:
 *   1. HTTP server starts and registers all panel routes.
 *   2. Kalshi WebSocket feed connects and bridges to the domain event bus.
 *   3. All domain event handlers are live (imported via app.ts side-effects).
 */

import { app } from './app';
import { createKalshiFeed, bridgeFeedToEventBus } from '../integrations/kalshi/websocket';
import { loadPrivateKeyPem } from '../integrations/kalshi/auth';

const PORT = Number(process.env.PORT ?? 3000);

// ─── HTTP Server ────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[server] MCQ Hedge Fund API listening on port ${PORT}`);
  console.log(`[server] ENV=${process.env.NODE_ENV ?? 'development'}`);
});

server.on('error', (err) => {
  console.error('[server] Fatal listen error:', err);
  process.exit(1);
});

// ─── Kalshi WebSocket Feed ──────────────────────────────────────────────────
function startKalshiFeed(): void {
  const wsUrl  = process.env.KALSHI_WS_URL;
  const keyId  = process.env.KALSHI_API_KEY_ID;

  if (!wsUrl || !keyId) {
    console.warn('[feed] KALSHI_WS_URL or KALSHI_API_KEY_ID not set — feed disabled');
    return;
  }

  let privateKeyPem: string;
  try {
    privateKeyPem = loadPrivateKeyPem();
  } catch (err) {
    console.warn('[feed] Private key not configured — feed disabled:', (err as Error).message);
    return;
  }

  const feed = createKalshiFeed(privateKeyPem);
  bridgeFeedToEventBus(feed);

  feed.on('connected', () => {
    console.log('[feed] Kalshi WebSocket connected');

    // Subscribe to ticker + orderbook for all active markets
    // Tickers list is configurable via KALSHI_TICKERS env var (comma-separated)
    const tickers = process.env.KALSHI_TICKERS
      ? process.env.KALSHI_TICKERS.split(',').map((t) => t.trim())
      : [];

    if (tickers.length) {
      feed.subscribe({ channels: ['ticker', 'orderbook_delta', 'trade'], tickers });
      console.log(`[feed] Subscribed to ${tickers.length} market(s): ${tickers.join(', ')}`);
    } else {
      // Subscribe to fills and user orders even without market tickers
      feed.subscribe({ channels: ['fill', 'user_orders'] });
      console.log('[feed] No KALSHI_TICKERS set — subscribed to fills + user_orders only');
    }
  });

  feed.on('disconnected', (code: number) => {
    console.warn(`[feed] Disconnected (${code}) — reconnecting automatically`);
  });

  feed.connect();
}

startKalshiFeed();

// ─── Graceful shutdown ──────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received — shutting down');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
