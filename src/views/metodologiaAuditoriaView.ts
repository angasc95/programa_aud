import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { MetodologiaAuditoriaCatalogItem } from '../lib/extraDomain';
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
import type { ProgramacionAuditEntity } from '../lib/auditExecution';

export interface MetodologiaAuditoriaViewState {
  selectedMetodologiaId: string | null;
  query: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface MetodologiaAuditoriaViewProps {
  profile: UserProfile;
  state: MetodologiaAuditoriaViewState;
  metodologiasList: MetodologiaAuditoriaCatalogItem[];
  audits?: ProgramacionAuditEntity[];
  loading?: boolean;
}

export function renderMetodologiaAuditoriaView(props: MetodologiaAuditoriaViewProps): string {
  const { state, metodologiasList, audits = [] } = props;

  // If a specific methodology is selected, render its detail page
  if (state.selectedMetodologiaId) {
    const selectedItem =
      metodologiasList.find(
        (m) =>
          m.id === state.selectedMetodologiaId ||
          m.metodologia.toLowerCase() === state.selectedMetodologiaId?.toLowerCase()
      ) || metodologiasList[0];

    if (selectedItem) {
      return renderMetodologiaDetailPage({
        item: selectedItem,
        audits: audits.filter(
          (a) => a.metodologia.toLowerCase() === selectedItem.metodologia.toLowerCase()
        ),
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderMetodologiaDirectoryView({
    state,
    metodologiasList,
    loading: props.loading,
  });
}

function renderMetodologiaDirectoryView(params: {
  state: MetodologiaAuditoriaViewState;
  metodologiasList: MetodologiaAuditoriaCatalogItem[];
  loading?: boolean;
}): string {
  const { state, metodologiasList, loading } = params;

  const facetCategories: MultiViewFacetCategory<MetodologiaAuditoriaCatalogItem>[] = [
    {
      id: 'modalidad',
      label: 'Modalidad',
      options: ['Presencial', 'Remota', 'Mixta'],
      extractValues: (item) => item.metodologia,
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections || {
    modalidad: new Set<string>(),
  };

  const searchOptions = {
    getSearchableText: (item: MetodologiaAuditoriaCatalogItem) =>
      `${item.metodologia} ${item.descripcion} ${item.protocolo_tic} ${item.regla_muestreo}`,
  };

  const filtered = filterRecordsWithFacets(
    metodologiasList,
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
        case 'metodologia':
          return item.metodologia;
        case 'descripcion':
          return item.descripcion;
        case 'usage':
          return item.usage_count;
        default:
          return (item as unknown as Record<string, unknown>)[col];
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    metodologiasList,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<MetodologiaAuditoriaCatalogItem>[] = [
    {
      id: 'metodologia',
      header: 'Metodología',
      sortable: true,
      renderCell: (item) => `
        <button
          type="button"
          data-action="select-metodologia"
          data-metodologia-id="${escapeHtml(item.id)}"
          class="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
        >
          <span class="font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded text-xs font-bold">
            ${escapeHtml(item.metodologia)}
          </span>
        </button>
      `,
    },
    {
      id: 'descripcion',
      header: 'Descripción Técnica',
      sortable: true,
      renderCell: (item) => `
        <span class="text-slate-700 font-medium block max-w-xs">${escapeHtml(item.descripcion)}</span>
      `,
    },
    {
      id: 'protocolo',
      header: 'Protocolo TIC (IAF MD 4)',
      renderCell: (item) => `
        <span class="text-slate-600 block max-w-xs truncate" title="${escapeHtml(item.protocolo_tic)}">
          ${escapeHtml(item.protocolo_tic)}
        </span>
      `,
    },
    {
      id: 'usage',
      header: 'Auditorías',
      sortable: true,
      align: 'center',
      renderCell: (item) => `
        <span class="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200 tabular-nums">
          ${item.usage_count} ejecutadas
        </span>
      `,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      align: 'right',
      renderCell: (item) => `
        <button
          type="button"
          data-action="select-metodologia"
          data-metodologia-id="${escapeHtml(item.id)}"
          class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
        >
          Ver Protocolo →
        </button>
      `,
    },
  ];

  const renderCard = (item: MetodologiaAuditoriaCatalogItem): string => {
    return `
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded text-xs font-bold">
              ${escapeHtml(item.metodologia)}
            </span>
            <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              IAF MD 4
            </span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed font-medium">
            ${escapeHtml(item.descripcion)}
          </p>
          <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100 space-y-1">
            <div><strong class="text-slate-700">Protocolo TIC:</strong> ${escapeHtml(item.protocolo_tic)}</div>
            <div><strong class="text-slate-700">Muestreo:</strong> ${escapeHtml(item.regla_muestreo)}</div>
          </div>
        </div>
        <div class="pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
          <span class="font-mono text-slate-500 font-semibold tabular-nums">${item.usage_count} usos</span>
          <button
            type="button"
            data-action="select-metodologia"
            data-metodologia-id="${escapeHtml(item.id)}"
            class="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Detalle & TIC →
          </button>
        </div>
      </div>
    `;
  };

  return renderUniversalTemplate({
    domainKey: 'metodologias',
    title: 'Metodologías de Ejecución de Auditoría',
    subtitle:
      'Las 3 metodologías canónicas bajo ISO 19011:2018 y documento obligatorio IAF MD 4 para auditorías presenciales, remotas e híbridas.',
    entityLabel: 'metodologías',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar metodología (Presencial, Remota, Mixta)...',
    searchInputId: 'metodologiaSearchInput',
    clearSearchBtnId: 'clearMetodologiaSearchBtn',
    totalCount: metodologiasList.length,
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
    emptyStateTitle: 'No se encontraron metodologías',
    emptyStateMessage: 'No se encontraron metodologías que coincidan con los filtros aplicados.',
    loading,
  });
}

function renderMetodologiaDetailPage(params: {
  item: MetodologiaAuditoriaCatalogItem;
  audits: ProgramacionAuditEntity[];
}): string {
  const { item, audits } = params;

  const tabAuditoriasHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <th class="py-3 px-4">Código Auditoría</th>
            <th class="py-3 px-4">Organización</th>
            <th class="py-3 px-4">Modalidad</th>
            <th class="py-3 px-4">Fechas</th>
            <th class="py-3 px-4 text-center">Estatus</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${
            audits.length === 0
              ? `
                <tr>
                  <td colspan="5" class="py-8 text-center text-slate-400 text-xs italic">
                    No hay auditorías ejecutadas con metodología "${escapeHtml(item.metodologia)}".
                  </td>
                </tr>
              `
              : audits
                  .map(
                    (a) => `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            data-action="select-prog-audit"
                            data-audit-id="${escapeHtml(a.id)}"
                            class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                          >
                            🗓️ ${escapeHtml(a.codigo_auditoria)}
                          </button>
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(a.organizacion_nombre)}</td>
                        <td class="py-3 px-4 text-slate-700">${escapeHtml(a.tipo_auditoria)} · ${escapeHtml(a.norma_codigo)}</td>
                        <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          ${escapeHtml(a.fecha_inicio)} → ${escapeHtml(a.fecha_fin)}
                        </td>
                        <td class="py-3 px-4 text-center whitespace-nowrap">
                          <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            ${escapeHtml(a.estatus)}
                          </span>
                        </td>
                      </tr>
                    `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>
  `;

  return renderDetailPageTemplate({
    entityType: 'Metodología Canónica (ISO 19011 / IAF MD 4)',
    entitySymbol: '🌐',
    title: item.metodologia,
    subtitle: item.descripcion,
    statusBadge: {
      label: 'NORMALIZADA',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
      symbol: '✓',
    },
    backButton: {
      label: 'Volver al Catálogo de Metodologías',
      nav: 'extra',
      subview: 'metodologias',
      action: 'back-to-metodologia-list',
    },
    parents: [],
    tableName: 'metodologia_auditoria',
    recordId: item.id,
    attributes: [
      { label: 'Modalidad de Ejecución', value: item.metodologia, isMono: true },
      { label: 'Normativa de Referencia', value: 'ISO 19011:2018 / IAF MD 4' },
      { label: 'Auditorías Realizadas', value: `${item.usage_count} Eventos Ejecutados` },
      { label: 'Protocolo TIC Requerido', value: item.protocolo_tic },
      { label: 'Reglas de Muestreo de Evidencias', value: item.regla_muestreo },
      { label: 'Seguridad & Confidencialidad', value: item.seguridad_confidencialidad },
    ],
    childTabs: [
      { id: 'auditorias', label: 'Auditorías Vinculadas', symbol: '🗓️', count: audits.length },
    ],
    activeChildTabId: 'auditorias',
    childTabAttrName: 'data-metodologia-tab',
    renderChildTabContent: () => tabAuditoriasHtml,
  });
}
