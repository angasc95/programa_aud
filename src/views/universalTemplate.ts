import { escapeHtml } from '../lib/html';
import {
  renderSortIndicator,
  type ColumnDefinition,
  type FacetGroup,
  type SortState,
} from '../lib/universalTemplate';
import type { ViewMode } from '../lib/searchControls';

export interface UniversalTemplateProps<T> {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    symbol?: string;
  };
  searchQuery: string;
  searchPlaceholder?: string;
  totalCount: number;
  filteredCount: number;
  viewMode: ViewMode;
  sortState?: SortState;
  facetGroups: FacetGroup[];
  items: T[];
  columns: ColumnDefinition<T>[];
  renderCard: (item: T) => string;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  actionsHtml?: string;
}

export function renderUniversalTemplate<T>(props: UniversalTemplateProps<T>): string {
  const {
    title,
    subtitle,
    badge,
    searchQuery,
    searchPlaceholder = "Buscar por código, nombre, RIF... (Presione '/' para enfocar)",
    totalCount,
    filteredCount,
    viewMode,
    sortState = { column: null, direction: 'none' },
    facetGroups,
    items,
    columns,
    renderCard,
    emptyStateTitle = 'No se encontraron registros',
    emptyStateMessage = 'Intente ajustar el término de búsqueda o restablecer los filtros de la barra lateral.',
    actionsHtml = '',
  } = props;

  const isFiltered = Boolean(searchQuery.trim()) || facetGroups.some((g) => g.options.some((o) => o.selected && o.value !== 'ALL'));

  // 1. Facet Sidebar HTML
  const facetSidebarHtml = `
    <aside class="w-full lg:w-64 shrink-0 bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-5 h-fit">
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span>⚙️</span>
          <span>Filtros & Facetas</span>
        </h3>
        ${
          isFiltered
            ? `
              <button
                type="button"
                data-action="reset-all"
                title="Restablecer todos los filtros"
                class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            `
            : ''
        }
      </div>

      <div class="space-y-4">
        ${facetGroups
          .map((group) => {
            return `
              <div class="space-y-2">
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  ${escapeHtml(group.label)}
                </div>
                <div class="space-y-1">
                  ${group.options
                    .map((opt) => {
                      const isSelected = opt.selected;
                      return `
                        <button
                          type="button"
                          data-facet-group="${escapeHtml(group.id)}"
                          data-facet-value="${escapeHtml(opt.value)}"
                          class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 font-semibold text-indigo-900 border border-indigo-200/80'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }"
                        >
                          <span class="truncate">${escapeHtml(opt.label)}</span>
                          <span class="text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isSelected
                              ? 'bg-indigo-200/70 text-indigo-900'
                              : 'bg-slate-100 text-slate-500'
                          }">
                            ${opt.count}
                          </span>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>
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
                class="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Limpiar Todos los Filtros
              </button>
            </div>
          `
          : ''
      }
    </aside>
  `;

  // 2. Main Data Canvas HTML (Table or Cards)
  let contentHtml = '';

  if (items.length === 0) {
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
                  class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>↺</span>
                  <span>Restablecer Filtros y Búsqueda</span>
                </button>
              </div>
            `
            : ''
        }
      </div>
    `;
  } else if (viewMode === 'list') {
    // List / Table View with Excel-style sortable headers
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
                    const sortClass = isSorted ? 'text-indigo-600 font-extrabold' : 'text-slate-400 group-hover:text-slate-700';

                    if (col.sortable) {
                      return `
                        <th scope="col" class="px-4 py-3 select-none ${col.className || ''}">
                          <button
                            type="button"
                            data-action="sort-column"
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
                      <th scope="col" class="px-4 py-3 ${col.className || ''}">
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
                            <td class="px-4 py-3 align-middle ${alignClass} ${col.className || ''}">
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
    // Grid / Card View
    contentHtml = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${items.map((item) => renderCard(item)).join('')}
      </div>
    `;
  }

  // 3. Combined Layout
  return `
    <div class="space-y-6">
      <!-- Semantic Header Zone -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            ${
              badge
                ? `
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                    ${badge.symbol ? `<span aria-hidden="true">${escapeHtml(badge.symbol)}</span>` : ''}
                    <span>${escapeHtml(badge.label)}</span>
                  </div>
                `
                : ''
            }
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              ${escapeHtml(title)}
            </h1>
            ${
              subtitle
                ? `<p class="text-xs text-slate-500 max-w-3xl">${escapeHtml(subtitle)}</p>`
                : ''
            }
          </div>

          ${actionsHtml ? `<div class="shrink-0 flex items-center gap-2">${actionsHtml}</div>` : ''}
        </div>

        <!-- Controls Bar: Search + Match Count + View Mode Switcher -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div class="relative flex-1 max-w-xl">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              id="certificateSearchInput"
              placeholder="${escapeHtml(searchPlaceholder)}"
              value="${escapeHtml(searchQuery)}"
              aria-label="Buscar registros"
              class="w-full text-xs rounded-lg border border-slate-300 bg-white pl-9 pr-16 py-2 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div class="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              ${
                searchQuery
                  ? `
                    <button
                      type="button"
                      id="clearSearchBtn"
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

          <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div class="text-xs text-slate-500 font-medium">
              <span class="font-bold text-slate-800">${filteredCount}</span>
              <span> de ${totalCount} registros</span>
            </div>

            <!-- Presentation Switcher [⊞ Grid | ☰ List] -->
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs" role="group" aria-label="Modo de vista">
              <button
                type="button"
                data-action="set-view-mode"
                data-mode="grid"
                aria-pressed="${viewMode === 'grid' ? 'true' : 'false'}"
                title="Vista en Tarjetas (⊞ Grid)"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">⊞</span>
                <span class="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                type="button"
                data-action="set-view-mode"
                data-mode="list"
                aria-pressed="${viewMode === 'list' ? 'true' : 'false'}"
                title="Vista en Tabla (☰ List)"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">☰</span>
                <span class="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Body: Sidebar Facets + Data Canvas -->
      <div class="flex flex-col lg:flex-row gap-6">
        ${facetSidebarHtml}
        <section class="flex-1 min-w-0 space-y-4">
          ${contentHtml}
        </section>
      </div>
    </div>
  `;
}
