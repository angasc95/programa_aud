import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import { assertZeroUuidExposure } from './zeroUuid';
import {
  ALL_SECTORS_FACET_VALUE,
  ALL_SECTORS_LABEL,
  buildInitialAcreditacionEntities,
  computeActiveCertificatesCountForAccreditation,
  enrichAcreditacionesWithImpact,
  evaluateAccreditationExpiry,
  filterCoveredCertificatesForAccreditation,
  formatAcreditacionSectorLabel,
  getAcreditacionSectorFacetValue,
  getSubsectoresForAccreditation,
  mapSupabaseAcreditacionRows,
  validateAccreditationEditInput,
  validateAccreditationInput,
  type AcreditacionDetailEntity,
} from './acreditacionDomain';
import {
  INITIAL_NORMAS,
  INITIAL_ORGANISMOS,
  INITIAL_SECTORES_IAF,
  INITIAL_SUBSECTORES_IAF,
} from './extraDomain';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { SAMPLE_CERTIFICATE_RECORDS } from './searchControls';
import { renderAcreditacionView } from '../views/acreditacionView';
import { renderExtraView } from '../views/extraView';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const WORKER_PROFILE: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  nombre: 'Personal Técnico',
  role: 'WORKER',
  status: 'APPROVED',
};

const CLIENT_PROFILE: UserProfile = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Cliente Externo',
  role: 'CLIENT',
  status: 'APPROVED',
};

const AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Técnico',
  role: 'AUDITOR',
  status: 'APPROVED',
};

test('Phase 4.1.3: evaluateAccreditationExpiry classifies Vigente, Por Vencer, Vencida, and Sin Vencimiento accurately', () => {
  const ref = '2026-01-01';

  const sinVenc = evaluateAccreditationExpiry(null, ref);
  assert.equal(sinVenc.state, 'Sin Vencimiento');
  assert.equal(sinVenc.daysRemaining, null);

  const vigente = evaluateAccreditationExpiry('2026-06-01', ref);
  assert.equal(vigente.state, 'Vigente');
  assert.ok((vigente.daysRemaining ?? 0) > 90);

  const porVencerExact90 = evaluateAccreditationExpiry('2026-04-01', ref);
  assert.equal(porVencerExact90.state, 'Por Vencer');
  assert.equal(porVencerExact90.daysRemaining, 90);

  const porVencerSameDay = evaluateAccreditationExpiry('2026-01-01', ref);
  assert.equal(porVencerSameDay.state, 'Por Vencer');
  assert.equal(porVencerSameDay.daysRemaining, 0);

  const vencida = evaluateAccreditationExpiry('2025-12-31', ref);
  assert.equal(vencida.state, 'Vencida');
  assert.equal(vencida.daysRemaining, -1);
});

test('Phase 4.1.3: computeActiveCertificatesCountForAccreditation matches active (norma, sector_iaf) and general scopes', () => {
  const certs = [
    { id: 'c1', estatus: 'Activo', norma: 'ISO 9001:2015', sector_iaf: 17 },
    { id: 'c2', estatus: 'Vigente', norma: 'ISO 9001:2015', sector_iaf: 17 },
    { id: 'c3', estatus: 'Cancelado', norma: 'ISO 9001:2015', sector_iaf: 17 },
    { id: 'c4', estatus: 'Suspendido', norma: 'ISO 9001:2015', sector_iaf: 17 },
    { id: 'c5', estatus: 'Activo', norma: 'ISO 9001:2015', sector_iaf: 28 },
    { id: 'c6', estatus: 'En Proceso', norma: 'ISO 14001:2015', sector_iaf: 17 },
  ];

  const scopedCount = computeActiveCertificatesCountForAccreditation(
    {
      id_norma: 'e0000000-0000-0000-0000-000000009001',
      norma_codigo: 'ISO 9001:2015',
      id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
      sector_numero: 17,
    },
    certs
  );
  assert.equal(scopedCount, 2);

  const generalScopeCount = computeActiveCertificatesCountForAccreditation(
    {
      id_norma: 'e0000000-0000-0000-0000-000000009001',
      norma_codigo: 'ISO 9001:2015',
      id_sector_iaf: null,
      sector_numero: null,
    },
    certs
  );
  assert.equal(generalScopeCount, 3);

  const enriched = enrichAcreditacionesWithImpact(buildInitialAcreditacionEntities(), SAMPLE_CERTIFICATE_RECORDS);
  assert.equal(enriched[0].norma_codigo, 'ISO 9001:2015');
  assert.equal(enriched[0].activeCertificatesCount, 1);
});

