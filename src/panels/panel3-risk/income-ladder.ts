/**
 * Panel 3 — Income Ladder
 *
 * Constructs a 12-month dividend payment calendar from a screened universe
 * of DividendRecords, detects gaps and concentration risk, and outputs a
 * structured IncomeLadder object for Panel 3 display and Panel 5 alerting.
 *
 * MCQ proprietary: ladder construction logic, gap detection, concentration
 * flag, and Panel 5 policy object integration are MCQ implementation constructs.
 */

import type { DividendRecord } from '../../integrations/dividend-calendar';

export type LadderSlotStatus = 'OK' | 'GAP' | 'CONCENTRATION' | 'SUSPENDED';

export interface LadderSlot {
  month: number;            // 1–12
  month_name: string;
  payers: DividendRecord[];
  total_expected_income: number;  // Sum of declared_amount × assumed shares for that month
  status: LadderSlotStatus;
  status_reason: string | null;
}

export interface IncomeLadder {
  as_of: string;
  total_annual_positions: number;
  months_covered: number;          // 1–12
  months_with_gap: number[];
  months_with_concentration: number[];
  annual_yield_pct_weighted: number;
  slots: LadderSlot[];
  panel5_alerts: LadderAlert[];
}

export interface LadderAlert {
  alert_type: 'GAP' | 'CONCENTRATION' | 'SUSPENSION' | 'YIELD_BELOW_FLOOR';
  month: number | null;
  ticker: string | null;
  message: string;
  severity: 'warn' | 'high' | 'critical';
  recommended_action: string;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Build a 12-month income ladder from a screened universe of DividendRecords.
 *
 * @param records   Passing dividend records from buildScreenedUniverse()
 * @param shares    Optional map of ticker → share count for income estimation
 */
export function buildIncomeLadder(
  records: DividendRecord[],
  shares: Record<string, number> = {}
): IncomeLadder {
  const slots: LadderSlot[] = [];
  const panel5_alerts: LadderAlert[] = [];
  const months_with_gap: number[] = [];
  const months_with_concentration: number[] = [];

  for (let month = 1; month <= 12; month++) {
    const payers = records.filter((r) => r.payment_month === month);
    const total_expected_income = payers.reduce((sum, r) => {
      const shareCount = shares[r.ticker] ?? 0;
      return sum + r.declared_amount * shareCount;
    }, 0);

    let status: LadderSlotStatus = 'OK';
    let status_reason: string | null = null;

    if (payers.length === 0) {
      status = 'GAP';
      status_reason = 'No dividend payers assigned to this month.';
      months_with_gap.push(month);
      panel5_alerts.push({
        alert_type: 'GAP',
        month,
        ticker: null,
        message: `Income ladder GAP: no payers in ${MONTH_NAMES[month]}.`,
        severity: 'high',
        recommended_action:
          'Add a qualifying dividend payer with a payment date in this month, '
          + 'or accept the gap and document the decision in the governance queue.',
      });
    } else if (payers.length === 1) {
      status = 'CONCENTRATION';
      status_reason = `Single payer: ${payers[0]!.ticker}. Concentration risk if dividend is cut.`;
      months_with_concentration.push(month);
      panel5_alerts.push({
        alert_type: 'CONCENTRATION',
        month,
        ticker: payers[0]!.ticker,
        message: `Concentration risk in ${MONTH_NAMES[month]}: sole payer is ${payers[0]!.ticker}.`,
        severity: 'warn',
        recommended_action:
          'Consider adding a second payer in this month to reduce single-name risk.',
      });
    }

    slots.push({
      month,
      month_name: MONTH_NAMES[month]!,
      payers,
      total_expected_income,
      status,
      status_reason,
    });
  }

  const months_covered = slots.filter((s) => s.payers.length > 0).length;

  // Weighted average yield across all positions
  const total_yield = records.reduce((sum, r) => sum + r.trailing_yield_pct, 0);
  const annual_yield_pct_weighted =
    records.length > 0 ? total_yield / records.length : 0;

  return {
    as_of: new Date().toISOString(),
    total_annual_positions: records.length,
    months_covered,
    months_with_gap,
    months_with_concentration,
    annual_yield_pct_weighted,
    slots,
    panel5_alerts,
  };
}

/**
 * Render a compact text summary of the income ladder for logging or API response.
 */
export function summariseLadder(ladder: IncomeLadder): string {
  const lines: string[] = [
    `Income Ladder as of ${ladder.as_of}`,
    `Positions: ${ladder.total_annual_positions} | Months covered: ${ladder.months_covered}/12`,
    `Weighted avg yield: ${ladder.annual_yield_pct_weighted.toFixed(2)}%`,
  ];

  if (ladder.months_with_gap.length > 0) {
    lines.push(
      `GAPS: ${ladder.months_with_gap.map((m) => MONTH_NAMES[m]).join(', ')}`
    );
  }

  if (ladder.months_with_concentration.length > 0) {
    lines.push(
      `CONCENTRATION: ${ladder.months_with_concentration.map((m) => MONTH_NAMES[m]).join(', ')}`
    );
  }

  if (ladder.panel5_alerts.length > 0) {
    lines.push(`Panel 5 alerts: ${ladder.panel5_alerts.length}`);
  }

  return lines.join('\n');
}
