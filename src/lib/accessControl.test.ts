import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessSubview,
  canEditAuditScheduleOrTeam,
  canMutateAuditExecution,
  canViewAuditLogForEntity,
  isApprovedStaffProfile,
  scopeCertificateRecordsForProfile,
  scopeDetailedCertsForProfile,
  scopeLegacyAuditsForProfile,
  scopeLegacyFindingsForProfile,
  scopeOrganizacionEntitiesForProfile,
  scopeOrganizationsForProfile,
  scopePhase5FindingsForProfile,
  scopeProgramacionAuditsForProfile,
  scopeSitesOrProcessesForCertificates,
} from './accessControl.js';
import { canArchiveRecord, canInspectArchivedRecords } from './archiveGovernance.js';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution.js';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling.js';
import { INITIAL_ORGANIZACIONES } from './activeCertificates.js';
import { renderDashboardView } from '../views/dashboardView.js';
import { renderHeader } from '../views/header.js';
import {
  canAccessRoute,
  getVisibleDomainMenus,
  type UserProfile,
} from './healthCheck.js';
import type { CertificateRecord } from './searchControls.js';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const WORKER_PROFILE: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  nombre: 'Personal Técnico Certificación',
  role: 'WORKER',
  status: 'APPROVED',
};

const ASSIGNED_AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Técnico Evaluador',
  role: 'AUDITOR',
  status: 'APPROVED',
};

const UNASSIGNED_AUDITOR_PROFILE: UserProfile = {
  id: '99999999-9999-9999-9999-999999999999',
  nombre: 'Auditor Externo No Asignado',
  role: 'AUDITOR',
  status: 'APPROVED',
};

const CLIENT_PROFILE: UserProfile = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Representante Organización Cliente',
  role: 'CLIENT',
  status: 'APPROVED',
};

const PENDING_PROFILE: UserProfile = {
  id: '55555555-5555-5555-5555-555555555555',
  nombre: 'Solicitante Pendiente',
  role: 'AUDITOR',
  status: 'PENDING',
};

const REJECTED_PROFILE: UserProfile = {
  id: '66666666-6666-6666-6666-666666666666',
  nombre: 'Solicitante Rechazado',
  role: 'WORKER',
  status: 'REJECTED',
};

const IBEROMETAL_ORG_ID = '30000000-0000-0000-0000-000000000001';
const AUDIT_001 = INITIAL_PROGRAMACION_AUDITS[0]; // Iberometal, includes 33333333-... in equipo
const AUDIT_003 = INITIAL_PROGRAMACION_AUDITS[2]; // Petroquimica, does not include 33333333-...
const FINDING_001 = INITIAL_PHASE5_FINDINGS[0]; // belongs to AUDIT_001
const FINDING_004 = INITIAL_PHASE5_FINDINGS[3]; // belongs to AUDIT_003

const SAMPLE_CERTS: CertificateRecord[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_id: IBEROMETAL_ORG_ID,
    organizacion_nombre: 'Iberometal Componentes S.A.',
    nif_cuit: 'J-30192837-4',
    norma: 'ISO 9001:2015',
    sector_iaf: 17,
    estatus: 'ACTIVO',
    cobertura_porcentaje: 92,
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    numero_certificado: 'FN-OHS-2023-018',
    organizacion_id: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    nif_cuit: 'J-30987654-2',
    norma: 'ISO 45001:2018',
    sector_iaf: 12,
    estatus: 'SUSPENDIDO',
    cobertura_porcentaje: 64,
  },
];

test('Phase 6.1 RBAC: staff edit permissions vs auditor execution permissions', () => {
  assert.equal(isApprovedStaffProfile(ADMIN_PROFILE), true);
  assert.equal(isApprovedStaffProfile(WORKER_PROFILE), true);
  assert.equal(isApprovedStaffProfile(ASSIGNED_AUDITOR_PROFILE), false);
  assert.equal(isApprovedStaffProfile(CLIENT_PROFILE), false);
  assert.equal(isApprovedStaffProfile(PENDING_PROFILE), false);
  assert.equal(isApprovedStaffProfile(REJECTED_PROFILE), false);

  assert.equal(canEditAuditScheduleOrTeam(ADMIN_PROFILE), true);
  assert.equal(canEditAuditScheduleOrTeam(WORKER_PROFILE), true);
  assert.equal(canEditAuditScheduleOrTeam(ASSIGNED_AUDITOR_PROFILE), false);
  assert.equal(canEditAuditScheduleOrTeam(CLIENT_PROFILE), false);

  // AUDIT_001 is assigned to ASSIGNED_AUDITOR_PROFILE; AUDIT_003 is not
  assert.equal(canMutateAuditExecution(AUDIT_001, ADMIN_PROFILE), true);
  assert.equal(canMutateAuditExecution(AUDIT_001, WORKER_PROFILE), true);
  assert.equal(canMutateAuditExecution(AUDIT_001, ASSIGNED_AUDITOR_PROFILE), true);
  assert.equal(canMutateAuditExecution(AUDIT_003, ASSIGNED_AUDITOR_PROFILE), false);
  assert.equal(canMutateAuditExecution(AUDIT_001, UNASSIGNED_AUDITOR_PROFILE), false);
  assert.equal(canMutateAuditExecution(AUDIT_001, CLIENT_PROFILE), false);
  assert.equal(canMutateAuditExecution(AUDIT_001, PENDING_PROFILE), false);
  assert.equal(canMutateAuditExecution(AUDIT_001, REJECTED_PROFILE), false);
});

