/**
 * In-memory portfolio store.
 * Acts as the live working set for Panel 3 auto-refresh.
 * In production, swap reads/writes for Postgres repository calls.
 *
 * Singleton — shared across all event handlers.
 */

import type { Position, PricePoint, Portfolio } from '../panels/panel3-risk/types';

export interface PortfolioStoreEntry {
  portfolio: Portfolio;
  positions: Position[];
  cash: number;
  prior_equity_value: number;
  ytd_start_equity: number;
  equity_history: Array<{ date_time: string; equity_value: number }>;
}

const store = new Map<string, PortfolioStoreEntry>();
const priceCache = new Map<string, PricePoint>();

export const portfolioStore = {
  // ── Portfolio CRUD ──────────────────────────────────────────────────────
  upsertPortfolio(entry: PortfolioStoreEntry): void {
    store.set(entry.portfolio.portfolio_id, entry);
  },

  getPortfolio(id: string): PortfolioStoreEntry | undefined {
    return store.get(id);
  },

  allPortfolios(): PortfolioStoreEntry[] {
    return [...store.values()];
  },

  // ── Position management ─────────────────────────────────────────────────
  upsertPosition(portfolio_id: string, position: Position): void {
    const entry = store.get(portfolio_id);
    if (!entry) return;
    const idx = entry.positions.findIndex(
      (p) => p.security_id === position.security_id
    );
    if (idx >= 0) {
      entry.positions[idx] = position;
    } else {
      entry.positions.push(position);
    }
  },

  removePosition(portfolio_id: string, security_id: string): void {
    const entry = store.get(portfolio_id);
    if (!entry) return;
    entry.positions = entry.positions.filter((p) => p.security_id !== security_id);
  },

  // ── Price cache ─────────────────────────────────────────────────────────
  updatePrice(point: PricePoint): void {
    priceCache.set(point.security_id, point);
  },

  getPricesForPortfolio(portfolio_id: string): PricePoint[] {
    const entry = store.get(portfolio_id);
    if (!entry) return [];
    return entry.positions
      .map((p) => priceCache.get(p.security_id))
      .filter((p): p is PricePoint => p !== undefined);
  },

  allPrices(): PricePoint[] {
    return [...priceCache.values()];
  },

  // ── Equity history append (for rolling drawdown) ─────────────────────────
  appendEquityHistory(portfolio_id: string, date_time: string, equity_value: number): void {
    const entry = store.get(portfolio_id);
    if (!entry) return;
    entry.equity_history.push({ date_time, equity_value });
    // Keep last 504 points (2 years of daily data)
    if (entry.equity_history.length > 504) {
      entry.equity_history = entry.equity_history.slice(-504);
    }
    entry.prior_equity_value = equity_value;
  },
};
