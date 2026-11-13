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
  loading?: boolean;
}

export function renderMetodologiaAuditoriaView(props: MetodologiaAuditoriaViewProps): string {
  const { state, metodologiasList } = props;

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
        allMetodologias: metodologiasList,
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
  allMetodologias: MetodologiaAuditoriaCatalogItem[];
}): string {
  const { item } = params;

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar (Back to Metodologias List + Changelog Trigger) -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-action="back-to-metodologia-list"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver al Catálogo de Metodologías</span>
        </button>

        <!-- Top-Right Changelog Trigger [🕒 Historial de Cambios] -->
        <button
          type="button"
          data-action="open-changelog"
          data-table-name="metodologia_auditoria"
          data-record-id="${escapeHtml(item.id)}"
          data-entity-name="Metodología ${escapeHtml(item.metodologia)}"
          title="Ver registro cronológico de auditoría forense para esta metodología"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <span aria-hidden="true">🕒</span>
          <span>Historial de Cambios</span>
        </button>
      </div>

      <!-- Zone 1: Main Entity Banner -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="text-3xl select-none shrink-0" aria-hidden="true">🌐</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                METODOLOGÍA CANÓNICA (ISO 19011 / IAF MD 4)
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate font-mono">
                ${escapeHtml(item.metodologia)}
              </h1>
              <p class="text-xs text-slate-600 font-medium">
                ${escapeHtml(item.descripcion)}
              </p>
            </div>
          </div>

          <div class="self-start sm:self-auto shrink-0">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold border bg-teal-50 text-teal-800 border-teal-200">
              <span>✓</span>
              <span>NORMALIZADA</span>
            </span>
          </div>
        </div>
      </header>

      <!-- Zone 2: Visual Separator -->
      <div class="border-t border-slate-200/60 my-1"></div>

      <!-- Zone 3: Direct Record Attributes -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Atributos y Parámetros Operacionales
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modalidad de Ejecución</div>
            <div class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.metodologia)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Normativa de Referencia</div>
            <div class="text-xs font-bold text-indigo-700">ISO 19011:2018 / IAF MD 4</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auditorías Realizadas</div>
            <div class="text-xs font-bold text-slate-900">${item.usage_count} Eventos Ejecutados</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Protocolo TIC Requerido</div>
            <p class="text-xs text-slate-700 font-medium leading-relaxed">${escapeHtml(item.protocolo_tic)}</p>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reglas de Muestreo de Evidencias</div>
            <p class="text-xs text-slate-700 font-medium leading-relaxed">${escapeHtml(item.regla_muestreo)}</p>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seguridad & Confidencialidad</div>
            <p class="text-xs text-slate-700 font-medium leading-relaxed">${escapeHtml(item.seguridad_confidencialidad)}</p>
          </div>
        </div>
      </section>
    </div>
  `;
}
