import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFindingTypeMeta,
  getAuditModalityMeta,
  calculateFindingStats,
  filterFindings,
  validateFindingInput,
  validateAuditPlanningInput,
  isAuditorQualifiedForAudit,
  evaluateCertificateIssuanceReadiness,
  verifyAuditLogImmutabilityRule,
  verifyRoleDataBoundary,
  INITIAL_FINDINGS,
  type FindingRecord,
} from './auditDomain';

test('getAuditModalityMeta returns accurate metadata and ISO audit descriptors', () => {
  const e1 = getAuditModalityMeta('ETAPA_1');
  assert.equal(e1.symbol, '📑');
  assert.match(e1.label, /Etapa 1/);

  const e2 = getAuditModalityMeta('ETAPA_2');
  assert.equal(e2.symbol, '🔍');
  assert.match(e2.label, /Etapa 2/);

  const v1 = getAuditModalityMeta('VIGILANCIA_1');
  assert.equal(v1.symbol, '🔎');

  const recert = getAuditModalityMeta('RECERTIFICACION');
  assert.equal(recert.symbol, '🔄');
  assert.match(recert.label, /Recertificación/);
});

test('getFindingTypeMeta returns correct visual metadata and symbols', () => {
  const mayor = getFindingTypeMeta('NC_MAYOR');
  assert.equal(mayor.symbol, '🚨');
  assert.match(mayor.badgeClass, /rose/);

  const menor = getFindingTypeMeta('NC_MENOR');
  assert.equal(menor.symbol, '⚠️');
  assert.match(menor.badgeClass, /amber/);

  const obs = getFindingTypeMeta('OBSERVACION');
  assert.equal(obs.symbol, '👁️');
  assert.match(obs.badgeClass, /blue/);

  const om = getFindingTypeMeta('OPORTUNIDAD_MEJORA');
  assert.equal(om.symbol, '💡');
  assert.match(om.badgeClass, /emerald/);
});

test('calculateFindingStats correctly aggregates totals and statuses', () => {
  const stats = calculateFindingStats(INITIAL_FINDINGS);
  assert.equal(stats.total, 3);
  assert.equal(stats.ncMayor, 0);
  assert.equal(stats.ncMenor, 1);
  assert.equal(stats.observaciones, 1);
  assert.equal(stats.oportunidadesMejora, 1);
  assert.equal(stats.abiertos, 2);
  assert.equal(stats.cerrados, 1);
});

test('filterFindings filters by type, status, and search string', () => {
  const ncMenorOnly = filterFindings(INITIAL_FINDINGS, { type: 'NC_MENOR' });
  assert.equal(ncMenorOnly.length, 1);
  assert.equal(ncMenorOnly[0].id, 'a1000000-0000-0000-0000-000000000001');

  const openOnly = filterFindings(INITIAL_FINDINGS, { status: 'open' });
  assert.equal(openOnly.length, 2);

  const closedOnly = filterFindings(INITIAL_FINDINGS, { status: 'closed' });
  assert.equal(closedOnly.length, 1);
  assert.equal(closedOnly[0].cerrado, true);

  const searchFoda = filterFindings(INITIAL_FINDINGS, { search: 'FODA' });
  assert.equal(searchFoda.length, 1);
  assert.equal(searchFoda[0].tipo, 'OBSERVACION');

  const searchClause = filterFindings(INITIAL_FINDINGS, { search: '8.5' });
  assert.equal(searchClause.length, 2);
});

test('validateFindingInput enforces mandatory fields and ISO 19011 types', () => {
  const missingAudit = validateFindingInput({
    id_auditoria: '',
    id_requisito: 'req-1',
    id_proceso: 'proc-1',
    tipo: 'NC_MAYOR',
    descripcion: 'Valid description',
  });
  assert.equal(missingAudit.valid, false);

  const invalidType = validateFindingInput({
    id_auditoria: 'audit-1',
    id_requisito: 'req-1',
    id_proceso: 'proc-1',
    tipo: 'INVALID_TYPE',
    descripcion: 'Valid description',
  });
  assert.equal(invalidType.valid, false);

  const shortDesc = validateFindingInput({
    id_auditoria: 'audit-1',
    id_requisito: 'req-1',
    id_proceso: 'proc-1',
    tipo: 'NC_MAYOR',
    descripcion: 'NC',
  });
  assert.equal(shortDesc.valid, false);

  const valid = validateFindingInput({
    id_auditoria: 'audit-1',
    id_requisito: 'req-1',
    id_proceso: 'proc-1',
    tipo: 'NC_MAYOR',
    descripcion: 'Falla en el control de calibración de instrumentos.',
  });
  assert.equal(valid.valid, true);
});

test('validateAuditPlanningInput validates certificate, modality, and date format', () => {
  const invalidDate = validateAuditPlanningInput({
    id_certificado: 'cert-1',
    id_tipo_auditoria: 'tipo-1',
    id_metodologia: 'met-1',
    fecha_programacion: '20-11-2024',
  });
  assert.equal(invalidDate.valid, false);

  const valid = validateAuditPlanningInput({
    id_certificado: 'cert-1',
    id_tipo_auditoria: 'tipo-1',
    id_metodologia: 'met-1',
    fecha_programacion: '2024-11-20',
  });
  assert.equal(valid.valid, true);
});

