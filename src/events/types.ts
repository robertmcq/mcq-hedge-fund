/**
 * Domain event types shared across all handlers and publishers.
 */

export interface DomainEvent<T> {
  event_type: string;
  payload: T;
  occurred_at: string;
}

export interface MarketDataUpdatedPayload {
  security_id: string;
  price: number;
  volume?: number;
  date_time: string;
}

export interface GovernanceScoreUpdatedPayload {
  entity_type: 'issuer' | 'strategy' | 'portfolio';
  entity_id: string;
  as_of: string;
  governance_score: number;
  velocity?: number;
  volume?: number;
  shadow?: number;
}

export interface TradeExecutedPayload {
  portfolio_id: string;
  security_id: string;
  side: 'long' | 'short';
  quantity: number;
  price: number;
  strategy_id?: string;
  executed_at: string;
}

export interface ActionDecisionPayload {
  action_id: string;
  decision: 'approve' | 'modify' | 'reject';
  user_id: string;
  comment?: string;
  modified_payload_json?: Record<string, unknown>;
  resulting_order_id?: string;
}

export interface PortfolioInitializedPayload {
  portfolio_id: string;
  name: string;
  base_currency: string;
  cash: number;
  ytd_start_equity: number;
}

export interface PositionOpenedPayload {
  portfolio_id: string;
  security_id: string;
  side: 'long' | 'short';
  quantity: number;
  price: number;
  executed_at: string;
}

export interface PriceUpdatedPayload {
  security_id: string;
  price: number;
  volume?: number;
  date_time: string;
}
