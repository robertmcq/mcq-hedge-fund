/**
 * Handler: ActionDecision
 * 1. Applies approve/modify/reject through Panel 5 workflow.
 * 2. If approved and payload contains a trade, emits TradeExecuted.
 */

import { bus } from '../bus';
import type { DomainEvent, ActionDecisionPayload } from '../types';
import { publish } from '../publisher';

// In-memory workflow state (swap for pgApplyApprovalDecision when DB is live)
import { applyApprovalDecision } from '../../panels/panel5-governance/workflow';
import type { WorkflowState, User, Role, RolePermission } from '../../panels/panel5-governance/types';

// Shared in-memory state — same instance as panel5-controller
const internalState: WorkflowState = {
  action_items: [],
  approvals: [],
  decision_log: [],
};

// Default PM user for agent-initiated decisions (replace with real auth in production)
const agentUser: User = {
  user_id: 'agent',
  name:    'MCQ Agent',
  email:   'agent@mcq.internal',
  role_id: 'role-pm',
  status:  'active',
};
const agentRole: Role = { role_id: 'role-pm', name: 'PM', description: 'Agent PM' };
const agentPermissions: RolePermission[] = [
  { role_id: 'role-pm', permission_key: 'TRADE_APPROVE' },
  { role_id: 'role-pm', permission_key: 'POLICY_VIEW' },
];

bus.subscribe<ActionDecisionPayload>(
  'ActionDecision',
  async (event: DomainEvent<ActionDecisionPayload>) => {
    const { action_id, decision, user_id, comment, modified_payload_json, resulting_order_id } =
      event.payload;

    console.log(`[ActionDecision] action=${action_id} decision=${decision} by=${user_id}`);

    let result;
    try {
      result = applyApprovalDecision(internalState, {
        action_id,
        decision,
        user:        agentUser,
        role:        agentRole,
        permissions: agentPermissions,
        comment,
        modified_payload_json,
        resulting_order_id,
      });
    } catch (err) {
      console.error('[ActionDecision] Workflow error:', (err as Error).message);
      return;
    }

    console.log(
      `[ActionDecision] ${decision.toUpperCase()} ` +
      `action=${action_id} ` +
      `status=${result.affected_action?.status}`
    );

    // If approved and payload is a Trade, emit TradeExecuted
    if (decision === 'approve' && result.affected_action) {
      const payload = result.affected_action.proposed_payload_json as Record<string, unknown>;
      if (
        result.affected_action.action_type === 'Trade' &&
        payload.portfolio_id && payload.security_id &&
        payload.side && payload.quantity && payload.price
      ) {
        await publish.tradeExecuted({
          portfolio_id: payload.portfolio_id as string,
          security_id:  payload.security_id as string,
          side:         payload.side as 'long' | 'short',
          quantity:     payload.quantity as number,
          price:        payload.price as number,
          strategy_id:  payload.strategy_id as string | undefined,
          executed_at:  new Date().toISOString(),
        });
      }
    }
  }
);
