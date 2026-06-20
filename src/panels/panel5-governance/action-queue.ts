/**
 * Panel 5 — Governance Queue & Approval Workflow
 * Create action items for Panel 5 queue.
 */

import { v4 as uuidv4 } from 'uuid';
import { ActionItem, CreateActionInput } from './types';

export function createActionItem(input: CreateActionInput): ActionItem {
  return {
    action_id: uuidv4(),
    created_at: new Date().toISOString(),
    source_panel: input.source_panel,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    action_type: input.action_type,
    priority: input.priority,
    confidence: input.confidence,
    rationale_text: input.rationale_text,
    proposed_payload_json: input.proposed_payload_json,
    status: 'open',
    created_by_agent_flag: input.created_by_agent_flag ?? true,
  };
}
