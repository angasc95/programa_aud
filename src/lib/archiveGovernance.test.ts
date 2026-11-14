import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ARCHIVE_REASON_MAX_LENGTH,
  PURE_JUNCTION_DELETE_TABLES,
  PROTECTED_SOFT_DELETE_TABLES,
  buildRestorePayload,
  buildSoftDeletePayload,
  canArchiveRecord,
  canInspectArchivedRecords,
  canShowArchivedRecords,
  computeLocalArchiveDependencySummary,
  formatArchiveDependencyLines,
  formatArchivedActorDisplay,
  formatArchivedDateDisplay,
  mergeArchiveDependencySummaries,
  parseArchiveDependencySummary,
  renderArchivarButtonHtml,
  sanitizeArchiveReason,
} from './archiveGovernance';
import { canArchiveSitio } from './sitioDomain';
import { canArchiveProceso } from './procesoDomain';
import { canArchiveTurno } from './turnoDomain';
import { renderArchiveModal, renderArchiveToast } from '../views/archiveModalView';
import { renderUniversalTemplate } from '../views/universalTemplate';
import { assertZeroUuidExposure } from './zeroUuid';
import { INITIAL_ORGANIZACIONES } from './activeCertificates';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution';
import { INITIAL_NORMAS, INITIAL_REQUISITOS_LTREE, INITIAL_SECTORES_IAF, INITIAL_SUBSECTORES_IAF } from './extraDomain';
import type { UserProfile } from './healthCheck';

const ADMIN: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const WORKER: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  nombre: 'Personal Técnico Certificación',
  role: 'WORKER',
  status: 'APPROVED',
};

const AUDITOR: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Técnico Evaluador',
  role: 'AUDITOR',
  status: 'APPROVED',
};

const CLIENT: UserProfile = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Representante Organización Cliente',
  role: 'CLIENT',
  status: 'APPROVED',
};

const PENDING_ADMIN: UserProfile = {
  ...ADMIN,
  status: 'PENDING',
};

test('Phase 5.1 RBAC guards enforce archival for ADMIN/WORKER and archived inspection/restore strictly for ADMIN', () => {
  assert.equal(canArchiveRecord(ADMIN), true);
  assert.equal(canArchiveRecord(WORKER), true);
  assert.equal(canArchiveRecord(AUDITOR), false);
  assert.equal(canArchiveRecord(CLIENT), false);
  assert.equal(canArchiveRecord(PENDING_ADMIN), false);
  assert.equal(canArchiveRecord(null), false);

  assert.equal(canInspectArchivedRecords(ADMIN), true);
  assert.equal(canShowArchivedRecords(ADMIN), true);
  assert.equal(canInspectArchivedRecords(WORKER), false);
  assert.equal(canShowArchivedRecords(WORKER), false);
  assert.equal(canInspectArchivedRecords(AUDITOR), false);
  assert.equal(canInspectArchivedRecords(CLIENT), false);
  assert.equal(canInspectArchivedRecords(PENDING_ADMIN), false);
  assert.equal(canInspectArchivedRecords(null), false);
});

test('Phase 5.1 table catalogs track all 23 soft-delete tables and 5 pure M:N junction tables', () => {
  assert.equal(PROTECTED_SOFT_DELETE_TABLES.length, 23);
  assert.equal(PURE_JUNCTION_DELETE_TABLES.length, 5);
  assert.ok(PROTECTED_SOFT_DELETE_TABLES.includes('organizacion'));
  assert.ok(PROTECTED_SOFT_DELETE_TABLES.includes('certificado'));
  assert.ok(PROTECTED_SOFT_DELETE_TABLES.includes('procesos_sitio_auditoria'));
  assert.ok(PURE_JUNCTION_DELETE_TABLES.includes('requisitos_por_proceso'));
});

test('Phase 5.1 payload builders sanitize reasons, clamp at 300 chars, and omit raw UUIDs', () => {
  const longReason = `${'A'.repeat(350)} 11111111-1111-1111-1111-111111111111`;
  const sanitized = sanitizeArchiveReason(longReason);
  assert.ok(sanitized);
  assert.equal(sanitized.length, ARCHIVE_REASON_MAX_LENGTH);

  const uuidReason = sanitizeArchiveReason('Relacionado con 11111111-1111-1111-1111-111111111111');
  assert.equal(uuidReason, 'Relacionado con Referencia registrada');

  assert.equal(sanitizeArchiveReason('   '), null);

  const softDelete = buildSoftDeletePayload('  Cierre operativo  ', '2026-11-13T12:00:00.000Z');
  assert.equal(softDelete.deleted_at, '2026-11-13T12:00:00.000Z');
  assert.equal(softDelete.delete_reason, 'Cierre operativo');

  const restore = buildRestorePayload();
  assert.deepEqual(restore, { deleted_at: null, delete_reason: null });
});

