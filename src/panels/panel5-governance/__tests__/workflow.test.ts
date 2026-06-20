import { describe, it, expect } from 'vitest';
import { createActionItem } from '../action-queue';
import { applyApprovalDecision } from '../workflow';
import type { WorkflowState, User, Role, RolePermission } from '../types';

const pmRole: Role = { role_id: 'role-pm', name: 'PM', description: 'Portfolio Manager' };
const analystRole: Role = { role_id: 'role-analyst', name: 'Analyst', description: 'Analyst' };

const pmUser: User = {
  user_id: 'user-pm',
  name: 'PM User',
  email: 'pm@example.com',
  role_id: 'role-pm',
  status: 'active',
};

const analystUser: User = {
  user_id: 'user-analyst',
  name: 'Analyst User',
  email: 'analyst@example.com',
  role_id: 'role-analyst',
  status: 'active',
};

const permissions: RolePermission[] = [
  { role_id: 'role-pm', permission_key: 'TRADE_APPROVE' },
  { role_id: 'role-pm', permission_key: 'POLICY_VIEW' },
  { role_id: 'role-analyst', permission_key: 'POLICY_VIEW' },
];

function buildState(): WorkflowState {
  return {
    action_items: [
      createActionItem({
        source_panel: 'Risk',
        entity_type: 'portfolio',
        entity_id: 'pf-001',
        action_type: 'Trade',
        priority: 1,
        confidence: 0.91,
        rationale_text: 'Reduce leverage after breach',
        proposed_payload_json: { side: 'SELL', ticker: 'AAPL', quantity: 50 },
      }),
    ],
    approvals: [],
    decision_log: [],
  };
}

describe('panel5 governance workflow', () => {
  it('PM can approve a trade action', () => {
    const state = buildState();
    const action = state.action_items[0];
    const result = applyApprovalDecision(state, {
      action_id: action.action_id,
      user: pmUser,
      role: pmRole,
      permissions,
      decision: 'approve',
      comment: 'Approved for execution',
      resulting_order_id: 'ord-001',
    });

    expect(result.affected_action?.status).toBe('approved');
    expect(result.approval?.decision).toBe('approve');
    expect(result.log_entry?.decision_type).toBe('APPROVE');
  });

  it('Analyst cannot approve a trade action', () => {
    const state = buildState();
    const action = state.action_items[0];

    expect(() =>
      applyApprovalDecision(state, {
        action_id: action.action_id,
        user: analystUser,
        role: analystRole,
        permissions,
        decision: 'approve',
      })
    ).toThrow(/lacks TRADE_APPROVE permission/i);
  });

  it('modify supersedes original and spawns a new action', () => {
    const state = buildState();
    const action = state.action_items[0];
    const result = applyApprovalDecision(state, {
      action_id: action.action_id,
      user: pmUser,
      role: pmRole,
      permissions,
      decision: 'modify',
      comment: 'Cut quantity to 25',
      modified_payload_json: { side: 'SELL', ticker: 'AAPL', quantity: 25 },
    });

    expect(result.affected_action?.status).toBe('superseded');
    expect(result.spawned_action).toBeDefined();
    expect(result.spawned_action?.status).toBe('open');
    expect(result.spawned_action?.created_by_agent_flag).toBe(false);
  });

  it('reject closes the action and logs the reason', () => {
    const state = buildState();
    const action = state.action_items[0];
    const result = applyApprovalDecision(state, {
      action_id: action.action_id,
      user: pmUser,
      role: pmRole,
      permissions,
      decision: 'reject',
      comment: 'Not enough liquidity',
    });

    expect(result.affected_action?.status).toBe('rejected');
    expect(result.log_entry?.details_json).toBeDefined();
  });
});
