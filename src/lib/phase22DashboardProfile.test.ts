import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSelfProfileUpdatePayload,
  validatePasswordChangeInput,
  formatSpanishDate,
  type UserProfile,
} from './healthCheck';
import {
  computeDashboardSummaryMetrics,
  scopeOrganizacionEntitiesForProfile,
  scopeDetailedCertsForProfile,
  scopeProgramacionAuditsForProfile,
  scopePhase5FindingsForProfile,
} from './accessControl';
import { INITIAL_ORGANIZACIONES } from './activeCertificates';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution';
import { INITIAL_ACREDITACIONES } from './extraDomain';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderDashboardView } from '../views/dashboardView';
import { renderProfileView, type ProfileFormState } from '../views/profileView';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
  created_at: '2026-10-15T12:00:00Z',
};

const WORKER_PROFILE: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  nombre: 'Coordinador Técnico',
  role: 'WORKER',
  status: 'APPROVED',
  created_at: '2026-10-16T12:00:00Z',
};

const AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Técnico Evaluador',
  role: 'AUDITOR',
  status: 'APPROVED',
  created_at: '2026-10-17T12:00:00Z',
};

const CLIENT_PROFILE: UserProfile = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Cliente Corporativo',
  role: 'CLIENT',
  status: 'APPROVED',
  created_at: '2026-10-18T12:00:00Z',
};

const PENDING_PROFILE: UserProfile = {
  id: '55555555-5555-5555-5555-555555555555',
  nombre: 'Usuario Pendiente',
  role: 'CLIENT',
  status: 'PENDING',
  created_at: '2026-11-01T12:00:00Z',
};

function makeFormState(nombreInput: string): ProfileFormState {
  return {
    nombreInput,
    savingProfile: false,
    profileFeedback: null,
    profileError: null,
    passwordSectionOpen: false,
    newPasswordInput: '',
    confirmPasswordInput: '',
    savingPassword: false,
    passwordFeedback: null,
    passwordError: null,
  };
}

test('Phase 2.2: buildSelfProfileUpdatePayload trims, validates bounds/UUIDs, and emits strictly { nombre }', () => {
  const valid = buildSelfProfileUpdatePayload('   Ing. Carlos Mendoza   ');
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.deepEqual(Object.keys(valid.payload), ['nombre']);
    assert.equal(valid.payload.nombre, 'Ing. Carlos Mendoza');
    assert.equal('role' in valid.payload, false);
    assert.equal('status' in valid.payload, false);
  }

  const empty = buildSelfProfileUpdatePayload('     ');
  assert.equal(empty.ok, false);

  const tooShort = buildSelfProfileUpdatePayload(' A ');
  assert.equal(tooShort.ok, false);

  const tooLong = buildSelfProfileUpdatePayload('X'.repeat(151));
  assert.equal(tooLong.ok, false);

  const withUuid = buildSelfProfileUpdatePayload('Usuario 11111111-1111-1111-1111-111111111111');
  assert.equal(withUuid.ok, false);
});

test('Phase 2.2: validatePasswordChangeInput enforces minimum 8 chars and confirmation match', () => {
  assert.equal(validatePasswordChangeInput('short', 'short').ok, false);
  assert.equal(validatePasswordChangeInput('Password123*', 'Password999*').ok, false);
  const valid = validatePasswordChangeInput('Password123*', 'Password123*');
  assert.equal(valid.ok, true);
});

test('Phase 2.2: computeDashboardSummaryMetrics computes RBAC-scoped counts accurately', () => {
  const adminAudits = scopeProgramacionAuditsForProfile(INITIAL_PROGRAMACION_AUDITS, ADMIN_PROFILE, []);
  const adminMetrics = computeDashboardSummaryMetrics({
    profile: ADMIN_PROFILE,
    scopedOrganizaciones: scopeOrganizacionEntitiesForProfile(INITIAL_ORGANIZACIONES, ADMIN_PROFILE, [], adminAudits),
    scopedCertificados: scopeDetailedCertsForProfile(INITIAL_CERTIFICADOS_DETAILED, ADMIN_PROFILE, [], adminAudits),
    scopedAuditorias: adminAudits,
    acreditaciones: INITIAL_ACREDITACIONES,
    scopedHallazgos: scopePhase5FindingsForProfile(INITIAL_PHASE5_FINDINGS, adminAudits, ADMIN_PROFILE),
  });

  assert.ok(adminMetrics.organizacionesActivas >= 1);
  assert.ok(adminMetrics.certificadosVigentes >= 1);
  assert.ok(adminMetrics.auditoriasProgramadas >= 1);
  assert.ok(adminMetrics.acreditacionesActivas >= 1);

  const iberometalId = INITIAL_ORGANIZACIONES[0].id;
  const clientAudits = scopeProgramacionAuditsForProfile(INITIAL_PROGRAMACION_AUDITS, CLIENT_PROFILE, [iberometalId]);
  const clientMetrics = computeDashboardSummaryMetrics({
    profile: CLIENT_PROFILE,
    scopedOrganizaciones: scopeOrganizacionEntitiesForProfile(INITIAL_ORGANIZACIONES, CLIENT_PROFILE, [iberometalId], clientAudits),
    scopedCertificados: scopeDetailedCertsForProfile(INITIAL_CERTIFICADOS_DETAILED, CLIENT_PROFILE, [iberometalId], clientAudits),
    scopedAuditorias: clientAudits,
    acreditaciones: INITIAL_ACREDITACIONES,
    scopedHallazgos: scopePhase5FindingsForProfile(INITIAL_PHASE5_FINDINGS, clientAudits, CLIENT_PROFILE),
  });

  assert.equal(clientMetrics.organizacionesActivas, 1);
  assert.ok(clientMetrics.certificadosVigentes <= adminMetrics.certificadosVigentes);

  const pendingMetrics = computeDashboardSummaryMetrics({
    profile: PENDING_PROFILE,
    scopedOrganizaciones: [],
    scopedCertificados: [],
    scopedAuditorias: [],
    acreditaciones: INITIAL_ACREDITACIONES,
    scopedHallazgos: [],
  });
  assert.deepEqual(pendingMetrics, {
    organizacionesActivas: 0,
    certificadosVigentes: 0,
    auditoriasProgramadas: 0,
    acreditacionesActivas: 0,
    hallazgosAbiertos: 0,
  });
});