test('Phase 4.1.3: validateAccreditationInput enforces required fields, expiry coherence, and duplicates', () => {
  const existing = buildInitialAcreditacionEntities();

  const missingOrg = validateAccreditationInput({
    organismoMode: 'existing',
    id_organismo: '',
    id_norma: INITIAL_NORMAS[0].id,
    numero_acreditacion: '01/C-NEW',
    fecha_concesion: '2024-01-10',
  });
  assert.equal(missingOrg.valid, false);

  const badDates = validateAccreditationInput({
    organismoMode: 'existing',
    id_organismo: INITIAL_ORGANISMOS[0].id,
    id_norma: INITIAL_NORMAS[0].id,
    numero_acreditacion: '01/C-NEW',
    fecha_concesion: '2025-05-01',
    fecha_vencimiento: '2025-04-30',
  });
  assert.equal(badDates.valid, false);
  assert.ok(badDates.error?.includes('igual o posterior'));

  const sameDayValid = validateAccreditationInput({
    organismoMode: 'existing',
    id_organismo: INITIAL_ORGANISMOS[0].id,
    id_norma: INITIAL_NORMAS[0].id,
    numero_acreditacion: '01/C-NEW',
    fecha_concesion: '2025-05-01',
    fecha_vencimiento: '2025-05-01',
    estatus: 'Activa',
  });
  assert.equal(sameDayValid.valid, true);
  assert.equal(sameDayValid.normalized?.fecha_vencimiento, '2025-05-01');

  const duplicateCheck = validateAccreditationInput({
    organismoMode: 'existing',
    id_organismo: existing[0].id_organismo,
    id_norma: INITIAL_NORMAS[0].id,
    numero_acreditacion: existing[0].numero_acreditacion,
    fecha_concesion: '2024-01-01',
    existingAccreditations: existing,
  });
  assert.equal(duplicateCheck.valid, false);

  const newOrgValid = validateAccreditationInput({
    organismoMode: 'new',
    organismo_codigo: 'ONAC',
    organismo_nombre: 'Organismo Nacional de Acreditación',
    organismo_pais: 'Colombia',
    organismo_sitio_web: 'https://onac.org.co',
    id_norma: INITIAL_NORMAS[0].id,
    id_sector_iaf: '',
    numero_acreditacion: '24-CSG-001',
    fecha_concesion: '2024-03-01',
    fecha_vencimiento: '2028-03-01',
    estatus: 'Activa',
  });
  assert.equal(newOrgValid.valid, true);
  assert.equal(newOrgValid.normalized?.id_sector_iaf, null);
});

test('Phase 4.1.3: mapSupabaseAcreditacionRows filters soft-deleted rows and resolves joined metadata without UUID exposure', () => {
  const mapped = mapSupabaseAcreditacionRows(
    [
      {
        id: 'dc000000-0000-0000-0000-000000000010',
        id_organismo: 'db000000-0000-0000-0000-000000000001',
        id_norma: 'e0000000-0000-0000-0000-000000009001',
        id_sector_iaf: null,
        numero_acreditacion: '01/C-GEN002',
        fecha_concesion: '2024-02-01',
        fecha_vencimiento: '2028-01-31',
        estatus: 'Activa',
        deleted_at: null,
        organismo: {
          id: 'db000000-0000-0000-0000-000000000001',
          codigo: 'ENAC',
          nombre: 'Entidad Nacional de Acreditación',
          pais: 'España',
          sitio_web: 'https://www.enac.es',
        },
        norma: {
          id: 'e0000000-0000-0000-0000-000000009001',
          codigo: 'ISO 9001:2015',
          titulo: 'Sistemas de Gestión de la Calidad — Requisitos',
          norma: 'ISO 9001:2015',
        },
        sector_iaf: null,
      },
      {
        id: 'dc000000-0000-0000-0000-000000000099',
        id_organismo: 'db000000-0000-0000-0000-000000000001',
        id_norma: 'e0000000-0000-0000-0000-000000009001',
        numero_acreditacion: 'DELETED-001',
        fecha_concesion: '2020-01-01',
        estatus: 'Vencida',
        deleted_at: '2025-01-01T00:00:00Z',
      },
    ],
    {
      organismos: INITIAL_ORGANISMOS,
      normas: INITIAL_NORMAS,
      sectores: INITIAL_SECTORES_IAF,
      certificates: SAMPLE_CERTIFICATE_RECORDS,
    }
  );

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].organismo_codigo, 'ENAC');
  assert.equal(mapped[0].norma_codigo, 'ISO 9001:2015');
  assert.equal(mapped[0].sector_numero, null);
  assert.equal(getAcreditacionSectorFacetValue(mapped[0]), ALL_SECTORS_FACET_VALUE);
  assert.equal(formatAcreditacionSectorLabel(mapped[0].sector_numero).shortLabel, ALL_SECTORS_LABEL);
  assert.equal(mapped[0].activeCertificatesCount, 1);
});

