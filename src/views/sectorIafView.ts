import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  formatRiskCategoryBadge,
  type SectorIafEntity,
  type SubsectorIafEntity,
} from '../lib/extraDomain';
import {
  renderSortIndicator,
  sortItems,
  type SortDirection,
} from '../lib/universalTemplate';

export interface SectorIafViewState {
  selectedSectorId: string | null;
  activeChildTab: 'subsectores' | 'auditores';
  query: string;
  selectedRisk: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isAddSubsectorModalOpen: boolean;
}

export interface SectorIafViewProps {
  profile: UserProfile;
  state: SectorIafViewState;
  sectores: SectorIafEntity[];
  subsectores: SubsectorIafEntity[];
  loading?: boolean;
}

export function renderSectorIafView(props: SectorIafViewProps): string {
  const { profile, state, sectores, subsectores } = props;
  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';

  // If a specific Sector is selected, render the Standardized 4-Zone Detail Page
  if (state.selectedSectorId) {
    const selectedSector =
      sectores.find((s) => s.id === state.selectedSectorId || String(s.sector) === state.selectedSectorId) ||
      sectores[0];

    if (selectedSector) {
      return renderSectorDetailPage({
        profile,
        sector: selectedSector,
        activeTab: state.activeChildTab,
        subsectores: subsectores.filter(
          (sub) => sub.id_sector_iaf === selectedSector.id || sub.sector_numero === selectedSector.sector
        ),
        isAddSubsectorModalOpen: state.isAddSubsectorModalOpen,
        isStaff,
      });
    }
  }

  // Otherwise, render the Universal List/Grid View
  return renderSectorDirectoryView({
    profile,
    state,
    sectores,
    subsectores,
  });
}

