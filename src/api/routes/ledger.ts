/**
 * Ledger API routes — read-only access to the event ledger and replay controls.
 *
 * Auth:  requireApiKey applied globally in app.ts
 * Rates: replayRateLimit on POST /replay (10 req/min) — destructive operation
 */

import { Router } from 'express';
import { readEvents, loadCursor } from '../../events/ledger/store';
import { replayFromLedger }       from '../../events/ledger/replay-engine';
import { replayRateLimit }        from '../middleware/rate-limit';

const router = Router();

/** GET /api/ledger/events?from_seq=0&limit=100&type=MarketDataUpdated */
router.get('/events', async (req, res, next) => {
  try {
    const fromSeq    = Number(req.query.from_seq ?? 0);
    const limit      = Math.min(Number(req.query.limit ?? 100), 1000);
    const eventTypes = req.query.type
      ? String(req.query.type).split(',').map((t) => t.trim())
      : undefined;

    const events = await readEvents({ fromSeq, limit, eventTypes });
    res.json({ ok: true, count: events.length, events });
  } catch (err) { next(err); }
});

/** GET /api/ledger/cursor/:consumer_id */
router.get('/cursor/:consumer_id', async (req, res, next) => {
  try {
    const cursor = await loadCursor(req.params.consumer_id);
    res.json({ ok: true, cursor });
  } catch (err) { next(err); }
});

/**
 * POST /api/ledger/replay
 * Body: { consumer_id, from_seq?, to_seq?, emit_to_bus?, confirm_replay: true }
 *
 * confirm_replay must be explicitly set to boolean true.
 * This is a secondary friction gate against accidental or scripted replay triggering.
 */
router.post('/replay', replayRateLimit, async (req, res, next) => {
  try {
    const {
      consumer_id,
      from_seq,
      to_seq,
      emit_to_bus    = false,
      confirm_replay = false,
    } = req.body as {
      consumer_id:    string;
      from_seq?:      number;
      to_seq?:        number;
      emit_to_bus?:   boolean;
      confirm_replay?: boolean;
    };

    if (!consumer_id) {
      return res.status(400).json({ ok: false, error: 'consumer_id required' });
    }

    if (emit_to_bus && confirm_replay !== true) {
      return res.status(400).json({
        ok:    false,
        error: 'emit_to_bus=true requires confirm_replay=true as an explicit acknowledgement',
      });
    }

    const result = await replayFromLedger({ consumer_id, from_seq, to_seq, emit_to_bus });
    return res.json({ ok: true, result });
  } catch (err) { return next(err); }
});

export default router;