test('Phase 6.1 Forensic Audit Log RLS: enforces entity-level visibility per role', () => {
  const auditorAudits = scopeProgramacionAuditsForProfile(
    INITIAL_PROGRAMACION_AUDITS,
    ASSIGNED_AUDITOR_PROFILE,
    []
  );
  const auditorFindings = scopePhase5FindingsForProfile(
    INITIAL_PHASE5_FINDINGS,
    auditorAudits,
    ASSIGNED_AUDITOR_PROFILE
  );

  // ADMIN and WORKER can inspect all operational tables
  for (const table of ['organizacion', 'certificado', 'sitio', 'proceso', 'turno', 'auditoria', 'hallazgo', 'norma', 'subsector_iaf', 'acreditacion_norma_iaf']) {
    assert.equal(canViewAuditLogForEntity(ADMIN_PROFILE, table, 'any-id'), true);
    assert.equal(canViewAuditLogForEntity(WORKER_PROFILE, table, 'any-id'), true);
  }

  // AUDITOR can inspect auditoria and hallazgo ONLY for assigned audits
  assert.equal(
    canViewAuditLogForEntity(ASSIGNED_AUDITOR_PROFILE, 'auditoria', AUDIT_001.id, auditorAudits, auditorFindings),
    true
  );
  assert.equal(
    canViewAuditLogForEntity(ASSIGNED_AUDITOR_PROFILE, 'hallazgo', FINDING_001.id, auditorAudits, auditorFindings),
    true
  );
  assert.equal(
    canViewAuditLogForEntity(ASSIGNED_AUDITOR_PROFILE, 'auditoria', AUDIT_003.id, auditorAudits, auditorFindings),
    false
  );
  assert.equal(
    canViewAuditLogForEntity(ASSIGNED_AUDITOR_PROFILE, 'hallazgo', FINDING_004.id, auditorAudits, auditorFindings),
    false
  );
  assert.equal(
    canViewAuditLogForEntity(ASSIGNED_AUDITOR_PROFILE, 'certificado', '40000000-0000-0000-0000-000000000001', auditorAudits, auditorFindings),
    false
  );

  // CLIENT, PENDING, REJECTED cannot query forensic audit_log
  assert.equal(canViewAuditLogForEntity(CLIENT_PROFILE, 'auditoria', AUDIT_001.id, INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS), false);
  assert.equal(canViewAuditLogForEntity(PENDING_PROFILE, 'organizacion', IBEROMETAL_ORG_ID), false);
  assert.equal(canViewAuditLogForEntity(REJECTED_PROFILE, 'certificado', '40000000-0000-0000-0000-000000000001'), false);
});

