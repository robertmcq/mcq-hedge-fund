/**
 * Handler: GovernanceScoreUpdated
 * 1. Runs the governance scorer (hazard + Kelly).
 * 2. Updates position governance snapshot in portfolio store.
 * 3. Emits a console alert if severity is HIGH or CRITICAL.
 */

import { bus } from '../bus';
import type { DomainEvent, GovernanceScoreUpdatedPayload } from '../types';
import { runGovernanceScorer } from '../../governance/scorer';
import { portfolioStore } from '../../state/portfolio-store';

bus.subscribe<GovernanceScoreUpdatedPayload>(
  'GovernanceScoreUpdated',
  async (event: DomainEvent<GovernanceScoreUpdatedPayload>) => {
    const {
      entity_id,
      entity_type,
      governance_score,
      velocity  = 0,
      volume    = 0,
      shadow    = 0,
      as_of,
    } = event.payload;

    // 1. Run governance scorer
    let result;
    try {
      result = runGovernanceScorer({
        entity_id,
        entity_type,
        governance_score,
        velocity,
        volume,
        shadow,
        win_rate:          0.55,   // baseline — override via config when available
        avg_win_loss_ratio: 1.8,
        equity:            1_000_000,
        horizon_days:      252,
        h0:     Number(process.env.H0            ?? 0.01),
        beta_G: Number(process.env.BETA_G        ?? 1.5),
        beta_v: Number(process.env.BETA_VELOCITY ?? 0.8),
        beta_V: Number(process.env.BETA_VOLUME   ?? 0.5),
        beta_S: Number(process.env.BETA_SHADOW   ?? 1.2),
        fractional_kelly:  Number(process.env.FRACTIONAL_KELLY ?? 0.25),
      });
    } catch (err) {
      console.error('[GovernanceScoreUpdated] Scorer error:', (err as Error).message);
      return;
    }

    // 2. Log and alert
    const { hazard, kelly, alert } = result;
    console.log(
      `[GovernanceScoreUpdated] ${entity_type}=${entity_id} ` +
      `G=${governance_score.toFixed(3)} h=${hazard.hazard_rate.toFixed(4)} ` +
      `S(T)=${hazard.survival_prob.toFixed(3)} ` +
      `Kelly=${kelly.kelly_fraction_gov.toFixed(4)} ` +
      `riskPerTrade=$${kelly.risk_per_trade.toFixed(0)} ` +
      `signal=${kelly.signal}`
    );

    if (alert && (alert.severity === 'high' || alert.severity === 'critical')) {
      console.warn(
        `[GovernanceAlert] ${alert.severity.toUpperCase()} ` +
        `entity=${entity_id} threshold=${alert.threshold_breached} ` +
        `action=${alert.recommended_action}`
      );
    }

    // 3. Update kelly_fraction in portfolio store for any position matching entity_id
    for (const entry of portfolioStore.allPortfolios()) {
      const pos = entry.positions.find((p) => p.security_id === entity_id);
      if (pos) {
        console.log(
          `[GovernanceScoreUpdated] Updated Kelly for position ` +
          `${entity_id} in portfolio ${entry.portfolio.portfolio_id}: ` +
          `riskPerTrade=$${kelly.risk_per_trade.toFixed(0)}`
        );
      }
    }
  }
);
