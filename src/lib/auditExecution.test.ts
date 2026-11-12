import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalendarMonthGrid,
  calculateGanttBarsForMonth,
  calculatePhase5FindingStats,
  createSessionAuditLogEntry,
  detectAuditorConflicts,
  evaluateIso17021Recommendation,
  filterAndSortProgramacionAudits,
  filterCalendarAudits,
  filterPhase5Findings,
  getQuarterMonthsForMonth,
  INITIAL_PHASE5_FINDINGS,
  INITIAL_PROGRAMACION_AUDITS,
  validateFindingLifecycleUpdate,
  validatePhase5FindingInput,
  validateRecommendationSignature,
  type CalendarioViewState,
  type Phase5FindingEntity,
  type ProgramacionViewState,
  type ResultadoViewState,
} from './auditExecution';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import type { UserProfile } from './healthCheck';
import type { CertificateRecord } from './searchControls';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderProgramacionView } from '../views/programacionView';
import { renderCalendarioView } from '../views/calendarioView';
import { renderResultadoView } from '../views/resultadoView';
import { renderAuditoriasView } from '../views/auditoriasView';

const TEST_ADMIN_PROFILE: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'Admin Certificación',
  role: 'ADMIN',
  status: 'APPROVED',
};

const TEST_CERTIFICATES: CertificateRecord[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_id: '30000000-0000-0000-0000-000000000001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    nif_cuit: 'J-30192837-4',
    norma: 'ISO 9001:2015',
    sector_iaf: 17,
    estatus: 'ACTIVO',
    fecha_emision: '2024-01-15',
    fecha_vencimiento: '2027-01-14',
    direccion_fiscal: 'Av. Industrial 100, Valencia',
  },
];

const TEST_PROCESSES = [
  { id: '60000000-0000-0000-0000-000000000001', nombre_proceso: 'Troquelado y Fundición' },
  { id: '60000000-0000-0000-0000-000000000002', nombre_proceso: 'Dirección Estratégica y Calidad' },
];

