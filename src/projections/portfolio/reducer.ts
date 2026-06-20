/**
 * Portfolio Projection Reducer.
 *
 * Pure function: (state, event) -> newState
 * No DB calls. No side effects. No imports from other panels.
 *
 * Event types handled:
 *   PORTFOLIO_INITIALIZED  — seeds portfolio metadata and cash
 *   POSITION_OPENED        — adds or averages into a position
 *   POSITION_CLOSED        — removes position (full close)
 *   PRICE_UPDATED          — marks positions to market, recalcs equity
 *   TRADE_EXECUTED_LEGACY  — bridges TradeExecuted events from old publisher
 *
 * Discipline: if event_type is unrecognised, state is returned unchanged.
 */

import type { LedgerEvent } from '../../events/ledger/types';
import type { PortfolioProjectionState, ProjectedPosition } from './types';

function recalcEquity(state: PortfolioProjectionState): PortfolioProjectionState {
  const posValue = state.positions.reduce(
    (sum, p) => sum + p.last_price * p.quantity, 0
  );
  const grossExposure = state.positions.reduce(
    (sum, p) => sum + Math.abs(p.last_price * p.quantity), 0
  );
  const netExposure = state.positions.reduce(
    (sum, p) => sum + (p.side === 'long' ? 1 : -1) * p.last_price * p.quantity, 0
  );
  return {
    ...state,
    equity_value:   state.cash + posValue,
    gross_exposure: grossExposure,
    net_exposure:   netExposure,
  };
}

export function portfolioReducer(
  state: PortfolioProjectionState,
  event: LedgerEvent
): PortfolioProjectionState {
  const base = { ...state, last_event_seq: event.seq ?? state.last_event_seq, last_updated: event.occurred_at };

  switch (event.event_type) {

    case 'PORTFOLIO_INITIALIZED': {
      const p = event.payload as {
        portfolio_id: string; name: string; base_currency?: string;
        cash: number; ytd_start_equity?: number;
      };
      return recalcEquity({
        ...base,
        portfolio_id:    p.portfolio_id,
        name:            p.name,
        base_currency:   p.base_currency ?? 'USD',
        cash:            p.cash,
        ytd_start_equity: p.ytd_start_equity ?? p.cash,
        initialized:     true,
      });
    }

    case 'POSITION_OPENED':
    case 'TradeExecuted': {
      // Accept both the canonical POSITION_OPENED and legacy TradeExecuted
      const p = event.payload as {
        security_id: string; side: 'long' | 'short';
        quantity: number; price: number; executed_at?: string;
      };
      const existing = base.positions.find(
        (pos) => pos.security_id === p.security_id && pos.side === p.side
      );
      let positions: ProjectedPosition[];
      if (existing) {
        const totalQty = existing.quantity + p.quantity;
        const newAvg   = (existing.avg_cost * existing.quantity + p.price * p.quantity) / totalQty;
        positions = base.positions.map((pos) =>
          pos.security_id === p.security_id && pos.side === p.side
            ? { ...pos, quantity: totalQty, avg_cost: newAvg,
                unrealized_pnl: (pos.last_price - newAvg) * totalQty,
                unrealized_pnl_pct: pos.last_price > 0 ? (pos.last_price - newAvg) / newAvg : 0 }
            : pos
        );
      } else {
        positions = [
          ...base.positions,
          {
            security_id:        p.security_id,
            side:               p.side,
            quantity:           p.quantity,
            avg_cost:           p.price,
            last_price:         p.price,
            unrealized_pnl:     0,
            unrealized_pnl_pct: 0,
            opened_at:          p.executed_at ?? event.occurred_at,
          },
        ];
      }
      return recalcEquity({ ...base, positions });
    }

    case 'POSITION_CLOSED': {
      const p = event.payload as { security_id: string; side: 'long' | 'short' };
      const positions = base.positions.filter(
        (pos) => !(pos.security_id === p.security_id && pos.side === p.side)
      );
      return recalcEquity({ ...base, positions });
    }

    case 'PRICE_UPDATED':
    case 'MarketDataUpdated': {
      const p = event.payload as { security_id: string; price: number };
      const positions = base.positions.map((pos) =>
        pos.security_id === p.security_id
          ? {
              ...pos,
              last_price:         p.price,
              unrealized_pnl:     (p.price - pos.avg_cost) * pos.quantity,
              unrealized_pnl_pct: pos.avg_cost > 0 ? (p.price - pos.avg_cost) / pos.avg_cost : 0,
            }
          : pos
      );
      return recalcEquity({ ...base, positions });
    }

    default:
      return base;
  }
}
