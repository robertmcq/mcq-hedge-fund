/**
 * Panel 3 — Portfolio Live State & Risk
 * Utilities for marking positions, drawdown, aggregation, and risk events.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Position,
  PricePoint,
  PositionMark,
  PortfolioEquitySnapshot,
  DrawdownSnapshot,
  RiskLimit,
  RiskBreachEvent,
  LimitType,
} from './types';

export { uuidv4 };

export function priceMap(prices: PricePoint[]): Map<string, PricePoint> {
  return new Map(prices.map((p) => [p.security_id, p]));
}

export function markPosition(
  position: Position,
  currentPrice: number,
  portfolioEquity: number
): PositionMark {
  const signedQty = position.side === 'long' ? position.quantity : -position.quantity;
  const market_value = signedQty * currentPrice;
  const notional_exposure = Math.abs(signedQty * currentPrice);
  const pnl = signedQty * (currentPrice - position.avg_cost);
  const costBasis = Math.abs(signedQty * position.avg_cost);
  const pnl_pct = costBasis > 0 ? pnl / costBasis : 0;
  const position_pct_of_equity = portfolioEquity > 0 ? notional_exposure / portfolioEquity : 0;

  return {
    portfolio_id: position.portfolio_id,
    security_id: position.security_id,
    date_time: position.date_time,
    quantity: position.quantity,
    side: position.side,
    avg_cost: position.avg_cost,
    current_price: currentPrice,
    market_value,
    notional_exposure,
    pnl,
    pnl_pct,
    position_pct_of_equity,
  };
}

export function aggregateEquitySnapshot(
  portfolio_id: string,
  date_time: string,
  markedPositions: PositionMark[],
  cash: number,
  prior_equity_value = 0,
  ytd_start_equity = 0
): PortfolioEquitySnapshot {
  const gross_exposure = markedPositions.reduce((a, p) => a + p.notional_exposure, 0);
  const net_exposure = markedPositions.reduce((a, p) => a + p.market_value, 0);
  const totalPnl = markedPositions.reduce((a, p) => a + p.pnl, 0);
  const equity_value = cash + net_exposure;
  const leverage = equity_value > 0 ? gross_exposure / equity_value : 0;
  const pnl_intraday = prior_equity_value ? equity_value - prior_equity_value : totalPnl;
  const pnl_ytd = ytd_start_equity ? equity_value - ytd_start_equity : totalPnl;

  return {
    portfolio_id,
    date_time,
    equity_value,
    cash,
    gross_exposure,
    net_exposure,
    leverage,
    pnl_intraday,
    pnl_ytd,
  };
}

export function computeDrawdownSnapshot(
  portfolio_id: string,
  date_time: string,
  currentEquity: number,
  equityHistory: Array<{ date_time: string; equity_value: number }> = [],
  window_days = 252
): DrawdownSnapshot {
  const history = [...equityHistory, { date_time, equity_value: currentEquity }];
  const equity_high_watermark = history.reduce((m, e) => Math.max(m, e.equity_value), 0);
  const current_drawdown_pct =
    equity_high_watermark > 0 ? 1 - currentEquity / equity_high_watermark : 0;

  const rolling = history.slice(-window_days);
  let localPeak = 0;
  let rollingMaxDrawdown = 0;
  for (const point of rolling) {
    localPeak = Math.max(localPeak, point.equity_value);
    const dd = localPeak > 0 ? 1 - point.equity_value / localPeak : 0;
    rollingMaxDrawdown = Math.max(rollingMaxDrawdown, dd);
  }

  return {
    portfolio_id,
    date_time,
    equity_high_watermark,
    current_drawdown_pct,
    rolling_max_drawdown_pct: rollingMaxDrawdown,
    window_days,
  };
}

function classifyBreach(limitType: LimitType, ratioOver: number): RiskBreachEvent['severity'] {
  if (ratioOver >= 1.5) return 'critical';
  if (ratioOver >= 1.15) return 'high';
  return limitType === 'MAX_DRAWDOWN' ? 'high' : 'warn';
}

function autoAction(limitType: LimitType, hardFlag: boolean, severity: RiskBreachEvent['severity']): RiskBreachEvent['auto_action'] {
  if (hardFlag || severity === 'critical') return 'block';
  if (limitType === 'MAX_POSITION_PCT' || limitType === 'MAX_LEVERAGE') return 'resize';
  return 'alert';
}

export function evaluateRiskLimits(params: {
  portfolio_id: string;
  date_time: string;
  limits: RiskLimit[];
  drawdown_pct: number;
  leverage: number;
  marked_positions: PositionMark[];
}): RiskBreachEvent[] {
  const { portfolio_id, date_time, limits, drawdown_pct, leverage, marked_positions } = params;
  const breaches: RiskBreachEvent[] = [];

  for (const limit of limits) {
    if (limit.limit_type === 'MAX_DRAWDOWN' && drawdown_pct > limit.threshold_value) {
      const severity = classifyBreach(limit.limit_type, drawdown_pct / limit.threshold_value);
      breaches.push({
        event_id: uuidv4(),
        portfolio_id,
        date_time,
        limit_id: limit.limit_id,
        limit_type: limit.limit_type,
        observed_value: drawdown_pct,
        threshold_value: limit.threshold_value,
        severity,
        auto_action: autoAction(limit.limit_type, limit.hard_flag, severity),
        details: `Current drawdown ${(drawdown_pct * 100).toFixed(2)}% breached max allowed ${(limit.threshold_value * 100).toFixed(2)}%`,
      });
    }

    if (limit.limit_type === 'MAX_LEVERAGE' && leverage > limit.threshold_value) {
      const severity = classifyBreach(limit.limit_type, leverage / limit.threshold_value);
      breaches.push({
        event_id: uuidv4(),
        portfolio_id,
        date_time,
        limit_id: limit.limit_id,
        limit_type: limit.limit_type,
        observed_value: leverage,
        threshold_value: limit.threshold_value,
        severity,
        auto_action: autoAction(limit.limit_type, limit.hard_flag, severity),
        details: `Current leverage ${leverage.toFixed(2)}x breached max allowed ${limit.threshold_value.toFixed(2)}x`,
      });
    }

    if (limit.limit_type === 'MAX_POSITION_PCT') {
      for (const p of marked_positions) {
        if (p.position_pct_of_equity > limit.threshold_value) {
          const severity = classifyBreach(limit.limit_type, p.position_pct_of_equity / limit.threshold_value);
          breaches.push({
            event_id: uuidv4(),
            portfolio_id,
            date_time,
            limit_id: limit.limit_id,
            limit_type: limit.limit_type,
            observed_value: p.position_pct_of_equity,
            threshold_value: limit.threshold_value,
            severity,
            auto_action: autoAction(limit.limit_type, limit.hard_flag, severity),
            details: `Position ${p.security_id} at ${(p.position_pct_of_equity * 100).toFixed(2)}% of equity breached ${(limit.threshold_value * 100).toFixed(2)}% cap`,
          });
        }
      }
    }
  }

  return breaches;
}
