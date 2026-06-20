import { Router } from 'express';
import { runReverseDCF } from '../controllers/panel1-controller';

const router = Router();

/** POST /api/panel1/reverse-dcf/run */
router.post('/reverse-dcf/run', runReverseDCF);

export default router;
