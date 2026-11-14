import { escapeHtml } from './html';
import type { UserProfile } from './healthCheck';
import {
  formatAuditTimestampLocal,
  resolveAuditActorDisplay,
  type ActorDirectoryEntry,
} from './auditLog';
import type { OrganizacionEntity } from './activeCertificates';
import type { CertificadoDetailEntity } from './multisiteSampling';
import type { AuditorDetailEntity } from './competencyMatrix';
import type { Phase5FindingEntity, ProgramacionAuditEntity } from './auditExecution';
import type {
  AcreditacionNormaIaf,
  EstatusCatalogItem,
  MetodologiaAuditoriaCatalogItem,
  NormaEntity,
  RequisitoLtree,
  SectorIafEntity,
  SubsectorIafEntity,
  TipoAuditoriaCatalogItem,
} from './extraDomain';
import type { AcreditacionDetailEntity } from './acreditacionDomain';

export const PROTECTED_SOFT_DELETE_TABLES = [
  'norma',
  'requisito',
  'sector_iaf',
  'subsector_iaf',
  'organismo_acreditacion',
  'acreditacion_norma_iaf',
  'estatus',
  'tipo_auditoria',
  'metodologia_auditoria',
  'auditor',
  'organizacion',
  'certificado',
  'sitio',
  'proceso',
  'turno',
  'auditoria',
  'hallazgo',
  'requisitos_no_aplicables_certificado',
  'turnos_por_sitio',
  'comentarios_por_auditoria',
  'sitios_por_auditoria',
  'turnos_sitio_auditoria',
  'procesos_sitio_auditoria',
] as const;

export type ProtectedSoftDeleteTable = (typeof PROTECTED_SOFT_DELETE_TABLES)[number];

export const PURE_JUNCTION_DELETE_TABLES = [
  'norma_auditor',
  'sector_iaf_auditor',
  'subsector_iaf_auditor',
  'requisitos_por_proceso',
  'equipo_auditor',
] as const;

export type PureJunctionDeleteTable = (typeof PURE_JUNCTION_DELETE_TABLES)[number];

export type ArchivableTable =
  | 'organizacion'
  | 'certificado'
  | 'auditor'
  | 'auditoria'
  | 'norma'
  | 'sector_iaf'
  | 'acreditacion_norma_iaf'
  | 'sitio'
  | 'proceso'
  | 'turno'
  | 'estatus'
  | 'tipo_auditoria'
  | 'metodologia_auditoria';

export interface ArchiveDependencyItem {
  table: string;
  label: string;
  count: number;
}

export interface ArchiveDependencySummary {
  can_archive: boolean;
  total_active_dependencies: number;
  dependencies: ArchiveDependencyItem[];
}

export interface ArchiveModalState {
  isOpen: boolean;
  tableName: ArchivableTable;
  recordId: string;
  entityTypeLabel: string;
  recordTitle: string;
  recordSubtitle: string | null;
  loadingSummary: boolean;
  summary: ArchiveDependencySummary | null;
  reason: string;
  submitting: boolean;
  errorMessage: string | null;
}

export interface ArchiveToastState {
  message: string;
  tone: 'success' | 'info' | 'warning';
}

export interface ArchivedItemEntry {
  tableName: ArchivableTable;
  id: string;
  title: string;
  subtitle?: string | null;
  code?: string | null;
  deletedAt: string;
  deletedBy?: string | null;
  deletedByName?: string | null;
  deleteReason?: string | null;
  snapshot?: unknown;
}

export interface ArchiveMultiViewConfig {
  canInspectArchived: boolean;
  showArchived: boolean;
  archivedItems: ArchivedItemEntry[];
  actorDirectory?: Record<string, ActorDirectoryEntry>;
  restoringId?: string | null;
}

