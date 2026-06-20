/**
 * Panel 5 — Postgres-backed DecisionLog repository.
 * Immutable append-only audit trail.
 */

import { query } from '../client';
import type { DecisionLogEntry } from '../../panels/panel5-governance/types';
import { v4 as uuidv4 } from 'uuid';

function rowToEntry(row: Record<string, unknown>): DecisionLogEntry {
  return {
    decision_id:   row.decision_id as string,
    entity_type:   row.entity_type as string,
    entity_id:     row.entity_id as string,
    timestamp:     (row.occurred_at as Date).toISOString(),
    user_id:       row.user_id as string,
    decision_type: row.decision_type as string,
    context_panel: row.context_panel as string,
    details_json:  row.details as Record<string, unknown>,
  };
}

export async function appendDecisionLogPg(
  entry: Omit<DecisionLogEntry, 'decision_id'>
): Promise<DecisionLogEntry> {
  const id = uuidv4();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO decision_log
       (decision_id, entity_type, entity_id, user_id, decision_type, context_panel, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      id,
      entry.entity_type,
      entry.entity_id,
      entry.user_id,
      entry.decision_type,
      entry.context_panel,
      JSON.stringify(entry.details_json),
    ]
  );
  return rowToEntry(rows[0]);
}

export async function getDecisionLogPg(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<DecisionLogEntry[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM decision_log
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY occurred_at DESC
     LIMIT $3`,
    [entityType, entityId, limit]
  );
  return rows.map(rowToEntry);
}
