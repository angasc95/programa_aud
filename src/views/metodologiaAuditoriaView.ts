import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { MetodologiaAuditoriaCatalogItem } from '../lib/extraDomain';
import {
  renderSortIndicator,
  sortItems,
  type SortDirection,
} from '../lib/universalTemplate';

export interface MetodologiaAuditoriaViewState {
  selectedMetodologiaId: string | null;
  query: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
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

  // Otherwise, render the Universal Directory View
  return renderMetodologiaDirectoryView({
    state,
    metodologiasList,
  });
}

function renderMetodologiaDirectoryView(params: {
  state: MetodologiaAuditoriaViewState;
  metodologiasList: MetodologiaAuditoriaCatalogItem[];
}): string {
  const { state, metodologiasList } = params;

  // Filter
  const filtered = metodologiasList.filter((item) => {
    if (state.query) {
      const q = state.query.toLowerCase();
      const nameMatch = item.metodologia.toLowerCase().includes(q);
      const descMatch = item.descripcion.toLowerCase().includes(q);
      const ticMatch = item.protocolo_tic.toLowerCase().includes(q);
      if (!nameMatch && !descMatch && !ticMatch) return false;
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

  // Table view HTML
  const tableViewHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 select-none">
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-metodologia"
                data-column="metodologia"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Metodología</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'metodologia' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-metodologia"
                data-column="descripcion"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Descripción Técnica</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'descripcion' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">Protocolo TIC (IAF MD 4)</th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-metodologia"
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
                    No se encontraron metodologías que coincidan con los filtros aplicados.
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
                            data-action="select-metodologia"
                            data-metodologia-id="${escapeHtml(item.id)}"
                            class="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                          >
                            <span class="font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded text-xs font-bold">
                              ${escapeHtml(item.metodologia)}
                            </span>
                          </button>
                        </td>
                        <td class="py-3 px-4 text-slate-700 font-medium max-w-xs">
                          ${escapeHtml(item.descripcion)}
                        </td>
                        <td class="py-3 px-4 text-slate-600 max-w-xs truncate" title="${escapeHtml(item.protocolo_tic)}">
                          ${escapeHtml(item.protocolo_tic)}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            ${item.usage_count} ejecutadas
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <button
                            type="button"
                            data-action="select-metodologia"
                            data-metodologia-id="${escapeHtml(item.id)}"
                            class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Ver Protocolo →
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
                <span class="font-mono text-slate-500 font-semibold">${item.usage_count} usos</span>
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
              <span>🌐</span>
              <span>CATÁLOGO DE METODOLOGÍAS DE AUDITORÍA</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Metodologías de Ejecución de Auditoría
            </h1>
            <p class="text-xs text-slate-600 max-w-2xl">
              Las 3 metodologías canónicas bajo ISO 19011:2018 y documento obligatorio IAF MD 4 para auditorías presenciales, remotas e híbridas.
            </p>
          </div>
          <div class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            3 Métodos Canónicos
          </div>
        </div>

        <!-- Search Bar and View Switcher -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div class="relative flex-1 min-w-0">
            <label for="metodologiaSearchInput" class="sr-only">Buscar metodologías</label>
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="metodologiaSearchInput"
              type="text"
              value="${escapeHtml(state.query)}"
              placeholder="Buscar metodología (Presencial, Remota, Mixta)..."
              autocomplete="off"
              class="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
            ${
              state.query
                ? `
                  <button
                    type="button"
                    id="clearMetodologiaSearchBtn"
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
              data-action="set-metodologia-view-mode"
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
              data-action="set-metodologia-view-mode"
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
