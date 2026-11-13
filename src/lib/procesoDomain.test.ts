import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import { assertZeroUuidExposure } from './zeroUuid';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution';
import {
  canArchiveProceso,
  getAllSeededNormaRequirements,
  getScopedNormaRequirements,
  resolveProcesoDetailById,
  validateProcesoInput,
} from './procesoDomain';
import { renderProcesoView } from '../views/procesoView';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const WORKER_PROFILE: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  nombre: 'Personal Técnico',
  role: 'WORKER',
  status: 'APPROVED',
};

const AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Líder',
  role: 'AUDITOR',
  status: 'APPROVED',
};

const CLIENT_PROFILE: UserProfile = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Usuario Cliente',
  role: 'CLIENT',
  status: 'APPROVED',
};

test('Phase 4.2.3: validateProcesoInput enforces 2..150 char name, allowed tipo enum, and per-certificate uniqueness', () => {
  const existingProcesses = [
    {
      id: 'proc-1',
      id_certificado: 'cert-1',
      nombre_proceso: 'Troquelado y Fundición',
      deleted_at: null,
    },
    {
      id: 'proc-deleted',
      id_certificado: 'cert-1',
      nombre_proceso: 'Embalaje Histórico',
      deleted_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'proc-other-cert',
      id_certificado: 'cert-2',
      nombre_proceso: 'Logística',
      deleted_at: null,
    },
  ];

  assert.equal(
    validateProcesoInput({
      nombre_proceso: 'A',
      tipo: 'Medular',
      id_certificado: 'cert-1',
      existingProcesses,
    }).valid,
    false
  );

  assert.equal(
    validateProcesoInput({
      nombre_proceso: 'X'.repeat(151),
      tipo: 'Medular',
      id_certificado: 'cert-1',
      existingProcesses,
    }).valid,
    false
  );

  assert.equal(
    validateProcesoInput({
      nombre_proceso: 'Control de Calidad',
      tipo: 'OperativoInvalido',
      id_certificado: 'cert-1',
      existingProcesses,
    }).valid,
    false
  );

  const duplicate = validateProcesoInput({
    nombre_proceso: '  troquelado y fundición ',
    tipo: 'Medular',
    id_certificado: 'cert-1',
    currentProcesoId: 'proc-2',
    existingProcesses,
  });
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.error?.includes('Ya existe un proceso activo'));

  const sameRecord = validateProcesoInput({
    nombre_proceso: 'Troquelado y Fundición',
    tipo: 'Medular',
    responsable: 'Ing. Roberto Silva',
    id_certificado: 'cert-1',
    currentProcesoId: 'proc-1',
    existingProcesses,
  });
  assert.equal(sameRecord.valid, true);
  assert.equal(sameRecord.normalized?.tipo, 'Medular');
  assert.equal(sameRecord.normalized?.responsable, 'Ing. Roberto Silva');

  const reuseSoftDeleted = validateProcesoInput({
    nombre_proceso: 'Embalaje Histórico',
    tipo: 'De Apoyo',
    id_certificado: 'cert-1',
    existingProcesses,
  });
  assert.equal(reuseSoftDeleted.valid, true);
});

test('Phase 4.2.3: getScopedNormaRequirements restricts LTREE clauses strictly to parent certificate Norma', () => {
  const catalog = getAllSeededNormaRequirements();

  const iso9001 = getScopedNormaRequirements({
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    requirementsCatalog: catalog,
  });
  assert.ok(iso9001.length >= 5);
  assert.equal(
    iso9001.every((r) => r.norma_codigo === 'ISO 9001:2015'),
    true
  );

  const iso14001 = getScopedNormaRequirements({
    id_norma: 'e0000000-0000-0000-0000-000000014001',
    norma_codigo: 'ISO 14001:2015',
    requirementsCatalog: catalog,
  });
  assert.ok(iso14001.length >= 3);
  assert.equal(
    iso14001.every((r) => r.norma_codigo === 'ISO 14001:2015'),
    true
  );

  const iso27001 = getScopedNormaRequirements({
    id_norma: 'e0000000-0000-0000-0000-000000027001',
    norma_codigo: 'ISO/IEC 27001:2022',
    requirementsCatalog: catalog,
  });
  assert.ok(iso27001.length >= 3);
  assert.equal(
    iso27001.every((r) => r.norma_codigo === 'ISO/IEC 27001:2022'),
    true
  );
});

