/**
 * Dividend Calendar Integration
 *
 * Fetches live dividend data (ex-dividend date, payment date, declared amount,
 * trailing yield) from a market data API and normalises it into the MCQ
 * DividendRecord schema.
 *
 * Supported adapters: Polygon.io (default), IEX Cloud (fallback).
 * Adapter is selected via DIVIDEND_API_PROVIDER env var.
 *
 * MCQ proprietary: DividendRecord schema, sustainability flag, ladder-slot
 * assignment, and gap-detection logic are MCQ implementation constructs.
 */

export type DividendApiProvider = 'polygon' | 'iex';

export interface DividendRecord {
  ticker: string;
  company_name: string;
  ex_dividend_date: string;     // ISO date YYYY-MM-DD
  payment_date: string;         // ISO date YYYY-MM-DD
  declared_amount: number;      // Per-share dividend $
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'special';
  trailing_yield_pct: number;   // As a percentage, e.g. 2.75 = 2.75%
  payout_ratio_earnings: number | null;  // % of earnings paid as dividend
  payout_ratio_fcf: number | null;       // % of FCF paid as dividend
  consecutive_growth_years: number;      // Years of consecutive dividend increases
  payment_month: number;        // 1–12, derived from payment_date
  as_of: string;                // ISO timestamp of last data fetch
}

export interface DividendScreenResult {
  ticker: string;
  passes_yield_floor: boolean;
  passes_payout_ceiling: boolean;
  passes_growth_streak: boolean;
  passes_all: boolean;
  fail_reasons: string[];
}

export interface DividendCalendarConfig {
  provider: DividendApiProvider;
  api_key: string;
  yield_floor_pct: number;            // Default 2.5
  payout_max_earnings_pct: number;    // Default 75
  payout_max_fcf_pct: number;         // Default 90
  growth_streak_min_years: number;    // Default 5
}

export const DEFAULT_DIVIDEND_CONFIG: DividendCalendarConfig = {
  provider: (process.env['DIVIDEND_API_PROVIDER'] as DividendApiProvider) ?? 'polygon',
  api_key: process.env['DIVIDEND_API_KEY'] ?? '',
  yield_floor_pct:           parseFloat(process.env['INCOME_YIELD_FLOOR']              ?? '2.5'),
  payout_max_earnings_pct:   parseFloat(process.env['INCOME_PAYOUT_MAX_EARNINGS']      ?? '75'),
  payout_max_fcf_pct:        parseFloat(process.env['INCOME_PAYOUT_MAX_FCF']           ?? '90'),
  growth_streak_min_years:   parseInt(  process.env['INCOME_GROWTH_STREAK_MIN']        ?? '5', 10),
};

/**
 * Build the Polygon.io dividend endpoint URL for a given ticker.
 */
function polygonDividendUrl(ticker: string, apiKey: string): string {
  return `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&limit=10&apiKey=${apiKey}`;
}

/**
 * Build the IEX Cloud dividend endpoint URL for a given ticker.
 */
function iexDividendUrl(ticker: string, apiKey: string): string {
  return `https://cloud.iexapis.com/stable/stock/${ticker}/dividends/1y?token=${apiKey}`;
}

/**
 * Fetch raw dividend data for a single ticker.
 * Returns null if no dividend data is available or the API call fails.
 */
export async function fetchDividendData(
  ticker: string,
  config: DividendCalendarConfig = DEFAULT_DIVIDEND_CONFIG
): Promise<DividendRecord | null> {
  if (!config.api_key) {
    throw new Error('[DividendCalendar] DIVIDEND_API_KEY is not configured.');
  }

  const url =
    config.provider === 'polygon'
      ? polygonDividendUrl(ticker, config.api_key)
      : iexDividendUrl(ticker, config.api_key);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[DividendCalendar] API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json() as Record<string, unknown>;

    // Polygon response normalisation
    if (config.provider === 'polygon') {
      return normalisePolygonResponse(ticker, data);
    }

    // IEX response normalisation
    return normaliseIexResponse(ticker, data);
  } catch (err) {
    console.error(`[DividendCalendar] Fetch failed for ${ticker}:`, err);
    return null;
  }
}

/**
 * Normalise Polygon.io /v3/reference/dividends response.
 * Polygon returns results[] array with cash_amount, ex_dividend_date, pay_date, frequency.
 */
function normalisePolygonResponse(
  ticker: string,
  data: Record<string, unknown>
): DividendRecord | null {
  const results = data['results'] as Array<Record<string, unknown>> | undefined;
  if (!results || results.length === 0) return null;

  const latest = results[0]!;
  const paymentDate = String(latest['pay_date'] ?? '');
  const paymentMonth = paymentDate ? new Date(paymentDate).getMonth() + 1 : 0;

  return {
    ticker,
    company_name: String(latest['company_name'] ?? ticker),
    ex_dividend_date: String(latest['ex_dividend_date'] ?? ''),
    payment_date: paymentDate,
    declared_amount: Number(latest['cash_amount'] ?? 0),
    frequency: normaliseFrequency(String(latest['frequency'] ?? 'quarterly')),
    trailing_yield_pct: Number(latest['trailing_yield'] ?? 0),
    payout_ratio_earnings: latest['payout_ratio'] != null ? Number(latest['payout_ratio']) * 100 : null,
    payout_ratio_fcf: null,  // Polygon does not expose FCF payout — supplement from fundamentals API
    consecutive_growth_years: Number(latest['consecutive_growth_years'] ?? 0),
    payment_month: paymentMonth,
    as_of: new Date().toISOString(),
  };
}

