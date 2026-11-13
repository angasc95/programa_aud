/**
 * Phase 5: Domain "Auditorías" (Event Scheduling, Operational Calendar & Results)
 * Core Domain Models, Recommendation Engine & Pure Business Logic
 * Compliant with ISO/IEC 17021-1:2015 (clauses 9.1-9.6) and ISO 19011:2018.
 */

export type AuditModality =
  | 'Etapa 1'
  | 'Etapa 2'
  | 'Seguimiento 1'
  | 'Seguimiento 2'
  | 'Renovación'
  | 'Diagnóstico'
  | 'Extraordinaria'
  | 'Especial'
  | 'Otro';

export type ExecutionMethodology = 'Presencial' | 'Remota' | 'Mixta';

export type AuditEventStatus =
  | 'Planificado'
  | 'En Ejecución'
  | 'En Espera'
  | 'Completada'
  | 'Cerrada';

export type FindingClassification =
  | 'NC_MAYOR'
  | 'NC_MENOR'
  | 'OBSERVACION'
  | 'OPORTUNIDAD_MEJORA';

export type FindingLifecycleStatus =
  | 'Abierto'
  | 'Causa Raíz Analizada'
  | 'Plan de Acción Enviado'
  | 'Verificado'
  | 'Cerrado';

export interface EquipoAuditorMember {
  id: string;
  id_auditor: string;
  nombre: string;
  rol: 'Auditor Líder' | 'Auditor de Equipo' | 'Experto Técnico';
  codigo_credencial?: string;
  competencia_alcance: string;
  dias_asignados: number;
}

export interface SedeMuestreoSchedule {
  id: string;
  numero_sitio: number; // 0 = Principal HQ
  nombre_sitio: string;
  direccion: string;
  tipo_evaluacion: 'In Situ (Presencial)' | 'Remoto (TIC)';
  fecha_asignada: string;
  dias_asignados: number;
  auditor_responsable: string;
}

export interface ClausulaVerificacionItem {
  id: string;
  clausula_codigo: string;
  clausula_titulo: string;
  proceso_nombre: string;
  estado: 'Verificado' | 'Pendiente' | 'Con Desviación';
  observaciones?: string;
}

export interface FindingItem {
  id: string;
  codigo_hallazgo: string;
  id_auditoria: string;
  codigo_auditoria: string;
  numero_certificado: string;
  organizacion_nombre: string;
  tipo: FindingClassification;
  id_requisito: string;
  requisito_codigo: string;
  requisito_titulo?: string;
  proceso_nombre: string;
  sitio_nombre: string;
  descripcion: string;
  evidencia_objetiva: string;
  causa_raiz?: string;
  plan_accion_cliente?: string;
  comentarios_verificacion_auditor?: string;
  fecha_limite?: string;
  fecha_cierre?: string;
  estado: FindingLifecycleStatus;
  cerrado: boolean;
  created_at: string;
}

export interface CertificationRecommendation {
  status: 'APROBADA' | 'DENEGADA_CONDICIONADA';
  dictamen: string;
  canIssueCertificate: boolean;
  majorNcCount: number;
  openMajorNcCount: number;
  minorNcCount: number;
  openMinorNcCount: number;
  observationCount: number;
  opportunityCount: number;
  blockingReasons: string[];
  summaryText: string;
  electronicSignature?: {
    auditor_nombre: string;
    auditor_credencial: string;
    fecha_dictamen: string;
    hash_trazabilidad: string;
  };
}

export interface AuditEventEntity {
  id: string;
  codigo_auditoria: string;
  id_certificado: string;
  numero_certificado: string;
  organizacion_id: string;
  organizacion_nombre: string;
  organizacion_rif: string;
  direccion_principal: string;
  norma_codigo: string;
  norma_titulo: string;
  sector_iaf: number;
  tipo_auditoria: AuditModality;
  metodologia: ExecutionMethodology;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string; // YYYY-MM-DD
  fecha_reprogramacion?: string | null;
  dias_auditor: number;
  auditor_lider_id: string;
  auditor_lider_nombre: string;
  auditor_lider_email?: string;
  estatus: AuditEventStatus;
  objetivo: string;
  equipo: EquipoAuditorMember[];
  sedesMuestreo: SedeMuestreoSchedule[];
  verificacionNormativa: ClausulaVerificacionItem[];
  recomendacionCertificacion?: CertificationRecommendation;
}

export interface AuditorScheduleConflict {
  auditor_id: string;
  auditor_nombre: string;
  auditoria_a_codigo: string;
  auditoria_a_fechas: string;
  auditoria_b_codigo: string;
  auditoria_b_fechas: string;
  fecha_conflicto: string;
  descripcion: string;
}

// ---------------------------------------------------------------------------
// Pure Business Logic & ISO 17021-1 Recommendation Engine
// ---------------------------------------------------------------------------

/**
 * Normalizes text for accent-insensitive and case-insensitive comparison.
 */
