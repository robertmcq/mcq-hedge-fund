import { Router } from 'express';
import { runComps } from '../controllers/panel2-controller';

const router = Router();

/** POST /api/panel2/comps/run */
router.post('/comps/run', runComps);

export default router;
