import { Request, Response, NextFunction } from 'express';
import { createActionItem } from '../../panels/panel5-governance/action-queue';
import { applyApprovalDecision } from '../../panels/panel5-governance/workflow';
import type {
  CreateActionInput,
  ApprovalRequest,
  WorkflowState,
} from '../../panels/panel5-governance/types';

// In-memory state — swap for a DB-backed repository in production.
const workflowState: WorkflowState = {
  action_items: [],
  approvals: [],
  decision_log: [],
};

export async function createAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as CreateActionInput;
    const action = createActionItem(input);
    workflowState.action_items.push(action);
    res.status(201).json({ ok: true, data: action });
  } catch (err) {
    next(err);
  }
}

export async function decideAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as Omit<ApprovalRequest, 'action_id'>;
    const result = applyApprovalDecision(workflowState, { ...body, action_id: id });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listActions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({ ok: true, data: workflowState.action_items });
  } catch (err) {
    next(err);
  }
}
