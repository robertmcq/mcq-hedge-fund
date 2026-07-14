import axios from 'axios';
import { EdgarSignal, MacroSnapshot } from '../types';

const RISK_KEYWORDS = [
  'material adverse',
  'going concern',
  'liquidity risk',
  'interest rate risk',
  'inflationary pressures',
  'supply chain disruption',
];

function scoreRiskLanguage(text: string): number {
  const lower = text.toLowerCase();
  const hits = RISK_KEYWORDS.filter(k => lower.includes(k));
  return -(hits.length / RISK_KEYWORDS.length);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().split('T')[0];
}

export async function fetchEdgarSignals(
  tickers: string[],
  macro: MacroSnapshot
): Promise<EdgarSignal[]> {
  const signals: EdgarSignal[] = [];

  for (const ticker of tickers) {
    try {
      const { data } = await axios.get('https://efts.sec.gov/LATEST/search-index', {
        params: {
          q:         `"${ticker}"`,
          dateRange: 'custom',
          startdt:   daysAgo(30),
          enddt:     daysAgo(0),
          forms:     '10-K,10-Q,8-K',
        },
        headers: { 'User-Agent': 'MCQVentures robert.m@mcqventures.com' },
      });

      for (const hit of (data.hits?.hits ?? []).slice(0, 5)) {
        const rawText = [
          hit._source?.period_of_report ?? '',
          ...(hit._source?.display_names ?? []),
        ].join(' ');

        const matched = RISK_KEYWORDS.filter(k => rawText.toLowerCase().includes(k));

        signals.push({
          ticker,
          filing_type:      (hit._source?.form_type ?? '10-Q') as '10-K' | '10-Q' | '8-K',
          filed_at:         hit._source?.file_date ?? new Date().toISOString(),
          risk_delta_score: scoreRiskLanguage(rawText),
          keywords_matched: matched,
          regime_context:   macro.regime,
        });
      }
    } catch (err) {
      console.warn(`[EDGAR] Failed to fetch signals for ${ticker}:`, err);
    }
  }

  return signals;
}
