import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
  calculateLtreeIndentation,
  filterNormas,
  filterSectoresIaf,
  filterSubsectoresBySector,
  formatRiskCategoryBadge,
  formatNormaStatusBadge,
  formatAcreditacionStatusBadge,
} from './extraDomain';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderNormaView } from '../views/normaView';
import { renderSectorIafView } from '../views/sectorIafView';
import { renderEstatusView } from '../views/estatusView';
import { renderTipoAuditoriaView } from '../views/tipoAuditoriaView';
import { renderMetodologiaAuditoriaView } from '../views/metodologiaAuditoriaView';
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

describe('Extra Domain - Normas & Standards Logic', () => {
  it('returns all normas when query and filters are empty', () => {
    const result = filterNormas(INITIAL_NORMAS, '', 'ALL', 'ALL');
    assert.equal(result.length, INITIAL_NORMAS.length);
  });

  it('filters normas by code or title query', () => {
    const result = filterNormas(INITIAL_NORMAS, '14001', 'ALL', 'ALL');
    assert.equal(result.length, 1);
    assert.equal(result[0].codigo, 'ISO 14001:2015');

    const resultTitle = filterNormas(INITIAL_NORMAS, 'calidad', 'ALL', 'ALL');
    assert.ok(resultTitle.some((n) => n.codigo === 'ISO 9001:2015'));
  });

  it('filters normas by status', () => {
    const vigenteOnly = filterNormas(INITIAL_NORMAS, '', 'Vigente', 'ALL');
    assert.ok(vigenteOnly.length > 0);
    assert.ok(vigenteOnly.every((n) => n.estatus === 'Vigente'));
  });

  it('filters normas by scheme', () => {
    const sgcOnly = filterNormas(INITIAL_NORMAS, '', 'ALL', 'SGC - Calidad');
    assert.ok(sgcOnly.length > 0);
    assert.ok(sgcOnly.every((n) => n.esquema.includes('SGC')));
  });

  it('preserves list ordering or applies criteria', () => {
    const all = filterNormas(INITIAL_NORMAS, '', 'ALL', 'ALL');
    assert.ok(all.length >= 4);
    assert.equal(all[0].codigo, 'ISO 9001:2015');
  });
});

describe('Extra Domain - Sectores IAF & Subsectores Logic', () => {
  it('returns all IAF sectors when search is empty', () => {
    const result = filterSectoresIaf(INITIAL_SECTORES_IAF, INITIAL_SUBSECTORES_IAF, '', 'ALL');
    assert.equal(result.length, INITIAL_SECTORES_IAF.length);
  });

  it('filters IAF sectors by number or keyword', () => {
    const byNumber = filterSectoresIaf(INITIAL_SECTORES_IAF, INITIAL_SUBSECTORES_IAF, '17', 'ALL');
    assert.equal(byNumber.length, 1);
    assert.equal(byNumber[0].sector, 17);

    const byWord = filterSectoresIaf(INITIAL_SECTORES_IAF, INITIAL_SUBSECTORES_IAF, 'químicos', 'ALL');
    assert.ok(byWord.some((s) => s.sector === 14));
  });

  it('filters IAF sectors by risk level', () => {
    const highRisk = filterSectoresIaf(INITIAL_SECTORES_IAF, INITIAL_SUBSECTORES_IAF, '', 'ALTO');
    assert.ok(highRisk.length > 0);
    assert.ok(highRisk.some((s) => s.sector === 17));
  });

  it('filters subsectores correctly by parent sector', () => {
    const subsectors = filterSubsectoresBySector(INITIAL_SUBSECTORES_IAF, 17);
    assert.ok(subsectors.length >= 2);
    assert.ok(subsectors.every((sub) => sub.sector_numero === 17));
    assert.ok(subsectors.some((sub) => sub.codigo === '17.1'));
    assert.ok(subsectors.some((sub) => sub.codigo === '17.2'));
  });
});

