/**
 * Kalshi market data adapter.
 */

import { KalshiClient } from './client';
import { KalshiMarket, KalshiOrderbook, GetMarketsResponse } from './types';

export class KalshiMarketsAdapter {
  constructor(private client: KalshiClient) {}

  async getMarkets(params?: {
    status?: string;
    series_ticker?: string;
    cursor?: string;
    limit?: number;
  }): Promise<GetMarketsResponse> {
    return this.client.get<GetMarketsResponse>('/trade-api/v2/markets', params as Record<string, string | number | boolean>);
  }

  async getMarket(ticker: string): Promise<KalshiMarket> {
    const res = await this.client.get<{ market: KalshiMarket }>(`/trade-api/v2/markets/${ticker}`);
    return res.market;
  }

  async getOrderbook(ticker: string, depth?: number): Promise<KalshiOrderbook> {
    const res = await this.client.get<{ orderbook: KalshiOrderbook }>(
      `/trade-api/v2/markets/${ticker}/orderbook`,
      depth !== undefined ? { depth } : undefined
    );
    return res.orderbook;
  }
}
