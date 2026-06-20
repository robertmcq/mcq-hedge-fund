/**
 * Kalshi order management adapter.
 */

import { KalshiClient } from './client';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  CancelOrderResponse,
  KalshiOrder,
} from './types';

export class KalshiOrdersAdapter {
  constructor(private client: KalshiClient) {}

  async createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.client.post<CreateOrderResponse>('/trade-api/v2/portfolio/orders', order);
  }

  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    return this.client.delete<CancelOrderResponse>(`/trade-api/v2/portfolio/orders/${orderId}`);
  }

  async getOrder(orderId: string): Promise<KalshiOrder> {
    const res = await this.client.get<{ order: KalshiOrder }>(
      `/trade-api/v2/portfolio/orders/${orderId}`
    );
    return res.order;
  }

  async getOrders(params?: {
    ticker?: string;
    event_ticker?: string;
    status?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ orders: KalshiOrder[]; cursor?: string }> {
    return this.client.get('/trade-api/v2/portfolio/orders', params as Record<string, string | number | boolean>);
  }
}