const TEST_REQUIREMENTS = [
  { id: 'f0000000-0000-0000-0000-000000000041', codigo: '4.1', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000085', codigo: '8.5', norma: 'ISO 9001:2015' },
];

test('filterAndSortProgramacionAudits filters by search query, facets, and sorts deterministically', () => {
  const byQuery = filterAndSortProgramacionAudits(INITIAL_PROGRAMACION_AUDITS, {
    query: 'iberometal',
  });
  assert.equal(byQuery.length, 2);
  assert.equal(byQuery[0].organizacion_nombre, 'Iberometal Componentes S.A.');

  const byMetodologia = filterAndSortProgramacionAudits(INITIAL_PROGRAMACION_AUDITS, {
    selectedMetodologia: 'Remota',
  });
  assert.equal(byMetodologia.length, 1);
  assert.equal(byMetodologia[0].codigo_auditoria, 'AUD-2024-002');

  const sortedByDiasDesc = filterAndSortProgramacionAudits(INITIAL_PROGRAMACION_AUDITS, {
    sortColumn: 'dias',
    sortDirection: 'desc',
  });
  assert.equal(sortedByDiasDesc[0].dias_auditor >= sortedByDiasDesc[sortedByDiasDesc.length - 1].dias_auditor, true);
});

test('detectAuditorConflicts detects Ing. Carlos Mendoza schedule overlap between AUD-2024-001 and AUD-2024-002', () => {
  const conflicts = detectAuditorConflicts(INITIAL_PROGRAMACION_AUDITS);
  assert.equal(conflicts.length >= 1, true);
  const carlosConflict = conflicts.find((c) => c.auditor_nombre.includes('Carlos Mendoza'));
  assert.ok(carlosConflict);
  assert.equal(carlosConflict.audit_a_codigo, 'AUD-2024-001');
  assert.equal(carlosConflict.audit_b_codigo, 'AUD-2024-002');
  assert.equal(carlosConflict.overlap_start, '2024-11-19');
  assert.equal(carlosConflict.overlap_end, '2024-11-20');
  assert.equal(carlosConflict.overlap_days, 2);
});

test('filterCalendarAudits, buildCalendarMonthGrid, getQuarterMonthsForMonth, and calculateGanttBarsForMonth work accurately', () => {
  const filteredByAuditor = filterCalendarAudits(INITIAL_PROGRAMACION_AUDITS, {
    auditorId: '10000000-0000-0000-0000-000000000004', // Javier Morales (team member on 001 & 004)
  });
  assert.equal(filteredByAuditor.length, 2);

  const novGrid = buildCalendarMonthGrid(2024, 11, INITIAL_PROGRAMACION_AUDITS);
  assert.equal(novGrid.length, 35); // Nov 2024 starts on Friday (4 leading days + 30 days = 34 <= 35)
  const nov19Cell = novGrid.find((c) => c.date === '2024-11-19');
  assert.ok(nov19Cell);
  assert.equal(nov19Cell.inCurrentMonth, true);
  assert.equal(nov19Cell.audits.length, 2); // AUD-2024-001 & AUD-2024-002 overlap on Nov 19

  const quarter = getQuarterMonthsForMonth(2024, 11);
  assert.equal(quarter.length, 3);
  assert.deepEqual(
    quarter.map((q) => q.month),
    [10, 11, 12]
  );

  const conflicts = detectAuditorConflicts(INITIAL_PROGRAMACION_AUDITS);
  const conflictIds = new Set<string>();
  conflicts.forEach((c) => {
    conflictIds.add(c.audit_a_id);
    conflictIds.add(c.audit_b_id);
  });

  const ganttBars = calculateGanttBarsForMonth(INITIAL_PROGRAMACION_AUDITS, 2024, 11, conflictIds);
  assert.equal(ganttBars.length, 4); // AUD-2024-001..004 fall in Nov 2024
  const bar001 = ganttBars.find((b) => b.audit.codigo_auditoria === 'AUD-2024-001');
  assert.ok(bar001);
  assert.equal(bar001.hasConflict, true);
  assert.equal(bar001.leftPercent > 50, true);
});

test('ISO/IEC 17021-1 recommendation engine strictly blocks approval on open NC_MAYOR or open NC_MENOR without action plan', () => {
  // AUD-2024-003 has open NC_MAYOR HAL-2024-004
  const eval003 = evaluateIso17021Recommendation(
    INITIAL_PHASE5_FINDINGS,
    '80000000-0000-0000-0000-000000000003'
  );
  assert.equal(eval003.status, 'DENEGADA / CONDICIONADA');
  assert.equal(eval003.canApprove, false);
  assert.equal(eval003.openMajorCount, 1);
  assert.equal(eval003.blockingReasons.length >= 1, true);

  // Signature must be rejected while blocked
  const blockedSig = validateRecommendationSignature({
    firma_electronica: 'FIRMA-AUD-001',
    comentarios: 'Intento de cierre con NC Mayor abierta',
    evaluation: eval003,
  });
  assert.equal(blockedSig.valid, false);

  // AUD-2024-001 has NC_MENOR with action plan + closed OBS + OM -> APROBADA
  const eval001 = evaluateIso17021Recommendation(
    INITIAL_PHASE5_FINDINGS,
    '80000000-0000-0000-0000-000000000001'
  );
  assert.equal(eval001.status, 'APROBADA');
  assert.equal(eval001.canApprove, true);

  // Adding an open NC_MENOR without action plan blocks AUD-2024-001
  const minorWithoutPlan: Phase5FindingEntity = {
    ...INITIAL_PHASE5_FINDINGS[0],
    id: 'a1000000-0000-0000-0000-000000000098',
    codigo_hallazgo: 'HAL-2024-098',
    tipo: 'NC_MENOR',
    estado_ciclo: 'Abierto',
    plan_accion_correctiva: '',
    cerrado: false,
  };
  const eval001WithOpenMinor = evaluateIso17021Recommendation(
    [...INITIAL_PHASE5_FINDINGS, minorWithoutPlan],
    '80000000-0000-0000-0000-000000000001'
  );
  assert.equal(eval001WithOpenMinor.status, 'DENEGADA / CONDICIONADA');
  assert.equal(eval001WithOpenMinor.canApprove, false);
  assert.equal(eval001WithOpenMinor.openMinorMissingPlanCount, 1);

  // Adding an open NC_MAYOR on AUD-2024-001 blocks it, then closing it restores APROBADA
  const openMajor: Phase5FindingEntity = {
    ...INITIAL_PHASE5_FINDINGS[0],
    id: 'a1000000-0000-0000-0000-000000000099',
    codigo_hallazgo: 'HAL-2024-099',
    tipo: 'NC_MAYOR',
    estado_ciclo: 'Abierto',
    plan_accion_correctiva: '',
    cerrado: false,
  };
  const evalBlocked = evaluateIso17021Recommendation(
    [...INITIAL_PHASE5_FINDINGS, openMajor],
    '80000000-0000-0000-0000-000000000001'
  );
  assert.equal(evalBlocked.status, 'DENEGADA / CONDICIONADA');
  assert.equal(evalBlocked.canApprove, false);

  const closedMajor: Phase5FindingEntity = {
    ...openMajor,
    estado_ciclo: 'Cerrado',
    plan_accion_correctiva: 'Acción correctiva integral ejecutada.',
    comentarios_verificacion: 'Eficacia verificada en planta.',
    cerrado: true,
    fecha_cierre: '2024-11-25',
  };
  const evalRestored = evaluateIso17021Recommendation(
    [...INITIAL_PHASE5_FINDINGS, closedMajor],
    '80000000-0000-0000-0000-000000000001'
  );
  assert.equal(evalRestored.status, 'APROBADA');
  assert.equal(evalRestored.canApprove, true);
  assert.equal(evalRestored.closedMajorCount, 1);

  const validSig = validateRecommendationSignature({
    firma_electronica: 'AUD-REG-2021-05',
    comentarios: 'Cierre verificado conforme a ISO/IEC 17021-1 cláusula 9.5.',
    evaluation: evalRestored,
  });
  assert.equal(validSig.valid, true);

  // Clean audit with zero findings is immediately APROBADA
  const evalClean = evaluateIso17021Recommendation([], 'audit-clean-001');
  assert.equal(evalClean.status, 'APROBADA');
  assert.equal(evalClean.canApprove, true);
  assert.equal(evalClean.totalFindings, 0);

  // Observations and Opportunities for Improvement alone never block approval
  const obsOnly: Phase5FindingEntity[] = [
    {
      ...INITIAL_PHASE5_FINDINGS[2],
      id: 'obs-only-1',
      id_auditoria: 'audit-obs-only',
      tipo: 'OBSERVACION',
      estado_ciclo: 'Abierto',
      cerrado: false,
    },
    {
      ...INITIAL_PHASE5_FINDINGS[2],
      id: 'om-only-1',
      id_auditoria: 'audit-obs-only',
      tipo: 'OPORTUNIDAD_MEJORA',
      estado_ciclo: 'Abierto',
      cerrado: false,
    },
  ];
  const evalObsOnly = evaluateIso17021Recommendation(obsOnly, 'audit-obs-only');
  assert.equal(evalObsOnly.status, 'APROBADA');
  assert.equal(evalObsOnly.canApprove, true);
  assert.equal(evalObsOnly.observationsCount, 1);
  assert.equal(evalObsOnly.opportunitiesCount, 1);

  // NC_MENOR in 'Causa Raíz Analizada' without submitted corrective action plan still blocks approval
  const minorRootCauseOnly: Phase5FindingEntity = {
    ...INITIAL_PHASE5_FINDINGS[0],
    id: 'nc-menor-rc',
    id_auditoria: 'audit-rc-only',
    codigo_hallazgo: 'HAL-RC-001',
    tipo: 'NC_MENOR',
    estado_ciclo: 'Causa Raíz Analizada',
    plan_accion_correctiva: 'Acción temporal pendiente',
    cerrado: false,
  };
  const evalRcOnly = evaluateIso17021Recommendation([minorRootCauseOnly], 'audit-rc-only');
  assert.equal(evalRcOnly.status, 'DENEGADA / CONDICIONADA');
  assert.equal(evalRcOnly.canApprove, false);

  // Signature validation rejects short electronic signature or short comments even when approved
  assert.equal(
    validateRecommendationSignature({
      firma_electronica: 'AB',
      comentarios: 'Justificación técnica suficientemente extensa.',
      evaluation: evalClean,
    }).valid,
    false
  );
  assert.equal(
    validateRecommendationSignature({
      firma_electronica: 'AUD-REG-2021-05',
      comentarios: 'Corto',
      evaluation: evalClean,
    }).valid,
    false
  );
});

test('Finding input, CAPA lifecycle transition validation, filtering, and KPI stats work reliably', () => {
  const invalidInput = validatePhase5FindingInput({
    id_auditoria: '',
    tipo: 'NC_MAYOR',
    id_requisito: 'req-1',
    id_proceso: 'proc-1',
    descripcion: 'Corta',
  });
  assert.equal(invalidInput.valid, false);

  const validInput = validatePhase5FindingInput({
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    tipo: 'NC_MAYOR',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    descripcion: 'Ausencia de registro de calibración en prensa hidráulica PH-02.',
  });
  assert.equal(validInput.valid, true);

  const openMajor = INITIAL_PHASE5_FINDINGS.find((f) => f.tipo === 'NC_MAYOR')!;
  const missingVerification = validateFindingLifecycleUpdate(openMajor, 'Cerrado', {
    analisis_causa_raiz: 'Error operativo de turno',
    plan_accion_correctiva: 'Capacitación y doble verificación LOTO',
    comentarios_verificacion: '',
  });
  assert.equal(missingVerification.valid, false);

  const okClose = validateFindingLifecycleUpdate(openMajor, 'Cerrado', {
    analisis_causa_raiz: 'Error operativo de turno',
    plan_accion_correctiva: 'Capacitación y doble verificación LOTO',
    comentarios_verificacion: 'Verificado in situ en Reactor R-204.',
  });
  assert.equal(okClose.valid, true);

  const stats = calculatePhase5FindingStats(INITIAL_PHASE5_FINDINGS);
  assert.equal(stats.total, 6);
  assert.equal(stats.ncMayor, 1);
  assert.equal(stats.ncMayorAbiertas, 1);
  assert.equal(stats.ncMenor, 2);
  assert.equal(stats.observaciones, 2);
  assert.equal(stats.oportunidadesMejora, 1);

  const filteredByQuery = filterPhase5Findings(INITIAL_PHASE5_FINDINGS, { query: 'LOTO' });
  assert.equal(filteredByQuery.length, 1);
  assert.equal(filteredByQuery[0].codigo_hallazgo, 'HAL-2024-004');
});

test('Zero-UUID Exposure Mandate: Phase 5 views (Programación, Calendario, Resultado) never expose raw UUIDs in visible text', () => {
  const baseProgState: ProgramacionViewState = {
    selectedAuditId: null,
    activeChildTab: 'equipo',
    query: '',
    selectedTipo: 'ALL',
    selectedMetodologia: 'ALL',
    selectedEstatus: 'ALL',
    selectedAuditorLider: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isPlanningModalOpen: false,
    isEditingAttributes: false,
    isAddingTeamMember: false,
  };

  // 1. Programación directory (grid + list)
  for (const viewMode of ['grid', 'list'] as const) {
    const html = renderProgramacionView({
      profile: TEST_ADMIN_PROFILE,
      state: { ...baseProgState, viewMode },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      certificates: TEST_CERTIFICATES,
    });
    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Exposed UUIDs in Programación ${viewMode}: ${check.exposedUuids.join(', ')}`);
  }

  // 2. Programación 4-zone detail across all 3 child tabs
  for (const activeChildTab of ['equipo', 'muestreo', 'matriz'] as const) {
    const html = renderProgramacionView({
      profile: TEST_ADMIN_PROFILE,
      state: {
        ...baseProgState,
        selectedAuditId: INITIAL_PROGRAMACION_AUDITS[0].id,
        activeChildTab,
      },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      certificates: TEST_CERTIFICATES,
    });
    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Exposed UUIDs in Programación detail (${activeChildTab}): ${check.exposedUuids.join(', ')}`);
  }

  // 3. Calendario (month, quarter, gantt + open drawer)
  const baseCalState: CalendarioViewState = {
    displayMode: 'month',
    referenceYear: 2024,
    referenceMonth: 11,
    filterAuditorId: 'ALL',
    filterStandard: 'ALL',
    filterMethodology: 'ALL',
    drawerAuditId: INITIAL_PROGRAMACION_AUDITS[0].id,
  };
  for (const displayMode of ['month', 'quarter', 'gantt'] as const) {
    const html = renderCalendarioView({
      profile: TEST_ADMIN_PROFILE,
      state: { ...baseCalState, displayMode },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      standards: [{ norma: 'ISO 9001:2015' }, { norma: 'ISO 14001:2015' }],
    });
    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Exposed UUIDs in Calendario (${displayMode}): ${check.exposedUuids.join(', ')}`);
  }

  // 4. Resultado (list, kanban + finding modal)
  const baseResState: ResultadoViewState = {
    selectedAuditId: 'ALL',
    activeAuditIdForDecision: INITIAL_PROGRAMACION_AUDITS[0].id,
    displayMode: 'list',
    filterType: 'ALL',
    filterLifecycle: 'ALL',
    searchQuery: '',
    isLoggingFinding: true,
    inspectingFindingId: INITIAL_PHASE5_FINDINGS[0].id,
  };
  for (const displayMode of ['list', 'kanban'] as const) {
    const html = renderResultadoView({
      profile: TEST_ADMIN_PROFILE,
      state: { ...baseResState, displayMode },
      audits: INITIAL_PROGRAMACION_AUDITS,
      findings: INITIAL_PHASE5_FINDINGS,
      processes: TEST_PROCESSES,
      requirements: TEST_REQUIREMENTS,
    });
    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Exposed UUIDs in Resultado (${displayMode}): ${check.exposedUuids.join(', ')}`);
  }

  // 5. Auditorias wrapper shell
  const wrapperHtml = renderAuditoriasView(TEST_ADMIN_PROFILE, {
    activeSubSection: 'scheduling',
    programacionState: baseProgState,
    calendarioState: baseCalState,
    resultadoState: baseResState,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    phase5Findings: INITIAL_PHASE5_FINDINGS,
    allAuditorsDetailed: INITIAL_AUDITORES_DETAILED,
    certificates: TEST_CERTIFICATES,
    processes: TEST_PROCESSES,
    requirements: TEST_REQUIREMENTS,
    standards: [{ norma: 'ISO 9001:2015' }],
    loading: false,
  });
  const wrapperCheck = assertZeroUuidExposure(wrapperHtml);
  assert.equal(wrapperCheck.compliant, true, `Exposed UUIDs in Auditorias wrapper: ${wrapperCheck.exposedUuids.join(', ')}`);

  // 6. Session audit log entry helper creates valid non-empty entry
  const logEntry = createSessionAuditLogEntry({
    tableName: 'auditoria',
    recordId: INITIAL_PROGRAMACION_AUDITS[0].id,
    operation: 'UPDATE',
    actorEmail: 'admin@fondonorma.test',
    oldData: { estatus: 'Planificado' },
    newData: { estatus: 'Completado', recomendacion: 'APROBADA' },
  });
  assert.equal(logEntry.table_name, 'auditoria');
  assert.equal(logEntry.operation, 'UPDATE');
});
