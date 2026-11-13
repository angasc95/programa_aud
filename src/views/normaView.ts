import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  calculateLtreeIndentation,
  formatAcreditacionStatusBadge,
  formatNormaStatusBadge,
  type AcreditacionNormaIaf,
  type NormaEntity,
  type OrganismoAcreditacion,
  type RequisitoLtree,
  type SectorIafEntity,
} from '../lib/extraDomain';
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
import type { CertificadoDetailEntity } from '../lib/multisiteSampling';

export interface NormaViewState {
  selectedNormaId: string | null;
  activeChildTab: 'acreditacion' | 'requisitos' | 'certificados';
  query: string;
  selectedStatus: string;
  selectedScheme: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isAddAccreditationModalOpen: boolean;
  inspectingClauseId: string | null;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface NormaViewProps {
  profile: UserProfile;
  state: NormaViewState;
  normas: NormaEntity[];
  acreditaciones: AcreditacionNormaIaf[];
  organismos: OrganismoAcreditacion[];
  requisitos: RequisitoLtree[];
  sectores?: SectorIafEntity[];
  certificados?: CertificadoDetailEntity[];
  loading?: boolean;
}

export function renderNormaView(props: NormaViewProps): string {
  const {
    profile,
    state,
    normas,
    acreditaciones,
    organismos,
    requisitos,
    sectores = [],
    certificados = [],
    loading,
  } = props;

  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';

  // If a specific Norma is selected, render the Standardized 3-Zone Detail Page
  if (state.selectedNormaId) {
    const selectedNorma = normas.find((n) => n.id === state.selectedNormaId) || normas[0];
    if (selectedNorma) {
      return renderNormaDetailPage({
        profile,
        norma: selectedNorma,
        activeTab: state.activeChildTab,
        acreditaciones: acreditaciones.filter((a) => a.id_norma === selectedNorma.id || a.norma_codigo === selectedNorma.codigo),
        organismos,
        requisitos: requisitos.filter((r) => r.id_norma === selectedNorma.id || r.norma_codigo === selectedNorma.codigo),
        sectores,
        certificados: certificados.filter(
          (c) =>
            c.id_norma === selectedNorma.id ||
            c.norma_codigo.toLowerCase() === selectedNorma.codigo.toLowerCase()
        ),
        isAddAccreditationModalOpen: state.isAddAccreditationModalOpen,
        inspectingClauseId: state.inspectingClauseId,
        isStaff,
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderNormaDirectoryView({
    profile,
    state,
    normas,
    acreditaciones,
    loading,
  });
}

/**
 * Universal Multi View Directory for Normas
 */
function renderNormaDirectoryView(params: {
  profile: UserProfile;
  state: NormaViewState;
  normas: NormaEntity[];
  acreditaciones: AcreditacionNormaIaf[];
  loading?: boolean;
}): string {
  const { state, normas, acreditaciones, loading } = params;

  const uniqueSchemes = Array.from(new Set(normas.map((n) => n.esquema))).sort();
  const uniqueStatuses = ['Vigente', 'En Revisión', 'Obsoleta'];

  const facetCategories: MultiViewFacetCategory<NormaEntity>[] = [
    {
      id: 'esquema',
      label: 'Esquema',
      options: uniqueSchemes.map((sc) => ({ value: sc, label: sc })),
      extractValues: (norma) => norma.esquema,
    },
    {
      id: 'estatus',
      label: 'Estatus',
      options: uniqueStatuses.map((st) => ({ value: st, label: st })),
      extractValues: (norma) => norma.estatus,
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        esquema:
          state.selectedScheme && state.selectedScheme !== 'ALL'
            ? new Set([state.selectedScheme])
            : new Set<string>(),
        estatus:
          state.selectedStatus && state.selectedStatus !== 'ALL'
            ? new Set([state.selectedStatus])
            : new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (norma: NormaEntity) =>
      `${norma.codigo} ${norma.titulo} ${norma.esquema} ${norma.estatus}`,
  };

  const filtered = filterRecordsWithFacets(
    normas,
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
        case 'codigo':
          return item.codigo;
        case 'titulo':
          return item.titulo;
        case 'esquema':
          return item.esquema;
        case 'estatus':
          return item.estatus;
        case 'clausulas':
          return item.clausulas_count;
        case 'acreditaciones':
          return item.acreditaciones_count;
        default:
          return (item as unknown as Record<string, unknown>)[col];
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    normas,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<NormaEntity>[] = [
    {
      id: 'codigo',
      header: 'Código',
      sortable: true,
      renderCell: (norma) => `
        <button
          type="button"
          data-action="select-norma"
          data-norma-id="${escapeHtml(norma.id)}"
          class="text-indigo-600 hover:text-indigo-800 hover:underline font-mono font-bold cursor-pointer inline-flex items-center gap-1.5"
        >
          <span aria-hidden="true">📘</span>
          <span>${escapeHtml(norma.codigo)}</span>
        </button>
      `,
    },
    {
      id: 'titulo',
      header: 'Título Oficial',
      sortable: true,
      renderCell: (norma) => `
        <span class="text-slate-700 font-medium block max-w-xs truncate" title="${escapeHtml(norma.titulo)}">
          ${escapeHtml(norma.titulo)}
        </span>
      `,
    },
    {
      id: 'esquema',
      header: 'Esquema',
      sortable: true,
      renderCell: (norma) => `
        <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          ${escapeHtml(norma.esquema)}
        </span>
      `,
    },
    {
      id: 'estatus',
      header: 'Estatus',
      sortable: true,
      align: 'center',
      renderCell: (norma) => {
        const statusMeta = formatNormaStatusBadge(norma.estatus);
        return `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta.badgeClass}">
            <span>${statusMeta.symbol}</span>
            <span>${escapeHtml(statusMeta.label)}</span>
          </span>
        `;
      },
    },
    {
      id: 'clausulas',
      header: 'Cláusulas',
      sortable: true,
      align: 'center',
      renderCell: (norma) => `
        <span class="font-mono font-semibold text-slate-700 tabular-nums">${norma.clausulas_count}</span>
      `,
    },
    {
      id: 'acreditaciones',
      header: 'Acreditaciones',
      sortable: true,
      align: 'center',
      renderCell: (norma) => {
        const normaAccreds = acreditaciones.filter(
          (a) => a.id_norma === norma.id || a.norma_codigo === norma.codigo
        );
        const orgBadges = normaAccreds
          .map(
            (a) => `
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              ${escapeHtml(a.organismo_codigo)}
            </span>
          `
          )
          .join('');
        return `
          <div class="flex items-center justify-center gap-1">
            ${orgBadges || '<span class="text-slate-400 text-[10px]">Sin acreditar</span>'}
          </div>
        `;
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      align: 'right',
      renderCell: (norma) => `
        <button
          type="button"
          data-action="select-norma"
          data-norma-id="${escapeHtml(norma.id)}"
          class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
        >
          Ver Detalle →
        </button>
      `,
    },
  ];

  const renderCard = (norma: NormaEntity): string => {
    const statusMeta = formatNormaStatusBadge(norma.estatus);
    const normaAccreds = acreditaciones.filter(
      (a) => a.id_norma === norma.id || a.norma_codigo === norma.codigo
    );

    return `
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1">
              <span class="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200 font-mono">
                ${escapeHtml(norma.codigo)}
              </span>
              <h3 class="text-sm font-bold text-slate-900 leading-snug">
                ${escapeHtml(norma.titulo)}
              </h3>
            </div>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta.badgeClass} shrink-0">
              <span>${statusMeta.symbol}</span>
              <span>${escapeHtml(statusMeta.label)}</span>
            </span>
          </div>

          <div class="text-xs text-slate-500 font-medium">
            <span class="text-slate-400">Esquema:</span> ${escapeHtml(norma.esquema)}
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
            <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <span aria-hidden="true">🌳</span>
              <span><strong>${norma.clausulas_count}</strong> Cláusulas ltree</span>
            </span>
            <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <span aria-hidden="true">🏛️</span>
              <span><strong>${normaAccreds.length}</strong> Acreditación(es)</span>
            </span>
            <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <span aria-hidden="true">📅</span>
              <span>Publicada: ${escapeHtml(norma.fecha_publicacion)}</span>
            </span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1">
            ${normaAccreds
              .map(
                (a) => `
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Acreditado por ${escapeHtml(a.organismo_nombre)}">
                  ${escapeHtml(a.organismo_codigo)}
                </span>
              `
              )
              .join('')}
          </div>
          <button
            type="button"
            data-action="select-norma"
            data-norma-id="${escapeHtml(norma.id)}"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Explorar Norma</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;
  };

  return renderUniversalTemplate({
    domainKey: 'normas',
    title: 'Normas de Sistemas de Gestión',
    subtitle:
      'Estándares internacionales certificables, acreditaciones vigentes ante organismos oficiales (ENAC, UKAS, ANAB) y árbol jerárquico de cláusulas normativas ltree.',
    entityLabel: 'normas certificables',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar por código (ISO 9001, 14001...), título o esquema...',
    searchInputId: 'normaSearchInput',
    clearSearchBtnId: 'clearNormaSearchBtn',
    totalCount: normas.length,
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
    emptyStateTitle: 'No se encontraron normas',
    emptyStateMessage: 'No se encontraron normas que coincidan con los filtros aplicados.',
    loading,
  });
}

/**
 * Standardized 3-Zone Detail Page for a Single Norma
 */
function renderNormaDetailPage(params: {
  profile: UserProfile;
  norma: NormaEntity;
  activeTab: 'acreditacion' | 'requisitos' | 'certificados';
  acreditaciones: AcreditacionNormaIaf[];
  organismos: OrganismoAcreditacion[];
  requisitos: RequisitoLtree[];
  sectores: SectorIafEntity[];
  certificados: CertificadoDetailEntity[];
  isAddAccreditationModalOpen: boolean;
  inspectingClauseId: string | null;
  isStaff: boolean;
}): string {
  const {
    norma,
    activeTab,
    acreditaciones,
    organismos,
    requisitos,
    sectores,
    certificados,
    isAddAccreditationModalOpen,
    inspectingClauseId,
    isStaff,
  } = params;

  const statusMeta = formatNormaStatusBadge(norma.estatus);
  const inspectingClause = inspectingClauseId
    ? requisitos.find((r) => r.id === inspectingClauseId)
    : null;

  // Tab 1: Acreditación Content (List-only table)
  const tabAcreditacionHtml = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Alcances de Acreditación Oficial</h3>
          <p class="text-xs text-slate-500">
            Acreditaciones concedidas por organismos reconocidos internacionalmente bajo ISO/IEC 17021-1
          </p>
        </div>
        ${
          isStaff
            ? `
              <button
                type="button"
                id="openNewAccreditationModalBtn"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>Nueva Acreditación</span>
              </button>
            `
            : ''
        }
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">Organismo</th>
              <th class="py-3 px-4">N° Acreditación</th>
              <th class="py-3 px-4">Sector IAF Amparado</th>
              <th class="py-3 px-4">Período de Validez</th>
              <th class="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              acreditaciones.length === 0
                ? `
                  <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400 text-xs italic">
                      No hay acreditaciones registradas para esta norma.
                    </td>
                  </tr>
                `
                : acreditaciones
                    .map((acc) => {
                      const accStatus = formatAcreditacionStatusBadge(acc.estatus);
                      return `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4">
                            <div class="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>🏛️</span>
                              <span>${escapeHtml(acc.organismo_nombre)}</span>
                              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                                ${escapeHtml(acc.organismo_codigo)}
                              </span>
                            </div>
                            <div class="text-[11px] text-slate-400">País: ${escapeHtml(acc.organismo_pais)}</div>
                          </td>
                          <td class="py-3 px-4 font-mono font-bold text-slate-800">
                            <button
                              type="button"
                              data-action="select-accreditation"
                              data-accreditation-id="${escapeHtml(acc.id)}"
                              class="text-indigo-700 hover:text-indigo-900 hover:underline font-mono font-bold cursor-pointer"
                            >
                              ${escapeHtml(acc.numero_acreditacion)}
                            </button>
                          </td>
                          <td class="py-3 px-4 text-slate-700">
                            ${
                              acc.sector_iaf_numero
                                ? `
                                  <button
                                    type="button"
                                    data-action="view-iaf-from-auditor"
                                    data-sector-number="${acc.sector_iaf_numero}"
                                    class="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer text-left"
                                  >
                                    Sector IAF ${acc.sector_iaf_numero}
                                  </button>
                                  <div class="text-[11px] text-slate-500 max-w-xs truncate" title="${escapeHtml(acc.sector_iaf_descripcion || '')}">
                                    ${escapeHtml(acc.sector_iaf_descripcion || '')}
                                  </div>
                                `
                                : `<span class="text-slate-400 italic">Multisectorial</span>`
                            }
                          </td>
                          <td class="py-3 px-4 font-mono text-[11px] text-slate-600">
                            <div>Concesión: <strong class="text-slate-800">${escapeHtml(acc.fecha_concesion)}</strong></div>
                            <div>Vencimiento: <strong class="text-slate-800">${escapeHtml(acc.fecha_vencimiento || 'Indefinida')}</strong></div>
                          </td>
                          <td class="py-3 px-4 text-center">
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

  // Tab 2: Requisitos Content (PostgreSQL ltree)
  const tabRequisitosHtml = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Árbol Jerárquico de Cláusulas (ltree)</h3>
          <p class="text-xs text-slate-500">
            Estructura normativa de alto nivel con propagación de cobertura y rutas materializadas
          </p>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
          PostgreSQL ltree · ${requisitos.length} Cláusulas
        </span>
      </div>

      <div class="border border-slate-200 rounded-xl bg-white overflow-hidden divide-y divide-slate-100">
        ${
          requisitos.length === 0
            ? `
              <div class="py-8 text-center text-slate-400 text-xs italic">
                No hay requisitos normativos registrados para esta norma.
              </div>
            `
            : requisitos
                .map((req) => {
                  const indent = calculateLtreeIndentation(req.ruta_materializada, req.codigo);
                  const isMain = indent.isParent;

                  return `
                    <div
                      class="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isMain ? 'bg-slate-50/40 font-semibold' : ''
                      }"
                      style="padding-left: ${Math.max(16, 16 + indent.indentPx)}px;"
                    >
                      <div class="flex items-start gap-3 min-w-0">
                        <span class="font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isMain
                            ? 'bg-slate-900 text-white'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        } shrink-0">
                          ${escapeHtml(req.codigo)}
                        </span>
                        <div class="space-y-0.5 min-w-0">
                          <div class="text-xs font-bold text-slate-900 truncate">
                            ${escapeHtml(req.titulo || `Cláusula ${req.codigo}`)}
                          </div>
                          ${
                            req.descripcion
                              ? `<p class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(req.descripcion)}</p>`
                              : ''
                          }
                        </div>
                      </div>

                      <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span class="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Ruta ltree">
                          ${escapeHtml(req.ruta_materializada)}
                        </span>
                        <button
                          type="button"
                          data-action="inspect-clause"
                          data-clause-id="${escapeHtml(req.id)}"
                          class="px-2.5 py-1 rounded text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          🔍 Inspeccionar
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>
    </div>
  `;

  // Tab 3: Certificados emitidos bajo esta Norma (List-only table)
  const tabCertificadosHtml = `
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Certificados Emitidos bajo ${escapeHtml(norma.codigo)}</h3>
        <p class="text-xs text-slate-500">
          Organizaciones certificadas y estado vigente bajo este estándar internacional.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">N° Certificado</th>
              <th class="py-3 px-4">Organización Cliente</th>
              <th class="py-3 px-4">Sector IAF</th>
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
                      No hay certificados registrados para esta norma.
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
                        <td class="py-3 px-4 text-slate-700 whitespace-nowrap">
                          Sector IAF ${c.sector_iaf}
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

  // Render Modal for Clause Inspection if active
  const inspectClauseModalHtml = inspectingClause
    ? `
      <div id="clauseInspectionBackdrop" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-in fade-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">🔍</span>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  Cláusula ${escapeHtml(inspectingClause.codigo)}
                </h3>
                <p class="text-[11px] text-slate-500">${escapeHtml(norma.codigo)}</p>
              </div>
            </div>
            <button
              type="button"
              id="closeClauseInspectBtn"
              class="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div class="p-6 space-y-4 text-xs">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Título de la Cláusula</span>
              <p class="text-sm font-bold text-slate-900 mt-0.5">${escapeHtml(inspectingClause.titulo || inspectingClause.codigo)}</p>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción & Alcance de Auditoría</span>
              <p class="text-slate-700 font-medium mt-1 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                ${escapeHtml(inspectingClause.descripcion || 'Sin descripción detallada.')}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span class="text-[10px] font-bold uppercase text-slate-400">Ruta ltree</span>
                <p class="font-mono text-xs font-bold text-indigo-700 mt-0.5">${escapeHtml(inspectingClause.ruta_materializada)}</p>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span class="text-[10px] font-bold uppercase text-slate-400">Nivel Jerárquico</span>
                <p class="text-xs font-bold text-slate-800 mt-0.5">Nivel ${inspectingClause.nivel} (${inspectingClause.es_padre ? 'Principal' : 'Sub-requisito'})</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              type="button"
              id="closeClauseInspectFooterBtn"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-white cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `
    : '';

  // Render Modal for Adding New Accreditation
  const newAccredModalHtml = isAddAccreditationModalOpen
    ? `
      <div id="newAccreditationBackdrop" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏛️</span>
              <h3 class="text-sm font-bold text-slate-900">Registrar Nueva Acreditación</h3>
            </div>
            <button type="button" id="closeNewAccredModalBtn" class="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕
            </button>
          </div>
          <form id="newAccreditationForm" class="p-6 space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Norma</label>
              <input type="text" disabled value="${escapeHtml(norma.codigo)} — ${escapeHtml(norma.titulo)}" class="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-600 font-medium" />
              <input type="hidden" name="id_norma" value="${escapeHtml(norma.id)}" />
            </div>
            <div>
              <label for="accredOrganismoSelect" class="block font-bold text-slate-700 mb-1">Organismo de Acreditación *</label>
              <select id="accredOrganismoSelect" name="id_organismo" required class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600">
                ${organismos
                  .map(
                    (org) => `
                    <option value="${escapeHtml(org.id)}">
                      ${escapeHtml(org.nombre)} (${escapeHtml(org.codigo)} - ${escapeHtml(org.pais)})
                    </option>
                  `
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label for="accredNumeroInput" class="block font-bold text-slate-700 mb-1">Número de Acreditación *</label>
              <input id="accredNumeroInput" name="numero_acreditacion" type="text" required placeholder="Ej. 01/C-SC001 o UKAS-EMS-009" class="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono focus:ring-1 focus:ring-indigo-600" />
            </div>
            <div>
              <label for="accredSectorSelect" class="block font-bold text-slate-700 mb-1">Sector IAF Amparado</label>
              <select id="accredSectorSelect" name="id_sector_iaf" class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600">
                <option value="">Multisectorial / Todos los sectores</option>
                ${sectores
                  .map(
                    (sec) => `
                    <option value="${escapeHtml(sec.id)}">
                      Sector IAF ${sec.sector} — ${escapeHtml(sec.descripcion)}
                    </option>
                  `
                  )
                  .join('')}
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="accredFechaConcesion" class="block font-bold text-slate-700 mb-1">Fecha Concesión *</label>
                <input id="accredFechaConcesion" name="fecha_concesion" type="date" required value="${new Date().toISOString().slice(0, 10)}" class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600" />
              </div>
              <div>
                <label for="accredFechaVencimiento" class="block font-bold text-slate-700 mb-1">Fecha Vencimiento</label>
                <input id="accredFechaVencimiento" name="fecha_vencimiento" type="date" class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600" />
              </div>
            </div>
            <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" id="cancelNewAccredModalBtn" class="px-3.5 py-2 rounded-lg font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" class="px-4 py-2 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer">
                Guardar Acreditación
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    : '';

  return renderDetailPageTemplate({
    entityType: 'Norma de Sistema de Gestión',
    entitySymbol: '📘',
    title: norma.titulo,
    eyebrowCode: norma.codigo,
    subtitle: `Esquema: ${norma.esquema}`,
    statusBadge: {
      label: statusMeta.label,
      badgeClass: statusMeta.badgeClass,
      symbol: statusMeta.symbol,
    },
    backButton: {
      label: 'Volver al Catálogo de Normas',
      nav: 'extra',
      subview: 'standards',
      action: 'back-to-normas-list',
    },
    parents: [],
    tableName: 'norma',
    recordId: norma.id,
    attributes: [
      { label: 'Código Canónico', value: norma.codigo, isMono: true },
      { label: 'Esquema de Certificación', value: norma.esquema },
      { label: 'Fecha de Publicación Oficial', value: norma.fecha_publicacion, isMono: true },
      { label: 'Cláusulas en ltree', value: `${requisitos.length} Requisitos Estructurados` },
    ],
    childTabs: [
      { id: 'acreditacion', label: 'Acreditaciones', symbol: '🏛️', count: acreditaciones.length },
      { id: 'requisitos', label: 'Requisitos (ltree)', symbol: '🌳', count: requisitos.length },
      { id: 'certificados', label: 'Certificados', symbol: '📜', count: certificados.length },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-norma-tab',
    renderChildTabContent: (tabId) => {
      if (tabId === 'requisitos') return tabRequisitosHtml;
      if (tabId === 'certificados') return tabCertificadosHtml;
      return tabAcreditacionHtml;
    },
    modalsHtml: `${inspectClauseModalHtml}${newAccredModalHtml}`,
  });
}
