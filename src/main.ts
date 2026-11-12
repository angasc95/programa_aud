import './index.css';
import type { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';
import {
  canAccessRoute,
  canModifyProfileRole,
  evaluateAdminAccess,
  formatResetSummary,
  shouldUpdateProfileRole,
  TEST_ACCOUNTS,
  translateDatabaseError,
  type ActiveRoute,
  type HealthCheckItem,
  type ProfileFilter,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from './lib/healthCheck';
import { renderHeader, type HeaderDropdownId } from './views/header';
import { renderAuthView, type AuthViewState } from './views/authView';
import { renderDashboardView } from './views/dashboardView';
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
import {
  renderExtraView,
  type StandardRecord,
  type RequirementRecord,
  type IafRecord,
  type CatalogItem,
} from './views/extraView';
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
  renderCertificateGrid,
  renderCertificateList,
  renderEmptySearchState,
} from './views/searchControlsView';
import {
  renderDrillDownView,
  type DrillDownSubTab,
} from './views/drillDownView';
import {
  INITIAL_FINDINGS,
  validateFindingInput,
  validateAuditPlanningInput,
  type FindingRecord,
  type FindingType,
} from './lib/drillDown';
import {
  resetBreadcrumbToDomain,
  pushBreadcrumb,
  popToBreadcrumb,
  type BreadcrumbSegment,
} from './lib/breadcrumb';
import { renderBreadcrumbBar } from './views/breadcrumbView';
import { renderAuditLogModal } from './views/auditLogModal';
import type { AuditLogEntry } from './lib/auditLog';
import {
  cycleSortDirection,
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
} from './lib/extraDomain';
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
} from './lib/multisiteSampling';
import {
  INITIAL_AUDITORES_DETAILED,
  type AuditorDetailEntity,
  type AuditorViewState,
  type AuditorChildTab,
} from './lib/competencyMatrix';

interface AppState {
  booting: boolean;
  user: User | null;
  profile: UserProfile | null;
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
    loading: boolean;
    errorMessage: string | null;
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
    loading: boolean;
  };
  drilldown: {
    selectedOrgId: string | null;
    selectedCertId: string | null;
    activeTab: DrillDownSubTab;
    findingFilterType: string;
    findingFilterStatus: 'all' | 'open' | 'closed';
    isLoggingFinding: boolean;
    loggingAuditId: string | null;
    orgSearchQuery?: string;
  };
  auditPlanning: {
    isModalOpen: boolean;
  };
  selectedScopeAuditId: string | null;
  organizacionDomain: {
    selectedOrganizacionId: string | null;
    query: string;
    hasActiveCertificates: 'ALL' | 'WITH_ACTIVE' | 'WITHOUT_ACTIVE';
    selectedSectorIaf: string;
    viewMode: 'grid' | 'list';
    sortColumn: 'nombre' | 'rif' | 'certificados_activos' | 'sector' | null;
    sortDirection: SortDirection;
    isEditingAttributes: boolean;
    activeChildTab: 'certificados';
    editFormData?: Partial<OrganizacionEntity>;
    editErrorMessage?: string | null;
    saveSuccessMessage?: string | null;
  };
  certificadoDomain: CertificadoViewState;
  auditorDomain: AuditorViewState;
  extraDomain: {
    selectedNormaId: string | null;
    activeNormaTab: 'acreditacion' | 'requisitos';
    normaSearchQuery: string;
    normaFilterStatus: string;
    normaFilterScheme: string;
    normaViewMode: 'grid' | 'list';
    normaSortColumn: string | null;
    normaSortDirection: SortDirection;
    isAddAccreditationModalOpen: boolean;
    inspectingClauseId: string | null;

    selectedSectorId: string | null;
    activeSectorTab: 'subsectores' | 'auditores';
    iafSearchQuery: string;
    iafFilterRisk: string;
    iafViewMode: 'grid' | 'list';
    iafSortColumn: string | null;
    iafSortDirection: SortDirection;
    isAddSubsectorModalOpen: boolean;

    selectedEstatusId: string | null;
    estatusSearchQuery: string;
    estatusViewMode: 'grid' | 'list';
    estatusSortColumn: string | null;
    estatusSortDirection: SortDirection;

    selectedTipoId: string | null;
    tipoSearchQuery: string;
    tipoViewMode: 'grid' | 'list';
    tipoSortColumn: string | null;
    tipoSortDirection: SortDirection;

    selectedMetodologiaId: string | null;
    metodologiaSearchQuery: string;
    metodologiaViewMode: 'grid' | 'list';
    metodologiaSortColumn: string | null;
    metodologiaSortDirection: SortDirection;
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
    const first = parts[0] as ActiveRoute;
    const second = parts[1] || null;
    const valid: ActiveRoute[] = [
      'dashboard',
      'auditorias',
      'certificacion',
      'extra',
      'approvals',
      'database',
      'drilldown',
    ];
    if (valid.includes(first)) {
      return { route: first, subview: second };
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
    loading: false,
  },
  drilldown: {
    selectedOrgId: null,
    selectedCertId: null,
    activeTab: 'sites',
    findingFilterType: 'ALL',
    findingFilterStatus: 'all',
    isLoggingFinding: false,
    loggingAuditId: null,
    orgSearchQuery: '',
  },
  auditPlanning: {
    isModalOpen: false,
  },
  selectedScopeAuditId: null,
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
    isAddAccreditationModalOpen: false,
    inspectingClauseId: null,

    selectedSectorId: null,
    activeSectorTab: 'subsectores',
    iafSearchQuery: '',
    iafFilterRisk: 'ALL',
    iafViewMode: 'grid',
    iafSortColumn: null,
    iafSortDirection: 'none',
    isAddSubsectorModalOpen: false,

    selectedEstatusId: null,
    estatusSearchQuery: '',
    estatusViewMode: 'grid',
    estatusSortColumn: null,
    estatusSortDirection: 'none',

    selectedTipoId: null,
    tipoSearchQuery: '',
    tipoViewMode: 'grid',
    tipoSortColumn: null,
    tipoSortDirection: 'none',

    selectedMetodologiaId: null,
    metodologiaSearchQuery: '',
    metodologiaViewMode: 'grid',
    metodologiaSortColumn: null,
    metodologiaSortDirection: 'none',
  },
};

