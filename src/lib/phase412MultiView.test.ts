import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import { INITIAL_ORGANIZACIONES } from './activeCertificates';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution';
import {
  INITIAL_NORMAS,
  INITIAL_ACREDITACIONES,
  INITIAL_ORGANISMOS,
  INITIAL_REQUISITOS_LTREE,
  INITIAL_SECTORES_IAF,
  INITIAL_SUBSECTORES_IAF,
  INITIAL_ESTATUS_CATALOG,
  INITIAL_TIPOS_AUDITORIA_CATALOG,
  INITIAL_METODOLOGIAS_CATALOG,
} from './extraDomain';
import { SAMPLE_CERTIFICATE_RECORDS } from './searchControls';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderOrganizacionView } from '../views/organizacionView';
import { renderCertificadoView } from '../views/certificadoView';
import { renderAuditorView } from '../views/auditorView';
import { renderProgramacionView } from '../views/programacionView';
import { renderCalendarioView } from '../views/calendarioView';
import { renderResultadoView } from '../views/resultadoView';
import { renderNormaView } from '../views/normaView';
import { renderSectorIafView } from '../views/sectorIafView';
import { renderEstatusView } from '../views/estatusView';
import { renderTipoAuditoriaView } from '../views/tipoAuditoriaView';
import { renderMetodologiaAuditoriaView } from '../views/metodologiaAuditoriaView';

const ADMIN_PROFILE: UserProfile = {
  id: '00000000-0000-0000-0000-000000000099',
  nombre: 'Admin Pruebas',
  role: 'ADMIN',
  status: 'APPROVED',
  created_at: '2025-01-01T00:00:00Z',
};

const CLIENT_PROFILE: UserProfile = {
  id: '00000000-0000-0000-0000-000000000098',
  nombre: 'Cliente Pruebas',
  role: 'CLIENT',
  status: 'APPROVED',
  created_at: '2025-01-01T00:00:00Z',
};

function assertMultiViewCompliance(html: string, domainKey: string, entityLabel: string): void {
  assert.ok(html.includes(`data-mv-domain="${domainKey}"`), `Missing data-mv-domain="${domainKey}"`);
  assert.equal(/type=["']search["']/i.test(html), false, `Found forbidden type="search" in ${domainKey}`);
  assert.ok(html.includes('type="text"'), `Missing type="text" search input in ${domainKey}`);
  assert.ok(html.includes('data-toggle-sidebar="true"'), `Missing sidebar toggle in ${domainKey}`);
  assert.ok(html.includes('data-facet-checkbox="true"'), `Missing checkbox facets in ${domainKey}`);
  assert.ok(html.includes('Mostrando'), `Missing Mostrando totalizer in ${domainKey}`);
  assert.ok(html.includes(entityLabel), `Missing entity label "${entityLabel}" in ${domainKey}`);
  assert.ok(html.includes('data-view-mode="grid"'), `Missing Tarjetas switcher in ${domainKey}`);
  assert.ok(html.includes('data-view-mode="list"'), `Missing Tabla switcher in ${domainKey}`);
  assert.equal(
    assertZeroUuidExposure(html).compliant,
    true,
    `Zero-UUID exposure failed in ${domainKey}`
  );
}

test('Phase 4.1.2 Batch A1: Organizaciones Clientes directory uses Universal Multi View, creation button/form, and collapsed sidebar', () => {
  const html = renderOrganizacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedOrganizacionId: null,
      query: '',
      hasActiveCertificates: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
      activeChildTab: 'certificados',
      isSidebarOpen: true,
      facetSelections: { vigencia: new Set(['WITH_ACTIVE']) },
      isCreating: true,
    },
    organizaciones: INITIAL_ORGANIZACIONES,
    certificados: SAMPLE_CERTIFICATE_RECORDS,
  });

  assert.ok(html.includes('Organizaciones Clientes'));
  assertMultiViewCompliance(html, 'organizaciones', 'organizaciones');
  assert.ok(html.includes('data-action="open-create-org"'));
  assert.ok(html.includes('id="createOrganizacionForm"'));
  assert.ok(html.includes('data-facet-group="vigencia"'));
  assert.ok(html.includes('data-facet-group="sector_iaf"'));
  assert.ok(html.includes('aria-expanded="true"'));

  const collapsed = renderOrganizacionView({
    profile: CLIENT_PROFILE,
    state: {
      selectedOrganizacionId: null,
      query: '',
      hasActiveCertificates: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
      activeChildTab: 'certificados',
      isSidebarOpen: false,
      facetSelections: {},
    },
    organizaciones: INITIAL_ORGANIZACIONES,
    certificados: SAMPLE_CERTIFICATE_RECORDS,
  });

  assert.equal(collapsed.includes('data-action="open-create-org"'), false);
  assert.ok(collapsed.includes('aria-hidden="true"'));
  assert.ok(collapsed.includes('class="hidden"'));
});