export function extractUniversalArchiveProps(
  config: ArchiveMultiViewConfig | undefined,
  domainKey: string
): {
  canInspectArchived: boolean;
  showArchived: boolean;
  archivedItems: ArchivedItemEntry[];
  actorDirectory?: Record<string, ActorDirectoryEntry>;
  restoringId: string | null;
} {
  if (!config || !config.canInspectArchived) {
    return {
      canInspectArchived: false,
      showArchived: false,
      archivedItems: [],
      actorDirectory: undefined,
      restoringId: null,
    };
  }
  const allowedTables = new Set(getDomainArchivedTables(domainKey));
  return {
    canInspectArchived: true,
    showArchived: Boolean(config.showArchived),
    archivedItems: config.archivedItems.filter((item) =>
      allowedTables.has(item.tableName)
    ),
    actorDirectory: config.actorDirectory,
    restoringId: config.restoringId ?? null,
  };
}

export type SoftDeletePayload = {
  deleted_at: string;
  delete_reason: string | null;
};

export type RestoreRecordPayload = {
  deleted_at: null;
  delete_reason: null;
};

const UUID_INLINE_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export const ARCHIVE_REASON_MAX_LENGTH = 300;

export function createInitialArchiveModalState(): ArchiveModalState {
  return {
    isOpen: false,
    tableName: 'organizacion',
    recordId: '',
    entityTypeLabel: 'Registro',
    recordTitle: '',
    recordSubtitle: null,
    loadingSummary: false,
    summary: null,
    reason: '',
    submitting: false,
    errorMessage: null,
  };
}

/**
 * Only APPROVED ADMIN or WORKER staff may initiate record archival (soft-delete).
 */
export function canArchiveRecord(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  return profile.role === 'ADMIN' || profile.role === 'WORKER';
}

/**
 * Strictly APPROVED ADMIN users may toggle "Mostrar Archivados" or restore archived records.
 */
export function canInspectArchivedRecords(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile || profile.status !== 'APPROVED') return false;
  return profile.role === 'ADMIN';
}

export function canShowArchivedRecords(
  profile: UserProfile | null | undefined
): boolean {
  return canInspectArchivedRecords(profile);
}

/**
 * Sanitizes an optional archival reason: trims, removes raw UUIDs, clamps to 300 chars.
 */
export function sanitizeArchiveReason(
  reason: string | null | undefined,
  maxLength = ARCHIVE_REASON_MAX_LENGTH
): string | null {
  if (!reason) return null;
  const cleaned = reason
    .replace(UUID_INLINE_PATTERN, 'Referencia registrada')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export function buildSoftDeletePayload(
  reason: string | null | undefined,
  nowIso?: string
): SoftDeletePayload {
  return {
    deleted_at: nowIso || new Date().toISOString(),
    delete_reason: sanitizeArchiveReason(reason),
  };
}

export function buildRestorePayload(): RestoreRecordPayload {
  return {
    deleted_at: null,
    delete_reason: null,
  };
}

/**
 * Parses and normalizes output from PostgreSQL RPC `get_archive_dependency_summary`.
 */
export function parseArchiveDependencySummary(
  raw: unknown
): ArchiveDependencySummary {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      obj = null;
    }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }

  if (!obj) {
    return {
      can_archive: true,
      total_active_dependencies: 0,
      dependencies: [],
    };
  }

  const rawDeps = Array.isArray(obj.dependencies) ? obj.dependencies : [];
  const dependencies: ArchiveDependencyItem[] = rawDeps
    .map((entry): ArchiveDependencyItem | null => {
      if (!entry || typeof entry !== 'object') return null;
      const rec = entry as Record<string, unknown>;
      const count = Math.max(0, Math.floor(Number(rec.count) || 0));
      if (count <= 0) return null;
      const table = String(rec.table || 'registro');
      const rawLabel = String(rec.label || table).replace(
        UUID_INLINE_PATTERN,
        'Referencia registrada'
      );
      return {
        table,
        label: rawLabel,
        count,
      };
    })
    .filter((d): d is ArchiveDependencyItem => d !== null)
    .sort((a, b) => b.count - a.count);

  const summedCount = dependencies.reduce((acc, item) => acc + item.count, 0);
  const declaredTotal = Math.max(
    0,
    Math.floor(Number(obj.total_active_dependencies) || 0)
  );
  const total_active_dependencies = Math.max(summedCount, declaredTotal);
  const can_archive =
    typeof obj.can_archive === 'boolean'
      ? obj.can_archive && total_active_dependencies === 0
      : total_active_dependencies === 0;

  return {
    can_archive,
    total_active_dependencies,
    dependencies,
  };
}

