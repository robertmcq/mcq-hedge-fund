import { Request, Response, NextFunction } from 'express';
import { runPortfolioRiskEngine } from '../../panels/panel3-risk/engine';
import type { PortfolioRiskEngineInput } from '../../panels/panel3-risk/types';

export async function evaluatePortfolio(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as PortfolioRiskEngineInput;
    const result = runPortfolioRiskEngine(input);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}