test('isAuditorQualifiedForAudit verifies ISO standards and IAF sector competencies', () => {
  const qualified = isAuditorQualifiedForAudit(
    ['ISO 9001:2015', 'ISO 14001:2015'],
    [17, 28],
    'ISO 9001:2015',
    17
  );
  assert.equal(qualified.qualified, true);

  const unqualifiedNorm = isAuditorQualifiedForAudit(
    ['ISO 14001:2015'],
    [17],
    'ISO 9001:2015',
    17
  );
  assert.equal(unqualifiedNorm.qualified, false);
  assert.match(unqualifiedNorm.reason, /acreditación vigente/);

  const unqualifiedIaf = isAuditorQualifiedForAudit(
    ['ISO 9001:2015'],
    [28],
    'ISO 9001:2015',
    17
  );
  assert.equal(unqualifiedIaf.qualified, false);
  assert.match(unqualifiedIaf.reason, /sector IAF 17/);
});

test('evaluateCertificateIssuanceReadiness blocks issuance when mandatory requirements are pending or major NCs remain open', () => {
  const requirements = [
    { codigo: '4.1', estado: 'CUBIERTO' as const },
    { codigo: '4.2', estado: 'PENDIENTE' as const },
    { codigo: '5.1', estado: 'NO_APLICABLE' as const },
    { codigo: '8.5', estado: 'CUBIERTO' as const },
  ];

  const findingsWithOpenMajor: FindingRecord[] = [
    {
      id: 'f-1',
      id_auditoria: 'a-1',
      id_requisito: 'r-1',
      requisito_codigo: '4.2',
      id_proceso: 'p-1',
      proceso_nombre: 'Fundición',
      tipo: 'NC_MAYOR',
      descripcion: 'Falla crítica de control',
      cerrado: false,
    },
  ];

  const blocked = evaluateCertificateIssuanceReadiness(requirements, findingsWithOpenMajor);
  assert.equal(blocked.canIssue, false);
  assert.equal(blocked.mandatoryPendingCount, 1);
  assert.equal(blocked.openMajorNcCount, 1);
  assert.equal(blocked.blockingReasons.length, 2);

  // When resolved
  const resolvedRequirements = [
    { codigo: '4.1', estado: 'CUBIERTO' as const },
    { codigo: '4.2', estado: 'CUBIERTO' as const },
    { codigo: '5.1', estado: 'NO_APLICABLE' as const },
    { codigo: '8.5', estado: 'CUBIERTO' as const },
  ];
  const closedFindings: FindingRecord[] = [
    { ...findingsWithOpenMajor[0], cerrado: true },
  ];

  const ready = evaluateCertificateIssuanceReadiness(resolvedRequirements, closedFindings);
  assert.equal(ready.canIssue, true);
  assert.equal(ready.mandatoryPendingCount, 0);
  assert.equal(ready.openMajorNcCount, 0);
  assert.equal(ready.blockingReasons.length, 0);
  assert.equal(ready.coveragePercentage, 100);
});

test('verifyAuditLogImmutabilityRule rejects UPDATE and DELETE operations and unauthorized non-system inserts', () => {
  const updateAttempt = verifyAuditLogImmutabilityRule('UPDATE', 'ADMIN');
  assert.equal(updateAttempt.allowed, false);
  assert.match(updateAttempt.reason, /Violación de Inmutabilidad/);

  const deleteAttempt = verifyAuditLogImmutabilityRule('DELETE', 'ADMIN');
  assert.equal(deleteAttempt.allowed, false);
  assert.match(deleteAttempt.reason, /Violación de Inmutabilidad/);

  const clientInsertAttempt = verifyAuditLogImmutabilityRule('INSERT', 'CLIENT');
  assert.equal(clientInsertAttempt.allowed, false);
  assert.match(clientInsertAttempt.reason, /Violación de Trazabilidad/);

  const systemTriggerInsert = verifyAuditLogImmutabilityRule('INSERT', 'SYSTEM_TRIGGER');
  assert.equal(systemTriggerInsert.allowed, true);
});

test('verifyRoleDataBoundary enforces strict multi-role partitioning', () => {
  // Pending profile cannot access any resource
  const pendingUser = verifyRoleDataBoundary('ADMIN', 'all_orgs', { isApprovedStatus: false });
  assert.equal(pendingUser.canAccess, false);

  // Worker cannot access audit_log (Admin exclusive)
  const workerAuditLog = verifyRoleDataBoundary('WORKER', 'audit_log', { isApprovedStatus: true });
  assert.equal(workerAuditLog.canAccess, false);

  // Worker has global operational access
  const workerOrgs = verifyRoleDataBoundary('WORKER', 'all_orgs', { isApprovedStatus: true });
  assert.equal(workerOrgs.canAccess, true);

  // Auditor can only access assigned audits
  const unassignedAuditor = verifyRoleDataBoundary('AUDITOR', 'assigned_audits', {
    isApprovedStatus: true,
    isAssignedAuditor: false,
  });
  assert.equal(unassignedAuditor.canAccess, false);

  const assignedAuditor = verifyRoleDataBoundary('AUDITOR', 'assigned_audits', {
    isApprovedStatus: true,
    isAssignedAuditor: true,
  });
  assert.equal(assignedAuditor.canAccess, true);

  // Client can only access approved orgs
  const unapprovedClient = verifyRoleDataBoundary('CLIENT', 'approved_orgs', {
    isApprovedStatus: true,
    hasApprovedClientAccess: false,
  });
  assert.equal(unapprovedClient.canAccess, false);

  const approvedClient = verifyRoleDataBoundary('CLIENT', 'approved_orgs', {
    isApprovedStatus: true,
    hasApprovedClientAccess: true,
  });
  assert.equal(approvedClient.canAccess, true);
});
