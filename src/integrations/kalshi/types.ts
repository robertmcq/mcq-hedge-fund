/**
 * Kalshi API — core response types.
 * Aligned with Kalshi REST API v2 (trading-api.kalshi.com/trade-api/v2).
 */

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle?: string;
  status: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price?: number;
  volume: number;
  volume_24h?: number;
  open_interest?: number;
  result?: string;
  expiration_time?: string;
  close_time?: string;
  can_close_early?: boolean;
}

export interface KalshiOrderbook {
  ticker: string;
  yes: Array<[number, number]>; // [price, size]
  no: Array<[number, number]>;
}

export interface KalshiOrder {
  order_id: string;
  ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  type: 'limit' | 'market';
  status: string;
  price?: number;
  count: number;
  filled_count?: number;
  remaining_count?: number;
  created_time: string;
  expiration_time?: string;
}

export interface KalshiPosition {
  ticker: string;
  position: number;          // positive = yes, negative = no
  market_exposure: number;
  resting_orders_count: number;
  total_cost: number;
  fees_paid: number;
}

export interface KalshiBalance {
  balance: number;
  payout: number;
}

export interface CreateOrderRequest {
  ticker: string;
  action: 'buy' | 'sell';
  type: 'limit' | 'market';
  side: 'yes' | 'no';
  count: number;
  price?: number;            // required for limit orders (cents, 1-99)
  expiration_ts?: number;    // unix timestamp
  client_order_id?: string;
}

export interface CreateOrderResponse {
  order: KalshiOrder;
}

export interface CancelOrderResponse {
  order: KalshiOrder;
}

export interface GetMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

export interface GetPositionsResponse {
  market_positions: KalshiPosition[];
  cursor?: string;
}
