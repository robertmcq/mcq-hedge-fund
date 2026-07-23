import { describe, expect, it } from 'vitest';
import {
  screenDividendRecord,
  DEFAULT_DIVIDEND_CONFIG,
} from './dividend-calendar';
import type { DividendRecord, DividendCalendarConfig } from './dividend-calendar';

// ─── Shared fixtures ────────────────────────────────────────────────────────

const baseConfig: DividendCalendarConfig = {
  ...DEFAULT_DIVIDEND_CONFIG,
  provider: 'polygon',
  api_key: 'test-key',
  yield_floor_pct: 2.5,
  payout_max_earnings_pct: 75,
  payout_max_fcf_pct: 90,
  growth_streak_min_years: 5,
};

function makeRecord(overrides: Partial<DividendRecord> = {}): DividendRecord {
  return {
    ticker: 'KO',
    company_name: 'Coca-Cola',
    ex_dividend_date: '2026-09-12',
    payment_date: '2026-10-01',
    declared_amount: 0.485,
    frequency: 'quarterly',
    trailing_yield_pct: 3.1,
    payout_ratio_earnings: 60,
    payout_ratio_fcf: 70,
    consecutive_growth_years: 62,
    payment_month: 10,
    as_of: new Date().toISOString(),
    ...overrides,
  };
}

// ─── screenDividendRecord tests ──────────────────────────────────────────────

describe('screenDividendRecord', () => {
  it('passes all three screens for a clean qualifying record', () => {
    const result = screenDividendRecord(makeRecord(), baseConfig);

    expect(result.passes_yield_floor).toBe(true);
    expect(result.passes_payout_ceiling).toBe(true);
    expect(result.passes_growth_streak).toBe(true);
    expect(result.passes_all).toBe(true);
    expect(result.fail_reasons).toHaveLength(0);
  });

  it('fails yield_floor when trailing yield is below 2.5%', () => {
    const result = screenDividendRecord(
      makeRecord({ trailing_yield_pct: 1.8 }),
      baseConfig
    );

    expect(result.passes_yield_floor).toBe(false);
    expect(result.passes_all).toBe(false);
    expect(result.fail_reasons[0]).toMatch(/below floor 2.5%/);
  });

  it('passes yield_floor at exactly the floor value (inclusive lower bound)', () => {
    const result = screenDividendRecord(
      makeRecord({ trailing_yield_pct: 2.5 }),
      baseConfig
    );

    expect(result.passes_yield_floor).toBe(true);
  });

  it('fails payout_ceiling when earnings payout exceeds 75%', () => {
    const result = screenDividendRecord(
      makeRecord({ payout_ratio_earnings: 82, payout_ratio_fcf: null }),
      baseConfig
    );

    expect(result.passes_payout_ceiling).toBe(false);
    expect(result.passes_all).toBe(false);
    expect(result.fail_reasons[0]).toMatch(/Payout ratio \(earnings\)/);
    expect(result.fail_reasons[0]).toMatch(/above ceiling 75%/);
  });

  it('fails payout_ceiling via FCF when earnings payout is null', () => {
    const result = screenDividendRecord(
      makeRecord({ payout_ratio_earnings: null, payout_ratio_fcf: 95 }),
      baseConfig
    );

    expect(result.passes_payout_ceiling).toBe(false);
    expect(result.fail_reasons[0]).toMatch(/Payout ratio \(FCF\)/);
    expect(result.fail_reasons[0]).toMatch(/above ceiling 90%/);
  });

  it('passes payout_ceiling when both payout fields are null (no data available)', () => {
    const result = screenDividendRecord(
      makeRecord({ payout_ratio_earnings: null, payout_ratio_fcf: null }),
      baseConfig
    );

    expect(result.passes_payout_ceiling).toBe(true);
  });

  it('fails growth_streak when consecutive years is below minimum', () => {
    const result = screenDividendRecord(
      makeRecord({ consecutive_growth_years: 3 }),
      baseConfig
    );

    expect(result.passes_growth_streak).toBe(false);
    expect(result.passes_all).toBe(false);
    expect(result.fail_reasons[0]).toMatch(/Growth streak 3 years below minimum 5 years/);
  });

  it('passes growth_streak at exactly the minimum (inclusive lower bound)', () => {
    const result = screenDividendRecord(
      makeRecord({ consecutive_growth_years: 5 }),
      baseConfig
    );

    expect(result.passes_growth_streak).toBe(true);
  });

  it('accumulates multiple fail_reasons when multiple screens fail', () => {
    const result = screenDividendRecord(
      makeRecord({
        trailing_yield_pct: 1.0,
        payout_ratio_earnings: 90,
        consecutive_growth_years: 1,
      }),
      baseConfig
    );

    expect(result.passes_all).toBe(false);
    expect(result.fail_reasons).toHaveLength(3);
  });

  it('throws no error and returns ticker field correctly', () => {
    const result = screenDividendRecord(makeRecord({ ticker: 'PG' }), baseConfig);

    expect(result.ticker).toBe('PG');
  });

  it('respects custom config thresholds', () => {
    const strictConfig: DividendCalendarConfig = {
      ...baseConfig,
      yield_floor_pct: 4.0,
      growth_streak_min_years: 10,
    };
    const result = screenDividendRecord(
      makeRecord({ trailing_yield_pct: 3.8, consecutive_growth_years: 8 }),
      strictConfig
    );

    expect(result.passes_yield_floor).toBe(false);
    expect(result.passes_growth_streak).toBe(false);
  });
});
