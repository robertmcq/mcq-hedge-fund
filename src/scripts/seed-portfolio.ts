/**
 * Seed script — loads a demo portfolio into the in-memory store.
 * Run: npx ts-node src/scripts/seed-portfolio.ts
 *
 * This lets you start Panel 3 live refresh immediately without needing
 * real trade execution. Replace with DB-backed positions in production.
 */

import { portfolioStore } from '../state/portfolio-store';
import { publish } from '../events/publisher';

// Register all event handlers before publishing
import '../events/handlers/market-data-updated';
import '../events/handlers/governance-score-updated';
import '../events/handlers/trade-executed';
import '../events/handlers/action-decision';

async function seed(): Promise<void> {
  console.log('[seed] Loading demo portfolio into store...');

  portfolioStore.upsertPortfolio({
    portfolio: {
      portfolio_id: 'pf-main',
      name:         'MCQ Main Book',
      base_currency: 'USD',
    },
    positions: [],
    cash:                250_000,
    prior_equity_value:  250_000,
    ytd_start_equity:    230_000,
    equity_history:      [],
  });

  console.log('[seed] Seeding trades...');

  // Simulate initial position via TradeExecuted events
  await publish.tradeExecuted({
    portfolio_id: 'pf-main',
    security_id:  'KXBTC-26DEC31-B100000',
    side:         'long',
    quantity:     100,
    price:        0.62,
    executed_at:  new Date().toISOString(),
  });

  await publish.tradeExecuted({
    portfolio_id: 'pf-main',
    security_id:  'KXINX-26DEC31-T5000',
    side:         'long',
    quantity:     50,
    price:        0.45,
    executed_at:  new Date().toISOString(),
  });

  console.log('[seed] Seeding governance scores...');

  await publish.governanceScoreUpdated({
    entity_type:      'issuer',
    entity_id:        'KXBTC-26DEC31-B100000',
    as_of:            new Date().toISOString(),
    governance_score: 0.82,
    velocity:         0.1,
    volume:           0.3,
    shadow:           0.05,
  });

  console.log('[seed] Simulating a market data tick...');

  await publish.marketDataUpdated({
    security_id: 'KXBTC-26DEC31-B100000',
    price:       0.65,
    volume:      1200,
    date_time:   new Date().toISOString(),
  });

  console.log('[seed] Done. Portfolio store is live.');

  const entry = portfolioStore.getPortfolio('pf-main');
  console.log('[seed] Positions:', entry?.positions.length);
  console.log('[seed] Price cache entries:', portfolioStore.allPrices().length);
  console.log('[seed] Equity history points:', entry?.equity_history.length);
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
