import { describe, expect, it } from 'vitest';
import { runGovernanceScorer } from '../scorer';

describe('scorer.ts runtime guard', () => {
  it('throws on flat payload missing nested governance object', () => {
    const flatPayload = {
      entity_type: 'issuer',
      entity_id: 'KO',
      governance_score: 0.8,
      velocity: 0.1,
      volume: 0.2,
      shadow: 0.05,
      horizon_days: 30,
      win_rate: 0.6,
      avg_win: 200,
      avg_loss: 100,
      enforcement_loss: 500,
      account_equity: 100000,
    } as unknown as Parameters<typeof runGovernanceScorer>[0];

    expect(() => runGovernanceScorer(flatPayload)).toThrow(
      /input\.governance is missing or not an object/
    );
  });
});
