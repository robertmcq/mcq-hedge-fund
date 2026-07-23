/**
 * dividend-calendar.ts — fetch-layer integration tests
 *
 * Uses vi.stubGlobal('fetch', vi.fn()) to intercept Node 24's built-in fetch
 * without any external HTTP library. Each test configures the mock response
 * then restores the original after the suite.
 *
 * Covers:
 *  - fetchDividendData(): Polygon normalisation, IEX normalisation, provider
 *    selection, HTTP 4xx → null, fetch throws → null, missing API key → throws
 *  - buildScreenedUniverse(): passing/failing split, null-record handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDividendData,
  buildScreenedUniverse,
  DEFAULT_DIVIDEND_CONFIG,
} from './dividend-calendar';
import type { DividendCalendarConfig } from './dividend-calendar';

// ─── helpers ────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  );
}

const testConfig: DividendCalendarConfig = {
  ...DEFAULT_DIVIDEND_CONFIG,
  provider: 'polygon',
  api_key: 'test-key',
};

// Minimal valid Polygon response
const polygonResponse = {
  results: [
    {
      ticker: 'KO',
      company_name: 'Coca-Cola Co.',
      ex_dividend_date: '2026-09-12',
      pay_date: '2026-10-01',
      cash_amount: 0.485,
      frequency: 'quarterly',
      trailing_yield: 3.1,
      payout_ratio: 0.60,          // Polygon sends decimal; normaliser ×100
      consecutive_growth_years: 62,
    },
  ],
};

// Minimal valid IEX response (array)
const iexResponse = [
  {
    exDate: '2026-09-12',
    paymentDate: '2026-10-01',
    amount: 0.485,
    frequency: 'quarterly',
  },
];

// ─── fetchDividendData ───────────────────────────────────────────────────────

describe('fetchDividendData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('throws when api_key is empty', async () => {
    await expect(
      fetchDividendData('KO', { ...testConfig, api_key: '' })
    ).rejects.toThrow('DIVIDEND_API_KEY is not configured');
  });

  it('normalises a Polygon response into a DividendRecord', async () => {
    mockFetch(polygonResponse);

    const record = await fetchDividendData('KO', testConfig);

    expect(record).not.toBeNull();
    expect(record!.ticker).toBe('KO');
    expect(record!.company_name).toBe('Coca-Cola Co.');
    expect(record!.declared_amount).toBe(0.485);
    expect(record!.frequency).toBe('quarterly');
    expect(record!.trailing_yield_pct).toBe(3.1);
    expect(record!.payout_ratio_earnings).toBeCloseTo(60, 5);
    expect(record!.consecutive_growth_years).toBe(62);
    expect(record!.payment_month).toBe(10);    // October
    expect(record!.ex_dividend_date).toBe('2026-09-12');
    expect(record!.payment_date).toBe('2026-10-01');
  });

  it('constructs the correct Polygon URL with ticker and api_key', async () => {
    mockFetch(polygonResponse);
    const fetchSpy = vi.mocked(globalThis.fetch);

    await fetchDividendData('KO', testConfig);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('api.polygon.io');
    expect(calledUrl).toContain('KO');
    expect(calledUrl).toContain('test-key');
  });

  it('constructs the correct IEX URL when provider is iex', async () => {
    mockFetch(iexResponse);
    const fetchSpy = vi.mocked(globalThis.fetch);

    await fetchDividendData('KO', { ...testConfig, provider: 'iex' });

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('cloud.iexapis.com');
    expect(calledUrl).toContain('KO');
  });

  it('normalises an IEX response into a DividendRecord', async () => {
    mockFetch(iexResponse);

    const record = await fetchDividendData('KO', { ...testConfig, provider: 'iex' });

    expect(record).not.toBeNull();
    expect(record!.ticker).toBe('KO');
    expect(record!.declared_amount).toBe(0.485);
    expect(record!.payment_month).toBe(10);
    // IEX does not return trailing yield — source sets 0
    expect(record!.trailing_yield_pct).toBe(0);
  });

  it('returns null when Polygon results array is empty', async () => {
    mockFetch({ results: [] });

    const record = await fetchDividendData('KO', testConfig);
    expect(record).toBeNull();
  });

  it('returns null when IEX returns an empty array', async () => {
    mockFetch([]);

    const record = await fetchDividendData('KO', { ...testConfig, provider: 'iex' });
    expect(record).toBeNull();
  });

  it('returns null when API responds with HTTP 4xx', async () => {
    mockFetch({ error: 'Not Found' }, 404);

    const record = await fetchDividendData('KO', testConfig);
    expect(record).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure'))
    );

    const record = await fetchDividendData('KO', testConfig);
    expect(record).toBeNull();
  });

  it('normalises frequency strings correctly', async () => {
    const cases: Array<[string, string]> = [
      ['monthly', 'monthly'],
      ['quarterly', 'quarterly'],
      ['semi-annual', 'semi-annual'],
      ['bi-annual', 'semi-annual'],
      ['annual', 'annual'],
      ['special', 'special'],
      ['extra', 'special'],
      ['unknown', 'quarterly'],   // fallback
    ];

    for (const [raw, expected] of cases) {
      mockFetch({ results: [{ ...polygonResponse.results[0], frequency: raw }] });
      const record = await fetchDividendData('KO', testConfig);
      expect(record!.frequency).toBe(expected);
      vi.unstubAllGlobals();
    }
  });
});

// ─── buildScreenedUniverse ───────────────────────────────────────────────────

describe('buildScreenedUniverse', () => {
  const screenConfig: DividendCalendarConfig = {
    ...testConfig,
    yield_floor_pct: 2.5,
    payout_max_earnings_pct: 75,
    payout_max_fcf_pct: 90,
    growth_streak_min_years: 5,
  };

  afterEach(() => vi.unstubAllGlobals());

  it('places passing records in passing[] and failing screens in failing[]', async () => {
    // KO passes all screens; LOW_YIELD will fail yield_floor
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{
              ...polygonResponse.results[0],
              trailing_yield: 3.1,
              payout_ratio: 0.60,
              consecutive_growth_years: 62,
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{
              ...polygonResponse.results[0],
              ticker: 'LOW_YIELD',
              trailing_yield: 1.0,
              payout_ratio: 0.50,
              consecutive_growth_years: 10,
            }],
          }),
        })
    );

    const result = await buildScreenedUniverse(['KO', 'LOW_YIELD'], screenConfig);

    expect(result.passing).toHaveLength(1);
    expect(result.passing[0]!.ticker).toBe('KO');
    expect(result.failing).toHaveLength(1);
    expect(result.failing[0]!.ticker).toBe('LOW_YIELD');
    expect(result.failing[0]!.passes_all).toBe(false);
  });

  it('puts a ticker in failing[] with a no-data reason when fetch returns null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    );

    const result = await buildScreenedUniverse(['NODIV'], screenConfig);

    expect(result.passing).toHaveLength(0);
    expect(result.failing).toHaveLength(1);
    expect(result.failing[0]!.fail_reasons[0]).toMatch(/No dividend data/);
  });

  it('returns empty passing and failing arrays for an empty ticker list', async () => {
    const result = await buildScreenedUniverse([], screenConfig);

    expect(result.passing).toHaveLength(0);
    expect(result.failing).toHaveLength(0);
  });
});
