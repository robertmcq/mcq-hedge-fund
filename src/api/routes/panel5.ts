import { Router } from 'express';
const router = Router();
/** GET /api/panel5/health */
router.get('/health', (_req, res) => res.json({ ok: true, panel: 5 }));
export default router;