test('Phase 5.1 parses and formats get_archive_dependency_summary payloads cleanly', () => {
  const blocked = parseArchiveDependencySummary({
    can_archive: false,
    total_active_dependencies: 3,
    dependencies: [
      { table: 'certificado', label: 'Certificados activos', count: 2 },
      { table: 'auditoria', label: 'Auditorías vinculadas', count: 1 },
      { table: 'sitio', label: 'Sitios', count: 0 },
    ],
  });

  assert.equal(blocked.can_archive, false);
  assert.equal(blocked.total_active_dependencies, 3);
  assert.equal(blocked.dependencies.length, 2);
  assert.deepEqual(formatArchiveDependencyLines(blocked), [
    '2 Certificados activos',
    '1 Auditorías vinculadas',
  ]);

  const unblocked = parseArchiveDependencySummary(
    JSON.stringify({ can_archive: true, total_active_dependencies: 0, dependencies: [] })
  );
  assert.equal(unblocked.can_archive, true);
  assert.equal(unblocked.total_active_dependencies, 0);
  assert.deepEqual(formatArchiveDependencyLines(unblocked), []);
});

test('Phase 5.1 local dependency calculation blocks Organizacion with active Certificados and Sitio 0 with active branches', () => {
  const org = INITIAL_ORGANIZACIONES[0];
  const orgSummary = computeLocalArchiveDependencySummary('organizacion', org.id, {
    organizaciones: INITIAL_ORGANIZACIONES,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
  });
  assert.equal(orgSummary.can_archive, false);
  assert.ok(orgSummary.total_active_dependencies > 0);
  assert.ok(orgSummary.dependencies.some((d) => d.table === 'certificado'));

  const multisiteCert = INITIAL_CERTIFICADOS_DETAILED.find((c) =>
    c.sitios.some((s) => s.numero_sitio === 0) && c.sitios.some((s) => s.numero_sitio > 0)
  );
  assert.ok(multisiteCert);
  const site0 = multisiteCert.sitios.find((s) => s.numero_sitio === 0)!;
  const site0Summary = computeLocalArchiveDependencySummary('sitio', site0.id, {
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    audits: INITIAL_PROGRAMACION_AUDITS,
  });
  assert.equal(site0Summary.can_archive, false);
  assert.ok(site0Summary.dependencies.some((d) => d.label.includes('Sitio 0')));

  const unlinkedNormaSummary = computeLocalArchiveDependencySummary('norma', 'norma-sin-hijos', {
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    requisitos: INITIAL_REQUISITOS_LTREE,
    normas: INITIAL_NORMAS,
  });
  assert.equal(unlinkedNormaSummary.can_archive, true);
  assert.equal(unlinkedNormaSummary.total_active_dependencies, 0);

  const merged = mergeArchiveDependencySummaries(
    { can_archive: true, total_active_dependencies: 0, dependencies: [] },
    orgSummary
  );
  assert.equal(merged.can_archive, false);
  assert.equal(merged.total_active_dependencies, orgSummary.total_active_dependencies);
});

