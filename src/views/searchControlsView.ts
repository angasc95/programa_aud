import { escapeHtml } from '../lib/html';
import {
  formatMatchCountText,
  getCoverageVisual,
  getOperationalStatusVisual,
  type CertificateRecord,
  type SearchControlsFilterState,
  type ViewMode,
} from '../lib/searchControls';

export interface SearchControlsProps {
  filters: SearchControlsFilterState;
  availableStatuses: string[];
  availableStandards: string[];
  matchCount: number;
  totalCount: number;
}

/**
 * Renders the search bar, status & standard facets, and the presentation switcher toggle.
 */
export function renderSearchControls(props: SearchControlsProps): string {
  const { filters, availableStatuses, availableStandards, matchCount, totalCount } = props;
  const hasActiveFilters =
    Boolean(filters.query) ||
    (filters.selectedStatus && filters.selectedStatus !== 'ALL') ||
    (filters.selectedStandard && filters.selectedStandard !== 'ALL');

  const matchSummary = formatMatchCountText(matchCount, totalCount);

  return `
    <div class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      <!-- Top Row: Real-time Multi-Criteria Search Bar + View Switcher -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Search Input with Icons & Clear Button -->
        <div class="relative flex-1 min-w-0">
          <label for="certificateSearchInput" class="sr-only">
            Buscar por número de certificado, nombre de empresa o RIF
          </label>
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id="certificateSearchInput"
            type="search"
            value="${escapeHtml(filters.query)}"
            placeholder="Buscar por N° Certificado (FN-...), Empresa o RIF..."
            autocomplete="off"
            class="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
          />
          <div class="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
            ${
              filters.query
                ? `
              <button
                type="button"
                id="clearSearchBtn"
                data-action="clear-search"
                title="Limpiar búsqueda (Esc)"
                aria-label="Limpiar búsqueda"
                class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            `
                : `
              <kbd class="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs select-none">
                /
              </kbd>
            `
            }
          </div>
        </div>

        <!-- Presentation Switcher Toggle (Grid vs. List) -->
        <div
          role="group"
          aria-label="Modo de visualización"
          class="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0"
        >
          <button
            type="button"
            data-action="set-view-mode"
            data-mode="grid"
            aria-pressed="${filters.viewMode === 'grid' ? 'true' : 'false'}"
            title="Vista en cuadrícula (Tarjetas relacionales)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              filters.viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Cuadrícula</span>
          </button>
          <button
            type="button"
            data-action="set-view-mode"
            data-mode="list"
            aria-pressed="${filters.viewMode === 'list' ? 'true' : 'false'}"
            title="Vista en lista (Tabla compacta)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              filters.viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Lista</span>
          </button>
        </div>
      </div>

      <!-- Bottom Row: Status & Standard Facets + Match Count Badge + Reset -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Status Selector Facet -->
          <div class="inline-flex items-center gap-1.5">
            <label for="statusFacetSelect" class="text-slate-500 font-medium">Estatus:</label>
            <select
              id="statusFacetSelect"
              data-action="change-status"
              class="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-medium hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL" ${filters.selectedStatus === 'ALL' ? 'selected' : ''}>
                Todos los estatus (${totalCount})
              </option>
              ${availableStatuses
                .map(
                  (status) => `
                <option value="${escapeHtml(status)}" ${filters.selectedStatus === status ? 'selected' : ''}>
                  ${escapeHtml(status)}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <!-- Standard / Scheme Selector Facet -->
          <div class="inline-flex items-center gap-1.5">
            <label for="standardFacetSelect" class="text-slate-500 font-medium">Norma ISO:</label>
            <select
              id="standardFacetSelect"
              data-action="change-standard"
              class="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-medium hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL" ${filters.selectedStandard === 'ALL' ? 'selected' : ''}>
                Todas las normas (${totalCount})
              </option>
              ${availableStandards
                .map(
                  (std) => `
                <option value="${escapeHtml(std)}" ${filters.selectedStandard === std ? 'selected' : ''}>
                  ${escapeHtml(std)}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          ${
            hasActiveFilters
              ? `
            <button
              type="button"
              id="resetAllFiltersBtn"
              data-action="reset-all"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Restablecer</span>
            </button>
          `
              : ''
          }
        </div>

        <!-- Dynamic Match Count Badge -->
        <div class="inline-flex items-center gap-1.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            matchCount > 0
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }">
            <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${matchCount > 0 ? 'bg-slate-600' : 'bg-rose-500'}"></span>
            ${escapeHtml(matchSummary)}
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the high-level visual Grid View (Relational Cards).
 */
export function renderCertificateGrid(records: CertificateRecord[]): string {
  if (records.length === 0) {
    return '';
  }

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${records
        .map((rec) => {
          const statusVisual = getOperationalStatusVisual(rec.estatus);
          const coverageVisual = getCoverageVisual(rec.cobertura_porcentaje);

          return `
            <article class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
              <!-- Card Header: Code & Operational Status -->
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 select-all">
                      ${escapeHtml(rec.numero_certificado)}
                    </span>
                    ${
                      rec.multisitio
                        ? `
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200" title="Esquema Multisitio">
                        <span>🏢</span>
                        <span>Multisitio</span>
                      </span>
                    `
                        : ''
                    }
                  </div>
                  <h3 class="text-base font-bold text-slate-900 tracking-tight leading-snug pt-1">
                    ${escapeHtml(rec.organizacion_nombre)}
                  </h3>
                </div>

                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusVisual.badgeClass}"
                  title="Estatus de certificación: ${escapeHtml(statusVisual.label)}"
                >
                  <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                  <span>${escapeHtml(statusVisual.label)}</span>
                </span>
              </div>

              <!-- Metadata Chips: RIF, Scheme & Sites -->
              <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/75 p-3 rounded-lg border border-slate-100">
                <div>
                  <span class="text-slate-600 block text-[10px] uppercase font-semibold">Identificación Fiscal</span>
                  <span class="font-mono font-medium text-slate-800">${escapeHtml(rec.organizacion_rif)}</span>
                </div>
                <div>
                  <span class="text-slate-600 block text-[10px] uppercase font-semibold">Norma Certificable</span>
                  <span class="font-medium text-slate-800">${escapeHtml(rec.norma)}</span>
                </div>
                <div class="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span class="text-slate-600 text-[11px]">${escapeHtml(rec.esquema)}</span>
                  <span class="text-[11px] font-medium text-slate-700 inline-flex items-center gap-1">
                    <span>📍</span>
                    <span>${rec.sitios_count} ${rec.sitios_count === 1 ? 'sede auditada' : 'sedes auditadas'}</span>
                  </span>
                </div>
              </div>

              <!-- Normative Compliance Engine Progress -->
              <div class="space-y-1.5 pt-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-slate-700 inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Cobertura Normativa ISO</span>
                  </span>
                  <span class="font-bold text-xs ${coverageVisual.textClass}">
                    ${rec.cobertura_porcentaje}%
                  </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
                  <div
                    class="h-full rounded-full transition-all duration-300 ${coverageVisual.barClass}"
                    style="width: ${Math.min(100, Math.max(0, rec.cobertura_porcentaje))}%"
                  ></div>
                </div>

                <!-- Progress Breakdown -->
                ${
                  rec.cobertura_resumen
                    ? `
                  <div class="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span>${rec.cobertura_resumen.covered} cubiertos · ${rec.cobertura_resumen.nonApplicable} no aplicables</span>
                    <span class="${rec.cobertura_resumen.pending > 0 ? 'text-amber-700 font-medium' : 'text-slate-600'}">
                      ${rec.cobertura_resumen.pending} pendientes
                    </span>
                  </div>
                `
                    : ''
                }
              </div>

              <!-- Card Footer: Validity & Quick Inspect -->
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>Vigencia: ${rec.fecha_vencimiento || '2027-03-14'}</span>
                <span class="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
                  <span>Detalles</span>
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

/**
 * Renders the high-density tabular List View for rapid comparative inspection.
 */
export function renderCertificateList(records: CertificateRecord[]): string {
  if (records.length === 0) {
    return '';
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <th scope="col" class="py-3 px-4">N° Certificado</th>
              <th scope="col" class="py-3 px-4">Organización & RIF</th>
              <th scope="col" class="py-3 px-4">Norma / Esquema</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
              <th scope="col" class="py-3 px-4 text-center">Estructura</th>
              <th scope="col" class="py-3 px-4 min-w-[160px]">Cobertura ISO</th>
              <th scope="col" class="py-3 px-4 text-right">Vencimiento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${records
              .map((rec) => {
                const statusVisual = getOperationalStatusVisual(rec.estatus);
                const coverageVisual = getCoverageVisual(rec.cobertura_porcentaje);

                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <!-- Certificate Code -->
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        ${escapeHtml(rec.numero_certificado)}
                      </span>
                    </td>

                    <!-- Company Name & RIF -->
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-slate-900">${escapeHtml(rec.organizacion_nombre)}</div>
                      <div class="font-mono text-[11px] text-slate-600">${escapeHtml(rec.organizacion_rif)}</div>
                    </td>

                    <!-- Standard & Scheme -->
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <div class="font-semibold text-slate-800">${escapeHtml(rec.norma)}</div>
                      <div class="text-[11px] text-slate-600">${escapeHtml(rec.esquema)}</div>
                    </td>

                    <!-- Operational Status -->
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusVisual.badgeClass}">
                        <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                        <span>${escapeHtml(statusVisual.label)}</span>
                      </span>
                    </td>

                    <!-- Sites & Multisitio -->
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <span>${rec.multisitio ? '🏢' : '📍'}</span>
                        <span>${rec.sitios_count} ${rec.sitios_count === 1 ? 'sede' : 'sedes'}</span>
                      </span>
                    </td>

                    <!-- Coverage Progress Bar -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center justify-between text-[11px] mb-1">
                        <span class="font-medium text-slate-700">${rec.cobertura_porcentaje}%</span>
                        <span class="text-slate-600">${rec.cobertura_resumen ? `${rec.cobertura_resumen.covered}/${rec.cobertura_resumen.total}` : ''}</span>
                      </div>
                      <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                        <div
                          class="h-full rounded-full ${coverageVisual.barClass}"
                          style="width: ${Math.min(100, Math.max(0, rec.cobertura_porcentaje))}%"
                        ></div>
                      </div>
                    </td>

                    <!-- Expiration Date -->
                    <td class="py-3.5 px-4 text-right whitespace-nowrap font-mono text-[11px] text-slate-600">
                      ${rec.fecha_vencimiento || '2027-03-14'}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Renders a clean empty state when search criteria or facets yield no matches.
 */
export function renderEmptySearchState(query: string): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center space-y-4">
      <div class="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <div class="space-y-1">
        <h4 class="text-base font-bold text-slate-900">
          No se encontraron certificados coincidentes
        </h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          ${
            query
              ? `No hay registros que coincidan con "<span class="font-semibold text-slate-800">${escapeHtml(query)}</span>" con los filtros seleccionados.`
              : 'No hay certificados que coincidan con la combinación de filtros seleccionada.'
          }
        </p>
      </div>
      <button
        type="button"
        data-action="reset-all"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Restablecer búsqueda y filtros</span>
      </button>
    </div>
  `;
}
