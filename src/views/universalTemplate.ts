import { escapeHtml } from '../lib/html';
import {
  renderSortIndicator,
  type ColumnDefinition,
  type FacetGroup,
  type SortState,
} from '../lib/universalTemplate';
import type { ViewMode } from '../lib/searchControls';
import type { ActorDirectoryEntry } from '../lib/auditLog';
import {
  formatArchivedActorDisplay,
  formatArchivedDateDisplay,
  getArchiveTableDisplayLabel,
  type ArchivedItemEntry,
} from '../lib/archiveGovernance';
import { getUniversalCardGridClass } from '../lib/layout';

export interface UniversalTemplateProps<T> {
  domainKey?: string;
  title: string;
  subtitle?: string;
  entityLabel?: string;
  searchQuery: string;
  searchPlaceholder?: string;
  searchInputId?: string;
  clearSearchBtnId?: string;
  totalCount: number;
  filteredCount: number;
  viewMode: ViewMode;
  isSidebarOpen?: boolean;
  sortState?: SortState;
  facetGroups: FacetGroup[];
  items: T[];
  columns: ColumnDefinition<T>[];
  renderCard: (item: T) => string;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  actionsHtml?: string;
  inlineFormHtml?: string;
  loading?: boolean;
  loadingMessage?: string;
  canInspectArchived?: boolean;
  showArchived?: boolean;
  archivedItems?: ArchivedItemEntry[];
  actorDirectory?: Record<string, ActorDirectoryEntry>;
  restoringId?: string | null;
}