test('Phase 2.2: dashboardView renders clean welcome + 5 summary metrics with zero role/status pills or certificate explorer', () => {
  const html = renderDashboardView(ADMIN_PROFILE, 'admin@fondonorma.test', {
    organizacionesActivas: 3,
    certificadosVigentes: 3,
    auditoriasProgramadas: 6,
    acreditacionesActivas: 4,
    hallazgosAbiertos: 3,
  });

  assert.match(html, /Bienvenido, Administrador Principal/);
  assert.match(html, /admin@fondonorma\.test/);
  assert.match(html, /Organizaciones Activas/);
  assert.match(html, /Certificados Vigentes/);
  assert.match(html, /Auditorías Programadas/);
  assert.match(html, /Acreditaciones Activas/);
  assert.match(html, /Hallazgos Abiertos/);
  assert.match(html, /tabular-nums/);

  assert.equal(html.includes('Explorador Operativo de Certificados'), false);
  assert.equal(html.includes('certificateSearchInput'), false);
  assert.equal(html.includes('ADMIN'), false);
  assert.equal(html.includes('APPROVED'), false);
  assert.equal(html.includes('border-l-4'), false);
  assert.equal(assertZeroUuidExposure(html).compliant, true);
});

test('Phase 2.2: profileView renders read-only governance fields, editable nombre form, password section, and role panels cleanly', () => {
  const workerHtml = renderProfileView({
    profile: WORKER_PROFILE,
    userEmail: 'worker@fondonorma.test',
    formState: {
      ...makeFormState(WORKER_PROFILE.nombre),
      passwordSectionOpen: true,
    },
    auditorsDetailed: INITIAL_AUDITORES_DETAILED,
  });

  assert.match(workerHtml, /Coordinador Técnico/);
  assert.match(workerHtml, /worker@fondonorma\.test/);
  assert.match(workerHtml, /WORKER \(Personal Operativo\)/);
  assert.match(workerHtml, /APPROVED \(Aprobado\)/);
  assert.match(workerHtml, /Gestionado exclusivamente por un Administrador en Panel Aprobaciones/);
  assert.match(workerHtml, /id="profileNameForm"/);
  assert.match(workerHtml, /id="profileNombreInput"/);
  assert.match(workerHtml, /id="profilePasswordForm"/);
  assert.match(workerHtml, new RegExp(formatSpanishDate(WORKER_PROFILE.created_at)));
  // No editable select/input controls for role or status
  assert.equal(/name="(role|status)"/i.test(workerHtml), false);
  assert.equal(assertZeroUuidExposure(workerHtml).compliant, true);

  const clientHtml = renderProfileView({
    profile: CLIENT_PROFILE,
    userEmail: 'client@fondonorma.test',
    formState: makeFormState(CLIENT_PROFILE.nombre),
    clientAccessItems: [
      {
        id_organizacion: INITIAL_ORGANIZACIONES[0].id,
        organizacion_nombre: INITIAL_ORGANIZACIONES[0].nombre,
        rif: INITIAL_ORGANIZACIONES[0].rif,
        estado: 'APPROVED',
        fecha_solicitud: '2026-10-18T12:00:00Z',
      },
    ],
  });
  assert.match(clientHtml, /Organizaciones vinculadas/);
  assert.match(clientHtml, /Iberometal Componentes S\.A\./);
  assert.equal(assertZeroUuidExposure(clientHtml).compliant, true);

  const auditorHtml = renderProfileView({
    profile: AUDITOR_PROFILE,
    userEmail: 'auditor@fondonorma.test',
    formState: makeFormState(AUDITOR_PROFILE.nombre),
    auditorsDetailed: INITIAL_AUDITORES_DETAILED,
  });
  assert.match(auditorHtml, /Resumen de competencias técnicas/);
  assert.match(auditorHtml, /AUD-REG-2023-33/);
  assert.match(auditorHtml, /ISO 9001:2015/);
  assert.equal(assertZeroUuidExposure(auditorHtml).compliant, true);
});
