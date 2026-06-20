import { Router } from 'express';
import { evaluatePortfolio } from '../controllers/panel3-controller';

const router = Router();

/** POST /api/panel3/portfolio/evaluate */
router.post('/portfolio/evaluate', evaluatePortfolio);

export default router;