function isApprovedAdmin(): boolean {
  return evaluateAdminAccess(state.profile).allowed;
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
  const pendingCount = state.approvals.profiles.filter((p) => p.status === 'PENDING').length;

  let effectiveRoute: ActiveRoute = state.activeRoute;
  if (!canAccessRoute(state.profile, effectiveRoute)) {
    effectiveRoute = 'dashboard';
    state.activeRoute = 'dashboard';
    state.activeSubSection = null;
  }

  let bodyHtml = '';
  if (effectiveRoute === 'approvals' && admin) {
    bodyHtml = renderApprovalsView({
      profiles: state.approvals.profiles,
      filter: state.approvals.filter,
      loading: state.approvals.loading,
      updatingId: state.approvals.updatingId,
      errorMessage: state.approvals.errorMessage,
      successMessage: state.approvals.successMessage,
      currentAdminId: state.user.id,
    });
  } else if (effectiveRoute === 'database' && admin) {
    bodyHtml = renderDatabaseStatusView(
      state.dbCheck.checks,
      state.dbCheck.running,
      state.dbCheck.lastCheckedAt
    );
  } else if (
    effectiveRoute === 'drilldown' ||
    (effectiveRoute === 'certificacion' && state.activeSubSection === 'drilldown')
  ) {
    bodyHtml = renderDrillDownView(state.profile, {
      selectedOrgId: state.drilldown.selectedOrgId,
      selectedCertId: state.drilldown.selectedCertId,
      activeTab: state.drilldown.activeTab,
      orgSearchQuery: state.drilldown.orgSearchQuery,
      organizations: state.domainData.organizations,
      certificates: state.exploration.records,
      sites: state.domainData.sites,
      processes: state.domainData.processes,
      shifts: state.domainData.shifts,
      standards: state.domainData.standards,
      requirements: state.domainData.requirements,
      audits: state.domainData.audits,
      auditors: state.domainData.auditors,
      findings: state.domainData.findings,
      findingFilterType: state.drilldown.findingFilterType,
      findingFilterStatus: state.drilldown.findingFilterStatus,
      isLoggingFinding: state.drilldown.isLoggingFinding,
      loggingAuditId: state.drilldown.loggingAuditId,
      loading: state.domainData.loading,
    });
  } else if (effectiveRoute === 'auditorias') {
    bodyHtml = renderAuditoriasView(state.profile, {
      activeSubSection: state.activeSubSection || 'scheduling',
      audits: state.domainData.audits,
      auditors: state.domainData.auditors,
      findings: state.domainData.findings,
      certificates: state.exploration.records,
      sites: state.domainData.sites,
      processes: state.domainData.processes,
      shifts: state.domainData.shifts,
      requirements: state.domainData.requirements,
      isPlanningModalOpen: state.auditPlanning.isModalOpen,
      isLoggingFinding: state.drilldown.isLoggingFinding,
      findingFilterType: state.drilldown.findingFilterType,
      findingFilterStatus: state.drilldown.findingFilterStatus,
      selectedScopeAuditId: state.selectedScopeAuditId,
      loading: state.domainData.loading,
    });
  } else if (effectiveRoute === 'certificacion') {
    const filteredRecords = filterCertificateRecords(state.exploration.records, {
      query: state.exploration.query,
      selectedStatus: state.exploration.selectedStatus,
      selectedStandard: state.exploration.selectedStandard,
    });
    const availableStatuses = extractUniqueStatuses(state.exploration.records);
    const availableStandards = extractUniqueStandards(state.exploration.records);

    bodyHtml = renderCertificacionView(state.profile, {
      activeSubSection: state.activeSubSection || 'certificates',
      filters: {
        query: state.exploration.query,
        selectedStatus: state.exploration.selectedStatus,
        selectedStandard: state.exploration.selectedStandard,
        viewMode: state.exploration.viewMode,
      },
      filteredCertificates: filteredRecords,
      allCertificates: state.exploration.records,
      availableStatuses,
      availableStandards,
      organizations: state.domainData.organizations,
      sites: state.domainData.sites,
      processes: state.domainData.processes,
      shifts: state.domainData.shifts,
      loading: state.exploration.loading,
      organizacionState: state.organizacionDomain,
      allOrganizaciones: state.domainData.allOrganizaciones,
      certificadoState: state.certificadoDomain,
      allCertificadosDetailed: state.domainData.allCertificadosDetailed,
      auditorState: state.auditorDomain,
      allAuditorsDetailed: state.domainData.allAuditorsDetailed,
    });
  } else if (effectiveRoute === 'extra') {
    bodyHtml = renderExtraView(state.profile, {
      activeSubSection: state.activeSubSection || 'standards',
      standards: state.domainData.standards,
      requirements: state.domainData.requirements,
      iafSectors: state.domainData.iafSectors,
      catalogs: state.domainData.catalogs,
      loading: state.domainData.loading,
      normaState: {
        selectedNormaId: state.extraDomain.selectedNormaId,
        activeChildTab: state.extraDomain.activeNormaTab,
        query: state.extraDomain.normaSearchQuery,
        selectedStatus: state.extraDomain.normaFilterStatus,
        selectedScheme: state.extraDomain.normaFilterScheme,
        viewMode: state.extraDomain.normaViewMode,
        sortColumn: state.extraDomain.normaSortColumn,
        sortDirection: state.extraDomain.normaSortDirection,
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
        isAddSubsectorModalOpen: state.extraDomain.isAddSubsectorModalOpen,
      },
      estatusState: {
        selectedEstatusId: state.extraDomain.selectedEstatusId,
        query: state.extraDomain.estatusSearchQuery,
        viewMode: state.extraDomain.estatusViewMode,
        sortColumn: state.extraDomain.estatusSortColumn,
        sortDirection: state.extraDomain.estatusSortDirection,
      },
      tipoState: {
        selectedTipoId: state.extraDomain.selectedTipoId,
        query: state.extraDomain.tipoSearchQuery,
        viewMode: state.extraDomain.tipoViewMode,
        sortColumn: state.extraDomain.tipoSortColumn,
        sortDirection: state.extraDomain.tipoSortDirection,
      },
      metodologiaState: {
        selectedMetodologiaId: state.extraDomain.selectedMetodologiaId,
        query: state.extraDomain.metodologiaSearchQuery,
        viewMode: state.extraDomain.metodologiaViewMode,
        sortColumn: state.extraDomain.metodologiaSortColumn,
        sortDirection: state.extraDomain.metodologiaSortDirection,
      },
    });
  } else {
    const filteredRecords = filterCertificateRecords(state.exploration.records, {
      query: state.exploration.query,
      selectedStatus: state.exploration.selectedStatus,
      selectedStandard: state.exploration.selectedStandard,
    });
    const availableStatuses = extractUniqueStatuses(state.exploration.records);
    const availableStandards = extractUniqueStandards(state.exploration.records);

    bodyHtml = renderDashboardView(
      state.profile,
      state.user.email || '',
      effectiveRoute,
      state.activeSubSection,
      {
        filters: {
          query: state.exploration.query,
          selectedStatus: state.exploration.selectedStatus,
          selectedStandard: state.exploration.selectedStandard,
          viewMode: state.exploration.viewMode,
        },
        filteredRecords,
        allRecords: state.exploration.records,
        availableStatuses,
        availableStandards,
        loading: state.exploration.loading,
      }
    );
  }

  const activeEl = document.activeElement as HTMLElement | null;
  const isInputActive = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
  const activeInputId = isInputActive ? activeEl?.id || null : null;
  const searchCursorStart = isInputActive ? (activeEl as HTMLInputElement).selectionStart : null;
  const searchCursorEnd = isInputActive ? (activeEl as HTMLInputElement).selectionEnd : null;

  const breadcrumbBarHtml = renderBreadcrumbBar({ trail: state.breadcrumbs });
  const auditModalHtml = renderAuditLogModal(state.auditLogModal);

  root.innerHTML = `
    ${renderHeader({
      profile: state.profile,
      email: state.user.email || '',
      isAdmin: admin,
      activeRoute: effectiveRoute,
      activeSubSection: state.activeSubSection,
      pendingCount,
      openMenu: state.openMenu,
    })}
    ${
      state.breadcrumbs && state.breadcrumbs.length > 1
        ? `<div class="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 pb-0">${breadcrumbBarHtml}</div>`
        : ''
    }
    ${bodyHtml}
    ${auditModalHtml}
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
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, segId);

      if (targetSeg) {
        state.activeRoute = targetSeg.route;
        state.activeSubSection = targetSeg.subview || null;
        if (targetSeg.route === 'drilldown') {
          if (targetSeg.id === 'drilldown-root') {
            state.drilldown.selectedOrgId = null;
            state.drilldown.selectedCertId = null;
          } else if (targetSeg.id.startsWith('org-')) {
            state.drilldown.selectedOrgId = targetSeg.entityId || null;
          }
        } else if (targetSeg.route === 'extra') {
          if (targetSeg.id.startsWith('domain-') || targetSeg.id.startsWith('subview-')) {
            state.extraDomain.selectedNormaId = null;
            state.extraDomain.selectedSectorId = null;
            state.extraDomain.selectedEstatusId = null;
            state.extraDomain.selectedTipoId = null;
            state.extraDomain.selectedMetodologiaId = null;
          }
        } else if (targetSeg.route === 'certificacion') {
          if (
            targetSeg.id.startsWith('domain-') ||
            targetSeg.id === 'subview-certificacion-organizations'
          ) {
            state.organizacionDomain.selectedOrganizacionId = null;
            state.organizacionDomain.isEditingAttributes = false;
          }
          if (
            targetSeg.id.startsWith('domain-') ||
            targetSeg.id === 'subview-certificacion-certificates'
          ) {
            state.certificadoDomain.selectedCertId = null;
            state.certificadoDomain.isEditingAttributes = false;
          }
          if (
            targetSeg.id.startsWith('domain-') ||
            targetSeg.id === 'subview-certificacion-auditors'
          ) {
            state.auditorDomain.selectedAuditorId = null;
            state.auditorDomain.isEditingAttributes = false;
          }
        }
        syncUrlHash(state.activeRoute, state.activeSubSection);
      }
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.nav as ActiveRoute | undefined;
      if (!target || !canAccessRoute(state.profile, target)) return;
      const subview = el.dataset.subview || null;
      state.activeRoute = target;
      state.activeSubSection = subview;
      state.openMenu = null;

      // Top Header Reset Rule: instantly reset breadcrumb trail to target domain root
      state.breadcrumbs = resetBreadcrumbToDomain(target, subview);
      if (target !== 'drilldown' && subview !== 'drilldown') {
        state.drilldown.selectedOrgId = null;
        state.drilldown.selectedCertId = null;
      }
      if (target === 'certificacion') {
        if (!subview || subview === 'organizations') {
          state.organizacionDomain.selectedOrganizacionId = null;
          state.organizacionDomain.isEditingAttributes = false;
        }
        if (!subview || subview === 'certificates') {
          state.certificadoDomain.selectedCertId = null;
          state.certificadoDomain.isEditingAttributes = false;
        }
        if (!subview || subview === 'auditors') {
          state.auditorDomain.selectedAuditorId = null;
          state.auditorDomain.isEditingAttributes = false;
        }
      }
      if (target === 'extra') {
        state.extraDomain.selectedNormaId = null;
        state.extraDomain.selectedSectorId = null;
        state.extraDomain.selectedEstatusId = null;
        state.extraDomain.selectedTipoId = null;
        state.extraDomain.selectedMetodologiaId = null;
      }

      syncUrlHash(target, state.activeSubSection);
      render();

      if (target === 'approvals') {
        void loadApprovalProfiles();
      } else if (target === 'database' && state.dbCheck.lastCheckedAt === null) {
        void runHealthChecks();
      }
    });
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

  // Search input events (real-time filtering)
  const searchInput = document.getElementById('certificateSearchInput') as HTMLInputElement | null;
  searchInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    state.exploration.query = target.value;
    updateExplorationView();
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClearSearch();
    }
  });

  document.getElementById('clearSearchBtn')?.addEventListener('click', handleClearSearch);

  document.getElementById('statusFacetSelect')?.addEventListener('change', (e) => {
    const select = e.target as HTMLSelectElement;
    state.exploration.selectedStatus = select.value;
    render();
  });

  document.getElementById('standardFacetSelect')?.addEventListener('change', (e) => {
    const select = e.target as HTMLSelectElement;
    state.exploration.selectedStandard = select.value;
    render();
  });

  document.querySelectorAll<HTMLElement>('[data-action="reset-all"]').forEach((btn) => {
    btn.addEventListener('click', handleResetAllFilters);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="set-view-mode"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.mode || 'grid') as ViewMode;
      if (state.exploration.viewMode !== mode) {
        state.exploration.viewMode = mode;
        setStoredViewMode(mode);
        render();
      }
    });
  });

  // Drill-Down interactive selectors with Breadcrumb synchronization
  document.querySelectorAll<HTMLElement>('[data-drilldown-select-org]').forEach((el) => {
    el.addEventListener('click', () => {
      const orgId = el.dataset.drilldownSelectOrg || null;
      state.drilldown.selectedOrgId = orgId;
      if (orgId) {
        const orgCerts = state.exploration.records.filter(
          (c) =>
            c.organizacion_id === orgId ||
            c.organizacion_nombre.toLowerCase() ===
              state.domainData.organizations
                .find((o) => o.id === orgId)
                ?.nombre.toLowerCase()
        );
        state.drilldown.selectedCertId = orgCerts.length > 0 ? orgCerts[0].id : null;

        const org = state.domainData.organizations.find((o) => o.id === orgId);
        state.breadcrumbs = resetBreadcrumbToDomain('certificacion', 'drilldown');
        if (org) {
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `org-${org.id}`,
            label: org.nombre,
            route: 'drilldown',
            entityId: org.id,
            tooltip: `${org.nombre} — RIF: ${org.rif}`,
          });
        }
        if (state.drilldown.selectedCertId) {
          const cert = state.exploration.records.find((c) => c.id === state.drilldown.selectedCertId);
          if (cert) {
            state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
              id: `cert-${cert.id}`,
              label: cert.numero_certificado,
              route: 'drilldown',
              entityId: cert.id,
              tooltip: `Certificado ${cert.numero_certificado} (${cert.esquema})`,
            });
          }
        }
      } else {
        state.drilldown.selectedCertId = null;
        state.breadcrumbs = resetBreadcrumbToDomain('certificacion', 'drilldown');
      }
      state.activeRoute = 'drilldown';
      state.activeSubSection = null;
      syncUrlHash('drilldown', orgId);
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-drilldown-select-cert]').forEach((el) => {
    el.addEventListener('click', () => {
      const certId = el.dataset.drilldownSelectCert || null;
      state.drilldown.selectedCertId = certId;
      if (certId) {
        const cert = state.exploration.records.find((c) => c.id === certId);
        if (cert) {
          state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
            id: `cert-${cert.id}`,
            label: cert.numero_certificado,
            route: 'drilldown',
            entityId: cert.id,
            tooltip: `Certificado ${cert.numero_certificado} (${cert.esquema})`,
          });
        }
      }
      render();
    });
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

  document.querySelectorAll<HTMLElement>('[data-drilldown-subtab]').forEach((el) => {
    el.addEventListener('click', () => {
      const subtab = el.dataset.drilldownSubtab as DrillDownSubTab | undefined;
      if (subtab) {
        state.drilldown.activeTab = subtab;
        render();
      }
    });
  });

  // Drill-Down Step 1 Search & Clear Handlers
  const orgSearchInput = document.getElementById('drilldownOrgSearch') as HTMLInputElement | null;
  if (orgSearchInput) {
    orgSearchInput.addEventListener('input', () => {
      state.drilldown.orgSearchQuery = orgSearchInput.value;
      render();
      const updatedInput = document.getElementById('drilldownOrgSearch') as HTMLInputElement | null;
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
      }
    });
  }

  document.getElementById('clearOrgSearchBtn')?.addEventListener('click', () => {
    state.drilldown.orgSearchQuery = '';
    render();
  });

  // Drill-Down Findings Filter Handlers
  document.querySelectorAll<HTMLElement>('[data-drilldown-filter-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.drilldown.findingFilterType = btn.dataset.drilldownFilterType || 'ALL';
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-drilldown-filter-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.drilldown.findingFilterStatus = (btn.dataset.drilldownFilterStatus || 'all') as 'all' | 'open' | 'closed';
      render();
    });
  });

  // Auditorias Findings Filter Handlers
  document.querySelectorAll<HTMLElement>('[data-auditorias-filter-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.drilldown.findingFilterType = btn.dataset.auditoriasFilterType || 'ALL';
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-auditorias-filter-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.drilldown.findingFilterStatus = (btn.dataset.auditoriasFilterStatus || 'all') as 'all' | 'open' | 'closed';
      render();
    });
  });

  // Auditorias Scope Audit Selector Handlers
  const scopeAuditSelect = document.getElementById('scopeAuditSelector') as HTMLSelectElement | null;
  if (scopeAuditSelect) {
    scopeAuditSelect.addEventListener('change', () => {
      state.selectedScopeAuditId = scopeAuditSelect.value || null;
      render();
    });
  }

  document.querySelectorAll<HTMLElement>('[data-action="change-scope-audit"]').forEach((el) => {
    if (el !== scopeAuditSelect) {
      el.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement | null;
        if (target) {
          state.selectedScopeAuditId = target.value || null;
          render();
        }
      });
    }
  });

  // Audit Planning handlers
  document.querySelectorAll<HTMLElement>('[data-action="open-plan-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditPlanning.isModalOpen = true;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="close-plan-audit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditPlanning.isModalOpen = false;
      render();
    });
  });

  document.getElementById('planAuditForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const certSelect = document.getElementById('planCertSelect') as HTMLSelectElement | null;
    const typeSelect = document.getElementById('planTypeSelect') as HTMLSelectElement | null;
    const methodSelect = document.getElementById('planMethodologySelect') as HTMLSelectElement | null;
    const dateInput = document.getElementById('planDateInput') as HTMLInputElement | null;
    const reschedInput = document.getElementById('planRescheduleInput') as HTMLInputElement | null;
    const auditorSelect = document.getElementById('planAuditorSelect') as HTMLSelectElement | null;

    void handleCreateAudit({
      id_certificado: certSelect?.value || '',
      id_tipo_auditoria: typeSelect?.value || '',
      id_metodologia: methodSelect?.value || '',
      fecha_programacion: dateInput?.value || '',
      fecha_reprogramacion: reschedInput?.value.trim() || null,
      id_auditor_lider: auditorSelect?.value || '',
    });
  });

  // Findings logging & status toggle handlers
  document.querySelectorAll<HTMLElement>('[data-action="open-log-finding"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const auditId = btn.dataset.auditId || null;
      state.drilldown.isLoggingFinding = true;
      state.drilldown.loggingAuditId = auditId;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="close-log-finding"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.drilldown.isLoggingFinding = false;
      state.drilldown.loggingAuditId = null;
      render();
    });
  });

  document.getElementById('newFindingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const auditSelect = document.getElementById('findingAuditSelect') as HTMLSelectElement | null;
    const typeSelect = document.getElementById('findingTypeSelect') as HTMLSelectElement | null;
    const reqSelect = document.getElementById('findingReqSelect') as HTMLSelectElement | null;
    const procSelect = document.getElementById('findingProcessSelect') as HTMLSelectElement | null;
    const descInput = document.getElementById('findingDescInput') as HTMLTextAreaElement | null;
    const evidenceInput = document.getElementById('findingEvidenceInput') as HTMLInputElement | null;

    void handleCreateFinding({
      id_auditoria: auditSelect?.value || '',
      tipo: (typeSelect?.value || 'NC_MENOR') as FindingType,
      id_requisito: reqSelect?.value || '',
      id_proceso: procSelect?.value || '',
      descripcion: descInput?.value.trim() || '',
      evidencia: evidenceInput?.value.trim() || null,
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="toggle-finding-status"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const findingId = btn.dataset.findingId;
      const isCurrentlyClosed = btn.dataset.currentClosed === 'true';
      if (findingId) {
        void handleToggleFindingStatus(findingId, !isCurrentlyClosed);
      }
    });
  });

  // ==========================================
  // DOMAIN EXTRA (Phase 3) INTERACTIVE EVENTS
  // ==========================================

  // --- 1. Normas & Standards Events ---
  document.querySelectorAll<HTMLElement>('[data-action="select-norma"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const normaId = btn.dataset.normaId;
      if (!normaId) return;
      state.extraDomain.selectedNormaId = normaId;
      const norma = INITIAL_NORMAS.find((n) => n.id === normaId);
      state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
        id: `norma-${normaId}`,
        label: norma?.codigo || 'Norma',
        route: 'extra',
        subview: 'standards',
        entityId: normaId,
        tooltip: `Norma ISO > ${norma?.codigo || normaId}`,
      });
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="back-to-normas-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.selectedNormaId = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-extra-standards');
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-norma-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.normaTab;
      if (tab === 'acreditacion' || tab === 'requisitos') {
        state.extraDomain.activeNormaTab = tab;
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-norma-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.normaViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.extraDomain.normaViewMode = mode;
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="sort-norma"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.sortCol;
      if (col) {
        if (state.extraDomain.normaSortColumn === col) {
          state.extraDomain.normaSortDirection = cycleSortDirection(state.extraDomain.normaSortDirection);
        } else {
          state.extraDomain.normaSortColumn = col;
          state.extraDomain.normaSortDirection = 'asc';
        }
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-norma-filter-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.normaFilterStatus = btn.dataset.normaFilterStatus || 'ALL';
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-norma-filter-scheme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.normaFilterScheme = btn.dataset.normaFilterScheme || 'ALL';
      render();
    });
  });

  const normaSearch = document.getElementById('normaSearchInput') as HTMLInputElement | null;
  normaSearch?.addEventListener('input', (e) => {
    state.extraDomain.normaSearchQuery = (e.target as HTMLInputElement).value;
    render();
  });
  normaSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.extraDomain.normaSearchQuery = '';
      render();
    }
  });
  document.getElementById('clearNormaSearchBtn')?.addEventListener('click', () => {
    state.extraDomain.normaSearchQuery = '';
    render();
  });
  document.getElementById('resetNormaFiltersBtn')?.addEventListener('click', () => {
    state.extraDomain.normaSearchQuery = '';
    state.extraDomain.normaFilterStatus = 'ALL';
    state.extraDomain.normaFilterScheme = 'ALL';
    render();
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
    const form = e.target as HTMLFormElement;
    const orgId = (form.querySelector('[name="id_organismo"]') as HTMLSelectElement)?.value;
    const numero = (form.querySelector('[name="numero_acreditacion"]') as HTMLInputElement)?.value;
    const fecha = (form.querySelector('[name="fecha_concesion"]') as HTMLInputElement)?.value;
    const estatus = (form.querySelector('[name="estatus"]') as HTMLSelectElement)?.value || 'Vigente';
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
        estatus: estatus as any,
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
        entityId: secId,
        tooltip: `Sector IAF > ${sec?.sector || secId}`,
      });
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="back-to-iaf-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.selectedSectorId = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-extra-iaf');
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-iaf-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.iafTab;
      if (tab === 'subsectores' || tab === 'auditores') {
        state.extraDomain.activeSectorTab = tab;
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-iaf-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.iafViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.extraDomain.iafViewMode = mode;
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="sort-iaf"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.sortCol;
      if (col) {
        if (state.extraDomain.iafSortColumn === col) {
          state.extraDomain.iafSortDirection = cycleSortDirection(state.extraDomain.iafSortDirection);
        } else {
          state.extraDomain.iafSortColumn = col;
          state.extraDomain.iafSortDirection = 'asc';
        }
        render();
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-iaf-filter-risk]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.iafFilterRisk = btn.dataset.iafFilterRisk || 'ALL';
      render();
    });
  });

  const iafSearch = document.getElementById('iafSearchInput') as HTMLInputElement | null;
  iafSearch?.addEventListener('input', (e) => {
    state.extraDomain.iafSearchQuery = (e.target as HTMLInputElement).value;
    render();
  });
  iafSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.extraDomain.iafSearchQuery = '';
      render();
    }
  });
  document.getElementById('clearIafSearchBtn')?.addEventListener('click', () => {
    state.extraDomain.iafSearchQuery = '';
    render();
  });
  document.getElementById('resetIafFiltersBtn')?.addEventListener('click', () => {
    state.extraDomain.iafSearchQuery = '';
    state.extraDomain.iafFilterRisk = 'ALL';
    render();
  });

  document.getElementById('openNewSubsectorModalBtn')?.addEventListener('click', () => {
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
    const form = e.target as HTMLFormElement;
    const codigo = (form.querySelector('[name="codigo"]') as HTMLInputElement)?.value;
    const desc = (form.querySelector('[name="descripcion"]') as HTMLTextAreaElement)?.value;
    const riesgo = (form.querySelector('[name="categoria_riesgo"]') as HTMLSelectElement)?.value || 'MEDIO';
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
        categoria_riesgo: riesgo as any,
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
        entityId: estId,
        tooltip: `Estatus > ${est?.estatus || estId}`,
      });
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="back-to-estatus-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.selectedEstatusId = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-extra-estatus');
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-estatus-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.estatusViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.extraDomain.estatusViewMode = mode;
        render();
      }
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="sort-estatus"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.sortCol;
      if (col) {
        if (state.extraDomain.estatusSortColumn === col) {
          state.extraDomain.estatusSortDirection = cycleSortDirection(state.extraDomain.estatusSortDirection);
        } else {
          state.extraDomain.estatusSortColumn = col;
          state.extraDomain.estatusSortDirection = 'asc';
        }
        render();
      }
    });
  });
  const estatusSearch = document.getElementById('estatusSearchInput') as HTMLInputElement | null;
  estatusSearch?.addEventListener('input', (e) => {
    state.extraDomain.estatusSearchQuery = (e.target as HTMLInputElement).value;
    render();
  });
  document.getElementById('clearEstatusSearchBtn')?.addEventListener('click', () => {
    state.extraDomain.estatusSearchQuery = '';
    render();
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
        entityId: tipoId,
        tooltip: `Tipo Auditoría > ${t?.tipo || tipoId}`,
      });
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="back-to-tipo-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.selectedTipoId = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-extra-tipos');
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-tipo-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.tipoViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.extraDomain.tipoViewMode = mode;
        render();
      }
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="sort-tipo"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.sortCol;
      if (col) {
        if (state.extraDomain.tipoSortColumn === col) {
          state.extraDomain.tipoSortDirection = cycleSortDirection(state.extraDomain.tipoSortDirection);
        } else {
          state.extraDomain.tipoSortColumn = col;
          state.extraDomain.tipoSortDirection = 'asc';
        }
        render();
      }
    });
  });
  const tipoSearch = document.getElementById('tipoSearchInput') as HTMLInputElement | null;
  tipoSearch?.addEventListener('input', (e) => {
    state.extraDomain.tipoSearchQuery = (e.target as HTMLInputElement).value;
    render();
  });
  document.getElementById('clearTipoSearchBtn')?.addEventListener('click', () => {
    state.extraDomain.tipoSearchQuery = '';
    render();
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
        entityId: metId,
        tooltip: `Metodología > ${m?.metodologia || metId}`,
      });
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="back-to-metodologia-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.extraDomain.selectedMetodologiaId = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-extra-metodologias');
      render();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-metodologia-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.metodologiaViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.extraDomain.metodologiaViewMode = mode;
        render();
      }
    });
  });
  document.querySelectorAll<HTMLElement>('[data-action="sort-metodologia"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.sortCol;
      if (col) {
        if (state.extraDomain.metodologiaSortColumn === col) {
          state.extraDomain.metodologiaSortDirection = cycleSortDirection(state.extraDomain.metodologiaSortDirection);
        } else {
          state.extraDomain.metodologiaSortColumn = col;
          state.extraDomain.metodologiaSortDirection = 'asc';
        }
        render();
      }
    });
  });
  const metSearch = document.getElementById('metodologiaSearchInput') as HTMLInputElement | null;
  metSearch?.addEventListener('input', (e) => {
    state.extraDomain.metodologiaSearchQuery = (e.target as HTMLInputElement).value;
    render();
  });
  document.getElementById('clearMetodologiaSearchBtn')?.addEventListener('click', () => {
    state.extraDomain.metodologiaSearchQuery = '';
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
        entityId: orgId,
        tooltip: `Organización > ${org?.nombre || orgId}`,
      });
      render();
    });
  });

  // 2. Back to organizations list
  document.querySelectorAll<HTMLElement>('[data-action="back-to-org-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.organizacionDomain.selectedOrganizacionId = null;
      state.organizacionDomain.isEditingAttributes = false;
      state.organizacionDomain.editErrorMessage = null;
      state.organizacionDomain.saveSuccessMessage = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-certificacion-organizations');
      render();
    });
  });

  // 3. View mode toggle (grid | list)
  document.querySelectorAll<HTMLElement>('[data-org-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.orgViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.organizacionDomain.viewMode = mode;
        render();
      }
    });
  });

  // 4. Column sorting (Excel-style loop)
  document.querySelectorAll<HTMLElement>('[data-action="sort-org"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.sortCol as
        | 'nombre'
        | 'rif'
        | 'certificados_activos'
        | 'sector'
        | undefined;
      if (col) {
        if (state.organizacionDomain.sortColumn === col) {
          state.organizacionDomain.sortDirection = cycleSortDirection(
            state.organizacionDomain.sortDirection
          );
        } else {
          state.organizacionDomain.sortColumn = col;
          state.organizacionDomain.sortDirection = 'asc';
        }
        render();
      }
    });
  });

  // 5. Facet: Active certificate presence
  document.querySelectorAll<HTMLElement>('[data-org-filter-active]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.orgFilterActive as
        | 'ALL'
        | 'WITH_ACTIVE'
        | 'WITHOUT_ACTIVE'
        | undefined;
      if (val) {
        state.organizacionDomain.hasActiveCertificates = val;
        render();
      }
    });
  });

  // 6. Facet: Primary Sector IAF
  document.querySelectorAll<HTMLElement>('[data-org-filter-sector]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.orgFilterSector || 'ALL';
      state.organizacionDomain.selectedSectorIaf = sec;
      render();
    });
  });

  // 7. Search input & clear/reset
  const orgDirectorySearchInput = document.getElementById('orgSearchInput') as HTMLInputElement | null;
  orgDirectorySearchInput?.addEventListener('input', (e) => {
    state.organizacionDomain.query = (e.target as HTMLInputElement).value;
    render();
  });
  orgDirectorySearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.organizacionDomain.query = '';
      render();
    }
  });
  document.getElementById('clearOrgSearchBtn')?.addEventListener('click', () => {
    state.organizacionDomain.query = '';
    render();
  });
  document.getElementById('resetOrgFiltersBtn')?.addEventListener('click', () => {
    state.organizacionDomain.query = '';
    state.organizacionDomain.hasActiveCertificates = 'ALL';
    state.organizacionDomain.selectedSectorIaf = 'ALL';
    render();
  });

  // 8. Edit mode toggling
  document.getElementById('startEditOrgBtn')?.addEventListener('click', () => {
    state.organizacionDomain.isEditingAttributes = true;
    state.organizacionDomain.editErrorMessage = null;
    state.organizacionDomain.saveSuccessMessage = null;
    render();
  });
  document.getElementById('cancelEditOrgBtn')?.addEventListener('click', () => {
    state.organizacionDomain.isEditingAttributes = false;
    state.organizacionDomain.editErrorMessage = null;
    render();
  });

  // 9. Save edited organization attributes
  document.getElementById('editOrgForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
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

  // 10. Click IAF sector in Zone 1 -> navigates to Domain Extra Sector IAF
  document.querySelectorAll<HTMLElement>('[data-action="view-sector-iaf"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const secNum = btn.dataset.sectorNumber || '17';
      state.activeRoute = 'extra';
      state.activeSubSection = 'iaf';
      state.extraDomain.iafSearchQuery = secNum;
      state.breadcrumbs = resetBreadcrumbToDomain('extra', 'iaf');
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
          entityId: certId,
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
        entityId: certId,
        tooltip: `Certificado > ${cert?.numero_certificado || certId}`,
      });
      syncUrlHash('certificacion', 'certificates');
      render();
    });
  });

  // 2. Back to certificates list
  document.querySelectorAll<HTMLElement>('[data-action="back-to-cert-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.certificadoDomain.selectedCertId = null;
      state.certificadoDomain.isEditingAttributes = false;
      state.certificadoDomain.editErrorMessage = null;
      state.certificadoDomain.saveSuccessMessage = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-certificacion-certificates');
      render();
    });
  });

  // 3. View mode toggle (grid | list)
  document.querySelectorAll<HTMLElement>('[data-cert-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.certViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.certificadoDomain.viewMode = mode;
        render();
      }
    });
  });

  // 4. Excel-style column sorting
  document.querySelectorAll<HTMLElement>('[data-action="sort-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.column as
        | 'numero_certificado'
        | 'organizacion'
        | 'norma'
        | 'estatus'
        | 'vigencia'
        | 'sedes'
        | undefined;
      if (col) {
        if (state.certificadoDomain.sortColumn === col) {
          state.certificadoDomain.sortDirection = cycleSortDirection(
            state.certificadoDomain.sortDirection
          );
        } else {
          state.certificadoDomain.sortColumn = col;
          state.certificadoDomain.sortDirection = 'asc';
        }
        render();
      }
    });
  });

  // 5. Facet: Standard (Norma ISO)
  document.querySelectorAll<HTMLElement>('[data-cert-filter-standard]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.certificadoDomain.selectedStandard = btn.dataset.certFilterStandard || 'ALL';
      render();
    });
  });

  // 6. Facet: Status (Estatus Operativo)
  document.querySelectorAll<HTMLElement>('[data-cert-filter-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.certificadoDomain.selectedStatus = btn.dataset.certFilterStatus || 'ALL';
      render();
    });
  });

  // 7. Facet: IAF Technical Sector
  document.querySelectorAll<HTMLElement>('[data-cert-filter-iaf]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.certificadoDomain.selectedSectorIaf = btn.dataset.certFilterIaf || 'ALL';
      render();
    });
  });

  // 8. Search input & clear/reset
  const certSearchInput = document.getElementById('certDirectorySearchInput') as HTMLInputElement | null;
  certSearchInput?.addEventListener('input', (e) => {
    state.certificadoDomain.query = (e.target as HTMLInputElement).value;
    render();
  });
  certSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.certificadoDomain.query = '';
      render();
    }
  });
  document.getElementById('clearCertSearchBtn')?.addEventListener('click', () => {
    state.certificadoDomain.query = '';
    render();
  });
  document.querySelectorAll<HTMLElement>('#resetCertFiltersBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.certificadoDomain.query = '';
      state.certificadoDomain.selectedStandard = 'ALL';
      state.certificadoDomain.selectedStatus = 'ALL';
      state.certificadoDomain.selectedSectorIaf = 'ALL';
      render();
    });
  });

  // 9. Child tab switching (5 specialized child modules)
  document.querySelectorAll<HTMLElement>('[data-cert-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.certTab as CertificadoChildTab | undefined;
      if (tab) {
        state.certificadoDomain.activeChildTab = tab;
        render();
      }
    });
  });

  // 10. Edit mode toggling
  document.getElementById('startEditCertBtn')?.addEventListener('click', () => {
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

  // 13. Nav link: view organization from certificate Zone 1
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
      state.breadcrumbs = resetBreadcrumbToDomain('certificacion', 'organizations');
      if (org) {
        state.breadcrumbs = pushBreadcrumb(state.breadcrumbs, {
          id: `org-${org.id}`,
          label: org.nombre,
          route: 'certificacion',
          subview: 'organizations',
          entityId: org.id,
          tooltip: `Organización > ${org.nombre}`,
        });
      }
      syncUrlHash('certificacion', 'organizations');
      render();
    });
  });

  // 14. Nav link: view standard (norma) from certificate Zone 1
  document.querySelectorAll<HTMLElement>('[data-action="view-norma-from-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const normaId = btn.dataset.normaId;
      state.activeRoute = 'extra';
      state.activeSubSection = 'standards';
      state.extraDomain.selectedNormaId = normaId || null;
      state.breadcrumbs = resetBreadcrumbToDomain('extra', 'standards');
      syncUrlHash('extra', 'standards');
      render();
    });
  });

  // 15. Nav link: view IAF sector from certificate Zone 1
  document.querySelectorAll<HTMLElement>('[data-action="view-iaf-from-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sectorId = btn.dataset.sectorId;
      state.activeRoute = 'extra';
      state.activeSubSection = 'iaf';
      state.extraDomain.selectedSectorId = sectorId || null;
      state.breadcrumbs = resetBreadcrumbToDomain('extra', 'iaf');
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
        entityId: auditorId,
        tooltip: `Auditor > ${aud?.nombre || auditorId}`,
      });
      syncUrlHash('certificacion', 'auditors');
      render();
    });
  });

  // 2. Back to auditor list
  document.querySelectorAll<HTMLElement>('[data-action="back-to-auditor-list"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditorDomain.selectedAuditorId = null;
      state.auditorDomain.isEditingAttributes = false;
      state.auditorDomain.editErrorMessage = null;
      state.auditorDomain.saveSuccessMessage = null;
      state.breadcrumbs = popToBreadcrumb(state.breadcrumbs, 'subview-certificacion-auditors');
      render();
    });
  });

  // 3. View mode toggle (grid | list)
  document.querySelectorAll<HTMLElement>('[data-auditor-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.auditorViewMode;
      if (mode === 'grid' || mode === 'list') {
        state.auditorDomain.viewMode = mode;
        render();
      }
    });
  });

  // 4. Excel-style column sorting
  document.querySelectorAll<HTMLElement>('[data-action="sort-auditor"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.column as
        | 'nombre'
        | 'codigo_credencial'
        | 'calificacion'
        | 'normas'
        | 'sectores'
        | undefined;
      if (col) {
        if (state.auditorDomain.sortColumn === col) {
          state.auditorDomain.sortDirection = cycleSortDirection(
            state.auditorDomain.sortDirection
          );
        } else {
          state.auditorDomain.sortColumn = col;
          state.auditorDomain.sortDirection = 'asc';
        }
        render();
      }
    });
  });

  // 5. Facet: Calificación status
  document.querySelectorAll<HTMLElement>('[data-auditor-filter-calificacion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditorDomain.selectedCalificacion = (btn.dataset.auditorFilterCalificacion || 'ALL') as any;
      render();
    });
  });

  // 6. Facet: Standard (Norma ISO)
  document.querySelectorAll<HTMLElement>('[data-auditor-filter-standard]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditorDomain.selectedStandard = btn.dataset.auditorFilterStandard || 'ALL';
      render();
    });
  });

  // 7. Facet: IAF Sector
  document.querySelectorAll<HTMLElement>('[data-auditor-filter-iaf]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditorDomain.selectedSectorIaf = btn.dataset.auditorFilterIaf || 'ALL';
      render();
    });
  });

  // 8. Search input & clear/reset
  const audSearchInput = document.getElementById('auditorDirectorySearchInput') as HTMLInputElement | null;
  audSearchInput?.addEventListener('input', (e) => {
    state.auditorDomain.query = (e.target as HTMLInputElement).value;
    render();
  });
  audSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.auditorDomain.query = '';
      render();
    }
  });
  document.getElementById('clearAuditorSearchBtn')?.addEventListener('click', () => {
    state.auditorDomain.query = '';
    render();
  });
  document.querySelectorAll<HTMLElement>('#resetAuditorFiltersBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.auditorDomain.query = '';
      state.auditorDomain.selectedCalificacion = 'ALL';
      state.auditorDomain.selectedStandard = 'ALL';
      state.auditorDomain.selectedSectorIaf = 'ALL';
      render();
    });
  });

  // 9. Child tab switching (Matriz de Competencias | Historial de Auditorías)
  document.querySelectorAll<HTMLElement>('[data-auditor-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.auditorTab as AuditorChildTab | undefined;
      if (tab) {
        state.auditorDomain.activeChildTab = tab;
        render();
      }
    });
  });

  // 10. Edit mode toggling for Auditor Direct Attributes
  document.getElementById('startEditAuditorBtn')?.addEventListener('click', () => {
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
      state.auditorDomain.saveSuccessMessage =
        'Asignación de nueva competencia ISO 17021-1 disponible para directores técnicos y administradores de acreditación.';
      render();
    });
  });
}

const TIPO_AUDITORIA_MAP: Record<string, string> = {
  'b0000000-0000-0000-0000-000000000001': 'ETAPA_1',
  'b0000000-0000-0000-0000-000000000002': 'ETAPA_2',
  'b0000000-0000-0000-0000-000000000003': 'VIGILANCIA_1',
  'b0000000-0000-0000-0000-000000000004': 'VIGILANCIA_2',
  'b0000000-0000-0000-0000-000000000005': 'RECERTIFICACION',
  'b0000000-0000-0000-0000-000000000006': 'EXTRAORDINARIA',
};

const METODOLOGIA_MAP: Record<string, string> = {
  'c0000000-0000-0000-0000-000000000001': 'PRESENCIAL',
  'c0000000-0000-0000-0000-000000000002': 'REMOTA',
  'c0000000-0000-0000-0000-000000000003': 'HIBRIDA',
};

async function handleCreateAudit(data: {
  id_certificado: string;
  id_tipo_auditoria: string;
  id_metodologia: string;
  fecha_programacion: string;
  fecha_reprogramacion?: string | null;
  id_auditor_lider?: string;
}): Promise<void> {
  const validation = validateAuditPlanningInput(data);
  if (!validation.valid) {
    return;
  }

  const cert = state.exploration.records.find((c) => c.id === data.id_certificado);
  const auditor = state.domainData.auditors.find((a) => a.id === data.id_auditor_lider);
  const tipoName =
    TIPO_AUDITORIA_MAP[data.id_tipo_auditoria] || data.id_tipo_auditoria || 'RECERTIFICACION';
  const metName =
    METODOLOGIA_MAP[data.id_metodologia] || data.id_metodologia || 'PRESENCIAL';

  const newAudit: AuditRecord = {
    id: `audit-${Date.now()}`,
    id_certificado: data.id_certificado,
    numero_certificado: cert?.numero_certificado || 'FN-QMS-2024-001',
    organizacion_nombre: cert?.organizacion_nombre || 'Iberometal Componentes S.A.',
    tipo_auditoria: tipoName,
    metodologia: metName,
    fecha_programacion: data.fecha_programacion,
    fecha_reprogramacion: data.fecha_reprogramacion || null,
    auditor_lider: auditor ? `${auditor.nombre} (Auditor Líder)` : 'Ing. Carlos Mendoza (Auditor Líder)',
    estatus: 'PLANIFICADA',
  };

  try {
    const insertPayload: Record<string, unknown> = {
      id_certificado: data.id_certificado,
      id_tipo_auditoria: data.id_tipo_auditoria,
      id_metodologia: data.id_metodologia,
      fecha_programacion: data.fecha_programacion,
    };
    if (data.fecha_reprogramacion) {
      insertPayload.fecha_reprogramacion = data.fecha_reprogramacion;
    }

    const { data: dbAudit, error } = await supabase
      .from('auditoria')
      .insert(insertPayload)
      .select('id')
      .single();

    if (!error && dbAudit) {
      newAudit.id = dbAudit.id;
      if (data.id_auditor_lider) {
        await supabase.from('equipo_auditor').insert({
          id_auditoria: dbAudit.id,
          id_auditor: data.id_auditor_lider,
          rol_auditor: 'AUDITOR_LIDER',
        });
      }
      const relatedSite = state.domainData.sites.find(
        (s) => s.numero_certificado === cert?.numero_certificado
      );
      if (relatedSite) {
        await supabase.from('sitios_por_auditoria').insert({
          id_auditoria: dbAudit.id,
          id_sitio: relatedSite.id,
        });
      }
    }
  } catch (err) {
    console.warn('Fallback to local reactive state for new audit:', err);
  }

  state.domainData.audits = [newAudit, ...state.domainData.audits];
  state.selectedScopeAuditId = newAudit.id;
  state.auditPlanning.isModalOpen = false;
  render();
}

async function handleCreateFinding(data: {
  id_auditoria: string;
  tipo: FindingType;
  id_requisito: string;
  id_proceso: string;
  descripcion: string;
  evidencia?: string | null;
}): Promise<void> {
  const validation = validateFindingInput(data);
  if (!validation.valid) {
    return;
  }

  const audit = state.domainData.audits.find((a) => a.id === data.id_auditoria);
  const req = state.domainData.requirements.find((r) => r.id === data.id_requisito);
  const proc = state.domainData.processes.find((p) => p.id === data.id_proceso);

  const newFinding: FindingRecord = {
    id: `finding-${Date.now()}`,
    id_auditoria: data.id_auditoria,
    auditoria_tipo: audit?.tipo_auditoria || 'RECERTIFICACION',
    numero_certificado: audit?.numero_certificado || 'FN-QMS-2024-001',
    organizacion_nombre: audit?.organizacion_nombre || 'Iberometal Componentes S.A.',
    id_requisito: data.id_requisito,
    requisito_codigo: req?.codigo || '8.5',
    id_proceso: data.id_proceso,
    proceso_nombre: proc?.nombre_proceso || 'Troquelado y Fundición',
    tipo: data.tipo,
    descripcion: data.descripcion,
    evidencia: data.evidencia || null,
    cerrado: false,
    created_at: new Date().toISOString(),
  };

  try {
    const { data: dbFinding, error } = await supabase
      .from('hallazgo')
      .insert({
        id_auditoria: data.id_auditoria,
        id_requisito: data.id_requisito,
        id_proceso: data.id_proceso,
        tipo: data.tipo,
        descripcion: data.descripcion,
        evidencia: data.evidencia || null,
        cerrado: false,
      })
      .select('id')
      .single();

    if (!error && dbFinding) {
      newFinding.id = dbFinding.id;
    }
  } catch (err) {
    console.warn('Fallback to local reactive state for new finding:', err);
  }

  state.domainData.findings = [newFinding, ...state.domainData.findings];
  state.drilldown.isLoggingFinding = false;
  state.drilldown.loggingAuditId = null;
  render();
}

async function handleToggleFindingStatus(
  findingId: string,
  nextClosed: boolean
): Promise<void> {
  state.domainData.findings = state.domainData.findings.map((f) =>
    f.id === findingId ? { ...f, cerrado: nextClosed } : f
  );
  render();

  try {
    await supabase
      .from('hallazgo')
      .update({ cerrado: nextClosed })
      .eq('id', findingId);
  } catch (err) {
    console.warn('Could not persist finding status toggle to Supabase:', err);
  }
}

function updateExplorationView(): void {
  const filtered = filterCertificateRecords(state.exploration.records, {
    query: state.exploration.query,
    selectedStatus: state.exploration.selectedStatus,
    selectedStandard: state.exploration.selectedStandard,
  });

  const resultsContainer = document.getElementById('explorationResultsContainer');
  if (resultsContainer) {
    if (filtered.length === 0) {
      resultsContainer.innerHTML = renderEmptySearchState(state.exploration.query);
    } else if (state.exploration.viewMode === 'list') {
      resultsContainer.innerHTML = renderCertificateList(filtered);
    } else {
      resultsContainer.innerHTML = renderCertificateGrid(filtered);
    }
  }

  // Update clear button visibility
  const searchInput = document.getElementById('certificateSearchInput') as HTMLInputElement | null;
  const wrapper = searchInput?.parentElement;
  if (wrapper) {
    const iconContainer = wrapper.querySelector('.absolute.right-0');
    if (iconContainer) {
      if (state.exploration.query) {
        iconContainer.innerHTML = `
          <button
            type="button"
            id="clearSearchBtn"
            data-action="clear-search"
            title="Limpiar búsqueda (Esc)"
            aria-label="Limpiar búsqueda"
            class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        `;
        document.getElementById('clearSearchBtn')?.addEventListener('click', handleClearSearch);
      } else {
        iconContainer.innerHTML = `
          <kbd class="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs select-none">
            /
          </kbd>
        `;
      }
    }
  }

  // Rebind reset-all buttons in empty search state if rendered
  document.querySelectorAll<HTMLElement>('[data-action="reset-all"]').forEach((btn) => {
    btn.addEventListener('click', handleResetAllFilters);
  });
}

function handleClearSearch(): void {
  state.exploration.query = '';
  const input = document.getElementById('certificateSearchInput') as HTMLInputElement | null;
  if (input) {
    input.value = '';
    input.focus();
  }
  render();
}

function handleResetAllFilters(): void {
  state.exploration.query = '';
  state.exploration.selectedStatus = 'ALL';
  state.exploration.selectedStandard = 'ALL';
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
      actor_email: 'admin@fondonorma.test',
      old_data: null,
      new_data: {
        id: recordId,
        codigo: entityName,
        estatus: 'PLANIFICADA',
        created_at: '2024-01-15T09:00:00Z',
      },
      created_at: '2024-01-15T09:00:00Z',
    },
  ];
}

async function openAuditLogModal(
  tableName: string,
  recordId: string,
  entityName: string
): Promise<void> {
  state.auditLogModal = {
    isOpen: true,
    entityName,
    tableName,
    recordId,
    entries: [],
    loading: true,
    errorMessage: null,
  };
  render();

  try {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false });

    if (tableName) {
      query = query.eq('table_name', tableName);
    }
    if (recordId) {
      query = query.eq('record_id', recordId);
    }

    const { data, error } = await query.limit(20);

    if (error || !data || data.length === 0) {
      state.auditLogModal.loading = false;
      state.auditLogModal.entries = generateFallbackAuditEntries(tableName, recordId, entityName);
      render();
      return;
    }

    state.auditLogModal.loading = false;
    state.auditLogModal.entries = data as AuditLogEntry[];
    render();
  } catch {
    state.auditLogModal.loading = false;
    state.auditLogModal.entries = generateFallbackAuditEntries(tableName, recordId, entityName);
    render();
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
    loading: false,
    errorMessage: null,
  };
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
    loading: false,
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

    if (isApprovedAdmin()) {
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
    const { data, error } = await supabase.from('certificado').select(`
      id,
      numero_certificado,
      multisitio,
      created_at,
      organizacion:id_organizacion ( id, nombre, rif, direccion_fiscal ),
      norma:id_norma ( id, esquema, norma ),
      estatus:id_estatus ( id, estatus ),
      sector_iaf:id_sector_iaf ( id, sector )
    `);

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
              .eq('id_certificado', String(row.id));
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

      // Merge with sample records if only 1 DB seed certificate exists so user can fully test search & facets across different statuses/schemes
      const existingCodes = new Set(loaded.map((item) => item.numero_certificado));
      const supplemental = SAMPLE_CERTIFICATE_RECORDS.filter((s) => !existingCodes.has(s.numero_certificado));
      state.exploration.records = [...loaded, ...supplemental];
    } else {
      state.exploration.records = [...SAMPLE_CERTIFICATE_RECORDS];
    }
  } catch {
    state.exploration.records = [...SAMPLE_CERTIFICATE_RECORDS];
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
    ] = await Promise.all([
      supabase.from('auditoria').select(`
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
      `),
      supabase.from('auditor').select(`
        id,
        nombre,
        normas:norma_auditor ( norma:id_norma ( norma ) ),
        sectores:sector_iaf_auditor ( sector:id_sector_iaf ( sector ) )
      `),
      supabase.from('organizacion').select('id, nombre, rif, direccion_fiscal'),
      supabase.from('sitio').select(`
        id,
        numero_sitio,
        nombre_sitio,
        direccion_sitio,
        certificado:id_certificado ( numero_certificado )
      `),
      supabase.from('proceso').select(`
        id,
        nombre_proceso,
        certificado:id_certificado ( numero_certificado )
      `),
      supabase.from('turno').select('id, hora_entrada, hora_salida'),
      supabase.from('norma').select('id, esquema, norma'),
      supabase.from('requisito').select(`
        id,
        codigo,
        ruta_materializada,
        norma:id_norma ( norma )
      `),
      supabase.from('sector_iaf').select('id, sector'),
      supabase.from('estatus').select('estatus'),
      supabase.from('tipo_auditoria').select('tipo'),
      supabase.from('metodologia_auditoria').select('metodologia'),
      supabase.from('hallazgo').select(`
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
      `),
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

      if (!state.selectedScopeAuditId && state.domainData.audits.length > 0) {
        state.selectedScopeAuditId = state.domainData.audits[0].id;
      }
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
    }

    // Process Standards
    if (!standardsRes.error && Array.isArray(standardsRes.data) && standardsRes.data.length > 0) {
      state.domainData.standards = standardsRes.data.map((row: Record<string, unknown>) => {
        const normaStr = String(row.norma);
        return {
          id: String(row.id),
          esquema: String(row.esquema),
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

      const existingIds = new Set(loadedFindings.map((f) => f.id));
      const supplemental = INITIAL_FINDINGS.filter((f) => !existingIds.has(f.id));
      state.domainData.findings = [...loadedFindings, ...supplemental];
    } else {
      state.domainData.findings = [...INITIAL_FINDINGS];
    }
  } catch (err) {
    console.warn('Fallback to seeded domain records:', err);
  } finally {
    state.domainData.loading = false;
    render();
  }
}

async function loadApprovalProfiles(): Promise<void> {
  if (!isApprovedAdmin()) return;

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
      supabase.from('organizacion').select('id', { count: 'exact', head: true }),
      supabase.from('certificado').select('id', { count: 'exact', head: true }),
      supabase.from('auditoria').select('id', { count: 'exact', head: true }),
      supabase.from('hallazgo').select('id', { count: 'exact', head: true }),
      supabase.from('certificado').select('id, numero_certificado').limit(1).maybeSingle(),
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
      supabase.from('client_organization_access').select('id', { count: 'exact', head: true }),
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

// Global keyboard shortcuts: / to focus search, Escape to close modals/clear search
document.addEventListener('keydown', (e) => {
  // '/' shortcut to focus search input
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
    const searchInput = (document.getElementById('auditorDirectorySearchInput') ||
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

  if (document.activeElement?.id === 'certificateSearchInput') {
    if (state.exploration.query) {
      state.exploration.query = '';
      const input = document.getElementById('certificateSearchInput') as HTMLInputElement | null;
      if (input) input.value = '';
      updateExplorationView();
    } else {
      (document.activeElement as HTMLElement).blur();
    }
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
      render();
      if (route === 'approvals') {
        void loadApprovalProfiles();
      } else if (route === 'database' && state.dbCheck.lastCheckedAt === null) {
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
      render();
    }
  }
});

// Global Keyboard Shortcuts ('/' to focus search, 'Escape' to dismiss modals/clear)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.auditLogModal.isOpen) {
      closeAuditLogModal();
    }
  } else if (
    e.key === '/' &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {
    e.preventDefault();
    const searchInput = (document.getElementById('auditorDirectorySearchInput') ||
      document.getElementById('certDirectorySearchInput') ||
      document.getElementById('certificateSearchInput')) as HTMLInputElement | null;
    searchInput?.focus();
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
