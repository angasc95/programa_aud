/**
 * Phase 5: Domain "Auditorías" — Programación, Calendario Operativo & Resultado (Hallazgos + Recomendación ISO/IEC 17021-1:2015)
 * Aligned with ISO/IEC 17021-1:2015 (clauses 9.1–9.6), ISO 19011:2018, and IAF MD 1:2018.
 */

import type { FindingRecord, FindingType } from './drillDown';
import type { AuditLogEntry } from './auditLog';
import type { MultiViewSelectionMap, SortDirection } from './universalTemplate';

export type AuditTeamRole = 'Auditor Líder' | 'Auditor de Equipo' | 'Experto Técnico';

export type AuditMethodology = 'Presencial' | 'Remota' | 'Mixta';

export type SiteEvaluationMode = 'Presencial' | 'Remota';

export type NormativeVerificationStatus = 'Planificada' | 'Conforme' | 'Hallazgo' | 'No Aplicable';

export type FindingLifecycleStatus =
  | 'Abierto'
  | 'Causa Raíz Analizada'
  | 'Plan de Acción Enviado'
  | 'Verificado'
  | 'Cerrado';

export const FINDING_LIFECYCLE_ORDER: readonly FindingLifecycleStatus[] = [
  'Abierto',
  'Causa Raíz Analizada',
  'Plan de Acción Enviado',
  'Verificado',
  'Cerrado',
];

export type CertificationRecommendationStatus = 'APROBADA' | 'DENEGADA / CONDICIONADA';

export interface AuditTeamMember {
  id: string;
  id_auditor: string;
  nombre: string;
  rol: AuditTeamRole;
  competencia_norma: string;
  competencia_sector_iaf: number;
  credencial_codigo: string;
  estado_credencial: 'Vigente' | 'Por Vencer' | 'Vencido';
  email?: string;
  telefono?: string;
}

export interface SiteSamplingEntry {
  id: string;
  id_sitio: string;
  numero_sitio: number; // 0 = Sede Principal HQ, >= 1 = Sucursales / Plantas
  nombre_sitio: string;
  direccion_sitio: string;
  modalidad_evaluacion: SiteEvaluationMode;
  fecha_asignada: string;
  dias_asignados: number;
  muestreado: boolean;
  notas?: string;
}

export interface NormativeVerificationItem {
  id: string;
  id_requisito: string;
  codigo_clausula: string;
  titulo_clausula: string;
  proceso_nombre: string;
  estado_verificacion: NormativeVerificationStatus;
  notas?: string;
}

export interface CertificationRecommendationRecord {
  estado: CertificationRecommendationStatus;
  auditor_lider_nombre: string;
  firma_electronica: string;
  timestamp: string;
  comentarios: string;
  resumen_hallazgos: {
    total: number;
    ncMayorAbiertas: number;
    ncMenorAbiertas: number;
    observaciones: number;
    oportunidadesMejora: number;
  };
}

export interface ProgramacionAuditEntity {
  id: string;
  codigo_auditoria: string;
  id_certificado: string;
  numero_certificado: string;
  id_organizacion: string;
  organizacion_nombre: string;
  norma_codigo: string;
  sector_iaf: number;
  tipo_auditoria: string; // e.g. 'Etapa 1', 'Etapa 2', 'Seguimiento 1', 'Seguimiento 2', 'Renovación', 'Extraordinaria'
  metodologia: AuditMethodology;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_reprogramacion?: string | null;
  dias_auditor: number;
  estatus: string; // e.g. 'Planificado', 'En Ejecución', 'En Espera', 'Completado', 'Cerrado'
  auditor_lider_id: string;
  auditor_lider: string;
  sede_principal_direccion: string;
  equipo: AuditTeamMember[];
  sitiosMuestreo: SiteSamplingEntry[];
  matrizNormativa: NormativeVerificationItem[];
  recomendacion?: CertificationRecommendationRecord | null;
}

export interface Phase5FindingEntity extends FindingRecord {
  codigo_hallazgo: string;
  id_sitio?: string;
  sitio_nombre: string;
  estado_ciclo: FindingLifecycleStatus;
  analisis_causa_raiz: string;
  plan_accion_correctiva: string;
  comentarios_verificacion: string;
  fecha_limite: string;
  fecha_cierre?: string | null;
}

export type ProgramacionChildTab = 'equipo' | 'muestreo' | 'matriz' | 'hallazgos';
export type CalendarDisplayMode = 'month' | 'quarter' | 'gantt';
export type FindingsDisplayMode = 'list' | 'kanban';

export interface ProgramacionViewState {
  selectedAuditId: string | null;
  activeChildTab: ProgramacionChildTab;
  query: string;
  selectedTipo: string;
  selectedMetodologia: string;
  selectedEstatus: string;
  selectedAuditorLider: string;
  viewMode: 'grid' | 'list';
  sortColumn: 'codigo' | 'organizacion' | 'tipo' | 'fecha' | 'dias' | 'estatus' | null;
  sortDirection: SortDirection;
  isPlanningModalOpen: boolean;
  isEditingAttributes: boolean;
  isAddingTeamMember: boolean;
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface CalendarioViewState {
  displayMode: CalendarDisplayMode;
  referenceYear: number;
  referenceMonth: number; // 1..12
  filterAuditorId: string;
  filterStandard: string;
  filterMethodology: string;
  drawerAuditId: string | null;
}

export interface ResultadoViewState {
  selectedAuditId: string; // 'ALL' or specific audit ID for findings filter; recommendation targets activeAuditId
  activeAuditIdForDecision: string;
  displayMode: FindingsDisplayMode;
  filterType: string;
  filterLifecycle: string;
  searchQuery: string;
  isLoggingFinding: boolean;
  inspectingFindingId: string | null;
  recommendationError?: string | null;
  recommendationSuccess?: string | null;
  findingFormError?: string | null;
}

export interface AuditScheduleConflict {
  auditor_id: string;
  auditor_nombre: string;
  audit_a_id: string;
  audit_a_codigo: string;
  audit_b_id: string;
  audit_b_codigo: string;
  overlap_start: string;
  overlap_end: string;
  overlap_days: number;
}

export interface Iso17021RecommendationEvaluation {
  auditId: string;
  status: CertificationRecommendationStatus;
  canApprove: boolean;
  totalFindings: number;
  openMajorCount: number;
  closedMajorCount: number;
  openMinorCount: number;
  openMinorMissingPlanCount: number;
  observationsCount: number;
  opportunitiesCount: number;
  blockingReasons: string[];
  warnings: string[];
  summaryText: string;
}

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isWeekend: boolean;
  audits: ProgramacionAuditEntity[];
}

export interface GanttBarLayout {
  audit: ProgramacionAuditEntity;
  leftPercent: number;
  widthPercent: number;
  hasConflict: boolean;
}

/**
 * Normalizes Spanish/diacritic text for case-insensitive matching.
 */
