import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import {
  clearFacetSelections,
  computeReactiveFacetCounts,
  countActiveFacetSelections,
  filterRecordsWithFacets,
  formatMultiViewTotalizer,
  toggleFacetSelection,
  type MultiViewFacetCategory,
  type MultiViewSelectionMap,
} from './universalTemplate';
import { INITIAL_ORGANIZACIONES } from './activeCertificates';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import { INITIAL_PROGRAMACION_AUDITS } from './auditExecution';
import {
  INITIAL_NORMAS,
  INITIAL_ORGANISMOS,
  INITIAL_SECTORES_IAF,
} from './extraDomain';
import { buildInitialAcreditacionEntities } from './acreditacionDomain';
import { SAMPLE_CERTIFICATE_RECORDS } from './searchControls';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderOrganizacionView } from '../views/organizacionView';
import { renderCertificadoView } from '../views/certificadoView';
import { renderAuditorView } from '../views/auditorView';
import { renderAcreditacionView } from '../views/acreditacionView';
import { renderNormaView } from '../views/normaView';
import { renderProgramacionView } from '../views/programacionView';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

interface DirectoryItem {
  id: string;
  nombre: string;
  estatus: string;
  norma: string;
  sector: string;
}

const SAMPLE_MULTI_ITEMS: DirectoryItem[] = [
  { id: '1', nombre: 'Iberometal Componentes S.A.', estatus: 'ACTIVO', norma: 'ISO 9001:2015', sector: '17' },
  { id: '2', nombre: 'CyberCloud Solutions S.L.', estatus: 'ACTIVO', norma: 'ISO 14001:2015', sector: '33' },
  { id: '3', nombre: 'CyberCloud Labs C.A.', estatus: 'EN_PROCESO', norma: 'ISO/IEC 27001:2022', sector: '33' },
  { id: '4', nombre: 'Petroquímica del Centro C.A.', estatus: 'SUSPENDIDO', norma: 'ISO 45001:2018', sector: '14' },
  { id: '5', nombre: 'BioAlimentos del Sur S.A.', estatus: 'ACTIVO', norma: 'ISO 9001:2015', sector: '3' },
];

const FACET_SCHEMA: MultiViewFacetCategory<DirectoryItem>[] = [
  {
    id: 'estatus',
    label: 'Estatus',
    options: ['ACTIVO', 'EN_PROCESO', 'SUSPENDIDO', 'CANCELADO'],
    extractValues: (item) => item.estatus,
  },
  {
    id: 'norma',
    label: 'Norma ISO',
    options: ['ISO 9001:2015', 'ISO 14001:2015', 'ISO/IEC 27001:2022', 'ISO 45001:2018'],
    extractValues: (item) => item.norma,
  },
  {
    id: 'sector',
    label: 'Sector IAF',
    options: ['3', '14', '17', '33'],
    extractValues: (item) => item.sector,
  },
];

test('Fase 5.2 MultiViewFacets: computeReactiveFacetCounts applies rest-out S_{-k} math with multi-checkbox OR/AND logic', () => {
  // Check two statuses (OR inside estatus) + sector 33 (AND across sector)
  const selections: MultiViewSelectionMap = {
    estatus: new Set(['ACTIVO', 'EN_PROCESO']),
    sector: new Set(['33']),
  };

  const filtered = filterRecordsWithFacets(SAMPLE_MULTI_ITEMS, '', FACET_SCHEMA, selections);
  assert.deepEqual(filtered.map((i) => i.id), ['2', '3']);

  const groups = computeReactiveFacetCounts(SAMPLE_MULTI_ITEMS, '', FACET_SCHEMA, selections);
  const estatusGroup = groups.find((g) => g.id === 'estatus')!;
  const normaGroup = groups.find((g) => g.id === 'norma')!;
  const sectorGroup = groups.find((g) => g.id === 'sector')!;

  // Sibling options in 'estatus' preserve S_{-estatus} filtered by sector=33 (items 2 ACTIVO, 3 EN_PROCESO)
  assert.equal(estatusGroup.options.find((o) => o.value === 'ACTIVO')?.count, 1);
  assert.equal(estatusGroup.options.find((o) => o.value === 'EN_PROCESO')?.count, 1);
  assert.equal(estatusGroup.options.find((o) => o.value === 'SUSPENDIDO')?.count, 0);
  assert.equal(estatusGroup.options.find((o) => o.value === 'CANCELADO')?.count, 0);

  // 'sector' preserves S_{-sector} filtered by estatus in {ACTIVO, EN_PROCESO} -> items 1(17), 2(33), 3(33), 5(3)
  assert.equal(sectorGroup.options.find((o) => o.value === '33')?.count, 2);
  assert.equal(sectorGroup.options.find((o) => o.value === '17')?.count, 1);
  assert.equal(sectorGroup.options.find((o) => o.value === '3')?.count, 1);
  assert.equal(sectorGroup.options.find((o) => o.value === '14')?.count, 0);

  // 'norma' reflects full intersection of estatus AND sector -> items 2 & 3
  assert.equal(normaGroup.options.find((o) => o.value === 'ISO 14001:2015')?.count, 1);
  assert.equal(normaGroup.options.find((o) => o.value === 'ISO/IEC 27001:2022')?.count, 1);
  assert.equal(normaGroup.options.find((o) => o.value === 'ISO 9001:2015')?.count, 0);
});

