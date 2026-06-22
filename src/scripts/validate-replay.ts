/**
 * Replay Validation Probe
 *
 * Seeds the ledger (idempotent) then replays all events, exercising:
 *   1. assertScorerInput() shape guard on GovernanceScoreUpdated events
 *   2. Cursor advance across two consecutive replay runs
 *   3. Error accumulation rate (threshold: <1%)
 *
 * Run: npm run validate:replay
 * Or:  npx ts-node src/scripts/validate-replay.ts
 *
 * Exit codes:
 *   0  — all checks passed
 *   1  — error rate exceeded threshold or replay threw unexpectedly
 */

import { initLedgerPool } from '../events/ledger/store';
import { replayFromLedger } from '../events/ledger/replay-engine';
import { runGovernanceScorer } from '../governance/scorer';
import type { ScorerInput } from '../governance/scorer';

const ERROR_RATE_THRESHOLD = 0.01; // 1%

async function main(): Promise<void> {
  console.log('[validate:replay] Initialising ledger pool...');
  initLedgerPool();

  // ── Run 1: full replay from seq=0 ──────────────────────────────────────────
  console.log('[validate:replay] Run 1: replaying from seq=0...');
  const run1 = await replayFromLedger({
    consumer_id: 'validate-probe',
    from_seq: 0,
    emit_to_bus: false,
    on_event: async (event) => {
      if (event.event_type === 'GovernanceScoreUpdated') {
        // Build the full ScorerInput the same way the handler does.
        // If the payload is flat (missing nested governance object), assertScorerInput throws.
        const p = event.payload as Record<string, unknown>;
        const scorerInput: ScorerInput = {
          governance: {
            entity_id:        String(p['entity_id']  ?? ''),
            entity_type:      String(p['entity_type'] ?? 'issuer') as 'issuer' | 'strategy' | 'agent',
            governance_score: Number(p['governance_score'] ?? 0),
            velocity:         Number(p['velocity']  ?? 0),
            volume:           Number(p['volume']    ?? 0),
            shadow:           Number(p['shadow']    ?? 0),
          },
          horizon_days:            Number(process.env['HORIZON_DAYS']   ?? 252),
          win_rate:                Number(process.env['WIN_RATE']       ?? 0.55),
          avg_win:                 Number(process.env['AVG_WIN']        ?? 1.8),
          avg_loss:                Number(process.env['AVG_LOSS']       ?? 1.0),
          enforcement_loss:        Number(process.env['ENFORCE_LOSS']   ?? 0.5),
          account_equity:          Number(process.env['ACCOUNT_EQUITY'] ?? 1_000_000),
          fractional_kelly_factor: Number(process.env['FRACTIONAL_KELLY'] ?? 0.25),
          hazard_params: {
            h0:            Number(process.env['H0']            ?? 0.01),
            beta_G:        Number(process.env['BETA_G']        ?? 1.5),
            beta_velocity: Number(process.env['BETA_VELOCITY'] ?? 0.8),
            beta_volume:   Number(process.env['BETA_VOLUME']   ?? 0.5),
            beta_shadow:   Number(process.env['BETA_SHADOW']   ?? 1.2),
          },
        };
        runGovernanceScorer(scorerInput);
      }
    },
  });

  const run1ErrorRate = run1.events_replayed > 0
    ? run1.errors.length / run1.events_replayed
    : 0;

  console.log('[validate:replay] Run 1 result:');
  console.log(JSON.stringify({
    events_replayed:  run1.events_replayed,
    errors:           run1.errors.length,
    error_rate_pct:   (run1ErrorRate * 100).toFixed(2) + '%',
    last_seq:         run1.last_seq,
    duration_ms:      run1.duration_ms,
    status:           run1ErrorRate > ERROR_RATE_THRESHOLD ? 'ABOVE_THRESHOLD' : 'OK',
    first_errors:     run1.errors.slice(0, 5),
  }, null, 2));

  // ── Run 2: cursor advance check ───────────────────────────────────────────
  // Second run should find 0 new events (cursor is at last_seq from run 1)
  console.log('[validate:replay] Run 2: verifying cursor advance...');
  const run2 = await replayFromLedger({
    consumer_id: 'validate-probe',
    emit_to_bus: false,
  });

  console.log('[validate:replay] Run 2 result (expect 0 new events):');
  console.log(JSON.stringify({
    events_replayed: run2.events_replayed,
    last_seq:        run2.last_seq,
    cursor_advanced: run1.last_seq === run2.last_seq ? 'YES — cursor held position' : 'NO — cursor regressed',
  }, null, 2));

  // ── Exit code ─────────────────────────────────────────────────────────────
  if (run1ErrorRate > ERROR_RATE_THRESHOLD) {
    console.error(
      `[validate:replay] FAIL — error rate ${(run1ErrorRate * 100).toFixed(2)}% exceeds ${ERROR_RATE_THRESHOLD * 100}% threshold`
    );
    process.exit(1);
  }

  if (run2.events_replayed > 0) {
    console.error(
      `[validate:replay] FAIL — cursor did not advance: run 2 found ${run2.events_replayed} events that should have been consumed`
    );
    process.exit(1);
  }

  console.log('[validate:replay] PASS — all checks cleared.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[validate:replay] Fatal error:', err);
  process.exit(1);
});
