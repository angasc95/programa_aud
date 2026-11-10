export type UserRole = 'ADMIN' | 'WORKER' | 'AUDITOR' | 'CLIENT';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'WORKER', 'AUDITOR', 'CLIENT'];

export interface UserProfile {
  id: string;
  nombre: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface TestAccount {
  label: string;
  role: UserRole;
  email: string;
  password: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  {
    label: 'Admin',
    role: 'ADMIN',
    email: 'admin@fondonorma.test',
    password: 'Password123*',
  },
  {
    label: 'Worker',
    role: 'WORKER',
    email: 'worker@fondonorma.test',
    password: 'Password123*',
  },
  {
    label: 'Auditor',
    role: 'AUDITOR',
    email: 'auditor@fondonorma.test',
    password: 'Password123*',
  },
  {
    label: 'Client',
    role: 'CLIENT',
    email: 'client@fondonorma.test',
    password: 'Password123*',
  },
];

export interface AdminAccessResult {
  allowed: boolean;
  reason: string;
}

export type CheckState = 'pending' | 'pass' | 'warn' | 'fail';

export interface HealthCheckItem {
  id: string;
  label: string;
  description: string;
  state: CheckState;
  detail: string;
  durationMs?: number;
}

export interface HealthSummary {
  overall: 'operational' | 'attention' | 'offline' | 'checking';
  headline: string;
  subtext: string;
  passedCount: number;
  totalCount: number;
  avgLatencyMs: number | null;
}

export type ProfileFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

/**
 * Verifies that the authenticated user has an APPROVED ADMIN profile.
 */
export function evaluateAdminAccess(profile: UserProfile | null | undefined): AdminAccessResult {
  if (!profile) {
    return {
      allowed: false,
      reason: 'No user profile was found for this account.',
    };
  }

  if (profile.status !== 'APPROVED') {
    return {
      allowed: false,
      reason: `Your account status is currently ${profile.status}. Administrator approval is required.`,
    };
  }

  if (profile.role !== 'ADMIN') {
    return {
      allowed: false,
      reason: `Signed in with role ${profile.role}. Only ADMIN users can access this section.`,
    };
  }

  return {
    allowed: true,
    reason: 'Administrator access verified.',
  };
}

/**
 * Filters profile rows by approval status for the Admin User Approvals screen.
 */
export function filterProfilesByStatus(
  profiles: UserProfile[],
  filter: ProfileFilter
): UserProfile[] {
  if (filter === 'ALL') return profiles;
  return profiles.filter((p) => p.status === filter);
}

/**
 * Prevents an admin from rejecting their own active admin profile.
 */
export function canModifyProfileStatus(
  targetProfileId: string,
  currentUserId: string
): boolean {
  return targetProfileId !== currentUserId;
}

/**
 * Validates whether a string is a supported UserRole.
 */
export function isValidUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Allows changing role only on APPROVED accounts other than the current admin's own account.
 */
export function canModifyProfileRole(
  targetProfileId: string,
  currentUserId: string,
  targetStatus: UserStatus
): boolean {
  return targetProfileId !== currentUserId && targetStatus === 'APPROVED';
}

/**
 * Checks whether a role change request represents a valid transition to a different role.
 */
export function shouldUpdateProfileRole(
  currentRole: UserRole,
  nextRole: string
): nextRole is UserRole {
  return isValidUserRole(nextRole) && nextRole !== currentRole;
}

/**
 * Filters and sorts .sql filenames in deterministic ascending order (e.g. 00_... to 06_...).
 */
export function sortSqlFiles(filenames: string[]): string[] {
  return filenames
    .filter((name) => name.toLowerCase().endsWith('.sql'))
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Extracts the Supabase project reference subdomain from a project URL.
 */
export function extractSupabaseProjectRef(supabaseUrl: string): string | null {
  try {
    const parsed = new URL(supabaseUrl.trim());
    const [ref] = parsed.hostname.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * Formats a concise confirmation message after running SQL reset scripts.
 */
export function formatResetSummary(executedFiles: string[], totalDurationMs?: number): string {
  if (executedFiles.length === 0) {
    return 'No SQL scripts were executed.';
  }
  const rangeLabel =
    executedFiles.length === 1
      ? executedFiles[0]
      : `${executedFiles[0]} → ${executedFiles[executedFiles.length - 1]}`;
  const timing =
    typeof totalDurationMs === 'number' && Number.isFinite(totalDurationMs)
      ? ` in ${(totalDurationMs / 1000).toFixed(1)}s`
      : '';
  return `Database reset complete. Executed ${executedFiles.length} SQL scripts in order (${rangeLabel})${timing}.`;
}

/**
 * Formats an ISO date string into a clean human-readable date.
 */
export function formatDisplayDate(iso?: string): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Summarizes individual check states into a plain-English overall verdict.
 */
export function summarizeHealthChecks(checks: HealthCheckItem[]): HealthSummary {
  const totalCount = checks.length;
  const passedCount = checks.filter((c) => c.state === 'pass').length;
  const failedCount = checks.filter((c) => c.state === 'fail').length;
  const warnCount = checks.filter((c) => c.state === 'warn').length;
  const pendingCount = checks.filter((c) => c.state === 'pending').length;

  const durations = checks
    .map((c) => c.durationMs)
    .filter((d): d is number => typeof d === 'number' && Number.isFinite(d) && d >= 0);

  const avgLatencyMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length)
      : null;

  if (pendingCount > 0 && pendingCount === totalCount) {
    return {
      overall: 'checking',
      headline: 'Checking database...',
      subtext: 'Verifying connection, permissions, and core tables.',
      passedCount,
      totalCount,
      avgLatencyMs,
    };
  }

  if (pendingCount > 0) {
    return {
      overall: 'checking',
      headline: 'Running health checks...',
      subtext: `${passedCount} of ${totalCount} checks verified so far.`,
      passedCount,
      totalCount,
      avgLatencyMs,
    };
  }

  if (failedCount === totalCount && totalCount > 0) {
    return {
      overall: 'offline',
      headline: 'Database unreachable',
      subtext: 'Unable to reach Supabase services. Check network or credentials.',
      passedCount,
      totalCount,
      avgLatencyMs,
    };
  }

  if (failedCount > 0 || warnCount > 0) {
    return {
      overall: 'attention',
      headline: 'Attention needed',
      subtext: `${passedCount} of ${totalCount} checks passed. Review flagged items below.`,
      passedCount,
      totalCount,
      avgLatencyMs,
    };
  }

  return {
    overall: 'operational',
    headline: 'Database is working normally',
    subtext: `All ${totalCount} checks passed without issues`,
    passedCount,
    totalCount,
    avgLatencyMs,
  };
}

/**
 * Translates technical PostgreSQL / Supabase errors into plain-English explanations.
 */
export function translateDatabaseError(err: unknown): string {
  if (!err) return 'Unknown error occurred.';

  const obj = typeof err === 'object' ? (err as { code?: string; message?: string }) : null;
  const message = obj?.message || (typeof err === 'string' ? err : 'Unexpected error');
  const code = obj?.code || '';
  const lower = message.toLowerCase();

  if (code === '42501' || lower.includes('permission denied')) {
    return 'Permission denied by database security rules. Verify administrator privileges.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address using the link sent to your inbox before signing in.';
  }

  if (lower.includes('user already registered')) {
    return 'An account with this email address already exists. Try signing in instead.';
  }

  if (lower.includes('database error querying schema')) {
    return 'Sign-in failed due to an authentication record issue in the database. Re-run 05_usuarios.sql in Supabase.';
  }

  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Could not reach the database server. Check your internet connection.';
  }

  if (code === 'PGRST205' || lower.includes('could not find the table')) {
    return 'Expected table was not found in the database schema.';
  }

  return message;
}
