export interface AuditLogEntry {
  id: string | number;
  table_name: string;
  record_id: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  changed_by?: string | null;
  actor_user_id?: string | null;
  actor_email?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  changed_at?: string;
  created_at?: string;
}

export interface FieldDiff {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  hasChanged: boolean;
}

/**
 * Computes modified field diffs between old_data and new_data.
 */
export function computeFieldDiffs(
  oldData: Record<string, unknown> | null | undefined,
  newData: Record<string, unknown> | null | undefined,
  action: string
): FieldDiff[] {
  if (action === 'INSERT') {
    if (!newData) return [];
    return Object.entries(newData).map(([fieldName, newValue]) => ({
      fieldName,
      oldValue: null,
      newValue,
      hasChanged: true,
    }));
  }

  if (action === 'DELETE') {
    if (!oldData) return [];
    return Object.entries(oldData).map(([fieldName, oldValue]) => ({
      fieldName,
      oldValue,
      newValue: null,
      hasChanged: true,
    }));
  }

  // UPDATE
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  const diffs: FieldDiff[] = [];

  for (const key of allKeys) {
    // Skip internal technical metadata keys for cleaner user diffs
    if (key === 'updated_at' || key === 'created_at') continue;

    const oldVal = oldData?.[key];
    const newVal = newData?.[key];

    const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
    if (hasChanged) {
      diffs.push({
        fieldName: key,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null,
        hasChanged: true,
      });
    }
  }

  return diffs;
}

/**
 * Formats operation action visual badges.
 */
export function getActionVisualMeta(action: string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (action.toUpperCase()) {
    case 'INSERT':
      return {
        label: 'CREACIÓN (INSERT)',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '➕',
      };
    case 'UPDATE':
      return {
        label: 'MODIFICACIÓN (UPDATE)',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        symbol: '✏️',
      };
    case 'DELETE':
      return {
        label: 'ELIMINACIÓN (DELETE)',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        symbol: '🗑️',
      };
    default:
      return {
        label: action,
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        symbol: '📋',
      };
  }
}

/**
 * Formats a raw value safely for display in a diff.
 */
export function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}
