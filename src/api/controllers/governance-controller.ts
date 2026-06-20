import { Request, Response, NextFunction } from 'express';
import { runGovernanceScorer } from '../../governance/scorer';
import type { GovernanceScorerInput } from '../../governance/types';

export async function scoreGovernance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as GovernanceScorerInput;
    const result = runGovernanceScorer(input);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}
