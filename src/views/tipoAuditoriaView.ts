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
import { renderDetailPageTemplate } from './detailTemplate';
import type { ProgramacionAuditEntity } from '../lib/auditExecution';
import {
  canArchiveRecord,
  extractUniversalArchiveProps,
  renderArchivarButtonHtml,
  type ArchiveMultiViewConfig,
} from '../lib/archiveGovernance';

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
  audits?: ProgramacionAuditEntity[];
  loading?: boolean;
  archiveConfig?: ArchiveMultiViewConfig;
}

export function renderTipoAuditoriaView(props: TipoAuditoriaViewProps): string {
  const { profile, state, tiposList, audits = [], archiveConfig } = props;

  // If a specific audit type is selected, render its detail page
  if (state.selectedTipoId) {
    const selectedItem =
      tiposList.find((t) => t.id === state.selectedTipoId || t.tipo.toLowerCase() === state.selectedTipoId?.toLowerCase()) ||
      tiposList[0];

    if (selectedItem) {
      return renderTipoDetailPage({
        profile,
        item: selectedItem,
        audits: audits.filter(
          (a) => a.tipo_auditoria.toLowerCase() === selectedItem.tipo.toLowerCase()
        ),
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderTipoDirectoryView({
    state,
    tiposList,
    loading: props.loading,
    archiveConfig,
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
  archiveConfig?: ArchiveMultiViewConfig;
}): string {
  const { state, tiposList, loading, archiveConfig } = params;

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
        <span class="text-slate-600 block max-w-sm xl:max-w-xl">${escapeHtml(item.descripcion)}</span>
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
    ...extractUniversalArchiveProps(archiveConfig, 'tipos'),
  });
}

function renderTipoDetailPage(params: {
  profile: UserProfile;
  item: TipoAuditoriaCatalogItem;
  audits: ProgramacionAuditEntity[];
}): string {
  const { profile, item, audits } = params;

  const tabAuditoriasHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <th class="py-3 px-4">Código Auditoría</th>
            <th class="py-3 px-4">Organización</th>
            <th class="py-3 px-4">Norma</th>
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
                    No hay auditorías programadas bajo la modalidad "${escapeHtml(item.tipo)}".
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
                        <td class="py-3 px-4 text-slate-700">${escapeHtml(a.norma_codigo)}</td>
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
    entityType: 'Modalidad Canónica de Auditoría',
    entitySymbol: '📑',
    title: item.tipo,
    subtitle: item.descripcion,
    statusBadge: {
      label: item.etapa_ciclo,
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      symbol: '🔄',
    },
    backButton: {
      label: 'Volver al Catálogo de Tipos',
      nav: 'extra',
      subview: 'tipos',
      action: 'back-to-tipo-list',
    },
    parents: [],
    recordActionsHtml: canArchiveRecord(profile)
      ? renderArchivarButtonHtml({
          tableName: 'tipo_auditoria',
          recordId: item.id,
          entityLabel: 'Tipo de Auditoría',
          recordTitle: item.tipo,
          recordSubtitle: item.etapa_ciclo,
        })
      : '',
    tableName: 'tipo_auditoria',
    recordId: item.id,
    attributes: [
      { label: 'Modalidad Oficial', value: item.tipo, isMono: true },
      { label: 'Etapa en Ciclo Trienal', value: item.etapa_ciclo },
      { label: 'Eventos en el Sistema', value: `${item.usage_count} Auditorías Registradas` },
      { label: 'Fórmula de Duración (IAF MD 5)', value: item.duracion_formula },
      { label: 'Requisitos de Reporte', value: item.reporte_requerido, colSpanFull: true },
    ],
    childTabs: [
      { id: 'auditorias', label: 'Auditorías Vinculadas', symbol: '🗓️', count: audits.length },
    ],
    activeChildTabId: 'auditorias',
    childTabAttrName: 'data-tipo-tab',
    renderChildTabContent: () => tabAuditoriasHtml,
  });
}
