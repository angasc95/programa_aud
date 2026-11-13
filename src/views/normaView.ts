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
  cycleSortDirection,
  renderSortIndicator,
  sortItems,
  type SortDirection,
} from '../lib/universalTemplate';

export interface NormaViewState {
  selectedNormaId: string | null;
  activeChildTab: 'acreditacion' | 'requisitos';
  query: string;
  selectedStatus: string;
  selectedScheme: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isAddAccreditationModalOpen: boolean;
  inspectingClauseId: string | null;
}

export interface NormaViewProps {
  profile: UserProfile;
  state: NormaViewState;
  normas: NormaEntity[];
  acreditaciones: AcreditacionNormaIaf[];
  organismos: OrganismoAcreditacion[];
  requisitos: RequisitoLtree[];
  sectores: SectorIafEntity[];
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
    sectores,
  } = props;

  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';

  // If a specific Norma is selected, render the Standardized 4-Zone Detail Page
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
        isAddAccreditationModalOpen: state.isAddAccreditationModalOpen,
        inspectingClauseId: state.inspectingClauseId,
        isStaff,
      });
    }
  }

  // Otherwise, render the Universal List/Grid View
  return renderNormaDirectoryView({
    profile,
    state,
    normas,
    acreditaciones,
  });
}

/**
 * Universal List/Grid View for Normas
 */
