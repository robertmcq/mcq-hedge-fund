/**
 * Integration test — requires a live DATABASE_URL.
 * Skipped automatically when DATABASE_URL is not set.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const DB = process.env.DATABASE_URL;
describe.skipIf(!DB)('ActionItem repository (Postgres integration)', () => {
  beforeAll(async () => {
    // Schema should already be applied via src/db/schema.sql
  });

  it('creates and retrieves an action item', async () => {
    const { createActionItemPg, getActionItemPg } = await import('../repositories/action-item-repository');
    const item = await createActionItemPg({
      source_panel: 'Risk',
      entity_type: 'portfolio',
      entity_id: '00000000-0000-0000-0000-000000000001',
      action_type: 'Trade',
      priority: 1,
      confidence: 0.87,
      rationale_text: 'Leverage breach',
      proposed_payload_json: { side: 'SELL', ticker: 'AAPL', quantity: 10 },
    });
    expect(item.action_id).toBeDefined();
    expect(item.status).toBe('open');

    const fetched = await getActionItemPg(item.action_id);
    expect(fetched?.confidence).toBeCloseTo(0.87);
  });
});
