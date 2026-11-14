import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isPrincipalSite,
  countMultisiteBranches,
  formatMultisiteBranchCountText,
  sortSitesWithPrincipalFirst,
  validateAlcance,
  validateJustificacionNoAplicable,
  getProcessTypeVisual,
  filterCertificates,
  INITIAL_CERTIFICADOS_DETAILED,
  type SiteEntity,
} from './multisiteSampling';
import { assertZeroUuidExposure } from './zeroUuid';

describe('Phase 4.2 - Multisite Sampling & Site 0 Placement Rules', () => {
  it('correctly identifies Site 0 as the principal headquarters', () => {
    assert.strictEqual(isPrincipalSite({ numero_sitio: 0 }), true);
    assert.strictEqual(isPrincipalSite({ numero_sitio: 1 }), false);
    assert.strictEqual(isPrincipalSite({ numero_sitio: 2 }), false);
  });

  it('calculates multisite branch counts strictly excluding Site 0 (headquarters)', () => {
    const sitesSingleHq = [{ numero_sitio: 0 }];
    assert.strictEqual(countMultisiteBranches(sitesSingleHq), 0);

    const sitesWithBranches = [
      { numero_sitio: 0 },
      { numero_sitio: 1 },
      { numero_sitio: 2 },
    ];
    // 3 total sites: 1 HQ (site 0) + 2 branches (site 1, 2) => branch count is 2!
    assert.strictEqual(countMultisiteBranches(sitesWithBranches), 2);

    const sitesBranchesOnly = [{ numero_sitio: 1 }, { numero_sitio: 3 }];
    assert.strictEqual(countMultisiteBranches(sitesBranchesOnly), 2);

    assert.strictEqual(countMultisiteBranches([]), 0);
  });

  it('formats multisite branch counts with clear Spanish typography', () => {
    assert.strictEqual(formatMultisiteBranchCountText(0), '0 sedes multisitio');
    assert.strictEqual(formatMultisiteBranchCountText(1), '1 sede multisitio');
    assert.strictEqual(formatMultisiteBranchCountText(3), '3 sedes multisitio');
  });

  it('guarantees Site 0 (headquarters) is positioned at index 0 in sorted arrays', () => {
    const unorderedSites: Array<{ numero_sitio: number; nombre: string }> = [
      { numero_sitio: 3, nombre: 'Centro Logístico' },
      { numero_sitio: 1, nombre: 'Planta de Ensamblaje' },
      { numero_sitio: 0, nombre: 'Sede Principal HQ' },
      { numero_sitio: 2, nombre: 'Depósito Auxiliar' },
    ];

    const sorted = sortSitesWithPrincipalFirst(unorderedSites);

    assert.strictEqual(sorted[0].numero_sitio, 0);
    assert.strictEqual(sorted[0].nombre, 'Sede Principal HQ');
    assert.strictEqual(sorted[1].numero_sitio, 1);
    assert.strictEqual(sorted[2].numero_sitio, 2);
    assert.strictEqual(sorted[3].numero_sitio, 3);
  });

  it('handles site arrays without Site 0 gracefully by preserving numeric order', () => {
    const branchOnlySites = [
      { numero_sitio: 5, nombre: 'Sucursal 5' },
      { numero_sitio: 2, nombre: 'Sucursal 2' },
    ];
    const sorted = sortSitesWithPrincipalFirst(branchOnlySites);
    assert.strictEqual(sorted[0].numero_sitio, 2);
    assert.strictEqual(sorted[1].numero_sitio, 5);
    // Ensure original array is not mutated
    assert.strictEqual(branchOnlySites[0].numero_sitio, 5);
  });

  it('verifies every seeded certificate in INITIAL_CERTIFICADOS_DETAILED enforces Site 0 principal site and accurate branch count', () => {
    for (const cert of INITIAL_CERTIFICADOS_DETAILED) {
      const sorted = sortSitesWithPrincipalFirst(cert.sitios);
      assert.ok(sorted.length >= 1, `${cert.numero_certificado} must have at least Site 0`);
      assert.strictEqual(isPrincipalSite(sorted[0]), true, `${cert.numero_certificado} index 0 must be Site 0`);
      const branches = countMultisiteBranches(cert.sitios);
      assert.strictEqual(branches, cert.sitios.length - 1);
      if (cert.multisitio) {
        assert.ok(branches >= 1, `Multisite cert ${cert.numero_certificado} must have >= 1 branch besides Site 0`);
      } else {
        assert.strictEqual(branches, 0, `Single-site cert ${cert.numero_certificado} must have 0 branches`);
      }
    }
  });
});

