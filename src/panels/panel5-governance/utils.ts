/**
 * Panel 5 — Governance Queue & Approval Workflow
 * Utility helpers for permissions and sorting.
 */

import { RolePermission, User, ActionItem } from './types';

export function hasPermission(
  user: User,
  permissions: RolePermission[],
  permissionKey: string
): boolean {
  return permissions.some((p) => p.role_id === user.role_id && p.permission_key === permissionKey);
}

export function sortActionQueue(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'open') return -1;
      if (b.status === 'open') return 1;
    }
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.confidence - a.confidence;
  });
}
