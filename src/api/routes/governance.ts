import { Router } from 'express';
const router = Router();
/** GET /api/governance/health */
router.get('/health', (_req, res) => res.json({ ok: true, panel: 'governance' }));
export default router;
