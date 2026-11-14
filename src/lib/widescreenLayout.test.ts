import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_HEADER_CONTAINER_CLASS,
  APP_SHELL_CONTAINER_CLASS,
  getUniversalCardGridClass,
} from './layout';
import { renderHeader } from '../views/header';
import { renderDashboardView } from '../views/dashboardView';
import { renderCertificacionView } from '../views/certificacionView';
import { renderAuditoriasView } from '../views/auditoriasView';
import { renderExtraView } from '../views/extraView';
import { renderApprovalsView } from '../views/approvalsView';
import { renderDatabaseStatusView } from '../views/databaseStatusView';
import { renderProfileView } from '../views/profileView';
import { renderUniversalTemplate } from '../views/universalTemplate';
import { renderDetailPageTemplate } from '../views/detailTemplate';
import { renderAuditLogModal } from '../views/auditLogModal';
import { renderAuthView } from '../views/authView';
import type {
  CalendarioViewState,
  ProgramacionViewState,
  ResultadoViewState,
} from './auditExecution';
import type { UserProfile } from './healthCheck';

const ADMIN_PROFILE: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'Admin Widescreen',
  role: 'ADMIN',
  status: 'APPROVED',
  created_at: '2025-01-01T00:00:00.000Z',
};

test('Widescreen layout tokens expand containers to 1720px with responsive horizontal padding', () => {
  assert.ok(APP_SHELL_CONTAINER_CLASS.includes('max-w-[1720px]'));
  assert.ok(APP_SHELL_CONTAINER_CLASS.includes('px-4 sm:px-6 lg:px-8 xl:px-12'));
  assert.ok(APP_HEADER_CONTAINER_CLASS.includes('max-w-[1720px]'));
  assert.ok(APP_HEADER_CONTAINER_CLASS.includes('lg:px-8 xl:px-12'));

  assert.ok(getUniversalCardGridClass(true).includes('xl:grid-cols-3'));
  assert.ok(getUniversalCardGridClass(true).includes('min-[1680px]:grid-cols-4'));
  assert.ok(getUniversalCardGridClass(false).includes('2xl:grid-cols-4'));
});