test('Phase 4.2.3: canArchiveProceso blocks archiving when hallazgos or auditorias exist', () => {
  const blockedFinding = canArchiveProceso({
    associatedHallazgosCount: 1,
    associatedAuditoriasCount: 0,
  });
  assert.equal(blockedFinding.allowed, false);
  assert.ok(blockedFinding.reason?.includes('hallazgo'));

  const blockedAudit = canArchiveProceso({
    associatedHallazgosCount: 0,
    associatedAuditoriasCount: 2,
  });
  assert.equal(blockedAudit.allowed, false);
  assert.ok(blockedAudit.reason?.includes('auditoría'));

  const allowed = canArchiveProceso({
    associatedHallazgosCount: 0,
    associatedAuditoriasCount: 0,
  });
  assert.equal(allowed.allowed, true);
});

test('Phase 4.2.3: resolveProcesoDetailById and renderProcesoView render 3-Zone layout, LTREE mapping, RBAC, and Zero-UUID', () => {
  const cert = INITIAL_CERTIFICADOS_DETAILED[0];
  const proc = cert.procesos[0];

  const resolved = resolveProcesoDetailById({
    procesoId: proc.id,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    phase5Findings: INITIAL_PHASE5_FINDINGS,
  });
  assert.ok(resolved);
  assert.equal(resolved.numero_certificado, cert.numero_certificado);
  assert.equal(resolved.organizacion_nombre, cert.organizacion_nombre);
  assert.ok(resolved.requisitos.length > 0);
  assert.ok(resolved.hallazgos.length > 0);
  assert.ok(resolved.auditorias.length > 0);

  // Respects archivedProcesoIds
  assert.equal(
    resolveProcesoDetailById({
      procesoId: proc.id,
      certificates: INITIAL_CERTIFICADOS_DETAILED,
      programacionAudits: INITIAL_PROGRAMACION_AUDITS,
      phase5Findings: INITIAL_PHASE5_FINDINGS,
      archivedProcesoIds: new Set([proc.id]),
    }),
    null
  );

  const adminHtml = renderProcesoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedProcesoId: resolved.id,
      activeChildTab: 'requisitos',
      isEditingAttributes: false,
      isAssigningRequisito: true,
    },
    proceso: resolved,
  });

  // Strict 3-Zone order + Parent Zone chips
  assert.ok(adminHtml.includes('aria-label="Contexto y relaciones superiores"'));
  assert.ok(adminHtml.includes('data-parent-nav="true"'));
  assert.ok(adminHtml.includes('data-action="open-changelog"'));
  assert.ok(adminHtml.includes('id="startEditProcesoBtn"'));
  assert.ok(adminHtml.includes('data-action="open-archive-proceso"'));
  assert.ok(adminHtml.includes('data-action="toggle-assign-proceso-req"'));
  assert.ok(adminHtml.includes('id="assignProcesoRequisitoForm"'));
  assert.ok(adminHtml.includes('data-action="unassign-proceso-req"'));
  assert.ok(
    adminHtml.indexOf('aria-label="Contexto y relaciones superiores"') <
      adminHtml.indexOf('<hr class="border-t border-slate-200 my-4" />') &&
      adminHtml.indexOf('<hr class="border-t border-slate-200 my-4" />') <
        adminHtml.indexOf('aria-label="Detalle del registro"') &&
      adminHtml.indexOf('aria-label="Detalle del registro"') < adminHtml.indexOf('role="tablist"')
  );

  // Zero-UUID compliance
  const zeroAdmin = assertZeroUuidExposure(adminHtml);
  assert.equal(zeroAdmin.compliant, true, zeroAdmin.exposedUuids.join(', '));

  // Worker has write access
  const workerHtml = renderProcesoView({
    profile: WORKER_PROFILE,
    state: {
      selectedProcesoId: resolved.id,
      activeChildTab: 'hallazgos',
      isEditingAttributes: false,
    },
    proceso: resolved,
  });
  assert.ok(workerHtml.includes('id="startEditProcesoBtn"'));
  assert.ok(workerHtml.includes('data-action="go-audit-results"'));
  assert.equal(assertZeroUuidExposure(workerHtml).compliant, true);

  // Auditor & Client are strictly read-only
  for (const readOnlyProfile of [AUDITOR_PROFILE, CLIENT_PROFILE]) {
    const readOnlyHtml = renderProcesoView({
      profile: readOnlyProfile,
      state: {
        selectedProcesoId: resolved.id,
        activeChildTab: 'requisitos',
        isEditingAttributes: true,
        isAssigningRequisito: true,
      },
      proceso: resolved,
    });
    assert.equal(readOnlyHtml.includes('id="startEditProcesoBtn"'), false);
    assert.equal(readOnlyHtml.includes('id="editProcesoForm"'), false);
    assert.equal(readOnlyHtml.includes('data-action="open-archive-proceso"'), false);
    assert.equal(readOnlyHtml.includes('data-action="toggle-assign-proceso-req"'), false);
    assert.equal(readOnlyHtml.includes('data-action="unassign-proceso-req"'), false);
    assert.equal(assertZeroUuidExposure(readOnlyHtml).compliant, true);
  }
});
