import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { EstatusCatalogItem } from '../lib/extraDomain';
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

export interface EstatusViewState {
  selectedEstatusId: string | null;
  query: string;
  selectedCategory?: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface EstatusViewProps {
  profile: UserProfile;
  state: EstatusViewState;
  estatusList: EstatusCatalogItem[];
  loading?: boolean;
}

export function renderEstatusView(props: EstatusViewProps): string {
  const { state, estatusList } = props;

  // If a specific status is selected, render its detail page
  if (state.selectedEstatusId) {
    const selectedItem =
      estatusList.find((e) => e.id === state.selectedEstatusId || e.estatus.toLowerCase() === state.selectedEstatusId?.toLowerCase()) ||
      estatusList[0];

    if (selectedItem) {
      return renderEstatusDetailPage({
        item: selectedItem,
        allStatuses: estatusList,
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderEstatusDirectoryView({
    state,
    estatusList,
    loading: props.loading,
  });
}

function getStatusBadgeClasses(colorToken: string): string {
  switch (colorToken) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'sky':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'amber':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'rose':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'indigo':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'teal':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'orange':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'slate':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

function getEstatusOperationalUsage(item: EstatusCatalogItem): string {
  if (item.usage_count === 0) return 'SIN_USO';
  if (item.categoria_aplicable.toLowerCase().includes('certificado')) {
    return 'EN_CERTIFICADOS';
  }
  return 'EN_AUDITORIAS';
}

function renderEstatusDirectoryView(params: {
  state: EstatusViewState;
  estatusList: EstatusCatalogItem[];
  loading?: boolean;
}): string {
  const { state, estatusList, loading } = params;

  const facetCategories: MultiViewFacetCategory<EstatusCatalogItem>[] = [
    {
      id: 'uso',
      label: 'Uso Operativo',
      options: [
        { value: 'EN_CERTIFICADOS', label: 'En Certificados' },
        { value: 'EN_AUDITORIAS', label: 'En Auditorías / Gestión' },
        { value: 'SIN_USO', label: 'Sin Uso' },
      ],
      extractValues: (item) => getEstatusOperationalUsage(item),
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        uso:
          state.selectedCategory && state.selectedCategory !== 'ALL'
            ? new Set([
                state.selectedCategory.toLowerCase().includes('certificado')
                  ? 'EN_CERTIFICADOS'
                  : 'EN_AUDITORIAS',
              ])
            : new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (item: EstatusCatalogItem) =>
      `${item.estatus} ${item.descripcion} ${item.categoria_aplicable}`,
  };

  const filtered = filterRecordsWithFacets(
    estatusList,
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
        case 'estatus':
          return item.estatus;
        case 'descripcion':
          return item.descripcion;
        case 'categoria':
          return item.categoria_aplicable;
        case 'usage':
          return item.usage_count;
        default:
          return (item as unknown as Record<string, unknown>)[col];
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    estatusList,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<EstatusCatalogItem>[] = [
    {
      id: 'estatus',
      header: 'Estatus Canónico',
      sortable: true,
      renderCell: (item) => {
        const badgeClass = getStatusBadgeClasses(item.color_token);
        return `
          <button
            type="button"
            data-action="select-estatus"
            data-estatus-id="${escapeHtml(item.id)}"
            class="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
          >
            <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${badgeClass}">
              ${escapeHtml(item.estatus)}
            </span>
          </button>
        `;
      },
    },
    {
      id: 'descripcion',
      header: 'Significado y Regla Operativa',
      sortable: true,
      renderCell: (item) => `
        <span class="text-slate-700 font-medium">${escapeHtml(item.descripcion)}</span>
      `,
    },
    {
      id: 'categoria',
      header: 'Ámbito de Aplicación',
      sortable: true,
      renderCell: (item) => `
        <span class="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
          ${escapeHtml(item.categoria_aplicable)}
        </span>
      `,
    },
    {
      id: 'usage',
      header: 'Métricas de Uso',
      sortable: true,
      align: 'center',
      renderCell: (item) => `
        <span class="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200 tabular-nums">
          <span aria-hidden="true">📊</span>
          <span>${item.usage_count} registros</span>
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
          data-action="select-estatus"
          data-estatus-id="${escapeHtml(item.id)}"
          class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
        >
          Ver Detalle →
        </button>
      `,
    },
  ];

  const renderCard = (item: EstatusCatalogItem): string => {
    const badgeClass = getStatusBadgeClasses(item.color_token);
    return `
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}">
              ${escapeHtml(item.estatus)}
            </span>
            <span class="text-[10px] font-mono text-slate-400">Canónico</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed font-medium">
            ${escapeHtml(item.descripcion)}
          </p>
          <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <strong class="text-slate-600">Ámbito:</strong> ${escapeHtml(item.categoria_aplicable)}
          </div>
        </div>
        <div class="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
          <span class="font-mono text-slate-500 font-semibold tabular-nums">${item.usage_count} usos</span>
          <button
            type="button"
            data-action="select-estatus"
            data-estatus-id="${escapeHtml(item.id)}"
            class="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Detalle →
          </button>
        </div>
      </div>
    `;
  };

  return renderUniversalTemplate({
    domainKey: 'estatus',
    title: 'Estatus Canónicos del Sistema',
    subtitle:
      'Padrón estandarizado de los 8 estados del ciclo de vida de auditorías, certificados, no conformidades y organizaciones cliente.',
    entityLabel: 'estatus operativos',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar estatus (Activo, Suspendido, En Ejecución...)...',
    searchInputId: 'estatusSearchInput',
    clearSearchBtnId: 'clearEstatusSearchBtn',
    totalCount: estatusList.length,
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
    emptyStateTitle: 'No se encontraron estatus',
    emptyStateMessage: 'No se encontraron estatus que coincidan con los filtros aplicados.',
    loading,
  });
}

function renderEstatusDetailPage(params: {
  item: EstatusCatalogItem;
  allStatuses: EstatusCatalogItem[];
}): string {
  const { item } = params;
  const badgeClass = getStatusBadgeClasses(item.color_token);

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar (Back to Estatus List + Changelog Trigger) -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-action="back-to-estatus-list"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver al Catálogo de Estatus</span>
        </button>

        <!-- Top-Right Changelog Trigger [🕒 Historial de Cambios] -->
        <button
          type="button"
          data-action="open-changelog"
          data-table-name="estatus"
          data-record-id="${escapeHtml(item.id)}"
          data-entity-name="Estatus ${escapeHtml(item.estatus)}"
          title="Ver registro cronológico de auditoría forense para este estatus"
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
            <span class="text-3xl select-none shrink-0" aria-hidden="true">🏷️</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                ESTATUS CANÓNICO TITLE-CASE
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                ${escapeHtml(item.estatus)}
              </h1>
              <p class="text-xs text-slate-600 font-medium">
                ${escapeHtml(item.descripcion)}
              </p>
            </div>
          </div>

          <div class="self-start sm:self-auto shrink-0">
            <span class="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold border ${badgeClass}">
              ${escapeHtml(item.estatus)}
            </span>
          </div>
        </div>
      </header>

      <!-- Zone 2: Visual Separator -->
      <div class="border-t border-slate-200/60 my-1"></div>

      <!-- Zone 3: Direct Record Attributes -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Atributos Directos del Estatus
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Denominación Canónica</div>
            <div class="text-xs font-bold text-slate-900">${escapeHtml(item.estatus)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ámbitos de Aplicación</div>
            <div class="text-xs font-semibold text-indigo-700">${escapeHtml(item.categoria_aplicable)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Token Visual de Color</div>
            <div class="text-xs font-mono font-semibold text-slate-800">${escapeHtml(item.color_token)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registros en el Sistema</div>
            <div class="text-xs font-bold text-slate-900">${item.usage_count} Entidades Asignadas</div>
          </div>
        </div>
      </section>

      <!-- Zone 4: Usage and Normative Context -->
      <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">Reglas Normativas del Ciclo de Vida</h3>
        <p class="text-xs text-slate-600 leading-relaxed">
          En conformidad con <strong>ISO/IEC 17021-1:2015 cláusulas 9.6 y 9.7</strong>, este estatus forma parte del ciclo de vida controlado de la certificación. Los cambios a este estatus requieren registro auditable en <code>public.audit_log</code> con trazabilidad forense del actor responsable y justificación técnica correspondiente.
        </p>
      </section>
    </div>
  `;
}
