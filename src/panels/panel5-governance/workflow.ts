/**
 * Panel 5 — Governance Queue & Approval Workflow
 * Handles approve / modify / reject transitions, permission checks,
 * and immutable audit log creation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowState,
  ApprovalRequest,
  WorkflowResult,
  ActionItem,
  ActionApproval,
  DecisionLogEntry,
} from './types';
import { hasPermission } from './utils';
import { createActionItem } from './action-queue';

function buildLogEntry(params: {
  action: ActionItem;
  user_id: string;
  decision_type: string;
  details_json: Record<string, unknown>;
}): DecisionLogEntry {
  return {
    decision_id: uuidv4(),
    entity_type: params.action.entity_type,
    entity_id: params.action.entity_id,
    timestamp: new Date().toISOString(),
    user_id: params.user_id,
    decision_type: params.decision_type,
    context_panel: 'Gov',
    details_json: params.details_json,
  };
}

function canApproveTrade(req: ApprovalRequest): boolean {
  return hasPermission(req.user, req.permissions, 'TRADE_APPROVE') && req.role.name === 'PM';
}

function canViewPolicy(req: ApprovalRequest): boolean {
  return hasPermission(req.user, req.permissions, 'POLICY_VIEW');
}

export function applyApprovalDecision(
  state: WorkflowState,
  req: ApprovalRequest
): WorkflowResult {
  const action = state.action_items.find((a) => a.action_id === req.action_id);
  if (!action) throw new Error(`Action ${req.action_id} not found`);
  if (action.status !== 'open') throw new Error(`Action ${req.action_id} is not open`);

  if (!canViewPolicy(req)) {
    throw new Error(`User ${req.user.user_id} is not permitted to review governance items`);
  }

  if (action.action_type === 'Trade' && req.decision === 'approve' && !canApproveTrade(req)) {
    throw new Error(`User ${req.user.user_id} lacks TRADE_APPROVE permission or PM role`);
  }

  const approval: ActionApproval = {
    approval_id: uuidv4(),
    action_id: action.action_id,
    user_id: req.user.user_id,
    decision: req.decision,
    decision_at: new Date().toISOString(),
    comment: req.comment,
    resulting_order_id: req.resulting_order_id,
  };

  let affected_action: ActionItem | undefined;
  let spawned_action: ActionItem | undefined;
  let decision_type = req.decision.toUpperCase();
  let details: Record<string, unknown> = { action_before: action };

  if (req.decision === 'approve') {
    action.status = 'approved';
    affected_action = action;
    details = { ...details, action_after: action, resulting_order_id: req.resulting_order_id };
  }

  if (req.decision === 'reject') {
    action.status = 'rejected';
    affected_action = action;
    details = { ...details, action_after: action, reason: req.comment ?? '' };
  }

  if (req.decision === 'modify') {
    action.status = 'superseded';
    affected_action = action;
    spawned_action = createActionItem({
      source_panel: action.source_panel,
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      action_type: action.action_type,
      priority: action.priority,
      confidence: action.confidence,
      rationale_text: req.comment ?? action.rationale_text,
      proposed_payload_json: req.modified_payload_json ?? action.proposed_payload_json,
      created_by_agent_flag: false,
    });
    state.action_items.push(spawned_action);
    decision_type = 'MODIFY';
    details = {
      ...details,
      superseded_action: action,
      spawned_action,
    };
  }

  state.approvals.push(approval);
  const log_entry = buildLogEntry({
    action,
    user_id: req.user.user_id,
    decision_type,
    details_json: details,
  });
  state.decision_log.push(log_entry);

  return {
    state,
    affected_action,
    approval,
    log_entry,
    spawned_action,
  };
}
