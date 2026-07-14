import axios from 'axios';
import { PriceBar, BacktestResult, MacroSnapshot, EdgarSignal } from '../types';

const AV_BASE = 'https://www.alphavantage.co/query';

export async function fetchPriceBars(
  ticker: string,
  macro: MacroSnapshot
): Promise<PriceBar[]> {
  const { data } = await axios.get(AV_BASE, {
    params: {
      function:   'TIME_SERIES_DAILY_ADJUSTED',
      symbol:     ticker,
      outputsize: 'compact',
      apikey:     process.env.ALPHA_VANTAGE_API_KEY,
    },
  });

  const series = data['Time Series (Daily)'] ?? {};
  if (Object.keys(series).length === 0) {
    throw new Error(`Alpha Vantage returned no price data for ${ticker}`);
  }

  return Object.entries(series).map(([date, bar]: [string, any]) => ({
    ticker,
    date,
    open:         parseFloat(bar['1. open']),
    high:         parseFloat(bar['2. high']),
    low:          parseFloat(bar['3. low']),
    close:        parseFloat(bar['5. adjusted close']),
    volume:       parseInt(bar['6. volume'], 10),
    regime_label: macro.regime,
  }));
}

export function runBacktest(
  bars: PriceBar[],
  edgarSignals: EdgarSignal[],
  ticker: string
): BacktestResult {
  if (bars.length < 2) throw new Error(`Insufficient bars for ${ticker}`);

  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));

  const returns = sorted.slice(1).map((bar, i) =>
    (bar.close - sorted[i].close) / sorted[i].close
  );

  const totalReturn = returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
  const mean        = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance    = returns.map(r => (r - mean) ** 2).reduce((a, b) => a + b, 0) / returns.length;
  const std         = Math.sqrt(variance);
  const sharpe      = std > 0 ? (mean / std) * Math.sqrt(252) : 0;

  let peak = sorted[0].close;
  let maxDD = 0;
  for (const bar of sorted) {
    if (bar.close > peak) peak = bar.close;
    const dd = (peak - bar.close) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const tickerSignals = edgarSignals.filter(s => s.ticker === ticker);

  return {
    ticker,
    period_start:       sorted[0].date,
    period_end:         sorted[sorted.length - 1].date,
    regime:             sorted[0].regime_label,
    total_return:       totalReturn,
    sharpe_ratio:       sharpe,
    max_drawdown:       maxDD,
    edgar_signal_count: tickerSignals.length,
  };
}