function renderSectorDirectoryView(params: {
  profile: UserProfile;
  state: SectorIafViewState;
  sectores: SectorIafEntity[];
  subsectores: SubsectorIafEntity[];
}): string {
  const { state, sectores, subsectores } = params;

  // Filter sectores by search query and risk category
  const filtered = sectores.filter((sec) => {
    if (state.query) {
      const q = state.query.toLowerCase();
      const numMatch = String(sec.sector).includes(q);
      const descMatch = sec.descripcion.toLowerCase().includes(q);
      if (!numMatch && !descMatch) return false;
    }

    if (state.selectedRisk && state.selectedRisk !== 'ALL') {
      const relatedSubs = subsectores.filter(
        (sub) => sub.id_sector_iaf === sec.id || sub.sector_numero === sec.sector
      );
      const hasRisk = relatedSubs.some(
        (s) => s.categoria_riesgo.toUpperCase() === state.selectedRisk.toUpperCase()
      );
      if (!hasRisk) return false;
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
        case 'sector':
          return item.sector;
        case 'descripcion':
          return item.descripcion;
        case 'subsectores':
          return item.subsectores_count;
        case 'auditores':
          return item.auditores_count;
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
                data-action="sort-iaf"
                data-column="sector"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Sector IAF</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'sector' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4">
              <button
                type="button"
                data-action="sort-iaf"
                data-column="descripcion"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Descripción Técnica Oficial</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'descripcion' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-iaf"
                data-column="subsectores"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Sub-Sectores</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'subsectores' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
              </button>
            </th>
            <th class="py-3 px-4 text-center">
              <button
                type="button"
                data-action="sort-iaf"
                data-column="auditores"
                class="hover:text-slate-900 inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>Auditores Calificados</span>
                <span class="text-[10px] text-slate-400 font-mono">${state.sortColumn === 'auditores' ? renderSortIndicator(state.sortDirection) : '▲▼'}</span>
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
                    No se encontraron sectores que coincidan con los filtros aplicados.
                  </td>
                </tr>
              `
              : sorted
                  .map((sec) => {
                    const relatedSubs = subsectores.filter(
                      (sub) => sub.id_sector_iaf === sec.id || sub.sector_numero === sec.sector
                    );

                    return `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">
                          <button
                            type="button"
                            data-action="select-iaf"
                            data-sector-id="${escapeHtml(sec.id)}"
                            class="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>🏭</span>
                            <span>IAF ${sec.sector}</span>
                          </button>
                        </td>
                        <td class="py-3 px-4 text-slate-700 font-medium">
                          ${escapeHtml(sec.descripcion)}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            ${relatedSubs.length} sub-sector(es)
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <span>👥</span>
                            <span>${sec.auditores_count}</span>
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <button
                            type="button"
                            data-action="select-iaf"
                            data-sector-id="${escapeHtml(sec.id)}"
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
              No se encontraron sectores que coincidan con los filtros aplicados.
            </div>
          `
          : sorted
              .map((sec) => {
                const relatedSubs = subsectores.filter(
                  (sub) => sub.id_sector_iaf === sec.id || sub.sector_numero === sec.sector
                );

                return `
                  <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200 font-mono">
                          <span>🏭</span>
                          <span>Sector IAF ${sec.sector}</span>
                        </span>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Acreditado
                        </span>
                      </div>

                      <h3 class="text-sm font-bold text-slate-900 leading-snug">
                        ${escapeHtml(sec.descripcion)}
                      </h3>

                      <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
                        <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 font-mono">
                          <span>🏷️</span>
                          <span><strong>${relatedSubs.length}</strong> Sub-sectores</span>
                        </span>
                        <span class="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          <span>👥</span>
                          <span><strong>${sec.auditores_count}</strong> Evaluadores</span>
                        </span>
                      </div>

                      ${
                        relatedSubs.length > 0
                          ? `
                            <div class="pt-1 flex flex-wrap gap-1">
                              ${relatedSubs
                                .map((s) => {
                                  const rMeta = formatRiskCategoryBadge(s.categoria_riesgo);
                                  return `
                                    <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200" title="${escapeHtml(s.descripcion)} (${rMeta.label})">
                                      ${escapeHtml(s.codigo)}
                                    </span>
                                  `;
                                })
                                .join('')}
                            </div>
                          `
                          : ''
                      }
                    </div>

                    <div class="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        data-action="select-iaf"
                        data-sector-id="${escapeHtml(sec.id)}"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Explorar Sub-Sectores</span>
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
              <span>🏭</span>
              <span>DIRECTORIO DE SECTORES Y SUB-SECTORES IAF</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Sectores Técnicos de Acreditación IAF
            </h1>
            <p class="text-xs text-slate-600 max-w-2xl">
              Taxonomía técnica internacional de sectores económicos, códigos de sub-sectores jerárquicos (17.1, 17.2...) y categorización de riesgo para la cualificación de auditores.
            </p>
          </div>
          <div class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            ${sectores.length} Sectores Registrados
          </div>
        </div>

        <!-- Search Bar and Presentation Switcher -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div class="relative flex-1 min-w-0">
            <label for="iafSearchInput" class="sr-only">Buscar sectores IAF por número o descripción</label>
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="iafSearchInput"
              type="text"
              value="${escapeHtml(state.query)}"
              placeholder="Buscar por número (14, 17, 28...) o actividad industrial..."
              autocomplete="off"
              class="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
            />
            ${
              state.query
                ? `
                  <button
                    type="button"
                    id="clearIafSearchBtn"
                    title="Limpiar búsqueda"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                `
                : ''
            }
          </div>

          <!-- Switcher -->
          <div class="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              data-action="set-iaf-view-mode"
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
              data-action="set-iaf-view-mode"
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

      <!-- Main Layout with Sidebar Facets -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside class="space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">Filtros de Riesgo</h3>
              <button
                type="button"
                id="resetIafFiltersBtn"
                class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Limpiar Todo
              </button>
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Categoría de Riesgo ISO</label>
              <div class="space-y-1">
                <button
                  type="button"
                  data-iaf-filter-risk="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    state.selectedRisk === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos los Riesgos</span>
                  <span class="text-[10px] opacity-80">${sectores.length}</span>
                </button>
                <button
                  type="button"
                  data-iaf-filter-risk="ALTO"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    state.selectedRisk === 'ALTO'
                      ? 'bg-rose-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <span>🔴</span>
                    <span>Alto Riesgo</span>
                  </span>
                </button>
                <button
                  type="button"
                  data-iaf-filter-risk="MEDIO"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    state.selectedRisk === 'MEDIO'
                      ? 'bg-amber-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <span>🟡</span>
                    <span>Riesgo Medio</span>
                  </span>
                </button>
                <button
                  type="button"
                  data-iaf-filter-risk="BAJO"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    state.selectedRisk === 'BAJO'
                      ? 'bg-emerald-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <span>🟢</span>
                    <span>Bajo Riesgo</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Items Pane -->
        <div class="lg:col-span-3 space-y-4">
          <div class="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Mostrando <strong>${sorted.length}</strong> de ${sectores.length} sector(es)</span>
            <span>Vista: <strong>${state.viewMode === 'grid' ? 'Cuadrícula' : 'Tabla (Lista)'}</strong></span>
          </div>

          ${state.viewMode === 'grid' ? gridViewHtml : tableViewHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Standardized 4-Zone Detail Page for a Single Sector IAF
 */
function renderSectorDetailPage(params: {
  profile: UserProfile;
  sector: SectorIafEntity;
  activeTab: 'subsectores' | 'auditores';
  subsectores: SubsectorIafEntity[];
  isAddSubsectorModalOpen: boolean;
  isStaff: boolean;
}): string {
  const { sector, activeTab, subsectores, isAddSubsectorModalOpen, isStaff } = params;

  // Tab 1: Sub-Sectores Content
  const tabSubsectoresHtml = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Sub-Sectores Técnicos Registrados</h3>
          <p class="text-xs text-slate-500">
            Desglose granular de actividades económicas y categorización de riesgo bajo ISO/IEC 17021-1
          </p>
        </div>
        ${
          isStaff
            ? `
              <button
                type="button"
                id="openNewSubsectorModalBtn"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>➕</span>
                <span>Nuevo Sub-Sector</span>
              </button>
            `
            : ''
        }
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-3 px-4">Código</th>
              <th class="py-3 px-4">Descripción Técnica Detallada</th>
              <th class="py-3 px-4 text-center">Categoría de Riesgo ISO</th>
              <th class="py-3 px-4">Auditores Especialistas Calificados</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              subsectores.length === 0
                ? `
                  <tr>
                    <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                      No se han registrado sub-sectores para este sector IAF.
                    </td>
                  </tr>
                `
                : subsectores
                    .map((sub) => {
                      const riskMeta = formatRiskCategoryBadge(sub.categoria_riesgo);
                      return `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                            ${escapeHtml(sub.codigo)}
                          </td>
                          <td class="py-3 px-4 text-slate-700 font-medium">
                            ${escapeHtml(sub.descripcion)}
                          </td>
                          <td class="py-3 px-4 text-center">
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${riskMeta.badgeClass}">
                              <span>${riskMeta.symbol}</span>
                              <span>${escapeHtml(riskMeta.label)}</span>
                            </span>
                          </td>
                          <td class="py-3 px-4 text-slate-600">
                            ${
                              sub.auditores_nombres && sub.auditores_nombres.length > 0
                                ? sub.auditores_nombres
                                    .map(
                                      (aud) => `
                                      <div class="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-800 border border-slate-200 mr-1 mb-1">
                                        <span>👤</span>
                                        <span>${escapeHtml(aud)}</span>
                                      </div>
                                    `
                                    )
                                    .join('')
                                : `<span class="text-slate-400 italic">Sin auditores asignados</span>`
                            }
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

  // Tab 2: Auditores Calificados Content
  const tabAuditoresHtml = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Evaluadores Técnicos con Competencia Sectorial</h3>
          <p class="text-xs text-slate-500">
            Auditores habilitados para liderar o evaluar auditorías en el Sector IAF ${sector.sector}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>👤</span>
              <span>Ing. Carlos Mendoza</span>
            </h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Auditor Líder Certificado
            </span>
          </div>
          <p class="text-xs text-slate-600">
            Habilitado en Sector IAF ${sector.sector} para normas ISO 9001:2015 e ISO 14001:2015.
          </p>
          <div class="text-[11px] font-mono text-slate-500 pt-1">
            Sub-sectores amparados: 17.1, 17.2, 28.1
          </div>
        </div>

        <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>👤</span>
              <span>Auditor Técnico Evaluador</span>
            </h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Auditor Técnico Calificado
            </span>
          </div>
          <p class="text-xs text-slate-600">
            Especialista técnico para evaluación de conformidad en planta y procesos medulares.
          </p>
          <div class="text-[11px] font-mono text-slate-500 pt-1">
            Sub-sectores amparados: 17.2, 33.1
          </div>
        </div>
      </div>
    </div>
  `;

  // Modal for Adding New Sub-Sector
  const newSubsectorModalHtml = isAddSubsectorModalOpen
    ? `
      <div id="newSubsectorBackdrop" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏷️</span>
              <h3 class="text-sm font-bold text-slate-900">Registrar Sub-Sector Técnico</h3>
            </div>
            <button type="button" id="closeNewSubsectorModalBtn" class="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕
            </button>
          </div>
          <form id="newSubsectorForm" class="p-6 space-y-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Sector Padre</label>
              <input type="text" disabled value="Sector IAF ${sector.sector} — ${escapeHtml(sector.descripcion)}" class="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-600 font-medium" />
              <input type="hidden" name="id_sector_iaf" value="${escapeHtml(sector.id)}" />
              <input type="hidden" name="sector_numero" value="${sector.sector}" />
            </div>
            <div>
              <label for="subsectorCodigoInput" class="block font-bold text-slate-700 mb-1">Código de Sub-Sector *</label>
              <input id="subsectorCodigoInput" name="codigo" type="text" required placeholder="Ej. ${sector.sector}.3 o ${sector.sector}.4" class="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono focus:ring-1 focus:ring-indigo-600" />
            </div>
            <div>
              <label for="subsectorDescInput" class="block font-bold text-slate-700 mb-1">Descripción Técnica Detallada *</label>
              <textarea id="subsectorDescInput" name="descripcion" rows="3" required placeholder="Actividades industriales y alcance técnico del sub-sector..." class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600"></textarea>
            </div>
            <div>
              <label for="subsectorRiesgoSelect" class="block font-bold text-slate-700 mb-1">Categoría de Riesgo ISO *</label>
              <select id="subsectorRiesgoSelect" name="categoria_riesgo" required class="w-full bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600">
                <option value="BAJO">🟢 BAJO RIESGO</option>
                <option value="MEDIO" selected>🟡 RIESGO MEDIO</option>
                <option value="ALTO">🔴 ALTO RIESGO</option>
              </select>
            </div>
            <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" id="cancelNewSubsectorModalBtn" class="px-3.5 py-2 rounded-lg font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" class="px-4 py-2 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer">
                Guardar Sub-Sector
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    : '';

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar (Back to Sectors + Changelog Trigger) -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-action="back-to-iaf-list"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver al Directorio de Sectores IAF</span>
        </button>

        <!-- Top-Right Changelog Trigger [🕒 Historial de Cambios] -->
        <button
          type="button"
          data-action="open-changelog"
          data-table-name="sector_iaf"
          data-record-id="${escapeHtml(sector.id)}"
          data-entity-name="Sector IAF ${sector.sector}"
          title="Ver registro cronológico de auditoría forense para este sector"
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
            <span class="text-3xl select-none shrink-0" aria-hidden="true">🏭</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                SECTOR TÉCNICO IAF
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                Sector IAF ${sector.sector}
              </h1>
              <p class="text-xs text-slate-600 font-medium">
                ${escapeHtml(sector.descripcion)}
              </p>
            </div>
          </div>

          <div class="self-start sm:self-auto shrink-0">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
              <span>✓</span>
              <span>ACREDITADO</span>
            </span>
          </div>
        </div>
      </header>

      <!-- Zone 2: Visual Separator -->
      <div class="border-t border-slate-200/60 my-1"></div>

      <!-- Zone 3: Direct Record Attributes -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Atributos Directos del Sector
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Código de Sector</div>
            <div class="text-xs font-mono font-bold text-slate-900">Sector IAF ${sector.sector}</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sub-Sectores Definidos</div>
            <div class="text-xs font-bold text-indigo-700">${subsectores.length} Sub-sector(es)</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auditores Calificados</div>
            <div class="text-xs font-bold text-slate-900">${sector.auditores_count} Evaluadores Calificados</div>
          </div>
          <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Normativa Internacional</div>
            <div class="text-xs font-semibold text-slate-800">ISO/IEC 17021-1 / IAF MD 5</div>
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
            data-iaf-tab="subsectores"
            aria-selected="${activeTab === 'subsectores' ? 'true' : 'false'}"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-b-2 ${
              activeTab === 'subsectores'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }"
          >
            <span aria-hidden="true">🏷️</span>
            <span>Sub-Sectores</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'subsectores' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-600'
            }">
              ${subsectores.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            data-iaf-tab="auditores"
            aria-selected="${activeTab === 'auditores' ? 'true' : 'false'}"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-b-2 ${
              activeTab === 'auditores'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }"
          >
            <span aria-hidden="true">👥</span>
            <span>Auditores Calificados</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'auditores' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-600'
            }">
              ${sector.auditores_count}
            </span>
          </button>
        </div>

        <!-- Tab Body -->
        <div class="p-5">
          ${activeTab === 'subsectores' ? tabSubsectoresHtml : tabAuditoresHtml}
        </div>
      </section>

      <!-- Modal -->
      ${newSubsectorModalHtml}
    </div>
  `;
}