export function normalizeText(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Evaluates ISO/IEC 17021-1 Certification Issuance Recommendation.
 * CRITICAL RULE: If ANY `NC_MAYOR` is open (not closed),
 * recommendation is strictly 'DENEGADA / CONDICIONADA' and blocks certification approval.
 */
export function evaluateCertificationRecommendation(
  findings: FindingItem[],
  leadAuditor?: { nombre: string; credencial: string }
): CertificationRecommendation {
  const majorNcs = findings.filter((f) => f.tipo === 'NC_MAYOR');
  const openMajorNcs = majorNcs.filter((f) => !f.cerrado && f.estado !== 'Cerrado');

  const minorNcs = findings.filter((f) => f.tipo === 'NC_MENOR');
  const openMinorNcs = minorNcs.filter((f) => !f.cerrado && f.estado !== 'Cerrado');

  const observations = findings.filter((f) => f.tipo === 'OBSERVACION');
  const opportunities = findings.filter((f) => f.tipo === 'OPORTUNIDAD_MEJORA');

  const blockingReasons: string[] = [];

  if (openMajorNcs.length > 0) {
    blockingReasons.push(
      `Existen ${openMajorNcs.length} No Conformidad(es) Mayor(es) (NC_MAYOR) sin cerrar (${openMajorNcs
        .map((f) => f.codigo_hallazgo)
        .join(', ')}). Bajo ISO/IEC 17021-1:2015 cláusula 9.5, la certificación no puede emitirse ni renovarse hasta verificar su cierre formal.`
    );
  }

  // Check if open minor NCs lack corrective action plan
  const minorWithoutPlan = openMinorNcs.filter(
    (f) => !f.plan_accion_cliente || f.estado === 'Abierto'
  );
  if (minorWithoutPlan.length > 0) {
    blockingReasons.push(
      `Existen ${minorWithoutPlan.length} No Conformidad(es) Menor(es) sin plan de acción correctiva aprobado por el auditor líder.`
    );
  }

  const canIssue = blockingReasons.length === 0;
  const status: 'APROBADA' | 'DENEGADA_CONDICIONADA' = canIssue
    ? 'APROBADA'
    : 'DENEGADA_CONDICIONADA';

  const dictamen = canIssue
    ? 'Recomendación: APROBADA (Concesión / Mantenimiento / Renovación de Certificación)'
    : 'Recomendación: DENEGADA / CONDICIONADA (Bloqueo de Certificación por No Conformidades Pendientes)';

  const summaryText = canIssue
    ? `El sistema de gestión evaluado demuestra conformidad operativa y madurez sustantiva. No existen No Conformidades Mayores abiertas.`
    : `Se bloquea la recomendación favorable de certificación debido a la presencia de desviaciones críticas que comprometen la eficacia del sistema.`;

  const electronicSignature = leadAuditor
    ? {
        auditor_nombre: leadAuditor.nombre,
        auditor_credencial: leadAuditor.credencial,
        fecha_dictamen: new Date().toISOString().slice(0, 10),
        hash_trazabilidad: `ISO17021-SIG-${Date.now().toString(16).toUpperCase()}`,
      }
    : undefined;

  return {
    status,
    dictamen,
    canIssueCertificate: canIssue,
    majorNcCount: majorNcs.length,
    openMajorNcCount: openMajorNcs.length,
    minorNcCount: minorNcs.length,
    openMinorNcCount: openMinorNcs.length,
    observationCount: observations.length,
    opportunityCount: opportunities.length,
    blockingReasons,
    summaryText,
    electronicSignature,
  };
}

/**
 * Detects overlapping schedule conflicts for auditors across different audit events.
 */
export function detectAuditorScheduleConflicts(
  audits: AuditEventEntity[]
): AuditorScheduleConflict[] {
  const conflicts: AuditorScheduleConflict[] = [];

  // Flatten auditor assignments with dates
  interface Assignment {
    auditor_id: string;
    auditor_nombre: string;
    audit_id: string;
    codigo_auditoria: string;
    fecha_inicio: string;
    fecha_fin: string;
  }

  const assignments: Assignment[] = [];

  for (const audit of audits) {
    // Only check active or planned audits
    if (audit.estatus === 'Cerrada' || audit.estatus === 'Completada') continue;

    const startDate = audit.fecha_reprogramacion || audit.fecha_inicio;
    const endDate = audit.fecha_fin >= startDate ? audit.fecha_fin : startDate;

    // Lead auditor
    if (audit.auditor_lider_id) {
      assignments.push({
        auditor_id: audit.auditor_lider_id,
        auditor_nombre: audit.auditor_lider_nombre,
        audit_id: audit.id,
        codigo_auditoria: audit.codigo_auditoria,
        fecha_inicio: startDate,
        fecha_fin: endDate,
      });
    }

    // Team members
    for (const member of audit.equipo) {
      if (member.id_auditor && member.id_auditor !== audit.auditor_lider_id) {
        assignments.push({
          auditor_id: member.id_auditor,
          auditor_nombre: member.nombre,
          audit_id: audit.id,
          codigo_auditoria: audit.codigo_auditoria,
          fecha_inicio: startDate,
          fecha_fin: endDate,
        });
      }
    }
  }

  // Cross-compare pairs
  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const a = assignments[i];
      const b = assignments[j];

      // Same auditor in different audits
      if (a.auditor_id === b.auditor_id && a.audit_id !== b.audit_id) {
        // Date overlap check: (StartA <= EndB) and (EndA >= StartB)
        if (a.fecha_inicio <= b.fecha_fin && a.fecha_fin >= b.fecha_inicio) {
          const overlapDate =
            a.fecha_inicio >= b.fecha_inicio ? a.fecha_inicio : b.fecha_inicio;
          conflicts.push({
            auditor_id: a.auditor_id,
            auditor_nombre: a.auditor_nombre,
            auditoria_a_codigo: a.codigo_auditoria,
            auditoria_a_fechas: `${a.fecha_inicio} a ${a.fecha_fin}`,
            auditoria_b_codigo: b.codigo_auditoria,
            auditoria_b_fechas: `${b.fecha_inicio} a ${b.fecha_fin}`,
            fecha_conflicto: overlapDate,
            descripcion: `El evaluador ${a.auditor_nombre} tiene asignación simultánea en ${a.codigo_auditoria} y ${b.codigo_auditoria}.`,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Visual styling token for audit modality.
 */
export function getModalityVisual(modality: AuditModality | string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (modality) {
    case 'Renovación':
    case 'RECERTIFICACION':
      return {
        label: 'Renovación',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        symbol: '🔄',
      };
    case 'Etapa 1':
    case 'ETAPA_1':
      return {
        label: 'Etapa 1',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        symbol: '📑',
      };
    case 'Etapa 2':
    case 'ETAPA_2':
      return {
        label: 'Etapa 2',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        symbol: '🔍',
      };
    case 'Seguimiento 1':
    case 'VIGILANCIA_1':
      return {
        label: 'Seguimiento 1',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        symbol: '🔎',
      };
    case 'Seguimiento 2':
    case 'VIGILANCIA_2':
      return {
        label: 'Seguimiento 2',
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        symbol: '📊',
      };
    case 'Extraordinaria':
    case 'EXTRAORDINARIA':
      return {
        label: 'Extraordinaria',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        symbol: '⚡',
      };
    case 'Diagnóstico':
      return {
        label: 'Diagnóstico',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        symbol: '🩺',
      };
    default:
      return {
        label: modality || 'Auditoría',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        symbol: '📋',
      };
  }
}

/**
 * Visual styling token for execution methodology.
 */
export function getMethodologyVisual(methodology: ExecutionMethodology | string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (methodology) {
    case 'Presencial':
      return {
        label: 'Presencial',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '🏢',
      };
    case 'Remota':
      return {
        label: 'Remota (IAF MD 4)',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        symbol: '🌐',
      };
    case 'Mixta':
    case 'Híbrida':
    default:
      return {
        label: 'Mixta / Híbrida',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        symbol: '🔄',
      };
  }
}

/**
 * Visual styling token for audit status.
 */
export function getAuditStatusVisual(status: AuditEventStatus | string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (status) {
    case 'Planificado':
      return {
        label: 'PLANIFICADO',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        symbol: '📅',
      };
    case 'En Ejecución':
      return {
        label: 'EN EJECUCIÓN',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        symbol: '⚡',
      };
    case 'En Espera':
      return {
        label: 'EN ESPERA',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        symbol: '⏳',
      };
    case 'Completada':
      return {
        label: 'COMPLETADA',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '✓',
      };
    case 'Cerrada':
    default:
      return {
        label: 'CERRADA',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        symbol: '🔒',
      };
  }
}

/**
 * Visual styling token for finding classifications.
 */
export function getFindingSeverityMeta(tipo: FindingClassification | string): {
  label: string;
  badgeClass: string;
  borderClass: string;
  symbol: string;
  description: string;
} {
  switch (tipo) {
    case 'NC_MAYOR':
      return {
        label: 'NC Mayor',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
        borderClass: 'border-l-4 border-l-rose-500',
        symbol: '🚨',
        description:
          'Incumplimiento total o fallo de control que compromete el sistema y bloquea la certificación.',
      };
    case 'NC_MENOR':
      return {
        label: 'NC Menor',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
        borderClass: 'border-l-4 border-l-amber-500',
        symbol: '⚠️',
        description:
          'Incumplimiento aislado o puntual que no vulnera la integridad global del sistema.',
      };
    case 'OBSERVACION':
      return {
        label: 'Observación',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
        borderClass: 'border-l-4 border-l-blue-500',
        symbol: '👁️',
        description:
          'Situación operacional que no constituye no conformidad pero requiere monitoreo preventivo.',
      };
    case 'OPORTUNIDAD_MEJORA':
    default:
      return {
        label: 'Oportunidad de Mejora',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
        borderClass: 'border-l-4 border-l-emerald-500',
        symbol: '💡',
        description:
          'Recomendación técnica orientada a elevar la eficiencia, madurez o buenas prácticas.',
      };
  }
}

/**
 * Visual styling token for finding lifecycle state.
 */
export function getFindingLifecycleMeta(estado: FindingLifecycleStatus | string): {
  label: string;
  badgeClass: string;
  stepNumber: number;
} {
  switch (estado) {
    case 'Abierto':
      return {
        label: 'Abierto',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        stepNumber: 1,
      };
    case 'Causa Raíz Analizada':
      return {
        label: 'Causa Raíz Analizada',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        stepNumber: 2,
      };
    case 'Plan de Acción Enviado':
      return {
        label: 'Plan de Acción Enviado',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        stepNumber: 3,
      };
    case 'Verificado':
      return {
        label: 'Verificado en Campo',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
        stepNumber: 4,
      };
    case 'Cerrado':
    default:
      return {
        label: 'Cerrado Formalmente',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
        stepNumber: 5,
      };
  }
}

/**
 * Filters audit events based on search query and facets.
 */
export function filterAuditEvents(
  audits: AuditEventEntity[],
  filters: {
    query?: string;
    selectedModality?: string;
    selectedMethodology?: string;
    selectedStatus?: string;
    selectedAuditor?: string;
  }
): AuditEventEntity[] {
  const q = normalizeText(filters.query);

  return audits.filter((audit) => {
    // 1. Text search on code, organization, certificate, standard, lead auditor
    if (q) {
      const matchCode = normalizeText(audit.codigo_auditoria).includes(q);
      const matchOrg = normalizeText(audit.organizacion_nombre).includes(q);
      const matchCert = normalizeText(audit.numero_certificado).includes(q);
      const matchNorma = normalizeText(audit.norma_codigo).includes(q);
      const matchAuditor = normalizeText(audit.auditor_lider_nombre).includes(q);
      if (!matchCode && !matchOrg && !matchCert && !matchNorma && !matchAuditor) {
        return false;
      }
    }

    // 2. Modality facet
    if (filters.selectedModality && filters.selectedModality !== 'ALL') {
      if (normalizeText(audit.tipo_auditoria) !== normalizeText(filters.selectedModality)) {
        return false;
      }
    }

    // 3. Methodology facet
    if (filters.selectedMethodology && filters.selectedMethodology !== 'ALL') {
      if (normalizeText(audit.metodologia) !== normalizeText(filters.selectedMethodology)) {
        return false;
      }
    }

    // 4. Status facet
    if (filters.selectedStatus && filters.selectedStatus !== 'ALL') {
      if (normalizeText(audit.estatus) !== normalizeText(filters.selectedStatus)) {
        return false;
      }
    }

    // 5. Auditor facet
    if (filters.selectedAuditor && filters.selectedAuditor !== 'ALL') {
      const isLead =
        audit.auditor_lider_id === filters.selectedAuditor ||
        normalizeText(audit.auditor_lider_nombre).includes(normalizeText(filters.selectedAuditor));
      const inTeam = audit.equipo.some(
        (m) =>
          m.id_auditor === filters.selectedAuditor ||
          normalizeText(m.nombre).includes(normalizeText(filters.selectedAuditor))
      );
      if (!isLead && !inTeam) {
        return false;
      }
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Seed Data (Aligned with 06_datos_prueba.sql and Phases 1-4)
// ---------------------------------------------------------------------------

export const INITIAL_FINDINGS_DETAILED: FindingItem[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    codigo_hallazgo: 'HAL-2024-001',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    codigo_auditoria: 'AUD-2024-001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    tipo: 'NC_MENOR',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    requisito_titulo: 'Producción y provisión del servicio',
    proceso_nombre: 'Troquelado y Fundición',
    sitio_nombre: 'Planta Valencia (Sitio #1)',
    descripcion: 'Descalibración puntual en pie de rey electrónico en la línea 2 de fundición continua.',
    evidencia_objetiva: 'Instrumento CAL-09 en uso con etiqueta vencida desde hace 15 días.',
    causa_raiz: 'Falla en el software de recordatorio del cronograma de metrología interna.',
    plan_accion_cliente: 'Envío inmediato del equipo al laboratorio acreditado y actualización del software de control metrológico.',
    comentarios_verificacion_auditor: 'Certificado de calibración N° MET-2024-88 recibido y conforme. Acciones eficaces.',
    fecha_limite: '2024-12-15',
    fecha_cierre: '2024-12-10',
    estado: 'Cerrado',
    cerrado: true,
    created_at: '2024-11-20T10:30:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    codigo_hallazgo: 'HAL-2024-002',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    codigo_auditoria: 'AUD-2024-001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    tipo: 'OBSERVACION',
    id_requisito: 'f0000000-0000-0000-0000-000000000041',
    requisito_codigo: '4.1',
    requisito_titulo: 'Comprensión de la organización y de su contexto',
    proceso_nombre: 'Dirección Estratégica y Calidad',
    sitio_nombre: 'Sede Principal HQ (Sitio #0)',
    descripcion: 'La matriz FODA de contexto estratégico no incluye el impacto del nuevo marco tributario para exportación.',
    evidencia_objetiva: 'Revisión documental del expediente PE-01 versión 3 en dirección corporativa.',
    causa_raiz: 'Revisión por la dirección programada para el cierre del trimestre.',
    plan_accion_cliente: 'Actualización de la matriz de contexto en el comité de dirección de diciembre.',
    comentarios_verificacion_auditor: 'Se evaluará el cierre en la próxima auditoría de vigilancia anual.',
    fecha_limite: '2025-01-30',
    estado: 'Plan de Acción Enviado',
    cerrado: false,
    created_at: '2024-11-20T14:15:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    codigo_hallazgo: 'HAL-2024-003',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    codigo_auditoria: 'AUD-2024-001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    tipo: 'OPORTUNIDAD_MEJORA',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    requisito_titulo: 'Producción y provisión del servicio',
    proceso_nombre: 'Mantenimiento y Logística',
    sitio_nombre: 'Planta Valencia (Sitio #1)',
    descripcion: 'Se recomienda digitalizar las órdenes de trabajo manuales para trazabilidad en tiempo real.',
    evidencia_objetiva: 'Entrevista con supervisor de planta durante el turno matutino.',
    estado: 'Abierto',
    cerrado: false,
    created_at: '2024-11-20T16:00:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    codigo_hallazgo: 'HAL-2024-004',
    id_auditoria: '80000000-0000-0000-0000-000000000003',
    codigo_auditoria: 'AUD-2024-003',
    numero_certificado: 'FN-OHS-2023-018',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    tipo: 'NC_MAYOR',
    id_requisito: 'f0000000-0000-0000-0000-000000000008',
    requisito_codigo: '8.2',
    requisito_titulo: 'Preparación y respuesta ante emergencias',
    proceso_nombre: 'Prevención de Riesgos Mayores y Atmósferas Explosivas',
    sitio_nombre: 'Planta Polímeros (Sitio #1)',
    descripcion: 'Inoperatividad del sistema automático de espuma contra incendios en el tanque de almacenamiento T-04.',
    evidencia_objetiva: 'Prueba de presión in situ con válvula de corte trabada y sin prueba hidráulica en los últimos 18 meses.',
    causa_raiz: 'Retraso de contratista especializado por falta de repuestos de importación.',
    plan_accion_cliente: 'Sustitución de válvula con stock de emergencia y prueba hidráulica completa con bomberos industriales.',
    comentarios_verificacion_auditor: 'Auditoría extraordinaria presencial obligatoria requerida para verificar cierre antes de levantar suspensión.',
    fecha_limite: '2024-12-20',
    estado: 'Plan de Acción Enviado',
    cerrado: false,
    created_at: '2024-11-22T11:00:00Z',
  },
];

export const INITIAL_AUDIT_EVENTS: AuditEventEntity[] = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    codigo_auditoria: 'AUD-2024-001',
    id_certificado: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_id: '30000000-0000-0000-0000-000000000001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    organizacion_rif: 'J-30492817-0',
    direccion_principal: 'Av. Industrial 100, Valencia, Edo. Carabobo',
    norma_codigo: 'ISO 9001:2015',
    norma_titulo: 'Sistemas de Gestión de la Calidad — Requisitos',
    sector_iaf: 17,
    tipo_auditoria: 'Renovación',
    metodologia: 'Presencial',
    fecha_inicio: '2024-11-20',
    fecha_fin: '2024-11-22',
    fecha_reprogramacion: null,
    dias_auditor: 4.0,
    auditor_lider_id: '10000000-0000-0000-0000-000000000001',
    auditor_lider_nombre: 'Ing. Carlos Mendoza',
    auditor_lider_email: 'cmendoza@programa-aud.com',
    estatus: 'Planificado',
    objetivo:
      'Evaluación integral de la renovación del ciclo trienal para verificar la eficacia continua del sistema de gestión de la calidad en fabricación de piezas metálicas.',
    equipo: [
      {
        id: 'eq-001',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        nombre: 'Ing. Carlos Mendoza',
        rol: 'Auditor Líder',
        codigo_credencial: 'AUD-REG-2021-05',
        competencia_alcance: 'Sector IAF 17 (17.1) · ISO 9001:2015',
        dias_asignados: 2.5,
      },
      {
        id: 'eq-002',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        nombre: 'Ing. Roberto Silva',
        rol: 'Auditor de Equipo',
        codigo_credencial: 'AUD-REG-2022-88',
        competencia_alcance: 'Sector IAF 17 (17.1) · Control dimensional',
        dias_asignados: 1.5,
      },
    ],
    sedesMuestreo: [
      {
        id: 'sm-001',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal HQ',
        direccion: 'Av. Industrial 100, Valencia',
        tipo_evaluacion: 'In Situ (Presencial)',
        fecha_asignada: '2024-11-20',
        dias_asignados: 1.5,
        auditor_responsable: 'Ing. Carlos Mendoza',
      },
      {
        id: 'sm-002',
        numero_sitio: 1,
        nombre_sitio: 'Planta Valencia',
        direccion: 'Zona Industrial Carabobo, Galpón 4-B',
        tipo_evaluacion: 'In Situ (Presencial)',
        fecha_asignada: '2024-11-21',
        dias_asignados: 2.5,
        auditor_responsable: 'Ing. Carlos Mendoza & Ing. Roberto Silva',
      },
    ],
    verificacionNormativa: [
      {
        id: 'vn-001',
        clausula_codigo: '4.1',
        clausula_titulo: 'Comprensión de la organización y de su contexto',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado: 'Verificado',
        observaciones: 'Matriz FODA revisada con observación menor anotada.',
      },
      {
        id: 'vn-002',
        clausula_codigo: '5.1',
        clausula_titulo: 'Liderazgo y compromiso',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado: 'Verificado',
        observaciones: 'Entrevista con Gerente General conforme a ISO 19011:2018.',
      },
      {
        id: 'vn-003',
        clausula_codigo: '8.5',
        clausula_titulo: 'Producción y provisión del servicio',
        proceso_nombre: 'Troquelado y Fundición',
        estado: 'Con Desviación',
        observaciones: 'No conformidad menor registrada por instrumento CAL-09.',
      },
    ],
  },
  {
    id: '80000000-0000-0000-0000-000000000002',
    codigo_auditoria: 'AUD-2024-002',
    id_certificado: '40000000-0000-0000-0000-000000000002',
    numero_certificado: 'FN-EMS-2024-002',
    organizacion_id: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    organizacion_rif: 'J-40819234-5',
    direccion_principal: 'Torre David, Piso 14, Chacao, Caracas',
    norma_codigo: 'ISO 14001:2015',
    norma_titulo: 'Sistemas de Gestión Ambiental — Requisitos con orientación para su uso',
    sector_iaf: 33,
    tipo_auditoria: 'Etapa 1',
    metodologia: 'Remota',
    fecha_inicio: '2024-11-25',
    fecha_fin: '2024-11-26',
    fecha_reprogramacion: null,
    dias_auditor: 2.0,
    auditor_lider_id: '10000000-0000-0000-0000-000000000002',
    auditor_lider_nombre: 'Ing. Roberto Silva',
    auditor_lider_email: 'rsilva@programa-aud.com',
    estatus: 'Planificado',
    objetivo:
      'Revisión documental preliminar de la política ambiental, aspectos significativos y preparación para la auditoría de campo de Etapa 2 (conforme a IAF MD 4).',
    equipo: [
      {
        id: 'eq-003',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        nombre: 'Ing. Roberto Silva',
        rol: 'Auditor Líder',
        codigo_credencial: 'AUD-REG-2022-88',
        competencia_alcance: 'Sector IAF 33 · ISO 14001:2015',
        dias_asignados: 2.0,
      },
    ],
    sedesMuestreo: [
      {
        id: 'sm-003',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal (HQ)',
        direccion: 'Torre David, Piso 14, Chacao',
        tipo_evaluacion: 'Remoto (TIC)',
        fecha_asignada: '2024-11-25',
        dias_asignados: 2.0,
        auditor_responsable: 'Ing. Roberto Silva',
      },
    ],
    verificacionNormativa: [
      {
        id: 'vn-004',
        clausula_codigo: '6.1',
        clausula_titulo: 'Acciones para abordar riesgos y oportunidades ambientales',
        proceso_nombre: 'Gestión Energética de Centros de Datos',
        estado: 'Verificado',
      },
    ],
  },
  {
    id: '80000000-0000-0000-0000-000000000003',
    codigo_auditoria: 'AUD-2024-003',
    id_certificado: '40000000-0000-0000-0000-000000000003',
    numero_certificado: 'FN-OHS-2023-018',
    organizacion_id: '30000000-0000-0000-0000-000000000003',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    organizacion_rif: 'J-00291834-1',
    direccion_principal: 'Complejo Petroquímico Morón, Edo. Carabobo',
    norma_codigo: 'ISO 45001:2018',
    norma_titulo: 'Sistemas de Gestión de la Seguridad y Salud en el Trabajo',
    sector_iaf: 14,
    tipo_auditoria: 'Extraordinaria',
    metodologia: 'Presencial',
    fecha_inicio: '2024-11-28',
    fecha_fin: '2024-11-29',
    fecha_reprogramacion: null,
    dias_auditor: 2.0,
    auditor_lider_id: '10000000-0000-0000-0000-000000000003',
    auditor_lider_nombre: 'Dra. Ana Belén Torres',
    auditor_lider_email: 'atorres@programa-aud.com',
    estatus: 'En Ejecución',
    objetivo:
      'Evaluación especial extraordinaria para investigar condiciones de riesgo mayor y verificar cumplimiento de medidas cautelares tras suspensión preventiva.',
    equipo: [
      {
        id: 'eq-004',
        id_auditor: '10000000-0000-0000-0000-000000000003',
        nombre: 'Dra. Ana Belén Torres',
        rol: 'Auditor Líder',
        codigo_credencial: 'AUD-REG-2023-14',
        competencia_alcance: 'Sector IAF 14 · ISO 45001:2018',
        dias_asignados: 2.0,
      },
    ],
    sedesMuestreo: [
      {
        id: 'sm-004',
        numero_sitio: 0,
        nombre_sitio: 'Sede Administrativa Morón (HQ)',
        direccion: 'Complejo Petroquímico Morón',
        tipo_evaluacion: 'In Situ (Presencial)',
        fecha_asignada: '2024-11-28',
        dias_asignados: 0.5,
        auditor_responsable: 'Dra. Ana Belén Torres',
      },
      {
        id: 'sm-005',
        numero_sitio: 1,
        nombre_sitio: 'Planta Polímeros',
        direccion: 'Complejo Petroquímico Morón, Módulo A-3',
        tipo_evaluacion: 'In Situ (Presencial)',
        fecha_asignada: '2024-11-28',
        dias_asignados: 1.5,
        auditor_responsable: 'Dra. Ana Belén Torres',
      },
    ],
    verificacionNormativa: [
      {
        id: 'vn-005',
        clausula_codigo: '8.2',
        clausula_titulo: 'Preparación y respuesta ante emergencias',
        proceso_nombre: 'Prevención de Riesgos Mayores',
        estado: 'Con Desviación',
        observaciones: 'Inoperatividad en sistema de espuma en tanque T-04 (NC Mayor).',
      },
    ],
  },
  {
    id: '80000000-0000-0000-0000-000000000004',
    codigo_auditoria: 'AUD-2024-004',
    id_certificado: '40000000-0000-0000-0000-000000000004',
    numero_certificado: 'FN-ISMS-2024-007',
    organizacion_id: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    organizacion_rif: 'J-40819234-5',
    direccion_principal: 'Torre David, Piso 14, Chacao, Caracas',
    norma_codigo: 'ISO/IEC 27001:2022',
    norma_titulo: 'Seguridad de la información, ciberseguridad y protección de la privacidad',
    sector_iaf: 33,
    tipo_auditoria: 'Seguimiento 1',
    metodologia: 'Mixta',
    fecha_inicio: '2024-12-05',
    fecha_fin: '2024-12-06',
    fecha_reprogramacion: null,
    dias_auditor: 2.0,
    auditor_lider_id: '10000000-0000-0000-0000-000000000002',
    auditor_lider_nombre: 'Ing. Roberto Silva',
    auditor_lider_email: 'rsilva@programa-aud.com',
    estatus: 'Planificado',
    objetivo:
      'Vigilancia anual del primer año para constatar la eficacia operativa del SGSI, controles criptográficos y gestión de incidentes en el SOC.',
    equipo: [
      {
        id: 'eq-005',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        nombre: 'Ing. Roberto Silva',
        rol: 'Auditor Líder',
        codigo_credencial: 'AUD-REG-2022-88',
        competencia_alcance: 'Sector IAF 33 · ISO/IEC 27001:2022',
        dias_asignados: 2.0,
      },
    ],
    sedesMuestreo: [
      {
        id: 'sm-006',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal SOC (HQ)',
        direccion: 'Torre David, Piso 14, Chacao',
        tipo_evaluacion: 'In Situ (Presencial)',
        fecha_asignada: '2024-12-05',
        dias_asignados: 1.0,
        auditor_responsable: 'Ing. Roberto Silva',
      },
    ],
    verificacionNormativa: [
      {
        id: 'vn-006',
        clausula_codigo: '6.1.2',
        clausula_titulo: 'Apreciación de riesgos de seguridad de la información',
        proceso_nombre: 'Gestión de Incidentes de Ciberseguridad y Cifrado',
        estado: 'Pendiente',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Relocated Finding, Audit Planning, and Readiness Helpers (retired drillDown.ts)
// ---------------------------------------------------------------------------

export type FindingType =
  | 'NC_MAYOR'
  | 'NC_MENOR'
  | 'OBSERVACION'
  | 'OPORTUNIDAD_MEJORA';

export interface FindingRecord {
  id: string;
  id_auditoria: string;
  auditoria_tipo?: string;
  numero_certificado?: string;
  organizacion_nombre?: string;
  id_requisito: string;
  requisito_codigo: string;
  id_proceso: string;
  proceso_nombre: string;
  tipo: FindingType;
  descripcion: string;
  evidencia?: string | null;
  cerrado: boolean;
  created_at?: string;
}

export interface FindingStats {
  total: number;
  ncMayor: number;
  ncMenor: number;
  observaciones: number;
  oportunidadesMejora: number;
  abiertos: number;
  cerrados: number;
}

export interface FindingVisualMeta {
  label: string;
  symbol: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  description: string;
}

export interface AuditModalityMeta {
  label: string;
  badgeClass: string;
  symbol: string;
  description: string;
}

export function getAuditModalityMeta(modality: string): AuditModalityMeta {
  switch (modality) {
    case 'ETAPA_1':
      return {
        label: 'Etapa 1 - Revisión Documental y Contexto',
        badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
        symbol: '📑',
        description: 'Evaluación preliminar de la documentación del sistema de gestión y ubicación del cliente.',
      };
    case 'ETAPA_2':
      return {
        label: 'Etapa 2 - Evaluación de Campo de Conformidad',
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        symbol: '🔍',
        description: 'Verificación in situ de la implementación y eficacia operativa del sistema evaluado.',
      };
    case 'VIGILANCIA_1':
      return {
        label: 'Vigilancia 1 (Anual)',
        badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
        symbol: '🔎',
        description: 'Auditoría periódica de mantenimiento del primer año del ciclo de certificación.',
      };
    case 'VIGILANCIA_2':
      return {
        label: 'Vigilancia 2 (Anual)',
        badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
        symbol: '📊',
        description: 'Auditoría de seguimiento previo a la recertificación del ciclo de 3 años.',
      };
    case 'RECERTIFICACION':
      return {
        label: 'Recertificación del Ciclo Trienal',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
        symbol: '🔄',
        description: 'Evaluación integral para la renovación formal de la certificación por un nuevo ciclo.',
      };
    case 'EXTRAORDINARIA':
    default:
      return {
        label: 'Auditoría Extraordinaria / Especial',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        symbol: '⚡',
        description: 'Evaluación motivada por ampliación de alcance, cambios estructurales o quejas.',
      };
  }
}

export function getFindingTypeMeta(type: FindingType | string): FindingVisualMeta {
  switch (type) {
    case 'NC_MAYOR':
      return {
        label: 'No Conformidad Mayor',
        symbol: '🚨',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        borderClass: 'border-l-4 border-l-rose-500',
        textClass: 'text-rose-800',
        description:
          'Incumplimiento total de un requisito normativo o ausencia de control que compromete la eficacia del sistema.',
      };
    case 'NC_MENOR':
      return {
        label: 'No Conformidad Menor',
        symbol: '⚠️',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        borderClass: 'border-l-4 border-l-amber-500',
        textClass: 'text-amber-800',
        description:
          'Incumplimiento puntual o aislado que no vulnera la integridad global del sistema de gestión evaluado.',
      };
    case 'OBSERVACION':
      return {
        label: 'Observación',
        symbol: '👁️',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        borderClass: 'border-l-4 border-l-blue-500',
        textClass: 'text-blue-800',
        description:
          'Situación que no constituye no conformidad pero requiere monitoreo para prevenir desviaciones futuras.',
      };
    case 'OPORTUNIDAD_MEJORA':
    default:
      return {
        label: 'Oportunidad de Mejora',
        symbol: '💡',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        borderClass: 'border-l-4 border-l-emerald-500',
        textClass: 'text-emerald-800',
        description:
          'Recomendación técnica orientada a optimizar el desempeño, robustez o madurez de los procesos evaluados.',
      };
  }
}

export function calculateFindingStats(findings: FindingRecord[]): FindingStats {
  const stats: FindingStats = {
    total: findings.length,
    ncMayor: 0,
    ncMenor: 0,
    observaciones: 0,
    oportunidadesMejora: 0,
    abiertos: 0,
    cerrados: 0,
  };

  for (const f of findings) {
    if (f.tipo === 'NC_MAYOR') stats.ncMayor += 1;
    else if (f.tipo === 'NC_MENOR') stats.ncMenor += 1;
    else if (f.tipo === 'OBSERVACION') stats.observaciones += 1;
    else if (f.tipo === 'OPORTUNIDAD_MEJORA') stats.oportunidadesMejora += 1;

    if (f.cerrado) stats.cerrados += 1;
    else stats.abiertos += 1;
  }

  return stats;
}

export function filterFindings(
  findings: FindingRecord[],
  filters: {
    type?: string;
    status?: 'all' | 'open' | 'closed';
    search?: string;
    auditId?: string;
  }
): FindingRecord[] {
  let result = findings;

  if (filters.auditId) {
    result = result.filter((f) => f.id_auditoria === filters.auditId);
  }

  if (filters.type && filters.type !== 'ALL') {
    result = result.filter((f) => f.tipo === filters.type);
  }

  if (filters.status && filters.status !== 'all') {
    const isClosed = filters.status === 'closed';
    result = result.filter((f) => f.cerrado === isClosed);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (f) =>
        f.descripcion.toLowerCase().includes(q) ||
        (f.evidencia && f.evidencia.toLowerCase().includes(q)) ||
        f.requisito_codigo.toLowerCase().includes(q) ||
        f.proceso_nombre.toLowerCase().includes(q) ||
        (f.numero_certificado && f.numero_certificado.toLowerCase().includes(q))
    );
  }

  return result;
}

export function validateFindingInput(data: {
  id_auditoria: string;
  id_requisito: string;
  id_proceso: string;
  tipo: string;
  descripcion: string;
}): { valid: boolean; error?: string } {
  if (!data.id_auditoria || data.id_auditoria.trim() === '') {
    return { valid: false, error: 'Debe seleccionar una auditoría de campo.' };
  }
  if (!data.id_requisito || data.id_requisito.trim() === '') {
    return { valid: false, error: 'Debe vincular el hallazgo a un requisito normativo.' };
  }
  if (!data.id_proceso || data.id_proceso.trim() === '') {
    return { valid: false, error: 'Debe asociar el hallazgo a un proceso auditado.' };
  }
  const validTypes: FindingType[] = ['NC_MAYOR', 'NC_MENOR', 'OBSERVACION', 'OPORTUNIDAD_MEJORA'];
  if (!validTypes.includes(data.tipo as FindingType)) {
    return { valid: false, error: 'Tipo de hallazgo inválido según ISO 19011:2018.' };
  }
  if (!data.descripcion || data.descripcion.trim().length < 5) {
    return { valid: false, error: 'La descripción del hallazgo debe contener al menos 5 caracteres.' };
  }

  return { valid: true };
}

export function validateAuditPlanningInput(data: {
  id_certificado: string;
  id_tipo_auditoria: string;
  id_metodologia: string;
  fecha_programacion: string;
}): { valid: boolean; error?: string } {
  if (!data.id_certificado || data.id_certificado.trim() === '') {
    return { valid: false, error: 'Debe seleccionar un certificado válido para la auditoría.' };
  }
  if (!data.id_tipo_auditoria || data.id_tipo_auditoria.trim() === '') {
    return { valid: false, error: 'Debe especificar la modalidad / tipo de auditoría (Etapa 1, 2, Vigilancia, etc.).' };
  }
  if (!data.id_metodologia || data.id_metodologia.trim() === '') {
    return { valid: false, error: 'Debe seleccionar una metodología (Presencial, Remota o Híbrida).' };
  }
  if (!data.fecha_programacion || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha_programacion)) {
    return { valid: false, error: 'La fecha programada debe tener un formato válido (AAAA-MM-DD).' };
  }

  return { valid: true };
}

export function isAuditorQualifiedForAudit(
  auditorStandards: string[],
  auditorIafSectors: number[],
  requiredStandard: string,
  requiredIafSector?: number
): { qualified: boolean; reason: string } {
  const normQualified = auditorStandards.some((norm) =>
    norm.toLowerCase().includes(requiredStandard.toLowerCase().split(':')[0])
  );

  if (!normQualified) {
    return {
      qualified: false,
      reason: `El auditor no posee acreditación vigente en la norma ${requiredStandard}.`,
    };
  }

  if (requiredIafSector !== undefined && !auditorIafSectors.includes(requiredIafSector)) {
    return {
      qualified: false,
      reason: `El auditor no está calificado en el sector IAF ${requiredIafSector}.`,
    };
  }

  return {
    qualified: true,
    reason: `Auditor calificado con competencias validadas en ${requiredStandard}${
      requiredIafSector ? ` y sector IAF ${requiredIafSector}` : ''
    }.`,
  };
}

export const INITIAL_FINDINGS: FindingRecord[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'RECERTIFICACION',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    tipo: 'NC_MENOR',
    descripcion: 'Descalibración en pie de rey en la línea 2 de fundición.',
    evidencia: 'Registro fotográfico de instrumento CAL-09 sin etiqueta de calibración vigente.',
    cerrado: false,
    created_at: '2024-11-20T10:30:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'RECERTIFICACION',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000041',
    requisito_codigo: '4.1',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    tipo: 'OBSERVACION',
    descripcion: 'La matriz FODA de contexto estratégico no incluye el impacto del nuevo marco tributario.',
    evidencia: 'Revisión documental del expediente PE-01 versión 3.',
    cerrado: true,
    created_at: '2024-11-20T14:15:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'RECERTIFICACION',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    tipo: 'OPORTUNIDAD_MEJORA',
    descripcion: 'Se recomienda digitalizar las órdenes de trabajo manuales para trazabilidad en tiempo real.',
    evidencia: 'Entrevista con supervisor de planta durante el turno matutino.',
    cerrado: false,
    created_at: '2024-11-20T16:00:00Z',
  },
];

export interface CertificateIssuanceEvaluation {
  canIssue: boolean;
  blockingReasons: string[];
  mandatoryPendingCount: number;
  openMajorNcCount: number;
  coveragePercentage: number;
}

export function evaluateCertificateIssuanceReadiness(
  requirements: Array<{ codigo: string; estado: 'CUBIERTO' | 'NO_APLICABLE' | 'PENDIENTE' }>,
  findings: FindingRecord[]
): CertificateIssuanceEvaluation {
  const mandatoryPending = requirements.filter(
    (r) => r.estado === 'PENDIENTE'
  );
  const openMajorNcs = findings.filter(
    (f) => f.tipo === 'NC_MAYOR' && !f.cerrado
  );

  const total = requirements.length;
  const coveredOrExcluded = requirements.filter(
    (r) => r.estado === 'CUBIERTO' || r.estado === 'NO_APLICABLE'
  ).length;
  const coveragePercentage = total > 0 ? Math.round((coveredOrExcluded / total) * 100) : 0;

  const blockingReasons: string[] = [];
  if (mandatoryPending.length > 0) {
    blockingReasons.push(
      `Existen ${mandatoryPending.length} requisito(s) normativo(s) mandatorio(s) en estado PENDIENTE: ${mandatoryPending
        .map((r) => r.codigo)
        .join(', ')}.`
    );
  }
  if (openMajorNcs.length > 0) {
    blockingReasons.push(
      `Existen ${openMajorNcs.length} No Conformidad(es) Mayor(es) (NC_MAYOR) sin cerrar en la auditoría.`
    );
  }

  return {
    canIssue: blockingReasons.length === 0,
    blockingReasons,
    mandatoryPendingCount: mandatoryPending.length,
    openMajorNcCount: openMajorNcs.length,
    coveragePercentage,
  };
}

export function verifyAuditLogImmutabilityRule(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  callerRole: 'ADMIN' | 'WORKER' | 'AUDITOR' | 'CLIENT' | 'SYSTEM_TRIGGER'
): { allowed: boolean; reason: string } {
  if (operation === 'UPDATE' || operation === 'DELETE') {
    return {
      allowed: false,
      reason: 'Violación de Inmutabilidad ISO/IEC 17021-1: No se permiten mutaciones UPDATE o DELETE sobre public.audit_log.',
    };
  }
  if (operation === 'INSERT' && callerRole !== 'SYSTEM_TRIGGER' && callerRole !== 'ADMIN') {
    return {
      allowed: false,
      reason: 'Violación de Trazabilidad: Las entradas al registro forense deben originarse desde disparadores autorizados.',
    };
  }
  return {
    allowed: true,
    reason: 'Operación permitida y registrada para trazabilidad forense.',
  };
}

export function verifyRoleDataBoundary(
  role: 'ADMIN' | 'WORKER' | 'AUDITOR' | 'CLIENT',
  resource: 'all_orgs' | 'assigned_audits' | 'approved_orgs' | 'audit_log',
  context: {
    isAssignedAuditor?: boolean;
    hasApprovedClientAccess?: boolean;
    isApprovedStatus: boolean;
  }
): { canAccess: boolean; policy: string } {
  if (!context.isApprovedStatus) {
    return { canAccess: false, policy: 'Cuenta no aprobada (PENDING/REJECTED).' };
  }

  switch (role) {
    case 'ADMIN':
      return { canAccess: true, policy: 'Acceso administrativo global (ADMIN).' };
    case 'WORKER':
      if (resource === 'audit_log') {
        return { canAccess: false, policy: 'audit_log_select_admin: Exclusivo para rol ADMIN.' };
      }
      return { canAccess: true, policy: 'Acceso operacional global para gestión de certificación (WORKER).' };
    case 'AUDITOR':
      if (resource === 'assigned_audits') {
        return {
          canAccess: Boolean(context.isAssignedAuditor),
          policy: 'is_assigned_auditor: Restringido a auditorías donde es miembro de equipo_auditor.',
        };
      }
      return { canAccess: false, policy: 'Aislamiento de auditor: Sin acceso fuera de asignación.' };
    case 'CLIENT':
      if (resource === 'approved_orgs') {
        return {
          canAccess: Boolean(context.hasApprovedClientAccess),
          policy: 'has_client_org_access: Restringido a organizaciones con client_organization_access APPROVED.',
        };
      }
      return { canAccess: false, policy: 'Aislamiento de cliente: Sin acceso a otras organizaciones.' };
  }
}