export function normalizeAuditText(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Canonical styling metadata for audit modalities (Title-Case + legacy uppercase compatibility).
 */
export function getModalityVisualStyle(tipo: string): {
  label: string;
  badgeClass: string;
  calendarChipClass: string;
  ganttBarClass: string;
  symbol: string;
} {
  const norm = normalizeAuditText(tipo);
  if (norm.includes('etapa 1') || norm.includes('etapa_1')) {
    return {
      label: 'Etapa 1',
      badgeClass: 'bg-sky-50 text-sky-900 border-sky-200',
      calendarChipClass: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200/80',
      ganttBarClass: 'bg-sky-600 text-white border-sky-700',
      symbol: '📑',
    };
  }
  if (norm.includes('etapa 2') || norm.includes('etapa_2')) {
    return {
      label: 'Etapa 2',
      badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      calendarChipClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200/80',
      ganttBarClass: 'bg-indigo-600 text-white border-indigo-700',
      symbol: '🔍',
    };
  }
  if (norm.includes('seguimiento') || norm.includes('vigilancia')) {
    return {
      label: tipo.includes('2') ? 'Seguimiento 2' : 'Seguimiento 1',
      badgeClass: 'bg-teal-50 text-teal-900 border-teal-200',
      calendarChipClass: 'bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200/80',
      ganttBarClass: 'bg-teal-600 text-white border-teal-700',
      symbol: '🔎',
    };
  }
  if (norm.includes('renovacion') || norm.includes('recertificacion')) {
    return {
      label: 'Renovación',
      badgeClass: 'bg-purple-50 text-purple-900 border-purple-200',
      calendarChipClass: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200/80',
      ganttBarClass: 'bg-purple-600 text-white border-purple-700',
      symbol: '🔄',
    };
  }
  return {
    label: tipo || 'Extraordinaria',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    calendarChipClass: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200/80',
    ganttBarClass: 'bg-amber-600 text-white border-amber-700',
    symbol: '⚡',
  };
}

/**
 * Canonical styling metadata for audit methodologies.
 */
export function getMethodologyVisualStyle(metodologia: string): {
  label: AuditMethodology;
  badgeClass: string;
  symbol: string;
} {
  const norm = normalizeAuditText(metodologia);
  if (norm.includes('remota')) {
    return {
      label: 'Remota',
      badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-200',
      symbol: '💻',
    };
  }
  if (norm.includes('mixta') || norm.includes('hibrida')) {
    return {
      label: 'Mixta',
      badgeClass: 'bg-violet-50 text-violet-900 border-violet-200',
      symbol: '🔀',
    };
  }
  return {
    label: 'Presencial',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    symbol: '🏭',
  };
}

/**
 * Canonical styling metadata for operational audit status.
 */
export function getAuditStatusVisualStyle(estatus: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  const norm = normalizeAuditText(estatus);
  if (norm.includes('ejecucion')) {
    return {
      label: 'En Ejecución',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      dotClass: 'bg-sky-500',
    };
  }
  if (norm.includes('espera')) {
    return {
      label: 'En Espera',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
    };
  }
  if (norm.includes('completad') || norm.includes('cerrad') || norm.includes('activo')) {
    return {
      label: estatus || 'Completado',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
    };
  }
  if (norm.includes('cancelad') || norm.includes('suspendid')) {
    return {
      label: estatus,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      dotClass: 'bg-rose-500',
    };
  }
  return {
    label: estatus || 'Planificado',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dotClass: 'bg-indigo-500',
  };
}

/**
 * Canonical styling metadata for the 4 ISO 19011 / 17021-1 finding classifications.
 */
export function getPhase5FindingTypeMeta(tipo: FindingType | string): {
  code: FindingType;
  label: string;
  shortLabel: string;
  symbol: string;
  badgeClass: string;
  cardBorderClass: string;
  severityOrder: number;
} {
  switch (tipo) {
    case 'NC_MAYOR':
      return {
        code: 'NC_MAYOR',
        label: 'No Conformidad Mayor',
        shortLabel: 'NC Mayor',
        symbol: '🚨',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        cardBorderClass: 'border-l-4 border-l-rose-600',
        severityOrder: 1,
      };
    case 'NC_MENOR':
      return {
        code: 'NC_MENOR',
        label: 'No Conformidad Menor',
        shortLabel: 'NC Menor',
        symbol: '⚠️',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        cardBorderClass: 'border-l-4 border-l-amber-500',
        severityOrder: 2,
      };
    case 'OBSERVACION':
      return {
        code: 'OBSERVACION',
        label: 'Observación',
        shortLabel: 'Observación',
        symbol: '👁️',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        cardBorderClass: 'border-l-4 border-l-blue-500',
        severityOrder: 3,
      };
    case 'OPORTUNIDAD_MEJORA':
    default:
      return {
        code: 'OPORTUNIDAD_MEJORA',
        label: 'Oportunidad de Mejora',
        shortLabel: 'Oportunidad de Mejora',
        symbol: '💡',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        cardBorderClass: 'border-l-4 border-l-emerald-500',
        severityOrder: 4,
      };
  }
}

/**
 * Canonical styling metadata for finding lifecycle status.
 */
export function getLifecycleStatusMeta(status: FindingLifecycleStatus): {
  label: FindingLifecycleStatus;
  badgeClass: string;
  headerBgClass: string;
  stepIndex: number;
} {
  switch (status) {
    case 'Abierto':
      return {
        label: 'Abierto',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        headerBgClass: 'bg-rose-50/70 border-rose-200 text-rose-900',
        stepIndex: 0,
      };
    case 'Causa Raíz Analizada':
      return {
        label: 'Causa Raíz Analizada',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        headerBgClass: 'bg-amber-50/70 border-amber-200 text-amber-900',
        stepIndex: 1,
      };
    case 'Plan de Acción Enviado':
      return {
        label: 'Plan de Acción Enviado',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        headerBgClass: 'bg-sky-50/70 border-sky-200 text-sky-900',
        stepIndex: 2,
      };
    case 'Verificado':
      return {
        label: 'Verificado',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        headerBgClass: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
        stepIndex: 3,
      };
    case 'Cerrado':
    default:
      return {
        label: 'Cerrado',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        headerBgClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
        stepIndex: 4,
      };
  }
}

/**
 * Filters and sorts scheduled audits for Programación directory view.
 */
export function filterAndSortProgramacionAudits(
  audits: ProgramacionAuditEntity[],
  criteria: {
    query?: string;
    selectedTipo?: string;
    selectedMetodologia?: string;
    selectedEstatus?: string;
    selectedAuditorLider?: string;
    sortColumn?: ProgramacionViewState['sortColumn'];
    sortDirection?: SortDirection;
  }
): ProgramacionAuditEntity[] {
  const q = normalizeAuditText(criteria.query);

  const filtered = audits.filter((a) => {
    if (q) {
      const hay = [
        a.codigo_auditoria,
        a.organizacion_nombre,
        a.numero_certificado,
        a.norma_codigo,
        a.auditor_lider,
        a.tipo_auditoria,
        a.metodologia,
      ]
        .map(normalizeAuditText)
        .join(' ');
      if (!hay.includes(q)) return false;
    }

    if (criteria.selectedTipo && criteria.selectedTipo !== 'ALL') {
      if (normalizeAuditText(a.tipo_auditoria) !== normalizeAuditText(criteria.selectedTipo)) {
        return false;
      }
    }

    if (criteria.selectedMetodologia && criteria.selectedMetodologia !== 'ALL') {
      if (normalizeAuditText(a.metodologia) !== normalizeAuditText(criteria.selectedMetodologia)) {
        return false;
      }
    }

    if (criteria.selectedEstatus && criteria.selectedEstatus !== 'ALL') {
      if (normalizeAuditText(a.estatus) !== normalizeAuditText(criteria.selectedEstatus)) {
        return false;
      }
    }

    if (criteria.selectedAuditorLider && criteria.selectedAuditorLider !== 'ALL') {
      if (normalizeAuditText(a.auditor_lider) !== normalizeAuditText(criteria.selectedAuditorLider)) {
        return false;
      }
    }

    return true;
  });

  if (!criteria.sortColumn || !criteria.sortDirection || criteria.sortDirection === 'none') {
    return filtered;
  }

  const factor = criteria.sortDirection === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    switch (criteria.sortColumn) {
      case 'codigo':
        return factor * a.codigo_auditoria.localeCompare(b.codigo_auditoria, 'es');
      case 'organizacion':
        return factor * a.organizacion_nombre.localeCompare(b.organizacion_nombre, 'es');
      case 'tipo':
        return factor * a.tipo_auditoria.localeCompare(b.tipo_auditoria, 'es');
      case 'fecha':
        return factor * a.fecha_inicio.localeCompare(b.fecha_inicio);
      case 'dias':
        return factor * (a.dias_auditor - b.dias_auditor);
      case 'estatus':
        return factor * a.estatus.localeCompare(b.estatus, 'es');
      default:
        return 0;
    }
  });
}

