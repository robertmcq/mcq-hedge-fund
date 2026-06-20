/**
 * Handler: GovernanceScoreUpdated
 * Triggers governance scorer -> survival snapshot -> Kelly budget update -> alerts.
 */

import { bus } from '../bus';
import { GovernanceScoreUpdatedPayload, DomainEvent } from '../types';

bus.subscribe<GovernanceScoreUpdatedPayload>(
  'GovernanceScoreUpdated',
  async (event: DomainEvent<GovernanceScoreUpdatedPayload>) => {
    const { entity_id, entity_type, governance_score, velocity, volume, shadow } = event.payload;
    console.log(
      `[GovernanceScoreUpdated] ${entity_type}=${entity_id} G=${governance_score}`
    );
    // TODO: runGovernanceScorer({ governance_score, velocity, volume, shadow, ... })
    // TODO: write position_governance_snapshot + portfolio_kelly_budget
    // TODO: if alert !== null -> createActionItem({ source_panel: 'Gov', ... })
  }
);
