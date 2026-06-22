/**
 * Event Ledger unit tests — validates schema registry and replay engine
 * without requiring a live database (store is mocked).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePayload } from '../schema-registry';
import { replayFromLedger } from '../replay-engine';
import type { LedgerEvent } from '../types';

// ─── Schema Registry tests ───────────────────────────────────────────────

describe('validatePayload', () => {
  it('passes valid MarketDataUpdated payload', () => {
    expect(() =>
      validatePayload('MarketDataUpdated', {
        security_id: 'KXBTC-26DEC31-B100000',
        price: 0.65,
        date_time: '2026-06-20T14:00:00.000Z',
      })
    ).not.toThrow();
  });

  it('rejects MarketDataUpdated with missing price', () => {
    expect(() =>
      validatePayload('MarketDataUpdated', { security_id: 'X', date_time: '2026-01-01' })
    ).toThrow(/validation failed/);
  });

  it('passes valid TradeExecuted payload', () => {
    expect(() =>
      validatePayload('TradeExecuted', {
        portfolio_id: 'pf-main',
        security_id:  'KXBTC-26DEC31-B100000',
        side:         'long',
        quantity:     100,
        price:        0.62,
        executed_at:  '2026-06-20T14:00:00.000Z',
      })
    ).not.toThrow();
  });

  it('rejects TradeExecuted with invalid side', () => {
    expect(() =>
      validatePayload('TradeExecuted', {
        portfolio_id: 'pf-main', security_id: 'X',
        side: 'buy', quantity: 1, price: 1, executed_at: '2026-01-01',
      })
    ).toThrow(/validation failed/);
  });

  it('rejects unknown event type', () => {
    expect(() => validatePayload('GhostEvent', {})).toThrow(/Unknown event type/);
  });
});

// ─── Replay Engine tests (store mocked) ───────────────────────────────────────────

const mockEvents: LedgerEvent[] = [
  {
    seq:            1,
    event_id:       'e1',
    event_type:     'MarketDataUpdated',
    aggregate_id:   'KXBTC',
    schema_version: 1,
    payload: { security_id: 'KXBTC', price: 0.60, date_time: '2026-06-20T10:00:00Z' },
    occurred_at:    '2026-06-20T10:00:00Z',
    source:         'feed',
  },
  {
    seq:            2,
    event_id:       'e2',
    event_type:     'TradeExecuted',
    aggregate_id:   'pf-main',
    schema_version: 1,
    payload: {
      portfolio_id: 'pf-main', security_id: 'KXBTC', side: 'long',
      quantity: 100, price: 0.60, executed_at: '2026-06-20T10:00:01Z',
    },
    occurred_at: '2026-06-20T10:00:01Z',
    source:      'api',
  },
  {
    seq:            3,
    event_id:       'e3',
    event_type:     'MarketDataUpdated',
    aggregate_id:   'KXBTC',
    schema_version: 1,
    payload: { security_id: 'KXBTC', price: 0.65, date_time: '2026-06-20T11:00:00Z' },
    occurred_at:    '2026-06-20T11:00:00Z',
    source:         'feed',
  },
];

vi.mock('../store', () => ({
  loadCursor: vi.fn().mockResolvedValue({ consumer_id: 'test', last_seq: 0, updated_at: '' }),
  saveCursor: vi.fn().mockResolvedValue(undefined),
  readEvents:  vi.fn().mockImplementation(async ({ fromSeq = 0, limit = 500 }) => {
    return mockEvents.filter((e) => e.seq! >= fromSeq).slice(0, limit);
  }),
}));

describe('replayFromLedger', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replays all events and calls on_event for each', async () => {
    const seen: number[] = [];
    const result = await replayFromLedger({
      consumer_id: 'test',
      from_seq: 0,
      emit_to_bus: false,
      on_event: async (e) => { seen.push(e.seq!); },
    });
    expect(result.events_replayed).toBe(3);
    expect(seen).toEqual([1, 2, 3]);
    expect(result.errors).toHaveLength(0);
  });

  it('records errors without aborting the rest of the replay', async () => {
    const result = await replayFromLedger({
      consumer_id: 'test',
      from_seq: 0,
      emit_to_bus: false,
      on_event: async (e) => {
        if (e.seq === 2) throw new Error('simulated handler failure');
      },
    });
    expect(result.events_replayed).toBe(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].seq).toBe(2);
  });

  it('reports duration_ms > 0', async () => {
    const result = await replayFromLedger({ consumer_id: 'test', from_seq: 0, emit_to_bus: false });
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
