import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { TipoAuditoriaCatalogItem } from '../lib/extraDomain';
import {
  renderSortIndicator,
  sortItems,
  type SortDirection,
} from '../lib/universalTemplate';

export interface TipoAuditoriaViewState {
  selectedTipoId: string | null;
  query: string;
  selectedCycle: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
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

  // Otherwise, render the Universal Directory View
  return renderTipoDirectoryView({
    state,
    tiposList,
  });
}

function renderTipoDirectoryView(params: {
  state: TipoAuditoriaViewState;
  tiposList: TipoAuditoriaCatalogItem[];
}): string {
  const { state, tiposList } = params;

  // Filter
  const filtered = tiposList.filter((item) => {
    if (state.query) {
      const q = state.query.toLowerCase();
      const tipoMatch = item.tipo.toLowerCase().includes(q);
      const descMatch = item.descripcion.toLowerCase().includes(q);
      const cycleMatch = item.etapa_ciclo.toLowerCase().includes(q);
      if (!tipoMatch && !descMatch && !cycleMatch) return false;
    }

    if (state.selectedCycle && state.selectedCycle !== 'ALL') {
      if (!item.etapa_ciclo.toLowerCase().includes(state.selectedCycle.toLowerCase())) {
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

  // Table view HTML
  const tableViewHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 select-none">
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-tipo"
                data-column="tipo"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Modalidad Canónica</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'tipo' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-tipo"
                data-column="etapa"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Etapa del Ciclo Trienal</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'etapa' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-tipo"
                data-column="descripcion"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Propósito Normativo (ISO 17021-1)</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'descripcion' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-tipo"
                data-column="usage"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Auditorías</span>
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
                    No se encontraron tipos de auditoría que coincidan con los filtros aplicados.
                  </td>
                </tr>
              `
              : sorted
                  .map((item) => {
                    return `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 font-bold text-slate-900">
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
                        </td>
                        <td class="py-3 px-4 text-slate-700 font-medium">
                          <span class="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                            <span>🔄</span>
                            <span>${escapeHtml(item.etapa_ciclo)}</span>
                          </span>
                        </td>
                        <td class="py-3 px-4 text-slate-600 max-w-sm">
                          ${escapeHtml(item.descripcion)}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            ${item.usage_count} ejecutadas
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <button
                            type="button"
                            data-action="select-tipo"
                            data-tipo-id="${escapeHtml(item.id)}"
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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      ${sorted
        .map((item) => {
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
                  <span>🔄</span>
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
                <span class="font-mono text-slate-500 font-semibold">${item.usage_count} eventos</span>
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
              <span>📑</span>
              <span>CATÁLOGO DE MODALIDADES DE AUDITORÍA</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Tipos de Auditoría de Certificación
            </h1>
            <p class="text-xs text-slate-600 max-w-2xl">
              Las 9 modalidades canónicas reguladas por ISO/IEC 17021-1:2015 para los ciclos de certificación inicial, vigilancia anual y renovación trienal.
            </p>
          </div>
          <div class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            9 Modalidades ISO
          </div>
        </div>

        <!-- Search Bar and View Switcher -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div class="relative flex-1 min-w-0">
            <label for="tipoSearchInput" class="sr-only">Buscar por tipo de auditoría</label>
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="tipoSearchInput"
              type="text"
              value="${escapeHtml(state.query)}"
              placeholder="Buscar tipo (Etapa 1, Vigilancia, Renovación...)..."
              autocomplete="off"
              class="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
            ${
              state.query
                ? `
                  <button
                    type="button"
                    id="clearTipoSearchBtn"
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
              data-action="set-tipo-view-mode"
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
              data-action="set-tipo-view-mode"
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
