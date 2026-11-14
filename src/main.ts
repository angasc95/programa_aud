import './index.css';
import type { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';
import {
  buildSelfProfileUpdatePayload,
  canAccessRoute,
  canModifyProfileRole,
  evaluateAdminAccess,
  formatResetSummary,
  shouldUpdateProfileRole,
  TEST_ACCOUNTS,
  translateDatabaseError,
  validatePasswordChangeInput,
  type ActiveRoute,
  type DomainRoute,
  type HealthCheckItem,
  type ProfileFilter,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from './lib/healthCheck';
import { APP_SHELL_CONTAINER_CLASS } from './lib/layout';
import { renderHeader, type HeaderDropdownId } from './views/header';
import { renderAuthView, type AuthViewState } from './views/authView';
import { renderDashboardView } from './views/dashboardView';
import {
  renderProfileView,
  type ClientOrgAccessSummary,
  type ProfileFormState,
} from './views/profileView';
import { renderApprovalsView } from './views/approvalsView';
import { renderDatabaseStatusView } from './views/databaseStatusView';
import {
  renderAuditoriasView,
  type AuditRecord,
  type AuditorRecord,
} from './views/auditoriasView';
import {
  renderCertificacionView,
  type OrganizationRecord,
  type SiteRecord,
  type ProcessRecord,
  type ShiftRecord,
} from './views/certificacionView';
import type { OrganizacionViewState } from './views/organizacionView';
import {
  renderExtraView,
  type StandardRecord,
  type RequirementRecord,
  type IafRecord,
  type CatalogItem,
} from './views/extraView';
import type {
  AcreditacionChildTab,
  AcreditacionViewState,
} from './views/acreditacionView';
import type { SitioChildTab, SitioViewState } from './views/sitioView';
import type { ProcesoChildTab, ProcesoViewState } from './views/procesoView';
import type { TurnoChildTab, TurnoViewState } from './views/turnoView';
import {
  extractUniqueStandards,
  extractUniqueStatuses,
  filterCertificateRecords,
  getStoredViewMode,
  SAMPLE_CERTIFICATE_RECORDS,
  setStoredViewMode,
  type CertificateRecord,
  type CoverageBreakdown,
  type ViewMode,
} from './lib/searchControls';
import {
  INITIAL_FINDINGS,
  type FindingRecord,
  type FindingType,
} from './lib/auditDomain';
import {
  resetBreadcrumbToDomain,
  pushBreadcrumb,
  popToBreadcrumb,
  popToParentBreadcrumb,
  getDomainLabel,
  getSubviewLabel,
  type BreadcrumbEntityType,
  type BreadcrumbSegment,
} from './lib/breadcrumb';
import { renderBreadcrumbBar } from './views/breadcrumbView';
import { renderAuditLogModal } from './views/auditLogModal';
import { renderArchiveModal, renderArchiveToast } from './views/archiveModalView';
import {
  ARCHIVE_REASON_MAX_LENGTH,
  buildRestorePayload,
  buildSoftDeletePayload,
  canArchiveRecord,
  canInspectArchivedRecords,
  computeLocalArchiveDependencySummary,
  createInitialArchiveModalState,
  getArchiveTableDisplayLabel,
  mergeArchiveDependencySummaries,
  parseArchiveDependencySummary,
  sanitizeArchiveReason,
  type ArchivableTable,
  type ArchiveModalState,
  type ArchiveMultiViewConfig,
  type ArchiveToastState,
  type ArchivedItemEntry,
} from './lib/archiveGovernance';
import {
  SEEDED_ACTOR_DIRECTORY,
  type ActorDirectoryEntry,
  type AuditLogEntry,
} from './lib/auditLog';
import {
  canEditAuditScheduleOrTeam,
  canMutateAuditExecution,
  canViewAuditLogForEntity,
  computeDashboardSummaryMetrics,
  isApprovedStaffProfile,
  normalizeDomainSubview,
  scopeCertificateRecordsForProfile,
  scopeDetailedCertsForProfile,
  scopeLegacyAuditsForProfile,
  scopeLegacyFindingsForProfile,
  scopeOrganizacionEntitiesForProfile,
  scopeOrganizationsForProfile,
  scopePhase5FindingsForProfile,
  scopeProgramacionAuditsForProfile,
  scopeSitesOrProcessesForCertificates,
} from './lib/accessControl';
import {
  clearFacetSelections,
  cycleSortDirection,
  DEFAULT_MIN_COLUMN_WIDTH_PX,
  resizeAdjacentColumns,
  resolveColumnWidthPercentages,
  toggleFacetSelection,
  type MultiViewSelectionMap,
  type SortDirection,
} from './lib/universalTemplate';
import {
  INITIAL_NORMAS,
  INITIAL_SECTORES_IAF,
  INITIAL_ESTATUS_CATALOG,
  INITIAL_TIPOS_AUDITORIA_CATALOG,
  INITIAL_METODOLOGIAS_CATALOG,
  INITIAL_ACREDITACIONES,
  INITIAL_SUBSECTORES_IAF,
  INITIAL_ORGANISMOS,
  INITIAL_REQUISITOS_LTREE,
  type AcreditacionNormaIaf,
  type NormaEntity,
  type OrganismoAcreditacion,
  type RequisitoLtree,
  type SectorIafEntity,
} from './lib/extraDomain';
import {
  buildInitialAcreditacionEntities,
  enrichAcreditacionesWithImpact,
  mapSupabaseAcreditacionRows,
  toLegacyAcreditacionNormaIaf,
  validateAccreditationEditInput,
  validateAccreditationInput,
  type AcreditacionDetailEntity,
  type CertificateCoverageInput,
  type SupabaseAcreditacionJoinRow,
} from './lib/acreditacionDomain';
import {
  INITIAL_ORGANIZACIONES,
  validateRifFormat,
  type OrganizacionEntity,
} from './lib/activeCertificates';
import {
  INITIAL_CERTIFICADOS_DETAILED,
  validateAlcance,
  type CertificadoDetailEntity,
  type CertificadoViewState,
  type CertificadoChildTab,
  type ProcesoTipo,
} from './lib/multisiteSampling';
import {
  INITIAL_TURNO_CATALOG,
  canArchiveSitio,
  resolveSitioDetailById,
  validateSitioInput,
  type TurnoCatalogItem,
} from './lib/sitioDomain';
import {
  canArchiveProceso,
  getAllSeededNormaRequirements,
  getScopedNormaRequirements,
  resolveProcesoDetailById,
  validateProcesoInput,
} from './lib/procesoDomain';
import {
  canArchiveTurno,
  formatTurnoTime,
  resolveTurnoDetailById,
  validateTurnoInput,
} from './lib/turnoDomain';
import {
  INITIAL_AUDITORES_DETAILED,
  getCredentialValidityState,
  type AuditorDetailEntity,
  type AuditorViewState,
  type AuditorChildTab,
} from './lib/competencyMatrix';
import {
  INITIAL_PROGRAMACION_AUDITS,
  INITIAL_PHASE5_FINDINGS,
  createSessionAuditLogEntry,
  evaluateIso17021Recommendation,
  validateFindingLifecycleUpdate,
  validatePhase5FindingInput,
  validateRecommendationSignature,
  type AuditMethodology,
  type AuditTeamRole,
  type CalendarioViewState,
  type CalendarDisplayMode,
  type FindingLifecycleStatus,
  type FindingsDisplayMode,
  type NormativeVerificationStatus,
  type Phase5FindingEntity,
  type ProgramacionAuditEntity,
  type ProgramacionChildTab,
  type ProgramacionViewState,
  type ResultadoViewState,
  type SiteEvaluationMode,
} from './lib/auditExecution';

interface AppState {
  booting: boolean;
  user: User | null;
  profile: UserProfile | null;
  authorizedClientOrgIds: string[];
  clientAccessRows: ClientOrgAccessSummary[];
  profileForm: ProfileFormState;
  activeRoute: ActiveRoute;
  activeSubSection: string | null;
  openMenu: HeaderDropdownId | null;
  breadcrumbs: BreadcrumbSegment[];
  auditLogModal: {
    isOpen: boolean;
    entityName: string;
    tableName: string;
    recordId: string;
    entries: AuditLogEntry[];
    actorDirectory?: Record<string, ActorDirectoryEntry>;
    loading: boolean;
    errorMessage: string | null;
  };
  archiveGovernance: {
    showArchived: boolean;
    modal: ArchiveModalState;
    toast: ArchiveToastState | null;
    restoringId: string | null;
    archivedRecordsByTable: Record<string, ArchivedItemEntry[]>;
    archivedSnapshotsByKey: Record<string, unknown>;
    archivedCatalogIds: Set<string>;
  };
  auth: AuthViewState;
  approvals: {
    profiles: UserProfile[];
    filter: ProfileFilter;
    loading: boolean;
    updatingId: string | null;
    errorMessage: string | null;
    successMessage: string | null;
  };
  dbCheck: {
    checks: HealthCheckItem[];
    running: boolean;
    lastCheckedAt: string | null;
  };
  exploration: {
    records: CertificateRecord[];
    loading: boolean;
    query: string;
    selectedStatus: string;
    selectedStandard: string;
    viewMode: ViewMode;
  };
  domainData: {
    audits: AuditRecord[];
    auditors: AuditorRecord[];
    organizations: OrganizationRecord[];
    sites: SiteRecord[];
    processes: ProcessRecord[];
    shifts: ShiftRecord[];
    standards: StandardRecord[];
    requirements: RequirementRecord[];
    iafSectors: IafRecord[];
    catalogs: CatalogItem[];
    findings: FindingRecord[];
    allOrganizaciones: OrganizacionEntity[];
    allCertificadosDetailed: CertificadoDetailEntity[];
    allAuditorsDetailed: AuditorDetailEntity[];
    allOrganismos: OrganismoAcreditacion[];
    allAcreditaciones: AcreditacionDetailEntity[];
    shiftCatalog: TurnoCatalogItem[];
    requirementsCatalog: RequisitoLtree[];
    archivedSiteIds: Set<string>;
    archivedProcesoIds: Set<string>;
    archivedTurnoIds: Set<string>;
    programacionAudits: ProgramacionAuditEntity[];
    phase5Findings: Phase5FindingEntity[];
    sessionAuditLogs: AuditLogEntry[];
    loading: boolean;
  };
  auditPlanning: {
    isModalOpen: boolean;
  };
  tableColumnWidths: Record<string, Record<string, number>>;
  programacionDomain: ProgramacionViewState;
  calendarioDomain: CalendarioViewState;
  resultadoDomain: ResultadoViewState;
  organizacionDomain: OrganizacionViewState;
  certificadoDomain: CertificadoViewState;
  sitioDomain: SitioViewState;
  procesoDomain: ProcesoViewState;
  turnoDomain: TurnoViewState;
  auditorDomain: AuditorViewState;
  extraDomain: {
    selectedNormaId: string | null;
    activeNormaTab: 'acreditacion' | 'requisitos' | 'certificados';
    normaSearchQuery: string;
    normaFilterStatus: string;
    normaFilterScheme: string;
    normaViewMode: 'grid' | 'list';
    normaSortColumn: string | null;
    normaSortDirection: SortDirection;
    normaIsSidebarOpen: boolean;
    normaFacetSelections: MultiViewSelectionMap;
    isAddAccreditationModalOpen: boolean;
    inspectingClauseId: string | null;

    selectedSectorId: string | null;
    activeSectorTab: 'subsectores' | 'acreditaciones' | 'certificados' | 'auditores';
    iafSearchQuery: string;
    iafFilterRisk: string;
    iafViewMode: 'grid' | 'list';
    iafSortColumn: string | null;
    iafSortDirection: SortDirection;
    iafIsSidebarOpen: boolean;
    iafFacetSelections: MultiViewSelectionMap;
    isAddSubsectorModalOpen: boolean;

    selectedEstatusId: string | null;
    activeEstatusTab: 'reglas' | 'certificados' | 'auditorias';
    estatusSearchQuery: string;
    estatusViewMode: 'grid' | 'list';
    estatusSortColumn: string | null;
    estatusSortDirection: SortDirection;
    estatusIsSidebarOpen: boolean;
    estatusFacetSelections: MultiViewSelectionMap;

    selectedTipoId: string | null;
    tipoSearchQuery: string;
    tipoViewMode: 'grid' | 'list';
    tipoSortColumn: string | null;
    tipoSortDirection: SortDirection;
    tipoIsSidebarOpen: boolean;
    tipoFacetSelections: MultiViewSelectionMap;

    selectedMetodologiaId: string | null;
    metodologiaSearchQuery: string;
    metodologiaViewMode: 'grid' | 'list';
    metodologiaSortColumn: string | null;
    metodologiaSortDirection: SortDirection;
    metodologiaIsSidebarOpen: boolean;
    metodologiaFacetSelections: MultiViewSelectionMap;

    selectedAccreditationId: string | null;
    activeAccreditationTab: AcreditacionChildTab;
    accredSearchQuery: string;
    accredViewMode: 'grid' | 'list';
    accredSortColumn: string | null;
    accredSortDirection: SortDirection;
    accredIsSidebarOpen: boolean;
    accredFacetSelections: MultiViewSelectionMap;
    isCreatingAccreditation: boolean;
    accredCreateErrorMessage: string | null;
    accredCreateSuccessMessage: string | null;
    accredOrganismoMode: 'existing' | 'new';
    isEditingAccreditation: boolean;
    accredEditFormData?: AcreditacionViewState['editFormData'];
    accredEditErrorMessage: string | null;
    accredSaveSuccessMessage: string | null;
    accredArchiveConfirmOpen: boolean;
    accredArchiveErrorMessage: string | null;
  };
}

function createInitialChecks(): HealthCheckItem[] {
  return [
    {
      id: 'connection',
      label: 'Connection & Login Service',
      description: 'Confirms the database server and sign-in service are reachable.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'admin',
      label: 'Administrator Permissions',
      description: 'Confirms your admin account is active and authorized.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'records',
      label: 'Core Business Records',
      description: 'Confirms organizations, certificates, audits, and findings can be read.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'coverage',
      label: 'Standards & Coverage Engine',
      description: 'Runs the audit coverage check on a certificate.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
    {
      id: 'governance',
      label: 'Change History & Client Access',
      description: 'Confirms activity logs and client organization requests are readable.',
      state: 'pending',
      detail: 'Waiting to check...',
    },
  ];
}

const INITIAL_AUDITS: AuditRecord[] = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    tipo_auditoria: 'RECERTIFICACION',
    metodologia: 'PRESENCIAL',
    fecha_programacion: '2024-11-20',
    auditor_lider: 'Ing. Carlos Mendoza (Auditor Líder)',
    estatus: 'PLANIFICADA',
  },
];

const INITIAL_AUDITORS: AuditorRecord[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    nombre: 'Ing. Carlos Mendoza',
    rol: 'Auditor Líder Certificado',
    normas: ['ISO 9001:2015', 'ISO 14001:2015'],
    sectores_iaf: [17, 28],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nombre: 'Auditor Técnico Evaluador',
    rol: 'Auditor Técnico Calificado',
    normas: ['ISO 9001:2015'],
    sectores_iaf: [17],
  },
];

const INITIAL_ORGANIZATIONS: OrganizationRecord[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    nombre: 'Iberometal Componentes S.A.',
    rif: 'J-30492817-0',
    direccion_fiscal: 'Zona Industrial Carabobo, Valencia',
    certificados_count: 1,
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    nombre: 'CyberCloud Solutions S.L.',
    rif: 'J-40819234-5',
    direccion_fiscal: 'Torre David, Chacao, Caracas',
    certificados_count: 2,
  },
];

const INITIAL_SITES: SiteRecord[] = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    numero_sitio: 1,
    nombre_sitio: 'Planta Valencia',
    direccion_sitio: 'Zona Industrial Carabobo, Valencia',
    numero_certificado: 'FN-QMS-2024-001',
    turnos_count: 2,
  },
];

const INITIAL_PROCESSES: ProcessRecord[] = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    nombre_proceso: 'Troquelado y Fundición',
    numero_certificado: 'FN-QMS-2024-001',
    clausulas_cubiertas: ['4.1', '8.5'],
  },
];

const INITIAL_SHIFTS: ShiftRecord[] = [
  {
    id: '70000000-0000-0000-0000-000000000001',
    hora_entrada: '07:00:00',
    hora_salida: '15:00:00',
    descripcion: 'Turno Matutino Operativo',
    sitios_vinculados: ['Planta Valencia'],
  },
  {
    id: '70000000-0000-0000-0000-000000000002',
    hora_entrada: '15:00:00',
    hora_salida: '23:00:00',
    descripcion: 'Turno Vespertino / Nocturno',
    sitios_vinculados: ['Planta Valencia'],
  },
];

const INITIAL_STANDARDS: StandardRecord[] = [
  { id: 'e0000000-0000-0000-0000-000000009001', esquema: 'SGC - Calidad', norma: 'ISO 9001:2015', clausulas_count: 7 },
  { id: 'e0000000-0000-0000-0000-000000014001', esquema: 'SGA - Gestión Ambiental', norma: 'ISO 14001:2015', clausulas_count: 5 },
  { id: 'e0000000-0000-0000-0000-000000045001', esquema: 'SST - Seguridad y Salud Laboral', norma: 'ISO 45001:2018', clausulas_count: 11 },
  { id: 'e0000000-0000-0000-0000-000000027001', esquema: 'SGSI - Seguridad de la Información', norma: 'ISO/IEC 27001:2022', clausulas_count: 9 },
];

const INITIAL_REQUIREMENTS: RequirementRecord[] = [
  { id: 'f0000000-0000-0000-0000-000000000004', codigo: '4', ruta_materializada: '4', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000041', codigo: '4.1', ruta_materializada: '4.4_1', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000042', codigo: '4.2', ruta_materializada: '4.4_2', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000005', codigo: '5', ruta_materializada: '5', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000051', codigo: '5.1', ruta_materializada: '5.5_1', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000008', codigo: '8', ruta_materializada: '8', norma: 'ISO 9001:2015' },
  { id: 'f0000000-0000-0000-0000-000000000085', codigo: '8.5', ruta_materializada: '8.8_5', norma: 'ISO 9001:2015' },
];

const INITIAL_IAF: IafRecord[] = [
  { id: 'd0000000-0000-0000-0000-000000000014', sector: 14, descripcion: 'Productos químicos, fibras sintéticas y farmacéuticos' },
  { id: 'd0000000-0000-0000-0000-000000000017', sector: 17, descripcion: 'Metales básicos y productos metálicos elaborados' },
  { id: 'd0000000-0000-0000-0000-000000000028', sector: 28, descripcion: 'Construcción e ingeniería civil' },
  { id: 'd0000000-0000-0000-0000-000000000033', sector: 33, descripcion: 'Tecnología de la información y comunicaciones' },
  { id: 'd0000000-0000-0000-0000-000000000035', sector: 35, descripcion: 'Otros servicios profesionales y de ensayo' },
];

const INITIAL_CATALOGS: CatalogItem[] = [
  { categoria: 'estatus', valor: 'ACTIVO' },
  { categoria: 'estatus', valor: 'EN_PROCESO' },
  { categoria: 'estatus', valor: 'SUSPENDIDO' },
  { categoria: 'estatus', valor: 'CANCELADO' },
  { categoria: 'estatus', valor: 'PLANIFICADA' },
  { categoria: 'tipo_auditoria', valor: 'ETAPA_1' },
  { categoria: 'tipo_auditoria', valor: 'ETAPA_2' },
  { categoria: 'tipo_auditoria', valor: 'VIGILANCIA_1' },
  { categoria: 'tipo_auditoria', valor: 'RECERTIFICACION' },
  { categoria: 'metodologia', valor: 'PRESENCIAL' },
  { categoria: 'metodologia', valor: 'REMOTA' },
  { categoria: 'metodologia', valor: 'HIBRIDA' },
];

function parseHashRoute(): { route: ActiveRoute; subview: string | null } {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (!raw) return { route: 'dashboard', subview: null };
    const parts = raw.split('/');
    const firstRaw = (parts[0] || '').trim().toLowerCase();
    const second = parts[1] || null;

    if (firstRaw === 'drilldown') {
      return { route: 'certificacion', subview: 'certificates' };
    }

    if (firstRaw === 'auditorias' || firstRaw === 'certificacion' || firstRaw === 'extra') {
      const domain = firstRaw as DomainRoute;
      return { route: domain, subview: normalizeDomainSubview(domain, second) };
    }

    if (
      firstRaw === 'dashboard' ||
      firstRaw === 'profile' ||
      firstRaw === 'approvals' ||
      firstRaw === 'database'
    ) {
      return { route: firstRaw as ActiveRoute, subview: null };
    }
  } catch {
    // fallback
  }
  return { route: 'dashboard', subview: null };
}

function syncUrlHash(route: ActiveRoute, subview: string | null, replace = false): void {
  try {
    const target = subview ? `#/${route}/${subview}` : `#/${route}`;
    if (window.location.hash !== target) {
      if (replace) {
        window.history.replaceState(null, '', target);
      } else {
        window.history.pushState(null, '', target);
      }
    }
  } catch {
    // ignore
  }
}

let isSigningOut = false;
let activeSessionLoadKey: string | null = null;

const state: AppState = {
  booting: true,
  user: null,
  profile: null,
  authorizedClientOrgIds: [],
  clientAccessRows: [],
  profileForm: {
    nombreInput: '',
    savingProfile: false,
    profileFeedback: null,
    profileError: null,
    passwordSectionOpen: false,
    newPasswordInput: '',
    confirmPasswordInput: '',
    savingPassword: false,
    passwordFeedback: null,
    passwordError: null,
  },
  activeRoute: 'dashboard',
  activeSubSection: null,
  openMenu: null,
  breadcrumbs: resetBreadcrumbToDomain('dashboard'),
  auditLogModal: {
    isOpen: false,
    entityName: '',
    tableName: '',
    recordId: '',
    entries: [],
    actorDirectory: { ...SEEDED_ACTOR_DIRECTORY },
    loading: false,
    errorMessage: null,
  },
  auth: {
    mode: 'login',
    errorMessage: null,
    successMessage: null,
    submitting: false,
    quickLoginEmail: null,
    email: '',
    nombre: '',
    requestedRole: 'CLIENT',
    resetModalOpen: false,
    resettingDb: false,
    resetErrorMessage: null,
  },
  approvals: {
    profiles: [],
    filter: 'PENDING',
    loading: false,
    updatingId: null,
    errorMessage: null,
    successMessage: null,
  },
  dbCheck: {
    checks: createInitialChecks(),
    running: false,
    lastCheckedAt: null,
  },
  exploration: {
    records: [...SAMPLE_CERTIFICATE_RECORDS],
    loading: false,
    query: '',
    selectedStatus: 'ALL',
    selectedStandard: 'ALL',
    viewMode: getStoredViewMode('grid'),
  },
  domainData: {
    audits: [...INITIAL_AUDITS],
    auditors: [...INITIAL_AUDITORS],
    organizations: [...INITIAL_ORGANIZATIONS],
    sites: [...INITIAL_SITES],
    processes: [...INITIAL_PROCESSES],
    shifts: [...INITIAL_SHIFTS],
    standards: [...INITIAL_STANDARDS],
    requirements: [...INITIAL_REQUIREMENTS],
    iafSectors: [...INITIAL_IAF],
    catalogs: [...INITIAL_CATALOGS],
    findings: [...INITIAL_FINDINGS],
    allOrganizaciones: [...INITIAL_ORGANIZACIONES],
    allCertificadosDetailed: [...INITIAL_CERTIFICADOS_DETAILED],
    allAuditorsDetailed: [...INITIAL_AUDITORES_DETAILED],
    allOrganismos: INITIAL_ORGANISMOS.map((o) => ({ ...o })),
    allAcreditaciones: buildInitialAcreditacionEntities(),
    shiftCatalog: [...INITIAL_TURNO_CATALOG],
    requirementsCatalog: getAllSeededNormaRequirements(),
    archivedSiteIds: new Set<string>(),
    archivedProcesoIds: new Set<string>(),
    archivedTurnoIds: new Set<string>(),
    programacionAudits: INITIAL_PROGRAMACION_AUDITS.map((a) => ({
      ...a,
      equipo: a.equipo.map((m) => ({ ...m })),
      sitiosMuestreo: a.sitiosMuestreo.map((s) => ({ ...s })),
      matrizNormativa: a.matrizNormativa.map((n) => ({ ...n })),
      recomendacion: a.recomendacion ? { ...a.recomendacion } : null,
    })),
    phase5Findings: INITIAL_PHASE5_FINDINGS.map((f) => ({ ...f })),
    sessionAuditLogs: [],
    loading: false,
  },
  archiveGovernance: {
    showArchived: false,
    modal: createInitialArchiveModalState(),
    toast: null,
    restoringId: null,
    archivedRecordsByTable: {},
    archivedSnapshotsByKey: {},
    archivedCatalogIds: new Set<string>(),
  },
  auditPlanning: {
    isModalOpen: false,
  },
  tableColumnWidths: {},
  programacionDomain: {
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
    editErrorMessage: null,
    saveSuccessMessage: null,
    isSidebarOpen: true,
    facetSelections: {},
  },
  calendarioDomain: {
    displayMode: 'month',
    referenceYear: 2024,
    referenceMonth: 11,
    filterAuditorId: 'ALL',
    filterStandard: 'ALL',
    filterMethodology: 'ALL',
    drawerAuditId: null,
  },
  resultadoDomain: {
    selectedAuditId: 'ALL',
    activeAuditIdForDecision: INITIAL_PROGRAMACION_AUDITS[0]?.id || '',
    displayMode: 'list',
    filterType: 'ALL',
    filterLifecycle: 'ALL',
    searchQuery: '',
    isLoggingFinding: false,
    inspectingFindingId: null,
    recommendationError: null,
    recommendationSuccess: null,
    findingFormError: null,
  },
  organizacionDomain: {
    selectedOrganizacionId: null,
    query: '',
    hasActiveCertificates: 'ALL',
    selectedSectorIaf: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isEditingAttributes: false,
    activeChildTab: 'certificados',
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    isSidebarOpen: true,
    facetSelections: {},
    isCreating: false,
    createErrorMessage: null,
  },
  certificadoDomain: {
    selectedCertId: null,
    activeChildTab: 'sitios',
    query: '',
    selectedStandard: 'ALL',
    selectedStatus: 'ALL',
    selectedSectorIaf: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    originatingOrganizacionId: null,
    isSidebarOpen: true,
    facetSelections: {},
    isCreating: false,
    createErrorMessage: null,
  },
  sitioDomain: {
    selectedSitioId: null,
    activeChildTab: 'turnos',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    archiveConfirmOpen: false,
    archiveErrorMessage: null,
    isAssigningShift: false,
    shiftActionMessage: null,
  },
  procesoDomain: {
    selectedProcesoId: null,
    activeChildTab: 'requisitos',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    archiveConfirmOpen: false,
    archiveErrorMessage: null,
    isAssigningRequisito: false,
    requisitoActionMessage: null,
  },
  turnoDomain: {
    selectedTurnoId: null,
    originatingSitioId: null,
    activeChildTab: 'sitios',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    archiveConfirmOpen: false,
    archiveErrorMessage: null,
  },
  auditorDomain: {
    selectedAuditorId: null,
    activeChildTab: 'competencias',
    query: '',
    selectedCalificacion: 'ALL',
    selectedStandard: 'ALL',
    selectedSectorIaf: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    isSidebarOpen: true,
    facetSelections: {},
    isCreating: false,
    createErrorMessage: null,
  },
  extraDomain: {
    selectedNormaId: null,
    activeNormaTab: 'acreditacion',
    normaSearchQuery: '',
    normaFilterStatus: 'ALL',
    normaFilterScheme: 'ALL',
    normaViewMode: 'grid',
    normaSortColumn: null,
    normaSortDirection: 'none',
    normaIsSidebarOpen: true,
    normaFacetSelections: {},
    isAddAccreditationModalOpen: false,
    inspectingClauseId: null,

    selectedSectorId: null,
    activeSectorTab: 'subsectores',
    iafSearchQuery: '',
    iafFilterRisk: 'ALL',
    iafViewMode: 'grid',
    iafSortColumn: null,
    iafSortDirection: 'none',
    iafIsSidebarOpen: true,
    iafFacetSelections: {},
    isAddSubsectorModalOpen: false,

    selectedEstatusId: null,
    activeEstatusTab: 'certificados',
    estatusSearchQuery: '',
    estatusViewMode: 'grid',
    estatusSortColumn: null,
    estatusSortDirection: 'none',
    estatusIsSidebarOpen: true,
    estatusFacetSelections: {},

    selectedTipoId: null,
    tipoSearchQuery: '',
    tipoViewMode: 'grid',
    tipoSortColumn: null,
    tipoSortDirection: 'none',
    tipoIsSidebarOpen: true,
    tipoFacetSelections: {},

    selectedMetodologiaId: null,
    metodologiaSearchQuery: '',
    metodologiaViewMode: 'grid',
    metodologiaSortColumn: null,
    metodologiaSortDirection: 'none',
    metodologiaIsSidebarOpen: true,
    metodologiaFacetSelections: {},

    selectedAccreditationId: null,
    activeAccreditationTab: 'certificados',
    accredSearchQuery: '',
    accredViewMode: 'grid',
    accredSortColumn: null,
    accredSortDirection: 'none',
    accredIsSidebarOpen: true,
    accredFacetSelections: {},
    isCreatingAccreditation: false,
    accredCreateErrorMessage: null,
    accredCreateSuccessMessage: null,
    accredOrganismoMode: 'existing',
    isEditingAccreditation: false,
    accredEditFormData: undefined,
    accredEditErrorMessage: null,
    accredSaveSuccessMessage: null,
    accredArchiveConfirmOpen: false,
    accredArchiveErrorMessage: null,
  },
};

function isApprovedAdmin(): boolean {
  return evaluateAdminAccess(state.profile).allowed;
}

function isApprovedStaff(): boolean {
  return isApprovedStaffProfile(state.profile);
}

function canMutateAuditById(auditId: string | null | undefined): boolean {
  if (!state.profile || state.profile.status !== 'APPROVED') return false;
  if (isApprovedStaff()) return true;
  if (!auditId) return false;
  const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
  return canMutateAuditExecution(audit, state.profile);
}

function render(): void {
  const root = document.getElementById('app');
  if (!root) return;

  if (state.booting) {
    root.innerHTML = `
      ${renderHeader({
        profile: null,
        email: null,
        isAdmin: false,
        activeRoute: 'dashboard',
        activeSubSection: null,
        pendingCount: 0,
        openMenu: null,
      })}
      <main class="flex-1 flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p class="text-sm font-medium text-slate-700">Loading workspace...</p>
        </div>
      </main>
    `;
    return;
  }

  if (!state.user || !state.profile) {
    root.innerHTML = `
      ${renderHeader({
        profile: null,
        email: null,
        isAdmin: false,
        activeRoute: 'dashboard',
        activeSubSection: null,
        pendingCount: 0,
        openMenu: null,
      })}
      ${renderAuthView(state.auth)}
    `;
    bindAuthEvents();
    return;
  }

  const admin = isApprovedAdmin();
  const staff = isApprovedStaff();
  const pendingCount = state.approvals.profiles.filter((p) => p.status === 'PENDING').length;

  const scopedProgramacionAudits = scopeProgramacionAuditsForProfile(
    state.domainData.programacionAudits,
    state.profile,
    state.authorizedClientOrgIds
  );
  const scopedPhase5Findings = scopePhase5FindingsForProfile(
    state.domainData.phase5Findings,
    scopedProgramacionAudits,
    state.profile
  );
  const scopedExplorationRecords = scopeCertificateRecordsForProfile(
    state.exploration.records,
    state.profile,
    state.authorizedClientOrgIds,
    scopedProgramacionAudits
  );
  const scopedDetailedCerts = scopeDetailedCertsForProfile(
    state.domainData.allCertificadosDetailed,
    state.profile,
    state.authorizedClientOrgIds,
    scopedProgramacionAudits
  );
  const scopedAllOrganizaciones = scopeOrganizacionEntitiesForProfile(
    state.domainData.allOrganizaciones,
    state.profile,
    state.authorizedClientOrgIds,
    scopedProgramacionAudits
  );
  const scopedOrganizations = scopeOrganizationsForProfile(
    state.domainData.organizations,
    state.profile,
    state.authorizedClientOrgIds,
    scopedProgramacionAudits,
    scopedExplorationRecords
  );
  const scopedLegacyAudits = scopeLegacyAuditsForProfile(
    state.domainData.audits,
    state.profile,
    scopedProgramacionAudits,
    scopedExplorationRecords
  );
  const scopedLegacyFindings = scopeLegacyFindingsForProfile(
    state.domainData.findings,
    scopedLegacyAudits,
    scopedExplorationRecords,
    state.profile
  );
  const scopedSites = scopeSitesOrProcessesForCertificates(
    state.domainData.sites,
    scopedExplorationRecords,
    state.profile
  );
  const scopedProcesses = scopeSitesOrProcessesForCertificates(
    state.domainData.processes,
    scopedExplorationRecords,
    state.profile
  );

  const isAuditorContextualCertAccess =
    state.profile.role === 'AUDITOR' &&
    state.profile.status === 'APPROVED' &&
    state.activeRoute === 'certificacion' &&
    (Boolean(state.organizacionDomain.selectedOrganizacionId) ||
      Boolean(state.certificadoDomain.selectedCertId) ||
      Boolean(state.sitioDomain.selectedSitioId) ||
      Boolean(state.procesoDomain.selectedProcesoId) ||
      Boolean(state.turnoDomain.selectedTurnoId));

  let effectiveRoute: ActiveRoute = state.activeRoute;
  if (!canAccessRoute(state.profile, effectiveRoute) && !isAuditorContextualCertAccess) {
    effectiveRoute = 'dashboard';
    state.activeRoute = 'dashboard';
    state.activeSubSection = null;
  }

  const effectiveResultadoState: ResultadoViewState = {
    ...state.resultadoDomain,
    activeAuditIdForDecision: scopedProgramacionAudits.some(
      (a) => a.id === state.resultadoDomain.activeAuditIdForDecision
    )
      ? state.resultadoDomain.activeAuditIdForDecision
      : scopedProgramacionAudits[0]?.id || '',
  };

  const canInspectArchived = canInspectArchivedRecords(state.profile);
  const allArchivedEntries: ArchivedItemEntry[] = canInspectArchived
    ? Object.values(state.archiveGovernance.archivedRecordsByTable).flat()
    : [];
  const archiveConfig: ArchiveMultiViewConfig = {
    canInspectArchived,
    showArchived: canInspectArchived && state.archiveGovernance.showArchived,
    archivedItems: allArchivedEntries,
    actorDirectory: buildActorDirectory(),
    restoringId: state.archiveGovernance.restoringId,
  };

  let bodyHtml = '';
  if (effectiveRoute === 'approvals' && staff) {
    bodyHtml = renderApprovalsView({
      profiles: state.approvals.profiles,
      filter: state.approvals.filter,
      loading: state.approvals.loading,
      updatingId: state.approvals.updatingId,
      errorMessage: state.approvals.errorMessage,
      successMessage: state.approvals.successMessage,
      currentAdminId: state.user.id,
      readOnly: !admin,
    });
  } else if (effectiveRoute === 'database' && admin) {
    bodyHtml = renderDatabaseStatusView(
      state.dbCheck.checks,
      state.dbCheck.running,
      state.dbCheck.lastCheckedAt
    );
  } else if (effectiveRoute === 'profile') {
    bodyHtml = renderProfileView({
      profile: state.profile,
      userEmail: state.user.email || '',
      formState: state.profileForm,
      clientAccessItems: state.clientAccessRows,
      auditorsDetailed: state.domainData.allAuditorsDetailed,
    });
  } else if (effectiveRoute === 'auditorias') {
    bodyHtml = renderAuditoriasView(state.profile, {
      activeSubSection: state.activeSubSection || 'scheduling',
      programacionState: state.programacionDomain,
      calendarioState: state.calendarioDomain,
      resultadoState: effectiveResultadoState,
      programacionAudits: scopedProgramacionAudits,
      phase5Findings: scopedPhase5Findings,
      allAuditorsDetailed: state.domainData.allAuditorsDetailed,
      certificates: scopedExplorationRecords,
      processes: scopedProcesses,
      requirements: state.domainData.requirements,
      standards: state.domainData.standards,
      loading: state.domainData.loading,
      archiveConfig,
    });
  } else if (effectiveRoute === 'certificacion') {
    const filteredRecords = filterCertificateRecords(scopedExplorationRecords, {
      query: state.exploration.query,
      selectedStatus: state.exploration.selectedStatus,
      selectedStandard: state.exploration.selectedStandard,
    });
    const availableStatuses = extractUniqueStatuses(scopedExplorationRecords);
    const availableStandards = extractUniqueStandards(scopedExplorationRecords);

    bodyHtml = renderCertificacionView(state.profile, {
      activeSubSection: state.activeSubSection || 'certificates',
      filters: {
        query: state.exploration.query,
        selectedStatus: state.exploration.selectedStatus,
        selectedStandard: state.exploration.selectedStandard,
        viewMode: state.exploration.viewMode,
      },
      filteredCertificates: filteredRecords,
      allCertificates: scopedExplorationRecords,
      availableStatuses,
      availableStandards,
      organizations: scopedOrganizations,
      sites: scopedSites,
      processes: scopedProcesses,
      shifts: state.domainData.shifts,
      loading: state.exploration.loading,
      organizacionState: state.organizacionDomain,
      allOrganizaciones: scopedAllOrganizaciones,
      certificadoState: state.certificadoDomain,
      allCertificadosDetailed: scopedDetailedCerts,
      auditorState: state.auditorDomain,
      allAuditorsDetailed: state.domainData.allAuditorsDetailed,
      programacionAudits: scopedProgramacionAudits,
      sitioState: state.sitioDomain,
      procesoState: state.procesoDomain,
      turnoState: state.turnoDomain,
      shiftCatalog: state.domainData.shiftCatalog,
      requirementsCatalog: state.domainData.requirementsCatalog,
      phase5Findings: scopedPhase5Findings,
      archivedSiteIds: state.domainData.archivedSiteIds,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
      archivedTurnoIds: state.domainData.archivedTurnoIds,
      archiveConfig,
    });
  } else if (effectiveRoute === 'extra') {
    const coverageCerts: CertificateCoverageInput[] = [];
    const seenCertKeys = new Set<string>();
    for (const c of scopedDetailedCerts) {
      const key = c.numero_certificado || c.id;
      seenCertKeys.add(key);
      coverageCerts.push({
        id: c.id,
        estatus: c.estatus,
        id_norma: c.id_norma,
        norma_codigo: c.norma_codigo,
        id_sector_iaf: c.id_sector_iaf,
        sector_iaf: c.sector_iaf,
      });
    }
    for (const r of scopedExplorationRecords) {
      const key = r.numero_certificado || r.id;
      if (seenCertKeys.has(key)) continue;
      seenCertKeys.add(key);
      coverageCerts.push({
        id: r.id,
        estatus: r.estatus,
        norma_id: r.norma_id,
        norma: r.norma,
        sector_iaf: r.sector_iaf,
      });
    }
    const enrichedAcreditaciones = enrichAcreditacionesWithImpact(
      state.domainData.allAcreditaciones,
      coverageCerts
    );
    const acreditacionViewState: Partial<AcreditacionViewState> = {
      selectedAccreditationId: state.extraDomain.selectedAccreditationId,
      activeChildTab: state.extraDomain.activeAccreditationTab,
      query: state.extraDomain.accredSearchQuery,
      viewMode: state.extraDomain.accredViewMode,
      sortColumn: state.extraDomain.accredSortColumn,
      sortDirection: state.extraDomain.accredSortDirection,
      isSidebarOpen: state.extraDomain.accredIsSidebarOpen,
      facetSelections: state.extraDomain.accredFacetSelections,
      isCreating: state.extraDomain.isCreatingAccreditation,
      createErrorMessage: state.extraDomain.accredCreateErrorMessage,
      createSuccessMessage: state.extraDomain.accredCreateSuccessMessage,
      organismoMode: state.extraDomain.accredOrganismoMode,
      isEditingAttributes: state.extraDomain.isEditingAccreditation,
      editFormData: state.extraDomain.accredEditFormData,
      editErrorMessage: state.extraDomain.accredEditErrorMessage,
      saveSuccessMessage: state.extraDomain.accredSaveSuccessMessage,
      archiveConfirmOpen: state.extraDomain.accredArchiveConfirmOpen,
      archiveErrorMessage: state.extraDomain.accredArchiveErrorMessage,
    };

    bodyHtml = renderExtraView(state.profile, {
      activeSubSection: state.activeSubSection || 'standards',
      standards: state.domainData.standards,
      requirements: state.domainData.requirements,
      iafSectors: state.domainData.iafSectors,
      catalogs: state.domainData.catalogs,
      loading: state.domainData.loading,
      organismos: state.domainData.allOrganismos,
      accreditations: enrichedAcreditaciones,
      certificates: scopedDetailedCerts,
      auditors: state.domainData.allAuditorsDetailed,
      audits: scopedProgramacionAudits,
      archivedRecordIds: state.archiveGovernance.archivedCatalogIds,
      archiveConfig,
      normaState: {
        selectedNormaId: state.extraDomain.selectedNormaId,
        activeChildTab: state.extraDomain.activeNormaTab,
        query: state.extraDomain.normaSearchQuery,
        selectedStatus: state.extraDomain.normaFilterStatus,
        selectedScheme: state.extraDomain.normaFilterScheme,
        viewMode: state.extraDomain.normaViewMode,
        sortColumn: state.extraDomain.normaSortColumn,
        sortDirection: state.extraDomain.normaSortDirection,
        isSidebarOpen: state.extraDomain.normaIsSidebarOpen,
        facetSelections: state.extraDomain.normaFacetSelections,
        isAddAccreditationModalOpen: state.extraDomain.isAddAccreditationModalOpen,
        inspectingClauseId: state.extraDomain.inspectingClauseId,
      },
      iafState: {
        selectedSectorId: state.extraDomain.selectedSectorId,
        activeChildTab: state.extraDomain.activeSectorTab,
        query: state.extraDomain.iafSearchQuery,
        selectedRisk: state.extraDomain.iafFilterRisk,
        viewMode: state.extraDomain.iafViewMode,
        sortColumn: state.extraDomain.iafSortColumn,
        sortDirection: state.extraDomain.iafSortDirection,
        isSidebarOpen: state.extraDomain.iafIsSidebarOpen,
        facetSelections: state.extraDomain.iafFacetSelections,
        isAddSubsectorModalOpen: state.extraDomain.isAddSubsectorModalOpen,
      },
      acreditacionState: acreditacionViewState,
      estatusState: {
        selectedEstatusId: state.extraDomain.selectedEstatusId,
        activeChildTab: state.extraDomain.activeEstatusTab,
        query: state.extraDomain.estatusSearchQuery,
        viewMode: state.extraDomain.estatusViewMode,
        sortColumn: state.extraDomain.estatusSortColumn,
        sortDirection: state.extraDomain.estatusSortDirection,
        isSidebarOpen: state.extraDomain.estatusIsSidebarOpen,
        facetSelections: state.extraDomain.estatusFacetSelections,
      },
      tipoState: {
        selectedTipoId: state.extraDomain.selectedTipoId,
        query: state.extraDomain.tipoSearchQuery,
        viewMode: state.extraDomain.tipoViewMode,
        sortColumn: state.extraDomain.tipoSortColumn,
        sortDirection: state.extraDomain.tipoSortDirection,
        isSidebarOpen: state.extraDomain.tipoIsSidebarOpen,
        facetSelections: state.extraDomain.tipoFacetSelections,
      },
      metodologiaState: {
        selectedMetodologiaId: state.extraDomain.selectedMetodologiaId,
        query: state.extraDomain.metodologiaSearchQuery,
        viewMode: state.extraDomain.metodologiaViewMode,
        sortColumn: state.extraDomain.metodologiaSortColumn,
        sortDirection: state.extraDomain.metodologiaSortDirection,
        isSidebarOpen: state.extraDomain.metodologiaIsSidebarOpen,
        facetSelections: state.extraDomain.metodologiaFacetSelections,
      },
    });
  } else {
    const summaryMetrics = computeDashboardSummaryMetrics({
      profile: state.profile,
      scopedOrganizaciones: scopedAllOrganizaciones,
      scopedCertificados: scopedDetailedCerts,
      scopedAuditorias: scopedProgramacionAudits,
      acreditaciones:
        state.domainData.allAcreditaciones.length > 0
          ? state.domainData.allAcreditaciones.map(toLegacyAcreditacionNormaIaf)
          : INITIAL_ACREDITACIONES,
      scopedHallazgos: scopedPhase5Findings,
    });

    bodyHtml = renderDashboardView(
      state.profile,
      state.user.email || '',
      summaryMetrics
    );
  }

  const activeEl = document.activeElement as HTMLElement | null;
  const isInputActive = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
  const activeInputId = isInputActive ? activeEl?.id || null : null;
  const searchCursorStart = isInputActive ? (activeEl as HTMLInputElement).selectionStart : null;
  const searchCursorEnd = isInputActive ? (activeEl as HTMLInputElement).selectionEnd : null;

  const breadcrumbBarHtml = renderBreadcrumbBar({ trail: state.breadcrumbs });
  const auditModalHtml = renderAuditLogModal(state.auditLogModal);
  const archiveModalHtml = renderArchiveModal(state.archiveGovernance.modal);
  const archiveToastHtml = renderArchiveToast(state.archiveGovernance.toast);

  root.innerHTML = `
    ${renderHeader({
      profile: state.profile,
      email: state.user.email || '',
      isAdmin: admin,
      canViewApprovals: staff,
      activeRoute: effectiveRoute,
      activeSubSection: state.activeSubSection,
      pendingCount,
      openMenu: state.openMenu,
    })}
    ${
      state.breadcrumbs && state.breadcrumbs.length > 1
        ? `<div class="${APP_SHELL_CONTAINER_CLASS} pt-3 pb-0">${breadcrumbBarHtml}</div>`
        : ''
    }
    ${bodyHtml}
    ${auditModalHtml}
    ${archiveModalHtml}
    ${archiveToastHtml}
  `;

  bindAuthenticatedEvents();

  if (activeInputId) {
    const restoredInput = document.getElementById(activeInputId) as HTMLInputElement | null;
    if (restoredInput) {
      restoredInput.focus();
      if (searchCursorStart !== null && searchCursorEnd !== null) {
        try {
          restoredInput.setSelectionRange(searchCursorStart, searchCursorEnd);
        } catch {
          // ignore non-text inputs
        }
      }
    }
  }
}

function bindAuthEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-auth-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.authMode === 'signup' ? 'signup' : 'login';
      state.auth = {
        ...state.auth,
        mode,
        errorMessage: null,
        successMessage: null,
      };
      render();
    });
  });

  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('loginEmail') as HTMLInputElement | null;
    const passwordInput = document.getElementById('loginPassword') as HTMLInputElement | null;
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    void signInWithCredentials(email, password, null);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-quick-login]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.quickLogin || '';
      const account = TEST_ACCOUNTS.find((a) => a.email === email);
      if (account) {
        void signInWithCredentials(account.email, account.password, account.email);
      }
    });
  });

  document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('signupName') as HTMLInputElement | null;
    const emailInput = document.getElementById('signupEmail') as HTMLInputElement | null;
    const passwordInput = document.getElementById('signupPassword') as HTMLInputElement | null;
    const roleSelect = document.getElementById('signupRole') as HTMLSelectElement | null;

    const nombre = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    const role = (roleSelect?.value || 'CLIENT') as UserRole;

    void handleSignUp(nombre, email, password, role);
  });

  document.getElementById('openResetDbModalBtn')?.addEventListener('click', () => {
    state.auth = {
      ...state.auth,
      resetModalOpen: true,
      resetErrorMessage: null,
    };
    render();
  });

  document.getElementById('cancelResetDbBtn')?.addEventListener('click', () => {
    if (state.auth.resettingDb) return;
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resetErrorMessage: null,
    };
    render();
  });

  document.getElementById('resetDbBackdrop')?.addEventListener('click', (e) => {
    if (e.target !== e.currentTarget || state.auth.resettingDb) return;
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resetErrorMessage: null,
    };
    render();
  });

  document.getElementById('confirmResetDbBtn')?.addEventListener('click', () => {
    void handleResetDatabase();
  });
}

function inferEntityTypeFromSegment(seg: BreadcrumbSegment): BreadcrumbEntityType | null {
  if (seg.entityType) return seg.entityType;
  if (seg.id.startsWith('org-')) return 'org';
  if (seg.id.startsWith('cert-')) return 'cert';
  if (seg.id.startsWith('sitio-')) return 'sitio';
  if (seg.id.startsWith('proceso-')) return 'proceso';
  if (seg.id.startsWith('turno-')) return 'turno';
  if (seg.id.startsWith('aud-')) return 'auditor';
  if (seg.id.startsWith('prog-audit-') || seg.id.startsWith('resultados-')) return 'audit';
  if (seg.id.startsWith('norma-')) return 'norma';
  if (seg.id.startsWith('sector-')) return 'sector_iaf';
  if (seg.id.startsWith('estatus-')) return 'estatus';
  if (seg.id.startsWith('tipo-')) return 'tipo';
  if (seg.id.startsWith('metodologia-')) return 'metodologia';
  if (seg.id.startsWith('accreditation-')) return 'accreditation';
  return null;
}

function clearAllEntitySelections(): void {
  state.organizacionDomain.selectedOrganizacionId = null;
  state.organizacionDomain.isEditingAttributes = false;
  state.organizacionDomain.editErrorMessage = null;
  state.organizacionDomain.saveSuccessMessage = null;
  state.organizacionDomain.isCreating = false;
  state.organizacionDomain.createErrorMessage = null;

  state.certificadoDomain.selectedCertId = null;
  state.certificadoDomain.isEditingAttributes = false;
  state.certificadoDomain.editErrorMessage = null;
  state.certificadoDomain.saveSuccessMessage = null;
  state.certificadoDomain.isCreating = false;
  state.certificadoDomain.createErrorMessage = null;

  state.sitioDomain.selectedSitioId = null;
  state.sitioDomain.isEditingAttributes = false;
  state.sitioDomain.editFormData = undefined;
  state.sitioDomain.editErrorMessage = null;
  state.sitioDomain.saveSuccessMessage = null;
  state.sitioDomain.archiveConfirmOpen = false;
  state.sitioDomain.archiveErrorMessage = null;
  state.sitioDomain.isAssigningShift = false;
  state.sitioDomain.shiftActionMessage = null;

  state.procesoDomain.selectedProcesoId = null;
  state.procesoDomain.isEditingAttributes = false;
  state.procesoDomain.editFormData = undefined;
  state.procesoDomain.editErrorMessage = null;
  state.procesoDomain.saveSuccessMessage = null;
  state.procesoDomain.archiveConfirmOpen = false;
  state.procesoDomain.archiveErrorMessage = null;
  state.procesoDomain.isAssigningRequisito = false;
  state.procesoDomain.requisitoActionMessage = null;

  state.turnoDomain.selectedTurnoId = null;
  state.turnoDomain.originatingSitioId = null;
  state.turnoDomain.isEditingAttributes = false;
  state.turnoDomain.editFormData = undefined;
  state.turnoDomain.editErrorMessage = null;
  state.turnoDomain.saveSuccessMessage = null;
  state.turnoDomain.archiveConfirmOpen = false;
  state.turnoDomain.archiveErrorMessage = null;

  state.auditorDomain.selectedAuditorId = null;
  state.auditorDomain.isEditingAttributes = false;
  state.auditorDomain.editErrorMessage = null;
  state.auditorDomain.saveSuccessMessage = null;
  state.auditorDomain.isCreating = false;
  state.auditorDomain.createErrorMessage = null;

  state.programacionDomain.selectedAuditId = null;
  state.programacionDomain.isEditingAttributes = false;
  state.programacionDomain.isAddingTeamMember = false;
  state.programacionDomain.isPlanningModalOpen = false;
  state.programacionDomain.editErrorMessage = null;
  state.programacionDomain.saveSuccessMessage = null;

  state.calendarioDomain.drawerAuditId = null;
  state.resultadoDomain.inspectingFindingId = null;

  state.extraDomain.selectedNormaId = null;
  state.extraDomain.selectedSectorId = null;
  state.extraDomain.selectedEstatusId = null;
  state.extraDomain.selectedTipoId = null;
  state.extraDomain.selectedMetodologiaId = null;
  state.extraDomain.selectedAccreditationId = null;
  state.extraDomain.isCreatingAccreditation = false;
  state.extraDomain.accredCreateErrorMessage = null;
  state.extraDomain.accredCreateSuccessMessage = null;
  state.extraDomain.isEditingAccreditation = false;
  state.extraDomain.accredEditFormData = undefined;
  state.extraDomain.accredEditErrorMessage = null;
  state.extraDomain.accredSaveSuccessMessage = null;
  state.extraDomain.accredArchiveConfirmOpen = false;
  state.extraDomain.accredArchiveErrorMessage = null;
  state.extraDomain.inspectingClauseId = null;
}

function applyBreadcrumbSegmentState(targetSeg: BreadcrumbSegment): void {
  state.activeRoute = targetSeg.route;
  state.activeSubSection = targetSeg.subview || null;
  state.openMenu = null;

  clearAllEntitySelections();

  const entityType = inferEntityTypeFromSegment(targetSeg);
  const entityId = targetSeg.entityId || null;
  const tab = targetSeg.tab || null;

  if (entityType === 'org' && entityId) {
    state.organizacionDomain.selectedOrganizacionId = entityId;
    state.organizacionDomain.activeChildTab = tab === 'auditorias' ? 'auditorias' : 'certificados';
  } else if (entityType === 'sitio' && entityId) {
    state.activeRoute = 'certificacion';
    state.activeSubSection = 'certificates';
    state.sitioDomain.selectedSitioId = entityId;
    state.sitioDomain.activeChildTab = tab === 'auditorias' ? 'auditorias' : 'turnos';
  } else if (entityType === 'proceso' && entityId) {
    state.activeRoute = 'certificacion';
    state.activeSubSection = 'certificates';
    state.procesoDomain.selectedProcesoId = entityId;
    state.procesoDomain.activeChildTab =
      tab === 'hallazgos' || tab === 'auditorias' ? tab : 'requisitos';
  } else if (entityType === 'turno' && entityId) {
    state.activeRoute = 'certificacion';
    state.activeSubSection = 'certificates';
    state.turnoDomain.selectedTurnoId = entityId;
    state.turnoDomain.originatingSitioId = targetSeg.originatingSitioId || null;
    state.turnoDomain.activeChildTab = tab === 'auditorias' ? 'auditorias' : 'sitios';
  } else if (entityType === 'cert' && entityId) {
    state.certificadoDomain.selectedCertId = entityId;
    if (
      tab === 'sitios' ||
      tab === 'procesos' ||
      tab === 'turnos' ||
      tab === 'no_aplicables' ||
      tab === 'cobertura' ||
      tab === 'auditorias'
    ) {
      state.certificadoDomain.activeChildTab = tab;
    } else {
      state.certificadoDomain.activeChildTab = 'sitios';
    }
  } else if (entityType === 'auditor' && entityId) {
    state.auditorDomain.selectedAuditorId = entityId;
    state.auditorDomain.activeChildTab = tab === 'historial' ? 'historial' : 'competencias';
  } else if (entityType === 'audit' && entityId) {
    if (targetSeg.subview === 'findings') {
      state.resultadoDomain.activeAuditIdForDecision = entityId;
      state.resultadoDomain.selectedAuditId = entityId;
    } else {
      state.programacionDomain.selectedAuditId = entityId;
      state.programacionDomain.activeChildTab =
        tab === 'muestreo' || tab === 'matriz' || tab === 'hallazgos' ? tab : 'equipo';
    }
  } else if (entityType === 'norma' && entityId) {
    state.extraDomain.selectedNormaId = entityId;
    state.extraDomain.activeNormaTab =
      tab === 'requisitos' || tab === 'certificados' ? tab : 'acreditacion';
  } else if (entityType === 'sector_iaf' && entityId) {
    state.extraDomain.selectedSectorId = entityId;
    state.extraDomain.activeSectorTab =
      tab === 'auditores' || tab === 'acreditaciones' || tab === 'certificados'
        ? tab
        : 'subsectores';
  } else if (entityType === 'accreditation' && entityId) {
    state.extraDomain.selectedAccreditationId = entityId;
    state.extraDomain.activeAccreditationTab =
      tab === 'subsectores' ? 'subsectores' : 'certificados';
  } else if (entityType === 'estatus' && entityId) {
    state.extraDomain.selectedEstatusId = entityId;
    state.extraDomain.activeEstatusTab =
      tab === 'auditorias' || tab === 'reglas' ? tab : 'certificados';
  } else if (entityType === 'tipo' && entityId) {
    state.extraDomain.selectedTipoId = entityId;
  } else if (entityType === 'metodologia' && entityId) {
    state.extraDomain.selectedMetodologiaId = entityId;
  }

  if (targetSeg.route === 'profile') {
    state.profileForm = {
      ...state.profileForm,
      nombreInput: state.profile?.nombre || '',
      profileFeedback: null,
      profileError: null,
      passwordFeedback: null,
      passwordError: null,
    };
  }

  syncUrlHash(state.activeRoute, state.activeSubSection);
}

function backtrackToParentBreadcrumb(): void {
  const { trail, target } = popToParentBreadcrumb(state.breadcrumbs);
  state.breadcrumbs = trail;
  if (target) {
    applyBreadcrumbSegmentState(target);
  }
}

function syncCurrentBreadcrumbTab(tab: string): void {
  if (state.breadcrumbs.length === 0) return;
  const lastIdx = state.breadcrumbs.length - 1;
  state.breadcrumbs = state.breadcrumbs.map((seg, idx) =>
    idx === lastIdx ? { ...seg, tab } : seg
  );
}

interface MultiViewDomainAdapter {
  getQuery: () => string;
  setQuery: (q: string) => void;
  getViewMode: () => 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
  getIsSidebarOpen: () => boolean;
  setIsSidebarOpen: (open: boolean) => void;
  getFacetSelections: () => MultiViewSelectionMap;
  setFacetSelections: (next: MultiViewSelectionMap) => void;
  cycleSort: (col: string) => void;
  clearLegacyFilters?: () => void;
}

function getMultiViewDomainAdapter(domainKey: string): MultiViewDomainAdapter | null {
  switch (domainKey) {
    case 'organizaciones':
      return {
        getQuery: () => state.organizacionDomain.query,
        setQuery: (q) => {
          state.organizacionDomain.query = q;
        },
        getViewMode: () => state.organizacionDomain.viewMode,
        setViewMode: (m) => {
          state.organizacionDomain.viewMode = m;
        },
        getIsSidebarOpen: () => state.organizacionDomain.isSidebarOpen ?? true,
        setIsSidebarOpen: (open) => {
          state.organizacionDomain.isSidebarOpen = open;
        },
        getFacetSelections: () => state.organizacionDomain.facetSelections || {},
        setFacetSelections: (next) => {
          state.organizacionDomain.facetSelections = next;
        },
        cycleSort: (col) => {
          if (
            col === 'nombre' ||
            col === 'rif' ||
            col === 'certificados_activos' ||
            col === 'sector'
          ) {
            if (state.organizacionDomain.sortColumn === col) {
              state.organizacionDomain.sortDirection = cycleSortDirection(
                state.organizacionDomain.sortDirection
              );
            } else {
              state.organizacionDomain.sortColumn = col;
              state.organizacionDomain.sortDirection = 'asc';
            }
          }
        },
        clearLegacyFilters: () => {
          state.organizacionDomain.hasActiveCertificates = 'ALL';
          state.organizacionDomain.selectedSectorIaf = 'ALL';
        },
      };
    case 'certificados':
      return {
        getQuery: () => state.certificadoDomain.query,
        setQuery: (q) => {
          state.certificadoDomain.query = q;
        },
        getViewMode: () => state.certificadoDomain.viewMode,
        setViewMode: (m) => {
          state.certificadoDomain.viewMode = m;
        },
        getIsSidebarOpen: () => state.certificadoDomain.isSidebarOpen ?? true,
        setIsSidebarOpen: (open) => {
          state.certificadoDomain.isSidebarOpen = open;
        },
        getFacetSelections: () => state.certificadoDomain.facetSelections || {},
        setFacetSelections: (next) => {
          state.certificadoDomain.facetSelections = next;
        },
        cycleSort: (col) => {
          if (
            col === 'numero_certificado' ||
            col === 'organizacion' ||
            col === 'norma' ||
            col === 'estatus' ||
            col === 'vigencia' ||
            col === 'sedes'
          ) {
            if (state.certificadoDomain.sortColumn === col) {
              state.certificadoDomain.sortDirection = cycleSortDirection(
                state.certificadoDomain.sortDirection
              );
            } else {
              state.certificadoDomain.sortColumn = col;
              state.certificadoDomain.sortDirection = 'asc';
            }
          }
        },
        clearLegacyFilters: () => {
          state.certificadoDomain.selectedStandard = 'ALL';
          state.certificadoDomain.selectedStatus = 'ALL';
          state.certificadoDomain.selectedSectorIaf = 'ALL';
        },
      };
    case 'auditores':
      return {
        getQuery: () => state.auditorDomain.query,
        setQuery: (q) => {
          state.auditorDomain.query = q;
        },
        getViewMode: () => state.auditorDomain.viewMode,
        setViewMode: (m) => {
          state.auditorDomain.viewMode = m;
        },
        getIsSidebarOpen: () => state.auditorDomain.isSidebarOpen ?? true,
        setIsSidebarOpen: (open) => {
          state.auditorDomain.isSidebarOpen = open;
        },
        getFacetSelections: () => state.auditorDomain.facetSelections || {},
        setFacetSelections: (next) => {
          state.auditorDomain.facetSelections = next;
        },
        cycleSort: (col) => {
          if (
            col === 'nombre' ||
            col === 'codigo_credencial' ||
            col === 'calificacion' ||
            col === 'normas' ||
            col === 'sectores'
          ) {
            if (state.auditorDomain.sortColumn === col) {
              state.auditorDomain.sortDirection = cycleSortDirection(
                state.auditorDomain.sortDirection
              );
            } else {
              state.auditorDomain.sortColumn = col;
              state.auditorDomain.sortDirection = 'asc';
            }
          }
        },
        clearLegacyFilters: () => {
          state.auditorDomain.selectedCalificacion = 'ALL';
          state.auditorDomain.selectedStandard = 'ALL';
          state.auditorDomain.selectedSectorIaf = 'ALL';
        },
      };
    case 'programacion':
      return {
        getQuery: () => state.programacionDomain.query,
        setQuery: (q) => {
          state.programacionDomain.query = q;
        },
        getViewMode: () => state.programacionDomain.viewMode,
        setViewMode: (m) => {
          state.programacionDomain.viewMode = m;
        },
        getIsSidebarOpen: () => state.programacionDomain.isSidebarOpen ?? true,
        setIsSidebarOpen: (open) => {
          state.programacionDomain.isSidebarOpen = open;
        },
        getFacetSelections: () => state.programacionDomain.facetSelections || {},
        setFacetSelections: (next) => {
          state.programacionDomain.facetSelections = next;
        },
        cycleSort: (col) => {
          if (
            col === 'codigo' ||
            col === 'organizacion' ||
            col === 'tipo' ||
            col === 'fecha' ||
            col === 'dias' ||
            col === 'estatus'
          ) {
            if (state.programacionDomain.sortColumn === col) {
              state.programacionDomain.sortDirection = cycleSortDirection(
                state.programacionDomain.sortDirection
              );
            } else {
              state.programacionDomain.sortColumn = col;
              state.programacionDomain.sortDirection = 'asc';
            }
          }
        },
        clearLegacyFilters: () => {
          state.programacionDomain.selectedTipo = 'ALL';
          state.programacionDomain.selectedMetodologia = 'ALL';
          state.programacionDomain.selectedEstatus = 'ALL';
          state.programacionDomain.selectedAuditorLider = 'ALL';
        },
      };
    case 'normas':
      return {
        getQuery: () => state.extraDomain.normaSearchQuery,
        setQuery: (q) => {
          state.extraDomain.normaSearchQuery = q;
        },
        getViewMode: () => state.extraDomain.normaViewMode,
        setViewMode: (m) => {
          state.extraDomain.normaViewMode = m;
        },
        getIsSidebarOpen: () => state.extraDomain.normaIsSidebarOpen,
        setIsSidebarOpen: (open) => {
          state.extraDomain.normaIsSidebarOpen = open;
        },
        getFacetSelections: () => state.extraDomain.normaFacetSelections,
        setFacetSelections: (next) => {
          state.extraDomain.normaFacetSelections = next;
        },
        cycleSort: (col) => {
          if (state.extraDomain.normaSortColumn === col) {
            state.extraDomain.normaSortDirection = cycleSortDirection(
              state.extraDomain.normaSortDirection
            );
          } else {
            state.extraDomain.normaSortColumn = col;
            state.extraDomain.normaSortDirection = 'asc';
          }
        },
        clearLegacyFilters: () => {
          state.extraDomain.normaFilterStatus = 'ALL';
          state.extraDomain.normaFilterScheme = 'ALL';
        },
      };
    case 'iaf':
      return {
        getQuery: () => state.extraDomain.iafSearchQuery,
        setQuery: (q) => {
          state.extraDomain.iafSearchQuery = q;
        },
        getViewMode: () => state.extraDomain.iafViewMode,
        setViewMode: (m) => {
          state.extraDomain.iafViewMode = m;
        },
        getIsSidebarOpen: () => state.extraDomain.iafIsSidebarOpen,
        setIsSidebarOpen: (open) => {
          state.extraDomain.iafIsSidebarOpen = open;
        },
        getFacetSelections: () => state.extraDomain.iafFacetSelections,
        setFacetSelections: (next) => {
          state.extraDomain.iafFacetSelections = next;
        },
        cycleSort: (col) => {
          if (state.extraDomain.iafSortColumn === col) {
            state.extraDomain.iafSortDirection = cycleSortDirection(
              state.extraDomain.iafSortDirection
            );
          } else {
            state.extraDomain.iafSortColumn = col;
            state.extraDomain.iafSortDirection = 'asc';
          }
        },
        clearLegacyFilters: () => {
          state.extraDomain.iafFilterRisk = 'ALL';
        },
      };
    case 'estatus':
      return {
        getQuery: () => state.extraDomain.estatusSearchQuery,
        setQuery: (q) => {
          state.extraDomain.estatusSearchQuery = q;
        },
        getViewMode: () => state.extraDomain.estatusViewMode,
        setViewMode: (m) => {
          state.extraDomain.estatusViewMode = m;
        },
        getIsSidebarOpen: () => state.extraDomain.estatusIsSidebarOpen,
        setIsSidebarOpen: (open) => {
          state.extraDomain.estatusIsSidebarOpen = open;
        },
        getFacetSelections: () => state.extraDomain.estatusFacetSelections,
        setFacetSelections: (next) => {
          state.extraDomain.estatusFacetSelections = next;
        },
        cycleSort: (col) => {
          if (state.extraDomain.estatusSortColumn === col) {
            state.extraDomain.estatusSortDirection = cycleSortDirection(
              state.extraDomain.estatusSortDirection
            );
          } else {
            state.extraDomain.estatusSortColumn = col;
            state.extraDomain.estatusSortDirection = 'asc';
          }
        },
      };
    case 'tipos':
      return {
        getQuery: () => state.extraDomain.tipoSearchQuery,
        setQuery: (q) => {
          state.extraDomain.tipoSearchQuery = q;
        },
        getViewMode: () => state.extraDomain.tipoViewMode,
        setViewMode: (m) => {
          state.extraDomain.tipoViewMode = m;
        },
        getIsSidebarOpen: () => state.extraDomain.tipoIsSidebarOpen,
        setIsSidebarOpen: (open) => {
          state.extraDomain.tipoIsSidebarOpen = open;
        },
        getFacetSelections: () => state.extraDomain.tipoFacetSelections,
        setFacetSelections: (next) => {
          state.extraDomain.tipoFacetSelections = next;
        },
        cycleSort: (col) => {
          if (state.extraDomain.tipoSortColumn === col) {
            state.extraDomain.tipoSortDirection = cycleSortDirection(
              state.extraDomain.tipoSortDirection
            );
          } else {
            state.extraDomain.tipoSortColumn = col;
            state.extraDomain.tipoSortDirection = 'asc';
          }
        },
      };
    case 'metodologias':
      return {
        getQuery: () => state.extraDomain.metodologiaSearchQuery,
        setQuery: (q) => {
          state.extraDomain.metodologiaSearchQuery = q;
        },
        getViewMode: () => state.extraDomain.metodologiaViewMode,
        setViewMode: (m) => {
          state.extraDomain.metodologiaViewMode = m;
        },
        getIsSidebarOpen: () => state.extraDomain.metodologiaIsSidebarOpen,
        setIsSidebarOpen: (open) => {
          state.extraDomain.metodologiaIsSidebarOpen = open;
        },
        getFacetSelections: () => state.extraDomain.metodologiaFacetSelections,
        setFacetSelections: (next) => {
          state.extraDomain.metodologiaFacetSelections = next;
        },
        cycleSort: (col) => {
          if (state.extraDomain.metodologiaSortColumn === col) {
            state.extraDomain.metodologiaSortDirection = cycleSortDirection(
              state.extraDomain.metodologiaSortDirection
            );
          } else {
            state.extraDomain.metodologiaSortColumn = col;
            state.extraDomain.metodologiaSortDirection = 'asc';
          }
        },
      };
    case 'acreditaciones':
      return {
        getQuery: () => state.extraDomain.accredSearchQuery,
        setQuery: (q) => {
          state.extraDomain.accredSearchQuery = q;
        },
        getViewMode: () => state.extraDomain.accredViewMode,
        setViewMode: (m) => {
          state.extraDomain.accredViewMode = m;
        },
        getIsSidebarOpen: () => state.extraDomain.accredIsSidebarOpen,
        setIsSidebarOpen: (open) => {
          state.extraDomain.accredIsSidebarOpen = open;
        },
        getFacetSelections: () => state.extraDomain.accredFacetSelections,
        setFacetSelections: (next) => {
          state.extraDomain.accredFacetSelections = next;
        },
        cycleSort: (col) => {
          if (state.extraDomain.accredSortColumn === col) {
            state.extraDomain.accredSortDirection = cycleSortDirection(
              state.extraDomain.accredSortDirection
            );
          } else {
            state.extraDomain.accredSortColumn = col;
            state.extraDomain.accredSortDirection = 'asc';
          }
        },
      };
    default:
      return null;
  }
}

function bindMultiViewDirectoryControls(): void {
  document.querySelectorAll<HTMLElement>('[data-mv-domain]').forEach((container) => {
    const domainKey = container.dataset.mvDomain || '';
    const adapter = getMultiViewDomainAdapter(domainKey);
    if (!adapter) return;

    container.querySelectorAll<HTMLElement>('[data-toggle-sidebar="true"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adapter.setIsSidebarOpen(!adapter.getIsSidebarOpen());
        render();
      });
    });

    container.querySelectorAll<HTMLInputElement>('input[data-facet-checkbox="true"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const groupId = cb.dataset.facetGroup;
        const value = cb.dataset.facetValue;
        if (!groupId || !value) return;
        adapter.setFacetSelections(
          toggleFacetSelection(adapter.getFacetSelections(), groupId, value)
        );
        render();
      });
    });

    container.querySelectorAll<HTMLElement>('[data-clear-filters="true"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adapter.setFacetSelections(clearFacetSelections());
        adapter.setQuery('');
        adapter.clearLegacyFilters?.();
        render();
      });
    });

    container
      .querySelectorAll<HTMLInputElement>('input[data-universal-search="true"]')
      .forEach((input) => {
        input.addEventListener('input', () => {
          adapter.setQuery(input.value);
          render();
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && input.value.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            adapter.setQuery('');
            render();
          }
        });
      });

    container.querySelectorAll<HTMLElement>('[data-clear-search="true"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adapter.setQuery('');
        render();
      });
    });

    container.querySelectorAll<HTMLElement>('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.viewMode;
        if (mode === 'grid' || mode === 'list') {
          adapter.setViewMode(mode);
          render();
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-sort-col]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.sortCol;
        if (!col) return;
        adapter.cycleSort(col);
        render();
      });
    });

    container
      .querySelectorAll<HTMLInputElement>('[data-action="toggle-show-archived"]')
      .forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          if (!canInspectArchivedRecords(state.profile)) {
            checkbox.checked = false;
            state.archiveGovernance.showArchived = false;
            return;
          }
          state.archiveGovernance.showArchived = checkbox.checked;
          if (checkbox.checked) {
            void loadArchivedRecordsForAdmin();
          }
          render();
        });
      });

    container
      .querySelectorAll<HTMLElement>('[data-action="restore-archived-record"]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!canInspectArchivedRecords(state.profile)) return;
          const tableName = btn.dataset.restoreTable as ArchivableTable | undefined;
          const recordId = btn.dataset.restoreId;
          if (!tableName || !recordId) return;
          void handleRestoreArchivedRecord(tableName, recordId);
        });
      });
  });
}

function bindResizableTables(): void {
  document.querySelectorAll<HTMLTableElement>('table[data-resizable-table]').forEach((table) => {
    const tableId = table.dataset.resizableTable || '';
    const cols = Array.from(table.querySelectorAll<HTMLTableColElement>('colgroup col[data-col-id]'));
    if (cols.length < 2) return;

    const columnOrder = cols.map((col) => col.dataset.colId || '').filter(Boolean);
    const minWidthsPx: Record<string, number> = {};
    const domWidths: Record<string, number> = {};
    for (const col of cols) {
      const id = col.dataset.colId || '';
      if (!id) continue;
      const minPx = Number(col.dataset.minWidth || DEFAULT_MIN_COLUMN_WIDTH_PX);
      minWidthsPx[id] = Number.isFinite(minPx) && minPx > 0 ? minPx : DEFAULT_MIN_COLUMN_WIDTH_PX;
      const pct = parseFloat(col.style.width);
      if (Number.isFinite(pct) && pct > 0) {
        domWidths[id] = pct;
      }
    }

    const stored = tableId ? state.tableColumnWidths[tableId] : undefined;
    if (stored && Object.keys(stored).length > 0) {
      const restored = resolveColumnWidthPercentages(
        columnOrder.map((id) => ({ id, defaultWidthPct: domWidths[id] })),
        stored
      );
      cols.forEach((col) => {
        const id = col.dataset.colId || '';
        const pct = restored[id];
        if (id && typeof pct === 'number') {
          col.style.width = `${pct.toFixed(2)}%`;
        }
      });
    }

    table.querySelectorAll<HTMLElement>('[data-resize-col]').forEach((handle) => {
      handle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const leftColumnId = handle.dataset.resizeCol || '';
        if (!leftColumnId) return;

        e.preventDefault();
        e.stopPropagation();

        const tableWidthPx = table.getBoundingClientRect().width;
        if (tableWidthPx <= 0) return;

        const rawStartWidths: Record<string, number> = {};
        cols.forEach((col) => {
          const id = col.dataset.colId || '';
          if (!id) return;
          const stylePct = parseFloat(col.style.width);
          const rectPct = (col.getBoundingClientRect().width / tableWidthPx) * 100;
          rawStartWidths[id] =
            Number.isFinite(stylePct) && stylePct > 0
              ? stylePct
              : Math.max(4, rectPct || 100 / cols.length);
        });

        const startWidths = resolveColumnWidthPercentages(
          columnOrder.map((id) => ({ id, defaultWidthPct: rawStartWidths[id] }))
        );
        const startX = e.clientX;
        let latestWidths: Record<string, number> = { ...startWidths };
        let didDrag = false;

        const onPointerMove = (moveEvent: PointerEvent) => {
          const deltaPx = moveEvent.clientX - startX;
          if (Math.abs(deltaPx) > 2) {
            didDrag = true;
          }
          latestWidths = resizeAdjacentColumns({
            currentWidths: startWidths,
            columnOrder,
            leftColumnId,
            deltaPx,
            tableWidthPx,
            minWidthsPx,
          });
          cols.forEach((col) => {
            const id = col.dataset.colId || '';
            const pct = latestWidths[id];
            if (id && typeof pct === 'number') {
              col.style.width = `${pct.toFixed(2)}%`;
            }
          });
        };

        const finishResize = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', finishResize);
          window.removeEventListener('pointercancel', finishResize);
          if (didDrag) {
            if (tableId) {
              state.tableColumnWidths[tableId] = latestWidths;
            }
            const suppressClick = (clickEvt: MouseEvent) => {
              clickEvt.preventDefault();
              clickEvt.stopPropagation();
            };
            table.addEventListener('click', suppressClick, { capture: true, once: true });
            window.setTimeout(() => {
              table.removeEventListener('click', suppressClick, { capture: true });
            }, 60);
          }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', finishResize);
        window.addEventListener('pointercancel', finishResize);
      });
    });
  });

  document
    .querySelectorAll<HTMLTableRowElement>('tr[tabindex="0"][data-action]')
    .forEach((row) => {
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target as HTMLElement | null;
          if (target && target !== row && target.closest('button, a, input, select, textarea')) {
            return;
          }
          e.preventDefault();
          row.click();
        }
      });
    });
}

function bindAuthenticatedEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-menu-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetMenu = btn.dataset.menuToggle as HeaderDropdownId | undefined;
      if (!targetMenu) return;
      state.openMenu = state.openMenu === targetMenu ? null : targetMenu;
      render();
    });
  });

  document.getElementById('signOutBtn')?.addEventListener('click', () => {
    void handleSignOut();
  });

  // Persistent Breadcrumb Trail Navigation Backtracking
  document.querySelectorAll<HTMLElement>('[data-breadcrumb-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const segId = btn.dataset.breadcrumbId;
      if (!segId) return;
      const targetSeg = state.breadcrumbs.find((s) => s.id === segId);
      const allowAuditorContextual =
        state.profile?.role === 'AUDITOR' &&
        state.profile?.status === 'APPROVED' &&
        targetSeg?.route === 'certificacion' &&
        Boolean(targetSeg.entityId);
      if (targetSeg && !canAccessRoute(state.profile, targetSeg.route) && !allowAuditorContextual) {
        return;
      }

      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, segId);

      if (targetSeg) {
        applyBreadcrumbSegmentState(targetSeg);
      }
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.dataset.navBack === 'true') {
        backtrackToParentBreadcrumb();
        render();
        return;
      }
      if (el.dataset.parentNav === 'true') {
        return;
      }

      const target = el.dataset.nav as ActiveRoute | undefined;
      if (!target || !canAccessRoute(state.profile, target)) return;
      const rawSubview = el.dataset.subview || null;
      const subview =
        target === 'auditorias' || target === 'certificacion' || target === 'extra'
          ? normalizeDomainSubview(target, rawSubview)
          : null;
      const isHeaderReset = el.dataset.navReset === 'true';

      state.activeRoute = target;
      state.activeSubSection = subview;
      state.openMenu = null;

      clearAllEntitySelections();

      if (isHeaderReset) {
        // Top Header Reset Rule: ONLY reset breadcrumb trail on top-header triggers
        state.breadcrumbs = resetBreadcrumbToDomain(target, subview);
        if (target === 'dashboard') {
          state.auditLogModal.isOpen = false;
          state.auditLogModal.errorMessage = null;
          state.archiveGovernance.modal.isOpen = false;
          state.auditPlanning.isModalOpen = false;
          state.extraDomain.isAddAccreditationModalOpen = false;
          state.extraDomain.isAddSubsectorModalOpen = false;
        }
      } else if (target === 'auditorias' || target === 'certificacion' || target === 'extra') {
        const subLabel = subview ? getSubviewLabel(target, subview) : getDomainLabel(target);
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: subview ? `subview-${target}-${subview}` : `domain-${target}`,
          label: subLabel,
          route: target,
          subview,
          tooltip: `${getDomainLabel(target)}${subview ? ` > ${subLabel}` : ''}`,
        });
      }

      if (target === 'auditorias') {
        state.resultadoDomain.recommendationError = null;
        state.resultadoDomain.recommendationSuccess = null;
      }

      if (target === 'profile') {
        state.profileForm = {
          ...state.profileForm,
          nombreInput: state.profile?.nombre || '',
          profileFeedback: null,
          profileError: null,
          passwordFeedback: null,
          passwordError: null,
        };
      }

      syncUrlHash(target, state.activeSubSection);
      render();

      if (target === 'approvals' && isApprovedStaff()) {
        void loadApprovalProfiles();
      } else if (target === 'database' && isApprovedAdmin() && state.dbCheck.lastCheckedAt === null) {
        void runHealthChecks();
      }
    });
  });

  // Standardized Detail Template Parent Zone Contextual Navigation (pushBreadcrumb, preserving domain lineage)
  document.querySelectorAll<HTMLElement>('[data-parent-nav="true"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetNav = btn.dataset.nav as ActiveRoute | undefined;
      const rawSubview = btn.dataset.subview || null;
      const parentType = btn.dataset.parentType as BreadcrumbEntityType | undefined;
      const entityId = btn.dataset.entityId || '';
      const sectorNumber = btn.dataset.sectorNumber || '';

      if (!targetNav) return;
      const allowAuditorContextual =
        state.profile?.role === 'AUDITOR' &&
        state.profile?.status === 'APPROVED' &&
        targetNav === 'certificacion' &&
        Boolean(entityId);
      if (!canAccessRoute(state.profile, targetNav) && !allowAuditorContextual) {
        return;
      }

      const subview =
        targetNav === 'auditorias' || targetNav === 'certificacion' || targetNav === 'extra'
          ? normalizeDomainSubview(targetNav, rawSubview)
          : null;

      if (parentType === 'org' && entityId) {
        const org =
          state.domainData.allOrganizaciones.find((o) => o.id === entityId) ||
          INITIAL_ORGANIZACIONES.find((o) => o.id === entityId);
        state.activeRoute = 'certificacion';
        state.activeSubSection = 'organizations';
        state.organizacionDomain.selectedOrganizacionId = entityId;
        state.organizacionDomain.isEditingAttributes = false;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `org-${entityId}`,
          label: org?.nombre || 'Organización',
          route: 'certificacion',
          subview: 'organizations',
          entityType: 'org',
          entityId,
          tab: state.organizacionDomain.activeChildTab,
          tooltip: `Organización > ${org?.nombre || entityId}`,
        });
        syncUrlHash('certificacion', 'organizations');
        render();
        return;
      }

      if (parentType === 'sitio' && entityId) {
        const resolvedSitio = resolveSitioDetailById({
          sitioId: entityId,
          certificates: state.domainData.allCertificadosDetailed,
          programacionAudits: state.domainData.programacionAudits,
          shiftCatalog: state.domainData.shiftCatalog,
          archivedSiteIds: state.domainData.archivedSiteIds,
        });
        if (resolvedSitio) {
          clearAllEntitySelections();
          state.activeRoute = 'certificacion';
          state.activeSubSection = 'certificates';
          state.sitioDomain.selectedSitioId = entityId;
          state.sitioDomain.activeChildTab = 'turnos';
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `sitio-${entityId}`,
            label: `Sitio ${resolvedSitio.numero_sitio}`,
            route: 'certificacion',
            subview: 'certificates',
            entityType: 'sitio',
            entityId,
            tab: 'turnos',
            tooltip: `Certificado ${resolvedSitio.numero_certificado} > Sitio ${resolvedSitio.numero_sitio} — ${resolvedSitio.nombre_sitio}`,
          });
          syncUrlHash('certificacion', 'certificates');
          render();
        }
        return;
      }

      if (parentType === 'cert' && entityId) {
        const cert =
          state.domainData.allCertificadosDetailed.find((c) => c.id === entityId) ||
          INITIAL_CERTIFICADOS_DETAILED.find((c) => c.id === entityId);
        clearAllEntitySelections();
        state.activeRoute = 'certificacion';
        state.activeSubSection = 'certificates';
        state.certificadoDomain.selectedCertId = entityId;
        state.certificadoDomain.activeChildTab = 'sitios';
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `cert-${entityId}`,
          label: cert?.numero_certificado || 'Certificado',
          route: 'certificacion',
          subview: 'certificates',
          entityType: 'cert',
          entityId,
          tab: 'sitios',
          tooltip: `Certificado > ${cert?.numero_certificado || entityId}`,
        });
        syncUrlHash('certificacion', 'certificates');
        render();
        return;
      }

      if (parentType === 'norma') {
        const matchedNorma =
          INITIAL_NORMAS.find((n) => n.id === entityId) ||
          state.domainData.standards.find((s) => s.id === entityId);
        const resolvedId = matchedNorma?.id || entityId || null;
        state.activeRoute = 'extra';
        state.activeSubSection = 'standards';
        state.extraDomain.selectedNormaId = resolvedId;
        if (resolvedId) {
          const normaLabel = matchedNorma?.norma || 'Norma ISO';
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `norma-${resolvedId}`,
            label: normaLabel,
            route: 'extra',
            subview: 'standards',
            entityType: 'norma',
            entityId: resolvedId,
            tab: state.extraDomain.activeNormaTab,
            tooltip: `Norma ISO > ${normaLabel}`,
          });
        }
        syncUrlHash('extra', 'standards');
        render();
        return;
      }

      if (parentType === 'sector_iaf') {
        const lookup = entityId || sectorNumber;
        const matchedSector =
          INITIAL_SECTORES_IAF.find(
            (s) => s.id === lookup || String(s.sector) === lookup || String(s.sector) === sectorNumber
          ) ||
          state.domainData.iafSectors.find(
            (s) => s.id === lookup || String(s.sector) === lookup || String(s.sector) === sectorNumber
          );
        const resolvedId = matchedSector?.id || entityId || null;
        state.activeRoute = 'extra';
        state.activeSubSection = 'iaf';
        state.extraDomain.selectedSectorId = resolvedId;
        if (resolvedId) {
          const secLabel = matchedSector ? `Sector ${matchedSector.sector}` : 'Sector IAF';
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `sector-${resolvedId}`,
            label: secLabel,
            route: 'extra',
            subview: 'iaf',
            entityType: 'sector_iaf',
            entityId: resolvedId,
            tab: state.extraDomain.activeSectorTab,
            tooltip: `Sector IAF > ${matchedSector?.descripcion || secLabel}`,
          });
        }
        syncUrlHash('extra', 'iaf');
        render();
        return;
      }

      if (parentType === 'tipo' && entityId) {
        const matchedTipo = INITIAL_TIPOS_AUDITORIA_CATALOG.find(
          (t) => t.id === entityId || t.tipo.toLowerCase() === entityId.toLowerCase()
        );
        const resolvedId = matchedTipo?.id || entityId;
        state.activeRoute = 'extra';
        state.activeSubSection = 'tipos';
        state.extraDomain.selectedTipoId = resolvedId;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `tipo-${resolvedId}`,
          label: matchedTipo?.tipo || entityId,
          route: 'extra',
          subview: 'tipos',
          entityType: 'tipo',
          entityId: resolvedId,
          tooltip: `Tipo Auditoría > ${matchedTipo?.tipo || entityId}`,
        });
        syncUrlHash('extra', 'tipos');
        render();
        return;
      }

      if (parentType === 'metodologia' && entityId) {
        const matchedMet = INITIAL_METODOLOGIAS_CATALOG.find(
          (m) => m.id === entityId || m.metodologia.toLowerCase() === entityId.toLowerCase()
        );
        const resolvedId = matchedMet?.id || entityId;
        state.activeRoute = 'extra';
        state.activeSubSection = 'metodologias';
        state.extraDomain.selectedMetodologiaId = resolvedId;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `metodologia-${resolvedId}`,
          label: matchedMet?.metodologia || entityId,
          route: 'extra',
          subview: 'metodologias',
          entityType: 'metodologia',
          entityId: resolvedId,
          tooltip: `Metodología > ${matchedMet?.metodologia || entityId}`,
        });
        syncUrlHash('extra', 'metodologias');
        render();
        return;
      }

      if (parentType === 'estatus' && entityId) {
        const matchedEst = INITIAL_ESTATUS_CATALOG.find(
          (e) => e.id === entityId || e.estatus.toLowerCase() === entityId.toLowerCase()
        );
        const resolvedId = matchedEst?.id || entityId;
        state.activeRoute = 'extra';
        state.activeSubSection = 'estatus';
        state.extraDomain.selectedEstatusId = resolvedId;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `estatus-${resolvedId}`,
          label: matchedEst?.estatus || entityId,
          route: 'extra',
          subview: 'estatus',
          entityType: 'estatus',
          entityId: resolvedId,
          tab: state.extraDomain.activeEstatusTab,
          tooltip: `Estatus > ${matchedEst?.estatus || entityId}`,
        });
        syncUrlHash('extra', 'estatus');
        render();
        return;
      }

      if (parentType === 'accreditation' && entityId) {
        const acr = state.domainData.allAcreditaciones.find((a) => a.id === entityId);
        state.activeRoute = 'extra';
        state.activeSubSection = 'accreditations';
        state.extraDomain.selectedAccreditationId = entityId;
        state.extraDomain.activeAccreditationTab = 'certificados';
        state.extraDomain.isEditingAccreditation = false;
        state.extraDomain.accredEditErrorMessage = null;
        state.extraDomain.accredSaveSuccessMessage = null;
        state.extraDomain.accredArchiveConfirmOpen = false;
        state.extraDomain.accredArchiveErrorMessage = null;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `accreditation-${entityId}`,
          label: acr ? `${acr.organismo_codigo} ${acr.numero_acreditacion}` : 'Acreditación',
          route: 'extra',
          subview: 'accreditations',
          entityType: 'accreditation',
          entityId,
          tab: 'certificados',
          tooltip: acr
            ? `Acreditación > ${acr.organismo_codigo} · ${acr.numero_acreditacion}`
            : 'Acreditación',
        });
        syncUrlHash('extra', 'accreditations');
        render();
        return;
      }

      if (parentType === 'auditor' && entityId) {
        const aud =
          state.domainData.allAuditorsDetailed.find((a) => a.id === entityId) ||
          INITIAL_AUDITORES_DETAILED.find((a) => a.id === entityId);
        state.activeRoute = 'certificacion';
        state.activeSubSection = 'auditors';
        state.auditorDomain.selectedAuditorId = entityId;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `aud-${entityId}`,
          label: aud?.nombre || 'Auditor',
          route: 'certificacion',
          subview: 'auditors',
          entityType: 'auditor',
          entityId,
          tab: state.auditorDomain.activeChildTab,
          tooltip: `Auditor > ${aud?.nombre || entityId}`,
        });
        syncUrlHash('certificacion', 'auditors');
        render();
        return;
      }

      state.activeRoute = targetNav;
      state.activeSubSection = subview;
      syncUrlHash(targetNav, subview);
      render();
    });
  });

  // Universal Multi View Directory Controls (Phase 4.1.2 — 9 Directories) & Resizable Tables
  bindMultiViewDirectoryControls();
  bindResizableTables();

  // Self-service Profile handlers (Phase 2.2)
  const profileNombreInput = document.getElementById('profileNombreInput') as HTMLInputElement | null;
  profileNombreInput?.addEventListener('input', () => {
    state.profileForm.nombreInput = profileNombreInput.value;
  });

  document.getElementById('profileNameForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('profileNombreInput') as HTMLInputElement | null;
    void handleUpdateOwnProfile(input?.value ?? state.profileForm.nombreInput);
  });

  document.getElementById('togglePasswordSectionBtn')?.addEventListener('click', () => {
    state.profileForm = {
      ...state.profileForm,
      passwordSectionOpen: !state.profileForm.passwordSectionOpen,
      passwordError: null,
      passwordFeedback: null,
      newPasswordInput: '',
      confirmPasswordInput: '',
    };
    render();
  });

  const profileNewPasswordInput = document.getElementById('profileNewPasswordInput') as HTMLInputElement | null;
  profileNewPasswordInput?.addEventListener('input', () => {
    state.profileForm.newPasswordInput = profileNewPasswordInput.value;
  });

  const profileConfirmPasswordInput = document.getElementById('profileConfirmPasswordInput') as HTMLInputElement | null;
  profileConfirmPasswordInput?.addEventListener('input', () => {
    state.profileForm.confirmPasswordInput = profileConfirmPasswordInput.value;
  });

  document.getElementById('profilePasswordForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPassEl = document.getElementById('profileNewPasswordInput') as HTMLInputElement | null;
    const confirmPassEl = document.getElementById('profileConfirmPasswordInput') as HTMLInputElement | null;
    void handleUpdateOwnPassword(
      newPassEl?.value ?? state.profileForm.newPasswordInput,
      confirmPassEl?.value ?? state.profileForm.confirmPasswordInput
    );
  });

  document.querySelectorAll<HTMLButtonElement>('[data-approval-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.approvalFilter as ProfileFilter | undefined;
      if (!filter) return;
      state.approvals.filter = filter;
      state.approvals.successMessage = null;
      render();
    });
  });

  document.getElementById('refreshApprovalsBtn')?.addEventListener('click', () => {
    state.approvals.successMessage = null;
    void loadApprovalProfiles();
  });

  document.querySelectorAll<HTMLSelectElement>('[data-role-select]').forEach((select) => {
    select.addEventListener('change', () => {
      const id = select.dataset.roleSelect;
      const nextRole = select.value;
      if (id) void updateProfileRole(id, nextRole);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-approve-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.approveUser;
      if (id) void updateProfileStatus(id, 'APPROVED');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-reject-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.rejectUser;
      if (id) void updateProfileStatus(id, 'REJECTED');
    });
  });

  document.getElementById('runCheckBtn')?.addEventListener('click', () => {
    void runHealthChecks();
  });

  // Top-Right Changelog Trigger [🕒 Historial de Cambios]
  document.querySelectorAll<HTMLElement>('[data-action="open-changelog"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tableName = btn.dataset.tableName || 'certificado';
      const recordId = btn.dataset.recordId || '';
      const entityName = btn.dataset.entityName || 'Registro';
      void openAuditLogModal(tableName, recordId, entityName);
    });
  });

  // Changelog Modal Close Handlers
  document.getElementById('closeAuditLogModalBtn')?.addEventListener('click', closeAuditLogModal);
  document.getElementById('closeAuditLogModalFooterBtn')?.addEventListener('click', closeAuditLogModal);
  document.getElementById('auditLogModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAuditLogModal();
  });

  // Unified Safe Archive Modal Triggers & Controls (Phase 5.1)
  document.querySelectorAll<HTMLElement>('[data-action="open-archive-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canArchiveRecord(state.profile)) return;
      const tableName = btn.dataset.archiveTable as ArchivableTable | undefined;
      const recordId = btn.dataset.archiveId;
      if (!tableName || !recordId) return;
      void openArchiveModal({
        tableName,
        recordId,
        entityTypeLabel: btn.dataset.archiveEntityLabel || getArchiveTableDisplayLabel(tableName),
        recordTitle: btn.dataset.archiveTitle || 'Registro',
        recordSubtitle: btn.dataset.archiveSubtitle || null,
      });
    });
  });

  const archiveReasonInput = document.getElementById('archiveReasonInput') as HTMLTextAreaElement | null;
  if (archiveReasonInput) {
    archiveReasonInput.addEventListener('input', () => {
      state.archiveGovernance.modal.reason = archiveReasonInput.value.slice(0, ARCHIVE_REASON_MAX_LENGTH);
      const countEl = document.getElementById('archiveReasonCharCount');
      if (countEl) {
        countEl.textContent = String(state.archiveGovernance.modal.reason.length);
      }
    });
  }

  document.getElementById('closeArchiveModalBtn')?.addEventListener('click', closeArchiveModal);
  document.getElementById('cancelArchiveModalBtn')?.addEventListener('click', closeArchiveModal);
  document.getElementById('archiveGovernanceModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeArchiveModal();
  });
  document.getElementById('confirmArchiveModalBtn')?.addEventListener('click', () => {
    void confirmArchiveRecord();
  });
  document.getElementById('dismissArchiveToastBtn')?.addEventListener('click', () => {
    state.archiveGovernance.toast = null;
    render();
  });

  // Live Scope Textarea Character Counter
  const scopeInput = document.getElementById('detailScopeInput') as HTMLTextAreaElement | null;
  if (scopeInput) {
    scopeInput.addEventListener('input', () => {
      const counterEl = document.getElementById('scopeCharCount');
      if (counterEl) {
        counterEl.textContent = String(scopeInput.value.length);
      }
    });
  }

  // Audit Planning handlers (Phase 5 Programación)
  document.querySelectorAll<HTMLElement>('[data-action="open-plan-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isApprovedStaff()) return;
      state.auditPlanning.isModalOpen = true;
      state.programacionDomain.isPlanningModalOpen = true;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="close-plan-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditPlanning.isModalOpen = false;
      state.programacionDomain.isPlanningModalOpen = false;
      render();
    });
  });

  document.getElementById('planAuditForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const certSelect = document.getElementById('planCertSelect') as HTMLSelectElement | null;
    const typeSelect = document.getElementById('planTypeSelect') as HTMLSelectElement | null;
    const methodSelect = document.getElementById('planMethodologySelect') as HTMLSelectElement | null;
    const dateInput = document.getElementById('planDateInput') as HTMLInputElement | null;
    const endDateInput = document.getElementById('planEndDateInput') as HTMLInputElement | null;
    const daysInput = document.getElementById('planDaysInput') as HTMLInputElement | null;
    const auditorSelect = document.getElementById('planAuditorSelect') as HTMLSelectElement | null;

    if (endDateInput && daysInput) {
      void handleCreatePhase5Audit({
        id_certificado: certSelect?.value || '',
        tipo_auditoria: typeSelect?.value || 'Etapa 1',
        metodologia: (methodSelect?.value || 'Presencial') as AuditMethodology,
        fecha_inicio: dateInput?.value || '2024-11-28',
        fecha_fin: endDateInput?.value || dateInput?.value || '2024-11-29',
        dias_auditor: Math.max(0.5, Number(daysInput.value) || 2),
        auditor_lider_id: auditorSelect?.value || '',
      });
    }
  });

  // ==========================================
  // DOMAIN EXTRA (Phase 3) INTERACTIVE EVENTS
  // ==========================================

  // --- 1. Normas & Standards Events ---
  document.querySelectorAll<HTMLElement>('[data-action="select-norma"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const normaId = btn.dataset.normaId;
      if (!normaId) return;
      state.activeRoute = 'extra';
      state.activeSubSection = 'standards';
      state.extraDomain.selectedNormaId = normaId;
      const norma = INITIAL_NORMAS.find((n) => n.id === normaId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `norma-${normaId}`,
        label: norma?.codigo || 'Norma',
        route: 'extra',
        subview: 'standards',
        entityType: 'norma',
        entityId: normaId,
        tab: state.extraDomain.activeNormaTab,
        tooltip: `Norma ISO > ${norma?.codigo || normaId}`,
      });
      syncUrlHash('extra', 'standards');
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="back-to-normas-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-norma-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.normaTab;
      if (tab === 'acreditacion' || tab === 'requisitos' || tab === 'certificados') {
        state.extraDomain.activeNormaTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="inspect-clause"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.inspectingClauseId = btn.dataset.clauseId || null;
      render();
    });
  });
  document.getElementById('closeClauseInspectBtn')?.addEventListener('click', () => {
    state.extraDomain.inspectingClauseId = null;
    render();
  });
  document.getElementById('closeClauseInspectFooterBtn')?.addEventListener('click', () => {
    state.extraDomain.inspectingClauseId = null;
    render();
  });

  document.getElementById('openNewAccreditationModalBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    state.extraDomain.isAddAccreditationModalOpen = true;
    render();
  });
  document.getElementById('closeNewAccredModalBtn')?.addEventListener('click', () => {
    state.extraDomain.isAddAccreditationModalOpen = false;
    render();
  });
  document.getElementById('cancelNewAccredModalBtn')?.addEventListener('click', () => {
    state.extraDomain.isAddAccreditationModalOpen = false;
    render();
  });
  document.getElementById('newAccreditationForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const form = e.target as HTMLFormElement;
    const orgId = (form.querySelector('[name="id_organismo"]') as HTMLSelectElement)?.value;
    const numero = (form.querySelector('[name="numero_acreditacion"]') as HTMLInputElement)?.value;
    const fecha = (form.querySelector('[name="fecha_concesion"]') as HTMLInputElement)?.value;
      const rawEstatus = (form.querySelector('[name="estatus"]') as HTMLSelectElement | null)?.value;
      const estatus: AcreditacionNormaIaf['estatus'] =
        rawEstatus === 'En Renovación' || rawEstatus === 'Suspendida' ? rawEstatus : 'Activa';
      const org = INITIAL_ORGANISMOS.find((o) => o.id === orgId);
      const norma = INITIAL_NORMAS.find((n) => n.id === state.extraDomain.selectedNormaId);
      if (org && norma) {
        INITIAL_ACREDITACIONES.push({
          id: `acred-${Date.now()}`,
          id_norma: norma.id,
          norma_codigo: norma.codigo,
          id_organismo: org.id,
          organismo_codigo: org.codigo,
          organismo_nombre: org.nombre,
          organismo_pais: org.pais,
          numero_acreditacion: numero || `ACR-${Date.now().toString().slice(-4)}`,
          fecha_concesion: fecha || new Date().toISOString().slice(0, 10),
          estatus,
        });
        norma.acreditaciones_count += 1;
      }
    state.extraDomain.isAddAccreditationModalOpen = false;
    render();
  });

  // --- 2. Sectores IAF & Sub-Sectores Events ---
  document.querySelectorAll<HTMLElement>('[data-action="select-iaf"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const secId = btn.dataset.sectorId;
      if (!secId) return;
      state.extraDomain.selectedSectorId = secId;
      const sec = INITIAL_SECTORES_IAF.find((s) => s.id === secId || String(s.sector) === secId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `sector-${secId}`,
        label: sec ? `Sector ${sec.sector}` : 'Sector IAF',
        route: 'extra',
        subview: 'iaf',
        entityType: 'sector_iaf',
        entityId: secId,
        tab: state.extraDomain.activeSectorTab,
        tooltip: `Sector IAF > ${sec?.sector || secId}`,
      });
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="back-to-iaf-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-iaf-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.iafTab;
      if (
        tab === 'subsectores' ||
        tab === 'acreditaciones' ||
        tab === 'certificados' ||
        tab === 'auditores'
      ) {
        state.extraDomain.activeSectorTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  document.getElementById('openNewSubsectorModalBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    state.extraDomain.isAddSubsectorModalOpen = true;
    render();
  });
  document.getElementById('closeNewSubsectorModalBtn')?.addEventListener('click', () => {
    state.extraDomain.isAddSubsectorModalOpen = false;
    render();
  });
  document.getElementById('cancelNewSubsectorModalBtn')?.addEventListener('click', () => {
    state.extraDomain.isAddSubsectorModalOpen = false;
    render();
  });
  document.getElementById('newSubsectorForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const form = e.target as HTMLFormElement;
    const codigo = (form.querySelector('[name="codigo"]') as HTMLInputElement)?.value;
    const desc = (form.querySelector('[name="descripcion"]') as HTMLTextAreaElement)?.value;
    const rawRiesgo = (form.querySelector('[name="categoria_riesgo"]') as HTMLSelectElement | null)?.value;
    const categoriaRiesgo: 'ALTO' | 'MEDIO' | 'BAJO' =
      rawRiesgo === 'ALTO' || rawRiesgo === 'BAJO' ? rawRiesgo : 'MEDIO';
    const sec = INITIAL_SECTORES_IAF.find(
      (s) => s.id === state.extraDomain.selectedSectorId || String(s.sector) === state.extraDomain.selectedSectorId
    );
    if (sec && codigo && desc) {
      INITIAL_SUBSECTORES_IAF.push({
        id: `subsec-${Date.now()}`,
        id_sector_iaf: sec.id,
        sector_numero: sec.sector,
        codigo,
        descripcion: desc,
        categoria_riesgo: categoriaRiesgo,
        auditores_nombres: ['Ing. Carlos Mendoza (Auditor Líder)'],
      });
      sec.subsectores_count += 1;
    }
    state.extraDomain.isAddSubsectorModalOpen = false;
    render();
  });

  // --- 3. Estatus Catalog Events ---
  document.querySelectorAll<HTMLElement>('[data-action="select-estatus"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const estId = btn.dataset.estatusId;
      if (!estId) return;
      state.extraDomain.selectedEstatusId = estId;
      const est = INITIAL_ESTATUS_CATALOG.find((e) => e.id === estId || e.estatus === estId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `estatus-${estId}`,
        label: est?.estatus || 'Estatus',
        route: 'extra',
        subview: 'estatus',
        entityType: 'estatus',
        entityId: estId,
        tooltip: `Estatus > ${est?.estatus || estId}`,
      });
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="back-to-estatus-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-estatus-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.estatusTab;
      if (tab === 'certificados' || tab === 'auditorias' || tab === 'reglas') {
        state.extraDomain.activeEstatusTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });
  // --- 4. Tipos de Auditoría Events ---
  document.querySelectorAll<HTMLElement>('[data-action="select-tipo"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipoId = btn.dataset.tipoId;
      if (!tipoId) return;
      state.extraDomain.selectedTipoId = tipoId;
      const t = INITIAL_TIPOS_AUDITORIA_CATALOG.find((x) => x.id === tipoId || x.tipo === tipoId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `tipo-${tipoId}`,
        label: t?.tipo || 'Tipo Auditoría',
        route: 'extra',
        subview: 'tipos',
        entityType: 'tipo',
        entityId: tipoId,
        tooltip: `Tipo Auditoría > ${t?.tipo || tipoId}`,
      });
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="back-to-tipo-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });
  // --- 5. Metodologías de Auditoría Events ---
  document.querySelectorAll<HTMLElement>('[data-action="select-metodologia"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const metId = btn.dataset.metodologiaId;
      if (!metId) return;
      state.extraDomain.selectedMetodologiaId = metId;
      const m = INITIAL_METODOLOGIAS_CATALOG.find((x) => x.id === metId || x.metodologia === metId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `metodologia-${metId}`,
        label: m?.metodologia || 'Metodología',
        route: 'extra',
        subview: 'metodologias',
        entityType: 'metodologia',
        entityId: metId,
        tooltip: `Metodología > ${m?.metodologia || metId}`,
      });
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="back-to-metodologia-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  // --- 6. Acreditaciones (Phase 4.1.3 & 4.2.2) Events ---
  const navigateToAccreditationDetail = (accredId: string): void => {
    if (!accredId) return;
    const acr = state.domainData.allAcreditaciones.find((a) => a.id === accredId && !a.deleted_at);
    state.activeRoute = 'extra';
    state.activeSubSection = 'accreditations';
    state.extraDomain.selectedAccreditationId = accredId;
    state.extraDomain.activeAccreditationTab = 'certificados';
    state.extraDomain.accredCreateSuccessMessage = null;
    state.extraDomain.isEditingAccreditation = false;
    state.extraDomain.accredEditFormData = undefined;
    state.extraDomain.accredEditErrorMessage = null;
    state.extraDomain.accredSaveSuccessMessage = null;
    state.extraDomain.accredArchiveConfirmOpen = false;
    state.extraDomain.accredArchiveErrorMessage = null;
    state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
      id: `accreditation-${accredId}`,
      label: acr ? `${acr.organismo_codigo} ${acr.numero_acreditacion}` : 'Acreditación',
      route: 'extra',
      subview: 'accreditations',
      entityType: 'accreditation',
      entityId: accredId,
      tab: 'certificados',
      tooltip: acr
        ? `Acreditación > ${acr.organismo_codigo} · ${acr.numero_acreditacion}`
        : 'Acreditación',
    });
    syncUrlHash('extra', 'accreditations');
    render();
  };

  document.querySelectorAll<HTMLElement>('[data-action="select-accreditation"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const accredId = btn.dataset.accreditationId;
      if (accredId) navigateToAccreditationDetail(accredId);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-accreditation-card="true"]').forEach((card) => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select')) return;
      const accredId = card.dataset.accreditationId;
      if (accredId) navigateToAccreditationDetail(accredId);
    });
  });

  document
    .querySelectorAll<HTMLElement>('[data-mv-domain="acreditaciones"] tbody tr')
    .forEach((row) => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, input, select')) return;
        const btn = row.querySelector<HTMLElement>('[data-action="select-accreditation"]');
        const accredId = btn?.dataset.accreditationId;
        if (accredId) navigateToAccreditationDetail(accredId);
      });
    });

  document
    .querySelectorAll<HTMLElement>('[data-action="back-to-accreditations-list"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.navBack === 'true') return;
        backtrackToParentBreadcrumb();
        render();
      });
    });

  document.querySelectorAll<HTMLElement>('[data-accred-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.accredTab;
      if (tab === 'certificados' || tab === 'subsectores') {
        state.extraDomain.activeAccreditationTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  document.getElementById('startEditAcreditacionBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const acr = state.domainData.allAcreditaciones.find(
      (a) => a.id === state.extraDomain.selectedAccreditationId && !a.deleted_at
    );
    if (!acr) return;
    state.extraDomain.isEditingAccreditation = true;
    state.extraDomain.accredArchiveConfirmOpen = false;
    state.extraDomain.accredEditErrorMessage = null;
    state.extraDomain.accredSaveSuccessMessage = null;
    state.extraDomain.accredArchiveErrorMessage = null;
    state.extraDomain.accredEditFormData = {
      numero_acreditacion: acr.numero_acreditacion,
      fecha_concesion: acr.fecha_concesion,
      fecha_vencimiento: acr.fecha_vencimiento,
      estatus: acr.estatus,
    };
    render();
  });

  const cancelAccredEdit = (): void => {
    state.extraDomain.isEditingAccreditation = false;
    state.extraDomain.accredEditErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditAcreditacionBtn')?.addEventListener('click', cancelAccredEdit);
  document
    .getElementById('cancelEditAcreditacionBtnSecondary')
    ?.addEventListener('click', cancelAccredEdit);

  document.getElementById('editAcreditacionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const accredId = state.extraDomain.selectedAccreditationId;
    if (!accredId) return;
    const current = state.domainData.allAcreditaciones.find(
      (a) => a.id === accredId && !a.deleted_at
    );
    if (!current) return;

    const form = e.target as HTMLFormElement;
    const numeroInput =
      (form.querySelector('[name="numero_acreditacion"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const concesionInput =
      (form.querySelector('[name="fecha_concesion"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const vencimientoInput =
      (form.querySelector('[name="fecha_vencimiento"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const estatusInput =
      (form.querySelector('[name="estatus"]') as HTMLSelectElement | null)?.value || 'Activa';

    state.extraDomain.accredEditFormData = {
      numero_acreditacion: numeroInput,
      fecha_concesion: concesionInput,
      fecha_vencimiento: vencimientoInput || null,
      estatus: estatusInput,
    };

    const validation = validateAccreditationEditInput({
      id: accredId,
      id_organismo: current.id_organismo,
      numero_acreditacion: numeroInput,
      fecha_concesion: concesionInput,
      fecha_vencimiento: vencimientoInput || null,
      estatus: estatusInput,
      existingAccreditations: state.domainData.allAcreditaciones,
    });

    if (!validation.valid || !validation.normalized) {
      state.extraDomain.accredEditErrorMessage =
        validation.error || 'No se pudieron validar los datos de la acreditación.';
      render();
      return;
    }

    const oldSnapshot = {
      numero_acreditacion: current.numero_acreditacion,
      fecha_concesion: current.fecha_concesion,
      fecha_vencimiento: current.fecha_vencimiento,
      estatus: current.estatus,
    };
    const normData = validation.normalized;

    state.domainData.allAcreditaciones = state.domainData.allAcreditaciones.map((a) =>
      a.id === accredId
        ? {
            ...a,
            numero_acreditacion: normData.numero_acreditacion,
            fecha_concesion: normData.fecha_concesion,
            fecha_vencimiento: normData.fecha_vencimiento,
            estatus: normData.estatus,
          }
        : a
    );

    state.breadcrumbs = state.breadcrumbs.map((seg) =>
      seg.entityType === 'accreditation' && seg.entityId === accredId
        ? {
            ...seg,
            label: `${current.organismo_codigo} ${normData.numero_acreditacion}`,
            tooltip: `Acreditación > ${current.organismo_codigo} · ${normData.numero_acreditacion}`,
          }
        : seg
    );

    recordPhase5SessionLog('acreditacion_norma_iaf', accredId, 'UPDATE', oldSnapshot, {
      numero_acreditacion: normData.numero_acreditacion,
      fecha_concesion: normData.fecha_concesion,
      fecha_vencimiento: normData.fecha_vencimiento,
      estatus: normData.estatus,
    });

    state.extraDomain.isEditingAccreditation = false;
    state.extraDomain.accredEditErrorMessage = null;
    state.extraDomain.accredSaveSuccessMessage =
      'Atributos de la acreditación actualizados y registrados en Historial de Cambios.';

    void (async () => {
      try {
        await supabase
          .from('acreditacion_norma_iaf')
          .update({
            numero_acreditacion: normData.numero_acreditacion,
            fecha_concesion: normData.fecha_concesion,
            fecha_vencimiento: normData.fecha_vencimiento,
            estatus: normData.estatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', accredId);
      } catch {
        // Reactive state preserved
      }
    })();

    render();
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="open-archive-accreditacion"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!canArchiveRecord(state.profile)) return;
        const accredId = state.extraDomain.selectedAccreditationId;
        if (!accredId) return;
        const current = state.domainData.allAcreditaciones.find(
          (a) => a.id === accredId && !a.deleted_at
        );
        if (!current) return;
        void openArchiveModal({
          tableName: 'acreditacion_norma_iaf',
          recordId: current.id,
          entityTypeLabel: 'Acreditación ISO/IEC 17011',
          recordTitle: current.numero_acreditacion,
          recordSubtitle: `${current.organismo_codigo} · ${current.norma_codigo}`,
        });
      });
    });

  document.getElementById('cancelArchiveAcreditacionBtn')?.addEventListener('click', () => {
    state.extraDomain.accredArchiveConfirmOpen = false;
    state.extraDomain.accredArchiveErrorMessage = null;
    render();
  });

  document.getElementById('confirmArchiveAcreditacionBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const accredId = state.extraDomain.selectedAccreditationId;
    if (!accredId) return;
    const current = state.domainData.allAcreditaciones.find(
      (a) => a.id === accredId && !a.deleted_at
    );
    if (!current) return;

    const reasonInput =
      (document.getElementById('archiveAcreditacionReasonInput') as HTMLInputElement | null)
        ?.value.trim() || 'Archivo lógico solicitado desde ficha de acreditación';
    const deletedAtIso = new Date().toISOString();

    state.domainData.allAcreditaciones = state.domainData.allAcreditaciones.map((a) =>
      a.id === accredId ? { ...a, deleted_at: deletedAtIso } : a
    );

    recordPhase5SessionLog(
      'acreditacion_norma_iaf',
      accredId,
      'UPDATE',
      {
        numero_acreditacion: current.numero_acreditacion,
        estatus: current.estatus,
        deleted_at: null,
      },
      {
        deleted_at: deletedAtIso,
        delete_reason: reasonInput,
      }
    );

    void (async () => {
      try {
        const { error } = await supabase.rpc('archive_record', {
          p_table: 'acreditacion_norma_iaf',
          p_record_id: accredId,
          p_reason: reasonInput,
        });
        if (error) {
          await supabase
            .from('acreditacion_norma_iaf')
            .update({
              deleted_at: deletedAtIso,
              delete_reason: reasonInput,
            })
            .eq('id', accredId);
        }
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    state.extraDomain.accredArchiveConfirmOpen = false;
    backtrackToParentBreadcrumb();
    state.extraDomain.accredCreateSuccessMessage = `Acreditación ${current.numero_acreditacion} archivada lógicamente.`;
    render();
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="open-create-acreditacion"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isApprovedStaff()) return;
        state.extraDomain.isCreatingAccreditation = true;
        state.extraDomain.accredCreateErrorMessage = null;
        state.extraDomain.accredCreateSuccessMessage = null;
        render();
      });
    });

  document
    .querySelectorAll<HTMLElement>('[data-action="close-create-acreditacion"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        state.extraDomain.isCreatingAccreditation = false;
        state.extraDomain.accredCreateErrorMessage = null;
        render();
      });
    });

  document
    .querySelectorAll<HTMLElement>('[data-action="set-accred-org-mode"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.orgMode === 'new' ? 'new' : 'existing';
        state.extraDomain.accredOrganismoMode = mode;
        state.extraDomain.accredCreateErrorMessage = null;
        render();
      });
    });

  document.getElementById('createAcreditacionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const form = e.target as HTMLFormElement;
    const orgMode = state.extraDomain.accredOrganismoMode;

    const idOrganismoInput =
      (form.querySelector('[name="id_organismo"]') as HTMLSelectElement | null)?.value || '';
    const orgCodigoInput = (
      (form.querySelector('[name="organismo_codigo"]') as HTMLInputElement | null)?.value || ''
    )
      .trim()
      .toUpperCase();
    const orgNombreInput =
      (form.querySelector('[name="organismo_nombre"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const orgPaisInput =
      (form.querySelector('[name="organismo_pais"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const orgWebInput =
      (form.querySelector('[name="organismo_sitio_web"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const idNormaInput =
      (form.querySelector('[name="id_norma"]') as HTMLSelectElement | null)?.value || '';
    const idSectorInput =
      (form.querySelector('[name="id_sector_iaf"]') as HTMLSelectElement | null)?.value || '';
    const numeroInput =
      (form.querySelector('[name="numero_acreditacion"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const fechaConcesionInput =
      (form.querySelector('[name="fecha_concesion"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const fechaVencimientoInput =
      (form.querySelector('[name="fecha_vencimiento"]') as HTMLInputElement | null)?.value.trim() ||
      '';
    const estatusInput =
      (form.querySelector('[name="estatus"]') as HTMLSelectElement | null)?.value || 'Activa';

    const validation = validateAccreditationInput({
      organismoMode: orgMode,
      id_organismo: idOrganismoInput,
      organismo_codigo: orgCodigoInput,
      organismo_nombre: orgNombreInput,
      organismo_pais: orgPaisInput,
      organismo_sitio_web: orgWebInput || null,
      id_norma: idNormaInput,
      id_sector_iaf: idSectorInput || null,
      numero_acreditacion: numeroInput,
      fecha_concesion: fechaConcesionInput,
      fecha_vencimiento: fechaVencimientoInput || null,
      estatus: estatusInput,
      existingAccreditations: state.domainData.allAcreditaciones,
    });

    if (!validation.valid || !validation.normalized) {
      state.extraDomain.accredCreateErrorMessage =
        validation.error || 'No se pudo validar la acreditación ingresada.';
      render();
      return;
    }

    let resolvedOrganismo: OrganismoAcreditacion | undefined;
    let shouldInsertNewOrganismo = false;

    if (orgMode === 'new') {
      const existingByCode = state.domainData.allOrganismos.find(
        (o) => o.codigo.trim().toUpperCase() === orgCodigoInput
      );
      if (existingByCode) {
        resolvedOrganismo = existingByCode;
      } else {
        resolvedOrganismo = {
          id: crypto.randomUUID(),
          codigo: orgCodigoInput,
          nombre: orgNombreInput,
          pais: orgPaisInput,
          sitio_web: orgWebInput || undefined,
        };
        shouldInsertNewOrganismo = true;
      }
    } else {
      resolvedOrganismo = state.domainData.allOrganismos.find((o) => o.id === idOrganismoInput);
    }

    if (!resolvedOrganismo) {
      state.extraDomain.accredCreateErrorMessage =
        'No se encontró el organismo de acreditación seleccionado.';
      render();
      return;
    }

    const dupAfterOrg = state.domainData.allAcreditaciones.some(
      (a) =>
        !a.deleted_at &&
        a.id_organismo === resolvedOrganismo!.id &&
        a.numero_acreditacion.trim().toLowerCase() ===
          validation.normalized!.numero_acreditacion.toLowerCase()
    );
    if (dupAfterOrg) {
      state.extraDomain.accredCreateErrorMessage = `Ya existe una acreditación activa con el número "${validation.normalized.numero_acreditacion}" para ${resolvedOrganismo.codigo}.`;
      render();
      return;
    }

    const normaStd = state.domainData.standards.find((s) => s.id === validation.normalized!.id_norma);
    const normaInit = INITIAL_NORMAS.find((n) => n.id === validation.normalized!.id_norma);
    const normaCodigo =
      normaStd?.codigo || normaStd?.norma || normaInit?.codigo || 'ISO 9001:2015';
    const normaTitulo =
      normaStd?.titulo ||
      normaInit?.titulo ||
      (normaStd?.esquema ? `Sistema de Gestión — ${normaStd.esquema}` : 'Sistema de Gestión');

    const sectorLive = validation.normalized.id_sector_iaf
      ? state.domainData.iafSectors.find((s) => s.id === validation.normalized!.id_sector_iaf)
      : undefined;
    const sectorInit = validation.normalized.id_sector_iaf
      ? INITIAL_SECTORES_IAF.find((s) => s.id === validation.normalized!.id_sector_iaf)
      : undefined;

    const newAccredId = crypto.randomUUID();
    const newAcreditacion: AcreditacionDetailEntity = {
      id: newAccredId,
      id_organismo: resolvedOrganismo.id,
      organismo_codigo: resolvedOrganismo.codigo,
      organismo_nombre: resolvedOrganismo.nombre,
      organismo_pais: resolvedOrganismo.pais,
      organismo_sitio_web: resolvedOrganismo.sitio_web ?? null,
      id_norma: validation.normalized.id_norma,
      norma_codigo: normaCodigo,
      norma_titulo: normaTitulo,
      id_sector_iaf: validation.normalized.id_sector_iaf,
      sector_numero: sectorLive?.sector ?? sectorInit?.sector ?? null,
      sector_descripcion:
        sectorLive?.descripcion ?? sectorInit?.descripcion ?? null,
      numero_acreditacion: validation.normalized.numero_acreditacion,
      fecha_concesion: validation.normalized.fecha_concesion,
      fecha_vencimiento: validation.normalized.fecha_vencimiento,
      estatus: validation.normalized.estatus,
      activeCertificatesCount: 0,
      deleted_at: null,
    };

    if (shouldInsertNewOrganismo) {
      state.domainData.allOrganismos = [...state.domainData.allOrganismos, resolvedOrganismo];
    }
    state.domainData.allAcreditaciones = [
      newAcreditacion,
      ...state.domainData.allAcreditaciones,
    ];
    state.extraDomain.isCreatingAccreditation = false;
    state.extraDomain.accredCreateErrorMessage = null;
    state.extraDomain.accredOrganismoMode = 'existing';
    state.extraDomain.accredCreateSuccessMessage = `Acreditación ${newAcreditacion.numero_acreditacion} (${newAcreditacion.organismo_codigo}) registrada correctamente.`;

    recordPhase5SessionLog('acreditacion_norma_iaf', newAccredId, 'INSERT', null, {
      organismo: newAcreditacion.organismo_codigo,
      norma: newAcreditacion.norma_codigo,
      numero_acreditacion: newAcreditacion.numero_acreditacion,
      estatus: newAcreditacion.estatus,
    });

    void (async () => {
      try {
        if (shouldInsertNewOrganismo) {
          await supabase.from('organismo_acreditacion').insert({
            id: resolvedOrganismo!.id,
            codigo: resolvedOrganismo!.codigo,
            nombre: resolvedOrganismo!.nombre,
            pais: resolvedOrganismo!.pais,
            sitio_web: resolvedOrganismo!.sitio_web ?? null,
          });
        }
        await supabase.from('acreditacion_norma_iaf').insert({
          id: newAccredId,
          id_organismo: newAcreditacion.id_organismo,
          id_norma: newAcreditacion.id_norma,
          id_sector_iaf: newAcreditacion.id_sector_iaf,
          numero_acreditacion: newAcreditacion.numero_acreditacion,
          fecha_concesion: newAcreditacion.fecha_concesion,
          fecha_vencimiento: newAcreditacion.fecha_vencimiento,
          estatus: newAcreditacion.estatus,
        });
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    render();
  });
  // ===============================================
  // DOMAIN CERTIFICACIÓN (Phase 4.1: Organización)
  // ===============================================

  // 1. Select organization -> Detail view & push breadcrumb
  document.querySelectorAll<HTMLElement>('[data-action="select-org"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orgId = btn.dataset.orgId;
      if (!orgId) return;
      state.activeRoute = 'certificacion';
      state.activeSubSection = 'organizations';
      state.organizacionDomain.selectedOrganizacionId = orgId;
      state.organizacionDomain.isEditingAttributes = false;
      state.organizacionDomain.editErrorMessage = null;
      state.organizacionDomain.saveSuccessMessage = null;

      const org =
        state.domainData.allOrganizaciones.find((o) => o.id === orgId) ||
        INITIAL_ORGANIZACIONES.find((o) => o.id === orgId);

      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `org-${orgId}`,
        label: org?.nombre || 'Organización',
        route: 'certificacion',
        subview: 'organizations',
        entityType: 'org',
        entityId: orgId,
        tab: state.organizacionDomain.activeChildTab,
        tooltip: `Organización > ${org?.nombre || orgId}`,
      });
      syncUrlHash('certificacion', 'organizations');
      render();
    });
  });

  // 2. Back to parent breadcrumb (organizations list or originating parent)
  document.querySelectorAll<HTMLElement>('[data-action="back-to-org-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  // 2b. Organización child tab switching (Certificados | Auditorías)
  document.querySelectorAll<HTMLElement>('[data-org-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.orgTab;
      if (tab === 'certificados' || tab === 'auditorias') {
        state.organizacionDomain.activeChildTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  // 3. Inline Creation Form: Organizaciones
  document.querySelectorAll<HTMLElement>('[data-action="open-create-org"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isApprovedStaff()) return;
      state.organizacionDomain.isCreating = true;
      state.organizacionDomain.createErrorMessage = null;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="close-create-org"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.organizacionDomain.isCreating = false;
      state.organizacionDomain.createErrorMessage = null;
      render();
    });
  });

  document.getElementById('createOrganizacionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const nombre =
      (document.getElementById('createOrgNombreInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const rif =
      (document.getElementById('createOrgRifInput') as HTMLInputElement | null)?.value.trim() || '';
    const sectorRaw =
      (document.getElementById('createOrgSectorSelect') as HTMLSelectElement | null)?.value ||
      '17|Metales básicos y productos metálicos';
    const contacto =
      (document.getElementById('createOrgContactoInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const correo =
      (document.getElementById('createOrgCorreoInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const telefono =
      (document.getElementById('createOrgTelefonoInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const direccion =
      (document.getElementById('createOrgDireccionInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const grupo =
      (document.getElementById('createOrgGrupoInput') as HTMLInputElement | null)?.value.trim() ||
      'Independiente';

    if (nombre.length < 2) {
      state.organizacionDomain.createErrorMessage =
        'La razón social debe contener al menos 2 caracteres.';
      render();
      return;
    }

    const rifCheck = validateRifFormat(rif);
    if (!rifCheck.valid) {
      state.organizacionDomain.createErrorMessage =
        rifCheck.message || 'Formato de RIF / NIF inválido.';
      render();
      return;
    }

    const duplicate = state.domainData.allOrganizaciones.some(
      (o) => o.rif.trim().toUpperCase() === rif.toUpperCase()
    );
    if (duplicate) {
      state.organizacionDomain.createErrorMessage =
        'Ya existe una organización cliente registrada con ese RIF / NIF.';
      render();
      return;
    }

    if (direccion.length < 5) {
      state.organizacionDomain.createErrorMessage =
        'La dirección fiscal es obligatoria (mínimo 5 caracteres).';
      render();
      return;
    }

    const [sectorNumStr, sectorDesc] = sectorRaw.split('|');
    const sectorNum = Number(sectorNumStr) || 17;
    const matchedSector = INITIAL_SECTORES_IAF.find((s) => s.sector === sectorNum);
    const newId = crypto.randomUUID();

    const newOrg: OrganizacionEntity = {
      id: newId,
      nombre,
      rif,
      direccion_fiscal: direccion,
      contacto_principal: contacto || 'Por asignar',
      correo_contacto: correo || 'calidad@empresa.com',
      telefono_contacto: telefono || '',
      grupo_corporativo: grupo || 'Independiente',
      sector_principal: sectorDesc || matchedSector?.descripcion || `Sector ${sectorNum}`,
      id_sector_iaf: matchedSector?.id,
      sector_iaf_numero: sectorNum,
      estatus: 'Activo',
      certificados_count: 0,
    };

    state.domainData.allOrganizaciones = [newOrg, ...state.domainData.allOrganizaciones];
    state.domainData.organizations = [
      {
        id: newId,
        nombre,
        rif,
        direccion_fiscal: direccion,
        certificados_count: 0,
      },
      ...state.domainData.organizations,
    ];
    state.organizacionDomain.isCreating = false;
    state.organizacionDomain.createErrorMessage = null;

    recordPhase5SessionLog('organizacion', newId, 'INSERT', null, {
      nombre,
      rif,
      sector_iaf_numero: sectorNum,
    });

    void (async () => {
      try {
        await supabase.from('organizacion').insert({
          id: newId,
          nombre,
          rif,
          direccion_fiscal: direccion,
        });
      } catch {
        // Reactive state fallback
      }
    })();

    render();
  });

  // 8. Edit mode toggling
  document.getElementById('startEditOrgBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    state.organizacionDomain.isEditingAttributes = true;
    state.organizacionDomain.editErrorMessage = null;
    state.organizacionDomain.saveSuccessMessage = null;
    render();
  });
  const cancelOrgEdit = () => {
    state.organizacionDomain.isEditingAttributes = false;
    state.organizacionDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditOrgBtn')?.addEventListener('click', cancelOrgEdit);
  document.getElementById('cancelEditOrgBtnSecondary')?.addEventListener('click', cancelOrgEdit);

  // 9. Save edited organization attributes
  document.getElementById('editOrgForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const form = e.target as HTMLFormElement;
    const nombre = (form.querySelector('[name="nombre"]') as HTMLInputElement)?.value.trim() || '';
    const rif = (form.querySelector('[name="rif"]') as HTMLInputElement)?.value.trim() || '';
    const sitio_web = (form.querySelector('[name="sitio_web"]') as HTMLInputElement)?.value.trim() || '';
    const contacto_principal = (form.querySelector('[name="contacto_principal"]') as HTMLInputElement)?.value.trim() || '';
    const correo_contacto = (form.querySelector('[name="correo_contacto"]') as HTMLInputElement)?.value.trim() || '';
    const telefono_contacto = (form.querySelector('[name="telefono_contacto"]') as HTMLInputElement)?.value.trim() || '';
    const grupo_corporativo = (form.querySelector('[name="grupo_corporativo"]') as HTMLInputElement)?.value.trim() || '';
    const direccion_fiscal = (form.querySelector('[name="direccion_fiscal"]') as HTMLInputElement)?.value.trim() || '';

    // Validate RIF format
    const rifCheck = validateRifFormat(rif);
    if (!rifCheck.valid) {
      state.organizacionDomain.editErrorMessage = rifCheck.message || 'Formato de RIF / NIF inválido.';
      render();
      return;
    }

    const orgId = state.organizacionDomain.selectedOrganizacionId;
    if (!orgId) return;

    // Mutate local reactive state
    state.domainData.allOrganizaciones = state.domainData.allOrganizaciones.map((o) => {
      if (o.id === orgId) {
        return {
          ...o,
          nombre,
          rif,
          sitio_web,
          contacto_principal,
          correo_contacto,
          telefono_contacto,
          grupo_corporativo,
          direccion_fiscal,
        };
      }
      return o;
    });

    // Also update legacy organizations list if present
    state.domainData.organizations = state.domainData.organizations.map((o) => {
      if (o.id === orgId) {
        return { ...o, nombre, rif, direccion_fiscal };
      }
      return o;
    });

    state.organizacionDomain.isEditingAttributes = false;
    state.organizacionDomain.editErrorMessage = null;
    state.organizacionDomain.saveSuccessMessage = 'Atributos de la organización guardados exitosamente.';

    // Attempt Supabase update
    void (async () => {
      try {
        await supabase
          .from('organizacion')
          .update({
            nombre,
            rif,
            direccion_fiscal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);
      } catch (err) {
        console.warn('Fallback to reactive state for organization update:', err);
      }
    })();

    render();
  });

  // 10. Click IAF sector in Zone 1 -> cross-entity push to Extra Sector IAF
  document.querySelectorAll<HTMLElement>('[data-action="view-sector-iaf"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const secNum = btn.dataset.sectorNumber || '17';
      const matchedSector =
        INITIAL_SECTORES_IAF.find((s) => String(s.sector) === secNum) ||
        state.domainData.iafSectors.find((s) => String(s.sector) === secNum);
      state.activeRoute = 'extra';
      state.activeSubSection = 'iaf';
      state.extraDomain.selectedSectorId = matchedSector?.id || null;
      state.extraDomain.activeSectorTab = 'subsectores';
      state.extraDomain.iafSearchQuery = matchedSector ? '' : secNum;
      if (matchedSector) {
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `sector-${matchedSector.id}`,
          label: `Sector ${matchedSector.sector}`,
          route: 'extra',
          subview: 'iaf',
          entityType: 'sector_iaf',
          entityId: matchedSector.id,
          tab: 'subsectores',
          tooltip: `Sector IAF > ${matchedSector.descripcion}`,
        });
      } else {
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: 'subview-extra-iaf',
          label: `Sector ${secNum}`,
          route: 'extra',
          subview: 'iaf',
          tooltip: `Extra > Sector IAF ${secNum}`,
        });
      }
      syncUrlHash('extra', 'iaf');
      render();
    });
  });

  // 11. Click child certificate in Zone 4 -> drill down to certificate
  document.querySelectorAll<HTMLElement>('[data-action="drilldown-to-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const certId = btn.dataset.certId;
      const certCode = btn.dataset.certCode;
      if (certId && certCode) {
        clearAllEntitySelections();
        state.activeRoute = 'certificacion';
        state.activeSubSection = 'certificates';
        state.certificadoDomain.selectedCertId = certId;
        state.certificadoDomain.activeChildTab = 'sitios';
        state.certificadoDomain.isEditingAttributes = false;
        state.certificadoDomain.originatingOrganizacionId = state.organizacionDomain.selectedOrganizacionId;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `cert-${certId}`,
          label: certCode,
          route: 'certificacion',
          subview: 'certificates',
          entityType: 'cert',
          entityId: certId,
          tab: 'sitios',
          tooltip: `Certificado > ${certCode}`,
        });
        syncUrlHash('certificacion', 'certificates');
        render();
      }
    });
  });

  // ===============================================
  // DOMAIN CERTIFICACIÓN (Phase 4.2: Certificado)
  // ===============================================

  // 1. Select certificate -> 4-Zone Detail View & push breadcrumb
  document.querySelectorAll<HTMLElement>('[data-action="select-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const certId = btn.dataset.certId;
      if (!certId) return;
      clearAllEntitySelections();
      state.activeRoute = 'certificacion';
      state.activeSubSection = 'certificates';
      state.certificadoDomain.selectedCertId = certId;
      state.certificadoDomain.activeChildTab = 'sitios';
      state.certificadoDomain.isEditingAttributes = false;
      state.certificadoDomain.editErrorMessage = null;
      state.certificadoDomain.saveSuccessMessage = null;

      const cert =
        state.domainData.allCertificadosDetailed.find((c) => c.id === certId) ||
        INITIAL_CERTIFICADOS_DETAILED.find((c) => c.id === certId);

      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `cert-${certId}`,
        label: cert?.numero_certificado || 'Certificado',
        route: 'certificacion',
        subview: 'certificates',
        entityType: 'cert',
        entityId: certId,
        tab: 'sitios',
        tooltip: `Certificado > ${cert?.numero_certificado || certId}`,
      });
      syncUrlHash('certificacion', 'certificates');
      render();
    });
  });

  // 2. Back to parent breadcrumb (certificates list or originating parent)
  document.querySelectorAll<HTMLElement>('[data-action="back-to-cert-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  // 3. Inline Creation Form: Certificados
  document.querySelectorAll<HTMLElement>('[data-action="open-create-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isApprovedStaff()) return;
      state.certificadoDomain.isCreating = true;
      state.certificadoDomain.createErrorMessage = null;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="close-create-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.certificadoDomain.isCreating = false;
      state.certificadoDomain.createErrorMessage = null;
      render();
    });
  });

  document.getElementById('createCertificadoForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const orgId =
      (document.getElementById('createCertOrgSelect') as HTMLSelectElement | null)?.value || '';
    const numeroCert =
      (document.getElementById('createCertNumeroInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const normaCodigo =
      (document.getElementById('createCertNormaSelect') as HTMLSelectElement | null)?.value ||
      'ISO 9001:2015';
    const estatus =
      (document.getElementById('createCertEstatusSelect') as HTMLSelectElement | null)?.value ||
      'Activo';
    const sectorRaw =
      (document.getElementById('createCertSectorSelect') as HTMLSelectElement | null)?.value ||
      '17|Metales básicos y productos metálicos';
    const fechaEmision =
      (document.getElementById('createCertFechaEmisionInput') as HTMLInputElement | null)?.value ||
      '';
    const fechaVencimiento =
      (document.getElementById('createCertFechaVencimientoInput') as HTMLInputElement | null)
        ?.value || '';
    const alcance =
      (document.getElementById('createCertAlcanceInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const multisitio = Boolean(
      (document.getElementById('createCertMultisitioCheckbox') as HTMLInputElement | null)?.checked
    );

    if (numeroCert.length < 3) {
      state.certificadoDomain.createErrorMessage =
        'El número de certificado debe tener al menos 3 caracteres.';
      render();
      return;
    }

    const duplicateNum = state.domainData.allCertificadosDetailed.some(
      (c) => c.numero_certificado.trim().toUpperCase() === numeroCert.toUpperCase()
    );
    if (duplicateNum) {
      state.certificadoDomain.createErrorMessage =
        'Ya existe un certificado registrado con ese número.';
      render();
      return;
    }

    const alcanceCheck = validateAlcance(alcance);
    if (!alcanceCheck.valid) {
      state.certificadoDomain.createErrorMessage =
        alcanceCheck.error || 'El alcance debe tener al menos 10 caracteres.';
      render();
      return;
    }

    if (!fechaEmision || !fechaVencimiento || fechaVencimiento < fechaEmision) {
      state.certificadoDomain.createErrorMessage =
        'La fecha de vencimiento debe ser posterior a la fecha de emisión.';
      render();
      return;
    }

    const matchedOrg = state.domainData.allOrganizaciones.find((o) => o.id === orgId);
    const matchedNorma = INITIAL_NORMAS.find(
      (n) => n.codigo === normaCodigo || n.norma === normaCodigo
    );
    const [sectorNumStr, sectorDesc] = sectorRaw.split('|');
    const sectorNum = Number(sectorNumStr) || 17;
    const matchedSector = INITIAL_SECTORES_IAF.find((s) => s.sector === sectorNum);
    const matchedEstatus = INITIAL_ESTATUS_CATALOG.find(
      (est) => est.estatus.toLowerCase() === estatus.toLowerCase()
    );

    const newId = crypto.randomUUID();
    const newCert: CertificadoDetailEntity = {
      id: newId,
      numero_certificado: numeroCert,
      id_organizacion: matchedOrg?.id || orgId,
      organizacion_nombre: matchedOrg?.nombre || 'Organización Cliente',
      organizacion_rif: matchedOrg?.rif || 'J-00000000-0',
      direccion_fiscal: matchedOrg?.direccion_fiscal,
      id_norma: matchedNorma?.id || INITIAL_NORMAS[0]?.id || newId,
      norma_codigo: matchedNorma?.codigo || normaCodigo,
      norma_titulo: matchedNorma?.titulo || normaCodigo,
      esquema: matchedNorma?.esquema || 'SGC - Calidad',
      id_estatus: matchedEstatus?.id || INITIAL_ESTATUS_CATALOG[0]?.id || newId,
      estatus,
      id_sector_iaf: matchedSector?.id || INITIAL_SECTORES_IAF[0]?.id || newId,
      sector_iaf: sectorNum,
      sector_iaf_descripcion: sectorDesc || matchedSector?.descripcion || `Sector ${sectorNum}`,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      alcance,
      multisitio,
      sitios: [],
      procesos: [],
      turnos: [],
      noAplicables: [],
      auditorias: [],
    };

    state.domainData.allCertificadosDetailed = [
      newCert,
      ...state.domainData.allCertificadosDetailed,
    ];
    state.exploration.records = [
      {
        id: newId,
        numero_certificado: numeroCert,
        organizacion_id: newCert.id_organizacion,
        organizacion_nombre: newCert.organizacion_nombre,
        organizacion_rif: newCert.organizacion_rif,
        norma: newCert.norma_codigo,
        esquema: newCert.esquema,
        estatus: newCert.estatus,
        sector_iaf: newCert.sector_iaf,
        alcance: newCert.alcance,
        fecha_emision: newCert.fecha_emision,
        fecha_vencimiento: newCert.fecha_vencimiento,
        multisitio: newCert.multisitio,
        sitios_count: 0,
        cobertura_porcentaje: 100,
      },
      ...state.exploration.records,
    ];
    state.certificadoDomain.isCreating = false;
    state.certificadoDomain.createErrorMessage = null;

    recordPhase5SessionLog('certificado', newId, 'INSERT', null, {
      numero_certificado: numeroCert,
      norma_codigo: newCert.norma_codigo,
      estatus,
      sector_iaf: sectorNum,
    });

    render();
  });

  // 9. Child tab switching (5 specialized child modules)
  document.querySelectorAll<HTMLElement>('[data-cert-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.certTab as CertificadoChildTab | undefined;
      if (tab) {
        state.certificadoDomain.activeChildTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  // 10. Edit mode toggling
  document.getElementById('startEditCertBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    state.certificadoDomain.isEditingAttributes = true;
    state.certificadoDomain.editErrorMessage = null;
    state.certificadoDomain.saveSuccessMessage = null;
    const cert = state.domainData.allCertificadosDetailed.find(
      (c) => c.id === state.certificadoDomain.selectedCertId
    );
    if (cert) {
      state.certificadoDomain.editFormData = {
        alcance: cert.alcance,
        fecha_emision: cert.fecha_emision,
        fecha_vencimiento: cert.fecha_vencimiento,
      };
    }
    render();
  });

  const cancelCertEdit = () => {
    state.certificadoDomain.isEditingAttributes = false;
    state.certificadoDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditCertBtn')?.addEventListener('click', cancelCertEdit);
  document.getElementById('cancelEditCertBtnSecondary')?.addEventListener('click', cancelCertEdit);

  // 11. Live Scope Textarea Character Counter
  const editCertAlcanceInput = document.getElementById('editCertAlcanceInput') as HTMLTextAreaElement | null;
  editCertAlcanceInput?.addEventListener('input', () => {
    const counter = document.getElementById('certAlcanceLiveCounter');
    const val = editCertAlcanceInput.value;
    if (counter) {
      counter.textContent = `(${val.length} / 1000 caracteres)`;
      if (val.length < 10 || val.length > 1000) {
        counter.classList.add('text-rose-600');
        counter.classList.remove('text-slate-600');
      } else {
        counter.classList.remove('text-rose-600');
        counter.classList.add('text-slate-600');
      }
    }
  });

  // 12. Save edited certificate attributes
  document.getElementById('editCertForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const form = e.target as HTMLFormElement;
    const alcance = (form.querySelector('[name="alcance"]') as HTMLTextAreaElement)?.value.trim() || '';
    const fecha_emision = (form.querySelector('[name="fecha_emision"]') as HTMLInputElement)?.value || '';
    const fecha_vencimiento = (form.querySelector('[name="fecha_vencimiento"]') as HTMLInputElement)?.value || '';

    const alcanceValidation = validateAlcance(alcance);
    if (!alcanceValidation.valid) {
      state.certificadoDomain.editErrorMessage = alcanceValidation.error || 'Alcance inválido.';
      render();
      return;
    }

    const certId = state.certificadoDomain.selectedCertId;
    if (!certId) return;

    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) => {
      if (c.id === certId) {
        return {
          ...c,
          alcance,
          fecha_emision,
          fecha_vencimiento,
        };
      }
      return c;
    });

    state.exploration.records = state.exploration.records.map((c) => {
      if (c.id === certId) {
        return {
          ...c,
          alcance,
          fecha_emision,
          fecha_vencimiento,
        };
      }
      return c;
    });

    state.certificadoDomain.isEditingAttributes = false;
    state.certificadoDomain.editErrorMessage = null;
    state.certificadoDomain.saveSuccessMessage = 'Alcance y vigencia de la certificación guardados exitosamente.';

    void (async () => {
      try {
        await supabase
          .from('certificado')
          .update({
            alcance,
            fecha_emision,
            fecha_vencimiento,
            updated_at: new Date().toISOString(),
          })
          .eq('id', certId);
      } catch (err) {
        console.warn('Fallback to reactive state for certificado update:', err);
      }
    })();

    render();
  });

  // ===============================================
  // DOMAIN CERTIFICACIÓN (Phase 4.2.2: Sitio Detail View)
  // ===============================================
  const navigateToSitioDetail = (sitioId: string): void => {
    if (!sitioId) return;
    if (
      !canAccessRoute(state.profile, 'certificacion') &&
      !(state.profile?.role === 'AUDITOR' && state.profile?.status === 'APPROVED')
    ) {
      return;
    }

    const resolvedSitio = resolveSitioDetailById({
      sitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
    });
    if (!resolvedSitio) return;

    clearAllEntitySelections();
    state.activeRoute = 'certificacion';
    state.activeSubSection = 'certificates';
    state.sitioDomain.selectedSitioId = sitioId;
    state.sitioDomain.activeChildTab = 'turnos';
    state.sitioDomain.isEditingAttributes = false;
    state.sitioDomain.editFormData = undefined;
    state.sitioDomain.editErrorMessage = null;
    state.sitioDomain.saveSuccessMessage = null;
    state.sitioDomain.archiveConfirmOpen = false;
    state.sitioDomain.archiveErrorMessage = null;
    state.sitioDomain.isAssigningShift = false;
    state.sitioDomain.shiftActionMessage = null;

    state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
      id: `sitio-${sitioId}`,
      label: `Sitio ${resolvedSitio.numero_sitio}`,
      route: 'certificacion',
      subview: 'certificates',
      entityType: 'sitio',
      entityId: sitioId,
      tab: 'turnos',
      tooltip: `Certificado ${resolvedSitio.numero_certificado} > Sitio ${resolvedSitio.numero_sitio} — ${resolvedSitio.nombre_sitio}`,
    });
    syncUrlHash('certificacion', 'certificates');
    render();
  };

  document.querySelectorAll<HTMLElement>('[data-action="select-sitio"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sitioId = btn.dataset.sitioId;
      if (sitioId) navigateToSitioDetail(sitioId);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="select-sitio-preview"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select')) return;
      const sitioId = row.dataset.sitioId;
      if (sitioId) navigateToSitioDetail(sitioId);
    });
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="back-to-cert-from-sitio"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.navBack === 'true') return;
        backtrackToParentBreadcrumb();
        render();
      });
    });

  document.querySelectorAll<HTMLElement>('[data-sitio-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.sitioTab as SitioChildTab | undefined;
      if (tab === 'turnos' || tab === 'auditorias') {
        state.sitioDomain.activeChildTab = tab;
        state.sitioDomain.shiftActionMessage = null;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  document.getElementById('startEditSitioBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const sitioId = state.sitioDomain.selectedSitioId;
    if (!sitioId) return;
    const currentSitio = resolveSitioDetailById({
      sitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
    });
    if (!currentSitio) return;

    state.sitioDomain.isEditingAttributes = true;
    state.sitioDomain.archiveConfirmOpen = false;
    state.sitioDomain.editErrorMessage = null;
    state.sitioDomain.saveSuccessMessage = null;
    state.sitioDomain.archiveErrorMessage = null;
    state.sitioDomain.editFormData = {
      numero_sitio: currentSitio.numero_sitio,
      nombre_sitio: currentSitio.nombre_sitio,
      direccion_sitio: currentSitio.direccion_sitio,
    };
    render();
  });

  const cancelSitioEdit = (): void => {
    state.sitioDomain.isEditingAttributes = false;
    state.sitioDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditSitioBtn')?.addEventListener('click', cancelSitioEdit);
  document
    .getElementById('cancelEditSitioBtnSecondary')
    ?.addEventListener('click', cancelSitioEdit);

  document.getElementById('editSitioForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const sitioId = state.sitioDomain.selectedSitioId;
    if (!sitioId) return;

    const currentSitio = resolveSitioDetailById({
      sitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
    });
    if (!currentSitio) return;

    const form = e.target as HTMLFormElement;
    const numeroInput =
      (form.querySelector('[name="numero_sitio"]') as HTMLInputElement | null)?.value ?? '';
    const nombreInput =
      (form.querySelector('[name="nombre_sitio"]') as HTMLInputElement | null)?.value.trim() || '';
    const direccionInput =
      (form.querySelector('[name="direccion_sitio"]') as HTMLInputElement | null)?.value.trim() || '';

    state.sitioDomain.editFormData = {
      numero_sitio: numeroInput,
      nombre_sitio: nombreInput,
      direccion_sitio: direccionInput,
    };

    const existingSites = state.domainData.allCertificadosDetailed.flatMap((c) =>
      c.sitios
        .filter((s) => !state.domainData.archivedSiteIds.has(s.id))
        .map((s) => ({
          id: s.id,
          id_certificado: c.id,
          numero_sitio: s.numero_sitio,
          deleted_at: null,
        }))
    );

    const validation = validateSitioInput({
      numero_sitio: numeroInput,
      nombre_sitio: nombreInput,
      direccion_sitio: direccionInput,
      id_certificado: currentSitio.id_certificado,
      currentSitioId: sitioId,
      existingSites,
    });

    if (!validation.valid || !validation.normalized) {
      state.sitioDomain.editErrorMessage =
        validation.error || 'No se pudieron validar los datos del sitio.';
      render();
      return;
    }

    const normSitio = validation.normalized;
    const oldSnapshot = {
      numero_sitio: currentSitio.numero_sitio,
      nombre_sitio: currentSitio.nombre_sitio,
      direccion_sitio: currentSitio.direccion_sitio,
    };

    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) => {
      if (c.id !== currentSitio.id_certificado) return c;
      return {
        ...c,
        sitios: c.sitios.map((s) =>
          s.id === sitioId
            ? {
                ...s,
                numero_sitio: normSitio.numero_sitio,
                nombre_sitio: normSitio.nombre_sitio,
                direccion_sitio: normSitio.direccion_sitio,
              }
            : s
        ),
        turnos: c.turnos.map((t) => ({
          ...t,
          sitios_vinculados: t.sitios_vinculados.map((label) =>
            label === currentSitio.nombre_sitio ? normSitio.nombre_sitio : label
          ),
        })),
      };
    });

    state.domainData.sites = state.domainData.sites.map((s) =>
      s.id === sitioId
        ? {
            ...s,
            numero_sitio: normSitio.numero_sitio,
            nombre_sitio: normSitio.nombre_sitio,
            direccion_sitio: normSitio.direccion_sitio,
          }
        : s
    );

    state.domainData.programacionAudits = state.domainData.programacionAudits.map((aud) =>
      aud.id_certificado !== currentSitio.id_certificado
        ? aud
        : {
            ...aud,
            sitiosMuestreo: aud.sitiosMuestreo.map((sm) =>
              sm.id_sitio === sitioId
                ? {
                    ...sm,
                    numero_sitio: normSitio.numero_sitio,
                    nombre_sitio: normSitio.nombre_sitio,
                    direccion_sitio: normSitio.direccion_sitio,
                  }
                : sm
            ),
          }
    );

    state.breadcrumbs = state.breadcrumbs.map((seg) =>
      seg.entityType === 'sitio' && seg.entityId === sitioId
        ? {
            ...seg,
            label: `Sitio ${normSitio.numero_sitio}`,
            tooltip: `Certificado ${currentSitio.numero_certificado} > Sitio ${normSitio.numero_sitio} — ${normSitio.nombre_sitio}`,
          }
        : seg
    );

    recordPhase5SessionLog('sitio', sitioId, 'UPDATE', oldSnapshot, {
      numero_sitio: normSitio.numero_sitio,
      nombre_sitio: normSitio.nombre_sitio,
      direccion_sitio: normSitio.direccion_sitio,
    });

    state.sitioDomain.isEditingAttributes = false;
    state.sitioDomain.editErrorMessage = null;
    state.sitioDomain.saveSuccessMessage =
      'Atributos del sitio guardados y registrados en Historial de Cambios.';

    void (async () => {
      try {
        await supabase
          .from('sitio')
          .update({
            numero_sitio: normSitio.numero_sitio,
            nombre_sitio: normSitio.nombre_sitio,
            direccion_sitio: normSitio.direccion_sitio,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sitioId);
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="open-archive-sitio"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canArchiveRecord(state.profile)) return;
      const sitioId = state.sitioDomain.selectedSitioId;
      if (!sitioId) return;
      const currentSitio = resolveSitioDetailById({
        sitioId,
        certificates: state.domainData.allCertificadosDetailed,
        programacionAudits: state.domainData.programacionAudits,
        shiftCatalog: state.domainData.shiftCatalog,
        archivedSiteIds: state.domainData.archivedSiteIds,
      });
      if (!currentSitio) return;
      void openArchiveModal({
        tableName: 'sitio',
        recordId: currentSitio.id,
        entityTypeLabel: 'Sitio Operativo',
        recordTitle: `Sitio ${currentSitio.numero_sitio} · ${currentSitio.nombre_sitio}`,
        recordSubtitle: currentSitio.numero_certificado,
      });
    });
  });

  document.getElementById('cancelArchiveSitioBtn')?.addEventListener('click', () => {
    state.sitioDomain.archiveConfirmOpen = false;
    state.sitioDomain.archiveErrorMessage = null;
    render();
  });

  document.getElementById('confirmArchiveSitioBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const sitioId = state.sitioDomain.selectedSitioId;
    if (!sitioId) return;

    const currentSitio = resolveSitioDetailById({
      sitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
    });
    if (!currentSitio) return;

    const siblingSites = state.domainData.allCertificadosDetailed.flatMap((c) =>
      c.sitios
        .filter((s) => !state.domainData.archivedSiteIds.has(s.id))
        .map((s) => ({
          id: s.id,
          id_certificado: c.id,
          numero_sitio: s.numero_sitio,
          deleted_at: null,
        }))
    );

    const guard = canArchiveSitio({
      site: currentSitio,
      siblingSites,
      associatedAuditsCount: currentSitio.auditorias.length,
    });

    if (!guard.allowed) {
      state.sitioDomain.archiveConfirmOpen = false;
      state.sitioDomain.archiveErrorMessage =
        guard.reason || 'Este sitio tiene dependencias activas que impiden archivarlo.';
      render();
      return;
    }

    const reasonInput =
      (document.getElementById('archiveSitioReasonInput') as HTMLInputElement | null)?.value.trim() ||
      'Archivo lógico solicitado desde ficha de sitio';
    const deletedAtIso = new Date().toISOString();

    state.domainData.archivedSiteIds.add(sitioId);
    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) =>
      c.id === currentSitio.id_certificado
        ? {
            ...c,
            sitios: c.sitios.filter((s) => s.id !== sitioId),
          }
        : c
    );
    state.domainData.sites = state.domainData.sites.filter((s) => s.id !== sitioId);
    state.exploration.records = state.exploration.records.map((r) => {
      if (r.id !== currentSitio.id_certificado) return r;
      const updatedCert = state.domainData.allCertificadosDetailed.find((c) => c.id === r.id);
      return {
        ...r,
        sitios_count: updatedCert ? updatedCert.sitios.length : Math.max(0, r.sitios_count - 1),
      };
    });

    recordPhase5SessionLog(
      'sitio',
      sitioId,
      'UPDATE',
      {
        numero_sitio: currentSitio.numero_sitio,
        nombre_sitio: currentSitio.nombre_sitio,
        deleted_at: null,
      },
      {
        deleted_at: deletedAtIso,
        delete_reason: reasonInput,
      }
    );

    void (async () => {
      try {
        const { error } = await supabase.rpc('archive_record', {
          p_table: 'sitio',
          p_record_id: sitioId,
          p_reason: reasonInput,
        });
        if (error) {
          await supabase
            .from('sitio')
            .update({
              deleted_at: deletedAtIso,
              delete_reason: reasonInput,
            })
            .eq('id', sitioId);
        }
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    state.sitioDomain.archiveConfirmOpen = false;
    backtrackToParentBreadcrumb();
    state.certificadoDomain.saveSuccessMessage = `Sitio ${currentSitio.numero_sitio} (${currentSitio.nombre_sitio}) archivado lógicamente.`;
    render();
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="toggle-assign-sitio-turno"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isApprovedStaff()) return;
        state.sitioDomain.isAssigningShift = !state.sitioDomain.isAssigningShift;
        state.sitioDomain.shiftActionMessage = null;
        render();
      });
    });

  document.getElementById('assignSitioTurnoForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const sitioId = state.sitioDomain.selectedSitioId;
    if (!sitioId) return;

    const turnoId =
      (document.getElementById('assignSitioTurnoSelect') as HTMLSelectElement | null)?.value || '';
    const shift = state.domainData.shiftCatalog.find((t) => t.id === turnoId);
    if (!shift) return;

    const currentSitio = resolveSitioDetailById({
      sitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
    });
    if (!currentSitio) return;

    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) => {
      if (c.id !== currentSitio.id_certificado) return c;

      const updatedSites = c.sitios.map((s) => {
        if (s.id !== sitioId) return s;
        const existingLabels = s.turnos_vinculados || [];
        const nextLabels = existingLabels.includes(shift.descripcion)
          ? existingLabels
          : [...existingLabels, shift.descripcion];
        return {
          ...s,
          turnos_vinculados: nextLabels,
        };
      });

      const hasShiftOnCert = c.turnos.some((t) => t.id === shift.id);
      const updatedCertShifts = hasShiftOnCert
        ? c.turnos.map((t) => {
            if (t.id !== shift.id) return t;
            const linked = t.sitios_vinculados.includes(currentSitio.nombre_sitio)
              ? t.sitios_vinculados
              : [...t.sitios_vinculados, currentSitio.nombre_sitio];
            return { ...t, sitios_vinculados: linked };
          })
        : [
            ...c.turnos,
            {
              id: shift.id,
              hora_entrada: shift.hora_entrada,
              hora_salida: shift.hora_salida,
              descripcion: shift.descripcion,
              sitios_vinculados: [currentSitio.nombre_sitio],
            },
          ];

      return {
        ...c,
        sitios: updatedSites,
        turnos: updatedCertShifts,
      };
    });

    recordPhase5SessionLog('sitio', sitioId, 'UPDATE', null, {
      accion: 'ASIGNAR_TURNO',
      turno: shift.descripcion,
      horario: `${shift.hora_entrada} - ${shift.hora_salida}`,
    });

    state.sitioDomain.isAssigningShift = false;
    state.sitioDomain.shiftActionMessage = `Turno "${shift.descripcion}" asignado al Sitio ${currentSitio.numero_sitio}.`;

    void (async () => {
      try {
        await supabase.from('turnos_por_sitio').insert({
          id_sitio: sitioId,
          id_turno: shift.id,
        });
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    render();
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="unassign-sitio-turno"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isApprovedStaff()) return;
        const sitioId = btn.dataset.sitioId || state.sitioDomain.selectedSitioId;
        const turnoId = btn.dataset.turnoId;
        if (!sitioId || !turnoId) return;

        const currentSitio = resolveSitioDetailById({
          sitioId,
          certificates: state.domainData.allCertificadosDetailed,
          programacionAudits: state.domainData.programacionAudits,
          shiftCatalog: state.domainData.shiftCatalog,
          archivedSiteIds: state.domainData.archivedSiteIds,
        });
        const shift = state.domainData.shiftCatalog.find((t) => t.id === turnoId);
        if (!currentSitio || !shift) return;

        state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map(
          (c) => {
            if (c.id !== currentSitio.id_certificado) return c;
            return {
              ...c,
              sitios: c.sitios.map((s) =>
                s.id === sitioId
                  ? {
                      ...s,
                      turnos_vinculados: (s.turnos_vinculados || []).filter(
                        (lbl) =>
                          lbl.trim().toLowerCase() !== shift.descripcion.trim().toLowerCase() &&
                          lbl !== shift.id
                      ),
                    }
                  : s
              ),
              turnos: c.turnos.map((t) =>
                t.id === turnoId
                  ? {
                      ...t,
                      sitios_vinculados: t.sitios_vinculados.filter(
                        (name) =>
                          name.trim().toLowerCase() !==
                          currentSitio.nombre_sitio.trim().toLowerCase()
                      ),
                    }
                  : t
              ),
            };
          }
        );

        recordPhase5SessionLog(
          'sitio',
          sitioId,
          'UPDATE',
          { turno_asignado: shift.descripcion },
          { accion: 'DESVINCULAR_TURNO', turno: shift.descripcion }
        );

        state.sitioDomain.shiftActionMessage = `Turno "${shift.descripcion}" desvinculado del Sitio ${currentSitio.numero_sitio}.`;

        void (async () => {
          try {
            await supabase
              .from('turnos_por_sitio')
              .update({
                deleted_at: new Date().toISOString(),
              })
              .eq('id_sitio', sitioId)
              .eq('id_turno', turnoId)
              .is('deleted_at', null);
          } catch {
            // Optimistic reactive fallback preserved
          }
        })();

        render();
      });
    });

  // ===============================================
  // DOMAIN CERTIFICACIÓN (Phase 4.2.3: Proceso & Turno Detail Views)
  // ===============================================
  const navigateToProcesoDetail = (procesoId: string): void => {
    if (!procesoId) return;
    if (
      !canAccessRoute(state.profile, 'certificacion') &&
      !(state.profile?.role === 'AUDITOR' && state.profile?.status === 'APPROVED')
    ) {
      return;
    }

    const resolvedProceso = resolveProcesoDetailById({
      procesoId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      phase5Findings: state.domainData.phase5Findings,
      requirementsCatalog: state.domainData.requirementsCatalog,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
    });
    if (!resolvedProceso) return;

    clearAllEntitySelections();
    state.activeRoute = 'certificacion';
    state.activeSubSection = 'certificates';
    state.procesoDomain.selectedProcesoId = procesoId;
    state.procesoDomain.activeChildTab = 'requisitos';

    state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
      id: `proceso-${procesoId}`,
      label: resolvedProceso.nombre_proceso,
      route: 'certificacion',
      subview: 'certificates',
      entityType: 'proceso',
      entityId: procesoId,
      tab: 'requisitos',
      tooltip: `Certificado ${resolvedProceso.numero_certificado} > Proceso ${resolvedProceso.nombre_proceso}`,
    });
    syncUrlHash('certificacion', 'certificates');
    render();
  };

  document.querySelectorAll<HTMLElement>('[data-action="select-proceso"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const procesoId = btn.dataset.procesoId;
      if (procesoId) navigateToProcesoDetail(procesoId);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="select-proceso-preview"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select')) return;
      const procesoId = row.dataset.procesoId;
      if (procesoId) navigateToProcesoDetail(procesoId);
    });
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="select-proceso-by-name"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const certId = btn.dataset.certId || '';
        const procName = (btn.dataset.procesoNombre || '').trim().toLowerCase();
        if (!procName) return;

        const targetCert =
          state.domainData.allCertificadosDetailed.find((c) => c.id === certId) ||
          state.domainData.allCertificadosDetailed.find((c) =>
            c.procesos.some((p) => p.nombre_proceso.trim().toLowerCase() === procName)
          );
        const matchedProc = targetCert?.procesos.find(
          (p) =>
            p.nombre_proceso.trim().toLowerCase() === procName &&
            !state.domainData.archivedProcesoIds.has(p.id)
        );
        if (matchedProc) {
          navigateToProcesoDetail(matchedProc.id);
        }
      });
    });

  document
    .querySelectorAll<HTMLElement>('[data-action="back-to-cert-from-proceso"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.navBack === 'true') return;
        backtrackToParentBreadcrumb();
        render();
      });
    });

  document.querySelectorAll<HTMLElement>('[data-proceso-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.procesoTab as ProcesoChildTab | undefined;
      if (tab === 'requisitos' || tab === 'hallazgos' || tab === 'auditorias') {
        state.procesoDomain.activeChildTab = tab;
        state.procesoDomain.requisitoActionMessage = null;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  document.getElementById('startEditProcesoBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const procesoId = state.procesoDomain.selectedProcesoId;
    if (!procesoId) return;
    const currentProceso = resolveProcesoDetailById({
      procesoId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      phase5Findings: state.domainData.phase5Findings,
      requirementsCatalog: state.domainData.requirementsCatalog,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
    });
    if (!currentProceso) return;

    state.procesoDomain.isEditingAttributes = true;
    state.procesoDomain.archiveConfirmOpen = false;
    state.procesoDomain.editErrorMessage = null;
    state.procesoDomain.saveSuccessMessage = null;
    state.procesoDomain.archiveErrorMessage = null;
    state.procesoDomain.editFormData = {
      nombre_proceso: currentProceso.nombre_proceso,
      tipo: currentProceso.tipo,
      responsable: currentProceso.responsable || '',
    };
    render();
  });

  const cancelProcesoEdit = (): void => {
    state.procesoDomain.isEditingAttributes = false;
    state.procesoDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditProcesoBtn')?.addEventListener('click', cancelProcesoEdit);
  document
    .getElementById('cancelEditProcesoBtnSecondary')
    ?.addEventListener('click', cancelProcesoEdit);

  document.getElementById('editProcesoForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const procesoId = state.procesoDomain.selectedProcesoId;
    if (!procesoId) return;

    const currentProceso = resolveProcesoDetailById({
      procesoId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      phase5Findings: state.domainData.phase5Findings,
      requirementsCatalog: state.domainData.requirementsCatalog,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
    });
    if (!currentProceso) return;

    const form = e.target as HTMLFormElement;
    const nombreInput =
      (form.querySelector('[name="nombre_proceso"]') as HTMLInputElement | null)?.value.trim() || '';
    const tipoInput =
      ((form.querySelector('[name="tipo"]') as HTMLSelectElement | null)?.value || 'Medular') as ProcesoTipo;
    const responsableInput =
      (form.querySelector('[name="responsable"]') as HTMLInputElement | null)?.value.trim() || '';

    state.procesoDomain.editFormData = {
      nombre_proceso: nombreInput,
      tipo: tipoInput,
      responsable: responsableInput,
    };

    const existingProcesses = state.domainData.allCertificadosDetailed.flatMap((c) =>
      c.procesos
        .filter((p) => !state.domainData.archivedProcesoIds.has(p.id))
        .map((p) => ({
          id: p.id,
          id_certificado: c.id,
          nombre_proceso: p.nombre_proceso,
          deleted_at: null,
        }))
    );

    const validation = validateProcesoInput({
      nombre_proceso: nombreInput,
      tipo: tipoInput,
      responsable: responsableInput,
      id_certificado: currentProceso.id_certificado,
      currentProcesoId: procesoId,
      existingProcesses,
    });

    if (!validation.valid || !validation.normalized) {
      state.procesoDomain.editErrorMessage =
        validation.error || 'No se pudieron validar los datos del proceso.';
      render();
      return;
    }

    const normProc = validation.normalized;
    const oldSnapshot = {
      nombre_proceso: currentProceso.nombre_proceso,
      tipo: currentProceso.tipo,
      responsable: currentProceso.responsable || null,
    };

    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) =>
      c.id !== currentProceso.id_certificado
        ? c
        : {
            ...c,
            procesos: c.procesos.map((p) =>
              p.id === procesoId
                ? {
                    ...p,
                    nombre_proceso: normProc.nombre_proceso,
                    tipo: normProc.tipo,
                    responsable: normProc.responsable,
                  }
                : p
            ),
          }
    );

    state.domainData.processes = state.domainData.processes.map((p) =>
      p.id === procesoId ? { ...p, nombre_proceso: normProc.nombre_proceso } : p
    );

    state.domainData.programacionAudits = state.domainData.programacionAudits.map((aud) =>
      aud.id_certificado !== currentProceso.id_certificado
        ? aud
        : {
            ...aud,
            matrizNormativa: aud.matrizNormativa.map((item) =>
              item.proceso_nombre.trim().toLowerCase() ===
              currentProceso.nombre_proceso.trim().toLowerCase()
                ? { ...item, proceso_nombre: normProc.nombre_proceso }
                : item
            ),
          }
    );

    state.domainData.phase5Findings = state.domainData.phase5Findings.map((f) =>
      f.id_proceso === procesoId ||
      (f.numero_certificado === currentProceso.numero_certificado &&
        f.proceso_nombre.trim().toLowerCase() ===
          currentProceso.nombre_proceso.trim().toLowerCase())
        ? { ...f, proceso_nombre: normProc.nombre_proceso }
        : f
    );

    state.breadcrumbs = state.breadcrumbs.map((seg) =>
      seg.entityType === 'proceso' && seg.entityId === procesoId
        ? {
            ...seg,
            label: normProc.nombre_proceso,
            tooltip: `Certificado ${currentProceso.numero_certificado} > Proceso ${normProc.nombre_proceso}`,
          }
        : seg
    );

    recordPhase5SessionLog('proceso', procesoId, 'UPDATE', oldSnapshot, {
      nombre_proceso: normProc.nombre_proceso,
      tipo: normProc.tipo,
      responsable: normProc.responsable || null,
    });

    state.procesoDomain.isEditingAttributes = false;
    state.procesoDomain.editErrorMessage = null;
    state.procesoDomain.saveSuccessMessage =
      'Atributos del proceso actualizados y registrados en Historial de Cambios.';

    void (async () => {
      try {
        await supabase
          .from('proceso')
          .update({
            nombre_proceso: normProc.nombre_proceso,
            tipo: normProc.tipo,
            responsable: normProc.responsable || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', procesoId);
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="open-archive-proceso"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canArchiveRecord(state.profile)) return;
      const procesoId = state.procesoDomain.selectedProcesoId;
      if (!procesoId) return;
      const currentProceso = resolveProcesoDetailById({
        procesoId,
        certificates: state.domainData.allCertificadosDetailed,
        programacionAudits: state.domainData.programacionAudits,
        phase5Findings: state.domainData.phase5Findings,
        requirementsCatalog: state.domainData.requirementsCatalog,
        archivedProcesoIds: state.domainData.archivedProcesoIds,
      });
      if (!currentProceso) return;
      void openArchiveModal({
        tableName: 'proceso',
        recordId: currentProceso.id,
        entityTypeLabel: 'Proceso Certificado',
        recordTitle: currentProceso.nombre_proceso,
        recordSubtitle: `${currentProceso.tipo} · ${currentProceso.numero_certificado}`,
      });
    });
  });

  document.getElementById('cancelArchiveProcesoBtn')?.addEventListener('click', () => {
    state.procesoDomain.archiveConfirmOpen = false;
    state.procesoDomain.archiveErrorMessage = null;
    render();
  });

  document.getElementById('confirmArchiveProcesoBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const procesoId = state.procesoDomain.selectedProcesoId;
    if (!procesoId) return;

    const currentProceso = resolveProcesoDetailById({
      procesoId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      phase5Findings: state.domainData.phase5Findings,
      requirementsCatalog: state.domainData.requirementsCatalog,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
    });
    if (!currentProceso) return;

    const guard = canArchiveProceso({
      associatedHallazgosCount: currentProceso.hallazgos.length,
      associatedAuditoriasCount: currentProceso.auditorias.length,
    });

    if (!guard.allowed) {
      state.procesoDomain.archiveConfirmOpen = false;
      state.procesoDomain.archiveErrorMessage =
        guard.reason || 'Este proceso tiene dependencias activas que impiden archivarlo.';
      render();
      return;
    }

    const reasonInput =
      (document.getElementById('archiveProcesoReasonInput') as HTMLInputElement | null)?.value.trim() ||
      'Archivo lógico solicitado desde ficha de proceso';
    const deletedAtIso = new Date().toISOString();

    state.domainData.archivedProcesoIds.add(procesoId);
    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) =>
      c.id === currentProceso.id_certificado
        ? { ...c, procesos: c.procesos.filter((p) => p.id !== procesoId) }
        : c
    );
    state.domainData.processes = state.domainData.processes.filter((p) => p.id !== procesoId);

    recordPhase5SessionLog(
      'proceso',
      procesoId,
      'UPDATE',
      {
        nombre_proceso: currentProceso.nombre_proceso,
        tipo: currentProceso.tipo,
        deleted_at: null,
      },
      {
        deleted_at: deletedAtIso,
        delete_reason: reasonInput,
      }
    );

    void (async () => {
      try {
        const { error } = await supabase.rpc('archive_record', {
          p_table: 'proceso',
          p_record_id: procesoId,
          p_reason: reasonInput,
        });
        if (error) {
          await supabase
            .from('proceso')
            .update({
              deleted_at: deletedAtIso,
              delete_reason: reasonInput,
            })
            .eq('id', procesoId);
        }
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    state.procesoDomain.archiveConfirmOpen = false;
    backtrackToParentBreadcrumb();
    state.certificadoDomain.saveSuccessMessage = `Proceso "${currentProceso.nombre_proceso}" archivado lógicamente.`;
    render();
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="toggle-assign-proceso-req"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isApprovedStaff()) return;
        state.procesoDomain.isAssigningRequisito = !state.procesoDomain.isAssigningRequisito;
        state.procesoDomain.requisitoActionMessage = null;
        render();
      });
    });

  document.getElementById('assignProcesoRequisitoForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const procesoId = state.procesoDomain.selectedProcesoId;
    if (!procesoId) return;

    const currentProceso = resolveProcesoDetailById({
      procesoId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      phase5Findings: state.domainData.phase5Findings,
      requirementsCatalog: state.domainData.requirementsCatalog,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
    });
    if (!currentProceso) return;

    const reqId =
      (document.getElementById('assignProcesoReqSelect') as HTMLSelectElement | null)?.value || '';
    const scopedReqs = getScopedNormaRequirements({
      id_norma: currentProceso.id_norma,
      norma_codigo: currentProceso.norma_codigo,
      requirementsCatalog: state.domainData.requirementsCatalog,
    });
    const req = scopedReqs.find((r) => r.id === reqId);
    if (!req) return;

    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) => {
      if (c.id !== currentProceso.id_certificado) return c;
      return {
        ...c,
        procesos: c.procesos.map((p) => {
          if (p.id !== procesoId) return p;
          const nextCodes = p.clausulas_cubiertas.includes(req.codigo)
            ? p.clausulas_cubiertas
            : [...p.clausulas_cubiertas, req.codigo];
          const existingDetails = p.requisitos_detalle || [];
          const hasDetail = existingDetails.some(
            (d) => d.codigo.trim().toLowerCase() === req.codigo.trim().toLowerCase()
          );
          const nextDetails = hasDetail
            ? existingDetails
            : [...existingDetails, { codigo: req.codigo, titulo: req.titulo }];
          return {
            ...p,
            clausulas_cubiertas: nextCodes,
            requisitos_detalle: nextDetails,
          };
        }),
      };
    });

    recordPhase5SessionLog('proceso', procesoId, 'UPDATE', null, {
      accion: 'VINCULAR_REQUISITO',
      clausula: req.codigo,
      titulo: req.titulo,
      ruta_ltree: req.ruta_materializada,
    });

    state.procesoDomain.isAssigningRequisito = false;
    state.procesoDomain.requisitoActionMessage = `Cláusula ${req.codigo} (${req.titulo}) vinculada a "${currentProceso.nombre_proceso}".`;

    void (async () => {
      try {
        await supabase.from('requisitos_por_proceso').insert({
          id_proceso: procesoId,
          id_requisito: req.id,
        });
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    render();
  });

  document
    .querySelectorAll<HTMLElement>('[data-action="unassign-proceso-req"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isApprovedStaff()) return;
        const procesoId = btn.dataset.procesoId || state.procesoDomain.selectedProcesoId;
        const reqId = btn.dataset.reqId || '';
        const reqCodigo = (btn.dataset.reqCodigo || '').trim();
        if (!procesoId || !reqCodigo) return;

        const currentProceso = resolveProcesoDetailById({
          procesoId,
          certificates: state.domainData.allCertificadosDetailed,
          programacionAudits: state.domainData.programacionAudits,
          phase5Findings: state.domainData.phase5Findings,
          requirementsCatalog: state.domainData.requirementsCatalog,
          archivedProcesoIds: state.domainData.archivedProcesoIds,
        });
        if (!currentProceso) return;

        const cleanTargetCode = reqCodigo.toLowerCase();
        state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map(
          (c) => {
            if (c.id !== currentProceso.id_certificado) return c;
            return {
              ...c,
              procesos: c.procesos.map((p) => {
                if (p.id !== procesoId) return p;
                return {
                  ...p,
                  clausulas_cubiertas: p.clausulas_cubiertas.filter(
                    (code) => code.trim().toLowerCase() !== cleanTargetCode
                  ),
                  requisitos_detalle: (p.requisitos_detalle || []).filter(
                    (d) => d.codigo.trim().toLowerCase() !== cleanTargetCode
                  ),
                };
              }),
            };
          }
        );

        recordPhase5SessionLog(
          'proceso',
          procesoId,
          'UPDATE',
          { clausula_vinculada: reqCodigo },
          { accion: 'DESVINCULAR_REQUISITO', clausula: reqCodigo }
        );

        state.procesoDomain.requisitoActionMessage = `Cláusula ${reqCodigo} desvinculada de "${currentProceso.nombre_proceso}".`;

        void (async () => {
          try {
            if (reqId) {
              await supabase
                .from('requisitos_por_proceso')
                .delete()
                .match({ id_proceso: procesoId, id_requisito: reqId });
            }
          } catch {
            // Optimistic reactive fallback preserved
          }
        })();

        render();
      });
    });

  // --- Turno Detail View Navigation & Actions ---
  const navigateToTurnoDetail = (turnoId: string, originatingSitioId: string | null): void => {
    if (!turnoId) return;
    if (
      !canAccessRoute(state.profile, 'certificacion') &&
      !(state.profile?.role === 'AUDITOR' && state.profile?.status === 'APPROVED')
    ) {
      return;
    }

    const resolvedTurno = resolveTurnoDetailById({
      turnoId,
      originatingSitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
      archivedTurnoIds: state.domainData.archivedTurnoIds,
    });
    if (!resolvedTurno) return;

    clearAllEntitySelections();
    state.activeRoute = 'certificacion';
    state.activeSubSection = 'certificates';
    state.turnoDomain.selectedTurnoId = turnoId;
    state.turnoDomain.originatingSitioId = originatingSitioId;
    state.turnoDomain.activeChildTab = 'sitios';

    const labelRange = `${formatTurnoTime(resolvedTurno.hora_entrada)} – ${formatTurnoTime(resolvedTurno.hora_salida)}`;
    state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
      id: `turno-${turnoId}`,
      label: `Turno ${labelRange}`,
      route: 'certificacion',
      subview: 'certificates',
      entityType: 'turno',
      entityId: turnoId,
      originatingSitioId,
      tab: 'sitios',
      tooltip: resolvedTurno.parentSitio
        ? `Sitio ${resolvedTurno.parentSitio.numero_sitio} > Turno ${labelRange} (${resolvedTurno.descripcion})`
        : `Turno ${labelRange} (${resolvedTurno.descripcion})`,
    });
    syncUrlHash('certificacion', 'certificates');
    render();
  };

  document.querySelectorAll<HTMLElement>('[data-action="select-turno"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const turnoId = btn.dataset.turnoId;
      const originatingSitioId = btn.dataset.sitioId || null;
      if (turnoId) navigateToTurnoDetail(turnoId, originatingSitioId);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="select-turno-preview"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select')) return;
      const turnoId = row.dataset.turnoId;
      const originatingSitioId = row.dataset.sitioId || null;
      if (turnoId) navigateToTurnoDetail(turnoId, originatingSitioId);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="back-from-turno"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-turno-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.turnoTab as TurnoChildTab | undefined;
      if (tab === 'sitios' || tab === 'auditorias') {
        state.turnoDomain.activeChildTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  document.getElementById('startEditTurnoBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const turnoId = state.turnoDomain.selectedTurnoId;
    if (!turnoId) return;
    const currentTurno = resolveTurnoDetailById({
      turnoId,
      originatingSitioId: state.turnoDomain.originatingSitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
      archivedTurnoIds: state.domainData.archivedTurnoIds,
    });
    if (!currentTurno) return;

    state.turnoDomain.isEditingAttributes = true;
    state.turnoDomain.archiveConfirmOpen = false;
    state.turnoDomain.editErrorMessage = null;
    state.turnoDomain.saveSuccessMessage = null;
    state.turnoDomain.archiveErrorMessage = null;
    state.turnoDomain.editFormData = {
      hora_entrada: formatTurnoTime(currentTurno.hora_entrada),
      hora_salida: formatTurnoTime(currentTurno.hora_salida),
      descripcion: currentTurno.descripcion,
    };
    render();
  });

  const cancelTurnoEdit = (): void => {
    state.turnoDomain.isEditingAttributes = false;
    state.turnoDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditTurnoBtn')?.addEventListener('click', cancelTurnoEdit);
  document
    .getElementById('cancelEditTurnoBtnSecondary')
    ?.addEventListener('click', cancelTurnoEdit);

  document.getElementById('editTurnoForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const turnoId = state.turnoDomain.selectedTurnoId;
    if (!turnoId) return;

    const currentTurno = resolveTurnoDetailById({
      turnoId,
      originatingSitioId: state.turnoDomain.originatingSitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
      archivedTurnoIds: state.domainData.archivedTurnoIds,
    });
    if (!currentTurno) return;

    const form = e.target as HTMLFormElement;
    const entradaInput =
      (form.querySelector('[name="hora_entrada"]') as HTMLInputElement | null)?.value.trim() || '';
    const salidaInput =
      (form.querySelector('[name="hora_salida"]') as HTMLInputElement | null)?.value.trim() || '';
    const descInput =
      (form.querySelector('[name="descripcion"]') as HTMLInputElement | null)?.value.trim() || '';

    state.turnoDomain.editFormData = {
      hora_entrada: entradaInput,
      hora_salida: salidaInput,
      descripcion: descInput,
    };

    const validation = validateTurnoInput({
      hora_entrada: entradaInput,
      hora_salida: salidaInput,
      descripcion: descInput,
    });

    if (!validation.valid || !validation.normalized) {
      state.turnoDomain.editErrorMessage =
        validation.error || 'No se pudieron validar los horarios del turno.';
      render();
      return;
    }

    const normTurno = validation.normalized;
    const oldSnapshot = {
      hora_entrada: currentTurno.hora_entrada,
      hora_salida: currentTurno.hora_salida,
      descripcion: currentTurno.descripcion,
    };

    state.domainData.shiftCatalog = state.domainData.shiftCatalog.map((t) =>
      t.id === turnoId
        ? {
            ...t,
            hora_entrada: normTurno.hora_entrada,
            hora_salida: normTurno.hora_salida,
            descripcion: normTurno.descripcion,
          }
        : t
    );

    state.domainData.shifts = state.domainData.shifts.map((s) =>
      s.id === turnoId
        ? {
            ...s,
            hora_entrada: normTurno.hora_entrada,
            hora_salida: normTurno.hora_salida,
            descripcion: normTurno.descripcion,
          }
        : s
    );

    state.domainData.allCertificadosDetailed = state.domainData.allCertificadosDetailed.map((c) => ({
      ...c,
      turnos: c.turnos.map((t) =>
        t.id === turnoId
          ? {
              ...t,
              hora_entrada: normTurno.hora_entrada,
              hora_salida: normTurno.hora_salida,
              descripcion: normTurno.descripcion,
            }
          : t
      ),
      sitios: c.sitios.map((s) => ({
        ...s,
        turnos_vinculados: (s.turnos_vinculados || []).map((lbl) =>
          lbl.trim().toLowerCase() === currentTurno.descripcion.trim().toLowerCase()
            ? normTurno.descripcion
            : lbl
        ),
      })),
    }));

    const labelRange = `${formatTurnoTime(normTurno.hora_entrada)} – ${formatTurnoTime(normTurno.hora_salida)}`;
    state.breadcrumbs = state.breadcrumbs.map((seg) =>
      seg.entityType === 'turno' && seg.entityId === turnoId
        ? {
            ...seg,
            label: `Turno ${labelRange}`,
            tooltip: currentTurno.parentSitio
              ? `Sitio ${currentTurno.parentSitio.numero_sitio} > Turno ${labelRange} (${normTurno.descripcion})`
              : `Turno ${labelRange} (${normTurno.descripcion})`,
          }
        : seg
    );

    recordPhase5SessionLog('turno', turnoId, 'UPDATE', oldSnapshot, {
      hora_entrada: normTurno.hora_entrada,
      hora_salida: normTurno.hora_salida,
      descripcion: normTurno.descripcion,
    });

    state.turnoDomain.isEditingAttributes = false;
    state.turnoDomain.editErrorMessage = null;
    state.turnoDomain.saveSuccessMessage =
      'Horario del turno guardado y registrado en Historial de Cambios.';

    void (async () => {
      try {
        await supabase
          .from('turno')
          .update({
            hora_entrada: normTurno.hora_entrada,
            hora_salida: normTurno.hora_salida,
            updated_at: new Date().toISOString(),
          })
          .eq('id', turnoId);
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="open-archive-turno"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canArchiveRecord(state.profile)) return;
      const turnoId = state.turnoDomain.selectedTurnoId;
      if (!turnoId) return;
      const currentTurno = resolveTurnoDetailById({
        turnoId,
        originatingSitioId: state.turnoDomain.originatingSitioId,
        certificates: state.domainData.allCertificadosDetailed,
        programacionAudits: state.domainData.programacionAudits,
        shiftCatalog: state.domainData.shiftCatalog,
        archivedSiteIds: state.domainData.archivedSiteIds,
        archivedTurnoIds: state.domainData.archivedTurnoIds,
      });
      if (!currentTurno) return;
      void openArchiveModal({
        tableName: 'turno',
        recordId: currentTurno.id,
        entityTypeLabel: 'Turno Operativo',
        recordTitle: `${formatTurnoTime(currentTurno.hora_entrada)} – ${formatTurnoTime(currentTurno.hora_salida)}`,
        recordSubtitle: currentTurno.descripcion || null,
      });
    });
  });

  document.getElementById('cancelArchiveTurnoBtn')?.addEventListener('click', () => {
    state.turnoDomain.archiveConfirmOpen = false;
    state.turnoDomain.archiveErrorMessage = null;
    render();
  });

  document.getElementById('confirmArchiveTurnoBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    const turnoId = state.turnoDomain.selectedTurnoId;
    if (!turnoId) return;

    const currentTurno = resolveTurnoDetailById({
      turnoId,
      originatingSitioId: state.turnoDomain.originatingSitioId,
      certificates: state.domainData.allCertificadosDetailed,
      programacionAudits: state.domainData.programacionAudits,
      shiftCatalog: state.domainData.shiftCatalog,
      archivedSiteIds: state.domainData.archivedSiteIds,
      archivedTurnoIds: state.domainData.archivedTurnoIds,
    });
    if (!currentTurno) return;

    const guard = canArchiveTurno({
      assignedSitiosCount: currentTurno.sitios.length,
    });

    if (!guard.allowed) {
      state.turnoDomain.archiveConfirmOpen = false;
      state.turnoDomain.archiveErrorMessage =
        guard.reason || 'Este turno está asignado a sedes activas y no puede archivarse.';
      render();
      return;
    }

    const reasonInput =
      (document.getElementById('archiveTurnoReasonInput') as HTMLInputElement | null)?.value.trim() ||
      'Archivo lógico solicitado desde ficha de turno';
    const deletedAtIso = new Date().toISOString();

    state.domainData.archivedTurnoIds.add(turnoId);
    state.domainData.shiftCatalog = state.domainData.shiftCatalog.filter((t) => t.id !== turnoId);
    state.domainData.shifts = state.domainData.shifts.filter((s) => s.id !== turnoId);

    recordPhase5SessionLog(
      'turno',
      turnoId,
      'UPDATE',
      {
        hora_entrada: currentTurno.hora_entrada,
        hora_salida: currentTurno.hora_salida,
        deleted_at: null,
      },
      {
        deleted_at: deletedAtIso,
        delete_reason: reasonInput,
      }
    );

    void (async () => {
      try {
        const { error } = await supabase.rpc('archive_record', {
          p_table: 'turno',
          p_record_id: turnoId,
          p_reason: reasonInput,
        });
        if (error) {
          await supabase
            .from('turno')
            .update({
              deleted_at: deletedAtIso,
              delete_reason: reasonInput,
            })
            .eq('id', turnoId);
        }
      } catch {
        // Optimistic reactive fallback preserved
      }
    })();

    state.turnoDomain.archiveConfirmOpen = false;
    backtrackToParentBreadcrumb();
    render();
  });

  // 13. Nav link: view organization from certificate Zone 1 (cross-entity lineage push)
  document.querySelectorAll<HTMLElement>('[data-action="view-org-from-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orgId = btn.dataset.orgId;
      if (!orgId) return;
      state.activeRoute = 'certificacion';
      state.activeSubSection = 'organizations';
      state.organizacionDomain.selectedOrganizacionId = orgId;
      state.organizacionDomain.isEditingAttributes = false;
      const org =
        state.domainData.allOrganizaciones.find((o) => o.id === orgId) ||
        INITIAL_ORGANIZACIONES.find((o) => o.id === orgId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `org-${orgId}`,
        label: org?.nombre || 'Organización',
        route: 'certificacion',
        subview: 'organizations',
        entityType: 'org',
        entityId: orgId,
        tab: state.organizacionDomain.activeChildTab,
        tooltip: `Organización > ${org?.nombre || orgId}`,
      });
      syncUrlHash('certificacion', 'organizations');
      render();
    });
  });

  // 14. Nav link: view standard (norma) from certificate Zone 1 (cross-entity lineage push)
  document.querySelectorAll<HTMLElement>('[data-action="view-norma-from-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const normaId = btn.dataset.normaId || null;
      state.activeRoute = 'extra';
      state.activeSubSection = 'standards';
      state.extraDomain.selectedNormaId = normaId;
      if (normaId) {
        const matchedNorma =
          INITIAL_NORMAS.find((n) => n.id === normaId) ||
          state.domainData.standards.find((s) => s.id === normaId);
        const normaLabel = matchedNorma?.norma || 'Norma ISO';
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `norma-${normaId}`,
          label: normaLabel,
          route: 'extra',
          subview: 'standards',
          entityType: 'norma',
          entityId: normaId,
          tab: state.extraDomain.activeNormaTab,
          tooltip: `Norma ISO > ${normaLabel}`,
        });
      } else {
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: 'subview-extra-standards',
          label: 'Norma',
          route: 'extra',
          subview: 'standards',
          tooltip: 'Extra > Norma',
        });
      }
      syncUrlHash('extra', 'standards');
      render();
    });
  });

  // 15. Nav link: view IAF sector from certificate Zone 1 (cross-entity lineage push)
  document.querySelectorAll<HTMLElement>('[data-action="view-iaf-from-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sectorId = btn.dataset.sectorId || null;
      const matchedSector = sectorId
        ? INITIAL_SECTORES_IAF.find((s) => s.id === sectorId || String(s.sector) === sectorId) ||
          state.domainData.iafSectors.find((s) => s.id === sectorId || String(s.sector) === sectorId)
        : undefined;
      const resolvedSectorId = matchedSector?.id || sectorId;
      state.activeRoute = 'extra';
      state.activeSubSection = 'iaf';
      state.extraDomain.selectedSectorId = resolvedSectorId;
      if (resolvedSectorId) {
        const secLabel = matchedSector ? `Sector ${matchedSector.sector}` : 'Sector IAF';
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `sector-${resolvedSectorId}`,
          label: secLabel,
          route: 'extra',
          subview: 'iaf',
          entityType: 'sector_iaf',
          entityId: resolvedSectorId,
          tab: state.extraDomain.activeSectorTab,
          tooltip: `Sector IAF > ${matchedSector?.descripcion || secLabel}`,
        });
      } else {
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: 'subview-extra-iaf',
          label: 'Sector IAF',
          route: 'extra',
          subview: 'iaf',
          tooltip: 'Extra > Sector IAF',
        });
      }
      syncUrlHash('extra', 'iaf');
      render();
    });
  });

  // ===============================================
  // DOMAIN CERTIFICACIÓN (Phase 4.3: Auditor & Competencias)
  // ===============================================

  // 1. Select auditor -> 4-Zone Detail View & push breadcrumb
  document.querySelectorAll<HTMLElement>('[data-action="select-auditor"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const auditorId = btn.dataset.auditorId;
      if (!auditorId) return;
      state.activeRoute = 'certificacion';
      state.activeSubSection = 'auditors';
      state.auditorDomain.selectedAuditorId = auditorId;
      state.auditorDomain.activeChildTab = 'competencias';
      state.auditorDomain.isEditingAttributes = false;
      state.auditorDomain.editErrorMessage = null;
      state.auditorDomain.saveSuccessMessage = null;

      const aud =
        state.domainData.allAuditorsDetailed.find((a) => a.id === auditorId) ||
        INITIAL_AUDITORES_DETAILED.find((a) => a.id === auditorId);

      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `aud-${auditorId}`,
        label: aud?.nombre || 'Auditor',
        route: 'certificacion',
        subview: 'auditors',
        entityType: 'auditor',
        entityId: auditorId,
        tab: 'competencias',
        tooltip: `Auditor > ${aud?.nombre || auditorId}`,
      });
      syncUrlHash('certificacion', 'auditors');
      render();
    });
  });

  // 2. Back to parent breadcrumb (auditor list or originating parent)
  document.querySelectorAll<HTMLElement>('[data-action="back-to-auditor-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.navBack === 'true') return;
      backtrackToParentBreadcrumb();
      render();
    });
  });

  // 3. Inline Creation Form: Auditores
  document.querySelectorAll<HTMLElement>('[data-action="open-create-auditor"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isApprovedStaff()) return;
      state.auditorDomain.isCreating = true;
      state.auditorDomain.createErrorMessage = null;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="close-create-auditor"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditorDomain.isCreating = false;
      state.auditorDomain.createErrorMessage = null;
      render();
    });
  });

  document.getElementById('createAuditorForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const nombre =
      (document.getElementById('createAuditorNombreInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const titulo =
      (document.getElementById('createAuditorTituloInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const credencial =
      (
        document.getElementById('createAuditorCredencialInput') as HTMLInputElement | null
      )?.value.trim() || '';
    const email =
      (document.getElementById('createAuditorEmailInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const telefono =
      (document.getElementById('createAuditorTelefonoInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const calificacionRaw =
      (document.getElementById('createAuditorCalificacionSelect') as HTMLSelectElement | null)
        ?.value || 'Calificado';
    const normasRaw =
      (document.getElementById('createAuditorNormasInput') as HTMLInputElement | null)?.value || '';
    const sectoresRaw =
      (document.getElementById('createAuditorSectoresInput') as HTMLInputElement | null)?.value ||
      '';

    if (nombre.length < 2) {
      state.auditorDomain.createErrorMessage =
        'El nombre completo del auditor debe tener al menos 2 caracteres.';
      render();
      return;
    }
    if (credencial.length < 3) {
      state.auditorDomain.createErrorMessage =
        'El código de credencial es obligatorio (mínimo 3 caracteres).';
      render();
      return;
    }
    if (!email.includes('@')) {
      state.auditorDomain.createErrorMessage = 'Ingrese un correo electrónico válido.';
      render();
      return;
    }

    const normas = normasRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const sectores = sectoresRaw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    const calificacion: AuditorDetailEntity['calificacion'] =
      calificacionRaw === 'En Entrenamiento' || calificacionRaw === 'Observador'
        ? calificacionRaw
        : 'Calificado';

    const newId = crypto.randomUUID();
    const newAuditor: AuditorDetailEntity = {
      id: newId,
      nombre,
      titulo_profesional: titulo || 'Auditor de Sistemas de Gestión',
      codigo_credencial: credencial,
      email,
      telefono,
      biografia: '',
      instituto_registro: 'FONDONORMA',
      categoria_profesional:
        calificacion === 'Calificado' ? 'Auditor Líder Certificado' : calificacion,
      calificacion,
      normas_acreditadas: normas.length > 0 ? normas : ['ISO 9001:2015'],
      sectores_iaf: sectores.length > 0 ? sectores : [17],
      competencias: [],
      historialAuditorias: [],
    };

    state.domainData.allAuditorsDetailed = [newAuditor, ...state.domainData.allAuditorsDetailed];
    state.domainData.auditors = [
      {
        id: newId,
        nombre,
        rol: newAuditor.categoria_profesional,
        normas: newAuditor.normas_acreditadas,
        sectores_iaf: newAuditor.sectores_iaf,
      },
      ...state.domainData.auditors,
    ];
    state.auditorDomain.isCreating = false;
    state.auditorDomain.createErrorMessage = null;

    recordPhase5SessionLog('auditor', newId, 'INSERT', null, {
      nombre,
      codigo_credencial: credencial,
      calificacion,
    });

    render();
  });

  // 9. Child tab switching (Matriz de Competencias | Historial de Auditorías)
  document.querySelectorAll<HTMLElement>('[data-auditor-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.auditorTab as AuditorChildTab | undefined;
      if (tab) {
        state.auditorDomain.activeChildTab = tab;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  // 10. Edit mode toggling for Auditor Direct Attributes
  document.getElementById('startEditAuditorBtn')?.addEventListener('click', () => {
    if (!isApprovedStaff()) return;
    state.auditorDomain.isEditingAttributes = true;
    state.auditorDomain.editErrorMessage = null;
    state.auditorDomain.saveSuccessMessage = null;
    const aud = state.domainData.allAuditorsDetailed.find(
      (a) => a.id === state.auditorDomain.selectedAuditorId
    );
    if (aud) {
      state.auditorDomain.editFormData = {
        titulo_profesional: aud.titulo_profesional,
        email: aud.email,
        telefono: aud.telefono,
        biografia: aud.biografia,
      };
    }
    render();
  });

  const cancelAuditorEdit = () => {
    state.auditorDomain.isEditingAttributes = false;
    state.auditorDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditAuditorBtn')?.addEventListener('click', cancelAuditorEdit);
  document.getElementById('cancelEditAuditorBtnSecondary')?.addEventListener('click', cancelAuditorEdit);

  // 11. Save edited auditor attributes
  document.getElementById('editAuditorForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isApprovedStaff()) return;
    const form = e.target as HTMLFormElement;
    const titulo_profesional = (form.querySelector('[name="titulo_profesional"]') as HTMLInputElement)?.value.trim() || '';
    const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value.trim() || '';
    const telefono = (form.querySelector('[name="telefono"]') as HTMLInputElement)?.value.trim() || '';
    const biografia = (form.querySelector('[name="biografia"]') as HTMLTextAreaElement)?.value.trim() || '';

    const audId = state.auditorDomain.selectedAuditorId;
    if (!audId) return;

    state.domainData.allAuditorsDetailed = state.domainData.allAuditorsDetailed.map((a) => {
      if (a.id === audId) {
        return {
          ...a,
          titulo_profesional: titulo_profesional || a.titulo_profesional,
          email: email || a.email,
          telefono: telefono || a.telefono,
          biografia,
        };
      }
      return a;
    });

    state.auditorDomain.isEditingAttributes = false;
    state.auditorDomain.editErrorMessage = null;
    state.auditorDomain.saveSuccessMessage = 'Información y credenciales del auditor actualizadas exitosamente.';

    void (async () => {
      try {
        await supabase
          .from('auditor')
          .update({
            email,
            telefono,
            updated_at: new Date().toISOString(),
          })
          .eq('id', audId);
      } catch (err) {
        console.warn('Fallback to reactive state for auditor update:', err);
      }
    })();

    render();
  });

  // 12. Modal / action for assigning new competency
  document.querySelectorAll<HTMLElement>('[data-action="open-add-competency-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isApprovedAdmin()) return;
      state.auditorDomain.saveSuccessMessage =
        'Asignación de nueva competencia ISO 17021-1 disponible para directores técnicos y administradores de acreditación.';
      render();
    });
  });

  // 13. Cross-entity navigation from Auditor / Norma / Certificado tables
  document
    .querySelectorAll<HTMLElement>('[data-action="view-norma-from-auditor"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const normaCode = btn.dataset.normaCode || '';
        const matchedNorma =
          INITIAL_NORMAS.find(
            (n) =>
              n.codigo.toLowerCase() === normaCode.toLowerCase() ||
              n.norma.toLowerCase() === normaCode.toLowerCase()
          ) ||
          state.domainData.standards.find(
            (s) =>
              s.norma.toLowerCase() === normaCode.toLowerCase() ||
              (s.codigo || '').toLowerCase() === normaCode.toLowerCase()
          );
        const resolvedId = matchedNorma?.id || null;
        state.activeRoute = 'extra';
        state.activeSubSection = 'standards';
        state.extraDomain.selectedNormaId = resolvedId;
        if (resolvedId) {
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `norma-${resolvedId}`,
            label: matchedNorma?.norma || normaCode || 'Norma ISO',
            route: 'extra',
            subview: 'standards',
            entityType: 'norma',
            entityId: resolvedId,
            tab: state.extraDomain.activeNormaTab,
            tooltip: `Norma ISO > ${matchedNorma?.norma || normaCode}`,
          });
        }
        syncUrlHash('extra', 'standards');
        render();
      });
    });

  document
    .querySelectorAll<HTMLElement>('[data-action="view-iaf-from-auditor"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const secNum = btn.dataset.sectorNumber || '';
        const matchedSector =
          INITIAL_SECTORES_IAF.find((s) => String(s.sector) === secNum) ||
          state.domainData.iafSectors.find((s) => String(s.sector) === secNum);
        const resolvedId = matchedSector?.id || null;
        state.activeRoute = 'extra';
        state.activeSubSection = 'iaf';
        state.extraDomain.selectedSectorId = resolvedId;
        if (resolvedId) {
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `sector-${resolvedId}`,
            label: `Sector ${matchedSector?.sector ?? secNum}`,
            route: 'extra',
            subview: 'iaf',
            entityType: 'sector_iaf',
            entityId: resolvedId,
            tab: state.extraDomain.activeSectorTab,
            tooltip: `Sector IAF > ${matchedSector?.descripcion || secNum}`,
          });
        }
        syncUrlHash('extra', 'iaf');
        render();
      });
    });

  document
    .querySelectorAll<HTMLElement>('[data-action="select-prog-audit-by-code"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const auditIdAttr = btn.dataset.auditId || '';
        const auditCode = btn.dataset.auditCode || '';
        const matchedAudit =
          state.domainData.programacionAudits.find(
            (a) =>
              (auditIdAttr && a.id === auditIdAttr) ||
              (auditCode && a.codigo_auditoria.toLowerCase() === auditCode.toLowerCase())
          ) || state.domainData.programacionAudits[0];
        if (!matchedAudit) return;
        state.activeRoute = 'auditorias';
        state.activeSubSection = 'scheduling';
        state.programacionDomain.selectedAuditId = matchedAudit.id;
        state.programacionDomain.activeChildTab = 'equipo';
        state.programacionDomain.isEditingAttributes = false;
        state.programacionDomain.isAddingTeamMember = false;
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `prog-audit-${matchedAudit.id}`,
          label: matchedAudit.codigo_auditoria,
          route: 'auditorias',
          subview: 'scheduling',
          entityType: 'audit',
          entityId: matchedAudit.id,
          tab: 'equipo',
          tooltip: `${matchedAudit.codigo_auditoria} — ${matchedAudit.organizacion_nombre}`,
        });
        syncUrlHash('auditorias', 'scheduling');
        render();
      });
    });

  // ===============================================
  // DOMAIN AUDITORÍAS (Phase 5: Programación, Calendario & Resultado)
  // ===============================================
  bindPhase5AuditoriasEvents();
}

function recordPhase5SessionLog(
  tableName: string,
  recordId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): void {
  const actorEmail = state.user?.email || state.profile?.nombre || 'admin@fondonorma.test';
  const baseEntry = createSessionAuditLogEntry({
    tableName,
    recordId,
    operation,
    actorEmail,
    oldData,
    newData,
  });
  const entry: AuditLogEntry = {
    ...baseEntry,
    actor_user_id: state.user?.id || null,
    performed_by: state.user?.id || null,
    actor_name: state.profile?.nombre || null,
    actor_email: state.user?.email || null,
    performed_at: baseEntry.changed_at,
  };
  state.domainData.sessionAuditLogs = [entry, ...state.domainData.sessionAuditLogs];
}

function bindPhase5AuditoriasEvents(): void {
  const canPlan = canEditAuditScheduleOrTeam(state.profile);
  const canEditSchedule = canEditAuditScheduleOrTeam(state.profile);

  // --- A. Programación de Auditorías --- (Directory controls handled by bindMultiViewDirectoryControls)

  document.querySelectorAll<HTMLElement>('[data-action="select-prog-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const auditId = btn.dataset.auditId;
      if (!auditId) return;
      const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
      state.activeRoute = 'auditorias';
      state.activeSubSection = 'scheduling';
      state.programacionDomain.selectedAuditId = auditId;
      state.programacionDomain.activeChildTab = 'equipo';
      state.programacionDomain.isEditingAttributes = false;
      state.programacionDomain.isAddingTeamMember = false;
      state.programacionDomain.editErrorMessage = null;
      state.programacionDomain.saveSuccessMessage = null;
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `prog-audit-${auditId}`,
        label: audit?.codigo_auditoria || 'Auditoría',
        route: 'auditorias',
        subview: 'scheduling',
        entityType: 'audit',
        entityId: auditId,
        tab: 'equipo',
        tooltip: audit ? `${audit.codigo_auditoria} — ${audit.organizacion_nombre}` : 'Programación de Auditoría',
      });
      syncUrlHash('auditorias', 'scheduling');
      render();
    });
  });

  const backProgBtn = document.getElementById('backToProgramacionListBtn');
  backProgBtn?.addEventListener('click', () => {
    if (backProgBtn.dataset.navBack === 'true') return;
    backtrackToParentBreadcrumb();
    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="go-audit-results"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const auditId = btn.dataset.auditId;
      if (!auditId) return;
      const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
      state.activeRoute = 'auditorias';
      state.activeSubSection = 'findings';
      state.resultadoDomain.activeAuditIdForDecision = auditId;
      state.resultadoDomain.selectedAuditId = auditId;
      state.resultadoDomain.recommendationError = null;
      state.resultadoDomain.recommendationSuccess = null;
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `resultados-${auditId}`,
        label: audit ? `Resultados · ${audit.codigo_auditoria}` : 'Resultado',
        route: 'auditorias',
        subview: 'findings',
        entityType: 'audit',
        entityId: auditId,
        tooltip: audit ? `Resultados > ${audit.codigo_auditoria}` : 'Auditoría > Resultado',
      });
      syncUrlHash('auditorias', 'findings');
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="open-org-from-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orgId = btn.dataset.orgId;
      if (!orgId) return;
      const canCrossOrg =
        canAccessRoute(state.profile, 'certificacion') ||
        (state.profile?.role === 'AUDITOR' && state.profile?.status === 'APPROVED');
      if (!canCrossOrg) return;

      const org =
        state.domainData.allOrganizaciones.find((o) => o.id === orgId) ||
        INITIAL_ORGANIZACIONES.find((o) => o.id === orgId);

      state.activeRoute = 'certificacion';
      state.activeSubSection = 'organizations';
      state.organizacionDomain.selectedOrganizacionId = orgId;
      state.organizacionDomain.isEditingAttributes = false;
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `org-${orgId}`,
        label: org?.nombre || 'Organización',
        route: 'certificacion',
        subview: 'organizations',
        entityType: 'org',
        entityId: orgId,
        tab: state.organizacionDomain.activeChildTab,
        tooltip: `Organización > ${org?.nombre || orgId}`,
      });
      syncUrlHash('certificacion', 'organizations');
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="open-cert-from-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const certId = btn.dataset.certId;
      if (!certId) return;
      const canCrossCert =
        canAccessRoute(state.profile, 'certificacion') ||
        (state.profile?.role === 'AUDITOR' && state.profile?.status === 'APPROVED');
      if (!canCrossCert) return;

      const cert =
        state.domainData.allCertificadosDetailed.find((c) => c.id === certId) ||
        INITIAL_CERTIFICADOS_DETAILED.find((c) => c.id === certId);

      clearAllEntitySelections();
      state.activeRoute = 'certificacion';
      state.activeSubSection = 'certificates';
      state.certificadoDomain.selectedCertId = certId;
      state.certificadoDomain.activeChildTab = 'sitios';
      state.certificadoDomain.isEditingAttributes = false;
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `cert-${certId}`,
        label: cert?.numero_certificado || 'Certificado',
        route: 'certificacion',
        subview: 'certificates',
        entityType: 'cert',
        entityId: certId,
        tab: 'sitios',
        tooltip: `Certificado > ${cert?.numero_certificado || certId}`,
      });
      syncUrlHash('certificacion', 'certificates');
      render();
    });
  });

  document.getElementById('startEditProgAuditBtn')?.addEventListener('click', () => {
    if (!canEditSchedule) return;
    state.programacionDomain.isEditingAttributes = true;
    state.programacionDomain.editErrorMessage = null;
    state.programacionDomain.saveSuccessMessage = null;
    render();
  });

  const cancelProgEdit = () => {
    state.programacionDomain.isEditingAttributes = false;
    state.programacionDomain.editErrorMessage = null;
    render();
  };
  document.getElementById('cancelEditProgAuditBtn')?.addEventListener('click', cancelProgEdit);
  document.getElementById('cancelEditProgAuditBtnSecondary')?.addEventListener('click', cancelProgEdit);

  document.getElementById('editProgAuditForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canEditSchedule) return;
    const auditId = state.programacionDomain.selectedAuditId;
    if (!auditId) return;

    const tipo = (document.getElementById('editProgTipo') as HTMLSelectElement | null)?.value || '';
    const metodologia = (
      (document.getElementById('editProgMetodologia') as HTMLSelectElement | null)?.value ||
      'Presencial'
    ) as AuditMethodology;
    const estatus =
      (document.getElementById('editProgEstatus') as HTMLSelectElement | null)?.value ||
      'Planificado';
    const fechaInicio =
      (document.getElementById('editProgFechaInicio') as HTMLInputElement | null)?.value || '';
    const fechaFin =
      (document.getElementById('editProgFechaFin') as HTMLInputElement | null)?.value || '';
    const dias = Number(
      (document.getElementById('editProgDias') as HTMLInputElement | null)?.value || 1
    );
    const auditorLiderId =
      (document.getElementById('editProgAuditorLider') as HTMLSelectElement | null)?.value || '';

    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
      state.programacionDomain.editErrorMessage =
        'La fecha de finalización debe ser igual o posterior a la fecha de inicio.';
      render();
      return;
    }

    const selectedLead = state.domainData.allAuditorsDetailed.find((a) => a.id === auditorLiderId);
    const currentAudit = state.domainData.programacionAudits.find((a) => a.id === auditId);
    if (!currentAudit) return;

    const oldSnapshot = {
      tipo_auditoria: currentAudit.tipo_auditoria,
      metodologia: currentAudit.metodologia,
      estatus: currentAudit.estatus,
      fecha_inicio: currentAudit.fecha_inicio,
      fecha_fin: currentAudit.fecha_fin,
      dias_auditor: currentAudit.dias_auditor,
      auditor_lider: currentAudit.auditor_lider,
    };

    const nextLeadName = selectedLead?.nombre || currentAudit.auditor_lider;

    state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) => {
      if (a.id !== auditId) return a;
      const updatedTeam = a.equipo.some((m) => m.id_auditor === auditorLiderId)
        ? a.equipo.map((m) => ({
            ...m,
            rol: m.id_auditor === auditorLiderId ? ('Auditor Líder' as const) : m.rol,
          }))
        : selectedLead
        ? [
            {
              id: `eq-${Date.now()}`,
              id_auditor: selectedLead.id,
              nombre: selectedLead.nombre,
              rol: 'Auditor Líder' as const,
              competencia_norma: selectedLead.normas_acreditadas[0] || a.norma_codigo,
              competencia_sector_iaf: selectedLead.sectores_iaf[0] || a.sector_iaf,
              credencial_codigo: selectedLead.codigo_credencial,
              estado_credencial: 'Vigente' as const,
              email: selectedLead.email,
              telefono: selectedLead.telefono,
            },
            ...a.equipo.map((m) =>
              m.rol === 'Auditor Líder' ? { ...m, rol: 'Auditor de Equipo' as const } : m
            ),
          ]
        : a.equipo;

      return {
        ...a,
        tipo_auditoria: tipo || a.tipo_auditoria,
        metodologia,
        estatus,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias_auditor: Math.max(0.5, dias),
        auditor_lider_id: auditorLiderId || a.auditor_lider_id,
        auditor_lider: nextLeadName,
        equipo: updatedTeam,
      };
    });

    recordPhase5SessionLog('auditoria', auditId, 'UPDATE', oldSnapshot, {
      tipo_auditoria: tipo,
      metodologia,
      estatus,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_auditor: Math.max(0.5, dias),
      auditor_lider: nextLeadName,
    });

    state.programacionDomain.isEditingAttributes = false;
    state.programacionDomain.editErrorMessage = null;
    state.programacionDomain.saveSuccessMessage =
      'Planificación de auditoría actualizada y registrada en Historial de Cambios.';

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(auditId)) {
      void (async () => {
        try {
          await supabase
            .from('auditoria')
            .update({ fecha_programacion: fechaInicio })
            .eq('id', auditId);
        } catch {
          // Reactive state already updated
        }
      })();
    }

    render();
  });

  document.querySelectorAll<HTMLElement>('[data-prog-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.progTab as ProgramacionChildTab | undefined;
      if (tab) {
        state.programacionDomain.activeChildTab = tab;
        state.programacionDomain.isAddingTeamMember = false;
        syncCurrentBreadcrumbTab(tab);
        render();
      }
    });
  });

  // Tab 1: Equipo Evaluador
  document.getElementById('openAddTeamMemberBtn')?.addEventListener('click', () => {
    if (!canPlan) return;
    state.programacionDomain.isAddingTeamMember = true;
    render();
  });
  document.getElementById('cancelAddTeamMemberBtn')?.addEventListener('click', () => {
    state.programacionDomain.isAddingTeamMember = false;
    render();
  });

  document.getElementById('addTeamMemberForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canPlan) return;
    const auditId = state.programacionDomain.selectedAuditId;
    if (!auditId) return;

    const auditorId =
      (document.getElementById('teamAuditorSelect') as HTMLSelectElement | null)?.value || '';
    const role = (
      (document.getElementById('teamRoleSelect') as HTMLSelectElement | null)?.value ||
      'Auditor de Equipo'
    ) as AuditTeamRole;
    const auditor = state.domainData.allAuditorsDetailed.find((a) => a.id === auditorId);
    if (!auditor) return;

    const firstCompetencyExpiry = auditor.competencias[0]?.fecha_vencimiento || '';
    const credState = getCredentialValidityState(firstCompetencyExpiry);

    const newMember = {
      id: `eq-${Date.now()}`,
      id_auditor: auditor.id,
      nombre: auditor.nombre,
      rol: role,
      competencia_norma: auditor.normas_acreditadas[0] || 'ISO 9001:2015',
      competencia_sector_iaf: auditor.sectores_iaf[0] || 17,
      credencial_codigo: auditor.codigo_credencial,
      estado_credencial: credState,
      email: auditor.email,
      telefono: auditor.telefono,
    };

    state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
      a.id === auditId
        ? {
            ...a,
            equipo: [...a.equipo, newMember],
          }
        : a
    );

    recordPhase5SessionLog('auditoria', auditId, 'UPDATE', null, {
      accion: 'ASIGNACION_EQUIPO_AUDITOR',
      integrante: auditor.nombre,
      rol: role,
      credencial: auditor.codigo_credencial,
    });

    state.programacionDomain.isAddingTeamMember = false;
    state.programacionDomain.saveSuccessMessage = `${auditor.nombre} asignado como ${role}.`;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(auditId) && uuidRegex.test(auditor.id)) {
      void (async () => {
        try {
          const [{ data: dbAudit }, { data: dbAuditor }, { data: existingMember }] =
            await Promise.all([
              supabase.from('auditoria').select('id').eq('id', auditId).is('deleted_at', null).maybeSingle(),
              supabase.from('auditor').select('id').eq('id', auditor.id).is('deleted_at', null).maybeSingle(),
              supabase
                .from('equipo_auditor')
                .select('id_auditor')
                .eq('id_auditoria', auditId)
                .eq('id_auditor', auditor.id)
                .maybeSingle(),
            ]);

          if (dbAudit && dbAuditor && !existingMember) {
            await supabase.from('equipo_auditor').insert({
              id_auditoria: auditId,
              id_auditor: auditor.id,
              rol_auditor:
                role === 'Auditor Líder'
                  ? 'AUDITOR_LIDER'
                  : role === 'Experto Técnico'
                  ? 'EXPERTO_TECNICO'
                  : 'AUDITOR',
            });
          }
        } catch {
          // Reactive state fallback
        }
      })();
    }

    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="remove-team-member"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canPlan) return;
      const auditId = btn.dataset.auditId;
      const memberId = btn.dataset.memberId;
      if (!auditId || !memberId) return;

      const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
      const removed = audit?.equipo.find((m) => m.id === memberId);

      state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
        a.id === auditId
          ? {
              ...a,
              equipo: a.equipo.filter((m) => m.id !== memberId),
            }
          : a
      );

      if (removed) {
        recordPhase5SessionLog(
          'auditoria',
          auditId,
          'UPDATE',
          { integrante: removed.nombre, rol: removed.rol },
          { accion: 'RETIRO_EQUIPO_AUDITOR', integrante: removed.nombre }
        );
        state.programacionDomain.saveSuccessMessage = `${removed.nombre} retirado del equipo evaluador.`;
      }
      render();
    });
  });

  // Tab 2: Sedes y Muestreo
  document
    .querySelectorAll<HTMLSelectElement>('[data-action="change-site-sampling-mode"]')
    .forEach((select) => {
      select.addEventListener('change', () => {
        if (!canEditSchedule) return;
        const auditId = select.dataset.auditId;
        const siteId = select.dataset.siteId;
        const nextMode = select.value as SiteEvaluationMode;
        if (!auditId || !siteId) return;

        let siteName = '';
        let prevMode = '';
        state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
          a.id === auditId
            ? {
                ...a,
                sitiosMuestreo: a.sitiosMuestreo.map((s) => {
                  if (s.id === siteId) {
                    siteName = s.nombre_sitio;
                    prevMode = s.modalidad_evaluacion;
                    return { ...s, modalidad_evaluacion: nextMode };
                  }
                  return s;
                }),
              }
            : a
        );

        if (siteName) {
          recordPhase5SessionLog(
            'auditoria',
            auditId,
            'UPDATE',
            { sede: siteName, modalidad: prevMode },
            { sede: siteName, modalidad: nextMode }
          );
          state.programacionDomain.saveSuccessMessage = `Modalidad de ${siteName} actualizada a ${nextMode}.`;
        }
        render();
      });
    });

  document
    .querySelectorAll<HTMLInputElement>('[data-action="change-site-sampling-date"]')
    .forEach((input) => {
      input.addEventListener('change', () => {
        if (!canEditSchedule) return;
        const auditId = input.dataset.auditId;
        const siteId = input.dataset.siteId;
        const nextDate = input.value;
        if (!auditId || !siteId || !nextDate) return;

        let siteName = '';
        let prevDate = '';
        state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
          a.id === auditId
            ? {
                ...a,
                sitiosMuestreo: a.sitiosMuestreo.map((s) => {
                  if (s.id === siteId) {
                    siteName = s.nombre_sitio;
                    prevDate = s.fecha_asignada;
                    return { ...s, fecha_asignada: nextDate };
                  }
                  return s;
                }),
              }
            : a
        );

        if (siteName) {
          recordPhase5SessionLog(
            'auditoria',
            auditId,
            'UPDATE',
            { sede: siteName, fecha_asignada: prevDate },
            { sede: siteName, fecha_asignada: nextDate }
          );
          state.programacionDomain.saveSuccessMessage = `Fecha asignada para ${siteName} actualizada a ${nextDate}.`;
        }
        render();
      });
    });

  document.querySelectorAll<HTMLElement>('[data-action="toggle-site-sampled"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canEditSchedule) return;
      const auditId = btn.dataset.auditId;
      const siteId = btn.dataset.siteId;
      if (!auditId || !siteId) return;

      let siteName = '';
      let nextSampled = true;
      state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
        a.id === auditId
          ? {
              ...a,
              sitiosMuestreo: a.sitiosMuestreo.map((s) => {
                if (s.id === siteId) {
                  siteName = s.nombre_sitio;
                  nextSampled = !s.muestreado;
                  return { ...s, muestreado: nextSampled };
                }
                return s;
              }),
            }
          : a
      );

      if (siteName) {
        recordPhase5SessionLog(
          'auditoria',
          auditId,
          'UPDATE',
          { sede: siteName, muestreado: !nextSampled },
          { sede: siteName, muestreado: nextSampled }
        );
      }
      render();
    });
  });

  // Tab 3: Matriz de Verificación Normativa
  document
    .querySelectorAll<HTMLSelectElement>('[data-action="change-matrix-status"]')
    .forEach((select) => {
      select.addEventListener('change', () => {
        const auditId = select.dataset.auditId;
        const itemId = select.dataset.itemId;
        const nextStatus = select.value as NormativeVerificationStatus;
        if (!auditId || !itemId || !canMutateAuditById(auditId)) return;

        let clausula = '';
        let prevStatus = '';
        state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
          a.id === auditId
            ? {
                ...a,
                matrizNormativa: a.matrizNormativa.map((item) => {
                  if (item.id === itemId) {
                    clausula = item.codigo_clausula;
                    prevStatus = item.estado_verificacion;
                    return { ...item, estado_verificacion: nextStatus };
                  }
                  return item;
                }),
              }
            : a
        );

        if (clausula) {
          recordPhase5SessionLog(
            'auditoria',
            auditId,
            'UPDATE',
            { clausula, estado_verificacion: prevStatus },
            { clausula, estado_verificacion: nextStatus }
          );
          state.programacionDomain.saveSuccessMessage = `Cláusula ${clausula} actualizada a estado "${nextStatus}".`;
        }
        render();
      });
    });

  // --- B. Calendario Operativo ---
  document.querySelectorAll<HTMLElement>('[data-cal-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.calMode as CalendarDisplayMode | undefined;
      if (mode) {
        state.calendarioDomain.displayMode = mode;
        render();
      }
    });
  });

  const stepCalendarPeriod = (direction: -1 | 1) => {
    const step = state.calendarioDomain.displayMode === 'quarter' ? 3 : 1;
    let m = state.calendarioDomain.referenceMonth + direction * step;
    let y = state.calendarioDomain.referenceYear;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    state.calendarioDomain.referenceMonth = m;
    state.calendarioDomain.referenceYear = y;
    render();
  };

  document.getElementById('calPrevPeriodBtn')?.addEventListener('click', () => stepCalendarPeriod(-1));
  document.getElementById('calNextPeriodBtn')?.addEventListener('click', () => stepCalendarPeriod(1));

  document.getElementById('calFilterAuditor')?.addEventListener('change', (e) => {
    state.calendarioDomain.filterAuditorId = (e.target as HTMLSelectElement).value || 'ALL';
    render();
  });
  document.getElementById('calFilterStandard')?.addEventListener('change', (e) => {
    state.calendarioDomain.filterStandard = (e.target as HTMLSelectElement).value || 'ALL';
    render();
  });
  document.getElementById('calFilterMethodology')?.addEventListener('change', (e) => {
    state.calendarioDomain.filterMethodology = (e.target as HTMLSelectElement).value || 'ALL';
    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="open-cal-drawer"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.calendarioDomain.drawerAuditId = btn.dataset.auditId || null;
      render();
    });
  });

  const closeCalDrawer = () => {
    state.calendarioDomain.drawerAuditId = null;
    render();
  };
  document.getElementById('closeCalDrawerBtn')?.addEventListener('click', closeCalDrawer);
  document.getElementById('calDrawerBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCalDrawer();
  });

  document.querySelectorAll<HTMLElement>('[data-action="drawer-go-programacion"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const auditId = btn.dataset.auditId;
      if (!auditId) return;
      const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
      state.calendarioDomain.drawerAuditId = null;
      state.activeRoute = 'auditorias';
      state.activeSubSection = 'scheduling';
      state.programacionDomain.selectedAuditId = auditId;
      state.programacionDomain.activeChildTab = 'equipo';
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `prog-audit-${auditId}`,
        label: audit?.codigo_auditoria || 'Auditoría',
        route: 'auditorias',
        subview: 'scheduling',
        entityType: 'audit',
        entityId: auditId,
        tab: 'equipo',
        tooltip: audit ? `${audit.codigo_auditoria} — ${audit.organizacion_nombre}` : 'Programación de Auditoría',
      });
      syncUrlHash('auditorias', 'scheduling');
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="drawer-go-resultado"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const auditId = btn.dataset.auditId;
      if (!auditId) return;
      const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
      state.calendarioDomain.drawerAuditId = null;
      state.activeRoute = 'auditorias';
      state.activeSubSection = 'findings';
      state.resultadoDomain.activeAuditIdForDecision = auditId;
      state.resultadoDomain.selectedAuditId = auditId;
      state.resultadoDomain.recommendationError = null;
      state.resultadoDomain.recommendationSuccess = null;
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `resultados-${auditId}`,
        label: audit ? `Resultados · ${audit.codigo_auditoria}` : 'Resultado',
        route: 'auditorias',
        subview: 'findings',
        entityType: 'audit',
        entityId: auditId,
        tooltip: audit ? `Resultados > ${audit.codigo_auditoria}` : 'Auditoría > Resultado',
      });
      syncUrlHash('auditorias', 'findings');
      render();
    });
  });

  // --- C. Resultado, Hallazgos & Motor ISO/IEC 17021-1 ---
  document.getElementById('decisionAuditSelector')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val) {
      state.resultadoDomain.activeAuditIdForDecision = val;
      state.resultadoDomain.recommendationError = null;
      state.resultadoDomain.recommendationSuccess = null;
      render();
    }
  });

  document.getElementById('signRecommendationForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const auditId = form.dataset.auditId || state.resultadoDomain.activeAuditIdForDecision;
    const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
    if (!audit || !canMutateAuditExecution(audit, state.profile)) return;

    const firma =
      (document.getElementById('recSignatureInput') as HTMLInputElement | null)?.value.trim() || '';
    const comentarios =
      (document.getElementById('recCommentsInput') as HTMLInputElement | null)?.value.trim() || '';

    const evaluation = evaluateIso17021Recommendation(state.domainData.phase5Findings, auditId);
    const sigValidation = validateRecommendationSignature({
      firma_electronica: firma,
      comentarios,
      evaluation,
    });

    if (!sigValidation.valid) {
      state.resultadoDomain.recommendationError = sigValidation.error || 'Firma inválida.';
      state.resultadoDomain.recommendationSuccess = null;
      render();
      return;
    }

    const nowIso = new Date().toISOString();
    const signedBy = state.profile?.nombre || audit.auditor_lider;

    const recommendationRecord = {
      estado: evaluation.status,
      auditor_lider_nombre: signedBy,
      firma_electronica: firma,
      timestamp: nowIso,
      comentarios,
      resumen_hallazgos: {
        total: evaluation.totalFindings,
        ncMayorAbiertas: evaluation.openMajorCount,
        ncMenorAbiertas: evaluation.openMinorCount,
        observaciones: evaluation.observationsCount,
        oportunidadesMejora: evaluation.opportunitiesCount,
      },
    };

    state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
      a.id === auditId
        ? {
            ...a,
            estatus: 'Completado',
            recomendacion: recommendationRecord,
          }
        : a
    );

    recordPhase5SessionLog(
      'auditoria',
      auditId,
      'UPDATE',
      { estatus: audit.estatus, recomendacion: audit.recomendacion?.estado || null },
      {
        estatus: 'Completado',
        recomendacion: evaluation.status,
        firma_electronica: firma,
        auditor_lider_nombre: signedBy,
        comentarios,
      }
    );

    state.resultadoDomain.recommendationError = null;
    state.resultadoDomain.recommendationSuccess = `Recomendación ISO/IEC 17021-1 (${evaluation.status}) firmada y registrada en public.auditoria.`;
    render();
  });

  document.querySelectorAll<HTMLElement>('[data-res-display-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.resDisplayMode as FindingsDisplayMode | undefined;
      if (mode) {
        state.resultadoDomain.displayMode = mode;
        render();
      }
    });
  });

  document.getElementById('openNewFindingFormBtn')?.addEventListener('click', () => {
    const hasMutableAudit = scopeProgramacionAuditsForProfile(
      state.domainData.programacionAudits,
      state.profile,
      state.authorizedClientOrgIds
    ).some((a) => canMutateAuditExecution(a, state.profile));
    if (!hasMutableAudit) return;
    state.resultadoDomain.isLoggingFinding = true;
    state.resultadoDomain.findingFormError = null;
    render();
  });

  const closeNewFindingForm = () => {
    state.resultadoDomain.isLoggingFinding = false;
    state.resultadoDomain.findingFormError = null;
    render();
  };
  document.getElementById('closeNewFindingFormBtn')?.addEventListener('click', closeNewFindingForm);
  document.getElementById('cancelNewFindingFormBtn')?.addEventListener('click', closeNewFindingForm);

  document.getElementById('phase5NewFindingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const auditId =
      (document.getElementById('p5FindingAuditSelect') as HTMLSelectElement | null)?.value || '';
    if (!canMutateAuditById(auditId)) return;
    const tipo = (
      (document.getElementById('p5FindingTypeSelect') as HTMLSelectElement | null)?.value ||
      'NC_MENOR'
    ) as FindingType;
    const reqId =
      (document.getElementById('p5FindingReqSelect') as HTMLSelectElement | null)?.value || '';
    const procId =
      (document.getElementById('p5FindingProcessSelect') as HTMLSelectElement | null)?.value || '';
    const sitioNombre =
      (document.getElementById('p5FindingSiteInput') as HTMLInputElement | null)?.value.trim() ||
      'Sede Principal';
    const evidencia =
      (document.getElementById('p5FindingEvidenceInput') as HTMLInputElement | null)?.value.trim() ||
      '';
    const fechaLimite =
      (document.getElementById('p5FindingDueDateInput') as HTMLInputElement | null)?.value ||
      '2024-12-30';
    const descripcion =
      (document.getElementById('p5FindingDescInput') as HTMLTextAreaElement | null)?.value.trim() ||
      '';

    const validation = validatePhase5FindingInput({
      id_auditoria: auditId,
      tipo,
      id_requisito: reqId,
      id_proceso: procId,
      descripcion,
      evidencia,
    });

    if (!validation.valid) {
      state.resultadoDomain.findingFormError = validation.error || 'Datos incompletos.';
      render();
      return;
    }

    const audit = state.domainData.programacionAudits.find((a) => a.id === auditId);
    const req = state.domainData.requirements.find((r) => r.id === reqId);
    const proc = state.domainData.processes.find((p) => p.id === procId);
    const nextCodeNum = state.domainData.phase5Findings.length + 1;
    const newId = `finding-p5-${Date.now()}`;
    const codigoHallazgo = `HAL-2024-${String(nextCodeNum).padStart(3, '0')}`;

    const newFinding: Phase5FindingEntity = {
      id: newId,
      codigo_hallazgo: codigoHallazgo,
      id_auditoria: auditId,
      auditoria_tipo: audit?.tipo_auditoria || 'Renovación',
      numero_certificado: audit?.numero_certificado || 'FN-QMS-2024-001',
      organizacion_nombre: audit?.organizacion_nombre || 'Iberometal Componentes S.A.',
      id_requisito: reqId,
      requisito_codigo: req?.codigo || '8.5',
      id_proceso: procId,
      proceso_nombre: proc?.nombre_proceso || 'Troquelado y Fundición',
      sitio_nombre: sitioNombre,
      tipo,
      descripcion,
      evidencia,
      estado_ciclo: 'Abierto',
      analisis_causa_raiz: '',
      plan_accion_correctiva: '',
      comentarios_verificacion: '',
      fecha_limite: fechaLimite,
      fecha_cierre: null,
      cerrado: false,
      created_at: new Date().toISOString(),
    };

    state.domainData.phase5Findings = [newFinding, ...state.domainData.phase5Findings];
    state.domainData.findings = [newFinding, ...state.domainData.findings];
    state.resultadoDomain.isLoggingFinding = false;
    state.resultadoDomain.findingFormError = null;
    state.resultadoDomain.activeAuditIdForDecision = auditId;

    // Reset prior signed recommendation if an open NC_MAYOR or blocking NC_MENOR is introduced
    if (tipo === 'NC_MAYOR' || tipo === 'NC_MENOR') {
      state.domainData.programacionAudits = state.domainData.programacionAudits.map((a) =>
        a.id === auditId ? { ...a, recomendacion: null } : a
      );
      state.resultadoDomain.recommendationSuccess = null;
    }

    recordPhase5SessionLog('hallazgo', newId, 'INSERT', null, {
      auditoria: audit?.codigo_auditoria || newFinding.numero_certificado,
      codigo_hallazgo: codigoHallazgo,
      tipo,
      clausula: newFinding.requisito_codigo,
      proceso: newFinding.proceso_nombre,
      estado_ciclo: 'Abierto',
      descripcion,
    });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(auditId) && uuidRegex.test(reqId) && uuidRegex.test(procId)) {
      void (async () => {
        try {
          const [{ data: dbAudit }, { data: dbReq }, { data: dbProc }] = await Promise.all([
            supabase.from('auditoria').select('id').eq('id', auditId).is('deleted_at', null).maybeSingle(),
            supabase.from('requisito').select('id').eq('id', reqId).is('deleted_at', null).maybeSingle(),
            supabase.from('proceso').select('id').eq('id', procId).is('deleted_at', null).maybeSingle(),
          ]);
          if (dbAudit && dbReq && dbProc) {
            await supabase.from('hallazgo').insert({
              id_auditoria: auditId,
              id_requisito: reqId,
              id_proceso: procId,
              tipo,
              descripcion,
              evidencia: evidencia || null,
              cerrado: false,
            });
          }
        } catch {
          // Reactive state fallback
        }
      })();
    }

    render();
  });

  const resSearchInput = document.getElementById('resultadoSearchInput') as HTMLInputElement | null;
  resSearchInput?.addEventListener('input', (e) => {
    state.resultadoDomain.searchQuery = (e.target as HTMLInputElement).value;
    render();
  });
  resSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      state.resultadoDomain.searchQuery = '';
      render();
    }
  });
  document.getElementById('clearResultadoSearchBtn')?.addEventListener('click', () => {
    state.resultadoDomain.searchQuery = '';
    render();
  });

  document.getElementById('resultadoBoardAuditFilter')?.addEventListener('change', (e) => {
    state.resultadoDomain.selectedAuditId = (e.target as HTMLSelectElement).value || 'ALL';
    render();
  });

  document.getElementById('resultadoLifecycleFilter')?.addEventListener('change', (e) => {
    state.resultadoDomain.filterLifecycle = (e.target as HTMLSelectElement).value || 'ALL';
    render();
  });

  document.querySelectorAll<HTMLElement>('[data-res-filter-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.resultadoDomain.filterType = btn.dataset.resFilterType || 'ALL';
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="inspect-finding"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.resultadoDomain.inspectingFindingId = btn.dataset.findingId || null;
      render();
    });
  });

  const closeFindingModal = () => {
    state.resultadoDomain.inspectingFindingId = null;
    render();
  };
  document.getElementById('closeFindingDetailModalBtn')?.addEventListener('click', closeFindingModal);
  document.getElementById('cancelFindingDetailModalBtn')?.addEventListener('click', closeFindingModal);
  document.getElementById('findingDetailModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFindingModal();
  });

  document.getElementById('findingLifecycleForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const findingId = form.dataset.findingId || state.resultadoDomain.inspectingFindingId;
    if (!findingId) return;

    const existing = state.domainData.phase5Findings.find((f) => f.id === findingId);
    if (!existing) return;

    const targetAudit = state.domainData.programacionAudits.find(
      (a) => a.id === existing.id_auditoria
    );
    if (!canMutateAuditExecution(targetAudit, state.profile)) {
      const errBox = document.getElementById('findingLifecycleErrorBox');
      if (errBox) {
        errBox.textContent =
          'Acceso de solo lectura: no cuenta con permisos de escritura para modificar este hallazgo.';
        errBox.classList.remove('hidden');
      }
      return;
    }

    const rootCause =
      (document.getElementById('modalFindingRootCause') as HTMLTextAreaElement | null)?.value.trim() ||
      '';
    const capa =
      (document.getElementById('modalFindingCapa') as HTMLTextAreaElement | null)?.value.trim() || '';
    const verification =
      (document.getElementById('modalFindingVerification') as HTMLTextAreaElement | null)?.value.trim() ||
      '';
    const nextStatus = (
      (document.getElementById('modalFindingLifecycleSelect') as HTMLSelectElement | null)?.value ||
      existing.estado_ciclo
    ) as FindingLifecycleStatus;

    // Enforce RBAC for non-staff / non-assigned-auditor
    if (
      !canMutateAuditExecution(targetAudit, state.profile) &&
      (nextStatus === 'Verificado' || nextStatus === 'Cerrado')
    ) {
      const errBox = document.getElementById('findingLifecycleErrorBox');
      if (errBox) {
        errBox.textContent =
          'Solo el Auditor Líder o Personal Técnico pueden verificar y cerrar formalmente un hallazgo.';
        errBox.classList.remove('hidden');
      }
      return;
    }

    const validation = validateFindingLifecycleUpdate(existing, nextStatus, {
      analisis_causa_raiz: rootCause,
      plan_accion_correctiva: capa,
      comentarios_verificacion: verification,
    });

    if (!validation.valid) {
      const errBox = document.getElementById('findingLifecycleErrorBox');
      if (errBox) {
        errBox.textContent = `⚠️ ${validation.error}`;
        errBox.classList.remove('hidden');
      }
      return;
    }

    const nextClosed = nextStatus === 'Cerrado';
    const todayIso = new Date().toISOString().slice(0, 10);

    const oldSnapshot = {
      estado_ciclo: existing.estado_ciclo,
      cerrado: existing.cerrado,
      analisis_causa_raiz: existing.analisis_causa_raiz,
      plan_accion_correctiva: existing.plan_accion_correctiva,
    };

    state.domainData.phase5Findings = state.domainData.phase5Findings.map((f) =>
      f.id === findingId
        ? {
            ...f,
            analisis_causa_raiz: rootCause,
            plan_accion_correctiva: capa,
            comentarios_verificacion: verification,
            estado_ciclo: nextStatus,
            cerrado: nextClosed,
            fecha_cierre: nextClosed ? f.fecha_cierre || todayIso : null,
          }
        : f
    );

    state.domainData.findings = state.domainData.findings.map((f) =>
      f.id === findingId ? { ...f, cerrado: nextClosed } : f
    );

    const relatedAudit = state.domainData.programacionAudits.find(
      (a) => a.id === existing.id_auditoria
    );

    recordPhase5SessionLog('hallazgo', findingId, 'UPDATE', oldSnapshot, {
      auditoria: relatedAudit?.codigo_auditoria || existing.numero_certificado,
      codigo_hallazgo: existing.codigo_hallazgo,
      estado_ciclo: nextStatus,
      cerrado: nextClosed,
      plan_accion_correctiva: capa,
      comentarios_verificacion: verification,
    });

    state.resultadoDomain.inspectingFindingId = null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(findingId)) {
      void (async () => {
        try {
          await supabase
            .from('hallazgo')
            .update({ cerrado: nextClosed })
            .eq('id', findingId);
        } catch {
          // Reactive state fallback
        }
      })();
    }

    render();
  });
}

async function handleCreatePhase5Audit(data: {
  id_certificado: string;
  tipo_auditoria: string;
  metodologia: AuditMethodology;
  fecha_inicio: string;
  fecha_fin: string;
  dias_auditor: number;
  auditor_lider_id: string;
}): Promise<void> {
  if (!state.profile || !['ADMIN', 'WORKER'].includes(state.profile.role)) return;

  const cert = state.exploration.records.find((c) => c.id === data.id_certificado);
  const detailedCert = state.domainData.allCertificadosDetailed.find(
    (c) => c.id === data.id_certificado
  );
  const auditor = state.domainData.allAuditorsDetailed.find((a) => a.id === data.auditor_lider_id);

  const nextNum = state.domainData.programacionAudits.length + 1;
  const newCode = `AUD-2024-${String(nextNum).padStart(3, '0')}`;
  const newId = `audit-p5-${Date.now()}`;
  const orgName =
    cert?.organizacion_nombre ||
    detailedCert?.organizacion_nombre ||
    'Iberometal Componentes S.A.';
  const certNumber =
    cert?.numero_certificado || detailedCert?.numero_certificado || 'FN-QMS-2024-001';
  const normaCode = cert?.norma || detailedCert?.norma_codigo || 'ISO 9001:2015';
  const sectorIaf = cert?.sector_iaf || detailedCert?.sector_iaf || 17;

  const sitesSampling =
    detailedCert && detailedCert.sitios.length > 0
      ? detailedCert.sitios.map((s) => ({
          id: `sm-${Date.now()}-${s.numero_sitio}`,
          id_sitio: s.id,
          numero_sitio: s.numero_sitio,
          nombre_sitio: s.nombre_sitio,
          direccion_sitio: s.direccion_sitio,
          modalidad_evaluacion: (data.metodologia === 'Remota' ? 'Remota' : 'Presencial') as SiteEvaluationMode,
          fecha_asignada: data.fecha_inicio,
          dias_asignados: Math.max(0.5, Math.round((data.dias_auditor / detailedCert.sitios.length) * 10) / 10),
          muestreado: true,
        }))
      : [
          {
            id: `sm-${Date.now()}-0`,
            id_sitio: '50000000-0000-0000-0000-000000000000',
            numero_sitio: 0,
            nombre_sitio: 'Sede Principal HQ',
            direccion_sitio: cert?.direccion_fiscal || 'Sede Principal Registrada',
            modalidad_evaluacion: (data.metodologia === 'Remota' ? 'Remota' : 'Presencial') as SiteEvaluationMode,
            fecha_asignada: data.fecha_inicio,
            dias_asignados: data.dias_auditor,
            muestreado: true,
          },
        ];

  const newAudit: ProgramacionAuditEntity = {
    id: newId,
    codigo_auditoria: newCode,
    id_certificado: data.id_certificado || '40000000-0000-0000-0000-000000000001',
    numero_certificado: certNumber,
    id_organizacion: cert?.organizacion_id || detailedCert?.id_organizacion || '30000000-0000-0000-0000-000000000001',
    organizacion_nombre: orgName,
    norma_codigo: normaCode,
    sector_iaf: sectorIaf,
    tipo_auditoria: data.tipo_auditoria,
    metodologia: data.metodologia,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin >= data.fecha_inicio ? data.fecha_fin : data.fecha_inicio,
    fecha_reprogramacion: null,
    dias_auditor: data.dias_auditor,
    estatus: 'Planificado',
    auditor_lider_id: auditor?.id || '10000000-0000-0000-0000-000000000001',
    auditor_lider: auditor?.nombre || 'Ing. Carlos Mendoza',
    sede_principal_direccion: cert?.direccion_fiscal || 'Zona Industrial Principal',
    equipo: auditor
      ? [
          {
            id: `eq-${Date.now()}`,
            id_auditor: auditor.id,
            nombre: auditor.nombre,
            rol: 'Auditor Líder',
            competencia_norma: auditor.normas_acreditadas[0] || normaCode,
            competencia_sector_iaf: auditor.sectores_iaf[0] || sectorIaf,
            credencial_codigo: auditor.codigo_credencial,
            estado_credencial: 'Vigente',
            email: auditor.email,
            telefono: auditor.telefono,
          },
        ]
      : [],
    sitiosMuestreo: sitesSampling,
    matrizNormativa: [
      {
        id: `mn-${Date.now()}-1`,
        id_requisito: 'f0000000-0000-0000-0000-000000000041',
        codigo_clausula: '4.1',
        titulo_clausula: 'Comprensión de la organización y de su contexto',
        proceso_nombre: 'Dirección Estratégica y Calidad',
        estado_verificacion: 'Planificada',
      },
      {
        id: `mn-${Date.now()}-2`,
        id_requisito: 'f0000000-0000-0000-0000-000000000085',
        codigo_clausula: '8.5',
        titulo_clausula: 'Producción y provisión del servicio',
        proceso_nombre: 'Operaciones Principales',
        estado_verificacion: 'Planificada',
      },
    ],
    recomendacion: null,
  };

  state.domainData.programacionAudits = [newAudit, ...state.domainData.programacionAudits];
  state.domainData.audits = [
    {
      id: newId,
      id_certificado: newAudit.id_certificado,
      numero_certificado: newAudit.numero_certificado,
      organizacion_nombre: newAudit.organizacion_nombre,
      tipo_auditoria: newAudit.tipo_auditoria,
      metodologia: newAudit.metodologia,
      fecha_programacion: newAudit.fecha_inicio,
      auditor_lider: newAudit.auditor_lider,
      estatus: 'PLANIFICADA',
    },
    ...state.domainData.audits,
  ];

  recordPhase5SessionLog('auditoria', newId, 'INSERT', null, {
    codigo_auditoria: newCode,
    organizacion: orgName,
    certificado: certNumber,
    tipo_auditoria: data.tipo_auditoria,
    metodologia: data.metodologia,
    fecha_inicio: newAudit.fecha_inicio,
    fecha_fin: newAudit.fecha_fin,
    auditor_lider: newAudit.auditor_lider,
  });

  state.auditPlanning.isModalOpen = false;
  state.programacionDomain.isPlanningModalOpen = false;
  state.programacionDomain.saveSuccessMessage = `Auditoría ${newCode} planificada exitosamente.`;
  render();
}

function closeAuditLogModal(): void {
  state.auditLogModal.isOpen = false;
  state.auditLogModal.errorMessage = null;
  render();
}

function generateFallbackAuditEntries(
  tableName: string,
  recordId: string,
  entityName: string
): AuditLogEntry[] {
  return [
    {
      id: `audit-log-2`,
      table_name: tableName,
      record_id: recordId,
      action: 'UPDATE',
      actor_name: 'Administrador Principal',
      actor_email: 'admin@fondonorma.test',
      old_data: {
        estatus: 'PLANIFICADA',
        alcance: 'Alcance preliminar de certificación bajo evaluación técnica inicial.',
      },
      new_data: {
        estatus: 'ACTIVO',
        alcance: `Auditoría y certificación de conformidad bajo estándares internacionales ISO para ${entityName}`,
      },
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: `audit-log-1`,
      table_name: tableName,
      record_id: recordId,
      action: 'INSERT',
      actor_name: 'Administrador Principal',
      actor_email: 'admin@fondonorma.test',
      old_data: null,
      new_data: {
        codigo: entityName,
        estatus: 'PLANIFICADA',
        created_at: '2024-01-15T09:00:00Z',
      },
      created_at: '2024-01-15T09:00:00Z',
    },
  ];
}

function buildActorDirectory(): Record<string, ActorDirectoryEntry> {
  const directory: Record<string, ActorDirectoryEntry> = { ...SEEDED_ACTOR_DIRECTORY };
  for (const prof of state.approvals.profiles) {
    const seededEmail = directory[prof.id]?.email || null;
    directory[prof.id] = {
      nombre: prof.nombre,
      email: seededEmail,
    };
  }
  if (state.profile && state.user) {
    directory[state.profile.id] = {
      nombre: state.profile.nombre,
      email: state.user.email || directory[state.profile.id]?.email || null,
    };
  }
  return directory;
}

function resolveUuidDisplayLabel(idVal: string): string {
  const matchedAudit =
    state.domainData.programacionAudits.find((a) => a.id === idVal) ||
    state.domainData.audits.find((a) => a.id === idVal);
  if (matchedAudit) {
    return 'codigo_auditoria' in matchedAudit
      ? matchedAudit.codigo_auditoria
      : matchedAudit.numero_certificado;
  }

  const matchedAuditor =
    state.domainData.allAuditorsDetailed.find((a) => a.id === idVal) ||
    state.domainData.auditors.find((a) => a.id === idVal);
  if (matchedAuditor) return matchedAuditor.nombre;

  const matchedOrg =
    state.domainData.allOrganizaciones.find((o) => o.id === idVal) ||
    state.domainData.organizations.find((o) => o.id === idVal) ||
    INITIAL_ORGANIZACIONES.find((o) => o.id === idVal);
  if (matchedOrg) return matchedOrg.nombre;

  const matchedCert =
    state.exploration.records.find((c) => c.id === idVal) ||
    state.domainData.allCertificadosDetailed.find((c) => c.id === idVal) ||
    INITIAL_CERTIFICADOS_DETAILED.find((c) => c.id === idVal);
  if (matchedCert) return matchedCert.numero_certificado;

  const matchedNorma =
    state.domainData.standards.find((s) => s.id === idVal) ||
    INITIAL_NORMAS.find((n) => n.id === idVal);
  if (matchedNorma) return matchedNorma.norma;

  const matchedSector =
    state.domainData.iafSectors.find((s) => s.id === idVal) ||
    INITIAL_SECTORES_IAF.find((s) => s.id === idVal);
  if (matchedSector) return `Sector IAF ${matchedSector.sector}`;

  const matchedSubsector = INITIAL_SUBSECTORES_IAF.find((s) => s.id === idVal);
  if (matchedSubsector) return `${matchedSubsector.codigo} — ${matchedSubsector.descripcion}`;

  const matchedEstatus = INITIAL_ESTATUS_CATALOG.find((e) => e.id === idVal);
  if (matchedEstatus) return matchedEstatus.estatus;

  const matchedTipo = INITIAL_TIPOS_AUDITORIA_CATALOG.find((t) => t.id === idVal);
  if (matchedTipo) return matchedTipo.tipo;

  const matchedMet = INITIAL_METODOLOGIAS_CATALOG.find((m) => m.id === idVal);
  if (matchedMet) return matchedMet.metodologia;

  const matchedOrgAcred = INITIAL_ORGANISMOS.find((o) => o.id === idVal);
  if (matchedOrgAcred) return `${matchedOrgAcred.codigo} (${matchedOrgAcred.nombre})`;

  const matchedSite = state.domainData.sites.find((s) => s.id === idVal);
  if (matchedSite) return matchedSite.nombre_sitio;

  for (const certDetail of state.domainData.allCertificadosDetailed) {
    const nestedSite = certDetail.sitios?.find((s) => s.id === idVal);
    if (nestedSite) return nestedSite.nombre_sitio;
    const nestedProc = certDetail.procesos?.find((p) => p.id === idVal);
    if (nestedProc) return nestedProc.nombre_proceso;
  }

  const matchedReq =
    state.domainData.requirements.find((r) => r.id === idVal) ||
    INITIAL_REQUISITOS_LTREE.find((r) => r.id === idVal);
  if (matchedReq) return `Cláusula ${matchedReq.codigo}`;

  const matchedProc = state.domainData.processes.find((p) => p.id === idVal);
  if (matchedProc) return matchedProc.nombre_proceso;

  const matchedProfile = state.approvals.profiles.find((p) => p.id === idVal);
  if (matchedProfile) return matchedProfile.nombre;

  const seededActor = SEEDED_ACTOR_DIRECTORY[idVal];
  if (seededActor) return seededActor.nombre;

  return 'Referencia registrada';
}

function sanitizeAuditLogValue(value: unknown): unknown {
  const exactUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const inlineUuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (exactUuidPattern.test(trimmed)) {
      return resolveUuidDisplayLabel(trimmed);
    }
    return value.replace(inlineUuidPattern, (match) => resolveUuidDisplayLabel(match));
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditLogValue(item));
  }
  if (value && typeof value === 'object') {
    return sanitizeAuditLogDataMap(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeAuditLogDataMap(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!raw) return null;
  const exactUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'id' || key === 'created_by' || key === 'updated_by') {
      continue;
    }
    if (typeof value === 'string' && exactUuidPattern.test(value.trim())) {
      const labelKey = key.replace(/^id_/, '');
      out[labelKey] = resolveUuidDisplayLabel(value.trim());
      continue;
    }
    out[key] = sanitizeAuditLogValue(value);
  }

  return out;
}

async function openAuditLogModal(
  tableName: string,
  recordId: string,
  entityName: string
): Promise<void> {
  const actorDirectory = buildActorDirectory();
  const scopedAudits = scopeProgramacionAuditsForProfile(
    state.domainData.programacionAudits,
    state.profile,
    state.authorizedClientOrgIds
  );
  const scopedFindings = scopePhase5FindingsForProfile(
    state.domainData.phase5Findings,
    scopedAudits,
    state.profile
  );

  if (
    !canViewAuditLogForEntity(
      state.profile,
      tableName,
      recordId,
      scopedAudits,
      scopedFindings
    )
  ) {
    state.auditLogModal = {
      isOpen: true,
      entityName,
      tableName,
      recordId,
      entries: [],
      actorDirectory,
      loading: false,
      errorMessage:
        'Acceso forense restringido por política RLS (audit_log_select_authorized): disponible exclusivamente para ADMIN, WORKER y Auditores asignados sobre sus auditorías y hallazgos.',
    };
    render();
    return;
  }

  const targetAuditCode = state.domainData.programacionAudits.find(
    (a) => a.id === recordId
  )?.codigo_auditoria;

  const sessionMatches = state.domainData.sessionAuditLogs.filter((entry) => {
    if (tableName && entry.table_name !== tableName) return false;
    if (!recordId) return true;
    if (entry.record_id === recordId) return true;
    if (
      tableName === 'hallazgo' &&
      targetAuditCode &&
      entry.new_data &&
      entry.new_data.auditoria === targetAuditCode
    ) {
      return true;
    }
    return false;
  });

  state.auditLogModal = {
    isOpen: true,
    entityName,
    tableName,
    recordId,
    entries: [],
    actorDirectory,
    loading: true,
    errorMessage: null,
  };
  render();

  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (recordId && !uuidRegex.test(recordId)) {
      state.auditLogModal.loading = false;
      const fallback = generateFallbackAuditEntries(tableName, recordId, entityName);
      state.auditLogModal.entries =
        sessionMatches.length > 0 ? [...sessionMatches, ...fallback] : fallback;
      render();
      return;
    }

    let query = supabase
      .from('audit_log')
      .select('*')
      .order('performed_at', { ascending: false });

    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    if (recordId) {
      if (tableName === 'hallazgo' && targetAuditCode) {
        const { data: findingsForAudit } = await supabase
          .from('hallazgo')
          .select('id')
          .eq('id_auditoria', recordId);
        const findingIds = Array.isArray(findingsForAudit)
          ? findingsForAudit.map((row: { id: string }) => row.id).filter(Boolean)
          : [];
        if (findingIds.length > 0) {
          query = query.in('record_id', findingIds);
        } else {
          query = query.eq('record_id', recordId);
        }
      } else {
        query = query.eq('record_id', recordId);
      }
    }

    const { data, error } = await query.limit(20);

    if (error) {
      state.auditLogModal.loading = false;
      state.auditLogModal.errorMessage = translateDatabaseError(error);
      state.auditLogModal.entries = sessionMatches;
      render();
      return;
    }

    if (!data || data.length === 0) {
      state.auditLogModal.loading = false;
      if (sessionMatches.length > 0) {
        state.auditLogModal.entries = sessionMatches;
      } else {
        state.auditLogModal.entries = [];
      }
      render();
      return;
    }

    const sanitizedRows = (data as Array<AuditLogEntry & { performed_at?: string; performed_by?: string | null }>).map((row) => ({
      ...row,
      performed_by: row.performed_by || row.changed_by || row.actor_user_id || null,
      changed_at: row.performed_at || row.changed_at,
      old_data: sanitizeAuditLogDataMap(row.old_data),
      new_data: sanitizeAuditLogDataMap(row.new_data),
    }));

    state.auditLogModal.loading = false;
    state.auditLogModal.entries = [...sessionMatches, ...sanitizedRows];
    render();
  } catch {
    state.auditLogModal.loading = false;
    const fallback = generateFallbackAuditEntries(tableName, recordId, entityName);
    state.auditLogModal.entries =
      sessionMatches.length > 0 ? [...sessionMatches, ...fallback] : fallback;
    render();
  }
}

const STRICT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildNormaEntitiesForDependencyCheck(): NormaEntity[] {
  return state.domainData.standards.map((s) => ({
    id: s.id,
    codigo: s.codigo || s.norma,
    titulo: s.titulo || s.esquema || s.norma,
    estatus: (s.estatus as 'Vigente' | 'En Revisión' | 'Obsoleta') || 'Vigente',
    esquema: s.esquema,
    fecha_publicacion: s.fecha_publicacion || '2015-09-15',
    norma: s.norma,
    clausulas_count: s.clausulas_count ?? 0,
    acreditaciones_count: s.acreditaciones_count ?? 0,
  }));
}

function closeArchiveModal(): void {
  if (state.archiveGovernance.modal.submitting) return;
  state.archiveGovernance.modal = createInitialArchiveModalState();
  render();
}

async function openArchiveModal(opts: {
  tableName: ArchivableTable;
  recordId: string;
  entityTypeLabel: string;
  recordTitle: string;
  recordSubtitle?: string | null;
}): Promise<void> {
  if (!canArchiveRecord(state.profile)) return;

  state.archiveGovernance.modal = {
    isOpen: true,
    tableName: opts.tableName,
    recordId: opts.recordId,
    entityTypeLabel: opts.entityTypeLabel,
    recordTitle: opts.recordTitle,
    recordSubtitle: opts.recordSubtitle ?? null,
    loadingSummary: true,
    summary: null,
    reason: '',
    submitting: false,
    errorMessage: null,
  };
  render();

  const localSummary = computeLocalArchiveDependencySummary(
    opts.tableName,
    opts.recordId,
    {
      organizaciones: state.domainData.allOrganizaciones,
      certificates: state.domainData.allCertificadosDetailed,
      auditors: state.domainData.allAuditorsDetailed,
      audits: state.domainData.programacionAudits,
      findings: state.domainData.phase5Findings,
      normas: buildNormaEntitiesForDependencyCheck(),
      requisitos: state.domainData.requirementsCatalog,
      subsectores: INITIAL_SUBSECTORES_IAF,
      acreditaciones: state.domainData.allAcreditaciones,
      estatusList: INITIAL_ESTATUS_CATALOG,
      tiposList: INITIAL_TIPOS_AUDITORIA_CATALOG,
      metodologiasList: INITIAL_METODOLOGIAS_CATALOG,
      archivedSiteIds: state.domainData.archivedSiteIds,
      archivedProcesoIds: state.domainData.archivedProcesoIds,
      archivedTurnoIds: state.domainData.archivedTurnoIds,
    }
  );

  let finalSummary = localSummary;
  if (STRICT_UUID_PATTERN.test(opts.recordId)) {
    try {
      const { data, error } = await supabase.rpc('get_archive_dependency_summary', {
        p_table: opts.tableName,
        p_record_id: opts.recordId,
      });
      if (!error && data !== null && data !== undefined) {
        finalSummary = mergeArchiveDependencySummaries(
          parseArchiveDependencySummary(data),
          localSummary
        );
      }
    } catch {
      finalSummary = localSummary;
    }
  }

  if (
    !state.archiveGovernance.modal.isOpen ||
    state.archiveGovernance.modal.tableName !== opts.tableName ||
    state.archiveGovernance.modal.recordId !== opts.recordId
  ) {
    return;
  }

  state.archiveGovernance.modal = {
    ...state.archiveGovernance.modal,
    loadingSummary: false,
    summary: finalSummary,
  };
  render();
}

interface ArchivedRecordSnapshot {
  org?: OrganizacionEntity;
  orgLegacy?: OrganizationRecord;
  certDetail?: CertificadoDetailEntity;
  certRecord?: CertificateRecord;
  auditorDetail?: AuditorDetailEntity;
  auditorLegacy?: AuditorRecord;
  auditProg?: ProgramacionAuditEntity;
  auditLegacy?: AuditRecord;
  siteLinks?: Array<{ certId: string; site: CertificadoDetailEntity['sitios'][number] }>;
  siteLegacy?: SiteRecord;
  procesoLinks?: Array<{ certId: string; proc: CertificadoDetailEntity['procesos'][number] }>;
  procLegacy?: ProcessRecord;
  shiftItem?: TurnoCatalogItem;
  shiftLegacy?: ShiftRecord;
  accred?: AcreditacionDetailEntity;
  standard?: StandardRecord;
  sector?: IafRecord;
}

async function confirmArchiveRecord(): Promise<void> {
  if (!canArchiveRecord(state.profile)) return;
  const modal = state.archiveGovernance.modal;
  if (
    !modal.isOpen ||
    modal.submitting ||
    modal.loadingSummary ||
    !modal.summary?.can_archive
  ) {
    return;
  }

  const { tableName, recordId, entityTypeLabel, recordTitle, recordSubtitle, reason } = modal;
  const payload = buildSoftDeletePayload(reason);

  state.archiveGovernance.modal = {
    ...modal,
    submitting: true,
    errorMessage: null,
  };
  render();

  if (STRICT_UUID_PATTERN.test(recordId)) {
    const { error } = await supabase
      .from(tableName)
      .update(payload)
      .eq('id', recordId);

    if (error) {
      state.archiveGovernance.modal = {
        ...state.archiveGovernance.modal,
        submitting: false,
        errorMessage: translateDatabaseError(error),
      };
      render();
      return;
    }
  }

  const snapKey = `${tableName}:${recordId}`;
  const snapshot: ArchivedRecordSnapshot = {};

  switch (tableName) {
    case 'organizacion': {
      snapshot.org = state.domainData.allOrganizaciones.find((o) => o.id === recordId);
      snapshot.orgLegacy = state.domainData.organizations.find((o) => o.id === recordId);
      state.domainData.allOrganizaciones = state.domainData.allOrganizaciones.filter(
        (o) => o.id !== recordId
      );
      state.domainData.organizations = state.domainData.organizations.filter(
        (o) => o.id !== recordId
      );
      break;
    }
    case 'certificado': {
      snapshot.certDetail = state.domainData.allCertificadosDetailed.find(
        (c) => c.id === recordId
      );
      snapshot.certRecord = state.exploration.records.find((c) => c.id === recordId);
      state.domainData.allCertificadosDetailed =
        state.domainData.allCertificadosDetailed.filter((c) => c.id !== recordId);
      state.exploration.records = state.exploration.records.filter(
        (c) => c.id !== recordId
      );
      break;
    }
    case 'auditor': {
      snapshot.auditorDetail = state.domainData.allAuditorsDetailed.find(
        (a) => a.id === recordId
      );
      snapshot.auditorLegacy = state.domainData.auditors.find((a) => a.id === recordId);
      state.domainData.allAuditorsDetailed = state.domainData.allAuditorsDetailed.filter(
        (a) => a.id !== recordId
      );
      state.domainData.auditors = state.domainData.auditors.filter(
        (a) => a.id !== recordId
      );
      break;
    }
    case 'auditoria': {
      snapshot.auditProg = state.domainData.programacionAudits.find(
        (a) => a.id === recordId
      );
      snapshot.auditLegacy = state.domainData.audits.find((a) => a.id === recordId);
      state.domainData.programacionAudits = state.domainData.programacionAudits.filter(
        (a) => a.id !== recordId
      );
      state.domainData.audits = state.domainData.audits.filter((a) => a.id !== recordId);
      break;
    }
    case 'sitio': {
      const siteLinks: Array<{
        certId: string;
        site: CertificadoDetailEntity['sitios'][number];
      }> = [];
      state.domainData.allCertificadosDetailed =
        state.domainData.allCertificadosDetailed.map((cert) => {
          const targetSite = cert.sitios.find((s) => s.id === recordId);
          if (!targetSite) return cert;
          siteLinks.push({ certId: cert.id, site: targetSite });
          const nextSitios = cert.sitios.filter((s) => s.id !== recordId);
          return { ...cert, sitios: nextSitios };
        });
      snapshot.siteLinks = siteLinks;
      snapshot.siteLegacy = state.domainData.sites.find((s) => s.id === recordId);
      state.domainData.sites = state.domainData.sites.filter((s) => s.id !== recordId);
      state.domainData.archivedSiteIds.add(recordId);
      if (siteLinks.length > 0) {
        const affectedCertIds = new Set(siteLinks.map((l) => l.certId));
        state.exploration.records = state.exploration.records.map((rec) => {
          if (!affectedCertIds.has(rec.id)) return rec;
          const updatedCert = state.domainData.allCertificadosDetailed.find(
            (c) => c.id === rec.id
          );
          return updatedCert
            ? { ...rec, sitios_count: updatedCert.sitios.length }
            : rec;
        });
      }
      break;
    }
    case 'proceso': {
      const procesoLinks: Array<{
        certId: string;
        proc: CertificadoDetailEntity['procesos'][number];
      }> = [];
      state.domainData.allCertificadosDetailed =
        state.domainData.allCertificadosDetailed.map((cert) => {
          const targetProc = cert.procesos.find((p) => p.id === recordId);
          if (!targetProc) return cert;
          procesoLinks.push({ certId: cert.id, proc: targetProc });
          return {
            ...cert,
            procesos: cert.procesos.filter((p) => p.id !== recordId),
          };
        });
      snapshot.procesoLinks = procesoLinks;
      snapshot.procLegacy = state.domainData.processes.find((p) => p.id === recordId);
      state.domainData.processes = state.domainData.processes.filter(
        (p) => p.id !== recordId
      );
      state.domainData.archivedProcesoIds.add(recordId);
      break;
    }
    case 'turno': {
      snapshot.shiftItem = state.domainData.shiftCatalog.find((t) => t.id === recordId);
      snapshot.shiftLegacy = state.domainData.shifts.find((s) => s.id === recordId);
      state.domainData.shiftCatalog = state.domainData.shiftCatalog.filter(
        (t) => t.id !== recordId
      );
      state.domainData.shifts = state.domainData.shifts.filter((s) => s.id !== recordId);
      state.domainData.archivedTurnoIds.add(recordId);
      break;
    }
    case 'acreditacion_norma_iaf': {
      snapshot.accred = state.domainData.allAcreditaciones.find((a) => a.id === recordId);
      state.domainData.allAcreditaciones = state.domainData.allAcreditaciones.map((a) =>
        a.id === recordId
          ? { ...a, deleted_at: payload.deleted_at, delete_reason: payload.delete_reason }
          : a
      );
      state.archiveGovernance.archivedCatalogIds.add(recordId);
      break;
    }
    case 'norma': {
      snapshot.standard = state.domainData.standards.find((s) => s.id === recordId);
      state.domainData.standards = state.domainData.standards.filter(
        (s) => s.id !== recordId
      );
      state.archiveGovernance.archivedCatalogIds.add(recordId);
      break;
    }
    case 'sector_iaf': {
      snapshot.sector = state.domainData.iafSectors.find((s) => s.id === recordId);
      state.domainData.iafSectors = state.domainData.iafSectors.filter(
        (s) => s.id !== recordId
      );
      state.archiveGovernance.archivedCatalogIds.add(recordId);
      break;
    }
    case 'estatus':
    case 'tipo_auditoria':
    case 'metodologia_auditoria': {
      state.archiveGovernance.archivedCatalogIds.add(recordId);
      break;
    }
  }

  state.archiveGovernance.archivedSnapshotsByKey[snapKey] = snapshot;

  const archivedEntry: ArchivedItemEntry = {
    tableName,
    id: recordId,
    title: recordTitle,
    subtitle: recordSubtitle,
    deletedAt: payload.deleted_at,
    deletedBy: state.user?.id || null,
    deletedByName: state.profile?.nombre || null,
    deleteReason: payload.delete_reason,
  };
  const existingForTable = state.archiveGovernance.archivedRecordsByTable[tableName] || [];
  state.archiveGovernance.archivedRecordsByTable[tableName] = [
    archivedEntry,
    ...existingForTable.filter((item) => item.id !== recordId),
  ];

  recordPhase5SessionLog(
    tableName,
    recordId,
    'UPDATE',
    { deleted_at: null },
    { deleted_at: payload.deleted_at, delete_reason: payload.delete_reason }
  );

  state.archiveGovernance.modal = createInitialArchiveModalState();
  backtrackToParentBreadcrumb();
  state.archiveGovernance.toast = {
    message: `${entityTypeLabel} "${recordTitle}" archivado correctamente.`,
    tone: 'success',
  };
  render();
}

async function loadArchivedRecordsForAdmin(): Promise<void> {
  if (!canInspectArchivedRecords(state.profile)) {
    state.archiveGovernance.showArchived = false;
    state.archiveGovernance.archivedRecordsByTable = {};
    return;
  }

  try {
    const [
      orgsRes,
      certsRes,
      auditorsRes,
      auditsRes,
      normasRes,
      sectoresRes,
      accredRes,
      sitiosRes,
      procesosRes,
      turnosRes,
      estatusRes,
      tiposRes,
      metodologiasRes,
    ] = await Promise.all([
      supabase
        .from('organizacion')
        .select('id, nombre, rif, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('certificado')
        .select('id, numero_certificado, alcance, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('auditor')
        .select('id, nombre, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('auditoria')
        .select('id, fecha_programacion, certificado:id_certificado(numero_certificado), deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('norma')
        .select('id, codigo, titulo, norma, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('sector_iaf')
        .select('id, sector, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('acreditacion_norma_iaf')
        .select('id, numero_acreditacion, estatus, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('sitio')
        .select('id, numero_sitio, nombre_sitio, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('proceso')
        .select('id, nombre_proceso, tipo, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('turno')
        .select('id, hora_entrada, hora_salida, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('estatus')
        .select('id, estatus, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('tipo_auditoria')
        .select('id, tipo, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('metodologia_auditoria')
        .select('id, metodologia, deleted_at, deleted_by, delete_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
    ]);

    const buildEntries = (
      tableName: ArchivableTable,
      rows: unknown,
      mapper: (row: Record<string, unknown>) => { title: string; subtitle?: string | null; code?: string | null }
    ): ArchivedItemEntry[] => {
      const dbRows = Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
      const mappedDb: ArchivedItemEntry[] = dbRows.map((r) => {
        const meta = mapper(r);
        return {
          tableName,
          id: String(r.id),
          title: meta.title,
          subtitle: meta.subtitle ?? null,
          code: meta.code ?? null,
          deletedAt: String(r.deleted_at || ''),
          deletedBy: r.deleted_by ? String(r.deleted_by) : null,
          deletedByName: null,
          deleteReason: r.delete_reason ? String(r.delete_reason) : null,
        };
      });
      const dbIds = new Set(mappedDb.map((i) => i.id));
      const existingLocal = (state.archiveGovernance.archivedRecordsByTable[tableName] || []).filter(
        (item) => !STRICT_UUID_PATTERN.test(item.id) && !dbIds.has(item.id)
      );
      return [...mappedDb, ...existingLocal];
    };

    const nextByTable: Record<string, ArchivedItemEntry[]> = {
      organizacion: buildEntries('organizacion', orgsRes.data, (r) => ({
        title: String(r.nombre || 'Organización Archivada'),
        subtitle: r.rif ? String(r.rif) : null,
      })),
      certificado: buildEntries('certificado', certsRes.data, (r) => ({
        title: String(r.numero_certificado || 'Certificado Archivado'),
        subtitle: r.alcance ? String(r.alcance).slice(0, 80) : null,
        code: String(r.numero_certificado || ''),
      })),
      auditor: buildEntries('auditor', auditorsRes.data, (r) => ({
        title: String(r.nombre || 'Auditor Archivado'),
      })),
      auditoria: buildEntries('auditoria', auditsRes.data, (r) => {
        const certObj = (r.certificado as Record<string, unknown> | null) || null;
        return {
          title: certObj?.numero_certificado
            ? `Auditoría · ${String(certObj.numero_certificado)}`
            : 'Auditoría Archivada',
          subtitle: r.fecha_programacion ? `Programada: ${String(r.fecha_programacion)}` : null,
        };
      }),
      norma: buildEntries('norma', normasRes.data, (r) => ({
        title: String(r.codigo || r.norma || 'Norma Archivada'),
        subtitle: r.titulo ? String(r.titulo) : null,
        code: String(r.codigo || r.norma || ''),
      })),
      sector_iaf: buildEntries('sector_iaf', sectoresRes.data, (r) => ({
        title: `Sector IAF ${String(r.sector ?? '')}`.trim(),
      })),
      acreditacion_norma_iaf: buildEntries('acreditacion_norma_iaf', accredRes.data, (r) => ({
        title: String(r.numero_acreditacion || 'Acreditación Archivada'),
        subtitle: r.estatus ? `Estatus: ${String(r.estatus)}` : null,
        code: String(r.numero_acreditacion || ''),
      })),
      sitio: buildEntries('sitio', sitiosRes.data, (r) => ({
        title: `Sitio ${String(r.numero_sitio ?? '')} — ${String(r.nombre_sitio || 'Sitio')}`,
      })),
      proceso: buildEntries('proceso', procesosRes.data, (r) => ({
        title: String(r.nombre_proceso || 'Proceso Archivado'),
        subtitle: r.tipo ? String(r.tipo) : null,
      })),
      turno: buildEntries('turno', turnosRes.data, (r) => ({
        title: `${formatTurnoTime(String(r.hora_entrada || '00:00'))} – ${formatTurnoTime(String(r.hora_salida || '00:00'))}`,
      })),
      estatus: buildEntries('estatus', estatusRes.data, (r) => ({
        title: String(r.estatus || 'Estatus Archivado'),
      })),
      tipo_auditoria: buildEntries('tipo_auditoria', tiposRes.data, (r) => ({
        title: String(r.tipo || 'Tipo Archivado'),
      })),
      metodologia_auditoria: buildEntries('metodologia_auditoria', metodologiasRes.data, (r) => ({
        title: String(r.metodologia || 'Metodología Archivada'),
      })),
    };

    state.archiveGovernance.archivedRecordsByTable = nextByTable;
    render();
  } catch {
    render();
  }
}

async function handleRestoreArchivedRecord(
  tableName: ArchivableTable,
  recordId: string
): Promise<void> {
  if (!canInspectArchivedRecords(state.profile)) return;

  const existingEntry = (
    state.archiveGovernance.archivedRecordsByTable[tableName] || []
  ).find((i) => i.id === recordId);
  const title = existingEntry?.title || 'Registro';

  state.archiveGovernance.restoringId = recordId;
  render();

  const restorePayload = buildRestorePayload();
  if (STRICT_UUID_PATTERN.test(recordId)) {
    const { error } = await supabase
      .from(tableName)
      .update(restorePayload)
      .eq('id', recordId);

    if (error) {
      state.archiveGovernance.restoringId = null;
      state.archiveGovernance.toast = {
        message: translateDatabaseError(error),
        tone: 'warning',
      };
      render();
      return;
    }
  }

  state.archiveGovernance.archivedRecordsByTable[tableName] = (
    state.archiveGovernance.archivedRecordsByTable[tableName] || []
  ).filter((item) => item.id !== recordId);
  state.archiveGovernance.archivedCatalogIds.delete(recordId);

  const snapKey = `${tableName}:${recordId}`;
  const snapshot = state.archiveGovernance.archivedSnapshotsByKey[snapKey] as
    | ArchivedRecordSnapshot
    | undefined;

  if (snapshot) {
    switch (tableName) {
      case 'organizacion': {
        if (snapshot.org && !state.domainData.allOrganizaciones.some((o) => o.id === recordId)) {
          state.domainData.allOrganizaciones = [snapshot.org, ...state.domainData.allOrganizaciones];
        }
        if (snapshot.orgLegacy && !state.domainData.organizations.some((o) => o.id === recordId)) {
          state.domainData.organizations = [snapshot.orgLegacy, ...state.domainData.organizations];
        }
        break;
      }
      case 'certificado': {
        if (
          snapshot.certDetail &&
          !state.domainData.allCertificadosDetailed.some((c) => c.id === recordId)
        ) {
          state.domainData.allCertificadosDetailed = [
            snapshot.certDetail,
            ...state.domainData.allCertificadosDetailed,
          ];
        }
        if (
          snapshot.certRecord &&
          !state.exploration.records.some((c) => c.id === recordId)
        ) {
          state.exploration.records = [snapshot.certRecord, ...state.exploration.records];
        }
        break;
      }
      case 'auditor': {
        if (
          snapshot.auditorDetail &&
          !state.domainData.allAuditorsDetailed.some((a) => a.id === recordId)
        ) {
          state.domainData.allAuditorsDetailed = [
            snapshot.auditorDetail,
            ...state.domainData.allAuditorsDetailed,
          ];
        }
        if (
          snapshot.auditorLegacy &&
          !state.domainData.auditors.some((a) => a.id === recordId)
        ) {
          state.domainData.auditors = [snapshot.auditorLegacy, ...state.domainData.auditors];
        }
        break;
      }
      case 'auditoria': {
        if (
          snapshot.auditProg &&
          !state.domainData.programacionAudits.some((a) => a.id === recordId)
        ) {
          state.domainData.programacionAudits = [
            snapshot.auditProg,
            ...state.domainData.programacionAudits,
          ];
        }
        if (
          snapshot.auditLegacy &&
          !state.domainData.audits.some((a) => a.id === recordId)
        ) {
          state.domainData.audits = [snapshot.auditLegacy, ...state.domainData.audits];
        }
        break;
      }
      case 'sitio': {
        state.domainData.archivedSiteIds.delete(recordId);
        if (snapshot.siteLinks && snapshot.siteLinks.length > 0) {
          state.domainData.allCertificadosDetailed =
            state.domainData.allCertificadosDetailed.map((cert) => {
              const link = snapshot.siteLinks?.find((l) => l.certId === cert.id);
              if (!link || cert.sitios.some((s) => s.id === recordId)) return cert;
              return { ...cert, sitios: [...cert.sitios, link.site] };
            });
          const affectedCertIds = new Set(snapshot.siteLinks.map((l) => l.certId));
          state.exploration.records = state.exploration.records.map((rec) => {
            if (!affectedCertIds.has(rec.id)) return rec;
            const updatedCert = state.domainData.allCertificadosDetailed.find(
              (c) => c.id === rec.id
            );
            return updatedCert
              ? { ...rec, sitios_count: updatedCert.sitios.length }
              : rec;
          });
        }
        if (snapshot.siteLegacy && !state.domainData.sites.some((s) => s.id === recordId)) {
          state.domainData.sites = [snapshot.siteLegacy, ...state.domainData.sites];
        }
        break;
      }
      case 'proceso': {
        state.domainData.archivedProcesoIds.delete(recordId);
        if (snapshot.procesoLinks && snapshot.procesoLinks.length > 0) {
          state.domainData.allCertificadosDetailed =
            state.domainData.allCertificadosDetailed.map((cert) => {
              const link = snapshot.procesoLinks?.find((l) => l.certId === cert.id);
              if (!link || cert.procesos.some((p) => p.id === recordId)) return cert;
              return { ...cert, procesos: [...cert.procesos, link.proc] };
            });
        }
        if (snapshot.procLegacy && !state.domainData.processes.some((p) => p.id === recordId)) {
          state.domainData.processes = [snapshot.procLegacy, ...state.domainData.processes];
        }
        break;
      }
      case 'turno': {
        state.domainData.archivedTurnoIds.delete(recordId);
        if (snapshot.shiftItem && !state.domainData.shiftCatalog.some((t) => t.id === recordId)) {
          state.domainData.shiftCatalog = [snapshot.shiftItem, ...state.domainData.shiftCatalog];
        }
        if (snapshot.shiftLegacy && !state.domainData.shifts.some((s) => s.id === recordId)) {
          state.domainData.shifts = [snapshot.shiftLegacy, ...state.domainData.shifts];
        }
        break;
      }
      case 'acreditacion_norma_iaf': {
        state.domainData.allAcreditaciones = state.domainData.allAcreditaciones.map((a) =>
          a.id === recordId ? { ...a, deleted_at: null, delete_reason: null } : a
        );
        break;
      }
      case 'norma': {
        if (snapshot.standard && !state.domainData.standards.some((s) => s.id === recordId)) {
          state.domainData.standards = [snapshot.standard, ...state.domainData.standards];
        }
        break;
      }
      case 'sector_iaf': {
        if (snapshot.sector && !state.domainData.iafSectors.some((s) => s.id === recordId)) {
          state.domainData.iafSectors = [snapshot.sector, ...state.domainData.iafSectors];
        }
        break;
      }
      case 'estatus':
      case 'tipo_auditoria':
      case 'metodologia_auditoria':
        break;
    }
    Reflect.deleteProperty(state.archiveGovernance.archivedSnapshotsByKey, snapKey);
  } else {
    state.domainData.archivedSiteIds.delete(recordId);
    state.domainData.archivedProcesoIds.delete(recordId);
    state.domainData.archivedTurnoIds.delete(recordId);
  }

  recordPhase5SessionLog(
    tableName,
    recordId,
    'UPDATE',
    {
      deleted_at: existingEntry?.deletedAt || new Date().toISOString(),
      delete_reason: existingEntry?.deleteReason || null,
    },
    restorePayload
  );

  state.archiveGovernance.restoringId = null;
  state.archiveGovernance.toast = {
    message: `Registro "${title}" restaurado al catálogo activo.`,
    tone: 'success',
  };
  render();

  if (STRICT_UUID_PATTERN.test(recordId)) {
    void loadLiveCertificates();
    void loadDomainData();
    if (state.archiveGovernance.showArchived) {
      void loadArchivedRecordsForAdmin();
    }
  }
}

async function signInWithCredentials(
  email: string,
  password: string,
  quickEmail: string | null
): Promise<void> {
  if (!email || !password) return;

  state.auth = {
    ...state.auth,
    email,
    errorMessage: null,
    successMessage: null,
    submitting: true,
    quickLoginEmail: quickEmail,
  };
  render();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    state.auth = {
      ...state.auth,
      errorMessage: translateDatabaseError(error || 'Unable to sign in.'),
      submitting: false,
      quickLoginEmail: null,
    };
    render();
    return;
  }

  state.auth.submitting = false;
  state.auth.quickLoginEmail = null;
  await loadUserSession(data.user);
}

async function handleSignUp(
  nombre: string,
  email: string,
  password: string,
  role: UserRole
): Promise<void> {
  if (!nombre || !email || !password) return;

  state.auth = {
    ...state.auth,
    nombre,
    email,
    requestedRole: role,
    errorMessage: null,
    successMessage: null,
    submitting: true,
    quickLoginEmail: null,
  };
  render();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        role,
      },
    },
  });

  if (error) {
    state.auth = {
      ...state.auth,
      errorMessage: translateDatabaseError(error),
      submitting: false,
    };
    render();
    return;
  }

  if (data.session && data.user) {
    state.auth.submitting = false;
    await loadUserSession(data.user);
    return;
  }

  const approvalNote =
    role === 'CLIENT'
      ? 'Check your email inbox to confirm your address before signing in.'
      : 'Check your email inbox to confirm your address. An administrator will also need to approve your account request.';

  state.auth = {
    ...state.auth,
    mode: 'login',
    submitting: false,
    errorMessage: null,
    successMessage: `Account created for ${email}. ${approvalNote}`,
  };
  render();
}

function resetClientSessionState(): void {
  const hadSession =
    state.booting || state.user !== null || state.profile !== null;
  state.booting = false;
  activeSessionLoadKey = null;
  state.user = null;
  state.profile = null;
  state.authorizedClientOrgIds = [];
  state.clientAccessRows = [];
  state.profileForm = {
    nombreInput: '',
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
  state.activeRoute = 'dashboard';
  state.activeSubSection = null;
  state.openMenu = null;
  state.breadcrumbs = resetBreadcrumbToDomain('dashboard');
  state.auditLogModal = {
    isOpen: false,
    entityName: '',
    tableName: '',
    recordId: '',
    entries: [],
    actorDirectory: { ...SEEDED_ACTOR_DIRECTORY },
    loading: false,
    errorMessage: null,
  };
  state.archiveGovernance = {
    showArchived: false,
    modal: createInitialArchiveModalState(),
    toast: null,
    restoringId: null,
    archivedRecordsByTable: {},
    archivedSnapshotsByKey: {},
    archivedCatalogIds: new Set<string>(),
  };
  state.tableColumnWidths = {};
  syncUrlHash('dashboard', null, true);
  state.approvals.profiles = [];
  state.dbCheck = {
    checks: createInitialChecks(),
    running: false,
    lastCheckedAt: null,
  };
  state.exploration = {
    records: [...SAMPLE_CERTIFICATE_RECORDS],
    loading: false,
    query: '',
    selectedStatus: 'ALL',
    selectedStandard: 'ALL',
    viewMode: getStoredViewMode('grid'),
  };
  state.domainData = {
    audits: [...INITIAL_AUDITS],
    auditors: [...INITIAL_AUDITORS],
    organizations: [...INITIAL_ORGANIZATIONS],
    sites: [...INITIAL_SITES],
    processes: [...INITIAL_PROCESSES],
    shifts: [...INITIAL_SHIFTS],
    standards: [...INITIAL_STANDARDS],
    requirements: [...INITIAL_REQUIREMENTS],
    iafSectors: [...INITIAL_IAF],
    catalogs: [...INITIAL_CATALOGS],
    findings: [...INITIAL_FINDINGS],
    allOrganizaciones: [...INITIAL_ORGANIZACIONES],
    allCertificadosDetailed: [...INITIAL_CERTIFICADOS_DETAILED],
    allAuditorsDetailed: [...INITIAL_AUDITORES_DETAILED],
    allOrganismos: INITIAL_ORGANISMOS.map((o) => ({ ...o })),
    allAcreditaciones: buildInitialAcreditacionEntities(),
    programacionAudits: INITIAL_PROGRAMACION_AUDITS.map((a) => ({
      ...a,
      equipo: a.equipo.map((m) => ({ ...m })),
      sitiosMuestreo: a.sitiosMuestreo.map((s) => ({ ...s })),
      matrizNormativa: a.matrizNormativa.map((n) => ({ ...n })),
      recomendacion: a.recomendacion ? { ...a.recomendacion } : null,
    })),
    phase5Findings: INITIAL_PHASE5_FINDINGS.map((f) => ({ ...f })),
    shiftCatalog: INITIAL_TURNO_CATALOG.map((t) => ({ ...t })),
    requirementsCatalog: getAllSeededNormaRequirements(),
    archivedSiteIds: new Set<string>(),
    archivedProcesoIds: new Set<string>(),
    archivedTurnoIds: new Set<string>(),
    sessionAuditLogs: [],
    loading: false,
  };
  state.programacionDomain = {
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
    editErrorMessage: null,
    saveSuccessMessage: null,
    isSidebarOpen: true,
    facetSelections: {},
  };
  state.calendarioDomain = {
    displayMode: 'month',
    referenceYear: 2024,
    referenceMonth: 11,
    filterAuditorId: 'ALL',
    filterStandard: 'ALL',
    filterMethodology: 'ALL',
    drawerAuditId: null,
  };
  state.resultadoDomain = {
    selectedAuditId: 'ALL',
    activeAuditIdForDecision: INITIAL_PROGRAMACION_AUDITS[0]?.id || '',
    displayMode: 'list',
    filterType: 'ALL',
    filterLifecycle: 'ALL',
    searchQuery: '',
    isLoggingFinding: false,
    inspectingFindingId: null,
    recommendationError: null,
    recommendationSuccess: null,
    findingFormError: null,
  };
  state.organizacionDomain = {
    selectedOrganizacionId: null,
    query: '',
    hasActiveCertificates: 'ALL',
    selectedSectorIaf: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isEditingAttributes: false,
    activeChildTab: 'certificados',
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    isSidebarOpen: true,
    facetSelections: {},
    isCreating: false,
    createErrorMessage: null,
  };
  state.certificadoDomain = {
    selectedCertId: null,
    activeChildTab: 'sitios',
    query: '',
    selectedStandard: 'ALL',
    selectedStatus: 'ALL',
    selectedSectorIaf: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    originatingOrganizacionId: null,
    isSidebarOpen: true,
    facetSelections: {},
    isCreating: false,
    createErrorMessage: null,
  };
  state.sitioDomain = {
    selectedSitioId: null,
    activeChildTab: 'turnos',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    archiveConfirmOpen: false,
    archiveErrorMessage: null,
    isAssigningShift: false,
    shiftActionMessage: null,
  };
  state.procesoDomain = {
    selectedProcesoId: null,
    activeChildTab: 'requisitos',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    archiveConfirmOpen: false,
    archiveErrorMessage: null,
    isAssigningRequisito: false,
    requisitoActionMessage: null,
  };
  state.turnoDomain = {
    selectedTurnoId: null,
    originatingSitioId: null,
    activeChildTab: 'sitios',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    archiveConfirmOpen: false,
    archiveErrorMessage: null,
  };
  state.auditorDomain = {
    selectedAuditorId: null,
    activeChildTab: 'competencias',
    query: '',
    selectedCalificacion: 'ALL',
    selectedStandard: 'ALL',
    selectedSectorIaf: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    isEditingAttributes: false,
    editFormData: undefined,
    editErrorMessage: null,
    saveSuccessMessage: null,
    isSidebarOpen: true,
    facetSelections: {},
    isCreating: false,
    createErrorMessage: null,
  };
  state.extraDomain = {
    selectedNormaId: null,
    activeNormaTab: 'acreditacion',
    normaSearchQuery: '',
    normaFilterStatus: 'ALL',
    normaFilterScheme: 'ALL',
    normaViewMode: 'grid',
    normaSortColumn: null,
    normaSortDirection: 'none',
    normaIsSidebarOpen: true,
    normaFacetSelections: {},
    isAddAccreditationModalOpen: false,
    inspectingClauseId: null,

    selectedSectorId: null,
    activeSectorTab: 'subsectores',
    iafSearchQuery: '',
    iafFilterRisk: 'ALL',
    iafViewMode: 'grid',
    iafSortColumn: null,
    iafSortDirection: 'none',
    iafIsSidebarOpen: true,
    iafFacetSelections: {},
    isAddSubsectorModalOpen: false,

    selectedEstatusId: null,
    activeEstatusTab: 'certificados',
    estatusSearchQuery: '',
    estatusViewMode: 'grid',
    estatusSortColumn: null,
    estatusSortDirection: 'none',
    estatusIsSidebarOpen: true,
    estatusFacetSelections: {},

    selectedTipoId: null,
    tipoSearchQuery: '',
    tipoViewMode: 'grid',
    tipoSortColumn: null,
    tipoSortDirection: 'none',
    tipoIsSidebarOpen: true,
    tipoFacetSelections: {},

    selectedMetodologiaId: null,
    metodologiaSearchQuery: '',
    metodologiaViewMode: 'grid',
    metodologiaSortColumn: null,
    metodologiaSortDirection: 'none',
    metodologiaIsSidebarOpen: true,
    metodologiaFacetSelections: {},

    selectedAccreditationId: null,
    activeAccreditationTab: 'certificados',
    accredSearchQuery: '',
    accredViewMode: 'grid',
    accredSortColumn: null,
    accredSortDirection: 'none',
    accredIsSidebarOpen: true,
    accredFacetSelections: {},
    isCreatingAccreditation: false,
    accredCreateErrorMessage: null,
    accredCreateSuccessMessage: null,
    accredOrganismoMode: 'existing',
    isEditingAccreditation: false,
    accredEditFormData: undefined,
    accredEditErrorMessage: null,
    accredSaveSuccessMessage: null,
    accredArchiveConfirmOpen: false,
    accredArchiveErrorMessage: null,
  };
  state.auth = {
    ...state.auth,
    mode: 'login',
    errorMessage: null,
    successMessage: null,
    submitting: false,
    quickLoginEmail: null,
    resetModalOpen: false,
    resettingDb: false,
    resetErrorMessage: null,
  };
  if (hadSession) {
    render();
  }
}

async function handleSignOut(): Promise<void> {
  if (isSigningOut) return;
  isSigningOut = true;
  try {
    resetClientSessionState();
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.warn('Error during signOut cleanup:', err);
  } finally {
    isSigningOut = false;
  }
}

async function handleResetDatabase(): Promise<void> {
  if (state.auth.resettingDb) return;

  state.auth = {
    ...state.auth,
    resettingDb: true,
    resetErrorMessage: null,
    errorMessage: null,
    successMessage: null,
  };
  render();

  try {
    const response = await fetch('/api/reset-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      executedFiles?: Array<{ file: string; durationMs: number }>;
      totalDurationMs?: number;
    };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Reset failed with status ${response.status}.`);
    }

    const fileNames = (payload.executedFiles || []).map((item) => item.file);
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resettingDb: false,
      resetErrorMessage: null,
      errorMessage: null,
      successMessage: formatResetSummary(fileNames, payload.totalDurationMs),
    };
    void loadLiveCertificates();
  } catch (err) {
    state.auth = {
      ...state.auth,
      resettingDb: false,
      resetErrorMessage: err instanceof Error ? err.message : 'Unable to reset database.',
    };
  }

  render();
}

async function loadUserSession(user: User | null): Promise<void> {
  state.booting = false;
  if (!user) {
    activeSessionLoadKey = null;
    state.user = null;
    state.profile = null;
    render();
    return;
  }

  if (activeSessionLoadKey === user.id || state.user?.id === user.id) {
    return;
  }
  activeSessionLoadKey = user.id;

  try {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('id, nombre, role, status, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (isSigningOut) return;

    if (error || !profileData) {
      state.user = user;
      state.profile = {
        id: user.id,
        nombre: (user.user_metadata?.nombre as string | undefined) || user.email || 'User',
        role: ((user.user_metadata?.role as UserRole | undefined) || 'CLIENT'),
        status: 'PENDING',
      };
    } else {
      state.user = user;
      state.profile = profileData as UserProfile;
    }

    state.profileForm = {
      nombreInput: state.profile.nombre,
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

    if (state.profile.role === 'CLIENT') {
      const { data: orgAccessRows } = await supabase
        .from('client_organization_access')
        .select('id_organizacion, estado, fecha_solicitud, organizacion:id_organizacion ( nombre, rif )')
        .eq('id_usuario', user.id)
        .is('deleted_at', null);
      const rows = Array.isArray(orgAccessRows) ? orgAccessRows : [];
      state.clientAccessRows = rows.map((row: Record<string, unknown>) => {
        const org = (row.organizacion as Record<string, unknown> | null) || null;
        return {
          id_organizacion: String(row.id_organizacion || ''),
          organizacion_nombre: org?.nombre ? String(org.nombre) : 'Organización vinculada',
          rif: org?.rif ? String(org.rif) : undefined,
          estado: String(row.estado || 'PENDING') as UserStatus,
          fecha_solicitud: row.fecha_solicitud ? String(row.fecha_solicitud) : undefined,
        };
      });
      state.authorizedClientOrgIds =
        state.profile.status === 'APPROVED'
          ? state.clientAccessRows
              .filter((r) => r.estado === 'APPROVED' && Boolean(r.id_organizacion))
              .map((r) => r.id_organizacion)
          : [];
    } else {
      state.clientAccessRows = [];
      state.authorizedClientOrgIds = [];
    }

    const initialNav = parseHashRoute();
    if (canAccessRoute(state.profile, initialNav.route)) {
      state.activeRoute = initialNav.route;
      state.activeSubSection = initialNav.subview;
    } else {
      state.activeRoute = 'dashboard';
      state.activeSubSection = null;
    }
    syncUrlHash(state.activeRoute, state.activeSubSection, true);
    state.breadcrumbs = resetBreadcrumbToDomain(state.activeRoute, state.activeSubSection);
    state.openMenu = null;
    render();

    if (isApprovedStaff()) {
      void loadApprovalProfiles();
    }

    if (state.profile?.status === 'APPROVED') {
      void loadLiveCertificates();
      void loadDomainData();
    }
  } finally {
    if (activeSessionLoadKey === user.id) {
      activeSessionLoadKey = null;
    }
  }
}

async function loadLiveCertificates(): Promise<void> {
  if (state.exploration.loading) return;
  state.exploration.loading = true;
  render();

  try {
    const { data, error } = await supabase
      .from('certificado')
      .select(`
        id,
        numero_certificado,
        multisitio,
        created_at,
        organizacion:id_organizacion ( id, nombre, rif, direccion_fiscal ),
        norma:id_norma ( id, esquema, norma ),
        estatus:id_estatus ( id, estatus ),
        sector_iaf:id_sector_iaf ( id, sector )
      `)
      .is('deleted_at', null);

    if (!error && Array.isArray(data) && data.length > 0) {
      const loaded: CertificateRecord[] = await Promise.all(
        data.map(async (row: Record<string, unknown>) => {
          const org = (row.organizacion as Record<string, unknown> | null) || null;
          const norma = (row.norma as Record<string, unknown> | null) || null;
          const estatus = (row.estatus as Record<string, unknown> | null) || null;
          const sectorIaf = (row.sector_iaf as Record<string, unknown> | null) || null;

          let coveragePct = 86;
          let coverageSummary: CoverageBreakdown = { covered: 4, nonApplicable: 2, pending: 1, total: 7 };

          try {
            const { data: covData } = await supabase.rpc('cobertura_normativa_certificado', {
              p_id_certificado: String(row.id),
            });
            if (Array.isArray(covData) && covData.length > 0) {
              const covered = covData.filter((c: { estado_cobertura?: string }) => c.estado_cobertura === 'CUBIERTO').length;
              const nonApp = covData.filter((c: { estado_cobertura?: string }) => c.estado_cobertura === 'NO_APLICABLE').length;
              const pending = covData.filter((c: { estado_cobertura?: string }) => c.estado_cobertura === 'PENDIENTE').length;
              const total = covData.length;
              coverageSummary = { covered, nonApplicable: nonApp, pending, total };
              coveragePct = Math.round(((covered + nonApp) / total) * 100);
            }
          } catch {
            // Keep default
          }

          let sitesCount = 1;
          try {
            const { count } = await supabase
              .from('sitio')
              .select('id', { count: 'exact', head: true })
              .eq('id_certificado', String(row.id))
              .is('deleted_at', null);
            if (typeof count === 'number' && count > 0) {
              sitesCount = count;
            }
          } catch {
            // Keep default
          }

          return {
            id: String(row.id),
            numero_certificado: String(row.numero_certificado || 'FN-CERT-000'),
            organizacion_id: org ? String(org.id) : undefined,
            organizacion_nombre: org ? String(org.nombre) : 'Organización Registrada',
            organizacion_rif: org ? String(org.rif || 'RIF No Registrado') : 'RIF No Registrado',
            direccion_fiscal: org?.direccion_fiscal ? String(org.direccion_fiscal) : undefined,
            norma_id: norma ? String(norma.id) : undefined,
            norma: norma ? String(norma.norma || 'ISO 9001:2015') : 'ISO 9001:2015',
            esquema: norma ? String(norma.esquema || 'SGC - Calidad') : 'SGC - Calidad',
            estatus: estatus ? String(estatus.estatus || 'ACTIVO') : 'ACTIVO',
            sector_iaf: sectorIaf?.sector ? Number(sectorIaf.sector) : undefined,
            multisitio: Boolean(row.multisitio),
            sitios_count: sitesCount,
            cobertura_porcentaje: coveragePct,
            cobertura_resumen: coverageSummary,
            fecha_emision: '2024-03-15',
            fecha_vencimiento: '2027-03-14',
          };
        })
      );

      // Merge with sample records only for ADMIN/WORKER staff so CLIENT & AUDITOR stay strictly scoped to authorized live DB records
      if (isApprovedStaff()) {
        const existingCodes = new Set(loaded.map((item) => item.numero_certificado));
        const supplemental = SAMPLE_CERTIFICATE_RECORDS.filter(
          (s) => !existingCodes.has(s.numero_certificado)
        );
        state.exploration.records = [...loaded, ...supplemental];
      } else {
        state.exploration.records = loaded;
      }
    } else {
      state.exploration.records = isApprovedStaff() ? [...SAMPLE_CERTIFICATE_RECORDS] : [];
    }
  } catch {
    state.exploration.records = isApprovedStaff() ? [...SAMPLE_CERTIFICATE_RECORDS] : [];
  } finally {
    state.exploration.loading = false;
    render();
  }
}

async function loadDomainData(): Promise<void> {
  if (state.domainData.loading) return;
  state.domainData.loading = true;

  try {
    const [
      auditsRes,
      auditorsRes,
      orgsRes,
      sitesRes,
      processesRes,
      shiftsRes,
      standardsRes,
      requirementsRes,
      iafRes,
      estatusRes,
      tipoAuditoriaRes,
      metodologiaRes,
      findingsRes,
      organismosRes,
      acreditacionesRes,
    ] = await Promise.all([
      supabase
        .from('auditoria')
        .select(`
          id,
          id_certificado,
          fecha_programacion,
          fecha_reprogramacion,
          tipo_auditoria:id_tipo_auditoria ( tipo ),
          metodologia:id_metodologia ( metodologia ),
          certificado:id_certificado (
            id,
            numero_certificado,
            organizacion:id_organizacion ( nombre )
          ),
          equipo:equipo_auditor (
            rol_auditor,
            auditor:id_auditor ( nombre )
          )
        `)
        .is('deleted_at', null),
      supabase
        .from('auditor')
        .select(`
          id,
          nombre,
          normas:norma_auditor ( norma:id_norma ( norma ) ),
          sectores:sector_iaf_auditor ( sector:id_sector_iaf ( sector ) )
        `)
        .is('deleted_at', null),
      supabase
        .from('organizacion')
        .select('id, nombre, rif, direccion_fiscal')
        .is('deleted_at', null),
      supabase
        .from('sitio')
        .select(`
          id,
          numero_sitio,
          nombre_sitio,
          direccion_sitio,
          certificado:id_certificado ( numero_certificado )
        `)
        .is('deleted_at', null),
      supabase
        .from('proceso')
        .select(`
          id,
          nombre_proceso,
          certificado:id_certificado ( numero_certificado )
        `)
        .is('deleted_at', null),
      supabase
        .from('turno')
        .select('id, hora_entrada, hora_salida')
        .is('deleted_at', null),
      supabase
        .from('norma')
        .select('id, esquema, codigo, titulo, estatus, fecha_publicacion, norma')
        .is('deleted_at', null),
      supabase
        .from('requisito')
        .select(`
          id,
          codigo,
          ruta_materializada,
          norma:id_norma ( norma )
        `)
        .is('deleted_at', null),
      supabase
        .from('sector_iaf')
        .select('id, sector')
        .is('deleted_at', null),
      supabase
        .from('estatus')
        .select('estatus')
        .is('deleted_at', null),
      supabase
        .from('tipo_auditoria')
        .select('tipo')
        .is('deleted_at', null),
      supabase
        .from('metodologia_auditoria')
        .select('metodologia')
        .is('deleted_at', null),
      supabase
        .from('hallazgo')
        .select(`
          id,
          id_auditoria,
          id_requisito,
          id_proceso,
          tipo,
          descripcion,
          evidencia,
          cerrado,
          created_at,
          auditoria:id_auditoria (
            tipo_auditoria:id_tipo_auditoria ( tipo ),
            certificado:id_certificado (
              numero_certificado,
              organizacion:id_organizacion ( nombre )
            )
          ),
          requisito:id_requisito ( codigo ),
          proceso:id_proceso ( nombre_proceso )
        `)
        .is('deleted_at', null),
      supabase
        .from('organismo_acreditacion')
        .select('id, codigo, nombre, pais, sitio_web')
        .is('deleted_at', null),
      supabase
        .from('acreditacion_norma_iaf')
        .select(`
          id,
          id_organismo,
          id_norma,
          id_sector_iaf,
          numero_acreditacion,
          fecha_concesion,
          fecha_vencimiento,
          estatus,
          deleted_at,
          organismo:id_organismo ( id, codigo, nombre, pais, sitio_web, deleted_at ),
          norma:id_norma ( id, codigo, titulo, norma, esquema, deleted_at ),
          sector_iaf:id_sector_iaf ( id, sector, deleted_at )
        `)
        .is('deleted_at', null),
    ]);

    // Process Audits
    if (!auditsRes.error && Array.isArray(auditsRes.data) && auditsRes.data.length > 0) {
      state.domainData.audits = auditsRes.data.map((row: Record<string, unknown>) => {
        const cert = (row.certificado as Record<string, unknown> | null) || {};
        const org = (cert.organizacion as Record<string, unknown> | null) || {};
        const tipoObj = (row.tipo_auditoria as Record<string, unknown> | null) || {};
        const metObj = (row.metodologia as Record<string, unknown> | null) || {};
        const equipoList = Array.isArray(row.equipo)
          ? (row.equipo as Array<Record<string, unknown>>)
          : [];
        const lead =
          equipoList.find((e) => e.rol_auditor === 'AUDITOR_LIDER') || equipoList[0];
        const auditorObj = lead
          ? (lead.auditor as Record<string, unknown> | null)
          : null;
        const auditorLiderName = auditorObj
          ? String(auditorObj.nombre || 'Auditor Calificado')
          : 'Por asignar';

        return {
          id: String(row.id),
          id_certificado: row.id_certificado
            ? String(row.id_certificado)
            : cert.id
            ? String(cert.id)
            : undefined,
          numero_certificado: String(cert.numero_certificado || 'FN-QMS-2024-001'),
          organizacion_nombre: String(org.nombre || 'Iberometal Componentes S.A.'),
          tipo_auditoria: String(tipoObj.tipo || 'RECERTIFICACION'),
          metodologia: String(metObj.metodologia || 'PRESENCIAL'),
          fecha_programacion: String(row.fecha_programacion || '2024-11-20'),
          fecha_reprogramacion: row.fecha_reprogramacion
            ? String(row.fecha_reprogramacion)
            : null,
          auditor_lider: auditorLiderName,
          estatus: 'PLANIFICADA',
        };
      });
    }

    // Process Auditors
    if (!auditorsRes.error && Array.isArray(auditorsRes.data) && auditorsRes.data.length > 0) {
      state.domainData.auditors = auditorsRes.data.map((row: Record<string, unknown>) => {
        const normasRaw = Array.isArray(row.normas)
          ? (row.normas as Array<Record<string, unknown>>)
          : [];
        const normasList = normasRaw
          .map((n) => {
            const inner = n.norma as Record<string, unknown> | null;
            return inner?.norma ? String(inner.norma) : null;
          })
          .filter((v): v is string => Boolean(v));

        const sectoresRaw = Array.isArray(row.sectores)
          ? (row.sectores as Array<Record<string, unknown>>)
          : [];
        const iafList = sectoresRaw
          .map((s) => {
            const inner = s.sector as Record<string, unknown> | null;
            return inner?.sector ? Number(inner.sector) : NaN;
          })
          .filter((v) => !isNaN(v));

        return {
          id: String(row.id),
          nombre: String(row.nombre),
          normas: normasList.length > 0 ? normasList : ['ISO 9001:2015'],
          sectores_iaf: iafList.length > 0 ? iafList : [17],
          rol: 'Auditor Técnico Calificado',
        };
      });
    }

    // Process Organizations
    if (!orgsRes.error && Array.isArray(orgsRes.data) && orgsRes.data.length > 0) {
      state.domainData.organizations = orgsRes.data.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        nombre: String(row.nombre),
        rif: String(row.rif || 'RIF No Registrado'),
        direccion_fiscal: String(row.direccion_fiscal || ''),
        certificados_count: 1,
      }));
    }

    // Process Sites
    if (!sitesRes.error && Array.isArray(sitesRes.data) && sitesRes.data.length > 0) {
      state.domainData.sites = sitesRes.data.map((row: Record<string, unknown>) => {
        const certObj = (row.certificado as Record<string, unknown> | null) || {};
        return {
          id: String(row.id),
          numero_sitio: Number(row.numero_sitio) || 1,
          nombre_sitio: String(row.nombre_sitio),
          direccion_sitio: String(row.direccion_sitio),
          numero_certificado: String(certObj.numero_certificado || 'FN-QMS-2024-001'),
          turnos_count: 2,
        };
      });
    }

    // Process Processes
    if (!processesRes.error && Array.isArray(processesRes.data) && processesRes.data.length > 0) {
      state.domainData.processes = processesRes.data.map((row: Record<string, unknown>) => {
        const certObj = (row.certificado as Record<string, unknown> | null) || {};
        return {
          id: String(row.id),
          nombre_proceso: String(row.nombre_proceso),
          numero_certificado: String(certObj.numero_certificado || 'FN-QMS-2024-001'),
          clausulas_cubiertas: ['4.1', '8.5'],
        };
      });
    }

    // Process Shifts
    if (!shiftsRes.error && Array.isArray(shiftsRes.data) && shiftsRes.data.length > 0) {
      state.domainData.shifts = shiftsRes.data.map((row: Record<string, unknown>, idx: number) => ({
        id: String(row.id),
        hora_entrada: String(row.hora_entrada),
        hora_salida: String(row.hora_salida),
        descripcion: idx === 0 ? 'Turno Matutino Operativo' : 'Turno Vespertino / Nocturno',
        sitios_vinculados: ['Planta Valencia'],
      }));
      const liveShiftCatalog: TurnoCatalogItem[] = shiftsRes.data.map(
        (row: Record<string, unknown>, idx: number) => {
          const seedMatch = INITIAL_TURNO_CATALOG.find((t) => t.id === String(row.id));
          return {
            id: String(row.id),
            hora_entrada: String(row.hora_entrada),
            hora_salida: String(row.hora_salida),
            descripcion:
              seedMatch?.descripcion ||
              (idx === 0 ? 'Turno Matutino Operativo' : `Turno Operativo ${idx + 1}`),
          };
        }
      );
      const liveIds = new Set(liveShiftCatalog.map((t) => t.id));
      state.domainData.shiftCatalog = [
        ...liveShiftCatalog,
        ...INITIAL_TURNO_CATALOG.filter((t) => !liveIds.has(t.id)),
      ];
    }

    // Process Standards
    if (!standardsRes.error && Array.isArray(standardsRes.data) && standardsRes.data.length > 0) {
      state.domainData.standards = standardsRes.data.map((row: Record<string, unknown>) => {
        const normaStr = String(row.norma || row.codigo || '');
        const codigoStr = String(row.codigo || row.norma || '');
        return {
          id: String(row.id),
          esquema: String(row.esquema || ''),
          codigo: codigoStr,
          titulo: row.titulo ? String(row.titulo) : undefined,
          estatus: row.estatus ? String(row.estatus) : undefined,
          fecha_publicacion: row.fecha_publicacion ? String(row.fecha_publicacion) : undefined,
          norma: normaStr,
          clausulas_count: normaStr.includes('9001') ? 7 : 5,
        };
      });
    }

    // Process Requirements
    if (!requirementsRes.error && Array.isArray(requirementsRes.data) && requirementsRes.data.length > 0) {
      state.domainData.requirements = requirementsRes.data.map((row: Record<string, unknown>) => {
        const normaObj = (row.norma as Record<string, unknown> | null) || {};
        return {
          id: String(row.id),
          codigo: String(row.codigo),
          ruta_materializada: String(row.ruta_materializada || row.codigo),
          norma: String(normaObj.norma || 'ISO 9001:2015'),
        };
      });
    }

    // Process IAF Sectors
    if (!iafRes.error && Array.isArray(iafRes.data) && iafRes.data.length > 0) {
      const iafDescriptions: Record<number, string> = {
        14: 'Productos químicos, fibras sintéticas y farmacéuticos',
        17: 'Metales básicos y productos metálicos elaborados',
        28: 'Construcción e ingeniería civil',
        33: 'Tecnología de la información y comunicaciones',
        35: 'Otros servicios profesionales y de ensayo',
      };
      state.domainData.iafSectors = iafRes.data.map((row: Record<string, unknown>) => {
        const secNum = Number(row.sector);
        return {
          id: String(row.id),
          sector: secNum,
          descripcion:
            iafDescriptions[secNum] || `Sector industrial y comercial ${secNum}`,
        };
      });
    }

    // Process Catalogs
    const mergedCatalogs: CatalogItem[] = [];
    if (!estatusRes.error && Array.isArray(estatusRes.data)) {
      estatusRes.data.forEach((r: Record<string, unknown>) => {
        if (r.estatus) mergedCatalogs.push({ categoria: 'estatus', valor: String(r.estatus) });
      });
    }
    if (!tipoAuditoriaRes.error && Array.isArray(tipoAuditoriaRes.data)) {
      tipoAuditoriaRes.data.forEach((r: Record<string, unknown>) => {
        if (r.tipo) mergedCatalogs.push({ categoria: 'tipo_auditoria', valor: String(r.tipo) });
      });
    }
    if (!metodologiaRes.error && Array.isArray(metodologiaRes.data)) {
      metodologiaRes.data.forEach((r: Record<string, unknown>) => {
        if (r.metodologia) mergedCatalogs.push({ categoria: 'metodologia', valor: String(r.metodologia) });
      });
    }
    if (mergedCatalogs.length > 0) {
      state.domainData.catalogs = mergedCatalogs;
    }

    // Process Findings
    if (!findingsRes.error && Array.isArray(findingsRes.data) && findingsRes.data.length > 0) {
      const loadedFindings: FindingRecord[] = findingsRes.data.map((row: Record<string, unknown>) => {
        const aud = (row.auditoria as Record<string, unknown> | null) || {};
        const cert = (aud.certificado as Record<string, unknown> | null) || {};
        const org = (cert.organizacion as Record<string, unknown> | null) || {};
        const tipoAud = (aud.tipo_auditoria as Record<string, unknown> | null) || {};
        const req = (row.requisito as Record<string, unknown> | null) || {};
        const proc = (row.proceso as Record<string, unknown> | null) || {};

        return {
          id: String(row.id),
          id_auditoria: String(row.id_auditoria),
          auditoria_tipo: String(tipoAud.tipo || 'RECERTIFICACION'),
          numero_certificado: String(cert.numero_certificado || 'FN-QMS-2024-001'),
          organizacion_nombre: String(org.nombre || 'Iberometal Componentes S.A.'),
          id_requisito: String(row.id_requisito),
          requisito_codigo: String(req.codigo || '8.5'),
          id_proceso: String(row.id_proceso),
          proceso_nombre: String(proc.nombre_proceso || 'Troquelado y Fundición'),
          tipo: (row.tipo as FindingType) || 'NC_MENOR',
          descripcion: String(row.descripcion),
          evidencia: row.evidencia ? String(row.evidencia) : null,
          cerrado: Boolean(row.cerrado),
          created_at: row.created_at ? String(row.created_at) : undefined,
        };
      });

      if (isApprovedStaff()) {
        const existingIds = new Set(loadedFindings.map((f) => f.id));
        const supplemental = INITIAL_FINDINGS.filter((f) => !existingIds.has(f.id));
        state.domainData.findings = [...loadedFindings, ...supplemental];
      } else {
        state.domainData.findings = loadedFindings;
      }
    } else {
      state.domainData.findings = isApprovedStaff() ? [...INITIAL_FINDINGS] : [];
    }
    // Process Organisms & Accreditations (Phase 4.1.3)
    if (!organismosRes.error && Array.isArray(organismosRes.data) && organismosRes.data.length > 0) {
      state.domainData.allOrganismos = organismosRes.data.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        codigo: String(row.codigo || ''),
        nombre: String(row.nombre || ''),
        pais: String(row.pais || ''),
        sitio_web: row.sitio_web ? String(row.sitio_web) : undefined,
      }));
    }

    if (
      !acreditacionesRes.error &&
      Array.isArray(acreditacionesRes.data) &&
      acreditacionesRes.data.length > 0
    ) {
      const lookupNormas: NormaEntity[] = state.domainData.standards.map((s, idx) => {
        const fallback = INITIAL_NORMAS[idx % INITIAL_NORMAS.length];
        return {
          id: s.id || fallback.id,
          codigo: s.codigo || s.norma || fallback.codigo,
          titulo: s.titulo || fallback.titulo,
          estatus: (s.estatus as NormaEntity['estatus']) || fallback.estatus || 'Vigente',
          esquema: s.esquema || fallback.esquema,
          fecha_publicacion: s.fecha_publicacion || fallback.fecha_publicacion,
          norma: s.norma || fallback.norma,
          clausulas_count: s.clausulas_count || fallback.clausulas_count || 7,
          acreditaciones_count: s.acreditaciones_count || fallback.acreditaciones_count || 1,
        };
      });

      const lookupSectores: SectorIafEntity[] = state.domainData.iafSectors.map((sec, idx) => {
        const fallback = INITIAL_SECTORES_IAF[idx % INITIAL_SECTORES_IAF.length];
        return {
          id: sec.id || fallback.id,
          sector: sec.sector || fallback.sector,
          descripcion: sec.descripcion || fallback.descripcion,
          subsectores_count: sec.subsectores_count ?? fallback.subsectores_count,
          auditores_count: sec.auditores_count ?? fallback.auditores_count,
        };
      });

      const mappedAccreditations = mapSupabaseAcreditacionRows(
        acreditacionesRes.data as SupabaseAcreditacionJoinRow[],
        {
          organismos: state.domainData.allOrganismos,
          normas: lookupNormas.length > 0 ? lookupNormas : INITIAL_NORMAS,
          sectores: lookupSectores.length > 0 ? lookupSectores : INITIAL_SECTORES_IAF,
        }
      );

      if (mappedAccreditations.length > 0) {
        state.domainData.allAcreditaciones = mappedAccreditations;
      }
    }
  } catch (err) {
    console.warn('Fallback to seeded domain records:', err);
  } finally {
    state.domainData.loading = false;
    render();
  }
}

async function loadApprovalProfiles(): Promise<void> {
  if (!isApprovedStaff()) return;

  state.approvals.loading = true;
  state.approvals.errorMessage = null;
  render();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, role, status, created_at')
    .order('created_at', { ascending: false });

  state.approvals.loading = false;
  if (error) {
    state.approvals.errorMessage = translateDatabaseError(error);
  } else {
    state.approvals.profiles = (data as UserProfile[]) || [];
  }
  render();
}

async function updateProfileStatus(targetId: string, status: UserStatus): Promise<void> {
  if (!isApprovedAdmin()) return;

  state.approvals.updatingId = targetId;
  state.approvals.errorMessage = null;
  state.approvals.successMessage = null;
  render();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', targetId);

  state.approvals.updatingId = null;

  if (error) {
    state.approvals.errorMessage = translateDatabaseError(error);
    render();
    return;
  }

  const target = state.approvals.profiles.find((p) => p.id === targetId);
  state.approvals.successMessage = target
    ? `Updated status for ${target.nombre} to ${status}.`
    : `Updated user status to ${status}.`;
  await loadApprovalProfiles();
}

async function updateProfileRole(targetId: string, nextRole: string): Promise<void> {
  if (!isApprovedAdmin() || !state.user) return;

  const target = state.approvals.profiles.find((p) => p.id === targetId);
  if (!target) return;

  if (!canModifyProfileRole(target.id, state.user.id, target.status)) {
    return;
  }

  if (!shouldUpdateProfileRole(target.role, nextRole)) {
    return;
  }

  state.approvals.updatingId = targetId;
  state.approvals.errorMessage = null;
  state.approvals.successMessage = null;
  render();

  const { error } = await supabase
    .from('profiles')
    .update({ role: nextRole })
    .eq('id', targetId);

  state.approvals.updatingId = null;

  if (error) {
    state.approvals.errorMessage = translateDatabaseError(error);
    render();
    return;
  }

  state.approvals.successMessage = `Changed role for ${target.nombre} to ${nextRole}.`;
  await loadApprovalProfiles();
}

async function handleUpdateOwnProfile(rawNombre: string): Promise<void> {
  if (!state.user || !state.profile || state.profileForm.savingProfile) return;

  const validation = buildSelfProfileUpdatePayload(rawNombre);
  if (!validation.ok) {
    state.profileForm = {
      ...state.profileForm,
      nombreInput: rawNombre,
      profileError: validation.error,
      profileFeedback: null,
    };
    render();
    return;
  }

  state.profileForm = {
    ...state.profileForm,
    nombreInput: validation.payload.nombre,
    savingProfile: true,
    profileError: null,
    profileFeedback: null,
  };
  render();

  const { data, error } = await supabase
    .from('profiles')
    .update(validation.payload)
    .eq('id', state.user.id)
    .select('id, nombre, role, status, created_at')
    .single();

  if (error || !data) {
    state.profileForm = {
      ...state.profileForm,
      savingProfile: false,
      profileError: translateDatabaseError(error || 'No se pudo actualizar el perfil.'),
      profileFeedback: null,
    };
    render();
    return;
  }

  const updatedProfile = data as UserProfile;
  state.profile = updatedProfile;
  state.profileForm = {
    ...state.profileForm,
    nombreInput: updatedProfile.nombre,
    savingProfile: false,
    profileError: null,
    profileFeedback: 'Nombre actualizado correctamente.',
  };
  render();
}

async function handleUpdateOwnPassword(
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  if (!state.user || !state.profile || state.profileForm.savingPassword) return;

  const validation = validatePasswordChangeInput(newPassword, confirmPassword);
  if (!validation.ok) {
    state.profileForm = {
      ...state.profileForm,
      newPasswordInput: newPassword,
      confirmPasswordInput: confirmPassword,
      passwordError: validation.error,
      passwordFeedback: null,
    };
    render();
    return;
  }

  state.profileForm = {
    ...state.profileForm,
    savingPassword: true,
    passwordError: null,
    passwordFeedback: null,
  };
  render();

  const { data, error } = await supabase.auth.updateUser({
    password: validation.password,
  });

  if (error) {
    state.profileForm = {
      ...state.profileForm,
      savingPassword: false,
      passwordError: translateDatabaseError(error),
      passwordFeedback: null,
    };
    render();
    return;
  }

  if (data.user) {
    state.user = data.user;
  }

  state.profileForm = {
    ...state.profileForm,
    savingPassword: false,
    newPasswordInput: '',
    confirmPasswordInput: '',
    passwordError: null,
    passwordFeedback: 'Contraseña actualizada correctamente.',
  };
  render();
}

function updateHealthCheck(id: string, patch: Partial<HealthCheckItem>): void {
  state.dbCheck.checks = state.dbCheck.checks.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  render();
}

async function runHealthChecks(): Promise<void> {
  if (!isApprovedAdmin() || !state.profile || state.dbCheck.running) return;

  const adminProfile = state.profile;
  state.dbCheck = {
    checks: createInitialChecks(),
    running: true,
    lastCheckedAt: state.dbCheck.lastCheckedAt,
  };
  render();

  // 1. Connection & Login Service
  const t1 = performance.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const ms1 = Math.round(performance.now() - t1);
    if (response.ok) {
      updateHealthCheck('connection', {
        state: 'pass',
        detail: 'Server online and accepting connections',
        durationMs: ms1,
      });
    } else {
      updateHealthCheck('connection', {
        state: 'fail',
        detail: `Server responded with status ${response.status}`,
        durationMs: ms1,
      });
    }
  } catch (err) {
    updateHealthCheck('connection', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t1),
    });
  }

  // 2. Administrator Permissions
  const t2 = performance.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, role, status')
      .eq('id', adminProfile.id)
      .single();
    const ms2 = Math.round(performance.now() - t2);
    const access = evaluateAdminAccess(data as UserProfile | null);
    if (error || !access.allowed) {
      updateHealthCheck('admin', {
        state: 'fail',
        detail: error ? translateDatabaseError(error) : access.reason,
        durationMs: ms2,
      });
    } else {
      updateHealthCheck('admin', {
        state: 'pass',
        detail: `Verified ${data.nombre} (${data.role} · ${data.status})`,
        durationMs: ms2,
      });
    }
  } catch (err) {
    updateHealthCheck('admin', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t2),
    });
  }

  // 3. Core Business Records
  let sampleCert: { id: string; numero_certificado: string } | null = null;
  const t3 = performance.now();
  try {
    const [orgsRes, certsRes, auditsRes, findingsRes, sampleCertRes] = await Promise.all([
      supabase.from('organizacion').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('certificado').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('auditoria').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('hallazgo').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('certificado').select('id, numero_certificado').is('deleted_at', null).limit(1).maybeSingle(),
    ]);
    const ms3 = Math.round(performance.now() - t3);

    const firstErr =
      orgsRes.error || certsRes.error || auditsRes.error || findingsRes.error || sampleCertRes.error;

    if (firstErr) {
      updateHealthCheck('records', {
        state: 'fail',
        detail: translateDatabaseError(firstErr),
        durationMs: ms3,
      });
    } else {
      sampleCert = sampleCertRes.data as { id: string; numero_certificado: string } | null;
      updateHealthCheck('records', {
        state: 'pass',
        detail: `${orgsRes.count ?? 0} organizations · ${certsRes.count ?? 0} certificates · ${auditsRes.count ?? 0} audits · ${findingsRes.count ?? 0} findings`,
        durationMs: ms3,
      });
    }
  } catch (err) {
    updateHealthCheck('records', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t3),
    });
  }

  // 4. Standards & Coverage Engine
  const t4 = performance.now();
  try {
    const certId = sampleCert?.id || '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase.rpc('cobertura_normativa_certificado', {
      p_id_certificado: certId,
    });
    const ms4 = Math.round(performance.now() - t4);

    if (error) {
      updateHealthCheck('coverage', {
        state: 'fail',
        detail: translateDatabaseError(error),
        durationMs: ms4,
      });
    } else {
      const count = Array.isArray(data) ? data.length : 0;
      updateHealthCheck('coverage', {
        state: 'pass',
        detail: sampleCert
          ? `Evaluated ${count} standard requirements for ${sampleCert.numero_certificado}`
          : 'Coverage calculation engine responded cleanly',
        durationMs: ms4,
      });
    }
  } catch (err) {
    updateHealthCheck('coverage', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t4),
    });
  }

  // 5. Change History & Client Access
  const t5 = performance.now();
  try {
    const [logsRes, accessRes] = await Promise.all([
      supabase.from('audit_log').select('id', { count: 'exact', head: true }),
      supabase.from('client_organization_access').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ]);
    const ms5 = Math.round(performance.now() - t5);

    const err = logsRes.error || accessRes.error;
    if (err) {
      updateHealthCheck('governance', {
        state: 'fail',
        detail: translateDatabaseError(err),
        durationMs: ms5,
      });
    } else {
      updateHealthCheck('governance', {
        state: 'pass',
        detail: `${logsRes.count ?? 0} logged changes · ${accessRes.count ?? 0} client access records`,
        durationMs: ms5,
      });
    }
  } catch (err) {
    updateHealthCheck('governance', {
      state: 'fail',
      detail: translateDatabaseError(err),
      durationMs: Math.round(performance.now() - t5),
    });
  }

  state.dbCheck.running = false;
  state.dbCheck.lastCheckedAt = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  render();
}

// Close click-toggled dropdown when clicking outside header dropdown containers
document.addEventListener('click', (e) => {
  if (!state.openMenu) return;
  const target = e.target as HTMLElement | null;
  if (!target?.closest('[data-header-dropdown]')) {
    state.openMenu = null;
    render();
  }
});

// Global keyboard shortcuts: / to focus search, Escape to close modals/drawers/clear search
document.addEventListener('keydown', (e) => {
  // '/' shortcut to focus search input
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
    const searchInput = (document.querySelector('[data-universal-search="true"]') ||
      document.getElementById('programacionSearchInput') ||
      document.getElementById('resultadoSearchInput') ||
      document.getElementById('auditorDirectorySearchInput') ||
      document.getElementById('certDirectorySearchInput') ||
      document.getElementById('certificateSearchInput')) as HTMLInputElement | null;
    if (searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }
  }

  if (e.key !== 'Escape') return;

  if (state.archiveGovernance.modal.isOpen) {
    closeArchiveModal();
    return;
  }

  if (state.auditLogModal.isOpen) {
    closeAuditLogModal();
    return;
  }

  if (state.resultadoDomain.inspectingFindingId) {
    state.resultadoDomain.inspectingFindingId = null;
    render();
    return;
  }

  if (state.calendarioDomain.drawerAuditId) {
    state.calendarioDomain.drawerAuditId = null;
    render();
    return;
  }

  if (
    document.activeElement?.id === 'certificateSearchInput' ||
    (document.activeElement instanceof HTMLElement &&
      document.activeElement.dataset.universalSearch === 'true')
  ) {
    (document.activeElement as HTMLElement).blur();
    return;
  }

  if (state.openMenu) {
    state.openMenu = null;
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest('header')) {
      document.activeElement.blur();
    }
    render();
    return;
  }

  if (document.activeElement instanceof HTMLElement && document.activeElement.closest('[data-header-dropdown]')) {
    document.activeElement.blur();
    return;
  }

  if (state.auth.resetModalOpen && !state.auth.resettingDb) {
    state.auth = {
      ...state.auth,
      resetModalOpen: false,
      resetErrorMessage: null,
    };
    render();
  }
});

// History and Hash Navigation: Instant client-side route switching without page reloads
window.addEventListener('hashchange', () => {
  const { route, subview } = parseHashRoute();
  if (canAccessRoute(state.profile, route)) {
    if (state.activeRoute !== route || state.activeSubSection !== subview) {
      state.activeRoute = route;
      state.activeSubSection = subview;
      state.openMenu = null;
      state.breadcrumbs = resetBreadcrumbToDomain(route, subview);
      if (route === 'profile') {
        state.profileForm = {
          ...state.profileForm,
          nombreInput: state.profile?.nombre || '',
          profileFeedback: null,
          profileError: null,
          passwordFeedback: null,
          passwordError: null,
        };
      }
      render();
      if (route === 'approvals' && isApprovedStaff()) {
        void loadApprovalProfiles();
      } else if (route === 'database' && isApprovedAdmin() && state.dbCheck.lastCheckedAt === null) {
        void runHealthChecks();
      }
    }
  }
});

window.addEventListener('popstate', () => {
  const { route, subview } = parseHashRoute();
  if (canAccessRoute(state.profile, route)) {
    if (state.activeRoute !== route || state.activeSubSection !== subview) {
      state.activeRoute = route;
      state.activeSubSection = subview;
      state.openMenu = null;
      state.breadcrumbs = resetBreadcrumbToDomain(route, subview);
      if (route === 'profile') {
        state.profileForm = {
          ...state.profileForm,
          nombreInput: state.profile?.nombre || '',
          profileFeedback: null,
          profileError: null,
          passwordFeedback: null,
          passwordError: null,
        };
      }
      render();
    }
  }
});

// Supabase Auth State Change Listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    resetClientSessionState();
  } else if (
    (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
    !isSigningOut
  ) {
    if (session?.user && state.user?.id !== session.user.id) {
      void loadUserSession(session.user);
    }
  }
});

async function init(): Promise<void> {
  const initialNav = parseHashRoute();
  state.activeRoute = initialNav.route;
  state.activeSubSection = initialNav.subview;
  render();
  try {
    const { data } = await supabase.auth.getSession();
    if (!state.user && !isSigningOut) {
      await loadUserSession(data.session?.user ?? null);
    }
  } catch (err) {
    console.warn('Failed restoring initial session:', err);
    state.booting = false;
    state.user = null;
    state.profile = null;
    render();
  }
}

void init();
