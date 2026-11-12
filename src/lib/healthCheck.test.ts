import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessRoute,
  canModifyProfileRole,
  canModifyProfileStatus,
  evaluateAdminAccess,
  extractSupabaseProjectRef,
  filterProfilesByStatus,
  formatResetSummary,
  getRoleVisualMeta,
  getStatusVisualMeta,
  getUserIdentityDisplay,
  getVisibleDomainMenus,
  isValidUserRole,
  shouldUpdateProfileRole,
  sortSqlFiles,
  summarizeHealthChecks,
  translateDatabaseError,
  USER_ROLES,
  type HealthCheckItem,
  type UserProfile,
} from './healthCheck';

test('evaluateAdminAccess allows only APPROVED ADMIN profiles', () => {
  assert.deepEqual(
    evaluateAdminAccess({
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Administrador Principal',
      role: 'ADMIN',
      status: 'APPROVED',
    }),
    { allowed: true, reason: 'Administrator access verified.' }
  );

  assert.equal(evaluateAdminAccess(null).allowed, false);
  assert.equal(
    evaluateAdminAccess({
      id: '2222',
      nombre: 'Worker',
      role: 'WORKER',
      status: 'APPROVED',
    }).allowed,
    false
  );
  assert.equal(
    evaluateAdminAccess({
      id: '3333',
      nombre: 'Auditor',
      role: 'AUDITOR',
      status: 'APPROVED',
    }).allowed,
    false
  );
  assert.equal(
    evaluateAdminAccess({
      id: '4444',
      nombre: 'Client',
      role: 'CLIENT',
      status: 'APPROVED',
    }).allowed,
    false
  );
  assert.equal(
    evaluateAdminAccess({
      id: '5555',
      nombre: 'Pending Admin',
      role: 'ADMIN',
      status: 'PENDING',
    }).allowed,
    false
  );
});

test('role and status visual metadata include required symbols and tooltips', () => {
  assert.equal(getRoleVisualMeta('ADMIN').symbol, '🛡️');
  assert.equal(getRoleVisualMeta('AUDITOR').symbol, '📋');
  assert.equal(getStatusVisualMeta('APPROVED').symbol, '✓');
  assert.equal(getStatusVisualMeta('REJECTED').symbol, '❌');
  assert.match(getStatusVisualMeta('APPROVED').tooltip, /APPROVED/);
  assert.match(getRoleVisualMeta('WORKER').tooltip, /WORKER/);
});

test('getUserIdentityDisplay renders minimalist role iconography for approved users and suppresses role icon for unapproved users', () => {
  // Approved Admin: 🛡️
  const adminProfile: UserProfile = {
    id: 'u-1',
    nombre: 'Carlos Mendoza',
    role: 'ADMIN',
    status: 'APPROVED',
  };
  const adminDisplay = getUserIdentityDisplay(adminProfile);
  assert.equal(adminDisplay.icon, '🛡️');
  assert.equal(adminDisplay.isApproved, true);
  assert.equal(adminDisplay.suppressRoleIcon, false);
  assert.equal(adminDisplay.displayNameWithRoleOrStatus, 'Carlos Mendoza (Administrador)');

  // Approved Worker: ⚙️
  const workerDisplay = getUserIdentityDisplay({
    id: 'u-2',
    nombre: 'María Ramos',
    role: 'WORKER',
    status: 'APPROVED',
  });
  assert.equal(workerDisplay.icon, '⚙️');
  assert.equal(workerDisplay.isApproved, true);

  // Approved Auditor: 📋
  const auditorDisplay = getUserIdentityDisplay({
    id: 'u-3',
    nombre: 'Alejandro Cruz',
    role: 'AUDITOR',
    status: 'APPROVED',
  });
  assert.equal(auditorDisplay.icon, '📋');
  assert.equal(auditorDisplay.isApproved, true);

  // Approved Client: 🏢
  const clientDisplay = getUserIdentityDisplay({
    id: 'u-4',
    nombre: 'CyberCloud S.L.',
    role: 'CLIENT',
    status: 'APPROVED',
  });
  assert.equal(clientDisplay.icon, '🏢');
  assert.equal(clientDisplay.isApproved, true);

  // Unapproved Pending: ⏳ (Role icon strictly suppressed)
  const pendingDisplay = getUserIdentityDisplay({
    id: 'u-5',
    nombre: 'Laura Gómez',
    role: 'ADMIN', // requested admin
    status: 'PENDING',
  });
  assert.equal(pendingDisplay.icon, '⏳'); // status icon only!
  assert.equal(pendingDisplay.suppressRoleIcon, true);
  assert.equal(pendingDisplay.isApproved, false);
  assert.equal(pendingDisplay.displayNameWithRoleOrStatus, 'Laura Gómez (Pendiente)');

  // Unapproved Rejected: ❌ (Role icon strictly suppressed)
  const rejectedDisplay = getUserIdentityDisplay({
    id: 'u-6',
    nombre: 'Juan Pérez',
    role: 'WORKER',
    status: 'REJECTED',
  });
  assert.equal(rejectedDisplay.icon, '❌'); // status icon only!
  assert.equal(rejectedDisplay.suppressRoleIcon, true);
  assert.equal(rejectedDisplay.isApproved, false);
  assert.equal(rejectedDisplay.displayNameWithRoleOrStatus, 'Juan Pérez (Rechazado)');
});