/**
 * Formats dependency items into clean operator-friendly warning lines without raw UUIDs.
 */
export function formatArchiveDependencyLines(
  summary: ArchiveDependencySummary
): string[] {
  return summary.dependencies.map((dep) => {
    const cleanLabel = dep.label
      .replace(UUID_INLINE_PATTERN, 'Referencia registrada')
      .trim();
    return `${dep.count} ${cleanLabel}`;
  });
}

export interface LocalArchiveDependencyContext {
  organizaciones?: ReadonlyArray<OrganizacionEntity>;
  certificates?: ReadonlyArray<CertificadoDetailEntity>;
  auditors?: ReadonlyArray<AuditorDetailEntity>;
  audits?: ReadonlyArray<ProgramacionAuditEntity>;
  findings?: ReadonlyArray<Phase5FindingEntity>;
  normas?: ReadonlyArray<NormaEntity>;
  requisitos?: ReadonlyArray<RequisitoLtree>;
  subsectores?: ReadonlyArray<SubsectorIafEntity>;
  acreditaciones?: ReadonlyArray<
    Pick<
      AcreditacionDetailEntity,
      | 'id'
      | 'id_norma'
      | 'norma_codigo'
      | 'id_sector_iaf'
      | 'sector_numero'
      | 'deleted_at'
    > | Pick<AcreditacionNormaIaf, 'id' | 'id_norma' | 'norma_codigo' | 'id_sector_iaf' | 'sector_iaf_numero'>
  >;
  estatusList?: ReadonlyArray<EstatusCatalogItem>;
  tiposList?: ReadonlyArray<TipoAuditoriaCatalogItem>;
  metodologiasList?: ReadonlyArray<MetodologiaAuditoriaCatalogItem>;
  archivedSiteIds?: ReadonlySet<string>;
  archivedProcesoIds?: ReadonlySet<string>;
  archivedTurnoIds?: ReadonlySet<string>;
}

/**
 * Pure client-side dependency calculation mirroring `get_archive_dependency_summary`
 * so seeded/offline mode and live Supabase RPC produce consistent dependency blocks.
 */