test('Phase 4.1.2 Batch A2: Certificados de Conformidad enforces Clean List Rule and Multi View facets', () => {
  const html = renderCertificadoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedCertId: null,
      activeChildTab: 'sitios',
      query: '',
      selectedStandard: 'ALL',
      selectedStatus: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
      isSidebarOpen: true,
      facetSelections: {},
      isCreating: true,
    },
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    organizaciones: INITIAL_ORGANIZACIONES,
  });

  assert.ok(html.includes('Certificados de Conformidad'));
  assertMultiViewCompliance(html, 'certificados', 'certificados');
  assert.ok(html.includes('data-action="open-create-cert"'));
  assert.ok(html.includes('id="createCertificadoForm"'));
  assert.ok(html.includes('data-facet-group="estatus"'));
  assert.ok(html.includes('data-facet-group="norma"'));
  assert.ok(html.includes('data-facet-group="sector_iaf"'));
  assert.ok(html.includes('data-facet-group="modalidad"'));
  assert.equal(html.includes('Cobertura Normativa'), false);
  assert.equal(html.includes('Cobertura ISO'), false);
});

test('Phase 4.1.2 Batch A3: Equipo de Auditores uses Universal Multi View and creation form', () => {
  const html = renderAuditorView({
    profile: ADMIN_PROFILE,
    state: {
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
      isSidebarOpen: true,
      facetSelections: {},
      isCreating: true,
    },
    auditors: INITIAL_AUDITORES_DETAILED,
  });

  assert.ok(html.includes('Equipo de Auditores'));
  assertMultiViewCompliance(html, 'auditores', 'auditores');
  assert.ok(html.includes('data-action="open-create-auditor"'));
  assert.ok(html.includes('id="createAuditorForm"'));
  assert.ok(html.includes('data-facet-group="norma"'));
  assert.ok(html.includes('data-facet-group="sector_iaf"'));
  assert.ok(html.includes('data-facet-group="vigencia"'));
});

test('Phase 4.1.2 Batch A4: Programación de Auditorías uses Universal Multi View with OR/AND facets', () => {
  const html = renderProgramacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAuditId: null,
      activeChildTab: 'equipo',
      query: '',
      selectedTipo: 'ALL',
      selectedMetodologia: 'ALL',
      selectedEstatus: 'ALL',
      selectedAuditorLider: 'ALL',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      isPlanningModalOpen: false,
      isEditingAttributes: false,
      isAddingTeamMember: false,
      isSidebarOpen: true,
      facetSelections: {
        metodologia: new Set(['Presencial', 'Mixta']),
      },
    },
    audits: INITIAL_PROGRAMACION_AUDITS,
    auditors: INITIAL_AUDITORES_DETAILED,
    certificates: SAMPLE_CERTIFICATE_RECORDS,
  });

  assert.ok(html.includes('Programación de Auditorías'));
  assertMultiViewCompliance(html, 'programacion', 'auditorías programadas');
  assert.ok(html.includes('data-action="open-plan-audit"'));
  assert.ok(html.includes('data-facet-group="tipo"'));
  assert.ok(html.includes('data-facet-group="metodologia"'));
  assert.ok(html.includes('data-facet-group="norma"'));
  assert.ok(html.includes('data-facet-group="estado_equipo"'));
});

