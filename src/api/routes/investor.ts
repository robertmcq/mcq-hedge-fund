/**
 * Investor Page Routes
 *
 * Three endpoints power the investor dashboard:
 *   GET /api/investor/summary   — portfolio snapshot: equity, positions, P&L, top governance scores
 *   GET /api/investor/governance — per-position governance: survival prob, enforcement prob, Kelly
 *   GET /api/investor/timeline  — ledger event history for the replay audit trail
 */

import { Router } from 'express';
import {
  getInvestorSummary,
  getInvestorGovernance,
  getInvestorTimeline,
} from '../controllers/investor-controller';

const router = Router();

router.get('/summary',    getInvestorSummary);
router.get('/governance', getInvestorGovernance);
router.get('/timeline',   getInvestorTimeline);

export default router;