test('getVisibleDomainMenus and canAccessRoute enforce role and approval boundaries', () => {
  const pendingAdmin: UserProfile = {
    id: 'p1',
    nombre: 'Pending',
    role: 'ADMIN',
    status: 'PENDING',
  };
  assert.equal(getVisibleDomainMenus(pendingAdmin).length, 0);
  assert.equal(canAccessRoute(pendingAdmin, 'auditorias'), false);
  assert.equal(canAccessRoute(pendingAdmin, 'dashboard'), true);

  const approvedAuditor: UserProfile = {
    id: 'a1',
    nombre: 'Auditor',
    role: 'AUDITOR',
    status: 'APPROVED',
  };
  const auditorDomains = getVisibleDomainMenus(approvedAuditor).map((m) => m.id);
  assert.deepEqual(auditorDomains, ['auditorias', 'extra']);
  assert.equal(canAccessRoute(approvedAuditor, 'certificacion'), false);
  assert.equal(canAccessRoute(approvedAuditor, 'approvals'), false);

  const approvedClient: UserProfile = {
    id: 'c1',
    nombre: 'Client',
    role: 'CLIENT',
    status: 'APPROVED',
  };
  const clientDomains = getVisibleDomainMenus(approvedClient).map((m) => m.id);
  assert.deepEqual(clientDomains, ['auditorias', 'certificacion', 'extra']);
  const certMenu = getVisibleDomainMenus(approvedClient).find((m) => m.id === 'certificacion');
  assert.equal(certMenu?.items.some((i) => i.id === 'shifts'), false);

  const approvedAdmin: UserProfile = {
    id: 'ad1',
    nombre: 'Admin',
    role: 'ADMIN',
    status: 'APPROVED',
  };
  assert.equal(canAccessRoute(approvedAdmin, 'approvals'), true);
  assert.equal(canAccessRoute(approvedAdmin, 'database'), true);
  assert.equal(canAccessRoute(approvedAdmin, 'certificacion'), true);

  const approvedWorker: UserProfile = {
    id: 'w1',
    nombre: 'Worker',
    role: 'WORKER',
    status: 'APPROVED',
  };
  assert.equal(canAccessRoute(approvedWorker, 'approvals'), true);
  assert.equal(canAccessRoute(approvedWorker, 'database'), false);
  assert.equal(canAccessRoute(approvedWorker, 'certificacion'), true);
  assert.equal(canAccessRoute(approvedClient, 'approvals'), false);
  assert.equal(canAccessRoute(approvedClient, 'database'), false);
});

test('filterProfilesByStatus filters pending, approved, rejected, and all profiles', () => {
  const sample: UserProfile[] = [
    { id: '1', nombre: 'Admin', role: 'ADMIN', status: 'APPROVED' },
    { id: '2', nombre: 'Pending Auditor', role: 'AUDITOR', status: 'PENDING' },
    { id: '3', nombre: 'Rejected Worker', role: 'WORKER', status: 'REJECTED' },
  ];

  assert.equal(filterProfilesByStatus(sample, 'PENDING').length, 1);
  assert.equal(filterProfilesByStatus(sample, 'PENDING')[0].id, '2');
  assert.equal(filterProfilesByStatus(sample, 'APPROVED').length, 1);
  assert.equal(filterProfilesByStatus(sample, 'REJECTED').length, 1);
  assert.equal(filterProfilesByStatus(sample, 'ALL').length, 3);
});

