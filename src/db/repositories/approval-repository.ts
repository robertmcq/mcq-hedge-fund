/**
 * Panel 5 — Postgres-backed ActionApproval repository.
 */

import { query } from '../client';
import type { ActionApproval } from '../../panels/panel5-governance/types';
import { v4 as uuidv4 } from 'uuid';

function rowToApproval(row: Record<string, unknown>): ActionApproval {
  return {
    approval_id:        row.approval_id as string,
    action_id:          row.action_id as string,
    user_id:            row.user_id as string,
    decision:           row.decision as ActionApproval['decision'],
    decision_at:        (row.decision_at as Date).toISOString(),
    comment:            row.comment as string | undefined,
    resulting_order_id: row.resulting_order_id as string | undefined,
  };
}

export async function createApprovalPg(
  approval: Omit<ActionApproval, 'approval_id' | 'decision_at'>
): Promise<ActionApproval> {
  const id = uuidv4();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO action_approvals
       (approval_id, action_id, user_id, decision, comment, resulting_order_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      id,
      approval.action_id,
      approval.user_id,
      approval.decision,
      approval.comment ?? null,
      approval.resulting_order_id ?? null,
    ]
  );
  return rowToApproval(rows[0]);
}

export async function getApprovalsByActionPg(actionId: string): Promise<ActionApproval[]> {
  const rows = await query<Record<string, unknown>>(
    'SELECT * FROM action_approvals WHERE action_id = $1 ORDER BY decision_at DESC',
    [actionId]
  );
  return rows.map(rowToApproval);
}