function renderNormaDirectoryView(params: {
  profile: UserProfile;
  state: NormaViewState;
  normas: NormaEntity[];
  acreditaciones: AcreditacionNormaIaf[];
}): string {
  const { state, normas, acreditaciones } = params;

  // Filter normas by query and facets
  const filtered = normas.filter((norma) => {
    if (state.query) {
      const q = state.query.toLowerCase();
      const codeMatch = norma.codigo.toLowerCase().includes(q);
      const titleMatch = norma.titulo.toLowerCase().includes(q);
      const schemeMatch = norma.esquema.toLowerCase().includes(q);
      if (!codeMatch && !titleMatch && !schemeMatch) return false;
    }

    if (state.selectedStatus && state.selectedStatus !== 'ALL') {
      if (norma.estatus.toLowerCase() !== state.selectedStatus.toLowerCase()) return false;
    }

    if (state.selectedScheme && state.selectedScheme !== 'ALL') {
      if (norma.esquema.toLowerCase() !== state.selectedScheme.toLowerCase()) return false;
    }

    return true;
  });

  // Sort items
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

  const uniqueSchemes = Array.from(new Set(normas.map((n) => n.esquema))).sort();
  const uniqueStatuses = ['Vigente', 'En Revisión', 'Obsoleta'];

  // Table view HTML
  const tableViewHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 select-none">
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-norma"
                data-column="codigo"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Código</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'codigo' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-norma"
                data-column="titulo"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Título Oficial</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'titulo' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-norma"
                data-column="esquema"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Esquema</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'esquema' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-norma"
                data-column="estatus"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Estatus</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'estatus' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-norma"
                data-column="clausulas"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Cláusulas</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'clausulas' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-norma"
                data-column="acreditaciones"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Acreditaciones</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'acreditaciones' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${
            sorted.length === 0
              ? `
                <tr>
                  <td colspan="7" class="py-8 text-center text-slate-400 text-xs italic">
                    No se encontraron normas que coincidan con los filtros aplicados.
                  </td>
                </tr>
              `
              : sorted
                  .map((norma) => {
                    const statusMeta = formatNormaStatusBadge(norma.estatus);
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
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">
                          <button
                            type="button"
                            data-action="select-norma"
                            data-norma-id="${escapeHtml(norma.id)}"
                            class="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>📘</span>
                            <span>${escapeHtml(norma.codigo)}</span>
                          </button>
                        </td>
                        <td class="py-3 px-4 text-slate-700 font-medium max-w-xs truncate" title="${escapeHtml(norma.titulo)}">
                          ${escapeHtml(norma.titulo)}
                        </td>
                        <td class="py-3 px-4 text-slate-600">
                          <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            ${escapeHtml(norma.esquema)}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta.badgeClass}">
                            <span>${statusMeta.symbol}</span>
                            <span>${escapeHtml(statusMeta.label)}</span>
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                          ${norma.clausulas_count}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <div class="flex items-center justify-center gap-1">
                            ${orgBadges || `<span class="text-slate-400 text-[10px]">Sin acreditar</span>`}
                          </div>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <button
                            type="button"
                            data-action="select-norma"
                            data-norma-id="${escapeHtml(norma.id)}"
                            class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Ver Detalle →
                          </button>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')
          }
        </tbody>
      </table>
    </div>
  `;

  // Grid view HTML
  const gridViewHtml = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${
        sorted.length === 0
          ? `
            <div class="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white border border-slate-200 rounded-xl">
              No se encontraron normas que coincidan con los filtros aplicados.
            </div>
          `
          : sorted
              .map((norma) => {
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
                          <span>🌳</span>
                          <span><strong>${norma.clausulas_count}</strong> Cláusulas ltree</span>
                        </span>
                        <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          <span>🏛️</span>
                          <span><strong>${normaAccreds.length}</strong> Acreditación(es)</span>
                        </span>
                        <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          <span>📅</span>
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
              })
              .join('')
      }
    </div>
  `;

  return `
    <div class="space-y-6">
      <!-- Universal Header Section -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
              <span>📘</span>
              <span>CATÁLOGO DE NORMAS Y ESQUEMAS ISO</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Normas de Sistemas de Gestión
            </h1>
            <p class="text-xs text-slate-600 max-w-2xl">
              Estándares internacionales certificables, acreditaciones vigentes ante organismos oficiales (ENAC, UKAS, ANAB) y árbol jerárquico de cláusulas normativas ltree.
            </p>
          </div>
          <div class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            ${normas.length} Normas Registradas
          </div>
        </div>

        <!-- Search Bar and Presentation Switcher -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div class="relative flex-1 min-w-0">
            <label for="normaSearchInput" class="sr-only">Buscar normas por código, título o esquema</label>
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="normaSearchInput"
              type="text"
              value="${escapeHtml(state.query)}"
              placeholder="Buscar por código (ISO 9001, 14001...), título o esquema..."
              autocomplete="off"
              class="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
            ${
              state.query
                ? `
                  <button
                    type="button"
                    id="clearNormaSearchBtn"
                    title="Limpiar búsqueda"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                `
                : `
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <kbd class="hidden md:inline-flex text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">/</kbd>
                  </div>
                `
            }
          </div>

          <!-- Presentation Switcher Toggle (Grid vs. List) -->
          <div class="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              data-action="set-norma-view-mode"
              data-mode="grid"
              aria-pressed="${state.viewMode === 'grid' ? 'true' : 'false'}"
              title="Vista en cuadrícula de tarjetas"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                state.viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }"
            >
              <span>⊞</span>
              <span>Cuadrícula</span>
            </button>
            <button
              type="button"
              data-action="set-norma-view-mode"
              data-mode="list"
              aria-pressed="${state.viewMode === 'list' ? 'true' : 'false'}"
              title="Vista en tabla de datos (Lista)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                state.viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }"
            >
              <span>☰</span>
              <span>Lista</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content Layout with Sidebar Facets -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar Facets Pane -->
        <aside class="space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">Filtros Facetados</h3>
              <button
                type="button"
                id="resetNormaFiltersBtn"
                class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Limpiar Todo
              </button>
            </div>

            <!-- Estatus Facet -->
            <div class="space-y-2">
              <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Estatus Normativo</label>
              <div class="space-y-1">
                <button
                  type="button"
                  data-norma-filter-status="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    state.selectedStatus === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos</span>
                  <span class="text-[10px] opacity-80">${normas.length}</span>
                </button>
                ${uniqueStatuses
                  .map((st) => {
                    const count = normas.filter((n) => n.estatus.toLowerCase() === st.toLowerCase()).length;
                    const isSelected = state.selectedStatus.toLowerCase() === st.toLowerCase();
                    return `
                      <button
                        type="button"
                        data-norma-filter-status="${escapeHtml(st)}"
                        class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }"
                      >
                        <span>${escapeHtml(st)}</span>
                        <span class="text-[10px] opacity-80">${count}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Esquema Facet -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Esquema de Gestión</label>
              <div class="space-y-1">
                <button
                  type="button"
                  data-norma-filter-scheme="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    state.selectedScheme === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos</span>
                  <span class="text-[10px] opacity-80">${normas.length}</span>
                </button>
                ${uniqueSchemes
                  .map((sc) => {
                    const count = normas.filter((n) => n.esquema.toLowerCase() === sc.toLowerCase()).length;
                    const isSelected = state.selectedScheme.toLowerCase() === sc.toLowerCase();
                    return `
                      <button
                        type="button"
                        data-norma-filter-scheme="${escapeHtml(sc)}"
                        class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }"
                      >
                        <span class="truncate pr-1">${escapeHtml(sc)}</span>
                        <span class="text-[10px] opacity-80">${count}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Items Pane -->
        <div class="lg:col-span-3 space-y-4">
          <div class="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Mostrando <strong>${sorted.length}</strong> de ${normas.length} norma(s)</span>
            <span>Vista: <strong>${state.viewMode === 'grid' ? 'Cuadrícula' : 'Tabla (Lista)'}</strong></span>
          </div>

          ${state.viewMode === 'grid' ? gridViewHtml : tableViewHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Standardized 4-Zone Detail Page for a Single Norma
 */
function renderNormaDetailPage(params: {
  profile: UserProfile;
  norma: NormaEntity;
  activeTab: 'acreditacion' | 'requisitos';
  acreditaciones: AcreditacionNormaIaf[];
  organismos: OrganismoAcreditacion[];
  requisitos: RequisitoLtree[];
  sectores: SectorIafEntity[];
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
    isAddAccreditationModalOpen,
    inspectingClauseId,
    isStaff,
  } = params;

  const statusMeta = formatNormaStatusBadge(norma.estatus);
  const inspectingClause = inspectingClauseId
    ? requisitos.find((r) => r.id === inspectingClauseId)
    : null;

  // Tab 1: Acreditación Content
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
                            ${escapeHtml(acc.numero_acreditacion)}
                          </td>
                          <td class="py-3 px-4 text-slate-700">
                            ${
                              acc.sector_iaf_numero
                                ? `
                                  <div class="font-semibold text-slate-900">
                                    Sector IAF ${acc.sector_iaf_numero}
                                  </div>
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

  // Tab 2: Requisitos Content (Powered by PostgreSQL ltree)
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

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar (Back to Normas + Changelog Trigger) -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-action="back-to-normas-list"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver al Catálogo de Normas</span>
        </button>

        <!-- Top-Right Changelog Trigger [🕒 Historial de Cambios] -->
        <button
          type="button"
          data-action="open-changelog"
          data-table-name="norma"
          data-record-id="${escapeHtml(norma.id)}"
          data-entity-name="${escapeHtml(norma.codigo)}"
          title="Ver registro cronológico de auditoría forense para esta norma"
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
            <span class="text-3xl select-none shrink-0" aria-hidden="true">📘</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                ${escapeHtml(norma.codigo)}
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                ${escapeHtml(norma.titulo)}
              </h1>
              <p class="text-xs text-slate-500 font-medium">
                Esquema: <span class="text-slate-800 font-semibold">${escapeHtml(norma.esquema)}</span>
              </p>
            </div>
          </div>

          <div class="self-start sm:self-auto shrink-0">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold border ${statusMeta.badgeClass}">
              <span>${statusMeta.symbol}</span>
              <span>${escapeHtml(statusMeta.label)}</span>
            </span>
          </div>
        </div>
      </header>

      <!-- Zone 2: Visual Separator -->
      <div class="border-t border-slate-200/60 my-1"></div>

      <!-- Zone 3: Direct Record Attributes -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Atributos Directos del Registro Normativo
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Código Canónico</div>
            <div class="text-xs font-mono font-bold text-slate-900">${escapeHtml(norma.codigo)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Esquema de Certificación</div>
            <div class="text-xs font-bold text-slate-900">${escapeHtml(norma.esquema)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha de Publicación Oficial</div>
            <div class="text-xs font-mono font-semibold text-slate-800">${escapeHtml(norma.fecha_publicacion)}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cláusulas en ltree</div>
            <div class="text-xs font-bold text-indigo-700">${requisitos.length} Requisitos Estructurados</div>
          </div>
        </div>
      </section>

      <!-- Zone 4: Multipage Child Tabs -->
      <section class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <!-- Tab Bar -->
        <div class="px-4 pt-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            data-norma-tab="acreditacion"
            aria-selected="${activeTab === 'acreditacion' ? 'true' : 'false'}"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-b-2 ${
              activeTab === 'acreditacion'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }"
          >
            <span aria-hidden="true">🏛️</span>
            <span>Acreditación</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'acreditacion' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-600'
            }">
              ${acreditaciones.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            data-norma-tab="requisitos"
            aria-selected="${activeTab === 'requisitos' ? 'true' : 'false'}"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-b-2 ${
              activeTab === 'requisitos'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }"
          >
            <span aria-hidden="true">🌳</span>
            <span>Requisitos (ltree)</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'requisitos' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-600'
            }">
              ${requisitos.length}
            </span>
          </button>
        </div>

        <!-- Tab Body -->
        <div class="p-5">
          ${activeTab === 'acreditacion' ? tabAcreditacionHtml : tabRequisitosHtml}
        </div>
      </section>

      <!-- Modals -->
      ${inspectClauseModalHtml}
      ${newAccredModalHtml}
    </div>
  `;
}