test('Phase 6.1 Data Scoping: AUDITOR and CLIENT strictly isolated; PENDING/REJECTED get empty sets', () => {
  // 1. Auditor scoped strictly to assigned audit (AUD-2024-001)
  const auditorAudits = scopeProgramacionAuditsForProfile(
    INITIAL_PROGRAMACION_AUDITS,
    ASSIGNED_AUDITOR_PROFILE,
    []
  );
  assert.equal(auditorAudits.length, 1);
  assert.equal(auditorAudits[0].codigo_auditoria, 'AUD-2024-001');

  const auditorFindings = scopePhase5FindingsForProfile(
    INITIAL_PHASE5_FINDINGS,
    auditorAudits,
    ASSIGNED_AUDITOR_PROFILE
  );
  assert.equal(auditorFindings.every((f) => f.id_auditoria === AUDIT_001.id), true);

  const auditorCerts = scopeCertificateRecordsForProfile(
    SAMPLE_CERTS,
    ASSIGNED_AUDITOR_PROFILE,
    [],
    auditorAudits
  );
  assert.equal(auditorCerts.length, 1);
  assert.equal(auditorCerts[0].numero_certificado, 'FN-QMS-2024-001');

  // 2. Client scoped strictly to authorized client orgs (Iberometal)
  const clientAudits = scopeProgramacionAuditsForProfile(
    INITIAL_PROGRAMACION_AUDITS,
    CLIENT_PROFILE,
    [IBEROMETAL_ORG_ID]
  );
  assert.equal(clientAudits.length > 0, true);
  assert.equal(clientAudits.every((a) => a.id_organizacion === IBEROMETAL_ORG_ID), true);

  const clientCerts = scopeCertificateRecordsForProfile(
    SAMPLE_CERTS,
    CLIENT_PROFILE,
    [IBEROMETAL_ORG_ID],
    clientAudits
  );
  assert.equal(clientCerts.length, 1);
  assert.equal(clientCerts[0].organizacion_id, IBEROMETAL_ORG_ID);

  const clientDetailedCerts = scopeDetailedCertsForProfile(
    INITIAL_CERTIFICADOS_DETAILED,
    CLIENT_PROFILE,
    [IBEROMETAL_ORG_ID],
    clientAudits
  );
  assert.equal(clientDetailedCerts.length >= 1, true);
  assert.equal(clientDetailedCerts.every((c) => c.id_organizacion === IBEROMETAL_ORG_ID), true);

  const clientOrgEntities = scopeOrganizacionEntitiesForProfile(
    INITIAL_ORGANIZACIONES,
    CLIENT_PROFILE,
    [IBEROMETAL_ORG_ID],
    clientAudits
  );
  assert.equal(clientOrgEntities.length, 1);
  assert.equal(clientOrgEntities[0].id, IBEROMETAL_ORG_ID);

  const clientLegacyOrgs = scopeOrganizationsForProfile(
    INITIAL_ORGANIZACIONES.map((o) => ({
      id: o.id,
      nombre: o.nombre,
      nif_cuit: o.nif_cuit,
      direccion_fiscal: o.direccion_fiscal,
      certificados_count: 1,
    })),
    CLIENT_PROFILE,
    [IBEROMETAL_ORG_ID],
    clientAudits,
    clientCerts
  );
  assert.equal(clientLegacyOrgs.length, 1);
  assert.equal(clientLegacyOrgs[0].id, IBEROMETAL_ORG_ID);

  const clientLegacyAudits = scopeLegacyAuditsForProfile(
    INITIAL_PROGRAMACION_AUDITS.map((a) => ({
      id: a.id,
      id_certificado: a.id_certificado,
      numero_certificado: a.numero_certificado,
      organizacion_nombre: a.organizacion_nombre,
      tipo_auditoria: a.tipo_auditoria,
      metodologia: a.metodologia,
      fecha_programacion: a.fecha_inicio,
      estatus: a.estatus,
    })),
    CLIENT_PROFILE,
    clientAudits,
    clientCerts
  );
  assert.equal(clientLegacyAudits.every((a) => a.organizacion_nombre === 'Iberometal Componentes S.A.'), true);

  const clientLegacyFindings = scopeLegacyFindingsForProfile(
    INITIAL_PHASE5_FINDINGS,
    clientLegacyAudits,
    clientCerts,
    CLIENT_PROFILE
  );
  assert.equal(clientLegacyFindings.every((f) => f.numero_certificado === 'FN-QMS-2024-001'), true);

  const clientSites = scopeSitesOrProcessesForCertificates(
    [
      { numero_certificado: 'FN-QMS-2024-001', nombre: 'Planta Valencia' },
      { numero_certificado: 'FN-OHS-2023-018', nombre: 'Planta Polímeros' },
    ],
    clientCerts,
    CLIENT_PROFILE
  );
  assert.equal(clientSites.length, 1);
  assert.equal(clientSites[0].nombre, 'Planta Valencia');

  // 3. PENDING and REJECTED profiles always receive empty datasets
  for (const lockedProfile of [PENDING_PROFILE, REJECTED_PROFILE]) {
    assert.equal(scopeProgramacionAuditsForProfile(INITIAL_PROGRAMACION_AUDITS, lockedProfile, [IBEROMETAL_ORG_ID]).length, 0);
    assert.equal(scopePhase5FindingsForProfile(INITIAL_PHASE5_FINDINGS, INITIAL_PROGRAMACION_AUDITS, lockedProfile).length, 0);
    assert.equal(scopeCertificateRecordsForProfile(SAMPLE_CERTS, lockedProfile, [IBEROMETAL_ORG_ID], INITIAL_PROGRAMACION_AUDITS).length, 0);
    assert.equal(scopeDetailedCertsForProfile(INITIAL_CERTIFICADOS_DETAILED, lockedProfile, [IBEROMETAL_ORG_ID], INITIAL_PROGRAMACION_AUDITS).length, 0);
    assert.equal(scopeOrganizacionEntitiesForProfile(INITIAL_ORGANIZACIONES, lockedProfile, [IBEROMETAL_ORG_ID], INITIAL_PROGRAMACION_AUDITS).length, 0);
  }
});

