import axios from 'axios';
import { MacroSnapshot, RegimeLabel } from '../types';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

const SERIES = {
  fed_funds:    'FEDFUNDS',
  cpi:          'CPIAUCSL',
  unemployment: 'UNRATE',
  t10y:         'GS10',
  t2y:          'GS2',
};

async function fetchSeries(seriesId: string): Promise<number> {
  const { data } = await axios.get(FRED_BASE, {
    params: {
      series_id:  seriesId,
      api_key:    process.env.FRED_API_KEY,
      file_type:  'json',
      limit:      2,
      sort_order: 'desc',
    },
  });
  const val = data.observations?.[0]?.value;
  if (!val || val === '.') throw new Error(`FRED returned no data for ${seriesId}`);
  return parseFloat(val);
}

function classifyRegime(
  cpi: number,
  unemployment: number,
  spread: number,
  _fedFunds: number
): { regime: RegimeLabel; confidence: number } {
  if (spread < 0 && cpi > 4)                        return { regime: 'STAGFLATION', confidence: 0.85 };
  if (spread < 0)                                   return { regime: 'RISK_OFF',    confidence: 0.75 };
  if (cpi < 3 && unemployment < 5 && spread > 0.5) return { regime: 'BULL',        confidence: 0.80 };
  if (unemployment > 6 || cpi > 5)                 return { regime: 'BEAR',        confidence: 0.70 };
  return { regime: 'NEUTRAL', confidence: 0.60 };
}

export async function buildMacroSnapshot(): Promise<MacroSnapshot> {
  const [fedFunds, cpi, unemployment, t10y, t2y] = await Promise.all([
    fetchSeries(SERIES.fed_funds),
    fetchSeries(SERIES.cpi),
    fetchSeries(SERIES.unemployment),
    fetchSeries(SERIES.t10y),
    fetchSeries(SERIES.t2y),
  ]);

  const spread = t10y - t2y;
  const { regime, confidence } = classifyRegime(cpi, unemployment, spread, fedFunds);

  return {
    timestamp:          new Date().toISOString(),
    regime,
    fed_funds_rate:     fedFunds,
    cpi_yoy:            cpi,
    unemployment_rate:  unemployment,
    yield_curve_spread: spread,
    confidence,
  };
}
