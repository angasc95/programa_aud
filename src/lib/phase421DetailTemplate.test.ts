import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { UserProfile } from './healthCheck';
import { assertZeroUuidExposure } from './zeroUuid';
import { INITIAL_ORGANIZACIONES, type CertificadoSummary } from './activeCertificates';
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
import { renderOrganizacionView } from '../views/organizacionView';
import { renderCertificadoView } from '../views/certificadoView';
import { renderAuditorView } from '../views/auditorView';
import { renderProgramacionView } from '../views/programacionView';
import { renderNormaView } from '../views/normaView';
import { renderSectorIafView } from '../views/sectorIafView';
import { renderEstatusView } from '../views/estatusView';
import { renderTipoAuditoriaView } from '../views/tipoAuditoriaView';
import { renderMetodologiaAuditoriaView } from '../views/metodologiaAuditoriaView';

const ADMIN_PROFILE: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const FORBIDDEN_DETAIL_STRINGS = [
  'ZONA 1:',
  'ZONA 2:',
  'ZONA 3:',
  'ZONA 4:',
  'Atributos Directos del Registro',
  'Relación Padre-Hijo Verificada',
  'Atributos Directos de Planificación',
  'DATOS DIRECTOS DE LA EMPRESA',
  'DECLARACIÓN TÉCNICA Y ATRIBUTOS DIRECTOS',
  'data-drilldown-select-org',
];

function assertNoForbiddenStrings(html: string, contextLabel: string): void {
  for (const token of FORBIDDEN_DETAIL_STRINGS) {
    assert.ok(
      !html.includes(token),
      `${contextLabel} still contains legacy developer text or attribute: "${token}"`
    );
  }
}

function assertStandardActionBarAndZeroUuid(html: string, contextLabel: string): void {
  assert.ok(html.includes('data-nav-back="true"'), `${contextLabel} missing data-nav-back="true"`);
  assert.ok(
    html.includes('data-action="open-changelog"'),
    `${contextLabel} missing data-action="open-changelog"`
  );
  const zeroCheck = assertZeroUuidExposure(html);
  assert.equal(
    zeroCheck.compliant,
    true,
    `${contextLabel} exposed raw UUIDs: ${zeroCheck.exposedUuids.join(', ')}`
  );
}

