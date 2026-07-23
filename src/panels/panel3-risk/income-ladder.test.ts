import { describe, expect, it } from 'vitest';
import { buildIncomeLadder, summariseLadder } from './income-ladder';
import type { DividendRecord } from '../../integrations/dividend-calendar';

// ─── Shared fixtures ────────────────────────────────────────────────────────

function makeRecord(
  ticker: string,
  paymentMonth: number,
  yieldPct = 3.0,
  overrides: Partial<DividendRecord> = {}
): DividendRecord {
  return {
    ticker,
    company_name: ticker,
    ex_dividend_date: '2026-09-12',
    payment_date: `2026-${String(paymentMonth).padStart(2, '0')}-01`,
    declared_amount: 0.50,
    frequency: 'quarterly',
    trailing_yield_pct: yieldPct,
    payout_ratio_earnings: 55,
    payout_ratio_fcf: 65,
    consecutive_growth_years: 10,
    payment_month: paymentMonth,
    as_of: new Date().toISOString(),
    ...overrides,
  };
}

// ─── buildIncomeLadder tests ─────────────────────────────────────────────────

describe('buildIncomeLadder', () => {
  it('produces exactly 12 slots regardless of input size', () => {
    const ladder = buildIncomeLadder([makeRecord('KO', 3)]);

    expect(ladder.slots).toHaveLength(12);
  });

  it('detects GAP months with no payers and emits high-severity Panel 5 alert', () => {
    // Only month 3 has a payer — months 1-2, 4-12 should be GAP
    const ladder = buildIncomeLadder([makeRecord('KO', 3)]);

    expect(ladder.months_with_gap).toContain(1);
    expect(ladder.months_with_gap).toContain(12);
    expect(ladder.months_with_gap).not.toContain(3);

    const gapAlerts = ladder.panel5_alerts.filter((a) => a.alert_type === 'GAP');
    expect(gapAlerts.length).toBe(11);
    gapAlerts.forEach((a) => {
      expect(a.severity).toBe('high');
      expect(a.recommended_action).toBeTruthy();
    });
  });

  it('marks a month as GAP and sets slot status to GAP', () => {
    const ladder = buildIncomeLadder([makeRecord('PG', 6)]);
    const januarySlot = ladder.slots.find((s) => s.month === 1)!;

    expect(januarySlot.status).toBe('GAP');
    expect(januarySlot.payers).toHaveLength(0);
    expect(januarySlot.status_reason).toMatch(/No dividend payers/);
  });

  it('detects CONCENTRATION months with a single payer and emits warn-severity alert', () => {
    const ladder = buildIncomeLadder([makeRecord('JNJ', 4)]);

    expect(ladder.months_with_concentration).toContain(4);

    const concAlerts = ladder.panel5_alerts.filter(
      (a) => a.alert_type === 'CONCENTRATION'
    );
    expect(concAlerts).toHaveLength(1);
    expect(concAlerts[0]!.severity).toBe('warn');
    expect(concAlerts[0]!.ticker).toBe('JNJ');
    expect(concAlerts[0]!.month).toBe(4);
    expect(concAlerts[0]!.message).toContain('JNJ');
  });

  it('marks slot as OK when two or more payers exist in the same month', () => {
    const ladder = buildIncomeLadder([
      makeRecord('KO', 3),
      makeRecord('PEP', 3),
    ]);
    const marchSlot = ladder.slots.find((s) => s.month === 3)!;

    expect(marchSlot.status).toBe('OK');
    expect(marchSlot.status_reason).toBeNull();
    expect(marchSlot.payers).toHaveLength(2);
    expect(ladder.months_with_concentration).not.toContain(3);
    expect(ladder.months_with_gap).not.toContain(3);
  });

  it('computes weighted average yield across all records', () => {
    const ladder = buildIncomeLadder([
      makeRecord('KO',  3,  3.0),
      makeRecord('PG',  6,  2.5),
      makeRecord('JNJ', 9,  3.5),
    ]);

    expect(ladder.annual_yield_pct_weighted).toBeCloseTo(3.0, 6);
  });

  it('returns zero weighted yield when record array is empty', () => {
    const ladder = buildIncomeLadder([]);

    expect(ladder.annual_yield_pct_weighted).toBe(0);
    expect(ladder.total_annual_positions).toBe(0);
    expect(ladder.months_covered).toBe(0);
  });

  it('computes months_covered correctly', () => {
    const ladder = buildIncomeLadder([
      makeRecord('KO',  1),
      makeRecord('PG',  4),
      makeRecord('JNJ', 7),
      makeRecord('MCD', 10),
    ]);

    expect(ladder.months_covered).toBe(4);
  });

  it('computes total_expected_income per slot using shares map', () => {
    const ladder = buildIncomeLadder(
      [makeRecord('KO', 3, 3.0, { declared_amount: 0.485 })],
      { KO: 100 }
    );
    const marchSlot = ladder.slots.find((s) => s.month === 3)!;

    expect(marchSlot.total_expected_income).toBeCloseTo(48.5, 6);
  });

  it('defaults total_expected_income to 0 when no shares map is provided', () => {
    const ladder = buildIncomeLadder([makeRecord('KO', 3)]);
    const marchSlot = ladder.slots.find((s) => s.month === 3)!;

    expect(marchSlot.total_expected_income).toBe(0);
  });

  it('sets panel5_alerts to empty array when all months have multiple payers', () => {
    // Two payers per month for all 12 months
    const records: DividendRecord[] = [];
    for (let m = 1; m <= 12; m++) {
      records.push(makeRecord(`A${m}`, m));
      records.push(makeRecord(`B${m}`, m));
    }
    const ladder = buildIncomeLadder(records);

    expect(ladder.panel5_alerts).toHaveLength(0);
    expect(ladder.months_with_gap).toHaveLength(0);
    expect(ladder.months_with_concentration).toHaveLength(0);
  });
});

// ─── summariseLadder tests ───────────────────────────────────────────────────

describe('summariseLadder', () => {
  it('includes positions count, months covered, and weighted yield', () => {
    const ladder = buildIncomeLadder([
      makeRecord('KO', 3, 3.0),
      makeRecord('PG', 6, 2.5),
    ]);
    const summary = summariseLadder(ladder);

    expect(summary).toContain('Positions: 2');
    expect(summary).toContain('Months covered: 2/12');
    expect(summary).toContain('2.75%');
  });

  it('lists GAP month names in the summary', () => {
    const ladder = buildIncomeLadder([makeRecord('KO', 3)]);
    const summary = summariseLadder(ladder);

    expect(summary).toContain('GAPS:');
    expect(summary).toContain('January');
  });

  it('lists CONCENTRATION month names in the summary', () => {
    const ladder = buildIncomeLadder([makeRecord('JNJ', 9)]);
    const summary = summariseLadder(ladder);

    expect(summary).toContain('CONCENTRATION:');
    expect(summary).toContain('September');
  });

  it('mentions panel 5 alert count', () => {
    const ladder = buildIncomeLadder([makeRecord('KO', 3)]);
    const summary = summariseLadder(ladder);

    expect(summary).toContain('Panel 5 alerts:');
  });
});
