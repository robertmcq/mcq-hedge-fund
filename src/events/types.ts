/**
 * Event bus — domain event types flowing across all panels.
 */

export type DomainEventType =
  | 'MarketDataUpdated'
  | 'FundamentalsUpdated'
  | 'GovernanceScoreUpdated'
  | 'TradeExecuted'
  | 'BacktestCompleted'
  | 'RegimeStateDetected'
  | 'PolicyChanged'
  | 'ActionDecision';

export interface DomainEvent<T = unknown> {
  id: string;
  type: DomainEventType;
  occurred_at: string;
  payload: T;
}

export interface MarketDataUpdatedPayload {
  security_id: string;
  price: number;
  volume?: number;
  date_time: string;
}

export interface FundamentalsUpdatedPayload {
  security_id: string;
  period_end: string;
  revenue?: number;
  ebit?: number;
  fcf?: number;
  shares_out?: number;
  net_debt?: number;
}

export interface GovernanceScoreUpdatedPayload {
  entity_type: string;
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