describe('Extra Domain - PostgreSQL LTREE Clause Indentation', () => {
  it('identifies root clauses with level 1 and isParent true', () => {
    const root = calculateLtreeIndentation('4', '4');
    assert.equal(root.level, 1);
    assert.equal(root.isParent, true);
    assert.equal(root.indentPx, 0);
  });

  it('identifies second level clauses with 20px indentation', () => {
    const sub = calculateLtreeIndentation('4.4_1', '4.1');
    assert.equal(sub.level, 2);
    assert.equal(sub.isParent, false);
    assert.equal(sub.indentPx, 20);
  });

  it('identifies third level clauses with 40px indentation', () => {
    const deep = calculateLtreeIndentation('4.4_1.4_1_1', '4.1.1');
    assert.equal(deep.level, 3);
    assert.equal(deep.isParent, false);
    assert.equal(deep.indentPx, 40);
  });
});

describe('Extra Domain - Badges and Formatters', () => {
  it('formats risk category badges with appropriate semantic styling', () => {
    const high = formatRiskCategoryBadge('ALTO');
    assert.ok(high.badgeClass.includes('rose'));
    assert.equal(high.label, 'ALTO RIESGO');

    const med = formatRiskCategoryBadge('MEDIO');
    assert.ok(med.badgeClass.includes('amber'));
    assert.equal(med.label, 'RIESGO MEDIO');

    const low = formatRiskCategoryBadge('BAJO');
    assert.ok(low.badgeClass.includes('emerald'));
    assert.equal(low.label, 'BAJO RIESGO');
  });

  it('formats norma status badges correctly', () => {
    const vigente = formatNormaStatusBadge('Vigente');
    assert.equal(vigente.label, 'VIGENTE');
    assert.ok(vigente.badgeClass.includes('emerald'));

    const revision = formatNormaStatusBadge('En Revisión');
    assert.equal(revision.label, 'EN REVISIÓN');
    assert.ok(revision.badgeClass.includes('amber'));
  });

  it('formats acreditacion status badges correctly', () => {
    const active = formatAcreditacionStatusBadge('Activa');
    assert.equal(active.label, 'ACREDITACIÓN ACTIVA');
    assert.ok(active.badgeClass.includes('emerald'));
  });
});

describe('Extra Domain - Canonical Catalogs', () => {
  it('contains the 8 canonical statuses with correct values', () => {
    assert.equal(INITIAL_ESTATUS_CATALOG.length, 8);
    const expected = [
      'Activo',
      'Estudio',
      'Suspendido',
      'Cancelado',
      'Planificado',
      'En Ejecución',
      'En Espera',
      'Inactivo',
    ];
    for (const est of expected) {
      assert.ok(
        INITIAL_ESTATUS_CATALOG.some((e) => e.estatus === est),
        `Missing canonical estatus: ${est}`
      );
    }
  });

  it('contains the 9 canonical audit types aligned with ISO 17021-1 cycles', () => {
    assert.equal(INITIAL_TIPOS_AUDITORIA_CATALOG.length, 9);
    const expected = [
      'Etapa 1',
      'Etapa 2',
      'Seguimiento 1',
      'Seguimiento 2',
      'Renovación',
      'Diagnóstico',
      'Extraordinaria',
      'Especial',
      'Otro',
    ];
    for (const t of expected) {
      assert.ok(
        INITIAL_TIPOS_AUDITORIA_CATALOG.some((item) => item.tipo === t),
        `Missing canonical tipo: ${t}`
      );
    }
  });

  it('contains the 3 canonical methodologies with IAF MD 4 references', () => {
    assert.equal(INITIAL_METODOLOGIAS_CATALOG.length, 3);
    const expected = ['Presencial', 'Remota', 'Mixta'];
    for (const m of expected) {
      assert.ok(
        INITIAL_METODOLOGIAS_CATALOG.some((item) => item.metodologia === m),
        `Missing canonical metodologia: ${m}`
      );
    }
  });
});

