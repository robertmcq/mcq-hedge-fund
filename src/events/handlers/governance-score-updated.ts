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
    } = event.payload;

    // 1. Run governance scorer — field names must match HazardParams in governance/types.ts
    let result;
    try {
      result = runGovernanceScorer({
        governance: {
          entity_id,
          entity_type,
          governance_score,
          velocity,
          volume,
          shadow,
        },
        win_rate:             0.55,
        avg_win:              1.8,
        avg_loss:             1.0,
        enforcement_loss:     0.5,
        account_equity:       1_000_000,
        horizon_days:         252,
        fractional_kelly_factor: Number(process.env.FRACTIONAL_KELLY ?? 0.25),
        hazard_params: {
          h0:           Number(process.env.H0            ?? 0.01),
          beta_G:       Number(process.env.BETA_G        ?? 1.5),
          beta_velocity: Number(process.env.BETA_VELOCITY ?? 0.8),
          beta_volume:   Number(process.env.BETA_VOLUME   ?? 0.5),
          beta_shadow:   Number(process.env.BETA_SHADOW   ?? 1.2),
        },
      });
    } catch (err) {
      console.error('[GovernanceScoreUpdated] Scorer error:', (err as Error).message);
      return;
    }

    // 2. Log and alert — exact field names from KellyResult & GovernanceSurvivalResult
    const { survival, kelly, alert } = result;
    console.log(
      `[GovernanceScoreUpdated] ${entity_type}=${entity_id} ` +
      `G=${governance_score.toFixed(3)} h=${survival.hazard_rate.toFixed(4)} ` +
      `S(T)=${survival.survival_prob.toFixed(3)} ` +
      `Kelly=${kelly.governance_kelly.toFixed(4)} ` +
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

    // 3. Log updated Kelly for any portfolio position matching entity_id
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