export function computeLocalArchiveDependencySummary(
  tableName: ArchivableTable,
  recordId: string,
  context: LocalArchiveDependencyContext
): ArchiveDependencySummary {
  const dependencies: ArchiveDependencyItem[] = [];
  const certs = context.certificates || [];
  const audits = context.audits || [];
  const findings = context.findings || [];
  const requisitos = context.requisitos || [];
  const subsectores = context.subsectores || [];
  const acreditaciones = context.acreditaciones || [];
  const archivedSiteIds = context.archivedSiteIds || new Set<string>();
  const archivedProcesoIds = context.archivedProcesoIds || new Set<string>();

  const pushDep = (table: string, label: string, count: number): void => {
    if (count > 0) {
      dependencies.push({ table, label, count });
    }
  };

  switch (tableName) {
    case 'organizacion': {
      const orgCerts = certs.filter((c) => c.id_organizacion === recordId);
      pushDep('certificado', 'Certificados activos', orgCerts.length);
      break;
    }

    case 'certificado': {
      const cert = certs.find((c) => c.id === recordId);
      if (cert) {
        const activeSites = (cert.sitios || []).filter((s) => !archivedSiteIds.has(s.id));
        const activeProcs = (cert.procesos || []).filter(
          (p) => !archivedProcesoIds.has(p.id)
        );
        const linkedAudits = audits.filter((a) => a.id_certificado === recordId);
        pushDep('sitio', 'Sitios operativos', activeSites.length);
        pushDep('proceso', 'Procesos operativos', activeProcs.length);
        pushDep('auditoria', 'Auditorías vinculadas', linkedAudits.length);
        pushDep(
          'requisitos_no_aplicables_certificado',
          'Exclusiones normativas',
          (cert.noAplicables || []).length
        );
      }
      break;
    }

    case 'sitio': {
      let targetCert: CertificadoDetailEntity | undefined;
      let targetSite:
        | CertificadoDetailEntity['sitios'][number]
        | undefined;
      for (const c of certs) {
        const match = (c.sitios || []).find(
          (s) => s.id === recordId && !archivedSiteIds.has(s.id)
        );
        if (match) {
          targetCert = c;
          targetSite = match;
          break;
        }
      }
      if (targetCert && targetSite) {
        if (targetSite.numero_sitio === 0) {
          const secondaryCount = (targetCert.sitios || []).filter(
            (s) =>
              s.id !== recordId &&
              s.numero_sitio > 0 &&
              !archivedSiteIds.has(s.id)
          ).length;
          pushDep(
            'sitio',
            'Sedes secundarias dependientes de Sitio 0',
            secondaryCount
          );
        }
        const siteAuditsCount = audits.filter((a) =>
          (a.sitiosMuestreo || []).some((ms) => ms.id_sitio === recordId)
        ).length;
        pushDep(
          'sitios_por_auditoria',
          'Auditorías asignadas al sitio',
          siteAuditsCount
        );
        const cleanSiteName = targetSite.nombre_sitio.trim().toLowerCase();
        const linkedTurnosByCert = (targetCert.turnos || []).filter((t) =>
          (t.sitios_vinculados || []).some(
            (name) => name.trim().toLowerCase() === cleanSiteName
          )
        ).length;
        const siteTurnosCount = Math.max(
          (targetSite.turnos_vinculados || []).length,
          linkedTurnosByCert
        );
        pushDep('turnos_por_sitio', 'Turnos asignados al sitio', siteTurnosCount);
      }
      break;
    }

    case 'proceso': {
      let procName = '';
      let procCertId = '';
      for (const c of certs) {
        const match = (c.procesos || []).find((p) => p.id === recordId);
        if (match) {
          procName = match.nombre_proceso.trim().toLowerCase();
          procCertId = c.id;
          break;
        }
      }
      const procFindings = findings.filter(
        (f) =>
          f.id_proceso === recordId ||
          (procName && f.proceso_nombre.trim().toLowerCase() === procName)
      ).length;
      pushDep('hallazgo', 'Hallazgos vinculados al proceso', procFindings);
      let procAuditAssignments = 0;
      if (procName) {
        for (const a of audits) {
          if (procCertId && a.id_certificado !== procCertId) continue;
          if (
            (a.matrizNormativa || []).some(
              (item) => item.proceso_nombre.trim().toLowerCase() === procName
            )
          ) {
            procAuditAssignments += 1;
          }
        }
      }
      pushDep(
        'procesos_sitio_auditoria',
        'Auditorías programadas para el proceso',
        procAuditAssignments
      );
      break;
    }

    case 'turno': {
      const seenSiteKeys = new Set<string>();
      for (const c of certs) {
        const shift = (c.turnos || []).find((t) => t.id === recordId);
        if (!shift) continue;
        const cleanShiftDesc = shift.descripcion.trim().toLowerCase();
        for (const site of c.sitios || []) {
          if (archivedSiteIds.has(site.id)) continue;
          const matchesSiteName = (shift.sitios_vinculados || []).some(
            (name) => name.trim().toLowerCase() === site.nombre_sitio.trim().toLowerCase()
          );
          const matchesSiteLabel = (site.turnos_vinculados || []).some(
            (lbl) => lbl.trim().toLowerCase() === cleanShiftDesc || lbl === shift.id
          );
          if (matchesSiteName || matchesSiteLabel) {
            seenSiteKeys.add(site.id);
          }
        }
      }
      pushDep('turnos_por_sitio', 'Sedes con este turno asignado', seenSiteKeys.size);
      break;
    }

    case 'auditoria': {
      const audit = audits.find((a) => a.id === recordId);
      const auditFindings = findings.filter((f) => f.id_auditoria === recordId).length;
      pushDep('hallazgo', 'Hallazgos de la auditoría', auditFindings);
      if (audit) {
        pushDep(
          'sitios_por_auditoria',
          'Sitios en el alcance de la auditoría',
          audit.sitiosMuestreo.length
        );
      }
      break;
    }

    case 'norma': {
      const norma = (context.normas || []).find((n) => n.id === recordId);
      const normaCode = norma?.codigo?.toLowerCase() || '';
      const certCount = certs.filter(
        (c) =>
          c.id_norma === recordId ||
          (normaCode && c.norma_codigo.toLowerCase() === normaCode)
      ).length;
      const reqCount = requisitos.filter(
        (r) =>
          r.id_norma === recordId ||
          (normaCode && r.norma_codigo.toLowerCase() === normaCode)
      ).length;
      const accredCount = acreditaciones.filter((a) => {
        if ('deleted_at' in a && a.deleted_at) return false;
        return (
          a.id_norma === recordId ||
          (normaCode && a.norma_codigo.toLowerCase() === normaCode)
        );
      }).length;
      pushDep('certificado', 'Certificados emitidos bajo la norma', certCount);
      pushDep('requisito', 'Cláusulas de la norma', reqCount);
      pushDep('acreditacion_norma_iaf', 'Acreditaciones vinculadas', accredCount);
      break;
    }

    case 'sector_iaf': {
      const secNum = Number(recordId);
      const subCount = subsectores.filter(
        (s) =>
          s.id_sector_iaf === recordId ||
          (!Number.isNaN(secNum) && s.sector_numero === secNum)
      ).length;
      const certCount = certs.filter(
        (c) =>
          c.id_sector_iaf === recordId ||
          (!Number.isNaN(secNum) && c.sector_iaf === secNum)
      ).length;
      const accredCount = acreditaciones.filter((a) => {
        if ('deleted_at' in a && a.deleted_at) return false;
        const aSecNum =
          'sector_numero' in a
            ? a.sector_numero
            : 'sector_iaf_numero' in a
            ? a.sector_iaf_numero
            : null;
        return (
          a.id_sector_iaf === recordId ||
          (!Number.isNaN(secNum) && aSecNum === secNum)
        );
      }).length;
      pushDep('subsector_iaf', 'Sub-sectores IAF', subCount);
      pushDep('certificado', 'Certificados en este sector', certCount);
      pushDep('acreditacion_norma_iaf', 'Acreditaciones en este sector', accredCount);
      break;
    }

    case 'estatus': {
      const estItem = (context.estatusList || []).find((e) => e.id === recordId);
      if (estItem) {
        const estName = estItem.estatus.toLowerCase();
        const certCount = certs.filter(
          (c) => c.estatus.toLowerCase() === estName
        ).length;
        pushDep('certificado', 'Certificados con este estatus', certCount);
      }
      break;
    }

    case 'tipo_auditoria': {
      const tipoItem = (context.tiposList || []).find((t) => t.id === recordId);
      if (tipoItem) {
        const tipoName = tipoItem.tipo.toLowerCase();
        const auditCount = audits.filter(
          (a) => a.tipo_auditoria.toLowerCase() === tipoName
        ).length;
        pushDep('auditoria', 'Auditorías con este tipo', auditCount);
      }
      break;
    }

    case 'metodologia_auditoria': {
      const metItem = (context.metodologiasList || []).find(
        (m) => m.id === recordId
      );
      if (metItem) {
        const metName = metItem.metodologia.toLowerCase();
        const auditCount = audits.filter(
          (a) => a.metodologia.toLowerCase() === metName
        ).length;
        pushDep('auditoria', 'Auditorías con esta metodología', auditCount);
      }
      break;
    }

    case 'auditor': {
      const activeTeams = audits.filter(
        (a) =>
          a.auditor_lider_id === recordId ||
          a.equipo.some((m) => m.id_auditor === recordId)
      ).length;
      pushDep('equipo_auditor', 'Auditorías donde participa en equipo', activeTeams);
      break;
    }

    case 'acreditacion_norma_iaf':
      // Acreditaciones are leaf scope grants and can be archived safely
      break;
  }

  const total_active_dependencies = dependencies.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return {
    can_archive: total_active_dependencies === 0,
    total_active_dependencies,
    dependencies,
  };
}