/**
 * Normalise IEX Cloud /stock/{ticker}/dividends response.
 */
function normaliseIexResponse(
  ticker: string,
  data: Record<string, unknown>
): DividendRecord | null {
  const results = Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
  if (results.length === 0) return null;

  const latest = results[0]!;
  const paymentDate = String(latest['paymentDate'] ?? '');
  const paymentMonth = paymentDate ? new Date(paymentDate).getMonth() + 1 : 0;

  return {
    ticker,
    company_name: ticker,
    ex_dividend_date: String(latest['exDate'] ?? ''),
    payment_date: paymentDate,
    declared_amount: Number(latest['amount'] ?? 0),
    frequency: normaliseFrequency(String(latest['frequency'] ?? 'quarterly')),
    trailing_yield_pct: 0,  // IEX does not return trailing yield directly — compute from price
    payout_ratio_earnings: null,
    payout_ratio_fcf: null,
    consecutive_growth_years: 0,
    payment_month: paymentMonth,
    as_of: new Date().toISOString(),
  };
}

function normaliseFrequency(raw: string): DividendRecord['frequency'] {
  const lower = raw.toLowerCase();
  if (lower.includes('month')) return 'monthly';
  if (lower.includes('semi') || lower.includes('bi-annual')) return 'semi-annual';
  if (lower.includes('annual') && !lower.includes('semi')) return 'annual';
  if (lower.includes('special') || lower.includes('extra')) return 'special';
  return 'quarterly';
}

/**
 * Apply MCQ income sleeve screens to a DividendRecord.
 * Returns a DividendScreenResult with pass/fail status per screen.
 */
export function screenDividendRecord(
  record: DividendRecord,
  config: DividendCalendarConfig = DEFAULT_DIVIDEND_CONFIG
): DividendScreenResult {
  const fail_reasons: string[] = [];

  const passes_yield_floor = record.trailing_yield_pct >= config.yield_floor_pct;
  if (!passes_yield_floor) {
    fail_reasons.push(
      `Yield ${record.trailing_yield_pct.toFixed(2)}% below floor ${config.yield_floor_pct}%`
    );
  }

  let passes_payout_ceiling = true;
  if (record.payout_ratio_earnings != null) {
    if (record.payout_ratio_earnings > config.payout_max_earnings_pct) {
      passes_payout_ceiling = false;
      fail_reasons.push(
        `Payout ratio (earnings) ${record.payout_ratio_earnings.toFixed(1)}% above ceiling ${config.payout_max_earnings_pct}%`
      );
    }
  } else if (record.payout_ratio_fcf != null) {
    if (record.payout_ratio_fcf > config.payout_max_fcf_pct) {
      passes_payout_ceiling = false;
      fail_reasons.push(
        `Payout ratio (FCF) ${record.payout_ratio_fcf.toFixed(1)}% above ceiling ${config.payout_max_fcf_pct}%`
      );
    }
  }

  const passes_growth_streak =
    record.consecutive_growth_years >= config.growth_streak_min_years;
  if (!passes_growth_streak) {
    fail_reasons.push(
      `Growth streak ${record.consecutive_growth_years} years below minimum ${config.growth_streak_min_years} years`
    );
  }

  return {
    ticker: record.ticker,
    passes_yield_floor,
    passes_payout_ceiling,
    passes_growth_streak,
    passes_all: fail_reasons.length === 0,
    fail_reasons,
  };
}

/**
 * Fetch and screen a universe of tickers.
 * Returns records that pass all MCQ income sleeve screens.
 */
export async function buildScreenedUniverse(
  tickers: string[],
  config: DividendCalendarConfig = DEFAULT_DIVIDEND_CONFIG
): Promise<{ passing: DividendRecord[]; failing: DividendScreenResult[] }> {
  const passing: DividendRecord[] = [];
  const failing: DividendScreenResult[] = [];

  for (const ticker of tickers) {
    const record = await fetchDividendData(ticker, config);
    if (!record) {
      failing.push({
        ticker,
        passes_yield_floor: false,
        passes_payout_ceiling: false,
        passes_growth_streak: false,
        passes_all: false,
        fail_reasons: ['No dividend data returned from API'],
      });
      continue;
    }

    const screen = screenDividendRecord(record, config);
    if (screen.passes_all) {
      passing.push(record);
    } else {
      failing.push(screen);
    }
  }

  return { passing, failing };
}
