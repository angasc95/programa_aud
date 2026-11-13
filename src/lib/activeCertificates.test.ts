import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isActiveCertificateStatus,
  countActiveCertificates,
  filterActiveCertificates,
  getCertificatesByOrganizacion,
  validateRifFormat,
  filterOrganizaciones,
  formatActiveCertificateBadge,
  INITIAL_ORGANIZACIONES,
  type CertificadoSummary,
} from './activeCertificates';

describe('Active Certificates Calculation Engine (Phase 4.1 Specification)', () => {
  const sampleCertificates: CertificadoSummary[] = [
    {
      id: 'c1',
      numero_certificado: 'FN-QMS-2024-001',
      id_organizacion: 'org-1',
      norma: 'ISO 9001:2015',
      estatus: 'Activo',
    },
    {
      id: 'c2',
      numero_certificado: 'FN-EMS-2024-002',
      id_organizacion: 'org-1',
      norma: 'ISO 14001:2015',
      estatus: 'Estudio',
    },
    {
      id: 'c3',
      numero_certificado: 'FN-ISMS-2024-003',
      id_organizacion: 'org-1',
      norma: 'ISO/IEC 27001:2022',
      estatus: 'En Espera', // Strictly excluded
    },
    {
      id: 'c4',
      numero_certificado: 'FN-OHS-2024-004',
      id_organizacion: 'org-1',
      norma: 'ISO 45001:2018',
      estatus: 'Cancelado', // Strictly excluded
    },
    {
      id: 'c5',
      numero_certificado: 'FN-FSMS-2024-005',
      id_organizacion: 'org-1',
      norma: 'ISO 22000:2018',
      estatus: 'Inactivo', // Strictly excluded
    },
    {
      id: 'c6',
      numero_certificado: 'FN-QMS-2024-006',
      id_organizacion: 'org-2',
      norma: 'ISO 9001:2015',
      estatus: 'ACTIVO',
    },
    {
      id: 'c7',
      numero_certificado: 'FN-EMS-2024-007',
      id_organizacion: 'org-2',
      norma: 'ISO 14001:2015',
      estatus: 'EN_PROCESO', // Maps to Estudio
    },
    {
      id: 'c8',
      numero_certificado: 'FN-OHS-2023-018',
      id_organizacion: 'org-3',
      norma: 'ISO 45001:2018',
      estatus: 'Suspendido', // Excluded from active count
    },
  ];

  it('includes certificates with status "Activo" or "Estudio" in active count', () => {
    assert.equal(isActiveCertificateStatus('Activo'), true);
    assert.equal(isActiveCertificateStatus('ACTIVO'), true);
    assert.equal(isActiveCertificateStatus('Estudio'), true);
    assert.equal(isActiveCertificateStatus('ESTUDIO'), true);
    assert.equal(isActiveCertificateStatus('En Proceso'), true);
    assert.equal(isActiveCertificateStatus('EN_PROCESO'), true);
  });

  it('strictly excludes certificates with status "En Espera", "Cancelado", or "Inactivo"', () => {
    assert.equal(isActiveCertificateStatus('En Espera'), false);
    assert.equal(isActiveCertificateStatus('EN_ESPERA'), false);
    assert.equal(isActiveCertificateStatus('Cancelado'), false);
    assert.equal(isActiveCertificateStatus('CANCELADO'), false);
    assert.equal(isActiveCertificateStatus('Inactivo'), false);
    assert.equal(isActiveCertificateStatus('INACTIVO'), false);
    assert.equal(isActiveCertificateStatus('Suspendido'), false);
    assert.equal(isActiveCertificateStatus(null), false);
    assert.equal(isActiveCertificateStatus(undefined), false);
  });

  it('accurately counts active certificates per organization following exclusion rules', () => {
    // org-1 has 5 certificates: Activo, Estudio, En Espera (excl), Cancelado (excl), Inactivo (excl)
    // Expected active count: 2
    const org1Count = countActiveCertificates(sampleCertificates, 'org-1');
    assert.equal(org1Count, 2);

    // org-2 has 2 certificates: ACTIVO, EN_PROCESO -> Expected: 2
    const org2Count = countActiveCertificates(sampleCertificates, 'org-2');
    assert.equal(org2Count, 2);

    // org-3 has 1 certificate: Suspendido -> Expected: 0
    const org3Count = countActiveCertificates(sampleCertificates, 'org-3');
    assert.equal(org3Count, 0);

    // org-none has 0 certificates -> Expected: 0
    const emptyCount = countActiveCertificates(sampleCertificates, 'org-nonexistent');
    assert.equal(emptyCount, 0);
  });

  it('filters active certificates list for an organization', () => {
    const activeOrg1 = filterActiveCertificates(sampleCertificates, 'org-1');
    assert.equal(activeOrg1.length, 2);
    assert.ok(activeOrg1.some((c) => c.numero_certificado === 'FN-QMS-2024-001'));
    assert.ok(activeOrg1.some((c) => c.numero_certificado === 'FN-EMS-2024-002'));
    assert.ok(!activeOrg1.some((c) => c.estatus === 'Cancelado'));
    assert.ok(!activeOrg1.some((c) => c.estatus === 'Inactivo'));
    assert.ok(!activeOrg1.some((c) => c.estatus === 'En Espera'));
  });

  it('retrieves all certificates for an organization for child tab view', () => {
    const allOrg1 = getCertificatesByOrganizacion(sampleCertificates, 'org-1');
    assert.equal(allOrg1.length, 5);
  });

  it('handles global active counts, organizacion_id alias, English statuses, and empty arrays', () => {
    assert.equal(countActiveCertificates([]), 0);
    // Global count across sampleCertificates: c1 (Activo), c2 (Estudio), c6 (ACTIVO), c7 (EN_PROCESO) = 4
    assert.equal(countActiveCertificates(sampleCertificates), 4);

    assert.equal(isActiveCertificateStatus('Planificado'), true);
    assert.equal(isActiveCertificateStatus('En Ejecución'), true);
    assert.equal(isActiveCertificateStatus('Vigente'), true);
    assert.equal(isActiveCertificateStatus('cancelled'), false);
    assert.equal(isActiveCertificateStatus('inactive'), false);
    assert.equal(isActiveCertificateStatus('suspended'), false);

    const aliasCerts: CertificadoSummary[] = [
      { id: 'x1', numero_certificado: 'FN-1', organizacion_id: 'org-alias', norma: 'ISO 9001:2015', estatus: 'En Ejecución' },
      { id: 'x2', numero_certificado: 'FN-2', organizacion_id: 'org-alias', norma: 'ISO 9001:2015', estatus: 'Cancelado' },
      { id: 'x3', numero_certificado: 'FN-3', organizacion_id: 'org-alias', norma: 'ISO 9001:2015', estatus: 'En Espera' },
    ];
    assert.equal(countActiveCertificates(aliasCerts, 'org-alias'), 1);
    assert.equal(filterActiveCertificates(aliasCerts, 'org-alias').length, 1);
  });
});

