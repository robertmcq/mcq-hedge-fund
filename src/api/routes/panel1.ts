import { Router } from 'express';
const router = Router();
/** GET /api/panel1/health */
router.get('/health', (_req, res) => res.json({ ok: true, panel: 1 }));
export default router;
