import { Router } from 'express';
import { createAction, decideAction, listActions } from '../controllers/panel5-controller';

const router = Router();

/** GET  /api/panel5/actions */
router.get('/actions', listActions);

/** POST /api/panel5/actions */
router.post('/actions', createAction);

/** POST /api/panel5/actions/:id/decision */
router.post('/actions/:id/decision', decideAction);

export default router;
