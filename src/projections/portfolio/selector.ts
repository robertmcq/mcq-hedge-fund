/**
 * Portfolio Projection Selectors.
 * Pure slice views over PortfolioProjectionState for Panel 1 routes.
 */

import type { PortfolioProjectionState, ProjectedPosition } from './types';

export function selectSummary(state: PortfolioProjectionState) {
  return {
    portfolio_id:    state.portfolio_id,
    name:            state.name,
    cash:            state.cash,
    equity_value:    state.equity_value,
    gross_exposure:  state.gross_exposure,
    net_exposure:    state.net_exposure,
    position_count:  state.positions.length,
    ytd_pnl:         state.equity_value - state.ytd_start_equity,
    ytd_pnl_pct:     state.ytd_start_equity > 0
                       ? (state.equity_value - state.ytd_start_equity) / state.ytd_start_equity
                       : 0,
    last_event_seq:  state.last_event_seq,
    last_updated:    state.last_updated,
  };
}

export function selectPositions(state: PortfolioProjectionState): ProjectedPosition[] {
  return [...state.positions].sort((a, b) =>
    Math.abs(b.unrealized_pnl) - Math.abs(a.unrealized_pnl)
  );
}

export function selectPosition(
  state: PortfolioProjectionState,
  security_id: string
): ProjectedPosition | undefined {
  return state.positions.find((p) => p.security_id === security_id);
}
