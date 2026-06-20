import { Request, Response, NextFunction } from 'express';
import { runPanel2Engine } from '../../panels/panel2-comps/engine';
import type { Panel2EngineInput } from '../../panels/panel2-comps/types';

export async function runComps(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as Panel2EngineInput;
    const result = runPanel2Engine(input);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}