describe('Extra Domain - Zero-UUID Exposure Compliance', () => {
  it('renders Norma directory and detail without exposing raw UUIDs in visible text', () => {
    const listHtml = renderNormaView({
      profile: mockProfile,
      state: {
        selectedNormaId: null,
        activeChildTab: 'acreditacion',
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
      loading: false,
    });
    const listCompliance = assertZeroUuidExposure(listHtml);
    assert.ok(
      listCompliance.compliant,
      `Exposed UUIDs in Norma list: ${listCompliance.exposedUuids.join(', ')}`
    );

    const detailHtml = renderNormaView({
      profile: mockProfile,
      state: {
        selectedNormaId: INITIAL_NORMAS[0].id,
        activeChildTab: 'acreditacion',
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
      loading: false,
    });
    const detailCompliance = assertZeroUuidExposure(detailHtml);
    assert.ok(
      detailCompliance.compliant,
      `Exposed UUIDs in Norma detail: ${detailCompliance.exposedUuids.join(', ')}`
    );
  });

  it('renders Sector IAF directory and detail without exposing raw UUIDs in visible text', () => {
    const listHtml = renderSectorIafView({
      profile: mockProfile,
      state: {
        selectedSectorId: null,
        activeChildTab: 'subsectores',
        query: '',
        selectedRisk: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isAddSubsectorModalOpen: false,
      },
      sectores: INITIAL_SECTORES_IAF,
      subsectores: INITIAL_SUBSECTORES_IAF,
      loading: false,
    });
    const listCompliance = assertZeroUuidExposure(listHtml);
    assert.ok(
      listCompliance.compliant,
      `Exposed UUIDs in Sector IAF list: ${listCompliance.exposedUuids.join(', ')}`
    );

    const detailHtml = renderSectorIafView({
      profile: mockProfile,
      state: {
        selectedSectorId: INITIAL_SECTORES_IAF[0].id,
        activeChildTab: 'subsectores',
        query: '',
        selectedRisk: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isAddSubsectorModalOpen: false,
      },
      sectores: INITIAL_SECTORES_IAF,
      subsectores: INITIAL_SUBSECTORES_IAF,
      loading: false,
    });
    const detailCompliance = assertZeroUuidExposure(detailHtml);
    assert.ok(
      detailCompliance.compliant,
      `Exposed UUIDs in Sector IAF detail: ${detailCompliance.exposedUuids.join(', ')}`
    );
  });

  it('renders Estatus, TipoAuditoria, and Metodologia without exposing raw UUIDs in visible text', () => {
    const estatusHtml = renderEstatusView({
      profile: mockProfile,
      state: {
        selectedEstatusId: null,
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
      },
      estatusList: INITIAL_ESTATUS_CATALOG,
      loading: false,
    });
    const estatusCompliance = assertZeroUuidExposure(estatusHtml);
    assert.ok(
      estatusCompliance.compliant,
      `Exposed UUIDs in Estatus view: ${estatusCompliance.exposedUuids.join(', ')}`
    );

    const tipoHtml = renderTipoAuditoriaView({
      profile: mockProfile,
      state: {
        selectedTipoId: null,
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
      },
      tiposList: INITIAL_TIPOS_AUDITORIA_CATALOG,
      loading: false,
    });
    const tipoCompliance = assertZeroUuidExposure(tipoHtml);
    assert.ok(
      tipoCompliance.compliant,
      `Exposed UUIDs in Tipo Auditoria view: ${tipoCompliance.exposedUuids.join(', ')}`
    );

    const metHtml = renderMetodologiaAuditoriaView({
      profile: mockProfile,
      state: {
        selectedMetodologiaId: null,
        query: '',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
      },
      metodologiasList: INITIAL_METODOLOGIAS_CATALOG,
      loading: false,
    });
    const metCompliance = assertZeroUuidExposure(metHtml);
    assert.ok(
      metCompliance.compliant,
      `Exposed UUIDs in Metodologia view: ${metCompliance.exposedUuids.join(', ')}`
    );
  });
});