describe('Phase 4.2 - Alcance Character Counter & Validation', () => {
  it('rejects certification scopes with fewer than 10 characters', () => {
    const res = validateAlcance('Corta');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.length, 5);
    assert.ok(res.error?.includes('al menos 10 caracteres'));
  });

  it('accepts valid certification scopes between 10 and 1000 characters', () => {
    const validScope =
      'Diseño, manufactura, estampado, fundición y comercialización de piezas metálicas y componentes troquelados.';
    const res = validateAlcance(validScope);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.length, validScope.length);
    assert.strictEqual(res.error, undefined);
  });

  it('rejects certification scopes that exceed 1000 characters', () => {
    const overlyLong = 'A'.repeat(1005);
    const res = validateAlcance(overlyLong);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.length, 1005);
    assert.ok(res.error?.includes('no puede exceder los 1000 caracteres'));
  });
});

describe('Phase 4.2 - Non-Applicability Justification Requirements', () => {
  it('enforces mandatory non-empty justification for excluded ISO clauses', () => {
    const emptyRes = validateJustificacionNoAplicable('');
    assert.strictEqual(emptyRes.valid, false);
    assert.ok(emptyRes.error?.includes('obligatoria'));

    const whitespaceRes = validateJustificacionNoAplicable('     \t\n  ');
    assert.strictEqual(whitespaceRes.valid, false);

    const shortRes = validateJustificacionNoAplicable('N/A');
    assert.strictEqual(shortRes.valid, false);

    const fourCharsRes = validateJustificacionNoAplicable('ABCD');
    assert.strictEqual(fourCharsRes.valid, false);

    const exactMinRes = validateJustificacionNoAplicable('ABCDE');
    assert.strictEqual(exactMinRes.valid, true);

    const validRes = validateJustificacionNoAplicable(
      'La organización no realiza diseño ni desarrollo de productos; la fabricación se ejecuta bajo especificaciones provistas por los clientes.'
    );
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.error, undefined);
  });

  it('validates all seeded non-applicable exclusions in INITIAL_CERTIFICADOS_DETAILED', () => {
    const exclusions = INITIAL_CERTIFICADOS_DETAILED.flatMap((c) => c.noAplicables);
    assert.ok(exclusions.length >= 2);
    for (const excl of exclusions) {
      const check = validateJustificacionNoAplicable(excl.justificacion);
      assert.strictEqual(check.valid, true, `Invalid justification on ${excl.requisito_codigo}`);
    }
  });
});

describe('Phase 4.2 - Process Classification Badges', () => {
  it('provides visual metadata for all 4 canonical process types', () => {
    const estrategico = getProcessTypeVisual('Estratégico');
    assert.strictEqual(estrategico.label, 'Estratégico');
    assert.ok(estrategico.badgeClass.includes('purple'));

    const medular = getProcessTypeVisual('Medular');
    assert.strictEqual(medular.label, 'Medular');
    assert.ok(medular.badgeClass.includes('sky'));

    const apoyo = getProcessTypeVisual('De Apoyo');
    assert.strictEqual(apoyo.label, 'De Apoyo');
    assert.ok(apoyo.badgeClass.includes('teal'));

    const otro = getProcessTypeVisual('Otro');
    assert.strictEqual(otro.label, 'Otro');
  });
});

describe('Phase 4.2 - Certificate Filtering & Multi-Facet Exploration', () => {
  it('filters certificates by certificate code and standard', () => {
    const byCode = filterCertificates(INITIAL_CERTIFICADOS_DETAILED, {
      query: 'FN-QMS-2024-001',
    });
    assert.strictEqual(byCode.length, 1);
    assert.strictEqual(byCode[0].numero_certificado, 'FN-QMS-2024-001');

    const byStandard = filterCertificates(INITIAL_CERTIFICADOS_DETAILED, {
      selectedStandard: 'ISO 9001:2015',
    });
    assert.strictEqual(byStandard.length, 1);
    assert.strictEqual(byStandard[0].norma_codigo, 'ISO 9001:2015');
  });

  it('filters certificates by operational status', () => {
    const activos = filterCertificates(INITIAL_CERTIFICADOS_DETAILED, {
      selectedStatus: 'Activo',
    });
    assert.strictEqual(activos.length, 2);
    assert.ok(activos.every((c) => c.estatus === 'Activo'));

    const suspendidos = filterCertificates(INITIAL_CERTIFICADOS_DETAILED, {
      selectedStatus: 'Suspendido',
    });
    assert.strictEqual(suspendidos.length, 1);
    assert.strictEqual(suspendidos[0].numero_certificado, 'FN-OHS-2023-018');
  });

  it('filters certificates by sector IAF', () => {
    const sector17 = filterCertificates(INITIAL_CERTIFICADOS_DETAILED, {
      selectedSectorIaf: '17',
    });
    assert.strictEqual(sector17.length, 1);
    assert.strictEqual(sector17[0].sector_iaf, 17);
  });
});

