// Shared data contract — all three engines read from and write to this interface.
// Never break this file without versioning — downstream consumers depend on it.

export type RegimeLabel = 'BULL' | 'BEAR' | 'STAGFLATION' | 'RISK_OFF' | 'NEUTRAL';

export interface MacroSnapshot {
  timestamp: string;            // ISO 8601
  regime: RegimeLabel;
  fed_funds_rate: number;
  cpi_yoy: number;
  unemployment_rate: number;
  yield_curve_spread: number;   // 10Y - 2Y
  confidence: number;           // 0–1 score
}

export interface EdgarSignal {
  ticker: string;
  filing_type: '10-K' | '10-Q' | '8-K';
  filed_at: string;
  risk_delta_score: number;     // NLP sentiment shift -1 to +1
  keywords_matched: string[];
  regime_context: RegimeLabel;  // injected from MacroSnapshot at fetch time
}

export interface PriceBar {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  regime_label: RegimeLabel;    // stamped at ingestion time from MacroSnapshot
}

export interface BacktestResult {
  ticker: string;
  period_start: string;
  period_end: string;
  regime: RegimeLabel;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  edgar_signal_count: number;   // EDGAR signals fired during this period
}

export interface MarketContext {
  macro: MacroSnapshot;
  edgar_signals: EdgarSignal[];
  price_bars: Record<string, PriceBar[]>;
  backtest_results: BacktestResult[];
}
