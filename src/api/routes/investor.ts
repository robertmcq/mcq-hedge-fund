/**
 * Investor Page Routes
 *
 * Three endpoints power the investor dashboard:
 *   GET /api/investor/summary    — portfolio snapshot: equity, positions, P&L, top governance scores
 *   GET /api/investor/governance — per-position governance: survival prob, enforcement prob, Kelly
 *   GET /api/investor/timeline   — ledger event history for the replay audit trail
 *
 * Auth: requireApiKey applied globally in app.ts
 * Rate: investorRateLimit applied here (60 req/min) — sensitive financial data
 */

import { Router } from 'express';
import {
  getInvestorSummary,
  getInvestorGovernance,
  getInvestorTimeline,
} from '../controllers/investor-controller';
import { investorRateLimit } from '../middleware/rate-limit';

const router = Router();

router.use(investorRateLimit);

router.get('/summary',    getInvestorSummary);
router.get('/governance', getInvestorGovernance);
router.get('/timeline',   getInvestorTimeline);

export default router;
