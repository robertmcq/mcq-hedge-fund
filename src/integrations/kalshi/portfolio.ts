/**
 * Kalshi portfolio adapter — positions and balance.
 */

import { KalshiClient } from './client';
import type { KalshiBalance, GetPositionsResponse } from './types';

export class KalshiPortfolioAdapter {
  constructor(private client: KalshiClient) {}

  async getBalance(): Promise<KalshiBalance> {
    const res = await this.client.get<{ balance: KalshiBalance }>('/trade-api/v2/portfolio/balance');
    return res.balance;
  }

  async getPositions(params?: {
    ticker?: string;
    event_ticker?: string;
    cursor?: string;
    limit?: number;
  }): Promise<GetPositionsResponse> {
    return this.client.get<GetPositionsResponse>(
      '/trade-api/v2/portfolio/positions',
      params as Record<string, string | number | boolean>
    );
  }
}