describe('Phase 4.2.1: Standardized 3-Zone Detail Template & 9 Detail Views', () => {
  it('removes all legacy ZONA labels and data-drilldown-select-org from detailTemplate and the 9 detail view source files', () => {
    const viewFiles = [
      'src/views/detailTemplate.ts',
      'src/views/organizacionView.ts',
      'src/views/certificadoView.ts',
      'src/views/auditorView.ts',
      'src/views/programacionView.ts',
      'src/views/normaView.ts',
      'src/views/sectorIafView.ts',
      'src/views/estatusView.ts',
      'src/views/tipoAuditoriaView.ts',
      'src/views/metodologiaAuditoriaView.ts',
      'src/views/acreditacionView.ts',
      'src/views/sitioView.ts',
    ];

    for (const relPath of viewFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
      assertNoForbiddenStrings(content, relPath);
    }
  });

  it('renders Organizacion, Certificado, Auditor, and Programacion detail views with strict 3-Zone order and list-only tabs', () => {
    const certSummaries: CertificadoSummary[] = INITIAL_CERTIFICADOS_DETAILED.map((c) => ({
      id: c.id,
      numero_certificado: c.numero_certificado,
      id_organizacion: c.id_organizacion,
      organizacion_id: c.id_organizacion,
      organizacion_nombre: c.organizacion_nombre,
      norma: c.norma_codigo,
      esquema: c.esquema,
      estatus: c.estatus,
      sector_iaf: c.sector_iaf,
      multisitio: c.multisitio,
      sitios_count: c.sitios.length,
      fecha_emision: c.fecha_emision,
      fecha_vencimiento: c.fecha_vencimiento,
      cobertura_porcentaje: 100,
    }));

    const orgHtml = renderOrganizacionView({
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
        activeChildTab: 'auditorias',
      },
      organizaciones: INITIAL_ORGANIZACIONES,
      certificados: certSummaries,
      auditorias: INITIAL_PROGRAMACION_AUDITS,
    });
    assertNoForbiddenStrings(orgHtml, 'OrganizacionDetail');
    assertStandardActionBarAndZeroUuid(orgHtml, 'OrganizacionDetail');
    assert.ok(orgHtml.includes('data-parent-nav="true"'));
    assert.ok(orgHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
    assert.ok(orgHtml.includes('<table'));
    assert.ok(
      orgHtml.indexOf('aria-label="Contexto y relaciones superiores"') <
        orgHtml.indexOf('<hr class="border-t border-slate-200 my-4" />') &&
        orgHtml.indexOf('<hr class="border-t border-slate-200 my-4" />') <
          orgHtml.indexOf('aria-label="Detalle del registro"') &&
        orgHtml.indexOf('aria-label="Detalle del registro"') < orgHtml.indexOf('role="tablist"')
    );

    const certHtml = renderCertificadoView({
      profile: ADMIN_PROFILE,
      state: {
        selectedCertId: INITIAL_CERTIFICADOS_DETAILED[0].id,
        activeChildTab: 'cobertura',
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
      organizaciones: INITIAL_ORGANIZACIONES,
    });
    assertNoForbiddenStrings(certHtml, 'CertificadoDetail');
    assertStandardActionBarAndZeroUuid(certHtml, 'CertificadoDetail');
    assert.ok(certHtml.includes('data-parent-nav="true"'));
    assert.ok(certHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
    assert.ok(certHtml.includes('<table'));

    const auditorHtml = renderAuditorView({
      profile: ADMIN_PROFILE,
      state: {
        selectedAuditorId: INITIAL_AUDITORES_DETAILED[0].id,
        activeChildTab: 'competencias',
        query: '',
        selectedCalificacion: 'ALL',
        selectedStandard: 'ALL',
        selectedSectorIaf: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isEditingAttributes: false,
        isAddCompetencyModalOpen: false,
      },
      auditors: INITIAL_AUDITORES_DETAILED,
    });
    assertNoForbiddenStrings(auditorHtml, 'AuditorDetail');
    assertStandardActionBarAndZeroUuid(auditorHtml, 'AuditorDetail');
    assert.ok(auditorHtml.includes('aria-label="Contexto y relaciones superiores"'));
    assert.ok(auditorHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
    assert.ok(auditorHtml.includes('<table'));

    const progHtml = renderProgramacionView({
      profile: ADMIN_PROFILE,
      state: {
        selectedAuditId: INITIAL_PROGRAMACION_AUDITS[0].id,
        activeChildTab: 'hallazgos',
        query: '',
        selectedTipo: 'ALL',
        selectedMetodologia: 'ALL',
        selectedEstatus: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isEditingAttributes: false,
        isAddingTeamMember: false,
      },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      certificates: [],
      findings: INITIAL_PHASE5_FINDINGS,
    });
    assertNoForbiddenStrings(progHtml, 'ProgramacionDetail');
    assertStandardActionBarAndZeroUuid(progHtml, 'ProgramacionDetail');
    assert.ok(progHtml.includes('data-parent-nav="true"'));
    assert.ok(progHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
    assert.ok(progHtml.includes('<table'));
  });

  it('cleanly omits Parent Zone and hairline divider on standalone root catalogs (Norma, Sector IAF, Estatus, Tipo, Metodologia)', () => {
    const normaHtml = renderNormaView({
      profile: ADMIN_PROFILE,
      state: {
        selectedNormaId: INITIAL_NORMAS[0].id,
        activeChildTab: 'certificados',
        query: '',
        selectedStatus: 'ALL',
        selectedScheme: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isAddAccreditationModalOpen: false,
        inspectingClauseId: null,
      },
      normas: INITIAL_NORMAS,
      acreditaciones: INITIAL_ACREDITACIONES,
      organismos: INITIAL_ORGANISMOS,
      requisitos: INITIAL_REQUISITOS_LTREE,
      sectores: INITIAL_SECTORES_IAF,
      certificados: INITIAL_CERTIFICADOS_DETAILED,
    });

    const sectorHtml = renderSectorIafView({
      profile: ADMIN_PROFILE,
      state: {
        selectedSectorId: INITIAL_SECTORES_IAF[0].id,
        activeChildTab: 'auditores',
        query: '',
        selectedRisk: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isAddSubsectorModalOpen: false,
      },
      sectores: INITIAL_SECTORES_IAF,
      subsectores: INITIAL_SUBSECTORES_IAF,
      acreditaciones: INITIAL_ACREDITACIONES,
      certificados: INITIAL_CERTIFICADOS_DETAILED,
      auditores: INITIAL_AUDITORES_DETAILED,
    });

    const estatusHtml = renderEstatusView({
      profile: ADMIN_PROFILE,
      state: {
        selectedEstatusId: INITIAL_ESTATUS_CATALOG[0].id,
        activeChildTab: 'certificados',
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
      },
      estatusList: INITIAL_ESTATUS_CATALOG,
      certificados: INITIAL_CERTIFICADOS_DETAILED,
      audits: INITIAL_PROGRAMACION_AUDITS,
    });

    const tipoHtml = renderTipoAuditoriaView({
      profile: ADMIN_PROFILE,
      state: {
        selectedTipoId: INITIAL_TIPOS_AUDITORIA_CATALOG[0].id,
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
      },
      tiposList: INITIAL_TIPOS_AUDITORIA_CATALOG,
      audits: INITIAL_PROGRAMACION_AUDITS,
    });

    const metodologiaHtml = renderMetodologiaAuditoriaView({
      profile: ADMIN_PROFILE,
      state: {
        selectedMetodologiaId: INITIAL_METODOLOGIAS_CATALOG[0].id,
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
      },
      metodologiasList: INITIAL_METODOLOGIAS_CATALOG,
      audits: INITIAL_PROGRAMACION_AUDITS,
    });

    const rootViews = [
      { name: 'NormaDetail', html: normaHtml },
      { name: 'SectorIafDetail', html: sectorHtml },
      { name: 'EstatusDetail', html: estatusHtml },
      { name: 'TipoAuditoriaDetail', html: tipoHtml },
      { name: 'MetodologiaDetail', html: metodologiaHtml },
    ];

    for (const { name, html } of rootViews) {
      assertNoForbiddenStrings(html, name);
      assertStandardActionBarAndZeroUuid(html, name);
      assert.ok(
        !html.includes('aria-label="Contexto y relaciones superiores"'),
        `${name} should omit Parent Zone on standalone root catalog`
      );
      assert.ok(
        !html.includes('<hr class="border-t border-slate-200 my-4" />'),
        `${name} should omit hairline divider when Parent Zone is empty`
      );
      assert.ok(html.includes('<table'), `${name} should render list-only child table`);
    }
  });
});
