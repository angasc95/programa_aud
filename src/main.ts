import './index.css';
import type { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';
import {
  canAccessRoute,
  canModifyProfileRole,
  evaluateAdminAccess,
  formatResetSummary,
  shouldUpdateProfileRole,
  TEST_ACCOUNTS,
  translateDatabaseError,
  type ActiveRoute,
  type HealthCheckItem,
  type ProfileFilter,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from './lib/healthCheck';
import { renderHeader, type HeaderDropdownId } from './views/header';
import { renderAuthView, type AuthViewState } from './views/authView';
import { renderDashboardView } from './views/dashboardView';
import { renderApprovalsView } from './views/approvalsView';
import { renderDatabaseStatusView } from './views/databaseStatusView';

interface AppState {
  booting: boolean;
  user: User | null;
  profile: UserProfile | null;
  activeRoute: ActiveRoute;
  activeSubSection: string | null;
  openMenu: HeaderDropdownId | null;
  auth: AuthViewState;
  approvals: {
    profiles: UserProfile[];
    filter: ProfileFilter;
    loading: boolean;
    updatingId: string | null;
    errorMessage: string | null;
    successMessage: string | null;
  };
  dbCheck: {
    checks: HealthCheckItem[];
    running: boolean;
    lastCheckedAt: string | null;
  };
}

function createInitialChecks(): HealthCheckItem[] {
  return [
    {
      id: 'connection',
      label: 'Connection & Login Service',
      description: 'Confirms the database server and sign-in service are reachable.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'admin',
      label: 'Administrator Permissions',
      description: 'Confirms your admin account is active and authorized.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'records',
      label: 'Core Business Records',
      description: 'Confirms organizations, certificates, audits, and findings can be read.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'coverage',
      label: 'Standards & Coverage Engine',
      description: 'Runs the audit coverage check on a certificate.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'governance',
      label: 'Change History & Client Access',
      description: 'Confirms activity logs and client organization requests are readable.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
  ];
}

const state: AppState = {
  booting: true,
  user: null,
  profile: null,
  activeRoute: 'dashboard',
  activeSubSection: null,
  openMenu: null,
  auth: {
    mode: 'login',
    errorMessage: null,
    successMessage: null,
    submitting: false,
    quickLoginEmail: null,
    email: '',
    nombre: '',
    requestedRole: 'CLIENT',
    resetModalOpen: false,
    resettingDb: false,
    resetErrorMessage: null,
  },
  approvals: {
    profiles: [],
    filter: 'PENDING',
    loading: false,
    updatingId: null,
    errorMessage: null,
    successMessage: null,
  },
  dbCheck: {
    checks: createInitialChecks(),
    running: false,
    lastCheckedAt: null,
  },
};

function isApprovedAdmin(): boolean {
  return evaluateAdminAccess(state.profile).allowed;
}

function render(): void {
  const root = document.getElementById('app');
  if (!root) return;

  if (state.booting) {
    root.innerHTML = `
      ${renderHeader({
        profile: null,
        email: null,
        isAdmin: false,
        activeRoute: 'dashboard',
        activeSubSection: null,
        pendingCount: 0,
        openMenu: null,
      })}
      <main class="flex-1 flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p class="text-sm font-medium text-slate-700">Loading workspace...</p>
        </div>
      </main>
    `;
    return;
  }

  if (!state.user || !state.profile) {
    root.innerHTML = `
      ${renderHeader({
        profile: null,
        email: null,
        isAdmin: false,
        activeRoute: 'dashboard',
        activeSubSection: null,
        pendingCount: 0,
        openMenu: null,
      })}
      ${renderAuthView(state.auth)}
    `;
    bindAuthEvents();
    return;
  }

  const admin = isApprovedAdmin();
  const pendingCount = state.approvals.profiles.filter((p) => p.status === 'PENDING').length;

  let effectiveRoute: ActiveRoute = state.activeRoute;
  if (!canAccessRoute(state.profile, effectiveRoute)) {
    effectiveRoute = 'dashboard';
    state.activeRoute = 'dashboard';
    state.activeSubSection = null;
  }

  let bodyHtml = '';
  if (effectiveRoute === 'approvals' && admin) {
    bodyHtml = renderApprovalsView({
      profiles: state.approvals.profiles,
      filter: state.approvals.filter,
      loading: state.approvals.loading,
      updatingId: state.approvals.updatingId,
      errorMessage: state.approvals.errorMessage,
      successMessage: state.approvals.successMessage,
      currentAdminId: state.user.id,
    });
  } else if (effectiveRoute === 'database' && admin) {
    bodyHtml = renderDatabaseStatusView(
      state.dbCheck.checks,
      state.dbCheck.running,
      state.dbCheck.lastCheckedAt
    );
  } else {
    bodyHtml = renderDashboardView(
      state.profile,
      state.user.email || '',
      effectiveRoute,
      state.activeSubSection
    );
  }

  root.innerHTML = `
    ${renderHeader({
      profile: state.profile,
      email: state.user.email || '',
      isAdmin: admin,
      activeRoute: effectiveRoute,
      activeSubSection: state.activeSubSection,
      pendingCount,
      openMenu: state.openMenu,
    })}
    ${bodyHtml}
  `;

  bindAuthenticatedEvents();
}

function bindAuthEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-auth-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.authMode === 'signup' ? 'signup' : 'login';
      state.auth = {
        ...state.auth,
        mode,
        errorMessage: null,
        successMessage: null,
      };
      render();
    });
  });

  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('loginEmail') as HTMLInputElement | null;
    const passwordInput = document.getElementById('loginPassword') as HTMLInputElement | null;
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    void signInWithCredentials(email, password, null);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-quick-login]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.quickLogin || '';
      const account = TEST_ACCOUNTS.find((a) => a.email === email);
      if (account) {
        void signInWithCredentials(account.email, account.password, account.email);
      }
    });
  });

  document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('signupName') as HTMLInputElement | null;
    const emailInput = document.getElementById('signupEmail') as HTMLInputElement | null;
    const passwordInput = document.getElementById('signupPassword') as HTMLInputElement | null;
    const roleSelect = document.getElementById('signupRole') as HTMLSelectElement | null;

    const nombre = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    const role = (roleSelect?.value || 'CLIENT') as UserRole;

    void handleSignUp(nombre, email, password, role);
  });

  document.getElementById('openResetDbModalBtn')?.addEventListener('click', () => {
    state.auth = {
      ...state.auth,
      resetModalOpen: true,
      resetErrorMessage: null,
    };
    render();
  });

  document.getElementById('cancelResetDbBtn')?.addEventListener('click', () => {
    if (state.auth.resettingDb) return;
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resetErrorMessage: null,
    };
    render();
  });

  document.getElementById('resetDbBackdrop')?.addEventListener('click', (e) => {
    if (e.target !== e.currentTarget || state.auth.resettingDb) return;
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resetErrorMessage: null,
    };
    render();
  });

  document.getElementById('confirmResetDbBtn')?.addEventListener('click', () => {
    void handleResetDatabase();
  });
}

function bindAuthenticatedEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-menu-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetMenu = btn.dataset.menuToggle as HeaderDropdownId | undefined;
      if (!targetMenu) return;
      state.openMenu = state.openMenu === targetMenu ? null : targetMenu;
      render();
    });
  });

  document.getElementById('signOutBtn')?.addEventListener('click', () => {
    void handleSignOut();
  });

  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.nav as ActiveRoute | undefined;
      if (!target || !canAccessRoute(state.profile, target)) return;
      state.activeRoute = target;
      state.activeSubSection = el.dataset.subview || null;
      state.openMenu = null;
      render();

      if (target === 'approvals') {
        void loadApprovalProfiles();
      } else if (target === 'database' && state.dbCheck.lastCheckedAt === null) {
        void runHealthChecks();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-approval-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.approvalFilter as ProfileFilter | undefined;
      if (!filter) return;
      state.approvals.filter = filter;
      state.approvals.successMessage = null;
      render();
    });
  });

  document.getElementById('refreshApprovalsBtn')?.addEventListener('click', () => {
    state.approvals.successMessage = null;
    void loadApprovalProfiles();
  });

  document.querySelectorAll<HTMLSelectElement>('[data-role-select]').forEach((select) => {
    select.addEventListener('change', () => {
      const id = select.dataset.roleSelect;
      const nextRole = select.value;
      if (id) void updateProfileRole(id, nextRole);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-approve-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.approveUser;
      if (id) void updateProfileStatus(id, 'APPROVED');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-reject-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.rejectUser;
      if (id) void updateProfileStatus(id, 'REJECTED');
    });
  });

  document.getElementById('runCheckBtn')?.addEventListener('click', () => {
    void runHealthChecks();
  });
}

