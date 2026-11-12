import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import {
  INITIAL_PROGRAMACION_AUDITS,
  INITIAL_PHASE5_FINDINGS,
} from './auditExecution';
import { SAMPLE_CERTIFICATE_RECORDS } from './searchControls';
import { INITIAL_ORGANIZACIONES } from './activeCertificates';
import {
  canEditAuditScheduleOrTeam,
  canMutateAuditExecution,
  isApprovedStaffProfile,
  isAuditAssignedToProfile,
  scopeCertificateRecordsForProfile,
  scopeOrganizacionEntitiesForProfile,
  scopePhase5FindingsForProfile,
  scopeProgramacionAuditsForProfile,
} from './accessControl';

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

const AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Técnico Evaluador',
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
  nombre: 'Usuario Pendiente',
  role: 'ADMIN',
  status: 'PENDING',
};

const CLIENT_ORG_IDS = ['30000000-0000-0000-0000-000000000001'];

test('staff and schedule/team edit permissions exclude AUDITOR, CLIENT, and PENDING', () => {
  assert.equal(isApprovedStaffProfile(ADMIN_PROFILE), true);
  assert.equal(isApprovedStaffProfile(WORKER_PROFILE), true);
  assert.equal(isApprovedStaffProfile(AUDITOR_PROFILE), false);
  assert.equal(isApprovedStaffProfile(CLIENT_PROFILE), false);
  assert.equal(isApprovedStaffProfile(PENDING_PROFILE), false);

  assert.equal(canEditAuditScheduleOrTeam(ADMIN_PROFILE), true);
  assert.equal(canEditAuditScheduleOrTeam(WORKER_PROFILE), true);
  assert.equal(canEditAuditScheduleOrTeam(AUDITOR_PROFILE), false);
  assert.equal(canEditAuditScheduleOrTeam(CLIENT_PROFILE), false);
});

test('AUDITOR is scoped strictly to assigned audits and can mutate only those audits', () => {
  const assignedAudit = INITIAL_PROGRAMACION_AUDITS[0]; // AUD-2024-001
  const unassignedAudit = INITIAL_PROGRAMACION_AUDITS[1]; // AUD-2024-002

  assert.equal(isAuditAssignedToProfile(assignedAudit, AUDITOR_PROFILE), true);
  assert.equal(isAuditAssignedToProfile(unassignedAudit, AUDITOR_PROFILE), false);

  assert.equal(canMutateAuditExecution(assignedAudit, AUDITOR_PROFILE), true);
  assert.equal(canMutateAuditExecution(unassignedAudit, AUDITOR_PROFILE), false);
  assert.equal(canMutateAuditExecution(assignedAudit, CLIENT_PROFILE), false);
  assert.equal(canMutateAuditExecution(assignedAudit, WORKER_PROFILE), true);

  const scopedAudits = scopeProgramacionAuditsForProfile(
    INITIAL_PROGRAMACION_AUDITS,
    AUDITOR_PROFILE,
    []
  );
  assert.equal(scopedAudits.length, 1);
  assert.equal(scopedAudits[0].codigo_auditoria, 'AUD-2024-001');

  const scopedFindings = scopePhase5FindingsForProfile(
    INITIAL_PHASE5_FINDINGS,
    scopedAudits,
    AUDITOR_PROFILE
  );
  assert.ok(scopedFindings.length > 0);
  assert.ok(scopedFindings.every((f) => f.id_auditoria === assignedAudit.id));
});

test('CLIENT is strictly isolated to authorized organization records and read-only', () => {
  const scopedAudits = scopeProgramacionAuditsForProfile(
    INITIAL_PROGRAMACION_AUDITS,
    CLIENT_PROFILE,
    CLIENT_ORG_IDS
  );
  assert.ok(scopedAudits.length >= 1);
  assert.ok(scopedAudits.every((a) => a.id_organizacion === CLIENT_ORG_IDS[0]));

  const scopedCerts = scopeCertificateRecordsForProfile(
    SAMPLE_CERTIFICATE_RECORDS,
    CLIENT_PROFILE,
    CLIENT_ORG_IDS,
    scopedAudits
  );
  assert.equal(scopedCerts.length, 1);
  assert.equal(scopedCerts[0].organizacion_id, CLIENT_ORG_IDS[0]);

  const scopedOrgs = scopeOrganizacionEntitiesForProfile(
    INITIAL_ORGANIZACIONES,
    CLIENT_PROFILE,
    CLIENT_ORG_IDS,
    scopedAudits
  );
  assert.equal(scopedOrgs.length, 1);
  assert.equal(scopedOrgs[0].id, CLIENT_ORG_IDS[0]);
});

test('PENDING profile sees zero operational audits, certificates, findings, or organizations', () => {
  assert.deepEqual(
    scopeProgramacionAuditsForProfile(INITIAL_PROGRAMACION_AUDITS, PENDING_PROFILE, CLIENT_ORG_IDS),
    []
  );
  assert.deepEqual(
    scopeCertificateRecordsForProfile(SAMPLE_CERTIFICATE_RECORDS, PENDING_PROFILE, CLIENT_ORG_IDS, []),
    []
  );
  assert.deepEqual(
    scopeOrganizacionEntitiesForProfile(INITIAL_ORGANIZACIONES, PENDING_PROFILE, CLIENT_ORG_IDS, []),
    []
  );
});