test('Phase 4.1.2 Stage Views: Calendario and Resultado remove pill eyebrows and align totalizers & single-X search', () => {
  const calHtml = renderCalendarioView({
    profile: ADMIN_PROFILE,
    state: {
      displayMode: 'month',
      referenceYear: 2024,
      referenceMonth: 11,
      filterAuditorId: 'ALL',
      filterStandard: 'ALL',
      filterMethodology: 'ALL',
      drawerAuditId: null,
    },
    audits: INITIAL_PROGRAMACION_AUDITS,
    auditors: INITIAL_AUDITORES_DETAILED,
    standards: INITIAL_NORMAS.map((n) => ({ norma: n.norma })),
  });

  assert.ok(calHtml.includes('Calendario Operativo y Línea de Tiempo de Evaluaciones'));
  assert.ok(calHtml.includes('Mostrando'));
  assert.ok(calHtml.includes('auditorías programadas'));
  assert.equal(/type=["']search["']/i.test(calHtml), false);
  assert.equal(calHtml.includes('🗓️ Calendario Operativo'), false);

  const resHtml = renderResultadoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAuditId: 'ALL',
      activeAuditIdForDecision: INITIAL_PROGRAMACION_AUDITS[0].id,
      displayMode: 'list',
      filterType: 'ALL',
      filterLifecycle: 'ALL',
      searchQuery: 'cláusula',
      isLoggingFinding: false,
      inspectingFindingId: null,
    },
    audits: INITIAL_PROGRAMACION_AUDITS,
    findings: INITIAL_PHASE5_FINDINGS,
    processes: [{ id: 'p1', nombre_proceso: 'Producción' }],
    requirements: [{ id: 'r1', codigo: '8.5', norma: 'ISO 9001:2015' }],
  });

  assert.ok(resHtml.includes('Tablero de Hallazgos y Acciones Correctivas'));
  assert.ok(resHtml.includes('Mostrando'));
  assert.ok(resHtml.includes('hallazgos registrados'));
  assert.equal(/type=["']search["']/i.test(resHtml), false);
  assert.ok(resHtml.includes('id="resultadoSearchInput"'));
  assert.ok(resHtml.includes('id="clearResultadoSearchBtn"'));
  assert.equal(resHtml.includes('📋 Gestión de Hallazgos'), false);
});

test('Phase 4.1.2 Batch B: All 5 Master Catalog Directories use Universal Multi View and preserve Detail Views', () => {
  const normasHtml = renderNormaView({
    profile: ADMIN_PROFILE,
    normas: INITIAL_NORMAS,
    acreditaciones: INITIAL_ACREDITACIONES,
    organismos: INITIAL_ORGANISMOS,
    requisitos: INITIAL_REQUISITOS_LTREE,
    sectores: INITIAL_SECTORES_IAF,
    loading: false,
    state: {
      selectedNormaId: null,
      activeChildTab: 'acreditacion',
      query: '',
      selectedStatus: 'ALL',
      selectedScheme: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: {},
      isAddAccreditationModalOpen: false,
      inspectingClauseId: null,
    },
  });
  assertMultiViewCompliance(normasHtml, 'normas', 'normas certificables');
  assert.ok(normasHtml.includes('data-facet-group="esquema"'));
  assert.ok(normasHtml.includes('data-facet-group="estatus"'));

  const iafHtml = renderSectorIafView({
    profile: ADMIN_PROFILE,
    sectores: INITIAL_SECTORES_IAF,
    subsectores: INITIAL_SUBSECTORES_IAF,
    loading: false,
    state: {
      selectedSectorId: null,
      activeChildTab: 'subsectores',
      query: '',
      selectedRisk: 'ALL',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: {},
      isAddSubsectorModalOpen: false,
    },
  });
  assertMultiViewCompliance(iafHtml, 'iaf', 'sectores IAF');
  assert.ok(iafHtml.includes('data-facet-group="riesgo"'));
  assert.ok(iafHtml.includes('data-facet-group="auditores"'));

  const estatusHtml = renderEstatusView({
    profile: ADMIN_PROFILE,
    estatusList: INITIAL_ESTATUS_CATALOG,
    loading: false,
    state: {
      selectedEstatusId: null,
      query: '',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: {},
    },
  });
  assertMultiViewCompliance(estatusHtml, 'estatus', 'estatus operativos');
  assert.ok(estatusHtml.includes('data-facet-group="uso"'));

  const tiposHtml = renderTipoAuditoriaView({
    profile: ADMIN_PROFILE,
    tiposList: INITIAL_TIPOS_AUDITORIA_CATALOG,
    loading: false,
    state: {
      selectedTipoId: null,
      query: '',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: {},
    },
  });
  assertMultiViewCompliance(tiposHtml, 'tipos', 'tipos de auditoría');
  assert.ok(tiposHtml.includes('data-facet-group="ciclo"'));

  const metodologiasHtml = renderMetodologiaAuditoriaView({
    profile: ADMIN_PROFILE,
    metodologiasList: INITIAL_METODOLOGIAS_CATALOG,
    loading: false,
    state: {
      selectedMetodologiaId: null,
      query: '',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: {},
    },
  });
  assertMultiViewCompliance(metodologiasHtml, 'metodologias', 'metodologías');
  assert.ok(metodologiasHtml.includes('data-facet-group="modalidad"'));

  // Detail View untouched check (selecting an organization renders 4-Zone detail, not Multi View)
  const orgDetailHtml = renderOrganizacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedOrganizacionId: INITIAL_ORGANIZACIONES[0].id,
      query: '',
      hasActiveCertificates: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
      activeChildTab: 'certificados',
    },
    organizaciones: INITIAL_ORGANIZACIONES,
    certificados: SAMPLE_CERTIFICATE_RECORDS,
  });
  assert.equal(orgDetailHtml.includes('data-mv-domain'), false);
  assert.ok(orgDetailHtml.includes('data-action="back-to-org-list"'));
});
