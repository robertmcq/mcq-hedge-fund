import { Router } from 'express';
import { portfolioStore } from '../../state/portfolio-store';
const router = Router();

/** GET /api/panel3/portfolio/:id */
router.get('/portfolio/:id', (req, res) => {
  const entry = portfolioStore.getPortfolio(req.params.id);
  if (!entry) return res.status(404).json({ ok: false, error: 'Portfolio not found' });
  return res.json({ ok: true, data: entry });
});

/** GET /api/panel3/portfolios */
router.get('/portfolios', (_req, res) => {
  res.json({ ok: true, data: portfolioStore.allPortfolios() });
});

export default router;
