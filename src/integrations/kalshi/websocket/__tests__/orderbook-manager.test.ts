import { describe, it, expect } from 'vitest';
import { OrderbookManager } from '../orderbook-manager';

describe('OrderbookManager', () => {
  it('applies a snapshot correctly', () => {
    const mgr = new OrderbookManager();
    const book = mgr.applySnapshot({
      market_ticker: 'KXTEST-001',
      yes: [[60, 100], [55, 200]],
      no:  [[40, 150], [35, 50]],
    });
    expect(book.yes.get(60)).toBe(100);
    expect(book.no.get(40)).toBe(150);
  });

  it('applies a positive delta', () => {
    const mgr = new OrderbookManager();
    mgr.applySnapshot({ market_ticker: 'T', yes: [[50, 100]], no: [] });
    mgr.applyDelta({ market_ticker: 'T', side: 'yes', price: 50, delta: 25 });
    expect(mgr.get('T')?.yes.get(50)).toBe(125);
  });

  it('removes a level when delta exhausts size', () => {
    const mgr = new OrderbookManager();
    mgr.applySnapshot({ market_ticker: 'T', yes: [[50, 100]], no: [] });
    mgr.applyDelta({ market_ticker: 'T', side: 'yes', price: 50, delta: -100 });
    expect(mgr.get('T')?.yes.has(50)).toBe(false);
  });

  it('toSortedLevels returns yes bids highest-first', () => {
    const mgr = new OrderbookManager();
    mgr.applySnapshot({ market_ticker: 'T', yes: [[40, 10], [60, 20], [50, 30]], no: [] });
    const levels = mgr.toSortedLevels('T');
    expect(levels?.yes[0][0]).toBe(60);
    expect(levels?.yes[1][0]).toBe(50);
    expect(levels?.yes[2][0]).toBe(40);
  });

  it('returns null delta if no snapshot yet', () => {
    const mgr = new OrderbookManager();
    const result = mgr.applyDelta({ market_ticker: 'MISSING', side: 'yes', price: 50, delta: 10 });
    expect(result).toBeNull();
  });
});
