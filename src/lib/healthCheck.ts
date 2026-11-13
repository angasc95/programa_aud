import { containsRawUuid } from './zeroUuid';

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

export type DomainRoute = 'auditorias' | 'certificacion' | 'extra';
export type ActiveRoute = 'dashboard' | 'profile' | 'approvals' | 'database' | DomainRoute;

export interface RoleVisualMeta {
  role: UserRole;
  label: string;
  symbol: string;
  tooltip: string;
  badgeClass: string;
}

export interface StatusVisualMeta {
  status: UserStatus;
  label: string;
  symbol: string;
  tooltip: string;
  badgeClass: string;
}

export interface DomainNavItem {
  id: string;
  label: string;
  symbol: string;
  tooltip: string;
}

export interface DomainMenuSpec {
  id: DomainRoute;
  label: string;
  symbol: string;
  tooltip: string;
  items: DomainNavItem[];
}

export interface UserIdentityDisplay {
  icon: string;
  name: string;
  displayNameWithRoleOrStatus: string;
  subtitle: string;
  tooltip: string;
  isApproved: boolean;
  status: UserStatus;
  role: UserRole;
  suppressRoleIcon: boolean;
}

export function getUserIdentityDisplay(profile: UserProfile): UserIdentityDisplay {
  const isApproved = profile.status === 'APPROVED';

  if (!isApproved) {
    if (profile.status === 'REJECTED') {
      return {
        icon: '❌',
        name: profile.nombre,
        displayNameWithRoleOrStatus: `${profile.nombre} (Rechazado)`,
        subtitle: 'Rechazado',
        tooltip: 'REJECTED — Solicitud de cuenta declinada por un administrador',
        isApproved: false,
        status: 'REJECTED',
        role: profile.role,
        suppressRoleIcon: true,
      };
    }
    // PENDING
    return {
      icon: '⏳',
      name: profile.nombre,
      displayNameWithRoleOrStatus: `${profile.nombre} (Pendiente)`,
      subtitle: 'Pendiente',
      tooltip: 'PENDING — En espera de aprobación por un administrador',
      isApproved: false,
      status: 'PENDING',
      role: profile.role,
      suppressRoleIcon: true,
    };
  }

  let roleIcon = '🏢';
  let roleName = 'Cliente';
  let tooltip = 'CLIENT — Portal de organización cliente';

  switch (profile.role) {
    case 'ADMIN':
      roleIcon = '🛡️';
      roleName = 'Administrador';
      tooltip = 'ADMIN — Control administrativo total de usuarios, catálogos y gobernanza';
      break;
    case 'WORKER':
      roleIcon = '⚙️';
      roleName = 'Coordinador';
      tooltip = 'WORKER — Coordinador de operaciones de certificación y auditorías';
      break;
    case 'AUDITOR':
      roleIcon = '📋';
      roleName = 'Auditor';
      tooltip = 'AUDITOR — Evaluador técnico calificado para auditorías y hallazgos';
      break;
    case 'CLIENT':
    default:
      roleIcon = '🏢';
      roleName = 'Cliente';
      tooltip = 'CLIENT — Portal de organización cliente titular';
      break;
  }

  return {
    icon: roleIcon,
    name: profile.nombre,
    displayNameWithRoleOrStatus: `${profile.nombre} (${roleName})`,
    subtitle: roleName,
    tooltip,
    isApproved: true,
    status: 'APPROVED',
    role: profile.role,
    suppressRoleIcon: false,
  };
}