export function renderUniversalTemplate<T>(props: UniversalTemplateProps<T>): string {
  const {
    domainKey,
    title,
    subtitle,
    entityLabel = 'registros',
    searchQuery,
    searchPlaceholder = "Buscar por código, nombre, RIF... (Presione '/' para enfocar)",
    searchInputId = 'universalSearchInput',
    clearSearchBtnId = 'clearSearchBtn',
    totalCount,
    filteredCount,
    viewMode,
    isSidebarOpen = true,
    sortState = { column: null, direction: 'none' },
    facetGroups,
    items,
    columns,
    renderCard,
    emptyStateTitle = 'No se encontraron registros',
    emptyStateMessage = 'Intente ajustar el término de búsqueda o restablecer los filtros de la barra lateral.',
    actionsHtml = '',
    inlineFormHtml = '',
    loading = false,
    loadingMessage = 'Cargando registros...',
    canInspectArchived = false,
    showArchived = false,
    archivedItems = [],
    actorDirectory,
    restoringId = null,
  } = props;

  const activeFacetCount = facetGroups.reduce(
    (sum, group) => sum + group.options.filter((opt) => opt.selected && opt.value !== 'ALL').length,
    0
  );
  const hasSearchQuery = searchQuery.length > 0;
  const isFiltered = Boolean(searchQuery.trim()) || activeFacetCount > 0;

  // 1. Collapsible Facet Sidebar HTML (<aside>)
  const facetSidebarHtml = `
    <aside
      id="multiViewFacetSidebar"
      aria-label="Filtros y facetas"
      aria-hidden="${isSidebarOpen ? 'false' : 'true'}"
      class="${
        isSidebarOpen
          ? 'w-full lg:w-64 xl:w-72 shrink-0 min-w-0 overflow-hidden bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-5 h-fit'
          : 'hidden'
      }"
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span aria-hidden="true">☰</span>
          <span>Filtros</span>
          ${
            activeFacetCount > 0
              ? `<span class="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">${activeFacetCount}</span>`
              : ''
          }
        </h2>
        ${
          isFiltered
            ? `
              <button
                type="button"
                data-action="reset-all"
                data-clear-filters="true"
                title="Limpiar filtros"
                class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            `
            : ''
        }
      </div>

      <div class="space-y-4">
        ${facetGroups
          .map((group) => {
            return `
              <fieldset class="min-w-0 space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                <legend class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  ${escapeHtml(group.label)}
                </legend>
                <div class="space-y-1 min-w-0">
                  ${group.options
                    .map((opt) => {
                      const isSelected = opt.selected;
                      const isZero = opt.count === 0;
                      const textToneClass = isSelected
                        ? 'text-indigo-950 font-semibold'
                        : isZero
                        ? 'text-slate-400'
                        : 'text-slate-700';
                      const countToneClass = isSelected
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : isZero
                        ? 'bg-slate-50 text-slate-400 border border-slate-100'
                        : 'bg-slate-100 text-slate-600';

                      return `
                        <label
                          title="${escapeHtml(opt.label)}"
                          class="w-full max-w-full overflow-hidden px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                            isSelected
                              ? 'bg-indigo-50/90 border border-indigo-200/80'
                              : 'border border-transparent hover:bg-slate-50'
                          }"
                        >
                          <span class="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            <input
                              type="checkbox"
                              data-facet-checkbox="true"
                              data-facet-group="${escapeHtml(group.id)}"
                              data-facet-value="${escapeHtml(opt.value)}"
                              ${isSelected ? 'checked' : ''}
                              class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                            />
                            <span class="block truncate ${textToneClass}">${escapeHtml(opt.label)}</span>
                          </span>
                          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums shrink-0 ${countToneClass}">
                            ${opt.count}
                          </span>
                        </label>
                      `;
                    })
                    .join('')}
                </div>
              </fieldset>
            `;
          })
          .join('')}
      </div>

      ${
        isFiltered
          ? `
            <div class="pt-2 border-t border-slate-100">
              <button
                type="button"
                data-action="reset-all"
                data-clear-filters="true"
                class="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Limpiar filtros
              </button>
            </div>
          `
          : ''
      }
    </aside>
  `;

  // 2. Main Data Canvas HTML (Table or Cards)
  let contentHtml = '';

  if (loading) {
    contentHtml = `
      <div class="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500 shadow-2xs">
        ${escapeHtml(loadingMessage)}
      </div>
    `;
  } else if (items.length === 0) {
    contentHtml = `
      <div class="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-2xs">
        <div class="text-3xl select-none" aria-hidden="true">🔍</div>
        <h3 class="text-sm font-bold text-slate-900">${escapeHtml(emptyStateTitle)}</h3>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          ${escapeHtml(emptyStateMessage)}
        </p>
        ${
          isFiltered
            ? `
              <div class="pt-2">
                <button
                  type="button"
                  data-action="reset-all"
                  data-clear-filters="true"
                  class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span aria-hidden="true">↺</span>
                  <span>Limpiar filtros</span>
                </button>
              </div>
            `
            : ''
        }
      </div>
    `;
  } else if (viewMode === 'list') {
    contentHtml = `
      <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600 border-collapse">
            <thead class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                ${columns
                  .map((col) => {
                    const isSorted = sortState.column === col.id;
                    const direction = isSorted ? sortState.direction : 'none';
                    const indicator = renderSortIndicator(direction);
                    const sortClass = isSorted
                      ? 'text-indigo-600 font-extrabold'
                      : 'text-slate-400 group-hover:text-slate-700';
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    if (col.sortable) {
                      return `
                        <th scope="col" class="px-3 py-2.5 select-none ${alignClass} ${col.className || ''}">
                          <button
                            type="button"
                            data-action="sort-column"
                            data-sort-col="${escapeHtml(col.id)}"
                            data-column="${escapeHtml(col.id)}"
                            title="Ordenar por ${escapeHtml(col.header)}"
                            class="group inline-flex items-center gap-1.5 text-left font-bold cursor-pointer transition-colors hover:text-indigo-600"
                          >
                            <span>${escapeHtml(col.header)}</span>
                            <span class="text-[10px] font-mono shrink-0 ${sortClass}">${indicator}</span>
                          </button>
                        </th>
                      `;
                    }

                    return `
                      <th scope="col" class="px-3 py-2.5 ${alignClass} ${col.className || ''}">
                        ${escapeHtml(col.header)}
                      </th>
                    `;
                  })
                  .join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${items
                .map((item) => {
                  return `
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      ${columns
                        .map((col) => {
                          const alignClass =
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left';
                          return `
                            <td class="px-3 py-2.5 align-middle ${alignClass} ${col.className || ''}">
                              ${col.renderCell(item)}
                            </td>
                          `;
                        })
                        .join('')}
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="${getUniversalCardGridClass(isSidebarOpen)}">
        ${items.map((item) => renderCard(item)).join('')}
      </div>
    `;
  }

  // 3. Unified Header + Controls Card + Collapsible Body Layout
  return `
    <div class="space-y-5"${domainKey ? ` data-mv-domain="${escapeHtml(domainKey)}"` : ''}>
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1 min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              ${escapeHtml(title)}
            </h1>
            ${
              subtitle
                ? `<p class="text-xs text-slate-500 max-w-3xl truncate sm:whitespace-normal">${escapeHtml(subtitle)}</p>`
                : ''
            }
          </div>

          ${actionsHtml ? `<div class="shrink-0 flex items-center gap-2">${actionsHtml}</div>` : ''}
        </div>

        ${inlineFormHtml ? `<div class="pt-3 border-t border-slate-100">${inlineFormHtml}</div>` : ''}

        <!-- Unified Controls Row: Sidebar Toggle + Single Search Input + Totalizer + [Tarjetas | Tabla] -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              id="toggleMultiViewSidebarBtn"
              data-action="toggle-sidebar"
              data-toggle-sidebar="true"
              aria-expanded="${isSidebarOpen ? 'true' : 'false'}"
              aria-controls="multiViewFacetSidebar"
              title="${isSidebarOpen ? 'Ocultar panel de filtros' : 'Mostrar panel de filtros'}"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                isSidebarOpen
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }"
            >
              <span aria-hidden="true">☰</span>
              <span>Filtros</span>
              ${
                activeFacetCount > 0
                  ? `<span class="inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 text-[10px] font-bold rounded-full tabular-nums ${
                      isSidebarOpen
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-100 text-indigo-800'
                    }">${activeFacetCount}</span>`
                  : ''
              }
            </button>

            <div class="relative flex-1 min-w-0 max-w-2xl">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                id="${escapeHtml(searchInputId)}"
                data-universal-search="true"
                autocomplete="off"
                placeholder="${escapeHtml(searchPlaceholder)}"
                value="${escapeHtml(searchQuery)}"
                aria-label="Buscar registros"
                class="w-full text-xs rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <div class="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                ${
                  hasSearchQuery
                    ? `
                      <button
                        type="button"
                        id="${escapeHtml(clearSearchBtnId)}"
                        data-action="clear-search"
                        data-clear-search="true"
                        title="Limpiar búsqueda (Esc)"
                        aria-label="Limpiar búsqueda"
                        class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    `
                    : `
                      <kbd class="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded select-none">
                        /
                      </kbd>
                    `
                }
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0">
            ${
              canInspectArchived
                ? `
                  <label
                    class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                      showArchived
                        ? 'border-slate-400 bg-slate-100 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    } text-xs font-semibold cursor-pointer transition-colors select-none whitespace-nowrap"
                  >
                    <input
                      type="checkbox"
                      id="showArchivedCheckbox"
                      data-action="toggle-show-archived"
                      ${showArchived ? 'checked' : ''}
                      class="h-3.5 w-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500 cursor-pointer"
                    />
                    <span>Mostrar Archivados</span>
                    ${
                      archivedItems.length > 0
                        ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700 tabular-nums">${archivedItems.length}</span>`
                        : ''
                    }
                  </label>
                `
                : ''
            }

            <div class="text-xs text-slate-500 font-medium tabular-nums">
              Mostrando <span class="font-bold text-slate-900 tabular-nums">${filteredCount}</span> de <span class="font-semibold text-slate-700 tabular-nums">${totalCount}</span> ${escapeHtml(entityLabel)}
            </div>

            <!-- Presentation Switcher [⊞ Tarjetas | ☰ Tabla] -->
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs" role="group" aria-label="Modo de vista">
              <button
                type="button"
                data-action="set-view-mode"
                data-view-mode="grid"
                data-mode="grid"
                aria-pressed="${viewMode === 'grid' ? 'true' : 'false'}"
                title="Vista en Tarjetas (⊞)"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">⊞</span>
                <span>Tarjetas</span>
              </button>
              <button
                type="button"
                data-action="set-view-mode"
                data-view-mode="list"
                data-mode="list"
                aria-pressed="${viewMode === 'list' ? 'true' : 'false'}"
                title="Vista en Tabla (☰)"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">☰</span>
                <span>Tabla</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Body: Collapsible Facet Sidebar + Responsive Full-Width Data Canvas -->
      <div class="flex flex-col lg:flex-row gap-6 items-start">
        ${facetSidebarHtml}
        <section class="flex-1 min-w-0 w-full space-y-4">
          ${contentHtml}
          ${
            canInspectArchived && showArchived
              ? `
                <div
                  id="archivedRecordsSection"
                  class="mt-6 rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 space-y-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-slate-200 text-slate-700">
                        Archivo Histórico
                      </span>
                      <h3 class="text-sm font-bold text-slate-800">
                        Registros Archivados
                      </h3>
                    </div>
                    <span class="text-xs font-semibold text-slate-500 tabular-nums">
                      ${archivedItems.length} ${archivedItems.length === 1 ? 'registro archivado' : 'registros archivados'}
                    </span>
                  </div>

                  ${
                    archivedItems.length === 0
                      ? `
                        <p class="text-xs text-slate-500 py-3 text-center">
                          No hay registros archivados en esta sección.
                        </p>
                      `
                      : `
                        <div class="divide-y divide-slate-200/80 rounded-lg border border-slate-200 bg-white overflow-hidden">
                          ${archivedItems
                            .map((entry) => {
                              const actorDisplay = formatArchivedActorDisplay(entry, actorDirectory);
                              const dateDisplay = formatArchivedDateDisplay(entry.deletedAt);
                              const tableLabel = getArchiveTableDisplayLabel(entry.tableName);
                              const isRestoring = restoringId === entry.id;
                              return `
                                <div
                                  data-archived-item="${escapeHtml(entry.tableName)}:${escapeHtml(entry.id)}"
                                  class="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                                >
                                  <div class="min-w-0 space-y-1">
                                    <div class="flex flex-wrap items-center gap-2">
                                      <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        ${escapeHtml(tableLabel)}
                                      </span>
                                      ${
                                        entry.code
                                          ? `<span class="font-mono text-xs font-semibold text-slate-500">${escapeHtml(entry.code)}</span>`
                                          : ''
                                      }
                                      <span class="text-sm font-semibold text-slate-700 truncate">
                                        ${escapeHtml(entry.title)}
                                      </span>
                                    </div>
                                    ${
                                      entry.subtitle
                                        ? `<p class="text-xs text-slate-500 truncate">${escapeHtml(entry.subtitle)}</p>`
                                        : ''
                                    }
                                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                      <span class="tabular-nums">Archivado: <strong class="font-semibold text-slate-600">${escapeHtml(dateDisplay)}</strong></span>
                                      <span>Por: <strong class="font-semibold text-slate-600">${escapeHtml(actorDisplay)}</strong></span>
                                      ${
                                        entry.deleteReason
                                          ? `<span class="text-slate-600 italic">Motivo: "${escapeHtml(entry.deleteReason)}"</span>`
                                          : ''
                                      }
                                    </div>
                                  </div>
                                  <div class="shrink-0">
                                    <button
                                      type="button"
                                      data-action="restore-archived-record"
                                      data-restore-table="${escapeHtml(entry.tableName)}"
                                      data-restore-id="${escapeHtml(entry.id)}"
                                      ${isRestoring ? 'disabled' : ''}
                                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      <span aria-hidden="true">↺</span>
                                      <span>${isRestoring ? 'Restaurando...' : 'Restaurar'}</span>
                                    </button>
                                  </div>
                                </div>
                              `;
                            })
                            .join('')}
                        </div>
                      `
                  }
                </div>
              `
              : ''
          }
        </section>
      </div>
    </div>
  `;
}
