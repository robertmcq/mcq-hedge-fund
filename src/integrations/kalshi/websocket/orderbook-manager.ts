/**
 * Kalshi orderbook manager.
 * Maintains local orderbook state via snapshot + incremental delta application.
 * Pattern documented in Kalshi async API and confirmed by community implementations.
 */

import {
  LocalOrderbook,
  KalshiOrderbookSnapshotMsg,
  KalshiOrderbookDeltaMsg,
  OrderbookLevel,
} from './types';

export class OrderbookManager {
  private books = new Map<string, LocalOrderbook>();

  applySnapshot(msg: KalshiOrderbookSnapshotMsg): LocalOrderbook {
    const yes = new Map<number, number>(msg.yes.map(([p, s]) => [p, s]));
    const no  = new Map<number, number>(msg.no.map(([p, s]) => [p, s]));
    const book: LocalOrderbook = {
      market_ticker: msg.market_ticker,
      yes,
      no,
      last_updated: Date.now(),
    };
    this.books.set(msg.market_ticker, book);
    return book;
  }

  applyDelta(msg: KalshiOrderbookDeltaMsg): LocalOrderbook | null {
    const book = this.books.get(msg.market_ticker);
    if (!book) return null;  // snapshot must arrive first

    const side = book[msg.side];
    const current = side.get(msg.price) ?? 0;
    const next = current + msg.delta;
    if (next <= 0) {
      side.delete(msg.price);
    } else {
      side.set(msg.price, next);
    }
    book.last_updated = Date.now();
    return book;
  }

  get(ticker: string): LocalOrderbook | undefined {
    return this.books.get(ticker);
  }

  toSortedLevels(ticker: string): {
    yes: OrderbookLevel[];
    no:  OrderbookLevel[];
  } | null {
    const book = this.books.get(ticker);
    if (!book) return null;
    // YES bids: highest price first (best bid at top)
    const yes = [...book.yes.entries()]
      .sort(([a], [b]) => b - a)
      .map(([p, s]) => [p, s] as OrderbookLevel);
    // NO bids: highest price first
    const no = [...book.no.entries()]
      .sort(([a], [b]) => b - a)
      .map(([p, s]) => [p, s] as OrderbookLevel);
    return { yes, no };
  }

  allTickers(): string[] {
    return [...this.books.keys()];
  }
}
