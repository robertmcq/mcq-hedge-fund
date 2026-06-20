/**
 * Panel 5 — Postgres-backed ActionItem repository.
 * Replaces the in-memory WorkflowState.action_items array.
 */

import { query } from '../client';
import type { ActionItem, CreateActionInput } from '../../panels/panel5-governance/types';
import { v4 as uuidv4 } from 'uuid';

function rowToActionItem(row: Record<string, unknown>): ActionItem {
  return {
    action_id:            row.action_id as string,
    created_at:           (row.created_at as Date).toISOString(),
    source_panel:         row.source_panel as ActionItem['source_panel'],
    entity_type:          row.entity_type as ActionItem['entity_type'],
    entity_id:            row.entity_id as string,
    action_type:          row.action_type as ActionItem['action_type'],
    priority:             row.priority as number,
    confidence:           parseFloat(row.confidence as string),
    rationale_text:       row.rationale_text as string,
    proposed_payload_json: row.proposed_payload as Record<string, unknown>,
    status:               row.status as ActionItem['status'],
    created_by_agent_flag: row.agent_created as boolean,
  };
}

export async function createActionItemPg(input: CreateActionInput): Promise<ActionItem> {
  const id = uuidv4();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO action_items
       (action_id, source_panel, entity_type, entity_id, action_type,
        priority, confidence, rationale_text, proposed_payload, status, agent_created)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
     RETURNING *`,
    [
      id,
      input.source_panel,
      input.entity_type,
      input.entity_id,
      input.action_type,
      input.priority,
      input.confidence,
      input.rationale_text,
      JSON.stringify(input.proposed_payload_json),
      input.created_by_agent_flag ?? true,
    ]
  );
  return rowToActionItem(rows[0]);
}

export async function getActionItemPg(actionId: string): Promise<ActionItem | null> {
  const rows = await query<Record<string, unknown>>(
    'SELECT * FROM action_items WHERE action_id = $1',
    [actionId]
  );
  return rows.length ? rowToActionItem(rows[0]) : null;
}

export async function listActionItemsPg(filter?: {
  status?: string;
  entity_type?: string;
  entity_id?: string;
}): Promise<ActionItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filter?.status) { conditions.push(`status = $${i++}`); params.push(filter.status); }
  if (filter?.entity_type) { conditions.push(`entity_type = $${i++}`); params.push(filter.entity_type); }
  if (filter?.entity_id) { conditions.push(`entity_id = $${i++}`); params.push(filter.entity_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM action_items ${where} ORDER BY priority ASC, confidence DESC, created_at DESC`,
    params
  );
  return rows.map(rowToActionItem);
}

export async function updateActionStatusPg(
  actionId: string,
  status: ActionItem['status']
): Promise<ActionItem | null> {
  const rows = await query<Record<string, unknown>>(
    `UPDATE action_items SET status = $1 WHERE action_id = $2 RETURNING *`,
    [status, actionId]
  );
  return rows.length ? rowToActionItem(rows[0]) : null;
}