/**
 * Filters audits for the Operational Calendar by auditor (lead or team member), standard, and methodology.
 */
export function filterCalendarAudits(
  audits: ProgramacionAuditEntity[],
  criteria: {
    auditorId?: string;
    standard?: string;
    methodology?: string;
  }
): ProgramacionAuditEntity[] {
  return audits.filter((audit) => {
    if (criteria.auditorId && criteria.auditorId !== 'ALL') {
      const target = normalizeAuditText(criteria.auditorId);
      const matchesLead =
        audit.auditor_lider_id === criteria.auditorId ||
        normalizeAuditText(audit.auditor_lider).includes(target);
      const matchesTeam = audit.equipo.some(
        (m) => m.id_auditor === criteria.auditorId || normalizeAuditText(m.nombre).includes(target)
      );
      if (!matchesLead && !matchesTeam) return false;
    }

    if (criteria.standard && criteria.standard !== 'ALL') {
      if (
        !normalizeAuditText(audit.norma_codigo).includes(normalizeAuditText(criteria.standard))
      ) {
        return false;
      }
    }

    if (criteria.methodology && criteria.methodology !== 'ALL') {
      if (
        normalizeAuditText(audit.metodologia) !== normalizeAuditText(criteria.methodology)
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Formats an integer YYYY, MM, DD into YYYY-MM-DD.
 */
export function formatIsoDateParts(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD into UTC day index (days since epoch) for safe date arithmetic.
 */
function toUtcDayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Formats YYYY-MM-DD from UTC day number.
 */
function fromUtcDayNumber(dayNum: number): string {
  const dt = new Date(dayNum * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns audits overlapping a specific YYYY-MM-DD calendar date.
 */
export function getAuditsForDate(
  audits: ProgramacionAuditEntity[],
  isoDate: string
): ProgramacionAuditEntity[] {
  return audits.filter((a) => {
    const start = a.fecha_reprogramacion || a.fecha_inicio;
    const end = a.fecha_fin >= start ? a.fecha_fin : start;
    return isoDate >= start && isoDate <= end;
  });
}

/**
 * Generates a 6-week (or 5-week) Monday-first monthly calendar grid for a given year & month (1-12).
 */
export function buildCalendarMonthGrid(
  year: number,
  month: number,
  audits: ProgramacionAuditEntity[]
): CalendarDayCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Convert Sun=0..Sat=6 to Mon=0..Sun=6
  const startWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const totalCells = startWeekday + daysInMonth > 35 ? 42 : 35;

  const firstDayNum = toUtcDayNumber(formatIsoDateParts(year, month, 1));
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - startWeekday;
    const cellDayNum = firstDayNum + dayOffset;
    const isoDate = fromUtcDayNumber(cellDayNum);
    const dt = new Date(cellDayNum * 86400000);
    const cellMonth = dt.getUTCMonth() + 1;
    const cellDay = dt.getUTCDate();
    const weekday = dt.getUTCDay(); // 0=Sun, 6=Sat

    cells.push({
      date: isoDate,
      dayOfMonth: cellDay,
      inCurrentMonth: cellMonth === month,
      isWeekend: weekday === 0 || weekday === 6,
      audits: getAuditsForDate(audits, isoDate),
    });
  }

  return cells;
}

/**
 * Returns the 3 months (1-based) belonging to the quarter containing `month`.
 */
export function getQuarterMonthsForMonth(
  year: number,
  month: number
): Array<{ year: number; month: number; label: string }> {
  const spanishMonths = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const quarterIndex = Math.floor((month - 1) / 3); // 0..3
  const startMonth = quarterIndex * 3 + 1;
  return [0, 1, 2].map((offset) => {
    const m = startMonth + offset;
    return {
      year,
      month: m,
      label: `${spanishMonths[m - 1]} ${year}`,
    };
  });
}

/**
 * Detects overlapping schedule conflicts for auditors assigned across multiple audits
 * (as Lead Auditor or Team Member) whose date ranges overlap.
 */
export function detectAuditorConflicts(
  audits: ProgramacionAuditEntity[]
): AuditScheduleConflict[] {
  const conflicts: AuditScheduleConflict[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < audits.length; i++) {
    for (let j = i + 1; j < audits.length; j++) {
      const a = audits[i];
      const b = audits[j];

      const aStart = toUtcDayNumber(a.fecha_reprogramacion || a.fecha_inicio);
      const aEnd = Math.max(aStart, toUtcDayNumber(a.fecha_fin));
      const bStart = toUtcDayNumber(b.fecha_reprogramacion || b.fecha_inicio);
      const bEnd = Math.max(bStart, toUtcDayNumber(b.fecha_fin));

      if (isNaN(aStart) || isNaN(bStart)) continue;

      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);

      if (overlapStart <= overlapEnd) {
        const aAuditors = new Map<string, string>();
        if (a.auditor_lider_id) aAuditors.set(a.auditor_lider_id, a.auditor_lider);
        for (const m of a.equipo) aAuditors.set(m.id_auditor, m.nombre);

        const bAuditorIds = new Set<string>();
        if (b.auditor_lider_id) bAuditorIds.add(b.auditor_lider_id);
        for (const m of b.equipo) bAuditorIds.add(m.id_auditor);

        for (const [audId, audName] of aAuditors.entries()) {
          if (bAuditorIds.has(audId)) {
            const pairKey = `${audId}::${[a.id, b.id].sort().join('::')}`;
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              conflicts.push({
                auditor_id: audId,
                auditor_nombre: audName,
                audit_a_id: a.id,
                audit_a_codigo: a.codigo_auditoria,
                audit_b_id: b.id,
                audit_b_codigo: b.codigo_auditoria,
                overlap_start: fromUtcDayNumber(overlapStart),
                overlap_end: fromUtcDayNumber(overlapEnd),
                overlap_days: overlapEnd - overlapStart + 1,
              });
            }
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Computes Timeline/Gantt bar percentages for a given visible month window.
 */
export function calculateGanttBarsForMonth(
  audits: ProgramacionAuditEntity[],
  year: number,
  month: number,
  conflictingAuditIds: Set<string>
): GanttBarLayout[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const winStart = toUtcDayNumber(formatIsoDateParts(year, month, 1));
  const winEnd = toUtcDayNumber(formatIsoDateParts(year, month, daysInMonth));

  const layouts: GanttBarLayout[] = [];

  for (const audit of audits) {
    const rawStart = toUtcDayNumber(audit.fecha_reprogramacion || audit.fecha_inicio);
    const rawEnd = Math.max(rawStart, toUtcDayNumber(audit.fecha_fin));

    if (rawEnd < winStart || rawStart > winEnd) continue;

    const clampedStart = Math.max(rawStart, winStart);
    const clampedEnd = Math.min(rawEnd, winEnd);

    const startOffsetDays = clampedStart - winStart;
    const spanDays = clampedEnd - clampedStart + 1;

    const leftPercent = Math.round((startOffsetDays / daysInMonth) * 1000) / 10;
    const widthPercent = Math.max(4, Math.round((spanDays / daysInMonth) * 1000) / 10);

    layouts.push({
      audit,
      leftPercent,
      widthPercent: Math.min(100 - leftPercent, widthPercent),
      hasConflict: conflictingAuditIds.has(audit.id),
    });
  }

  return layouts;
}

/**
 * Evaluates all findings for a given audit under ISO/IEC 17021-1:2015 clause 9.5/9.6 rules:
 * - ANY unclosed NC_MAYOR strictly forces "DENEGADA / CONDICIONADA" and blocks approval.
 * - Any open NC_MENOR without a documented corrective action plan also blocks recommendation until action plan is submitted.
 * - Only when 0 open NC_MAYOR exist (and open NC_MENOR have approved action plans) does the engine output "APROBADA".
 */
export function evaluateIso17021Recommendation(
  findings: Phase5FindingEntity[],
  auditId: string
): Iso17021RecommendationEvaluation {
  const auditFindings = findings.filter((f) => f.id_auditoria === auditId);

  const openMajor = auditFindings.filter(
    (f) => f.tipo === 'NC_MAYOR' && f.estado_ciclo !== 'Cerrado' && !f.cerrado
  );
  const closedMajor = auditFindings.filter(
    (f) => f.tipo === 'NC_MAYOR' && (f.estado_ciclo === 'Cerrado' || f.cerrado)
  );
  const openMinor = auditFindings.filter(
    (f) => f.tipo === 'NC_MENOR' && f.estado_ciclo !== 'Cerrado' && !f.cerrado
  );
  const openMinorMissingPlan = openMinor.filter(
    (f) =>
      f.estado_ciclo === 'Abierto' ||
      f.estado_ciclo === 'Causa Raíz Analizada' ||
      !f.plan_accion_correctiva ||
      f.plan_accion_correctiva.trim().length < 5
  );
  const observations = auditFindings.filter((f) => f.tipo === 'OBSERVACION');
  const opportunities = auditFindings.filter((f) => f.tipo === 'OPORTUNIDAD_MEJORA');

  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  if (openMajor.length > 0) {
    blockingReasons.push(
      `Existen ${openMajor.length} No Conformidad(es) Mayor(es) (NC_MAYOR) abierta(s) sin cierre verificado (${openMajor
        .map((f) => f.codigo_hallazgo)
        .join(', ')}). ISO/IEC 17021-1 prohíbe otorgar o renovar la certificación.`
    );
  }

  if (openMinorMissingPlan.length > 0) {
    blockingReasons.push(
      `${openMinorMissingPlan.length} No Conformidad(es) Menor(es) (NC_MENOR) aún no cuentan con Plan de Acción Correctiva aprobado (${openMinorMissingPlan
        .map((f) => f.codigo_hallazgo)
        .join(', ')}).`
    );
  }

  const openMinorWithPlan = openMinor.length - openMinorMissingPlan.length;
  if (openMinorWithPlan > 0) {
    warnings.push(
      `${openMinorWithPlan} NC Menor(es) cuentan con Plan de Acción Correctiva enviado; su eficacia será verificada en la próxima auditoría de seguimiento.`
    );
  }

  if (observations.length > 0 || opportunities.length > 0) {
    warnings.push(
      `Se registran ${observations.length} Observación(es) y ${opportunities.length} Oportunidad(es) de Mejora para seguimiento preventivo.`
    );
  }

  const canApprove = blockingReasons.length === 0;
  const status: CertificationRecommendationStatus = canApprove
    ? 'APROBADA'
    : 'DENEGADA / CONDICIONADA';

  const summaryText = canApprove
    ? auditFindings.length === 0
      ? 'Auditoría sin hallazgos abiertos. Cumplimiento integral verificado conforme a ISO/IEC 17021-1:2015.'
      : 'Sin No Conformidades Mayores abiertas y con planes de acción validados para las NC Menores existentes. Se recomienda la emisión / mantenimiento / renovación.'
    : 'Emisión o renovación condicionada / denegada hasta completar el cierre documental o extraordinario en campo de los bloqueos normativos.';

  return {
    auditId,
    status,
    canApprove,
    totalFindings: auditFindings.length,
    openMajorCount: openMajor.length,
    closedMajorCount: closedMajor.length,
    openMinorCount: openMinor.length,
    openMinorMissingPlanCount: openMinorMissingPlan.length,
    observationsCount: observations.length,
    opportunitiesCount: opportunities.length,
    blockingReasons,
    warnings,
    summaryText,
  };
}

/**
 * Filters Phase 5 findings by auditId, classification, lifecycle status, and search query.
 */
export function filterPhase5Findings(
  findings: Phase5FindingEntity[],
  filters: {
    auditId?: string;
    type?: string;
    lifecycle?: string;
    query?: string;
  }
): Phase5FindingEntity[] {
  const q = normalizeAuditText(filters.query);

  return findings.filter((f) => {
    if (filters.auditId && filters.auditId !== 'ALL') {
      if (f.id_auditoria !== filters.auditId) return false;
    }
    if (filters.type && filters.type !== 'ALL') {
      if (f.tipo !== filters.type) return false;
    }
    if (filters.lifecycle && filters.lifecycle !== 'ALL') {
      if (filters.lifecycle === 'OPEN_ONLY') {
        if (f.cerrado || f.estado_ciclo === 'Cerrado') return false;
      } else if (filters.lifecycle === 'CLOSED_ONLY') {
        if (!f.cerrado && f.estado_ciclo !== 'Cerrado') return false;
      } else if (f.estado_ciclo !== filters.lifecycle) {
        return false;
      }
    }
    if (q) {
      const hay = [
        f.codigo_hallazgo,
        f.descripcion,
        f.evidencia || '',
        f.requisito_codigo,
        f.proceso_nombre,
        f.sitio_nombre,
        f.organizacion_nombre || '',
        f.numero_certificado || '',
      ]
        .map(normalizeAuditText)
        .join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Computes finding statistics for Phase 5 KPI cards.
 */
export function calculatePhase5FindingStats(findings: Phase5FindingEntity[]): {
  total: number;
  ncMayor: number;
  ncMayorAbiertas: number;
  ncMenor: number;
  observaciones: number;
  oportunidadesMejora: number;
  abiertos: number;
  cerrados: number;
} {
  let ncMayor = 0;
  let ncMayorAbiertas = 0;
  let ncMenor = 0;
  let observaciones = 0;
  let oportunidadesMejora = 0;
  let abiertos = 0;
  let cerrados = 0;

  for (const f of findings) {
    const isClosed = f.cerrado || f.estado_ciclo === 'Cerrado';
    if (f.tipo === 'NC_MAYOR') {
      ncMayor += 1;
      if (!isClosed) ncMayorAbiertas += 1;
    } else if (f.tipo === 'NC_MENOR') {
      ncMenor += 1;
    } else if (f.tipo === 'OBSERVACION') {
      observaciones += 1;
    } else if (f.tipo === 'OPORTUNIDAD_MEJORA') {
      oportunidadesMejora += 1;
    }

    if (isClosed) cerrados += 1;
    else abiertos += 1;
  }

  return {
    total: findings.length,
    ncMayor,
    ncMayorAbiertas,
    ncMenor,
    observaciones,
    oportunidadesMejora,
    abiertos,
    cerrados,
  };
}

/**
 * Validates input when creating a new finding in Phase 5 Resultado view.
 */
export function validatePhase5FindingInput(data: {
  id_auditoria: string;
  tipo: string;
  id_requisito: string;
  id_proceso: string;
  descripcion: string;
  evidencia?: string;
}): { valid: boolean; error?: string } {
  if (!data.id_auditoria || !data.id_auditoria.trim()) {
    return { valid: false, error: 'Debe seleccionar el evento de auditoría.' };
  }
  const allowed: FindingType[] = ['NC_MAYOR', 'NC_MENOR', 'OBSERVACION', 'OPORTUNIDAD_MEJORA'];
  if (!allowed.includes(data.tipo as FindingType)) {
    return { valid: false, error: 'Clasificación de hallazgo no válida según ISO 19011.' };
  }
  if (!data.id_requisito || !data.id_requisito.trim()) {
    return { valid: false, error: 'Debe seleccionar la cláusula normativa (requisito).' };
  }
  if (!data.id_proceso || !data.id_proceso.trim()) {
    return { valid: false, error: 'Debe seleccionar el proceso afectado.' };
  }
  if (!data.descripcion || data.descripcion.trim().length < 8) {
    return {
      valid: false,
      error: 'La descripción de la desviación debe tener al menos 8 caracteres.',
    };
  }
  return { valid: true };
}

/**
 * Validates transition of a finding into a new lifecycle status, enforcing CAPA & verification rules.
 */
export function validateFindingLifecycleUpdate(
  finding: Phase5FindingEntity,
  nextStatus: FindingLifecycleStatus,
  payload: {
    analisis_causa_raiz: string;
    plan_accion_correctiva: string;
    comentarios_verificacion: string;
  }
): { valid: boolean; error?: string } {
  const isNonConformity = finding.tipo === 'NC_MAYOR' || finding.tipo === 'NC_MENOR';

  if (nextStatus === 'Causa Raíz Analizada' && isNonConformity) {
    if (payload.analisis_causa_raiz.trim().length < 5) {
      return {
        valid: false,
        error: 'Para avanzar a "Causa Raíz Analizada", documente el análisis de causa raíz.',
      };
    }
  }

  if (nextStatus === 'Plan de Acción Enviado' && isNonConformity) {
    if (payload.plan_accion_correctiva.trim().length < 5) {
      return {
        valid: false,
        error: 'Para avanzar a "Plan de Acción Enviado", registre el plan de acción correctiva.',
      };
    }
  }

  if ((nextStatus === 'Verificado' || nextStatus === 'Cerrado') && isNonConformity) {
    if (payload.plan_accion_correctiva.trim().length < 5) {
      return {
        valid: false,
        error: 'No se puede verificar ni cerrar una No Conformidad sin Plan de Acción Correctiva.',
      };
    }
    if (payload.comentarios_verificacion.trim().length < 5) {
      return {
        valid: false,
        error: 'Ingrese los comentarios de verificación del auditor antes de cerrar el hallazgo.',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates Lead Auditor electronic signature when recording an ISO 17021-1 recommendation.
 */
export function validateRecommendationSignature(input: {
  firma_electronica: string;
  comentarios: string;
  evaluation: Iso17021RecommendationEvaluation;
}): { valid: boolean; error?: string } {
  if (!input.evaluation.canApprove) {
    return {
      valid: false,
      error:
        'Bloqueo ISO/IEC 17021-1 activo: no puede emitirse una recomendación APROBADA mientras existan NC Mayores abiertas o NC Menores sin plan de acción.',
    };
  }
  if (!input.firma_electronica || input.firma_electronica.trim().length < 4) {
    return {
      valid: false,
      error: 'Debe ingresar la firma electrónica o código de credencial del Auditor Líder (mín. 4 caracteres).',
    };
  }
  if (!input.comentarios || input.comentarios.trim().length < 8) {
    return {
      valid: false,
      error: 'Incluya una breve justificación técnica de cierre de auditoría (mín. 8 caracteres).',
    };
  }
  return { valid: true };
}

/**
 * Creates a formatted immutable session audit_log entry compatible with AuditLogModal.
 */
export function createSessionAuditLogEntry(params: {
  tableName: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  actorEmail: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}): AuditLogEntry {
  const nowIso = new Date().toISOString();
  return {
    id: `local-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    table_name: params.tableName,
    record_id: params.recordId,
    operation: params.operation,
    action: params.operation,
    actor_email: params.actorEmail,
    old_data: params.oldData,
    new_data: params.newData,
    changed_at: nowIso,
    created_at: nowIso,
  };
}

/**
 * Canonical Phase 5 initial datasets aligned with 06_datos_prueba.sql, multisiteSampling.ts, and competencyMatrix.ts.
 */
export const INITIAL_PROGRAMACION_AUDITS: ProgramacionAuditEntity[] = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    codigo_auditoria: 'AUD-2024-001',
    id_certificado: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    id_organizacion: '30000000-0000-0000-0000-000000000001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    norma_codigo: 'ISO 9001:2015',
    sector_iaf: 17,
    tipo_auditoria: 'Renovación',
    metodologia: 'Presencial',
    fecha_inicio: '2024-11-18',
    fecha_fin: '2024-11-20',
    fecha_reprogramacion: null,
    dias_auditor: 3,
    estatus: 'Planificado',
    auditor_lider_id: '10000000-0000-0000-0000-000000000001',
    auditor_lider: 'Ing. Carlos Mendoza',
    sede_principal_direccion: 'Av. Industrial 100, Valencia, Edo. Carabobo',
    equipo: [
      {
        id: 'eq-001',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        nombre: 'Ing. Carlos Mendoza',
        rol: 'Auditor Líder',
        competencia_norma: 'ISO 9001:2015',
        competencia_sector_iaf: 17,
        credencial_codigo: 'AUD-REG-2021-05',
        estado_credencial: 'Vigente',
        email: 'cmendoza@programa-aud.com',
        telefono: '+34 961 882 100',
      },
      {
        id: 'eq-002',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        nombre: 'Ing. Roberto Silva',
        rol: 'Auditor de Equipo',
        competencia_norma: 'ISO 9001:2015',
        competencia_sector_iaf: 17,
        credencial_codigo: 'AUD-REG-2022-88',
        estado_credencial: 'Vigente',
        email: 'rsilva@programa-aud.com',
        telefono: '+34 600 123 456',
      },
      {
        id: 'eq-003',
        id_auditor: '10000000-0000-0000-0000-000000000004',
        nombre: 'Lic. Javier Morales',
        rol: 'Experto Técnico',
        competencia_norma: 'ISO 9001:2015',
        competencia_sector_iaf: 33,
        credencial_codigo: 'AUD-REG-2024-42',
        estado_credencial: 'Vigente',
        email: 'jmorales@programa-aud.com',
        telefono: '+34 912 345 679',
      },
      {
        id: 'eq-004',
        id_auditor: '33333333-3333-3333-3333-333333333333',
        nombre: 'Auditor Técnico Evaluador',
        rol: 'Auditor de Equipo',
        competencia_norma: 'ISO 9001:2015',
        competencia_sector_iaf: 17,
        credencial_codigo: 'AUD-REG-2023-33',
        estado_credencial: 'Vigente',
        email: 'auditor@fondonorma.test',
        telefono: '+34 961 882 333',
      },
    ],
    sitiosMuestreo: [
      {
        id: 'sm-001',
        id_sitio: '50000000-0000-0000-0000-000000000000',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal HQ',
        direccion_sitio: 'Av. Industrial 100, Valencia, Edo. Carabobo',
        modalidad_evaluacion: 'Remota',
        fecha_asignada: '2024-11-18',
        dias_asignados: 1,
        muestreado: true,
        notas: 'Revisión de Dirección Estratégica, contexto y revisión por la dirección.',
      },
      {
        id: 'sm-002',
        id_sitio: '50000000-0000-0000-0000-000000000001',
        numero_sitio: 1,
        nombre_sitio: 'Planta Valencia',
        direccion_sitio: 'Zona Industrial Carabobo, Galpón 4-B, Valencia',
        modalidad_evaluacion: 'Presencial',
        fecha_asignada: '2024-11-19',
        dias_asignados: 2,
        muestreado: true,
        notas: 'Evaluación en líneas de troquelado, fundición, calibración y despacho.',
      },
    ],
    matrizNormativa: [
      {
        id: 'mn-001',
        id_requisito: 'f0000000-0000-0000-0000-000000000041',
        codigo_clausula: '4.1',
        titulo_clausula: 'Comprensión de la organización y de su contexto',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado_verificacion: 'Conforme',
        notas: 'Matriz FODA actualizada para período 2024-2025.',
      },
      {
        id: 'mn-002',
        id_requisito: 'f0000000-0000-0000-0000-000000000042',
        codigo_clausula: '4.2',
        titulo_clausula: 'Comprensión de las necesidades y expectativas de las partes interesadas',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado_verificacion: 'Conforme',
        notas: 'Requisitos legales y contractuales automotrices verificados.',
      },
      {
        id: 'mn-003',
        id_requisito: 'f0000000-0000-0000-0000-000000000051',
        codigo_clausula: '5.1',
        titulo_clausula: 'Liderazgo y compromiso',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado_verificacion: 'Planificada',
      },
      {
        id: 'mn-004',
        id_requisito: 'f0000000-0000-0000-0000-000000000085',
        codigo_clausula: '8.5',
        titulo_clausula: 'Producción y provisión del servicio',
        proceso_nombre: 'Troquelado y Fundición',
        estado_verificacion: 'Hallazgo',
        notas: 'Hallazgo menor detectado en calibración de instrumento CAL-09.',
      },
    ],
    recomendacion: null,
  },
  {
    id: '80000000-0000-0000-0000-000000000002',
    codigo_auditoria: 'AUD-2024-002',
    id_certificado: '40000000-0000-0000-0000-000000000002',
    numero_certificado: 'FN-EMS-2024-002',
    id_organizacion: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    norma_codigo: 'ISO 14001:2015',
    sector_iaf: 33,
    tipo_auditoria: 'Etapa 1',
    metodologia: 'Remota',
    fecha_inicio: '2024-11-19',
    fecha_fin: '2024-11-21',
    fecha_reprogramacion: null,
    dias_auditor: 2,
    estatus: 'En Ejecución',
    auditor_lider_id: '10000000-0000-0000-0000-000000000001',
    auditor_lider: 'Ing. Carlos Mendoza',
    sede_principal_direccion: 'Torre David, Piso 14, Chacao, Caracas',
    equipo: [
      {
        id: 'eq-004',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        nombre: 'Ing. Carlos Mendoza',
        rol: 'Auditor Líder',
        competencia_norma: 'ISO 14001:2015',
        competencia_sector_iaf: 28,
        credencial_codigo: 'AUD-REG-2021-05',
        estado_credencial: 'Vigente',
        email: 'cmendoza@programa-aud.com',
        telefono: '+34 961 882 100',
      },
      {
        id: 'eq-005',
        id_auditor: '10000000-0000-0000-0000-000000000005',
        nombre: 'Ing. Patricia Salcedo',
        rol: 'Experto Técnico',
        competencia_norma: 'ISO 14001:2015',
        competencia_sector_iaf: 14,
        credencial_codigo: 'AUD-REG-2024-99',
        estado_credencial: 'Por Vencer',
        email: 'psalcedo@programa-aud.com',
        telefono: '+34 954 112 335',
      },
    ],
    sitiosMuestreo: [
      {
        id: 'sm-003',
        id_sitio: '50000000-0000-0000-0000-000000000002',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal (HQ)',
        direccion_sitio: 'Torre David, Piso 14, Chacao, Caracas',
        modalidad_evaluacion: 'Remota',
        fecha_asignada: '2024-11-19',
        dias_asignados: 2,
        muestreado: true,
        notas: 'Revisión remota de aspectos e impactos ambientales y consumo PUE de centro de datos.',
      },
    ],
    matrizNormativa: [
      {
        id: 'mn-005',
        id_requisito: 'f0000000-0000-0000-0000-000000000041',
        codigo_clausula: '6.1',
        titulo_clausula: 'Acciones para abordar riesgos y oportunidades ambientales',
        proceso_nombre: 'Gestión Energética de Centros de Datos',
        estado_verificacion: 'Conforme',
      },
      {
        id: 'mn-006',
        id_requisito: 'f0000000-0000-0000-0000-000000000085',
        codigo_clausula: '8.1',
        titulo_clausula: 'Planificación y control operacional ambiental',
        proceso_nombre: 'Gestión Energética de Centros de Datos',
        estado_verificacion: 'Planificada',
      },
    ],
    recomendacion: null,
  },
  {
    id: '80000000-0000-0000-0000-000000000003',
    codigo_auditoria: 'AUD-2024-003',
    id_certificado: '40000000-0000-0000-0000-000000000003',
    numero_certificado: 'FN-OHS-2023-018',
    id_organizacion: '30000000-0000-0000-0000-000000000003',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    norma_codigo: 'ISO 45001:2018',
    sector_iaf: 14,
    tipo_auditoria: 'Seguimiento 1',
    metodologia: 'Presencial',
    fecha_inicio: '2024-11-12',
    fecha_fin: '2024-11-14',
    fecha_reprogramacion: null,
    dias_auditor: 3,
    estatus: 'En Espera',
    auditor_lider_id: '10000000-0000-0000-0000-000000000003',
    auditor_lider: 'Dra. Ana Belén Torres',
    sede_principal_direccion: 'Complejo Petroquímico Morón, Edificio Central, Edo. Carabobo',
    equipo: [
      {
        id: 'eq-006',
        id_auditor: '10000000-0000-0000-0000-000000000003',
        nombre: 'Dra. Ana Belén Torres',
        rol: 'Auditor Líder',
        competencia_norma: 'ISO 45001:2018',
        competencia_sector_iaf: 14,
        credencial_codigo: 'AUD-REG-2023-14',
        estado_credencial: 'Vigente',
        email: 'atorres@programa-aud.com',
        telefono: '+34 913 550 200',
      },
    ],
    sitiosMuestreo: [
      {
        id: 'sm-004',
        id_sitio: '50000000-0000-0000-0000-000000000003',
        numero_sitio: 0,
        nombre_sitio: 'Sede Administrativa Morón (HQ)',
        direccion_sitio: 'Complejo Petroquímico Morón, Edificio Central, Edo. Carabobo',
        modalidad_evaluacion: 'Presencial',
        fecha_asignada: '2024-11-12',
        dias_asignados: 1,
        muestreado: true,
        notas: 'Revisión de comité paritario SST y matriz legal.',
      },
      {
        id: 'sm-005',
        id_sitio: '50000000-0000-0000-0000-000000000004',
        numero_sitio: 1,
        nombre_sitio: 'Planta Polímeros',
        direccion_sitio: 'Complejo Petroquímico Morón, Módulo A-3',
        modalidad_evaluacion: 'Presencial',
        fecha_asignada: '2024-11-13',
        dias_asignados: 1,
        muestreado: true,
        notas: 'Verificación de bloqueo y etiquetado LOTO en reactores.',
      },
      {
        id: 'sm-006',
        id_sitio: '50000000-0000-0000-0000-000000000005',
        numero_sitio: 2,
        nombre_sitio: 'Terminal Marítimo de Carga',
        direccion_sitio: 'Muelle Petroquímico Golfo Triste, Morón',
        modalidad_evaluacion: 'Remota',
        fecha_asignada: '2024-11-14',
        dias_asignados: 1,
        muestreado: false,
        notas: 'Muestreo documental remoto de permisos de trabajo en altura.',
      },
    ],
    matrizNormativa: [
      {
        id: 'mn-007',
        id_requisito: 'f0000000-0000-0000-0000-000000000085',
        codigo_clausula: '8.1',
        titulo_clausula: 'Planificación y control operacional y eliminación de peligros SST',
        proceso_nombre: 'Prevención de Riesgos Mayores y Atmósferas Explosivas',
        estado_verificacion: 'Hallazgo',
        notas: 'NC Mayor abierta por incumplimiento en procedimiento LOTO Módulo A-3.',
      },
      {
        id: 'mn-008',
        id_requisito: 'f0000000-0000-0000-0000-000000000042',
        codigo_clausula: '8.2',
        titulo_clausula: 'Preparación y respuesta ante emergencias',
        proceso_nombre: 'Prevención de Riesgos Mayores y Atmósferas Explosivas',
        estado_verificacion: 'Conforme',
      },
    ],
    recomendacion: null,
  },
  {
    id: '80000000-0000-0000-0000-000000000004',
    codigo_auditoria: 'AUD-2024-004',
    id_certificado: '40000000-0000-0000-0000-000000000004',
    numero_certificado: 'FN-ISMS-2024-007',
    id_organizacion: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    norma_codigo: 'ISO/IEC 27001:2022',
    sector_iaf: 33,
    tipo_auditoria: 'Etapa 2',
    metodologia: 'Mixta',
    fecha_inicio: '2024-11-25',
    fecha_fin: '2024-11-27',
    fecha_reprogramacion: null,
    dias_auditor: 3,
    estatus: 'Planificado',
    auditor_lider_id: '10000000-0000-0000-0000-000000000002',
    auditor_lider: 'Ing. Roberto Silva',
    sede_principal_direccion: 'Torre David, Piso 14, Chacao, Caracas',
    equipo: [
      {
        id: 'eq-007',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        nombre: 'Ing. Roberto Silva',
        rol: 'Auditor Líder',
        competencia_norma: 'ISO/IEC 27001:2022',
        competencia_sector_iaf: 33,
        credencial_codigo: 'AUD-REG-2022-88',
        estado_credencial: 'Vigente',
        email: 'rsilva@programa-aud.com',
        telefono: '+34 600 123 456',
      },
      {
        id: 'eq-008',
        id_auditor: '10000000-0000-0000-0000-000000000004',
        nombre: 'Lic. Javier Morales',
        rol: 'Auditor de Equipo',
        competencia_norma: 'ISO 9001:2015',
        competencia_sector_iaf: 33,
        credencial_codigo: 'AUD-REG-2024-42',
        estado_credencial: 'Vigente',
        email: 'jmorales@programa-aud.com',
        telefono: '+34 912 345 679',
      },
    ],
    sitiosMuestreo: [
      {
        id: 'sm-007',
        id_sitio: '50000000-0000-0000-0000-000000000006',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal SOC (HQ)',
        direccion_sitio: 'Torre David, Piso 14, Chacao, Caracas',
        modalidad_evaluacion: 'Presencial',
        fecha_asignada: '2024-11-25',
        dias_asignados: 3,
        muestreado: true,
        notas: 'Evaluación presencial en SOC 24/7 y revisión remota de controles criptográficos.',
      },
    ],
    matrizNormativa: [
      {
        id: 'mn-009',
        id_requisito: 'f0000000-0000-0000-0000-000000000004',
        codigo_clausula: '6.1.2',
        titulo_clausula: 'Apreciación de riesgos de seguridad de la información',
        proceso_nombre: 'Gestión de Incidentes de Ciberseguridad y Cifrado',
        estado_verificacion: 'Conforme',
      },
      {
        id: 'mn-010',
        id_requisito: 'f0000000-0000-0000-0000-000000000085',
        codigo_clausula: 'A.8.24',
        titulo_clausula: 'Uso de la criptografía y gestión de claves',
        proceso_nombre: 'Gestión de Incidentes de Ciberseguridad y Cifrado',
        estado_verificacion: 'Hallazgo',
      },
    ],
    recomendacion: null,
  },
  {
    id: '80000000-0000-0000-0000-000000000005',
    codigo_auditoria: 'AUD-2024-005',
    id_certificado: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    id_organizacion: '30000000-0000-0000-0000-000000000001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    norma_codigo: 'ISO 9001:2015',
    sector_iaf: 17,
    tipo_auditoria: 'Seguimiento 2',
    metodologia: 'Mixta',
    fecha_inicio: '2024-12-04',
    fecha_fin: '2024-12-06',
    fecha_reprogramacion: null,
    dias_auditor: 2.5,
    estatus: 'Planificado',
    auditor_lider_id: '10000000-0000-0000-0000-000000000002',
    auditor_lider: 'Ing. Roberto Silva',
    sede_principal_direccion: 'Av. Industrial 100, Valencia, Edo. Carabobo',
    equipo: [
      {
        id: 'eq-009',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        nombre: 'Ing. Roberto Silva',
        rol: 'Auditor Líder',
        competencia_norma: 'ISO 9001:2015',
        competencia_sector_iaf: 17,
        credencial_codigo: 'AUD-REG-2022-88',
        estado_credencial: 'Vigente',
        email: 'rsilva@programa-aud.com',
        telefono: '+34 600 123 456',
      },
    ],
    sitiosMuestreo: [
      {
        id: 'sm-008',
        id_sitio: '50000000-0000-0000-0000-000000000000',
        numero_sitio: 0,
        nombre_sitio: 'Sede Principal HQ',
        direccion_sitio: 'Av. Industrial 100, Valencia, Edo. Carabobo',
        modalidad_evaluacion: 'Remota',
        fecha_asignada: '2024-12-04',
        dias_asignados: 1,
        muestreado: true,
      },
      {
        id: 'sm-009',
        id_sitio: '50000000-0000-0000-0000-000000000001',
        numero_sitio: 1,
        nombre_sitio: 'Planta Valencia',
        direccion_sitio: 'Zona Industrial Carabobo, Galpón 4-B, Valencia',
        modalidad_evaluacion: 'Presencial',
        fecha_asignada: '2024-12-05',
        dias_asignados: 1.5,
        muestreado: true,
      },
    ],
    matrizNormativa: [
      {
        id: 'mn-011',
        id_requisito: 'f0000000-0000-0000-0000-000000000008',
        codigo_clausula: '9.2',
        titulo_clausula: 'Auditoría interna',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado_verificacion: 'Planificada',
      },
    ],
    recomendacion: null,
  },
  {
    id: '80000000-0000-0000-0000-000000000006',
    codigo_auditoria: 'AUD-2024-006',
    id_certificado: '40000000-0000-0000-0000-000000000003',
    numero_certificado: 'FN-OHS-2023-018',
    id_organizacion: '30000000-0000-0000-0000-000000000003',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    norma_codigo: 'ISO 45001:2018',
    sector_iaf: 14,
    tipo_auditoria: 'Extraordinaria',
    metodologia: 'Presencial',
    fecha_inicio: '2024-12-16',
    fecha_fin: '2024-12-17',
    fecha_reprogramacion: null,
    dias_auditor: 2,
    estatus: 'En Ejecución',
    auditor_lider_id: '10000000-0000-0000-0000-000000000003',
    auditor_lider: 'Dra. Ana Belén Torres',
    sede_principal_direccion: 'Complejo Petroquímico Morón, Edificio Central, Edo. Carabobo',
    equipo: [
      {
        id: 'eq-010',
        id_auditor: '10000000-0000-0000-0000-000000000003',
        nombre: 'Dra. Ana Belén Torres',
        rol: 'Auditor Líder',
        competencia_norma: 'ISO 45001:2018',
        competencia_sector_iaf: 14,
        credencial_codigo: 'AUD-REG-2023-14',
        estado_credencial: 'Vigente',
        email: 'atorres@programa-aud.com',
        telefono: '+34 913 550 200',
      },
    ],
    sitiosMuestreo: [
      {
        id: 'sm-010',
        id_sitio: '50000000-0000-0000-0000-000000000004',
        numero_sitio: 1,
        nombre_sitio: 'Planta Polímeros',
        direccion_sitio: 'Complejo Petroquímico Morón, Módulo A-3',
        modalidad_evaluacion: 'Presencial',
        fecha_asignada: '2024-12-16',
        dias_asignados: 2,
        muestreado: true,
        notas: 'Verificación extraordinaria de levantamiento de suspensión.',
      },
    ],
    matrizNormativa: [
      {
        id: 'mn-012',
        id_requisito: 'f0000000-0000-0000-0000-000000000085',
        codigo_clausula: '10.2',
        titulo_clausula: 'Incidentes, no conformidades y acciones correctivas',
        proceso_nombre: 'Prevención de Riesgos Mayores y Atmósferas Explosivas',
        estado_verificacion: 'Planificada',
      },
    ],
    recomendacion: null,
  },
];

export const INITIAL_PHASE5_FINDINGS: Phase5FindingEntity[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    codigo_hallazgo: 'HAL-2024-001',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'Renovación',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    id_sitio: '50000000-0000-0000-0000-000000000001',
    sitio_nombre: 'Planta Valencia',
    tipo: 'NC_MENOR',
    descripcion: 'Descalibración y ausencia de etiqueta vigente en pie de rey CAL-09 en la línea 2 de fundición.',
    evidencia: 'Registro fotográfico de instrumento CAL-09 vencido desde agosto 2024 durante inspección in situ.',
    estado_ciclo: 'Plan de Acción Enviado',
    analisis_causa_raiz: 'El listado maestro de metrología no emitía alertas automáticas de vencimiento para equipos portátiles de turno vespertino.',
    plan_accion_correctiva: 'Recalibración certificada de CAL-09 con patrón trazable e incorporación de alerta automatizada quincenal en el software de mantenimiento.',
    comentarios_verificacion: 'Plan de acción revisado y aceptado en fecha y forma; pendiente evidencia de certificado de calibración emitido.',
    fecha_limite: '2024-12-15',
    fecha_cierre: null,
    cerrado: false,
    created_at: '2024-11-19T10:30:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    codigo_hallazgo: 'HAL-2024-002',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'Renovación',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000041',
    requisito_codigo: '4.1',
    id_proceso: '60000000-0000-0000-0000-000000000002',
    proceso_nombre: 'Dirección Estratégica y Calidad',
    id_sitio: '50000000-0000-0000-0000-000000000000',
    sitio_nombre: 'Sede Principal HQ',
    tipo: 'OBSERVACION',
    descripcion: 'La matriz FODA de contexto estratégico no desglosa el impacto regulatorio arancelario sobre aleaciones importadas.',
    evidencia: 'Revisión documental del expediente PE-01 versión 3.',
    estado_ciclo: 'Cerrado',
    analisis_causa_raiz: 'Actualización semestral pendiente de consolidar con gerencia de comercio exterior.',
    plan_accion_correctiva: 'Incorporación de variable arancelaria en revisión estratégica Q4-2024.',
    comentarios_verificacion: 'Verificada versión 4 del expediente PE-01 aprobada por Dirección.',
    fecha_limite: '2024-11-30',
    fecha_cierre: '2024-11-20',
    cerrado: true,
    created_at: '2024-11-18T14:15:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    codigo_hallazgo: 'HAL-2024-003',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'Renovación',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    id_sitio: '50000000-0000-0000-0000-000000000001',
    sitio_nombre: 'Planta Valencia',
    tipo: 'OPORTUNIDAD_MEJORA',
    descripcion: 'Se recomienda digitalizar las órdenes de trabajo manuales de prensas hidráulicas para trazabilidad en tiempo real.',
    evidencia: 'Entrevista con supervisor de planta durante el turno matutino.',
    estado_ciclo: 'Causa Raíz Analizada',
    analisis_causa_raiz: 'Registro en papel requiere consolidación manual al final de turno.',
    plan_accion_correctiva: 'Evaluación de terminales industriales en planta para Q1-2025.',
    comentarios_verificacion: 'Oportunidad registrada para seguimiento en próxima vigilancia.',
    fecha_limite: '2025-03-01',
    fecha_cierre: null,
    cerrado: false,
    created_at: '2024-11-19T16:00:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    codigo_hallazgo: 'HAL-2024-004',
    id_auditoria: '80000000-0000-0000-0000-000000000003',
    auditoria_tipo: 'Seguimiento 1',
    numero_certificado: 'FN-OHS-2023-018',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.1',
    id_proceso: '60000000-0000-0000-0000-000000000005',
    proceso_nombre: 'Prevención de Riesgos Mayores y Atmósferas Explosivas',
    id_sitio: '50000000-0000-0000-0000-000000000004',
    sitio_nombre: 'Planta Polímeros',
    tipo: 'NC_MAYOR',
    descripcion: 'Falla crítica en aplicación de protocolo de bloqueo y etiquetado (LOTO) durante intervención de válvula de alivio en Reactor R-204.',
    evidencia: 'Permiso de trabajo PT-8842 sin doble firma de aislamiento energético ni candado personal asignado en campo.',
    estado_ciclo: 'Abierto',
    analisis_causa_raiz: '',
    plan_accion_correctiva: '',
    comentarios_verificacion: 'Requiere cierre inmediato y verificación extraordinaria en sitio antes de levantar suspensión.',
    fecha_limite: '2024-12-05',
    fecha_cierre: null,
    cerrado: false,
    created_at: '2024-11-13T11:20:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    codigo_hallazgo: 'HAL-2024-005',
    id_auditoria: '80000000-0000-0000-0000-000000000004',
    auditoria_tipo: 'Etapa 2',
    numero_certificado: 'FN-ISMS-2024-007',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: 'A.8.24',
    id_proceso: '60000000-0000-0000-0000-000000000006',
    proceso_nombre: 'Gestión de Incidentes de Ciberseguridad y Cifrado',
    id_sitio: '50000000-0000-0000-0000-000000000006',
    sitio_nombre: 'Sede Principal SOC (HQ)',
    tipo: 'NC_MENOR',
    descripcion: 'Rotación anual de llaves simétricas de respaldo fuera de ventana programada en entorno de pre-producción.',
    evidencia: 'Log de KMS AWS-Vault mostrando última rotación hace 14 meses para bucket staging-backup.',
    estado_ciclo: 'Plan de Acción Enviado',
    analisis_causa_raiz: 'Política automática de rotación habilitada solo en cuentas de producción.',
    plan_accion_correctiva: 'Activación de política KMS automática cada 180 días en todos los entornos de staging y pruebas.',
    comentarios_verificacion: 'Evidencia de configuración Terraform en revisión por auditor técnico.',
    fecha_limite: '2024-12-20',
    fecha_cierre: null,
    cerrado: false,
    created_at: '2024-11-26T09:45:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000006',
    codigo_hallazgo: 'HAL-2024-006',
    id_auditoria: '80000000-0000-0000-0000-000000000004',
    auditoria_tipo: 'Etapa 2',
    numero_certificado: 'FN-ISMS-2024-007',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    id_requisito: 'f0000000-0000-0000-0000-000000000004',
    requisito_codigo: '6.1.2',
    id_proceso: '60000000-0000-0000-0000-000000000006',
    proceso_nombre: 'Gestión de Incidentes de Ciberseguridad y Cifrado',
    id_sitio: '50000000-0000-0000-0000-000000000006',
    sitio_nombre: 'Sede Principal SOC (HQ)',
    tipo: 'OBSERVACION',
    descripcion: 'Documentar tiempos objetivos de recuperación (RTO) diferenciados para microservicios de analítica secundaria.',
    evidencia: 'Plan de continuidad BCP-2024 rev. 2.',
    estado_ciclo: 'Verificado',
    analisis_causa_raiz: 'Clasificación global agrupada bajo Tier-2 sin desglose específico.',
    plan_accion_correctiva: 'Anexo técnico con RTO por microservicio aprobado por CISO.',
    comentarios_verificacion: 'Verificado documento actualizado BCP-2024 rev. 3.',
    fecha_limite: '2024-12-10',
    fecha_cierre: null,
    cerrado: false,
    created_at: '2024-11-26T15:10:00Z',
  },
];
