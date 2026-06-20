/**
 * Panel 5 — Governance Queue & Approval Workflow
 * Types for action queue, approvals, permissions, and audit log.
 */

export type ActionType = 'Trade' | 'Research' | 'Governance';
export type ActionStatus = 'open' | 'approved' | 'rejected' | 'deferred' | 'superseded';
export type SourcePanel = 'Expectations' | 'Comps' | 'Risk' | 'Backtest' | 'Gov';
export type EntityType = 'security' | 'portfolio' | 'strategy' | 'agent';
export type ApprovalDecision = 'approve' | 'modify' | 'reject';

export interface ActionItem {
  action_id: string;
  created_at: string;
  source_panel: SourcePanel;
  entity_type: EntityType;
  entity_id: string;
  action_type: ActionType;
  priority: number;
  confidence: number;
  rationale_text: string;
  proposed_payload_json: Record<string, unknown>;
  status: ActionStatus;
  created_by_agent_flag: boolean;
}

export interface ActionApproval {
  approval_id: string;
  action_id: string;
  user_id: string;
  decision: ApprovalDecision;
  decision_at: string;
  comment?: string;
  resulting_order_id?: string;
}

export interface DecisionLogEntry {
  decision_id: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  user_id: string;
  decision_type: string;
  context_panel: string;
  details_json: Record<string, unknown>;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  role_id: string;
  status: 'active' | 'inactive';
}

export interface Role {
  role_id: string;
  name: 'PM' | 'Risk' | 'Analyst' | 'Ops' | 'ReadOnly';
  description: string;
}

export interface RolePermission {
  role_id: string;
  permission_key: string;
}

export interface WorkflowState {
  action_items: ActionItem[];
  approvals: ActionApproval[];
  decision_log: DecisionLogEntry[];
}

export interface CreateActionInput {
  source_panel: SourcePanel;
  entity_type: EntityType;
  entity_id: string;
  action_type: ActionType;
  priority: number;
  confidence: number;
  rationale_text: string;
  proposed_payload_json: Record<string, unknown>;
  created_by_agent_flag?: boolean;
}

export interface ApprovalRequest {
  action_id: string;
  user: User;
  role: Role;
  permissions: RolePermission[];
  decision: ApprovalDecision;
  comment?: string;
  modified_payload_json?: Record<string, unknown>;
  resulting_order_id?: string;
}

export interface WorkflowResult {
  state: WorkflowState;
  affected_action?: ActionItem;
  approval?: ActionApproval;
  log_entry?: DecisionLogEntry;
  spawned_action?: ActionItem;
}