async function signInWithCredentials(
  email: string,
  password: string,
  quickEmail: string | null
): Promise<void> {
  if (!email || !password) return;

  state.auth = {
    ...state.auth,
    email,
    errorMessage: null,
    successMessage: null,
    submitting: true,
    quickLoginEmail: quickEmail,
  };
  render();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    state.auth = {
      ...state.auth,
      errorMessage: translateDatabaseError(error || 'Unable to sign in.'),
      submitting: false,
      quickLoginEmail: null,
    };
    render();
    return;
  }

  state.auth.submitting = false;
  state.auth.quickLoginEmail = null;
  await loadUserSession(data.user);
}

async function handleSignUp(
  nombre: string,
  email: string,
  password: string,
  role: UserRole
): Promise<void> {
  if (!nombre || !email || !password) return;

  state.auth = {
    ...state.auth,
    nombre,
    email,
    requestedRole: role,
    errorMessage: null,
    successMessage: null,
    submitting: true,
    quickLoginEmail: null,
  };
  render();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        role,
      },
    },
  });

  if (error) {
    state.auth = {
      ...state.auth,
      errorMessage: translateDatabaseError(error),
      submitting: false,
    };
    render();
    return;
  }

  if (data.session && data.user) {
    state.auth.submitting = false;
    await loadUserSession(data.user);
    return;
  }

  const approvalNote =
    role === 'CLIENT'
      ? 'Check your email inbox to confirm your address before signing in.'
      : 'Check your email inbox to confirm your address. An administrator will also need to approve your account request.';

  state.auth = {
    ...state.auth,
    mode: 'login',
    submitting: false,
    errorMessage: null,
    successMessage: `Account created for ${email}. ${approvalNote}`,
  };
  render();
}

async function handleSignOut(): Promise<void> {
  await supabase.auth.signOut();
  state.user = null;
  state.profile = null;
  state.activeRoute = 'dashboard';
  state.activeSubSection = null;
  state.openMenu = null;
  state.approvals.profiles = [];
  state.dbCheck = {
    checks: createInitialChecks(),
    running: false,
    lastCheckedAt: null,
  };
  state.auth = {
    ...state.auth,
    mode: 'login',
    errorMessage: null,
    successMessage: null,
    submitting: false,
    quickLoginEmail: null,
    resetModalOpen: false,
    resettingDb: false,
    resetErrorMessage: null,
  };
  render();
}

