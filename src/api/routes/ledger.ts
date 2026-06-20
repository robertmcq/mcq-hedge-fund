/**
 * Ledger API routes — read-only access to the event ledger and replay controls.
 * All writes go through the ledger bus, not this router.
 */

import { Router } from 'express';
import { readEvents, loadCursor } from '../../events/ledger/store';
import { replayFromLedger } from '../../events/ledger/replay-engine';

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

/** POST /api/ledger/replay  { consumer_id, from_seq?, to_seq?, emit_to_bus? } */
router.post('/replay', async (req, res, next) => {
  try {
    const { consumer_id, from_seq, to_seq, emit_to_bus = false } = req.body as {
      consumer_id: string;
      from_seq?: number;
      to_seq?: number;
      emit_to_bus?: boolean;
    };
    if (!consumer_id) return res.status(400).json({ ok: false, error: 'consumer_id required' });
    const result = await replayFromLedger({ consumer_id, from_seq, to_seq, emit_to_bus });
    return res.json({ ok: true, result });
  } catch (err) { return next(err); }
});

export default router;
