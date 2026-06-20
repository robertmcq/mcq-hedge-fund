/**
 * Kalshi WebSocket API — message and channel types.
 * Spec: wss://external-api-ws.kalshi.com/trade-api/ws/v2  (prod)
 *       wss://external-api-ws.demo.kalshi.co/trade-api/ws/v2 (demo)
 *
 * Auth: same RSA-PSS signed headers as REST, passed as HTTP upgrade headers.
 *
 * Subscribe command:
 *   { id: number, cmd: 'subscribe', params: { channels: string[], market_tickers?: string[] } }
 *
 * All 11 typed channels:
 *   ticker | orderbook_delta | trade | fill | market_positions
 *   user_orders | order_group | market_lifecycle
 *   multivariate | multivariate_lifecycle | communications
 */

export type KalshiWsChannel =
  | 'ticker'
  | 'orderbook_delta'
  | 'trade'
  | 'fill'
  | 'market_positions'
  | 'user_orders'
  | 'order_group'
  | 'market_lifecycle'
  | 'multivariate'
  | 'multivariate_lifecycle'
  | 'communications';

export interface KalshiWsCommand {
  id: number;
  cmd: 'subscribe' | 'unsubscribe';
  params: {
    channels: KalshiWsChannel[];
    market_tickers?: string[];
  };
}

export interface KalshiWsEnvelope {
  id?: number;
  type: string;   // 'subscribed' | 'ticker' | 'orderbook_delta' | 'orderbook_snapshot' | 'trade' | 'fill' | ...
  msg: Record<string, unknown>;
}

// ── Ticker ──────────────────────────────────────────────────────────────────
export interface KalshiTickerMsg {
  market_ticker: string;
  yes_bid:   number;
  yes_ask:   number;
  no_bid:    number;
  no_ask:    number;
  last_price?: number;
  volume:    number;
  ts:        number;  // unix ms
}

// ── Orderbook ───────────────────────────────────────────────────────────────
// Kalshi sends a full snapshot on subscribe, then incremental deltas.
export type OrderbookLevel = [number, number];  // [price_cents, size]

export interface KalshiOrderbookSnapshotMsg {
  market_ticker: string;
  yes: OrderbookLevel[];
  no:  OrderbookLevel[];
}

export interface KalshiOrderbookDeltaMsg {
  market_ticker: string;
  side: 'yes' | 'no';
  price: number;
  delta: number;   // positive = add, negative = remove
}

// ── Trade ────────────────────────────────────────────────────────────────────
export interface KalshiTradeMsg {
  market_ticker: string;
  trade_id:      string;
  side:          'yes' | 'no';
  price:         number;
  count:         number;
  ts:            number;
}

// ── Fill ─────────────────────────────────────────────────────────────────────
export interface KalshiFillMsg {
  market_ticker:  string;
  order_id:       string;
  side:           'yes' | 'no';
  action:         'buy' | 'sell';
  price:          number;
  count:          number;
  is_taker:       boolean;
  ts:             number;
}

// ── Local orderbook (maintained in memory) ───────────────────────────────────
export type OrderbookSide = Map<number, number>; // price -> size

export interface LocalOrderbook {
  market_ticker: string;
  yes: OrderbookSide;
  no:  OrderbookSide;
  last_updated:  number;  // unix ms
}