describe('Phase 4.2 - Zero-UUID Exposure Compliance & Clean List Rule', () => {
  it('ensures sample certificate records contain human-readable names and codes', () => {
    for (const cert of INITIAL_CERTIFICADOS_DETAILED) {
      assert.ok(cert.organizacion_nombre.length > 0);
      assert.ok(cert.norma_codigo.length > 0);
      assert.ok(cert.sector_iaf_descripcion.length > 0);
      assert.ok(cert.numero_certificado.startsWith('FN-'));
    }
  });

  it('strictly excludes the Cobertura Normativa column from the clean certificate list table', async () => {
    const { renderCertificadoView } = await import('../views/certificadoView');
    const mockProfile = {
      id: 'mock-user-1',
      role: 'ADMIN' as const,
      status: 'APPROVED' as const,
      nombre: 'Administrador Principal',
    };

    const listHtml = renderCertificadoView({
      profile: mockProfile,
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
      },
      certificates: INITIAL_CERTIFICADOS_DETAILED,
      loading: false,
    });

    // Verify "Cobertura Normativa" or "Cobertura ISO" column is strictly excluded from list view
    assert.strictEqual(
      listHtml.includes('Cobertura Normativa'),
      false,
      'List table must not contain Cobertura Normativa'
    );
    assert.strictEqual(
      listHtml.includes('Cobertura ISO'),
      false,
      'List table must not contain Cobertura ISO'
    );

    // Verify required clean columns are present
    assert.ok(listHtml.includes('Organización'));
    assert.ok(listHtml.includes('Código de Certificado'));
    assert.ok(listHtml.includes('Norma'));
    assert.ok(listHtml.includes('Sedes Multisitio'));
    assert.ok(listHtml.includes('Estatus'));
    assert.ok(listHtml.includes('Vigencia'));

    // Single type="text" search bar (zero native type="search" double-X) + reactive Multi View totalizer
    assert.strictEqual(/type=["']search["']/i.test(listHtml), false);
    assert.ok(listHtml.includes('type="text"'));
    assert.ok(listHtml.includes('Mostrando'));

    // Zero-UUID check
    const listCheck = assertZeroUuidExposure(listHtml);
    assert.strictEqual(listCheck.compliant, true, `List view exposed raw UUIDs: ${listCheck.exposedUuids.join(', ')}`);
  });

  it('renders Standardized 3-Zone detail view with 5 specialized child tabs adhering to Zero-UUID mandate', async () => {
    const { renderCertificadoView } = await import('../views/certificadoView');
    const mockProfile = {
      id: 'mock-user-1',
      role: 'ADMIN' as const,
      status: 'APPROVED' as const,
      nombre: 'Administrador Principal',
    };

    const detailHtml = renderCertificadoView({
      profile: mockProfile,
      state: {
        selectedCertId: '40000000-0000-0000-0000-000000000001',
        activeChildTab: 'sitios',
        query: '',
        selectedStandard: 'ALL',
        selectedStatus: 'ALL',
        selectedSectorIaf: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isEditingAttributes: false,
      },
      certificates: INITIAL_CERTIFICADOS_DETAILED,
      loading: false,
    });

    // Check Standardized 3-Zone Architecture (Parent Zone -> Divider -> Record Zone -> List-only Child Tabs)
    assert.ok(detailHtml.includes('aria-label="Contexto y relaciones superiores"'));
    assert.ok(detailHtml.includes('data-parent-nav="true"'));
    assert.ok(detailHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
    assert.ok(detailHtml.includes('aria-label="Detalle del registro"'));
    assert.ok(detailHtml.includes('role="tablist"'));
    assert.ok(!detailHtml.includes('ZONA 1:'));
    assert.ok(!detailHtml.includes('ZONA 2:'));
    assert.ok(!detailHtml.includes('ZONA 3:'));
    assert.ok(!detailHtml.includes('ZONA 4:'));

    // Check Site 0 principal badge
    assert.ok(detailHtml.includes('Sede Central / Principal'));
    assert.ok(detailHtml.includes('Sede #0'));

    // Check live character counter label in Record Zone
    assert.ok(detailHtml.includes('/ 1000 caracteres'));

    // Check forensic changelog button
    assert.ok(detailHtml.includes('data-action="open-changelog"'));

    // Zero-UUID check
    const detailCheck = assertZeroUuidExposure(detailHtml);
    assert.strictEqual(detailCheck.compliant, true, `Detail view exposed raw UUIDs: ${detailCheck.exposedUuids.join(', ')}`);
  });
});
