/**
 * Panel 1 routes — Portfolio projection via event replay.
 *
 * ALL reads are derived from the event ledger.
 * No direct in-memory state reads. No hidden mutations.
 *
 * Routes:
 *   GET /api/panel1/portfolio/:id           — current state (full replay)
 *   GET /api/panel1/portfolio/:id/summary   — headline metrics
 *   GET /api/panel1/portfolio/:id/positions — sorted position list
 *   GET /api/panel1/portfolio/:id/timeline  — raw event log for this aggregate
 *   GET /api/panel1/portfolio/:id/replay    — state at ?as_of_seq=N
 */

import { Router } from 'express';
import { replayAggregate, loadAggregateEvents } from '../../projections/core/replay';
import { portfolioReducer } from '../../projections/portfolio/reducer';
import { selectSummary, selectPositions } from '../../projections/portfolio/selector';
import { INITIAL_PORTFOLIO_STATE } from '../../projections/portfolio/types';

const router = Router();

async function getPortfolioState(portfolio_id: string, as_of_seq?: number) {
  return replayAggregate(
    portfolio_id,
    portfolioReducer,
    { ...INITIAL_PORTFOLIO_STATE, portfolio_id },
    as_of_seq
  );
}

/** Full projection state */
router.get('/portfolio/:id', async (req, res, next) => {
  try {
    const { state, event_count, last_seq } = await getPortfolioState(req.params.id);
    res.json({ ok: true, event_count, last_seq, data: state });
  } catch (err) { next(err); }
});

/** Headline summary only */
router.get('/portfolio/:id/summary', async (req, res, next) => {
  try {
    const { state, event_count, last_seq } = await getPortfolioState(req.params.id);
    res.json({ ok: true, event_count, last_seq, data: selectSummary(state) });
  } catch (err) { next(err); }
});

/** Sorted positions list */
router.get('/portfolio/:id/positions', async (req, res, next) => {
  try {
    const { state, event_count } = await getPortfolioState(req.params.id);
    res.json({ ok: true, event_count, data: selectPositions(state) });
  } catch (err) { next(err); }
});

/** Raw event timeline for this portfolio */
router.get('/portfolio/:id/timeline', async (req, res, next) => {
  try {
    const events = await loadAggregateEvents(req.params.id);
    res.json({ ok: true, count: events.length, events });
  } catch (err) { next(err); }
});

/** Point-in-time replay: ?as_of_seq=12345 */
router.get('/portfolio/:id/replay', async (req, res, next) => {
  try {
    const as_of_seq = req.query.as_of_seq ? Number(req.query.as_of_seq) : undefined;
    const { state, event_count, last_seq } = await getPortfolioState(req.params.id, as_of_seq);
    res.json({
      ok: true,
      as_of_seq: as_of_seq ?? 'latest',
      event_count,
      last_seq,
      data: selectSummary(state),
    });
  } catch (err) { next(err); }
});

/** Health */
router.get('/health', (_req, res) => res.json({ ok: true, panel: 1 }));

export default router;
