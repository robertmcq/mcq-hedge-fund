import { describe, it, expect } from 'vitest';
import { runPanel2Engine } from '../engine';
import type { Panel2EngineInput } from '../types';

const peerGroup = {
  peer_group_id: 'pg-saas-us',
  name: 'US SaaS',
  label: 'US SaaS — high growth',
  method: 'manual' as const,
  created_by: 'system',
};

const valuations = [
  { security_id: 'CRM',  as_of: '2026-06-20', ev_revenue_fwd: 8.5, pe_fwd: 35, fcf_yield: 0.030 },
  { security_id: 'NOW',  as_of: '2026-06-20', ev_revenue_fwd: 14.0, pe_fwd: 55, fcf_yield: 0.018 },
  { security_id: 'WDAY', as_of: '2026-06-20', ev_revenue_fwd: 7.2, pe_fwd: 28, fcf_yield: 0.035 },
  { security_id: 'HUBS', as_of: '2026-06-20', ev_revenue_fwd: 9.1, pe_fwd: 40, fcf_yield: 0.025 },
  // Target:
  { security_id: 'AAPL_TARGET', as_of: '2026-06-20', ev_revenue_fwd: 6.0, pe_fwd: 22, fcf_yield: 0.045 },
];

const members = [
  { peer_group_id: 'pg-saas-us', security_id: 'CRM',  as_of: '2026-06-20', source: 'manual' as const },
  { peer_group_id: 'pg-saas-us', security_id: 'NOW',  as_of: '2026-06-20', source: 'manual' as const },
  { peer_group_id: 'pg-saas-us', security_id: 'WDAY', as_of: '2026-06-20', source: 'manual' as const },
  { peer_group_id: 'pg-saas-us', security_id: 'HUBS', as_of: '2026-06-20', source: 'manual' as const },
];

const input: Panel2EngineInput = {
  target_security_id: 'AAPL_TARGET',
  peer_group: peerGroup,
  members,
  valuations,
  governance_bands: [
    { metric_name: 'ev_revenue_fwd', min_z: -2.0, max_z: 2.0, severity_level: 'warn' },
    { metric_name: 'pe_fwd',         min_z: -2.0, max_z: 2.0, severity_level: 'high' },
  ],
  metrics: ['ev_revenue_fwd', 'pe_fwd', 'fcf_yield'],
};

describe('runPanel2Engine', () => {
  it('produces peer stats for each metric', () => {
    const result = runPanel2Engine(input);
    expect(result.peer_stats.length).toBe(3);
    const evRev = result.peer_stats.find((s) => s.metric_name === 'ev_revenue_fwd');
    expect(evRev).toBeDefined();
    expect(evRev!.median).toBeCloseTo(8.8, 0);
  });

  it('computes z-scores for target', () => {
    const result = runPanel2Engine(input);
    expect(result.target_zscores.length).toBe(3);
    const zEv = result.target_zscores.find((z) => z.metric_name === 'ev_revenue_fwd');
    expect(zEv).toBeDefined();
    expect(zEv!.zscore).toBeLessThan(0); // target is cheaper than peers
  });

  it('computes premium_discount_pct correctly', () => {
    const result = runPanel2Engine(input);
    const zEv = result.target_zscores.find((z) => z.metric_name === 'ev_revenue_fwd')!;
    expect(zEv.premium_discount_pct).toBeLessThan(0); // trading at a discount
  });

  it('detects no breaches when within bands', () => {
    const result = runPanel2Engine(input);
    // z-scores should be within ±2 for this data set
    expect(result.breaches.length).toBe(0);
  });

  it('detects a breach when z-score is extreme', () => {
    const extremeInput: Panel2EngineInput = {
      ...input,
      valuations: [
        ...valuations.slice(0, 4),
        { security_id: 'AAPL_TARGET', as_of: '2026-06-20', ev_revenue_fwd: 0.5, pe_fwd: 22, fcf_yield: 0.045 },
      ],
    };
    const result = runPanel2Engine(extremeInput);
    const evBreaches = result.breaches.filter((b) => b.metric_name === 'ev_revenue_fwd');
    expect(evBreaches.length).toBeGreaterThan(0);
    expect(evBreaches[0].rule_code).toContain('BELOW');
  });

  it('throws if target has no valuation snapshot', () => {
    expect(() =>
      runPanel2Engine({ ...input, target_security_id: 'MISSING' })
    ).toThrow(/no valuation snapshot/i);
  });
});