test('Phase 6.1 Operational Lockdown: PENDING and REJECTED dashboards suppress role icon and show status indicator only', () => {
  const pendingHeader = renderHeader({
    profile: PENDING_PROFILE,
    email: 'pending@fondonorma.test',
    isAdmin: false,
    canViewApprovals: false,
    activeRoute: 'dashboard',
    activeSubSection: null,
    pendingCount: 0,
    openMenu: null,
  });
  assert.match(pendingHeader, /⏳/);
  assert.doesNotMatch(pendingHeader, /📋|🛡️|⚙️|🏢/);
  assert.doesNotMatch(pendingHeader, /Dominios Operativos/);

  const pendingDash = renderDashboardView(PENDING_PROFILE, 'pending@fondonorma.test');
  assert.match(pendingDash, /⏳/);
  assert.match(pendingDash, /PENDING/);
  assert.match(pendingDash, /Aprobación administrativa pendiente/);
  assert.doesNotMatch(pendingDash, /Explorador Operativo de Certificados/);
  assert.doesNotMatch(pendingDash, /📋|🛡️|⚙️|🏢/);

  const rejectedHeader = renderHeader({
    profile: REJECTED_PROFILE,
    email: 'rejected@fondonorma.test',
    isAdmin: false,
    canViewApprovals: false,
    activeRoute: 'dashboard',
    activeSubSection: null,
    pendingCount: 0,
    openMenu: null,
  });
  assert.match(rejectedHeader, /❌/);
  assert.doesNotMatch(rejectedHeader, /📋|🛡️|⚙️|🏢/);
  assert.doesNotMatch(rejectedHeader, /Dominios Operativos/);

  const rejectedDash = renderDashboardView(REJECTED_PROFILE, 'rejected@fondonorma.test');
  assert.match(rejectedDash, /❌/);
  assert.match(rejectedDash, /REJECTED/);
  assert.match(rejectedDash, /Acceso no autorizado/);
  assert.doesNotMatch(rejectedDash, /Explorador Operativo de Certificados/);
  assert.doesNotMatch(rejectedDash, /📋|🛡️|⚙️|🏢/);
});

test('Fase 5.2 Governance Alignment: 3-block menu isolation, profile route access, and archive restoration permissions', () => {
  for (const prof of [
    ADMIN_PROFILE,
    WORKER_PROFILE,
    ASSIGNED_AUDITOR_PROFILE,
    CLIENT_PROFILE,
    PENDING_PROFILE,
    REJECTED_PROFILE,
  ]) {
    assert.equal(canAccessRoute(prof, 'profile'), true);
    assert.equal(canAccessSubview(prof, 'profile'), true);
  }

  // Verify 3 domain blocks for ADMIN/WORKER/CLIENT vs 2 blocks for AUDITOR
  assert.deepEqual(
    getVisibleDomainMenus(ADMIN_PROFILE).map((m) => m.label),
    ['Auditoría', 'Certificación', 'Extra']
  );
  assert.deepEqual(
    getVisibleDomainMenus(ASSIGNED_AUDITOR_PROFILE).map((m) => m.label),
    ['Auditoría', 'Extra']
  );

  // Archive execution for staff (ADMIN/WORKER); archived inspection/restore strictly for ADMIN
  assert.equal(canArchiveRecord(ADMIN_PROFILE), true);
  assert.equal(canArchiveRecord(WORKER_PROFILE), true);
  assert.equal(canArchiveRecord(ASSIGNED_AUDITOR_PROFILE), false);
  assert.equal(canArchiveRecord(CLIENT_PROFILE), false);

  assert.equal(canInspectArchivedRecords(ADMIN_PROFILE), true);
  assert.equal(canInspectArchivedRecords(WORKER_PROFILE), false);
  assert.equal(canInspectArchivedRecords(ASSIGNED_AUDITOR_PROFILE), false);
  assert.equal(canInspectArchivedRecords(CLIENT_PROFILE), false);
});