export function getRoleVisualMeta(role: UserRole): RoleVisualMeta {
  switch (role) {
    case 'ADMIN':
      return {
        role,
        label: 'ADMIN',
        symbol: '🛡️',
        tooltip: 'ADMIN — Full administrative control over users, catalogs, and system data',
        badgeClass: 'bg-slate-900 text-white border-slate-900',
      };
    case 'WORKER':
      return {
        role,
        label: 'WORKER',
        symbol: '⚙️',
        tooltip: 'WORKER — Operational coordinator for organizations, certificates, and audits',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      };
    case 'AUDITOR':
      return {
        role,
        label: 'AUDITOR',
        symbol: '📋',
        tooltip: 'AUDITOR — Technical evaluator assigned to field audits and findings',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    case 'CLIENT':
    default:
      return {
        role: 'CLIENT',
        label: 'CLIENT',
        symbol: '🏢',
        tooltip: 'CLIENT — Client organization portal with scoped read access',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export function getStatusVisualMeta(status: UserStatus): StatusVisualMeta {
  switch (status) {
    case 'APPROVED':
      return {
        status,
        label: 'APPROVED',
        symbol: '✓',
        tooltip: 'APPROVED — Account verified with active workspace access',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'REJECTED':
      return {
        status,
        label: 'REJECTED',
        symbol: '❌',
        tooltip: 'REJECTED — Account request declined by an administrator',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'PENDING':
    default:
      return {
        status: 'PENDING',
        label: 'PENDING',
        symbol: '⏳',
        tooltip: 'PENDING — Awaiting administrator review and approval',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
  }
}

export function getVisibleDomainMenus(
  profile: UserProfile | null | undefined
): DomainMenuSpec[] {
  if (!profile || profile.status !== 'APPROVED') {
    return [];
  }

  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';
  const isAuditor = profile.role === 'AUDITOR';
  const isClient = profile.role === 'CLIENT';

  const menus: DomainMenuSpec[] = [];

  // BLOCK 1: Auditoría [ Programación | Calendario | Resultado ]
  if (isStaff || isAuditor || isClient) {
    const auditItems: DomainNavItem[] = [
      {
        id: 'scheduling',
        label: 'Programación',
        symbol: '🗓️',
        tooltip: 'Planificación de auditorías, equipo evaluador, muestreo y matriz normativa',
      },
      {
        id: 'calendar',
        label: 'Calendario',
        symbol: '📆',
        tooltip: 'Agenda cronológica mensual/trimestral, Timeline Gantt y conflictos',
      },
      {
        id: 'findings',
        label: 'Resultado',
        symbol: '📋',
        tooltip: 'Tablero de hallazgos ISO 19011 y recomendación de emisión ISO/IEC 17021-1',
      },
    ];

    menus.push({
      id: 'auditorias',
      label: 'Auditoría',
      symbol: '📅',
      tooltip: 'BLOCK 1: Auditoría — Programación, Calendario y Resultado',
      items: auditItems,
    });
  }

  // BLOCK 2: Certificación [ Organización | Certificado | Auditor ]
  if (isStaff || isClient) {
    const certItems: DomainNavItem[] = [
      {
        id: 'organizations',
        label: 'Organización',
        symbol: '🏢',
        tooltip: 'Organizaciones clientes titulares y acceso autorizado',
      },
      {
        id: 'certificates',
        label: 'Certificado',
        symbol: '📜',
        tooltip: 'Certificados emitidos y avance de cobertura normativa',
      },
      {
        id: 'auditors',
        label: 'Auditor',
        symbol: '👤',
        tooltip: 'Cuerpo de auditores técnicos calificados y liderazgo evaluador',
      },
    ];

    menus.push({
      id: 'certificacion',
      label: 'Certificación',
      symbol: '🏛️',
      tooltip: 'BLOCK 2: Certificación — Organización, Certificado y Auditor',
      items: certItems,
    });
  }

  // BLOCK 3: Extra [ Norma | Sector IAF | Acreditación | Estatus | Tipo | Metodología ]
  menus.push({
    id: 'extra',
    label: 'Extra',
    symbol: '📚',
    tooltip: 'BLOCK 3: Extra — Norma, Sector IAF, Acreditación, Estatus, Tipo y Metodología',
    items: [
      {
        id: 'standards',
        label: 'Norma',
        symbol: '📘',
        tooltip: 'Esquemas y normas certificables ISO',
      },
      {
        id: 'iaf',
        label: 'Sector IAF',
        symbol: '🏭',
        tooltip: 'Sectores técnicos y sub-sectores de acreditación IAF',
      },
      {
        id: 'accreditations',
        label: 'Acreditación',
        symbol: '🏅',
        tooltip: 'Organismos de acreditación y alcance Norma × Sector IAF',
      },
      {
        id: 'estatus',
        label: 'Estatus',
        symbol: '🏷️',
        tooltip: 'Catálogo de estatus canónicos de auditorías y certificados',
      },
      {
        id: 'tipos',
        label: 'Tipo',
        symbol: '📑',
        tooltip: 'Tipos de auditoría de certificación (Etapa 1, 2, Vigilancia...)',
      },
      {
        id: 'metodologias',
        label: 'Metodología',
        symbol: '🌐',
        tooltip: 'Metodologías de auditoría (Presencial, Remota, Híbrida)',
      },
    ],
  });

  return menus;
}

export function canAccessRoute(
  profile: UserProfile | null | undefined,
  route: ActiveRoute
): boolean {
  if (!profile) return false;
  if (route === 'dashboard' || route === 'profile') return true;
  if (route === 'approvals') {
    return profile.status === 'APPROVED' && (profile.role === 'ADMIN' || profile.role === 'WORKER');
  }
  if (route === 'database') {
    return evaluateAdminAccess(profile).allowed;
  }
  return getVisibleDomainMenus(profile).some((menu) => menu.id === route);
}

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

export interface SelfProfileUpdatePayload {
  nombre: string;
}

export type SelfProfileUpdateValidationResult =
  | { ok: true; payload: SelfProfileUpdatePayload }
  | { ok: false; error: string };

/**
 * Pure validator for self-service profile name updates (Phase 2.2).
 * Trims whitespace, enforces 2..150 character bounds, rejects raw UUIDs,
 * and returns strictly `{ nombre }` — never allowing `role` or `status` mutations.
 */
export function buildSelfProfileUpdatePayload(
  rawNombre: string
): SelfProfileUpdateValidationResult {
  const trimmed = typeof rawNombre === 'string' ? rawNombre.trim() : '';
  if (!trimmed) {
    return {
      ok: false,
      error: 'El nombre completo es obligatorio y no puede estar vacío.',
    };
  }
  if (trimmed.length < 2) {
    return {
      ok: false,
      error: 'El nombre debe tener al menos 2 caracteres.',
    };
  }
  if (trimmed.length > 150) {
    return {
      ok: false,
      error: 'El nombre no puede superar los 150 caracteres.',
    };
  }
  if (containsRawUuid(trimmed)) {
    return {
      ok: false,
      error: 'El nombre no puede contener identificadores UUID internos.',
    };
  }
  return {
    ok: true,
    payload: { nombre: trimmed },
  };
}

export type PasswordChangeValidationResult =
  | { ok: true; password: string }
  | { ok: false; error: string };

/**
 * Pure validator for optional self-service password updates.
 */
export function validatePasswordChangeInput(
  password: string,
  confirmPassword: string
): PasswordChangeValidationResult {
  if (!password || password.length < 8) {
    return {
      ok: false,
      error: 'La nueva contraseña debe tener al menos 8 caracteres.',
    };
  }
  if (password !== confirmPassword) {
    return {
      ok: false,
      error: 'Las contraseñas ingresadas no coinciden.',
    };
  }
  return {
    ok: true,
    password,
  };
}

/**
 * Formats an ISO date string into Spanish long date format (e.g. "13 de noviembre de 2026").
 */
export function formatSpanishDate(iso?: string): string {
  if (!iso) return 'Fecha no disponible';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
  return parsed.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export interface ProfileGovernanceMeta {
  roleLabel: string;
  statusLabel: string;
  governanceNote: string;
}

/**
 * Returns read-only governance metadata labels in Spanish for the self-service Perfil view.
 */
export function getProfileGovernanceMeta(profile: UserProfile): ProfileGovernanceMeta {
  let roleLabel = 'CLIENT (Organización Cliente)';
  switch (profile.role) {
    case 'ADMIN':
      roleLabel = 'ADMIN (Administrador)';
      break;
    case 'WORKER':
      roleLabel = 'WORKER (Personal Operativo)';
      break;
    case 'AUDITOR':
      roleLabel = 'AUDITOR (Auditor Técnico)';
      break;
    case 'CLIENT':
    default:
      roleLabel = 'CLIENT (Organización Cliente)';
      break;
  }

  let statusLabel = 'PENDING (Pendiente)';
  switch (profile.status) {
    case 'APPROVED':
      statusLabel = 'APPROVED (Aprobado)';
      break;
    case 'REJECTED':
      statusLabel = 'REJECTED (Rechazado)';
      break;
    case 'PENDING':
    default:
      statusLabel = 'PENDING (Pendiente)';
      break;
  }

  return {
    roleLabel,
    statusLabel,
    governanceNote: 'Gestionado exclusivamente por un Administrador en Panel Aprobaciones.',
  };
}
