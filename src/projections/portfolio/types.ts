/**
 * Portfolio projection types.
 * This is the READ MODEL for Panel 1 — derived purely from events.
 */

export interface ProjectedPosition {
  security_id: string;
  side: 'long' | 'short';
  quantity: number;
  avg_cost: number;
  last_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  opened_at: string;
}

export interface PortfolioProjectionState {
  portfolio_id: string;
  name: string;
  base_currency: string;
  cash: number;
  positions: ProjectedPosition[];
  equity_value: number;          // cash + sum(position market values)
  gross_exposure: number;
  net_exposure: number;
  ytd_start_equity: number;
  initialized: boolean;
  last_event_seq: number | null;
  last_updated: string | null;
}

export const INITIAL_PORTFOLIO_STATE: PortfolioProjectionState = {
  portfolio_id:    '',
  name:            '',
  base_currency:   'USD',
  cash:            0,
  positions:       [],
  equity_value:    0,
  gross_exposure:  0,
  net_exposure:    0,
  ytd_start_equity: 0,
  initialized:     false,
  last_event_seq:  null,
  last_updated:    null,
};
