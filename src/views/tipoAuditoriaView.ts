import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { TipoAuditoriaCatalogItem } from '../lib/extraDomain';
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

export interface TipoAuditoriaViewState {
  selectedTipoId: string | null;
  query: string;
  selectedCycle?: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface TipoAuditoriaViewProps {
  profile: UserProfile;
  state: TipoAuditoriaViewState;
  tiposList: TipoAuditoriaCatalogItem[];
  loading?: boolean;
}

export function renderTipoAuditoriaView(props: TipoAuditoriaViewProps): string {
  const { state, tiposList } = props;

  // If a specific audit type is selected, render its detail page
  if (state.selectedTipoId) {
    const selectedItem =
      tiposList.find((t) => t.id === state.selectedTipoId || t.tipo.toLowerCase() === state.selectedTipoId?.toLowerCase()) ||
      tiposList[0];

    if (selectedItem) {
      return renderTipoDetailPage({
        item: selectedItem,
        allTipos: tiposList,
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderTipoDirectoryView({
    state,
    tiposList,
    loading: props.loading,
  });
}

function getTipoCycleCategory(item: TipoAuditoriaCatalogItem): string {
  const stage = `${item.etapa_ciclo} ${item.tipo}`.toLowerCase();
  if (stage.includes('inicial') || stage.includes('etapa 1') || stage.includes('etapa 2')) {
    return 'Inicial';
  }
  if (stage.includes('vigilancia') || stage.includes('seguimiento')) {
    return 'Seguimiento';
  }
  if (stage.includes('recertificación') || stage.includes('recertificacion') || stage.includes('renovación') || stage.includes('renovacion')) {
    return 'Renovación';
  }
  return 'Especial';
}

function renderTipoDirectoryView(params: {
  state: TipoAuditoriaViewState;
  tiposList: TipoAuditoriaCatalogItem[];
  loading?: boolean;
}): string {
  const { state, tiposList, loading } = params;

  const facetCategories: MultiViewFacetCategory<TipoAuditoriaCatalogItem>[] = [
    {
      id: 'ciclo',
      label: 'Categoría de Ciclo',
      options: ['Inicial', 'Seguimiento', 'Renovación', 'Especial'],
      extractValues: (item) => getTipoCycleCategory(item),
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        ciclo:
          state.selectedCycle && state.selectedCycle !== 'ALL'
            ? new Set([state.selectedCycle])
            : new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (item: TipoAuditoriaCatalogItem) =>
      `${item.tipo} ${item.etapa_ciclo} ${item.descripcion} ${item.duracion_formula}`,
  };

  const filtered = filterRecordsWithFacets(
    tiposList,
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
        case 'tipo':
          return item.tipo;
        case 'etapa':
          return item.etapa_ciclo;
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
    tiposList,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<TipoAuditoriaCatalogItem>[] = [
    {
      id: 'tipo',
      header: 'Modalidad Canónica',
      sortable: true,
      renderCell: (item) => `
        <button
          type="button"
          data-action="select-tipo"
          data-tipo-id="${escapeHtml(item.id)}"
          class="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
        >
          <span class="font-mono bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-xs font-bold">
            ${escapeHtml(item.tipo)}
          </span>
        </button>
      `,
    },
    {
      id: 'etapa',
      header: 'Etapa del Ciclo Trienal',
      sortable: true,
      renderCell: (item) => `
        <span class="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
          <span aria-hidden="true">🔄</span>
          <span>${escapeHtml(item.etapa_ciclo)}</span>
        </span>
      `,
    },
    {
      id: 'descripcion',
      header: 'Propósito Normativo (ISO 17021-1)',
      sortable: true,
      renderCell: (item) => `
        <span class="text-slate-600 block max-w-sm">${escapeHtml(item.descripcion)}</span>
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
          data-action="select-tipo"
          data-tipo-id="${escapeHtml(item.id)}"
          class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
        >
          Ver Detalle →
        </button>
      `,
    },
  ];

  const renderCard = (item: TipoAuditoriaCatalogItem): string => {
    return `
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded text-xs font-bold">
              ${escapeHtml(item.tipo)}
            </span>
            <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              ISO 17021-1
            </span>
          </div>
          <div class="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <span aria-hidden="true">🔄</span>
            <span>${escapeHtml(item.etapa_ciclo)}</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed font-medium">
            ${escapeHtml(item.descripcion)}
          </p>
          <div class="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <strong class="text-slate-700">Duración:</strong> ${escapeHtml(item.duracion_formula)}
          </div>
        </div>
        <div class="pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
          <span class="font-mono text-slate-500 font-semibold tabular-nums">${item.usage_count} eventos</span>
          <button
            type="button"
            data-action="select-tipo"
            data-tipo-id="${escapeHtml(item.id)}"
            class="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Reglas de Ciclo →
          </button>
        </div>
      </div>
    `;
  };

  return renderUniversalTemplate({
    domainKey: 'tipos',
    title: 'Tipos de Auditoría de Certificación',
    subtitle:
      'Las 9 modalidades canónicas reguladas por ISO/IEC 17021-1:2015 para los ciclos de certificación inicial, vigilancia anual y renovación trienal.',
    entityLabel: 'tipos de auditoría',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar tipo (Etapa 1, Vigilancia, Renovación...)...',
    searchInputId: 'tipoSearchInput',
    clearSearchBtnId: 'clearTipoSearchBtn',
    totalCount: tiposList.length,
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
    emptyStateTitle: 'No se encontraron tipos de auditoría',
    emptyStateMessage: 'No se encontraron tipos de auditoría que coincidan con los filtros aplicados.',
    loading,
  });
}

function renderTipoDetailPage(params: {
  item: TipoAuditoriaCatalogItem;
  allTipos: TipoAuditoriaCatalogItem[];
}): string {
  const { item } = params;

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar (Back to Tipos List + Changelog Trigger) -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-action="back-to-tipo-list"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver al Catálogo de Tipos</span>
        </button>

        <!-- Top-Right Changelog Trigger [🕒 Historial de Cambios] -->
        <button
          type="button"
          data-action="open-changelog"
          data-table-name="tipo_auditoria"
          data-record-id="${escapeHtml(item.id)}"
          data-entity-name="Tipo de Auditoría ${escapeHtml(item.tipo)}"
          title="Ver registro cronológico de auditoría forense para este tipo de auditoría"
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
            <span class="text-3xl select-none shrink-0" aria-hidden="true">📑</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                MODALIDAD CANÓNICA DE AUDITORÍA
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate font-mono">
                ${escapeHtml(item.tipo)}
              </h1>
              <p class="text-xs text-slate-600 font-medium">
                ${escapeHtml(item.descripcion)}
              </p>
            </div>
          </div>

          <div class="self-start sm:self-auto shrink-0">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border bg-indigo-50 text-indigo-800 border-indigo-200">
              <span>🔄</span>
              <span>${escapeHtml(item.etapa_ciclo)}</span>
            </span>
          </div>
        </div>
      </header>

      <!-- Zone 2: Visual Separator -->
      <div class="border-t border-slate-200/60 my-1"></div>

      <!-- Zone 3: Direct Record Attributes -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Parámetros Normativos y Reglas del Ciclo de Vida
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modalidad Oficial</div>
            <div class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.tipo)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Etapa en Ciclo Trienal</div>
            <div class="text-xs font-bold text-indigo-700">${escapeHtml(item.etapa_ciclo)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eventos en el Sistema</div>
            <div class="text-xs font-bold text-slate-900">${item.usage_count} Auditorías Registradas</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fórmula de Duración Recomendada (IAF MD 5)</div>
            <p class="text-xs text-slate-700 font-medium leading-relaxed">${escapeHtml(item.duracion_formula)}</p>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requisitos de Reporte e Informes</div>
            <p class="text-xs text-slate-700 font-medium leading-relaxed">${escapeHtml(item.reporte_requerido)}</p>
          </div>
        </div>
      </section>
    </div>
  `;
}
