/**
 * Panel 2 — Peer Benchmarking & Comps
 * Statistical utilities: median, percentile, IQR-based std dev, z-score, pct rank.
 */

export function sortedValues(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function median(arr: number[]): number {
  const s = sortedValues(arr);
  return percentile(s, 50);
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mu = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function zScore(value: number, mu: number, sigma: number): number {
  if (sigma === 0) return 0;
  return (value - mu) / sigma;
}

export function percentileRank(sorted: number[], value: number): number {
  if (!sorted.length) return 0;
  const below = sorted.filter((v) => v < value).length;
  return below / sorted.length;
}