async function handleResetDatabase(): Promise<void> {
  if (state.auth.resettingDb) return;

  state.auth = {
    ...state.auth,
    resettingDb: true,
    resetErrorMessage: null,
    errorMessage: null,
    successMessage: null,
  };
  render();

  try {
    const response = await fetch('/api/reset-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      executedFiles?: Array<{ file: string; durationMs: number }>;
      totalDurationMs?: number;
    };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Reset failed with status ${response.status}.`);
    }

    const fileNames = (payload.executedFiles || []).map((item) => item.file);
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resettingDb: false,
      resetErrorMessage: null,
      errorMessage: null,
      successMessage: formatResetSummary(fileNames, payload.totalDurationMs),
    };
  } catch (err) {
    state.auth = {
      ...state.auth,
      resettingDb: false,
      resetErrorMessage: err instanceof Error ? err.message : 'Unable to reset database.',
    };
  }

  render();
}

async function loadUserSession(user: User | null): Promise<void> {
  state.booting = false;
  if (!user) {
    state.user = null;
    state.profile = null;
    render();
    return;
  }

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('id, nombre, role, status, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profileData) {
    state.user = user;
    state.profile = {
      id: user.id,
      nombre: (user.user_metadata?.nombre as string | undefined) || user.email || 'User',
      role: ((user.user_metadata?.role as UserRole | undefined) || 'CLIENT'),
      status: 'PENDING',
    };
  } else {
    state.user = user;
    state.profile = profileData as UserProfile;
  }

  state.activeRoute = 'dashboard';
  state.activeSubSection = null;
  state.openMenu = null;
  render();

  if (isApprovedAdmin()) {
    void loadApprovalProfiles();
  }
}

async function loadApprovalProfiles(): Promise<void> {
  if (!isApprovedAdmin()) return;

  state.approvals.loading = true;
  state.approvals.errorMessage = null;
  render();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, role, status, created_at')
    .order('created_at', { ascending: false });

  state.approvals.loading = false;
  if (error) {
    state.approvals.errorMessage = translateDatabaseError(error);
  } else {
    state.approvals.profiles = (data as UserProfile[]) || [];
  }
  render();
}

async function updateProfileStatus(targetId: string, status: UserStatus): Promise<void> {
  if (!isApprovedAdmin()) return;

  state.approvals.updatingId = targetId;
  state.approvals.errorMessage = null;
  state.approvals.successMessage = null;
  render();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', targetId);

  state.approvals.updatingId = null;

  if (error) {
    state.approvals.errorMessage = translateDatabaseError(error);
    render();
    return;
  }

  const target = state.approvals.profiles.find((p) => p.id === targetId);
  state.approvals.successMessage = target
    ? `Updated status for ${target.nombre} to ${status}.`
    : `Updated user status to ${status}.`;
  await loadApprovalProfiles();
}

async function updateProfileRole(targetId: string, nextRole: string): Promise<void> {
  if (!isApprovedAdmin() || !state.user) return;

  const target = state.approvals.profiles.find((p) => p.id === targetId);
  if (!target) return;

  if (!canModifyProfileRole(target.id, state.user.id, target.status)) {
    return;
  }

  if (!shouldUpdateProfileRole(target.role, nextRole)) {
    return;
  }

  state.approvals.updatingId = targetId;
  state.approvals.errorMessage = null;
  state.approvals.successMessage = null;
  render();

  const { error } = await supabase
    .from('profiles')
    .update({ role: nextRole })
    .eq('id', targetId);

  state.approvals.updatingId = null;

  if (error) {
    state.approvals.errorMessage = translateDatabaseError(error);
    render();
    return;
  }

  state.approvals.successMessage = `Changed role for ${target.nombre} to ${nextRole}.`;
  await loadApprovalProfiles();
}

function updateHealthCheck(id: string, patch: Partial<HealthCheckItem>): void {
  state.dbCheck.checks = state.dbCheck.checks.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  render();
}

async function runHealthChecks(): Promise<void> {
  if (!isApprovedAdmin() || !state.profile || state.dbCheck.running) return;

  const adminProfile = state.profile;
  state.dbCheck = {
    checks: createInitialChecks(),
    running: true,
    lastCheckedAt: state.dbCheck.lastCheckedAt,
  };
  render();

  // 1. Connection & Login Service
  const t1 = performance.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const ms1 = Math.round(performance.now() - t1);
    if (response.ok) {
      updateHealthCheck('connection', {
        state: 'pass',
        detail: 'Server online and accepting connections',
        durationMs: ms1,
      });
    } else {
      updateHealthCheck('connection', {
        state: 'fail',
        detail: `Server responded with status ${response.status}`,
        durationMs: ms1,
      });
    }
  } catch (err) {
    updateHealthCheck('connection', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t1),
    });
  }

  // 2. Administrator Permissions
  const t2 = performance.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, role, status')
      .eq('id', adminProfile.id)
      .single();
    const ms2 = Math.round(performance.now() - t2);
    const access = evaluateAdminAccess(data as UserProfile | null);
    if (error || !access.allowed) {
      updateHealthCheck('admin', {
        state: 'fail',
        detail: error ? translateDatabaseError(error) : access.reason,
        durationMs: ms2,
      });
    } else {
      updateHealthCheck('admin', {
        state: 'pass',
        detail: `Verified ${data.nombre} (${data.role} · ${data.status})`,
        durationMs: ms2,
      });
    }
  } catch (err) {
    updateHealthCheck('admin', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t2),
    });
  }

  // 3. Core Business Records
  let sampleCert: { id: string; numero_certificado: string } | null = null;
  const t3 = performance.now();
  try {
    const [orgsRes, certsRes, auditsRes, findingsRes, sampleCertRes] = await Promise.all([
      supabase.from('organizacion').select('id', { count: 'exact', head: true }),
      supabase.from('certificado').select('id', { count: 'exact', head: true }),
      supabase.from('auditoria').select('id', { count: 'exact', head: true }),
      supabase.from('hallazgo').select('id', { count: 'exact', head: true }),
      supabase.from('certificado').select('id, numero_certificado').limit(1).maybeSingle(),
    ]);
    const ms3 = Math.round(performance.now() - t3);

    const firstErr =
      orgsRes.error || certsRes.error || auditsRes.error || findingsRes.error || sampleCertRes.error;

    if (firstErr) {
      updateHealthCheck('records', {
        state: 'fail',
        detail: translateDatabaseError(firstErr),
        durationMs: ms3,
      });
    } else {
      sampleCert = sampleCertRes.data as { id: string; numero_certificado: string } | null;
      updateHealthCheck('records', {
        state: 'pass',
        detail: `${orgsRes.count ?? 0} organizations · ${certsRes.count ?? 0} certificates · ${auditsRes.count ?? 0} audits · ${findingsRes.count ?? 0} findings`,
        durationMs: ms3,
      });
    }
  } catch (err) {
    updateHealthCheck('records', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t3),
    });
  }

  // 4. Standards & Coverage Engine
  const t4 = performance.now();
  try {
    const certId = sampleCert?.id || '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase.rpc('cobertura_normativa_certificado', {
      p_id_certificado: certId,
    });
    const ms4 = Math.round(performance.now() - t4);

    if (error) {
      updateHealthCheck('coverage', {
        state: 'fail',
        detail: translateDatabaseError(error),
        durationMs: ms4,
      });
    } else {
      const count = Array.isArray(data) ? data.length : 0;
      updateHealthCheck('coverage', {
        state: 'pass',
        detail: sampleCert
          ? `Evaluated ${count} standard requirements for ${sampleCert.numero_certificado}`
          : 'Coverage calculation engine responded cleanly',
        durationMs: ms4,
      });
    }
  } catch (err) {
    updateHealthCheck('coverage', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t4),
    });
  }

  // 5. Change History & Client Access
  const t5 = performance.now();
  try {
    const [logsRes, accessRes] = await Promise.all([
      supabase.from('audit_log').select('id', { count: 'exact', head: true }),
      supabase.from('client_organization_access').select('id', { count: 'exact', head: true }),
    ]);
    const ms5 = Math.round(performance.now() - t5);

    const err = logsRes.error || accessRes.error;
    if (err) {
      updateHealthCheck('governance', {
        state: 'fail',
        detail: translateDatabaseError(err),
        durationMs: ms5,
      });
    } else {
      updateHealthCheck('governance', {
        state: 'pass',
        detail: `${logsRes.count ?? 0} logged changes · ${accessRes.count ?? 0} client access records`,
        durationMs: ms5,
      });
    }
  } catch (err) {
    updateHealthCheck('governance', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t5),
    });
  }

  state.dbCheck.running = false;
  state.dbCheck.lastCheckedAt = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  render();
}

// Close click-toggled dropdown when clicking outside header dropdown containers
document.addEventListener('click', (e) => {
  if (!state.openMenu) return;
  const target = e.target as HTMLElement | null;
  if (!target?.closest('[data-header-dropdown]')) {
    state.openMenu = null;
    render();
  }
});

// Close open dropdowns or Reset DB confirmation modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  if (state.openMenu) {
    state.openMenu = null;
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest('header')) {
      document.activeElement.blur();
    }
    render();
    return;
  }

  if (document.activeElement instanceof HTMLElement && document.activeElement.closest('[data-header-dropdown]')) {
    document.activeElement.blur();
    return;
  }

  if (state.auth.resetModalOpen && !state.auth.resettingDb) {
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resetErrorMessage: null,
    };
    render();
  }
});

async function init(): Promise<void> {
  render();
  const { data } = await supabase.auth.getSession();
  await loadUserSession(data.session?.user ?? null);
}

void init();