test('canModifyProfileStatus prevents self-modification', () => {
  assert.equal(canModifyProfileStatus('1111', '1111'), false);
  assert.equal(canModifyProfileStatus('2222', '1111'), true);
});

test('role modification helpers enforce valid roles and approved non-self targets', () => {
  assert.deepEqual([...USER_ROLES], ['ADMIN', 'WORKER', 'AUDITOR', 'CLIENT']);
  assert.equal(isValidUserRole('WORKER'), true);
  assert.equal(isValidUserRole('SUPERADMIN'), false);

  assert.equal(canModifyProfileRole('1111', '1111', 'APPROVED'), false);
  assert.equal(canModifyProfileRole('2222', '1111', 'PENDING'), false);
  assert.equal(canModifyProfileRole('2222', '1111', 'REJECTED'), false);
  assert.equal(canModifyProfileRole('2222', '1111', 'APPROVED'), true);

  assert.equal(shouldUpdateProfileRole('CLIENT', 'CLIENT'), false);
  assert.equal(shouldUpdateProfileRole('CLIENT', 'INVALID'), false);
  assert.equal(shouldUpdateProfileRole('CLIENT', 'WORKER'), true);
});

test('SQL reset helpers sort query files, extract project ref, and format summary', () => {
  assert.deepEqual(
    sortSqlFiles(['06_datos_prueba.sql', 'README.md', '00_delete_tables.sql', '01_creacion.sql']),
    ['00_delete_tables.sql', '01_creacion.sql', '06_datos_prueba.sql']
  );
  assert.equal(
    extractSupabaseProjectRef('https://ufowtgmpaahyshdxlnlq.supabase.co'),
    'ufowtgmpaahyshdxlnlq'
  );
  assert.equal(extractSupabaseProjectRef('not-a-url'), null);
  assert.match(
    formatResetSummary(['00_delete_tables.sql', '06_datos_prueba.sql'], 2400),
    /Executed 2 SQL scripts in order \(00_delete_tables\.sql → 06_datos_prueba\.sql\) in 2\.4s\./
  );
});

test('summarizeHealthChecks reports operational when all pass', () => {
  const checks: HealthCheckItem[] = [
    { id: 'auth', label: 'Connection', description: '', state: 'pass', detail: 'OK', durationMs: 100 },
    { id: 'tables', label: 'Tables', description: '', state: 'pass', detail: 'OK', durationMs: 200 },
  ];
  const summary = summarizeHealthChecks(checks);
  assert.equal(summary.overall, 'operational');
  assert.equal(summary.passedCount, 2);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.avgLatencyMs, 150);
});

test('summarizeHealthChecks reports attention on partial failures or warnings', () => {
  const checks: HealthCheckItem[] = [
    { id: 'auth', label: 'Connection', description: '', state: 'pass', detail: 'OK', durationMs: 80 },
    { id: 'rpc', label: 'Coverage', description: '', state: 'warn', detail: 'No data', durationMs: 120 },
  ];
  const summary = summarizeHealthChecks(checks);
  assert.equal(summary.overall, 'attention');
  assert.equal(summary.passedCount, 1);
});

test('summarizeHealthChecks reports offline when all fail', () => {
  const checks: HealthCheckItem[] = [
    { id: 'auth', label: 'Connection', description: '', state: 'fail', detail: 'Down' },
    { id: 'tables', label: 'Tables', description: '', state: 'fail', detail: 'Down' },
  ];
  assert.equal(summarizeHealthChecks(checks).overall, 'offline');
});

test('translateDatabaseError formats known errors into plain English', () => {
  assert.match(
    translateDatabaseError({ code: '42501', message: 'permission denied for table organizacion' }),
    /Permission denied/i
  );
  assert.match(
    translateDatabaseError({ message: 'Invalid login credentials' }),
    /Incorrect email or password/i
  );
  assert.match(
    translateDatabaseError({ message: 'Email not confirmed' }),
    /confirm your email/i
  );
  assert.match(
    translateDatabaseError({ message: 'User already registered' }),
    /already exists/i
  );
  assert.match(
    translateDatabaseError({ message: 'Failed to fetch' }),
    /internet connection/i
  );
  assert.match(
    translateDatabaseError({ message: 'Database error querying schema' }),
    /05_usuarios\.sql/i
  );
});
