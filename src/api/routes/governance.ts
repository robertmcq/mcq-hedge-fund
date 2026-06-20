import { Router } from 'express';
import { scoreGovernance } from '../controllers/governance-controller';

const router = Router();

/** POST /api/governance/score */
router.post('/score', scoreGovernance);

export default router;
