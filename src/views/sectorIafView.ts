import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  formatAcreditacionStatusBadge,
  formatRiskCategoryBadge,
  type AcreditacionNormaIaf,
  type SectorIafEntity,
  type SubsectorIafEntity,
} from '../lib/extraDomain';
import type { CertificadoDetailEntity } from '../lib/multisiteSampling';
import {
  getQualificationStatusVisual,
  type AuditorDetailEntity,
} from '../lib/competencyMatrix';
import {
  computeReactiveFacetCounts,
  filterRecordsWithFacets,
  sortItems,
  type ColumnDefinition,
  type MultiViewFacetCategory,
  type MultiViewSelectionMap,
  type SortDirection,
} from '../lib/universalTemplate';
import { renderUniversalTemplate } from './universalTemplate';
import { renderDetailPageTemplate } from './detailTemplate';

export interface SectorIafViewState {
  selectedSectorId: string | null;
  activeChildTab: 'subsectores' | 'acreditaciones' | 'certificados' | 'auditores';
  query: string;
  selectedRisk: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isAddSubsectorModalOpen: boolean;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface SectorIafViewProps {
  profile: UserProfile;
  state: SectorIafViewState;
  sectores: SectorIafEntity[];
  subsectores: SubsectorIafEntity[];
  acreditaciones?: AcreditacionNormaIaf[];
  certificados?: CertificadoDetailEntity[];
  auditores?: AuditorDetailEntity[];
  loading?: boolean;
}

export function renderSectorIafView(props: SectorIafViewProps): string {
  const {
    profile,
    state,
    sectores,
    subsectores,
    acreditaciones = [],
    certificados = [],
    auditores = [],
    loading,
  } = props;
  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';

  // If a specific Sector is selected, render the Standardized 3-Zone Detail Page
  if (state.selectedSectorId) {
    const selectedSector =
      sectores.find((s) => s.id === state.selectedSectorId || String(s.sector) === state.selectedSectorId) ||
      sectores[0];

    if (selectedSector) {
      return renderSectorDetailPage({
        profile,
        sector: selectedSector,
        activeTab: state.activeChildTab,
        subsectores: subsectores.filter(
          (sub) => sub.id_sector_iaf === selectedSector.id || sub.sector_numero === selectedSector.sector
        ),
        acreditaciones: acreditaciones.filter(
          (acc) =>
            acc.id_sector_iaf === selectedSector.id ||
            acc.sector_iaf_numero === selectedSector.sector
        ),
        certificados: certificados.filter(
          (c) =>
            c.id_sector_iaf === selectedSector.id ||
            c.sector_iaf === selectedSector.sector
        ),
        auditores: auditores.filter((aud) => aud.sectores_iaf.includes(selectedSector.sector)),
        isAddSubsectorModalOpen: state.isAddSubsectorModalOpen,
        isStaff,
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderSectorDirectoryView({
    profile,
    state,
    sectores,
    subsectores,
    loading,
  });
}

function renderSectorDirectoryView(params: {
  profile: UserProfile;
  state: SectorIafViewState;
  sectores: SectorIafEntity[];
  subsectores: SubsectorIafEntity[];
  loading?: boolean;
}): string {
  const { state, sectores, subsectores, loading } = params;

  const getRelatedSubs = (sec: SectorIafEntity): SubsectorIafEntity[] =>
    subsectores.filter(
      (sub) => sub.id_sector_iaf === sec.id || sub.sector_numero === sec.sector
    );

  const facetCategories: MultiViewFacetCategory<SectorIafEntity>[] = [
    {
      id: 'riesgo',
      label: 'Nivel de Riesgo Sub-Sector',
      options: [
        { value: 'ALTO', label: 'Alto Riesgo (ALTO)' },
        { value: 'MEDIO', label: 'Riesgo Medio (MEDIO)' },
        { value: 'BAJO', label: 'Bajo Riesgo (BAJO)' },
      ],
      extractValues: (sec) => {
        const risks = new Set<string>();
        for (const sub of getRelatedSubs(sec)) {
          risks.add(sub.categoria_riesgo.toUpperCase());
        }
        return Array.from(risks);
      },
    },
    {
      id: 'auditores',
      label: 'Con Auditores Calificados',
      options: [
        { value: 'CON_AUDITORES', label: 'Con Auditores Calificados' },
        { value: 'SIN_AUDITORES', label: 'Sin Auditores Calificados' },
      ],
      extractValues: (sec) => (sec.auditores_count > 0 ? 'CON_AUDITORES' : 'SIN_AUDITORES'),
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        riesgo:
          state.selectedRisk && state.selectedRisk !== 'ALL'
            ? new Set([state.selectedRisk.toUpperCase()])
            : new Set<string>(),
        auditores: new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (sec: SectorIafEntity) => {
      const subText = getRelatedSubs(sec)
        .map((sub) => `${sub.codigo} ${sub.descripcion}`)
        .join(' ');
      return `IAF ${sec.sector} ${sec.descripcion} ${subText}`;
    },
  };

  const filtered = filterRecordsWithFacets(
    sectores,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const sorted = sortItems(
    filtered,
    state.sortColumn,
    state.sortDirection,
    (item, col) => {
      switch (col) {
        case 'sector':
          return item.sector;
        case 'descripcion':
          return item.descripcion;
        case 'subsectores':
          return item.subsectores_count;
        case 'auditores':
          return item.auditores_count;
        default:
          return (item as unknown as Record<string, unknown>)[col];
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    sectores,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<SectorIafEntity>[] = [
    {
      id: 'sector',
      header: 'Sector IAF',
      sortable: true,
      renderCell: (sec) => `
        <button
          type="button"
          data-action="select-iaf"
          data-sector-id="${escapeHtml(sec.id)}"
          class="text-indigo-600 hover:text-indigo-800 hover:underline font-mono font-bold cursor-pointer inline-flex items-center gap-1.5"
        >
          <span aria-hidden="true">🏭</span>
          <span>IAF ${sec.sector}</span>
        </button>
      `,
    },
    {
      id: 'descripcion',
      header: 'Descripción Técnica Oficial',
      sortable: true,
      renderCell: (sec) => `
        <span class="text-slate-700 font-medium">${escapeHtml(sec.descripcion)}</span>
      `,
    },
    {
      id: 'subsectores',
      header: 'Sub-Sectores',
      sortable: true,
      align: 'center',
      renderCell: (sec) => {
        const relatedSubs = getRelatedSubs(sec);
        return `
          <span class="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
            ${relatedSubs.length} sub-sector(es)
          </span>
        `;
      },
    },
    {
      id: 'auditores',
      header: 'Auditores Calificados',
      sortable: true,
      align: 'center',
      renderCell: (sec) => `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
          <span aria-hidden="true">👥</span>
          <span>${sec.auditores_count}</span>
        </span>
      `,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      align: 'right',
      renderCell: (sec) => `
        <button
          type="button"
          data-action="select-iaf"
          data-sector-id="${escapeHtml(sec.id)}"
          class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
        >
          Ver Detalle →
        </button>
      `,
    },
  ];

  const renderCard = (sec: SectorIafEntity): string => {
    const relatedSubs = getRelatedSubs(sec);

    return `
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200 font-mono">
              <span aria-hidden="true">🏭</span>
              <span>Sector IAF ${sec.sector}</span>
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Acreditado
            </span>
          </div>

          <h3 class="text-sm font-bold text-slate-900 leading-snug">
            ${escapeHtml(sec.descripcion)}
          </h3>

          <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
            <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 font-mono">
              <span aria-hidden="true">🏷️</span>
              <span><strong>${relatedSubs.length}</strong> Sub-sectores</span>
            </span>
            <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <span aria-hidden="true">👥</span>
              <span><strong>${sec.auditores_count}</strong> Evaluadores</span>
            </span>
          </div>

          ${
            relatedSubs.length > 0
              ? `
                <div class="pt-1 flex flex-wrap gap-1">
                  ${relatedSubs
                    .map((s) => {
                      const rMeta = formatRiskCategoryBadge(s.categoria_riesgo);
                      return `
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200" title="${escapeHtml(s.descripcion)} (${rMeta.label})">
                          ${escapeHtml(s.codigo)}
                        </span>
                      `;
                    })
                    .join('')}
                </div>
              `
              : ''
          }
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            data-action="select-iaf"
            data-sector-id="${escapeHtml(sec.id)}"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Explorar Sub-Sectores</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;
  };

  return renderUniversalTemplate({
    domainKey: 'iaf',
    title: 'Sectores Técnicos de Acreditación IAF',
    subtitle:
      'Taxonomía técnica internacional de sectores económicos, códigos de sub-sectores jerárquicos (17.1, 17.2...) y categorización de riesgo para la cualificación de auditores.',
    entityLabel: 'sectores IAF',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar por número (14, 17, 28...) o actividad industrial...',
    searchInputId: 'iafSearchInput',
    clearSearchBtnId: 'clearIafSearchBtn',
    totalCount: sectores.length,
    filteredCount: sorted.length,
    viewMode: state.viewMode,
    isSidebarOpen: state.isSidebarOpen ?? true,
    sortState: {
      column: state.sortColumn,
      direction: state.sortDirection,
    },
    facetGroups,
    items: sorted,
    columns,
    renderCard,
    emptyStateTitle: 'No se encontraron sectores IAF',
    emptyStateMessage: 'No se encontraron sectores que coincidan con los filtros aplicados.',
    loading,
  });
}

/**
 * Standardized 3-Zone Detail Page for a Single Sector IAF
 */
function renderSectorDetailPage(params: {
  profile: UserProfile;
  sector: SectorIafEntity;
  activeTab: 'subsectores' | 'acreditaciones' | 'certificados' | 'auditores';
  subsectores: SubsectorIafEntity[];
  acreditaciones: AcreditacionNormaIaf[];
  certificados: CertificadoDetailEntity[];
  auditores: AuditorDetailEntity[];
  isAddSubsectorModalOpen: boolean;
  isStaff: boolean;
}): string {
  const {
    sector,
    activeTab,
    subsectores,
    acreditaciones,
    certificados,
    auditores,
    isAddSubsectorModalOpen,
    isStaff,
  } = params;

  // Tab 1: Sub-Sectores Content (List-only table)
  const tabSubsectoresHtml = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Sub-Sectores Técnicos Registrados</h3>
          <p class="text-xs text-slate-500">
            Desglose granular de actividades económicas y categorización de riesgo bajo ISO/IEC 17021-1
          </p>
        </div>
        ${
          isStaff
            ? `
              <button
                type="button"
                id="openNewSubsectorModalBtn"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>Nuevo Sub-Sector</span>
              </button>
            `
            : ''
        }
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">Código</th>
              <th class="py-3 px-4">Descripción Técnica Detallada</th>
              <th class="py-3 px-4 text-center">Categoría de Riesgo ISO</th>
              <th class="py-3 px-4">Auditores Especialistas Calificados</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              subsectores.length === 0
                ? `
                  <tr>
                    <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                      No se han registrado sub-sectores para este sector IAF.
                    </td>
                  </tr>
                `
                : subsectores
                    .map((sub) => {
                      const riskMeta = formatRiskCategoryBadge(sub.categoria_riesgo);
                      return `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                            ${escapeHtml(sub.codigo)}
                          </td>
                          <td class="py-3 px-4 text-slate-700 font-medium">
                            ${escapeHtml(sub.descripcion)}
                          </td>
                          <td class="py-3 px-4 text-center">
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${riskMeta.badgeClass}">
                              <span>${riskMeta.symbol}</span>
                              <span>${escapeHtml(riskMeta.label)}</span>
                            </span>
                          </td>
                          <td class="py-3 px-4 text-slate-600">
                            ${
                              sub.auditores_nombres && sub.auditores_nombres.length > 0
                                ? sub.auditores_nombres
                                    .map(
                                      (aud) => `
                                      <div class="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-800 border border-slate-200 mr-1 mb-1">
                                        <span>👤</span>
                                        <span>${escapeHtml(aud)}</span>
                                      </div>
                                    `
                                    )
                                    .join('')
                                : `<span class="text-slate-400 italic">Sin auditores asignados</span>`
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Tab 2: Acreditaciones que amparan este Sector IAF (List-only table)
  const tabAcreditacionesHtml = `
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Acreditaciones Vigentes en Sector IAF ${sector.sector}</h3>
        <p class="text-xs text-slate-500">
          Alcances de acreditación otorgados por organismos oficiales (ENAC, UKAS, ANAB) para este sector económico.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">N° Acreditación</th>
              <th class="py-3 px-4">Organismo</th>
              <th class="py-3 px-4">Norma Amparada</th>
              <th class="py-3 px-4">Vigencia</th>
              <th class="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              acreditaciones.length === 0
                ? `
                  <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400 text-xs italic">
                      No hay acreditaciones específicas asignadas a este sector IAF.
                    </td>
                  </tr>
                `
                : acreditaciones
                    .map((acc) => {
                      const accStatus = formatAcreditacionStatusBadge(acc.estatus);
                      return `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              data-action="select-accreditation"
                              data-accreditation-id="${escapeHtml(acc.id)}"
                              class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                            >
                              ${escapeHtml(acc.numero_acreditacion)}
                            </button>
                          </td>
                          <td class="py-3 px-4">
                            <span class="font-bold text-slate-900">${escapeHtml(acc.organismo_codigo)}</span>
                            <span class="text-slate-500 ml-1">${escapeHtml(acc.organismo_nombre)}</span>
                          </td>
                          <td class="py-3 px-4">
                            <button
                              type="button"
                              data-action="select-norma"
                              data-norma-id="${escapeHtml(acc.id_norma)}"
                              class="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                            >
                              📘 ${escapeHtml(acc.norma_codigo)}
                            </button>
                          </td>
                          <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            ${escapeHtml(acc.fecha_concesion)} → ${escapeHtml(acc.fecha_vencimiento || 'Indefinida')}
                          </td>
                          <td class="py-3 px-4 text-center whitespace-nowrap">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${accStatus.badgeClass}">
                              <span>${accStatus.symbol}</span>
                              <span>${escapeHtml(accStatus.label)}</span>
                            </span>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Tab 3: Certificados en este Sector IAF (List-only table)
  const tabCertificadosHtml = `
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Certificados Emitidos en Sector IAF ${sector.sector}</h3>
        <p class="text-xs text-slate-500">
          Certificados activos e históricos clasificados bajo este código sectorial.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">N° Certificado</th>
              <th class="py-3 px-4">Organización</th>
              <th class="py-3 px-4">Norma</th>
              <th class="py-3 px-4">Vigencia</th>
              <th class="py-3 px-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              certificados.length === 0
                ? `
                  <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400 text-xs italic">
                      No hay certificados registrados en este sector IAF.
                    </td>
                  </tr>
                `
                : certificados
                    .map((c) => `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            data-action="select-cert"
                            data-cert-id="${escapeHtml(c.id)}"
                            class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                          >
                            📜 ${escapeHtml(c.numero_certificado)}
                          </button>
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-800">
                          <button
                            type="button"
                            data-action="select-org"
                            data-org-id="${escapeHtml(c.id_organizacion)}"
                            class="text-slate-800 hover:text-indigo-700 hover:underline font-semibold cursor-pointer text-left"
                          >
                            🏢 ${escapeHtml(c.organizacion_nombre)}
                          </button>
                        </td>
                        <td class="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          ${escapeHtml(c.norma_codigo)}
                        </td>
                        <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          ${escapeHtml(c.fecha_emision)} → ${escapeHtml(c.fecha_vencimiento)}
                        </td>
                        <td class="py-3 px-4 text-center whitespace-nowrap">
                          <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            ${escapeHtml(c.estatus)}
                          </span>
                        </td>
                      </tr>
                    `)
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Tab 4: Auditores Calificados Content (List-only table)
  const fallbackNames = Array.from(
    new Set(subsectores.flatMap((s) => s.auditores_nombres || []))
  );

  const tabAuditoresHtml = `
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Evaluadores Técnicos con Competencia Sectorial</h3>
        <p class="text-xs text-slate-500">
          Auditores habilitados para liderar o evaluar auditorías en el Sector IAF ${sector.sector}
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">Auditor</th>
              <th class="py-3 px-4">Credencial</th>
              <th class="py-3 px-4">Normas Calificadas</th>
              <th class="py-3 px-4">Sub-Sectores en IAF ${sector.sector}</th>
              <th class="py-3 px-4 text-center">Calificación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              auditores.length > 0
                ? auditores
                    .map((aud) => {
                      const qualVisual = getQualificationStatusVisual(aud.calificacion);
                      const sectorComps = aud.competencias.filter(
                        (c) => c.sector_iaf_numero === sector.sector
                      );
                      const subCodes = Array.from(
                        new Set(
                          sectorComps
                            .map((c) => c.subsector_iaf_codigo)
                            .filter((code): code is string => Boolean(code))
                        )
                      );
                      return `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4">
                            <button
                              type="button"
                              data-action="select-auditor"
                              data-auditor-id="${escapeHtml(aud.id)}"
                              class="font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer text-left"
                            >
                              🪪 ${escapeHtml(aud.nombre)}
                            </button>
                            <div class="text-[11px] text-slate-500">${escapeHtml(aud.titulo_profesional)}</div>
                          </td>
                          <td class="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            ${escapeHtml(aud.codigo_credencial)}
                          </td>
                          <td class="py-3 px-4">
                            <div class="flex flex-wrap gap-1">
                              ${aud.normas_acreditadas
                                .map(
                                  (n) =>
                                    `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">${escapeHtml(n)}</span>`
                                )
                                .join('')}
                            </div>
                          </td>
                          <td class="py-3 px-4 font-mono text-[11px] text-slate-700">
                            ${subCodes.length > 0 ? escapeHtml(subCodes.join(', ')) : 'Sector completo'}
                          </td>
                          <td class="py-3 px-4 text-center whitespace-nowrap">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${qualVisual.badgeClass}">
                              <span class="w-1.5 h-1.5 rounded-full ${qualVisual.dotClass}"></span>
                              <span>${escapeHtml(qualVisual.label)}</span>
                            </span>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
                : fallbackNames.length > 0
                ? fallbackNames
                    .map(
                      (name) => `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 font-bold text-slate-900">👤 ${escapeHtml(name)}</td>
                          <td class="py-3 px-4 font-mono text-slate-500">—</td>
                          <td class="py-3 px-4 text-slate-600">Según matriz de competencia</td>
                          <td class="py-3 px-4 font-mono text-[11px] text-slate-600">Sector IAF ${sector.sector}</td>
                          <td class="py-3 px-4 text-center">
                            <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Calificado
                            </span>
                          </td>
                        </tr>
                      `
                    )
                    .join('')
                : `
                  <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400 text-xs italic">
                      No hay auditores calificados registrados para este sector IAF.
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Modal for Adding New Sub-Sector
  const newSubsectorModalHtml = isAddSubsectorModalOpen
    ? `
      <div id="newSubsectorBackdrop" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏷️</span>
              <h3 class="text-sm font-bold text-slate-900">Registrar Sub-Sector Técnico</h3>
            </div>
            <button type="button" id="closeNewSubsectorModalBtn" class="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕
            </button>
          </div>
          <form id="newSubsectorForm" class="p-6 space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Sector Padre</label>
              <input type="text" disabled value="Sector IAF ${sector.sector} — ${escapeHtml(sector.descripcion)}" class="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-600 font-medium" />
              <input type="hidden" name="id_sector_iaf" value="${escapeHtml(sector.id)}" />
              <input type="hidden" name="sector_numero" value="${sector.sector}" />
            </div>
            <div>
              <label for="subsectorCodigoInput" class="block font-bold text-slate-700 mb-1">Código de Sub-Sector *</label>
              <input id="subsectorCodigoInput" name="codigo" type="text" required placeholder="Ej. ${sector.sector}.3 o ${sector.sector}.4" class="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono focus:ring-1 focus:ring-indigo-600" />
            </div>
            <div>
              <label for="subsectorDescInput" class="block font-bold text-slate-700 mb-1">Descripción Técnica Detallada *</label>
              <textarea id="subsectorDescInput" name="descripcion" rows="3" required placeholder="Actividades industriales y alcance técnico del sub-sector..." class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600"></textarea>
            </div>
            <div>
              <label for="subsectorRiesgoSelect" class="block font-bold text-slate-700 mb-1">Categoría de Riesgo ISO *</label>
              <select id="subsectorRiesgoSelect" name="categoria_riesgo" required class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600">
                <option value="BAJO">🟢 BAJO RIESGO</option>
                <option value="MEDIO" selected>🟡 RIESGO MEDIO</option>
                <option value="ALTO">🔴 ALTO RIESGO</option>
              </select>
            </div>
            <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" id="cancelNewSubsectorModalBtn" class="px-3.5 py-2 rounded-lg font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" class="px-4 py-2 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer">
                Guardar Sub-Sector
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    : '';

  const qualifiedCount = auditores.length > 0 ? auditores.length : sector.auditores_count;

  return renderDetailPageTemplate({
    entityType: 'Sector Técnico IAF',
    entitySymbol: '🏭',
    title: `Sector IAF ${sector.sector}`,
    eyebrowCode: `IAF ${sector.sector}`,
    subtitle: sector.descripcion,
    statusBadge: {
      label: 'ACREDITADO',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      symbol: '✓',
    },
    backButton: {
      label: 'Volver al Directorio de Sectores IAF',
      nav: 'extra',
      subview: 'iaf',
      action: 'back-to-iaf-list',
    },
    parents: [],
    tableName: 'sector_iaf',
    recordId: sector.id,
    attributes: [
      { label: 'Código de Sector', value: `Sector IAF ${sector.sector}`, isMono: true },
      { label: 'Sub-Sectores Definidos', value: `${subsectores.length} Sub-sector(es)` },
      { label: 'Auditores Calificados', value: `${qualifiedCount} Evaluadores Calificados` },
      { label: 'Normativa Internacional', value: 'ISO/IEC 17021-1 / IAF MD 5' },
    ],
    childTabs: [
      { id: 'subsectores', label: 'Sub-Sectores', symbol: '🏷️', count: subsectores.length },
      { id: 'acreditaciones', label: 'Acreditaciones', symbol: '🏛️', count: acreditaciones.length },
      { id: 'certificados', label: 'Certificados', symbol: '📜', count: certificados.length },
      { id: 'auditores', label: 'Auditores Calificados', symbol: '👥', count: qualifiedCount },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-iaf-tab',
    renderChildTabContent: (tabId) => {
      if (tabId === 'acreditaciones') return tabAcreditacionesHtml;
      if (tabId === 'certificados') return tabCertificadosHtml;
      if (tabId === 'auditores') return tabAuditoresHtml;
      return tabSubsectoresHtml;
    },
    modalsHtml: newSubsectorModalHtml,
  });
}
