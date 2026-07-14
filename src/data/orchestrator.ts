import { buildMacroSnapshot }          from './fred/macroEngine';
import { fetchEdgarSignals }           from './edgar/edgarPipeline';
import { fetchPriceBars, runBacktest } from './alphaVantage/backtestEngine';
import { MarketContext }               from './types';
import { S3Client, PutObjectCommand }  from '@aws-sdk/client-s3';

const TICKERS = (
  process.env.WATCH_TICKERS ?? 'AAPL,MSFT,NVDA,SPY,QQQ'
).split(',').map(t => t.trim());

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

export async function runMarketContextPipeline(): Promise<MarketContext> {
  // Step 1 — FRED: establish regime label before anything else runs
  console.log('[ORCHESTRATOR] Step 1/3 — FRED macro snapshot...');
  const macro = await buildMacroSnapshot();
  console.log(`[ORCHESTRATOR] Regime: ${macro.regime} | Confidence: ${macro.confidence} | Spread: ${macro.yield_curve_spread}`);

  // Step 2 — EDGAR: inject regime, fetch filing signals
  console.log('[ORCHESTRATOR] Step 2/3 — EDGAR NLP pipeline...');
  const edgar_signals = await fetchEdgarSignals(TICKERS, macro);
  console.log(`[ORCHESTRATOR] EDGAR signals: ${edgar_signals.length} across ${TICKERS.length} tickers`);

  // Step 3 — Alpha Vantage: stamp bars with regime, run backtest with edgar context
  console.log('[ORCHESTRATOR] Step 3/3 — Alpha Vantage price fetch + backtest...');
  const price_bars: Record<string, any[]> = {};
  const backtest_results = [];

  for (const ticker of TICKERS) {
    try {
      const bars = await fetchPriceBars(ticker, macro);
      price_bars[ticker] = bars;
      backtest_results.push(runBacktest(bars, edgar_signals, ticker));
      console.log(`[ORCHESTRATOR] ${ticker}: ${bars.length} bars | backtest complete`);
    } catch (err) {
      console.error(`[ORCHESTRATOR] Failed processing ${ticker}:`, err);
    }
  }

  const context: MarketContext = { macro, edgar_signals, price_bars, backtest_results };

  const key = `market-context/${new Date().toISOString().split('T')[0]}.json`;
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.DATA_BUCKET ?? 'mcq-hedge-fund-data',
    Key:         key,
    Body:        JSON.stringify(context, null, 2),
    ContentType: 'application/json',
  }));
  console.log(`[ORCHESTRATOR] MarketContext written to s3://${process.env.DATA_BUCKET}/${key}`);

  return context;
}

if (require.main === module) {
  runMarketContextPipeline()
    .then(ctx => {
      console.log('[ORCHESTRATOR] Pipeline complete.');
      console.log(JSON.stringify(ctx.macro, null, 2));
      console.log(`[ORCHESTRATOR] Backtest results: ${ctx.backtest_results.length}`);
    })
    .catch(err => {
      console.error('[ORCHESTRATOR] Fatal error:', err);
      process.exit(1);
    });
}