test('Phase 5.1 archive modal renders blocked state, unblocked form, and zero exposed UUIDs', () => {
  const blockedHtml = renderArchiveModal({
    isOpen: true,
    tableName: 'organizacion',
    recordId: INITIAL_ORGANIZACIONES[0].id,
    entityTypeLabel: 'Organización',
    recordTitle: INITIAL_ORGANIZACIONES[0].nombre,
    recordSubtitle: INITIAL_ORGANIZACIONES[0].rif,
    loadingSummary: false,
    summary: {
      can_archive: false,
      total_active_dependencies: 2,
      dependencies: [{ table: 'certificado', label: 'Certificados activos', count: 2 }],
    },
    reason: '',
    submitting: false,
    errorMessage: null,
  });

  assert.ok(blockedHtml.includes('Archivo bloqueado por dependencias activas (2)'));
  assert.ok(blockedHtml.includes('2 Certificados activos'));
  assert.ok(blockedHtml.includes('id="confirmArchiveModalBtn"'));
  assert.ok(blockedHtml.includes('disabled'));
  assert.equal(assertZeroUuidExposure(blockedHtml).compliant, true);

  const unblockedHtml = renderArchiveModal({
    isOpen: true,
    tableName: 'norma',
    recordId: INITIAL_NORMAS[0].id,
    entityTypeLabel: 'Norma ISO',
    recordTitle: INITIAL_NORMAS[0].codigo,
    recordSubtitle: INITIAL_NORMAS[0].titulo,
    loadingSummary: false,
    summary: { can_archive: true, total_active_dependencies: 0, dependencies: [] },
    reason: 'Norma reemplazada',
    submitting: false,
    errorMessage: null,
  });

  assert.ok(unblockedHtml.includes('id="archiveReasonInput"'));
  assert.ok(unblockedHtml.includes('maxlength="300"'));
  assert.ok(unblockedHtml.includes('Confirmar Archivo'));
  assert.equal(assertZeroUuidExposure(unblockedHtml).compliant, true);

  const toastHtml = renderArchiveToast({
    message: 'Registro archivado lógicamente.',
    tone: 'success',
  });
  assert.ok(toastHtml.includes('Registro archivado lógicamente.'));
  assert.equal(assertZeroUuidExposure(toastHtml).compliant, true);
});

test('Phase 5.1 universalTemplate renders "Mostrar Archivados" & "Restaurar" strictly for ADMIN and never exposes UUIDs', () => {
  const archivedEntries = [
    {
      tableName: 'organizacion' as const,
      id: INITIAL_ORGANIZACIONES[0].id,
      title: 'Empresa Archivada S.A.',
      subtitle: 'RIF: J-99999999-0',
      deletedAt: '2026-11-13T10:30:00Z',
      deletedBy: ADMIN.id,
      deleteReason: 'Cese de operaciones',
    },
  ];

  const adminHtml = renderUniversalTemplate({
    domainKey: 'organizaciones',
    title: 'Organizaciones',
    searchQuery: '',
    totalCount: 1,
    filteredCount: 1,
    viewMode: 'grid',
    facetGroups: [],
    items: [{ id: 'org-1', nombre: 'Activa S.A.' }],
    columns: [{ id: 'nombre', header: 'Nombre', renderCell: (i) => i.nombre }],
    renderCard: (i) => `<div>${i.nombre}</div>`,
    canInspectArchived: true,
    showArchived: true,
    archivedItems: archivedEntries,
  });

  assert.ok(adminHtml.includes('data-action="toggle-show-archived"'));
  assert.ok(adminHtml.includes('Mostrar Archivados'));
  assert.ok(adminHtml.includes('Empresa Archivada S.A.'));
  assert.ok(adminHtml.includes('Administrador Principal'));
  assert.ok(adminHtml.includes('data-action="restore-archived-record"'));
  assert.ok(adminHtml.includes('Restaurar'));
  assert.equal(assertZeroUuidExposure(adminHtml).compliant, true);

  const workerHtml = renderUniversalTemplate({
    domainKey: 'organizaciones',
    title: 'Organizaciones',
    searchQuery: '',
    totalCount: 1,
    filteredCount: 1,
    viewMode: 'grid',
    facetGroups: [],
    items: [{ id: 'org-1', nombre: 'Activa S.A.' }],
    columns: [{ id: 'nombre', header: 'Nombre', renderCell: (i) => i.nombre }],
    renderCard: (i) => `<div>${i.nombre}</div>`,
    canInspectArchived: false,
    showArchived: true,
    archivedItems: archivedEntries,
  });

  assert.equal(workerHtml.includes('data-action="toggle-show-archived"'), false);
  assert.equal(workerHtml.includes('Empresa Archivada S.A.'), false);
  assert.equal(workerHtml.includes('data-action="restore-archived-record"'), false);

  const actorName = formatArchivedActorDisplay({
    deletedBy: '99999999-9999-9999-9999-999999999999',
    deletedByName: null,
  });
  assert.equal(actorName, 'Usuario del Sistema');
  assert.ok(formatArchivedDateDisplay('2026-11-13T10:30:00Z').includes('2026'));

  const archBtn = renderArchivarButtonHtml({
    tableName: 'organizacion',
    recordId: INITIAL_ORGANIZACIONES[0].id,
    entityLabel: 'Organización',
    recordTitle: INITIAL_ORGANIZACIONES[0].nombre,
    recordSubtitle: INITIAL_ORGANIZACIONES[0].rif,
  });
  assert.ok(archBtn.includes('Archivar'));
  assert.equal(assertZeroUuidExposure(archBtn).compliant, true);

  // Verify unused imports aren't flagged by checking basic local summary calls for sector & finding
  const secSummary = computeLocalArchiveDependencySummary('sector_iaf', INITIAL_SECTORES_IAF[0].id, {
    subsectores: INITIAL_SUBSECTORES_IAF,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    findings: INITIAL_PHASE5_FINDINGS,
  });
  assert.equal(secSummary.can_archive, false);
});