describe('Organización Directory Filtering and RIF Validation', () => {
  const sampleCerts: CertificadoSummary[] = [
    {
      id: 'c1',
      numero_certificado: 'FN-QMS-2024-001',
      id_organizacion: '30000000-0000-0000-0000-000000000001',
      norma: 'ISO 9001:2015',
      estatus: 'Activo',
    },
    {
      id: 'c2',
      numero_certificado: 'FN-EMS-2024-002',
      id_organizacion: '30000000-0000-0000-0000-000000000002',
      norma: 'ISO 14001:2015',
      estatus: 'Estudio',
    },
    {
      id: 'c3',
      numero_certificado: 'FN-OHS-2023-018',
      id_organizacion: '30000000-0000-0000-0000-000000000003',
      norma: 'ISO 45001:2018',
      estatus: 'Suspendido',
    },
  ];

  it('filters organizations by legal name or RIF search query', () => {
    const byName = filterOrganizaciones(INITIAL_ORGANIZACIONES, sampleCerts, {
      query: 'CyberCloud',
    });
    assert.equal(byName.length, 1);
    assert.equal(byName[0].nombre, 'CyberCloud Solutions S.L.');

    const byRif = filterOrganizaciones(INITIAL_ORGANIZACIONES, sampleCerts, {
      query: '30492817',
    });
    assert.equal(byRif.length, 1);
    assert.equal(byRif[0].nombre, 'Iberometal Componentes S.A.');
  });

  it('filters organizations by active certificates presence facet', () => {
    // Only organizations with active certificates
    const withActive = filterOrganizaciones(INITIAL_ORGANIZACIONES, sampleCerts, {
      hasActiveCertificates: 'WITH_ACTIVE',
    });
    assert.ok(withActive.some((o) => o.nombre === 'Iberometal Componentes S.A.'));
    assert.ok(withActive.some((o) => o.nombre === 'CyberCloud Solutions S.L.'));
    // Petroquímica only has a 'Suspendido' certificate -> should be excluded
    assert.ok(!withActive.some((o) => o.nombre === 'Petroquímica del Centro C.A.'));
  });

  it('filters organizations by IAF Sector facet', () => {
    const sector17 = filterOrganizaciones(INITIAL_ORGANIZACIONES, sampleCerts, {
      selectedSectorIaf: '17',
    });
    assert.equal(sector17.length, 1);
    assert.equal(sector17[0].nombre, 'Iberometal Componentes S.A.');
  });

  it('sorts organizations by name ascending and descending', () => {
    const asc = filterOrganizaciones(INITIAL_ORGANIZACIONES, sampleCerts, {
      sortColumn: 'nombre',
      sortDirection: 'asc',
    });
    assert.equal(asc[0].nombre, 'BioAlimentos del Sur S.A.');

    const desc = filterOrganizaciones(INITIAL_ORGANIZACIONES, sampleCerts, {
      sortColumn: 'nombre',
      sortDirection: 'desc',
    });
    assert.equal(desc[0].nombre, 'Petroquímica del Centro C.A.');
  });

  it('validates RIF / NIF formatting according to enterprise tax rules', () => {
    assert.equal(validateRifFormat('J-40192831-2').valid, true);
    assert.equal(validateRifFormat('J-30492817-0').valid, true);
    assert.equal(validateRifFormat('B-12345678').valid, true);
    assert.equal(validateRifFormat('').valid, false);
    assert.equal(validateRifFormat('123').valid, false);
  });

  it('formats active certificates badges with appropriate visual styles', () => {
    const badgeActive = formatActiveCertificateBadge(2);
    assert.ok(badgeActive.badgeClass.includes('emerald'));
    assert.equal(badgeActive.label, '2 Certificados Activos');

    const badgeZero = formatActiveCertificateBadge(0);
    assert.ok(badgeZero.badgeClass.includes('slate'));
    assert.equal(badgeZero.label, 'Sin Certificados Activos');
  });
});