test('Fase 5.2 MultiViewFacets: accent-insensitive query combines with checkboxes and state helpers work deterministically', () => {
  let sel: MultiViewSelectionMap = {};
  sel = toggleFacetSelection(sel, 'norma', 'ISO 9001:2015');
  sel = toggleFacetSelection(sel, 'estatus', 'ACTIVO');
  assert.equal(countActiveFacetSelections(sel), 2);

  const matched = filterRecordsWithFacets(
    SAMPLE_MULTI_ITEMS,
    'bioalimentos',
    FACET_SCHEMA,
    sel,
    { getSearchableText: (item) => `${item.nombre} ${item.norma}` }
  );
  assert.deepEqual(matched.map((r) => r.id), ['5']);
  assert.equal(formatMultiViewTotalizer(matched.length, SAMPLE_MULTI_ITEMS.length, 'registros'), 'Mostrando 1 de 5 registros');

  const cleared = clearFacetSelections(FACET_SCHEMA);
  assert.equal(countActiveFacetSelections(cleared), 0);
});

test('Fase 5.2 MultiViewFacets: reactive facet filtering works across Organizaciones, Certificados, Auditores, Acreditaciones, Normas, and Programación', () => {
  // 1. Organizaciones
  const orgHtml = renderOrganizacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedOrganizacionId: null,
      query: 'Ibero',
      hasActiveCertificates: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
      activeChildTab: 'certificados',
      isSidebarOpen: true,
      facetSelections: { vigencia: new Set(['WITH_ACTIVE']) },
    },
    organizaciones: INITIAL_ORGANIZACIONES,
    certificados: SAMPLE_CERTIFICATE_RECORDS,
  });
  assert.ok(orgHtml.includes('Iberometal Componentes S.A.'));
  assert.ok(orgHtml.includes('data-clear-search="true"'));
  assert.ok(orgHtml.includes('Mostrando'));
  assert.equal(/type=["']search["']/i.test(orgHtml), false);
  assert.equal(assertZeroUuidExposure(orgHtml).compliant, true);

  // 2. Certificados
  const certHtml = renderCertificadoView({
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
      facetSelections: { estatus: new Set(['Activo']) },
    },
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    organizaciones: INITIAL_ORGANIZACIONES,
  });
  assert.ok(certHtml.includes('FN-QMS-2024-001'));
  assert.equal(certHtml.includes('FN-OHS-2023-018'), false);
  assert.ok(certHtml.includes('data-facet-checkbox="true"'));
  assert.equal(assertZeroUuidExposure(certHtml).compliant, true);

  // 3. Auditores
  const auditorHtml = renderAuditorView({
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
      isSidebarOpen: false,
      facetSelections: { norma: new Set(['ISO 9001:2015']) },
    },
    auditors: INITIAL_AUDITORES_DETAILED,
  });
  assert.ok(auditorHtml.includes('aria-expanded="false"'));
  assert.ok(auditorHtml.includes('Mostrando'));
  assert.equal(assertZeroUuidExposure(auditorHtml).compliant, true);

  // 4. Acreditaciones
  const acreditaciones = buildInitialAcreditacionEntities(INITIAL_CERTIFICADOS_DETAILED);
  const acredHtml = renderAcreditacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAccreditationId: null,
      query: '',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: { estatus: new Set(['Activa']) },
    },
    acreditaciones,
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
  });
  assert.ok(acredHtml.includes('data-mv-domain="acreditaciones"'));
  assert.ok(acredHtml.includes('data-facet-group="organismo"'));
  assert.ok(acredHtml.includes('data-facet-group="norma"'));
  assert.equal(assertZeroUuidExposure(acredHtml).compliant, true);

  // 5. Normas
  const normaHtml = renderNormaView({
    profile: ADMIN_PROFILE,
    state: {
      selectedNormaId: null,
      activeChildTab: 'acreditacion',
      query: '9001',
      selectedStatus: 'ALL',
      selectedScheme: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isAddAccreditationModalOpen: false,
      inspectingClauseId: null,
      isSidebarOpen: true,
      facetSelections: {},
    },
    normas: INITIAL_NORMAS,
    acreditaciones: [],
    organismos: INITIAL_ORGANISMOS,
    requisitos: [],
  });
  assert.ok(normaHtml.includes('ISO 9001:2015'));
  assert.equal((normaHtml.match(/data-clear-search="true"/g) || []).length, 1);
  assert.equal(assertZeroUuidExposure(normaHtml).compliant, true);

  // 6. Programación
  const progHtml = renderProgramacionView({
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
      facetSelections: { metodologia: new Set(['Presencial']) },
    },
    audits: INITIAL_PROGRAMACION_AUDITS,
    auditors: INITIAL_AUDITORES_DETAILED,
    certificates: SAMPLE_CERTIFICATE_RECORDS,
  });
  assert.ok(progHtml.includes('data-mv-domain="programacion"'));
  assert.ok(progHtml.includes('AUD-2024-001'));
  assert.equal(assertZeroUuidExposure(progHtml).compliant, true);
});
