/**
 * Panel 5 — Postgres-backed workflow service.
 * Drop-in replacement for the in-memory WorkflowState used in panel5-controller.
 * Implements the same approve/modify/reject logic but persists all state to Postgres.
 */

import { withClient } from '../client';
import { createActionItemPg, getActionItemPg, updateActionStatusPg } from './action-item-repository';
import { createApprovalPg } from './approval-repository';
import { appendDecisionLogPg } from './decision-log-repository';
import { createActionItem } from '../../panels/panel5-governance/action-queue';
import { hasPermission } from '../../panels/panel5-governance/utils';
import type {
  ActionItem,
  ApprovalRequest,
  WorkflowResult,
  CreateActionInput,
} from '../../panels/panel5-governance/types';

export async function pgCreateAction(input: CreateActionInput): Promise<ActionItem> {
  return createActionItemPg(input);
}

export async function pgApplyApprovalDecision(
  req: ApprovalRequest
): Promise<WorkflowResult> {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      // 1. Load and lock the action row
      const res = await client.query(
        `SELECT * FROM action_items WHERE action_id = $1 FOR UPDATE`,
        [req.action_id]
      );
      if (!res.rows.length) throw new Error(`Action ${req.action_id} not found`);
      const row = res.rows[0];
      if (row.status !== 'open') throw new Error(`Action ${req.action_id} is not open (status=${row.status})`);

      // 2. Permission checks
      if (!hasPermission(req.user, req.permissions, 'POLICY_VIEW'))
        throw new Error(`User ${req.user.user_id} lacks POLICY_VIEW`);
      if (row.action_type === 'Trade' && req.decision === 'approve') {
        if (!hasPermission(req.user, req.permissions, 'TRADE_APPROVE') || req.role.name !== 'PM')
          throw new Error(`User ${req.user.user_id} lacks TRADE_APPROVE permission or PM role`);
      }

      let newStatus: ActionItem['status'] = req.decision === 'approve' ? 'approved'
        : req.decision === 'reject' ? 'rejected' : 'superseded';

      // 3. Update action status
      await client.query(
        `UPDATE action_items SET status = $1 WHERE action_id = $2`,
        [newStatus, req.action_id]
      );

      // 4. Write approval record
      const approval = await createApprovalPg({
        action_id:          req.action_id,
        user_id:            req.user.user_id,
        decision:           req.decision,
        comment:            req.comment,
        resulting_order_id: req.resulting_order_id,
      });

      // 5. Spawn replacement if modify
      let spawned_action: ActionItem | undefined;
      if (req.decision === 'modify') {
        const spawnInput: CreateActionInput = {
          source_panel:          row.source_panel,
          entity_type:           row.entity_type,
          entity_id:             row.entity_id,
          action_type:           row.action_type,
          priority:              row.priority,
          confidence:            parseFloat(row.confidence),
          rationale_text:        req.comment ?? row.rationale_text,
          proposed_payload_json: req.modified_payload_json ?? row.proposed_payload,
          created_by_agent_flag: false,
        };
        spawned_action = await createActionItemPg(spawnInput);
      }

      // 6. Write audit log
      const log_entry = await appendDecisionLogPg({
        entity_type:   row.entity_type,
        entity_id:     row.entity_id,
        timestamp:     new Date().toISOString(),
        user_id:       req.user.user_id,
        decision_type: req.decision.toUpperCase(),
        context_panel: 'Gov',
        details_json:  { action_id: req.action_id, newStatus, spawned_action_id: spawned_action?.action_id },
      });

      await client.query('COMMIT');

      const affected_action = await getActionItemPg(req.action_id);
      return { state: { action_items: [], approvals: [], decision_log: [] }, affected_action: affected_action ?? undefined, approval, log_entry, spawned_action };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
