import { Router } from 'express';
const router = Router();
/** GET /api/kalshi/health */
router.get('/health', (_req, res) => res.json({ ok: true, integration: 'kalshi' }));
export default router;
