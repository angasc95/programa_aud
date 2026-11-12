import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { EstatusCatalogItem } from '../lib/extraDomain';
import {
  renderSortIndicator,
  sortItems,
  type SortDirection,
} from '../lib/universalTemplate';

export interface EstatusViewState {
  selectedEstatusId: string | null;
  query: string;
  selectedCategory: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
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

  // Otherwise, render the Universal Directory View
  return renderEstatusDirectoryView({
    state,
    estatusList,
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

function renderEstatusDirectoryView(params: {
  state: EstatusViewState;
  estatusList: EstatusCatalogItem[];
}): string {
  const { state, estatusList } = params;

  // Filter
  const filtered = estatusList.filter((item) => {
    if (state.query) {
      const q = state.query.toLowerCase();
      const nameMatch = item.estatus.toLowerCase().includes(q);
      const descMatch = item.descripcion.toLowerCase().includes(q);
      const catMatch = item.categoria_aplicable.toLowerCase().includes(q);
      if (!nameMatch && !descMatch && !catMatch) return false;
    }

    if (state.selectedCategory && state.selectedCategory !== 'ALL') {
      if (!item.categoria_aplicable.toLowerCase().includes(state.selectedCategory.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Sort
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

  // Table view HTML
  const tableViewHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 select-none">
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-estatus"
                data-column="estatus"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Estatus Canónico</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'estatus' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-estatus"
                data-column="descripcion"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Significado y Regla Operativa</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'descripcion' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-estatus"
                data-column="categoria"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Ámbito de Aplicación</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'categoria' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-estatus"
                data-column="usage"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Métricas de Uso</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'usage' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
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
                  <td colspan="5" class="py-8 text-center text-slate-400 text-xs italic">
                    No se encontraron estatus que coincidan con los filtros aplicados.
                  </td>
                </tr>
              `
              : sorted
                  .map((item) => {
                    const badgeClass = getStatusBadgeClasses(item.color_token);
                    return `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 font-bold text-slate-900">
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
                        </td>
                        <td class="py-3 px-4 text-slate-700 font-medium">
                          ${escapeHtml(item.descripcion)}
                        </td>
                        <td class="py-3 px-4 text-slate-600">
                          <span class="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            ${escapeHtml(item.categoria_aplicable)}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            <span>📊</span>
                            <span>${item.usage_count} registros</span>
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <button
                            type="button"
                            data-action="select-estatus"
                            data-estatus-id="${escapeHtml(item.id)}"
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
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      ${sorted
        .map((item) => {
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
                <span class="font-mono text-slate-500 font-semibold">${item.usage_count} usos</span>
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
        })
        .join('')}
    </div>
  `;

  return `
    <div class="space-y-6">
      <!-- Universal Header Section -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
              <span>🏷️</span>
              <span>CATÁLOGO MAESTRO DE ESTATUS OPERATIVOS</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Estatus Canónicos del Sistema
            </h1>
            <p class="text-xs text-slate-600 max-w-2xl">
              Padrón estandarizado de los 8 estados del ciclo de vida de auditorías, certificados, no conformidades y organizaciones cliente.
            </p>
          </div>
          <div class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            8 Estados Canónicos
          </div>
        </div>

        <!-- Search Bar and View Switcher -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div class="relative flex-1 min-w-0">
            <label for="estatusSearchInput" class="sr-only">Buscar por nombre o descripción de estatus</label>
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="estatusSearchInput"
              type="search"
              value="${escapeHtml(state.query)}"
              placeholder="Buscar estatus (Activo, Suspendido, En Ejecución...)..."
              autocomplete="off"
              class="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
            ${
              state.query
                ? `
                  <button
                    type="button"
                    id="clearEstatusSearchBtn"
                    title="Limpiar búsqueda"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                `
                : ''
            }
          </div>

          <div class="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              data-action="set-estatus-view-mode"
              data-mode="grid"
              aria-pressed="${state.viewMode === 'grid' ? 'true' : 'false'}"
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
              data-action="set-estatus-view-mode"
              data-mode="list"
              aria-pressed="${state.viewMode === 'list' ? 'true' : 'false'}"
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

      <!-- Main Layout -->
      <div class="space-y-4">
        ${state.viewMode === 'grid' ? gridViewHtml : tableViewHtml}
      </div>
    </div>
  `;
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
