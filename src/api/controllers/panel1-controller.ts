import { Request, Response, NextFunction } from 'express';
import { runReverseDCF as runReverseDCFEngine } from '../../panels/panel1-dcf/engine';
import type { ReverseDCFInput } from '../../panels/panel1-dcf/types';

export async function runReverseDCF(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as ReverseDCFInput;
    const result = runReverseDCFEngine(input);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}
