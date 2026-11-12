export interface AuditLogEntry {
  id: string | number;
  table_name: string;
  record_id: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  changed_by?: string | null;
  performed_by?: string | null;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  performed_at?: string;
  changed_at?: string;
  created_at?: string;
}

export interface ActorDirectoryEntry {
  nombre: string;
  email?: string | null;
}

export const SEEDED_ACTOR_DIRECTORY: Record<string, ActorDirectoryEntry> = {
  '11111111-1111-1111-1111-111111111111': {
    nombre: 'Administrador Principal',
    email: 'admin@fondonorma.test',
  },
  '22222222-2222-2222-2222-222222222222': {
    nombre: 'Personal Técnico Certificación',
    email: 'worker@fondonorma.test',
  },
  '33333333-3333-3333-3333-333333333333': {
    nombre: 'Auditor Técnico Evaluador',
    email: 'auditor@fondonorma.test',
  },
  '44444444-4444-4444-4444-444444444444': {
    nombre: 'Representante Organización Cliente',
    email: 'client@fondonorma.test',
  },
};

export interface ResolvedActorDisplay {
  displayName: string;
  email: string | null;
  formatted: string;
}

/**
 * Resolves the human-readable actor name and email without ever exposing raw UUIDs.
 */
export function resolveAuditActorDisplay(
  entry: Pick<AuditLogEntry, 'actor_name' | 'actor_email' | 'performed_by' | 'changed_by' | 'actor_user_id'>,
  actorDirectory?: Record<string, ActorDirectoryEntry>
): ResolvedActorDisplay {
  const actorId = entry.performed_by || entry.changed_by || entry.actor_user_id || null;
  const dirMatch =
    (actorId && actorDirectory?.[actorId]) ||
    (actorId && SEEDED_ACTOR_DIRECTORY[actorId]) ||
    null;

  const email = entry.actor_email || dirMatch?.email || null;
  const displayName =
    entry.actor_name ||
    dirMatch?.nombre ||
    (email ? email.split('@')[0] : actorId ? 'Usuario del Sistema' : 'Sistema de Certificación');

  const formatted = email ? `${displayName} (${email})` : displayName;
  return { displayName, email, formatted };
}

/**
 * Formats an ISO timestamp into a local human-readable date and time string.
 */
export function formatAuditTimestampLocal(
  isoTimestamp: string | null | undefined,
  locale = 'es-ES'
): string {
  if (!isoTimestamp) return 'Sin fecha registrada';
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }
  const datePart = parsed.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timePart = parsed.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timePart}`;
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

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * Formats a raw value safely for display in a diff without exposing raw UUIDs.
 */
export function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  let str: string;
  if (typeof val === 'object') {
    try {
      str = JSON.stringify(val);
    } catch {
      str = String(val);
    }
  } else {
    str = String(val);
  }
  return str.replace(UUID_PATTERN, 'Referencia registrada');
}
