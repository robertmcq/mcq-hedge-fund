/**
 * Bridges Kalshi WebSocket events into the MCQ internal event bus.
 * Ticker updates -> MarketDataUpdated domain event.
 * Orderbook updates -> stored for Panel 3 real-time risk refresh.
 */

import { KalshiFeed } from './feed';
import { publish } from '../../../events/publisher';
import type { KalshiTickerMsg, LocalOrderbook } from './types';

export function bridgeFeedToEventBus(feed: KalshiFeed): void {
  // Ticker -> MarketDataUpdated (drives Panel 1 DCF + Panel 3 risk refresh)
  feed.on('ticker', async (msg: KalshiTickerMsg) => {
    const midPrice = msg.last_price ?? Math.round((msg.yes_bid + msg.yes_ask) / 2);
    await publish.marketDataUpdated({
      security_id: msg.market_ticker,
      price: midPrice / 100,  // convert cents to dollars
      volume: msg.volume,
      date_time: new Date(msg.ts).toISOString(),
    });
  });

  // Orderbook snapshot/delta — log for monitoring; Panel 3 can query OrderbookManager directly
  feed.on('orderbook', (book: LocalOrderbook) => {
    console.log(
      `[KalshiFeed] Orderbook updated: ${book.market_ticker} ` +
      `yes_levels=${book.yes.size} no_levels=${book.no.size}`
    );
  });

  feed.on('error', (err: Error) => {
    console.error('[KalshiFeed] Unhandled error:', err.message);
  });
}