import { renderOrganizacionView } from '../views/organizacionView';
import { assertZeroUuidExposure } from './zeroUuid';
import type { UserProfile } from './healthCheck';

const mockProfile: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@certificacion-fn.com',
  nombre: 'Auditor Senior Lead',
  rol: 'ADMIN',
  estatus: 'APPROVED',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCertificates: CertificadoSummary[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    id_organizacion: '30000000-0000-0000-0000-000000000001',
    norma: 'ISO 9001:2015',
    estatus: 'Activo',
    multisitio: true,
    sitios_count: 2,
    fecha_emision: '2024-03-15',
    fecha_vencimiento: '2027-03-14',
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    numero_certificado: 'FN-EMS-2024-002',
    id_organizacion: '30000000-0000-0000-0000-000000000002',
    norma: 'ISO 14001:2015',
    estatus: 'Estudio',
    multisitio: false,
    sitios_count: 1,
    fecha_emision: '2024-06-01',
    fecha_vencimiento: '2027-05-31',
  },
];

describe('Organización View - 4-Zone Detail & Zero-UUID Compliance', () => {
  it('renders directory view without exposing raw UUIDs in visible text', () => {
    const listHtml = renderOrganizacionView({
      profile: mockProfile,
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
      },
      organizaciones: INITIAL_ORGANIZACIONES,
      certificados: mockCertificates,
    });

    const compliance = assertZeroUuidExposure(listHtml);
    assert.ok(
      compliance.compliant,
      `Exposed UUIDs in Organizaciones directory: ${compliance.exposedUuids.join(', ')}`
    );
  });

  it('renders Standardized 3-Zone detail view without exposing raw UUIDs in visible text', () => {
    const detailHtml = renderOrganizacionView({
      profile: mockProfile,
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
      certificados: mockCertificates,
    });

    const compliance = assertZeroUuidExposure(detailHtml);
    assert.ok(
      compliance.compliant,
      `Exposed UUIDs in Organización detail: ${compliance.exposedUuids.join(', ')}`
    );

    // Verify Standardized 3-Zone Layout without legacy ZONA developer text
    assert.ok(detailHtml.includes('aria-label="Contexto y relaciones superiores"'));
    assert.ok(detailHtml.includes('data-parent-nav="true"'));
    assert.ok(detailHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
    assert.ok(detailHtml.includes('aria-label="Detalle del registro"'));
    assert.ok(detailHtml.includes('role="tablist"'));
    assert.ok(!detailHtml.includes('ZONA 1:'));
    assert.ok(!detailHtml.includes('ZONA 3:'));
    assert.ok(detailHtml.includes('Certificados'));
    assert.ok(detailHtml.includes('Auditorías'));
    assert.ok(detailHtml.includes('Historial de Cambios'));
    assert.ok(detailHtml.includes('FN-QMS-2024-001'));
  });
});