test('Fase 5.2 ArchiveGovernance: Sitio 0 HQ, Proceso, and Turno guards enforce dependency protection rules', () => {
  const multisiteCert = INITIAL_CERTIFICADOS_DETAILED.find(
    (c) => c.sitios.some((s) => s.numero_sitio === 0) && c.sitios.some((s) => s.numero_sitio > 0)
  )!;
  const site0 = multisiteCert.sitios.find((s) => s.numero_sitio === 0)!;
  const siblingSites = multisiteCert.sitios.map((s) => ({
    id: s.id,
    id_certificado: multisiteCert.id,
    numero_sitio: s.numero_sitio,
    deleted_at: null as string | null,
  }));

  // Sitio 0 blocked while active secondary branches exist
  const blockedByBranches = canArchiveSitio({
    site: { id: site0.id, id_certificado: multisiteCert.id, numero_sitio: 0 },
    siblingSites,
    associatedAuditsCount: 0,
  });
  assert.equal(blockedByBranches.allowed, false);
  assert.match(blockedByBranches.reason || '', /Sitio 0/);

  // Sitio 0 blocked when no branches remain but audits are still linked
  const branchesArchived = siblingSites.map((s) =>
    s.numero_sitio > 0 ? { ...s, deleted_at: '2026-11-13T00:00:00Z' } : s
  );
  const blockedByAudit = canArchiveSitio({
    site: { id: site0.id, id_certificado: multisiteCert.id, numero_sitio: 0 },
    siblingSites: branchesArchived,
    associatedAuditsCount: 1,
  });
  assert.equal(blockedByAudit.allowed, false);
  assert.match(blockedByAudit.reason || '', /auditoría/);

  // Sitio 0 unblocked only once secondary sites & linked audits are cleared
  const unblockedSite0 = canArchiveSitio({
    site: { id: site0.id, id_certificado: multisiteCert.id, numero_sitio: 0 },
    siblingSites: branchesArchived,
    associatedAuditsCount: 0,
  });
  assert.equal(unblockedSite0.allowed, true);

  // Proceso and Turno dependency guards
  assert.equal(canArchiveProceso({ associatedHallazgosCount: 1, associatedAuditoriasCount: 0 }).allowed, false);
  assert.equal(canArchiveProceso({ associatedHallazgosCount: 0, associatedAuditoriasCount: 0 }).allowed, true);
  assert.equal(canArchiveTurno({ assignedSitiosCount: 2 }).allowed, false);
  assert.equal(canArchiveTurno({ assignedSitiosCount: 0 }).allowed, true);
});

test('Fase 5.2 ArchiveGovernance: static scan confirms zero .delete() calls on protected soft-delete tables across src/', () => {
  const srcRoot = path.resolve(process.cwd(), 'src');
  const sourceFiles: string[] = [];

  const collectTsFiles = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectTsFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        sourceFiles.push(fullPath);
      }
    }
  };
  collectTsFiles(srcRoot);
  assert.ok(sourceFiles.length > 0);

  const protectedSet = new Set<string>(PROTECTED_SOFT_DELETE_TABLES);
  const pureJunctionSet = new Set<string>(PURE_JUNCTION_DELETE_TABLES);
  const fromDeletePattern = /\.from\(\s*['"]([a-z0-9_]+)['"]\s*\)\s*\.delete\s*\(/gi;

  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match: RegExpExecArray | null = fromDeletePattern.exec(content);
    while (match !== null) {
      const table = match[1];
      assert.equal(
        protectedSet.has(table),
        false,
        `Forbidden .delete() call on protected soft-delete table "${table}" in ${path.relative(process.cwd(), filePath)}`
      );
      assert.ok(
        pureJunctionSet.has(table),
        `Unexpected .delete() on non-junction table "${table}" in ${path.relative(process.cwd(), filePath)}`
      );
      match = fromDeletePattern.exec(content);
    }
  }
});