test('Phase 4.1.3: renderAcreditacionView enforces Multi View compliance, reactive facets, RBAC, and Zero-UUID', () => {
  const baseAcreds: AcreditacionDetailEntity[] = [
    ...enrichAcreditacionesWithImpact(buildInitialAcreditacionEntities(), SAMPLE_CERTIFICATE_RECORDS),
    {
      id: 'dc000000-0000-0000-0000-000000000004',
      id_organismo: 'db000000-0000-0000-0000-000000000001',
      organismo_codigo: 'ENAC',
      organismo_nombre: 'Entidad Nacional de Acreditación',
      organismo_pais: 'España',
      organismo_sitio_web: 'https://www.enac.es',
      id_norma: 'e0000000-0000-0000-0000-000000045001',
      norma_codigo: 'ISO 45001:2018',
      norma_titulo: 'Seguridad y Salud en el Trabajo',
      id_sector_iaf: null,
      sector_numero: null,
      sector_descripcion: null,
      numero_acreditacion: '01/C-SST004',
      fecha_concesion: '2022-04-01',
      fecha_vencimiento: '2026-04-01',
      estatus: 'Suspendida',
      activeCertificatesCount: 0,
      deleted_at: null,
    },
  ];

  // 1. Admin Grid View + Create Form Open
  const adminGridHtml = renderAcreditacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAccreditationId: null,
      query: '',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isSidebarOpen: true,
      facetSelections: {},
      isCreating: true,
      organismoMode: 'new',
    },
    acreditaciones: baseAcreds,
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
  });

  assert.ok(adminGridHtml.includes('data-mv-domain="acreditaciones"'));
  assert.ok(adminGridHtml.includes('Acreditaciones Vigentes'));
  assert.ok(adminGridHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').includes('Mostrando 4 de 4 acreditaciones registradas'));
  assert.equal(/type=["']search["']/i.test(adminGridHtml), false);
  assert.ok(adminGridHtml.includes('type="text"'));
  assert.ok(adminGridHtml.includes('data-facet-group="organismo"'));
  assert.ok(adminGridHtml.includes('data-facet-group="norma"'));
  assert.ok(adminGridHtml.includes('data-facet-group="sector_iaf"'));
  assert.ok(adminGridHtml.includes('data-facet-group="estatus"'));
  assert.ok(adminGridHtml.includes(ALL_SECTORS_LABEL));
  assert.ok(adminGridHtml.includes('data-action="open-create-acreditacion"'));
  assert.ok(adminGridHtml.includes('id="createAcreditacionForm"'));
  assert.equal(assertZeroUuidExposure(adminGridHtml).compliant, true);

  // 2. Reactive Facet Filtering (ENAC -> 2 of 4) + Table View
  const filteredTableHtml = renderAcreditacionView({
    profile: WORKER_PROFILE,
    state: {
      selectedAccreditationId: null,
      query: '',
      viewMode: 'list',
      sortColumn: 'numero_acreditacion',
      sortDirection: 'asc',
      isSidebarOpen: true,
      facetSelections: {
        organismo: new Set(['ENAC']),
      },
    },
    acreditaciones: baseAcreds,
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
  });

  assert.ok(filteredTableHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').includes('Mostrando 2 de 4 acreditaciones registradas'));
  assert.ok(filteredTableHtml.includes('01/C-SC001'));
  assert.ok(filteredTableHtml.includes('01/C-SST004'));
  assert.equal(filteredTableHtml.includes('0044-EMS'), false);
  assert.ok(filteredTableHtml.includes('data-action="open-create-acreditacion"'));
  assert.equal(assertZeroUuidExposure(filteredTableHtml).compliant, true);

  // 3. RBAC: CLIENT & AUDITOR cannot see creation button or form
  for (const nonStaff of [CLIENT_PROFILE, AUDITOR_PROFILE]) {
    const readOnlyHtml = renderAcreditacionView({
      profile: nonStaff,
      state: {
        selectedAccreditationId: null,
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isCreating: true,
      },
      acreditaciones: baseAcreds,
      organismos: INITIAL_ORGANISMOS,
      normas: INITIAL_NORMAS,
      sectores: INITIAL_SECTORES_IAF,
    });
    assert.equal(readOnlyHtml.includes('data-action="open-create-acreditacion"'), false);
    assert.equal(readOnlyHtml.includes('id="createAcreditacionForm"'), false);
    assert.equal(assertZeroUuidExposure(readOnlyHtml).compliant, true);
  }

  // 4. Detail Preview + Extra Dispatcher Zero-UUID check
  const detailHtml = renderExtraView(ADMIN_PROFILE, {
    activeSubSection: 'accreditations',
    standards: INITIAL_NORMAS,
    requirements: [],
    iafSectors: INITIAL_SECTORES_IAF,
    catalogs: [],
    loading: false,
    organismos: INITIAL_ORGANISMOS,
    accreditations: baseAcreds,
    acreditacionState: {
      selectedAccreditationId: baseAcreds[0].id,
    },
  });

  assert.ok(detailHtml.includes('data-action="back-to-accreditations-list"'));
  assert.ok(detailHtml.includes(baseAcreds[0].numero_acreditacion));
  assert.equal(assertZeroUuidExposure(detailHtml).compliant, true);
});

test('Phase 4.2.2: filterCoveredCertificatesForAccreditation, getSubsectoresForAccreditation, and validateAccreditationEditInput behave accurately', () => {
  const initialAcreds = buildInitialAcreditacionEntities(INITIAL_CERTIFICADOS_DETAILED);
  const enacSector17 = initialAcreds[0];

  const covered = filterCoveredCertificatesForAccreditation(
    enacSector17,
    INITIAL_CERTIFICADOS_DETAILED
  );
  assert.ok(covered.length >= 1);
  assert.ok(covered.every((c) => c.norma_codigo === enacSector17.norma_codigo));

  const subsectores17 = getSubsectoresForAccreditation(enacSector17, INITIAL_SUBSECTORES_IAF);
  assert.ok(subsectores17.length >= 1);
  assert.ok(subsectores17.every((s) => s.sector_numero === enacSector17.sector_numero));

  const generalScopeAcr: AcreditacionDetailEntity = {
    ...enacSector17,
    id: 'dc000000-0000-0000-0000-000000000077',
    id_sector_iaf: null,
    sector_numero: null,
    sector_descripcion: null,
  };
  const allSubs = getSubsectoresForAccreditation(generalScopeAcr, INITIAL_SUBSECTORES_IAF);
  assert.equal(allSubs.length, INITIAL_SUBSECTORES_IAF.length);

  // Edit validation allows saving same numero_acreditacion on self
  const selfValid = validateAccreditationEditInput({
    id: enacSector17.id,
    id_organismo: enacSector17.id_organismo,
    numero_acreditacion: enacSector17.numero_acreditacion,
    fecha_concesion: enacSector17.fecha_concesion,
    fecha_vencimiento: '2029-12-31',
    estatus: 'En Renovación',
    existingAccreditations: initialAcreds,
  });
  assert.equal(selfValid.valid, true);
  assert.equal(selfValid.normalized?.estatus, 'En Renovación');

  // Edit validation rejects expiry earlier than grant date
  const badDates = validateAccreditationEditInput({
    id: enacSector17.id,
    id_organismo: enacSector17.id_organismo,
    numero_acreditacion: enacSector17.numero_acreditacion,
    fecha_concesion: '2026-06-01',
    fecha_vencimiento: '2026-05-01',
    estatus: 'Activa',
    existingAccreditations: initialAcreds,
  });
  assert.equal(badDates.valid, false);
});

test('Phase 4.2.2: renderAcreditacionView detail mode renders 3-Zone layout, clickable parent chips, Todos los Sectores badge, tabs, and RBAC', () => {
  const initialAcreds = buildInitialAcreditacionEntities(INITIAL_CERTIFICADOS_DETAILED);
  const enacSector17 = initialAcreds[0];

  // 1. Specific sector accreditation detail with Certificados tab
  const detailCertsHtml = renderAcreditacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAccreditationId: enacSector17.id,
      activeChildTab: 'certificados',
      query: '',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
    },
    acreditaciones: initialAcreds,
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    subsectores: INITIAL_SUBSECTORES_IAF,
  });

  assert.ok(detailCertsHtml.includes('rel="noopener noreferrer"'));
  assert.ok(detailCertsHtml.includes('data-parent-nav="true"'));
  assert.ok(detailCertsHtml.includes('data-parent-type="norma"'));
  assert.ok(detailCertsHtml.includes('data-parent-type="sector_iaf"'));
  assert.ok(detailCertsHtml.includes('data-action="open-changelog"'));
  assert.ok(detailCertsHtml.includes('id="startEditAcreditacionBtn"'));
  assert.ok(detailCertsHtml.includes('data-action="open-archive-accreditacion"'));
  assert.ok(detailCertsHtml.includes('data-action="select-cert"'));
  assert.ok(detailCertsHtml.includes('Certificados Amparados'));
  assert.ok(detailCertsHtml.includes('Sub-Sectores IAF del Alcance'));
  assert.equal(/ZONA\s+[1-4]:/.test(detailCertsHtml), false);
  assert.ok(
    detailCertsHtml.indexOf('aria-label="Contexto y relaciones superiores"') <
      detailCertsHtml.indexOf('<hr class="border-t border-slate-200 my-4" />') &&
      detailCertsHtml.indexOf('<hr class="border-t border-slate-200 my-4" />') <
        detailCertsHtml.indexOf('aria-label="Detalle del registro"') &&
      detailCertsHtml.indexOf('aria-label="Detalle del registro"') < detailCertsHtml.indexOf('role="tablist"')
  );
  assert.equal(assertZeroUuidExposure(detailCertsHtml).compliant, true);

  // 2. Null-sector accreditation shows non-clickable "Todos los Sectores" and Sub-Sectores tab
  const nullSectorAcr: AcreditacionDetailEntity = {
    ...enacSector17,
    id: 'dc000000-0000-0000-0000-000000000088',
    numero_acreditacion: '01/C-GEN088',
    id_sector_iaf: null,
    sector_numero: null,
    sector_descripcion: null,
  };
  const subsectoresHtml = renderAcreditacionView({
    profile: WORKER_PROFILE,
    state: {
      selectedAccreditationId: nullSectorAcr.id,
      activeChildTab: 'subsectores',
      query: '',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
    },
    acreditaciones: [nullSectorAcr],
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    subsectores: INITIAL_SUBSECTORES_IAF,
  });

  assert.ok(subsectoresHtml.includes(ALL_SECTORS_LABEL));
  assert.equal(subsectoresHtml.includes('data-parent-type="sector_iaf"'), false);
  assert.ok(subsectoresHtml.includes('Sub-Sectores Técnicos IAF del Alcance'));
  assert.equal(assertZeroUuidExposure(subsectoresHtml).compliant, true);

  // 3. RBAC: CLIENT & AUDITOR cannot edit or archive, even if state flags are set
  for (const nonStaff of [CLIENT_PROFILE, AUDITOR_PROFILE]) {
    const readOnlyHtml = renderAcreditacionView({
      profile: nonStaff,
      state: {
        selectedAccreditationId: enacSector17.id,
        activeChildTab: 'certificados',
        isEditingAttributes: true,
        archiveConfirmOpen: true,
        query: '',
        viewMode: 'list',
        sortColumn: null,
        sortDirection: 'none',
      },
      acreditaciones: initialAcreds,
      organismos: INITIAL_ORGANISMOS,
      normas: INITIAL_NORMAS,
      sectores: INITIAL_SECTORES_IAF,
      certificates: INITIAL_CERTIFICADOS_DETAILED,
      subsectores: INITIAL_SUBSECTORES_IAF,
    });
    assert.equal(readOnlyHtml.includes('id="startEditAcreditacionBtn"'), false);
    assert.equal(readOnlyHtml.includes('id="editAcreditacionForm"'), false);
    assert.equal(readOnlyHtml.includes('data-action="open-archive-accreditacion"'), false);
    assert.equal(assertZeroUuidExposure(readOnlyHtml).compliant, true);
  }

  // 4. Soft-deleted accreditation is excluded from directory
  const softDeletedDirHtml = renderAcreditacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAccreditationId: null,
      query: '',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
    },
    acreditaciones: [
      enacSector17,
      { ...nullSectorAcr, deleted_at: '2026-03-01T00:00:00Z' },
    ],
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
  });
  assert.equal(softDeletedDirHtml.includes('01/C-GEN088'), false);
});