/**
 * Merges live RPC summary with local in-memory dependency summary to handle
 * both live DB rows and seeded/optimistic client records cleanly.
 */
export function mergeArchiveDependencySummaries(
  rpcSummary: ArchiveDependencySummary,
  localSummary: ArchiveDependencySummary
): ArchiveDependencySummary {
  const byTable = new Map<string, ArchiveDependencyItem>();
  for (const dep of rpcSummary.dependencies) {
    byTable.set(dep.table, { ...dep });
  }
  for (const dep of localSummary.dependencies) {
    const existing = byTable.get(dep.table);
    if (!existing || dep.count > existing.count) {
      byTable.set(dep.table, { ...dep });
    }
  }
  const mergedDeps = Array.from(byTable.values()).sort(
    (a, b) => b.count - a.count
  );
  const total = mergedDeps.reduce((sum, item) => sum + item.count, 0);
  return {
    can_archive: total === 0 && rpcSummary.can_archive && localSummary.can_archive,
    total_active_dependencies: total,
    dependencies: mergedDeps,
  };
}

/**
 * Formats archived actor display safely without ever exposing raw UUIDs.
 */
export function formatArchivedActorDisplay(
  entry: Pick<ArchivedItemEntry, 'deletedBy' | 'deletedByName'>,
  actorDirectory?: Record<string, ActorDirectoryEntry>
): string {
  const resolved = resolveAuditActorDisplay(
    {
      actor_name: entry.deletedByName || null,
      actor_email: null,
      performed_by: entry.deletedBy || null,
      changed_by: null,
      actor_user_id: null,
    },
    actorDirectory
  );
  return resolved.displayName;
}

