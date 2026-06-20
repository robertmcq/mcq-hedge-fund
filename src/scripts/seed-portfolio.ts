/**
 * Seed script — emits canonical events into the ledger.
 * Seed data is now real ledger events — replayable and auditable.
 *
 * Run: npm run seed
 * Or inside Docker: node dist/scripts/seed-portfolio.js
 */

import { randomUUID } from 'crypto';
import { initLedgerPool, appendEvent } from '../events/ledger/store';
import { CURRENT_SCHEMA_VERSION } from '../events/ledger/schema-registry';

// Register all event handlers so bus is live
import '../events/handlers/market-data-updated';
import '../events/handlers/governance-score-updated';
import '../events/handlers/trade-executed';
import '../events/handlers/action-decision';

const PORTFOLIO_ID = 'pf-main';

async function seed(): Promise<void> {
  console.log('[seed] Initialising ledger pool...');
  initLedgerPool();

  console.log('[seed] Appending PORTFOLIO_INITIALIZED event...');
  await appendEvent({
    event_id:       randomUUID(),
    event_type:     'PORTFOLIO_INITIALIZED',
    aggregate_id:   PORTFOLIO_ID,
    schema_version: CURRENT_SCHEMA_VERSION,
    payload: {
      portfolio_id:     PORTFOLIO_ID,
      name:             'MCQ Main Book',
      base_currency:    'USD',
      cash:             250_000,
      ytd_start_equity: 230_000,
    },
    occurred_at: new Date().toISOString(),
    source: 'seed',
  });

  console.log('[seed] Appending POSITION_OPENED events...');
  await appendEvent({
    event_id:       randomUUID(),
    event_type:     'POSITION_OPENED',
    aggregate_id:   PORTFOLIO_ID,
    schema_version: CURRENT_SCHEMA_VERSION,
    payload: {
      portfolio_id: PORTFOLIO_ID,
      security_id:  'KXBTC-26DEC31-B100000',
      side:         'long',
      quantity:     100,
      price:        0.62,
      executed_at:  new Date().toISOString(),
    },
    occurred_at: new Date().toISOString(),
    source: 'seed',
  });

  await appendEvent({
    event_id:       randomUUID(),
    event_type:     'POSITION_OPENED',
    aggregate_id:   PORTFOLIO_ID,
    schema_version: CURRENT_SCHEMA_VERSION,
    payload: {
      portfolio_id: PORTFOLIO_ID,
      security_id:  'KXINX-26DEC31-T5000',
      side:         'long',
      quantity:     50,
      price:        0.45,
      executed_at:  new Date().toISOString(),
    },
    occurred_at: new Date().toISOString(),
    source: 'seed',
  });

  console.log('[seed] Appending PRICE_UPDATED event...');
  await appendEvent({
    event_id:       randomUUID(),
    event_type:     'PRICE_UPDATED',
    aggregate_id:   PORTFOLIO_ID,
    schema_version: CURRENT_SCHEMA_VERSION,
    payload: {
      security_id: 'KXBTC-26DEC31-B100000',
      price:       0.65,
      volume:      1200,
      date_time:   new Date().toISOString(),
    },
    occurred_at: new Date().toISOString(),
    source: 'seed',
  });

  console.log('[seed] Appending GovernanceScoreUpdated event...');
  await appendEvent({
    event_id:       randomUUID(),
    event_type:     'GovernanceScoreUpdated',
    aggregate_id:   'KXBTC-26DEC31-B100000',
    schema_version: CURRENT_SCHEMA_VERSION,
    payload: {
      entity_type:      'issuer',
      entity_id:        'KXBTC-26DEC31-B100000',
      as_of:            new Date().toISOString(),
      governance_score: 0.82,
      velocity:         0.1,
      volume:           0.3,
      shadow:           0.05,
    },
    occurred_at: new Date().toISOString(),
    source: 'seed',
  });

  console.log('[seed] Done. Verify with:');
  console.log(`  curl http://localhost:3000/api/panel1/portfolio/${PORTFOLIO_ID}/summary`);
  console.log(`  curl http://localhost:3000/api/panel1/portfolio/${PORTFOLIO_ID}/timeline`);
  console.log(`  curl http://localhost:3000/api/ledger/events?from_seq=0&limit=50`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Fatal:', err);
  process.exit(1);
});