test('Header, Dashboard, Domain Shells, and Admin Consoles all use widescreen container bounds instead of max-w-7xl/max-w-4xl', () => {
  const headerLoggedOut = renderHeader({
    profile: null,
    email: null,
    isAdmin: false,
    activeRoute: 'dashboard',
    activeSubSection: null,
    pendingCount: 0,
    openMenu: null,
  });
  assert.ok(headerLoggedOut.includes('max-w-[1720px]'));
  assert.ok(!headerLoggedOut.includes('max-w-7xl'));

  const headerLoggedIn = renderHeader({
    profile: ADMIN_PROFILE,
    email: 'admin@fn.local',
    isAdmin: true,
    canViewApprovals: true,
    activeRoute: 'dashboard',
    activeSubSection: null,
    pendingCount: 2,
    openMenu: null,
  });
  assert.ok(headerLoggedIn.includes('max-w-[1720px]'));
  assert.ok(!headerLoggedIn.includes('max-w-7xl'));

  const dashboardHtml = renderDashboardView(ADMIN_PROFILE, 'admin@fn.local');
  assert.ok(dashboardHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(!dashboardHtml.includes('max-w-7xl'));

  const certHtml = renderCertificacionView(ADMIN_PROFILE, {
    activeSubSection: 'organizations',
    filters: { query: '', selectedStatus: 'ALL', selectedStandard: 'ALL', viewMode: 'grid' },
    filteredCertificates: [],
    allCertificates: [],
    availableStatuses: [],
    availableStandards: [],
    organizations: [],
    sites: [],
    processes: [],
    shifts: [],
    loading: false,
  });
  assert.ok(certHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(!certHtml.includes('max-w-7xl'));

  const programacionState: ProgramacionViewState = {
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
  const calendarioState: CalendarioViewState = {
    displayMode: 'month',
    referenceYear: 2026,
    referenceMonth: 1,
    filterAuditorId: 'ALL',
    filterStandard: 'ALL',
    filterMethodology: 'ALL',
    drawerAuditId: null,
  };
  const resultadoState: ResultadoViewState = {
    selectedAuditId: 'ALL',
    activeAuditIdForDecision: '',
    displayMode: 'kanban',
    filterType: 'ALL',
    filterLifecycle: 'ALL',
    searchQuery: '',
    isLoggingFinding: false,
    inspectingFindingId: null,
  };

  const auditHtml = renderAuditoriasView(ADMIN_PROFILE, {
    activeSubSection: 'scheduling',
    programacionState,
    calendarioState,
    resultadoState,
    programacionAudits: [],
    phase5Findings: [],
    allAuditorsDetailed: [],
    certificates: [],
    processes: [],
    requirements: [],
    standards: [],
    loading: false,
  });
  assert.ok(auditHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(!auditHtml.includes('max-w-7xl'));

  const extraHtml = renderExtraView(ADMIN_PROFILE, {
    activeSubSection: 'standards',
    standards: [],
    requirements: [],
    iafSectors: [],
    catalogs: [],
    selectedStandardId: null,
    loading: false,
  });
  assert.ok(extraHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(!extraHtml.includes('max-w-7xl'));

  const approvalsHtml = renderApprovalsView({
    profiles: [ADMIN_PROFILE],
    filter: 'ALL',
    loading: false,
    updatingId: null,
    errorMessage: null,
    successMessage: null,
    currentAdminId: ADMIN_PROFILE.id,
  });
  assert.ok(approvalsHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(!approvalsHtml.includes('max-w-4xl'));

  const dbHtml = renderDatabaseStatusView([], false, null);
  assert.ok(dbHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(!dbHtml.includes('max-w-4xl'));

  const profileHtml = renderProfileView({
    profile: ADMIN_PROFILE,
    userEmail: 'admin@fn.local',
    formState: {
      nombreInput: ADMIN_PROFILE.nombre,
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
  });
  assert.ok(profileHtml.includes(APP_SHELL_CONTAINER_CLASS));
  assert.ok(profileHtml.includes('xl:grid-cols-12'));
});

test('Universal Template, Detail Template, AuditLog Modal expand for desktop while Auth & Prose retain readable bounds', () => {
  const mvHtml = renderUniversalTemplate({
    title: 'Organizaciones',
    searchQuery: '',
    totalCount: 1,
    filteredCount: 1,
    viewMode: 'grid',
    isSidebarOpen: true,
    facetGroups: [],
    items: [{ id: '1', name: 'Org' }],
    columns: [{ id: 'name', header: 'Nombre', renderCell: (x) => x.name }],
    renderCard: (x) => `<div>${x.name}</div>`,
  });
  assert.ok(mvHtml.includes('xl:grid-cols-3'));
  assert.ok(mvHtml.includes('min-[1680px]:grid-cols-4'));
  assert.ok(mvHtml.includes('xl:w-72'));

  const detailHtml = renderDetailPageTemplate({
    entityType: 'Registro',
    entitySymbol: '📄',
    title: 'Test',
    backButton: { label: 'Volver', nav: 'dashboard' },
    tableName: 'organizacion',
    recordId: '1',
    attributes: [{ label: 'Clave', value: 'Valor' }],
    editableScopeField: {
      label: 'Alcance',
      value: 'Alcance ISO',
      maxLength: 1000,
      fieldName: 'alcance',
    },
  });
  assert.ok(detailHtml.includes('2xl:grid-cols-4'));
  assert.ok(detailHtml.includes('max-w-4xl'));

  const modalHtml = renderAuditLogModal({
    isOpen: true,
    entityName: 'Certificado',
    tableName: 'certificado',
    recordId: '1',
    entries: [],
    loading: false,
  });
  assert.ok(modalHtml.includes('max-w-4xl'));

  const authHtml = renderAuthView({
    mode: 'login',
    email: '',
    password: '',
    nombre: '',
    loading: false,
    errorMessage: null,
    successMessage: null,
    pendingApprovalMessage: null,
  });
  assert.ok(authHtml.includes('max-w-md'));
});