export function formatArchivedDateDisplay(isoTimestamp: string): string {
  if (!isoTimestamp) return 'Reciente';
  return formatAuditTimestampLocal(isoTimestamp, 'es-ES');
}

export function getArchiveTableDisplayLabel(tableName: ArchivableTable): string {
  switch (tableName) {
    case 'organizacion':
      return 'Organización';
    case 'certificado':
      return 'Certificado';
    case 'auditor':
      return 'Auditor';
    case 'auditoria':
      return 'Auditoría Programada';
    case 'norma':
      return 'Norma ISO';
    case 'sector_iaf':
      return 'Sector IAF';
    case 'acreditacion_norma_iaf':
      return 'Acreditación';
    case 'sitio':
      return 'Sitio Operativo';
    case 'proceso':
      return 'Proceso';
    case 'turno':
      return 'Turno Operativo';
    case 'estatus':
      return 'Estatus Canónico';
    case 'tipo_auditoria':
      return 'Tipo de Auditoría';
    case 'metodologia_auditoria':
      return 'Metodología de Auditoría';
  }
}

export function getDomainArchivedTables(domainKey: string): ArchivableTable[] {
  switch (domainKey) {
    case 'organizaciones':
      return ['organizacion'];
    case 'certificados':
      return ['certificado', 'sitio', 'proceso', 'turno'];
    case 'auditores':
      return ['auditor'];
    case 'programacion':
      return ['auditoria'];
    case 'normas':
      return ['norma'];
    case 'iaf':
      return ['sector_iaf'];
    case 'acreditaciones':
      return ['acreditacion_norma_iaf'];
    case 'estatus':
      return ['estatus'];
    case 'tipos':
      return ['tipo_auditoria'];
    case 'metodologias':
      return ['metodologia_auditoria'];
    default:
      return [];
  }
}

export interface RenderArchivarButtonOptions {
  tableName: ArchivableTable;
  recordId: string;
  entityLabel: string;
  recordTitle: string;
  recordSubtitle?: string | null;
  extraClass?: string;
}

/**
 * Renders the standardized 🗄️ Archivar trigger button for Detail View Record Zones.
 */
export function renderArchivarButtonHtml(
  options: RenderArchivarButtonOptions
): string {
  const cleanTitle = options.recordTitle.replace(
    UUID_INLINE_PATTERN,
    'Registro'
  );
  const cleanSubtitle = (options.recordSubtitle || '').replace(
    UUID_INLINE_PATTERN,
    'Referencia'
  );

  return `
    <button
      type="button"
      data-action="open-archive-modal"
      data-archive-table="${escapeHtml(options.tableName)}"
      data-archive-id="${escapeHtml(options.recordId)}"
      data-archive-entity-label="${escapeHtml(options.entityLabel)}"
      data-archive-title="${escapeHtml(cleanTitle)}"
      ${cleanSubtitle ? `data-archive-subtitle="${escapeHtml(cleanSubtitle)}"` : ''}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${options.extraClass || ''}"
    >
      <span aria-hidden="true">🗄️</span>
      <span>Archivar</span>
    </button>
  `;
}
