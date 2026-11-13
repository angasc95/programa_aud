import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  countMultisiteBranches,
  formatMultisiteBranchCountText,
  sortSitesWithPrincipalFirst,
  getProcessTypeVisual,
  filterCertificates,
  type CertificadoDetailEntity,
  type CertificadoViewState,
  type CertificadoChildTab,
  type SiteEntity,
  type ProcessEntity,
  type ShiftEntity,
  type NonApplicableRequirementEntity,
  type AuditEntity,
} from '../lib/multisiteSampling';

export type { CertificadoViewState, CertificadoChildTab };

export interface CertificadoViewProps {
  profile: UserProfile;
  state: CertificadoViewState;
  certificates: CertificadoDetailEntity[];
  loading?: boolean;
}

/**
 * Returns canonical operational status styling.
 */
function getStatusBadge(status: string): { label: string; badgeClass: string; dotClass: string } {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'ACTIVO':
    case 'VIGENTE':
      return {
        label: 'ACTIVO',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'ESTUDIO':
    case 'EN_PROCESO':
      return {
        label: 'EN ESTUDIO',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500',
      };
    case 'SUSPENDIDO':
      return {
        label: 'SUSPENDIDO',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'CANCELADO':
    case 'INACTIVO':
      return {
        label: 'CANCELADO',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        dotClass: 'bg-rose-500',
      };
    case 'PLANIFICADO':
    case 'PLANIFICADA':
      return {
        label: 'PLANIFICADO',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dotClass: 'bg-indigo-500',
      };
    case 'EN EJECUCIÓN':
    case 'EN EJECUCION':
      return {
        label: 'EN EJECUCIÓN',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        dotClass: 'bg-teal-500',
      };
    default:
      return {
        label: status || 'DESCONOCIDO',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
  }
}

/**
 * Primary view entry point: Renders either the universal directory or the 4-zone detail page.
 */
export function renderCertificadoView(props: CertificadoViewProps): string {
  const { profile, state, certificates, loading = false } = props;

  if (state.selectedCertId) {
    const selectedCert = certificates.find((c) => c.id === state.selectedCertId);
    if (selectedCert) {
      return renderCertificadoDetailPage(profile, state, selectedCert);
    }
  }

  return renderCertificadoDirectory(profile, state, certificates, loading);
}

/**
 * Renders the Universal List / Grid Directory View (Decluttered Clean Layout).
 * NOTE: The "Cobertura Normativa" column is strictly excluded from the list view.
 */
function renderCertificadoDirectory(
  profile: UserProfile,
  state: CertificadoViewState,
  allCertificates: CertificadoDetailEntity[],
  loading: boolean
): string {
  const filtered = filterCertificates(allCertificates, {
    query: state.query,
    selectedStandard: state.selectedStandard,
    selectedStatus: state.selectedStatus,
    selectedSectorIaf: state.selectedSectorIaf,
  });

  // Excel-style column sorting
  if (state.sortColumn && state.sortDirection !== 'none') {
    const factor = state.sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (state.sortColumn) {
        case 'numero_certificado':
          return factor * a.numero_certificado.localeCompare(b.numero_certificado);
        case 'organizacion':
          return factor * a.organizacion_nombre.localeCompare(b.organizacion_nombre);
        case 'norma':
          return factor * a.norma_codigo.localeCompare(b.norma_codigo);
        case 'estatus':
          return factor * a.estatus.localeCompare(b.estatus);
        case 'vigencia':
          return factor * (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || '');
        case 'sedes':
          return factor * (countMultisiteBranches(a.sitios) - countMultisiteBranches(b.sitios));
        default:
          return 0;
      }
    });
  }

  // Aggregate standard & status counts for sidebar facets
  const standardCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};

  for (const cert of allCertificates) {
    standardCounts[cert.norma_codigo] = (standardCounts[cert.norma_codigo] || 0) + 1;
    statusCounts[cert.estatus] = (statusCounts[cert.estatus] || 0) + 1;
    const secKey = String(cert.sector_iaf);
    sectorCounts[secKey] = (sectorCounts[secKey] || 0) + 1;
  }

  const renderSortArrow = (col: string) => {
    if (state.sortColumn !== col || state.sortDirection === 'none') {
      return '<span class="text-slate-300 ml-1">⇅</span>';
    }
    return state.sortDirection === 'asc'
      ? '<span class="text-slate-900 ml-1 font-bold">↑</span>'
      : '<span class="text-slate-900 ml-1 font-bold">↓</span>';
  };

  return `
    <div class="space-y-6">
      <!-- Header Banner -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <span>📜</span>
            <span>DOMINIO CERTIFICACIÓN · FASE 4.2</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Directorio de Certificados de Conformidad
          </h2>
          <p class="text-xs text-slate-600">
            Gestión de certificados emitidos bajo ISO/IEC 17021-1:2015, alcance técnico, sedes multisitio y trazabilidad
          </p>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 tabular-nums">
            Total: <strong>${allCertificates.length}</strong> certificados
          </span>
        </div>
      </div>

      <!-- Main Layout: Sidebar Facets + Content Viewport -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <!-- Sidebar Facets -->
        <aside class="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-5" aria-label="Filtros y Facetas">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡</span>
                <span>Filtros y Facetas</span>
              </h3>
              ${
                state.query || state.selectedStandard !== 'ALL' || state.selectedStatus !== 'ALL' || state.selectedSectorIaf !== 'ALL'
                  ? `
                <button
                  type="button"
                  id="resetCertFiltersBtn"
                  class="text-[11px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
                >
                  Restablecer
                </button>
              `
                  : ''
              }
            </div>

            <!-- Facet 1: Normas ISO -->
            <div class="space-y-2">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Norma de Gestión</span>
              <div class="space-y-1">
                <button
                  type="button"
                  data-cert-filter-standard="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    state.selectedStandard === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todas las Normas</span>
                  <span class="text-[10px] tabular-nums ${state.selectedStandard === 'ALL' ? 'text-slate-300' : 'text-slate-500'}">
                    ${allCertificates.length}
                  </span>
                </button>
                ${Object.entries(standardCounts)
                  .map(([std, count]) => `
                    <button
                      type="button"
                      data-cert-filter-standard="${escapeHtml(std)}"
                      class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        state.selectedStandard === std
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }"
                    >
                      <span class="truncate">${escapeHtml(std)}</span>
                      <span class="text-[10px] tabular-nums ${state.selectedStandard === std ? 'text-slate-300' : 'text-slate-500'}">
                        ${count}
                      </span>
                    </button>
                  `)
                  .join('')}
              </div>
            </div>

            <!-- Facet 2: Estatus del Certificado -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Estatus Operativo</span>
              <div class="space-y-1">
                <button
                  type="button"
                  data-cert-filter-status="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    state.selectedStatus === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos los Estatus</span>
                  <span class="text-[10px] tabular-nums ${state.selectedStatus === 'ALL' ? 'text-slate-300' : 'text-slate-500'}">
                    ${allCertificates.length}
                  </span>
                </button>
                ${Object.entries(statusCounts)
                  .map(([st, count]) => {
                    const statusVisual = getStatusBadge(st);
                    return `
                    <button
                      type="button"
                      data-cert-filter-status="${escapeHtml(st)}"
                      class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        state.selectedStatus.toUpperCase() === st.toUpperCase()
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }"
                    >
                      <span class="inline-flex items-center gap-1.5 truncate">
                        <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                        <span>${escapeHtml(st)}</span>
                      </span>
                      <span class="text-[10px] tabular-nums ${state.selectedStatus.toUpperCase() === st.toUpperCase() ? 'text-slate-300' : 'text-slate-500'}">
                        ${count}
                      </span>
                    </button>
                  `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Facet 3: Sector IAF -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sector Técnico IAF</span>
              <div class="space-y-1">
                <button
                  type="button"
                  data-cert-filter-iaf="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    state.selectedSectorIaf === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos los Sectores</span>
                </button>
                ${Object.entries(sectorCounts)
                  .map(([sec, count]) => `
                    <button
                      type="button"
                      data-cert-filter-iaf="${escapeHtml(sec)}"
                      class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        state.selectedSectorIaf === sec
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }"
                    >
                      <span>Sector IAF ${sec}</span>
                      <span class="text-[10px] tabular-nums ${state.selectedSectorIaf === sec ? 'text-slate-300' : 'text-slate-500'}">
                        ${count}
                      </span>
                    </button>
                  `)
                  .join('')}
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Directory: Search, Switcher & Data Grid/Table -->
        <div class="lg:col-span-3 space-y-4">
          <!-- Search Bar & View Switcher -->
          <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="relative flex-1 min-w-0">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span aria-hidden="true">🔍</span>
              </div>
              <input
                id="certDirectorySearchInput"
                type="text"
                autocomplete="off"
                value="${escapeHtml(state.query)}"
                placeholder="Buscar por N° Certificado, Empresa, RIF, alcance o norma... (/ para enfocar)"
                class="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              ${
                state.query
                  ? `
                <button
                  type="button"
                  id="clearCertSearchBtn"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Limpiar búsqueda (Esc)"
                >
                  ✕
                </button>
              `
                  : ''
              }
            </div>

            <!-- View Mode Switcher -->
            <div class="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                data-cert-view-mode="grid"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  state.viewMode === 'grid'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>⊞</span>
                <span>Tarjetas</span>
              </button>
              <button
                type="button"
                data-cert-view-mode="list"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  state.viewMode === 'list'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>☰</span>
                <span>Tabla</span>
              </button>
            </div>
          </div>

          <!-- Results Summary -->
          <div class="text-xs text-slate-500 px-1">
            Mostrando <strong>${filtered.length}</strong> de <strong>${allCertificates.length}</strong> certificados registrados
          </div>

          <!-- Dynamic Presentation View -->
          ${
            loading
              ? `
            <div class="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm font-medium">
              <div class="inline-block animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full mb-3"></div>
              <p>Cargando certificados emitidos...</p>
            </div>
          `
              : filtered.length === 0
              ? `
            <div class="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <span class="text-4xl block">🔍</span>
              <h4 class="text-base font-bold text-slate-900">No se encontraron certificados</h4>
              <p class="text-xs text-slate-500 max-w-md mx-auto">
                No hay registros que coincidan con la búsqueda "${escapeHtml(state.query)}" o los filtros aplicados.
              </p>
              <button
                type="button"
                id="resetCertFiltersBtn"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          `
              : state.viewMode === 'list'
              ? renderCleanCertificateListTable(filtered, renderSortArrow)
              : renderCertificateCardGrid(filtered)
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the decluttered clean List View.
 * MANDATORY RULE: The "Cobertura Normativa" column is STRICTLY EXCLUDED.
 * Columns: Organización, Código de Certificado, Norma, Sedes Multisitio (branch count), Estatus, Vigencia, Acciones.
 */
function renderCleanCertificateListTable(
  certificates: CertificadoDetailEntity[],
  renderSortArrow: (col: string) => string
): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <th scope="col" class="py-3 px-4 cursor-pointer hover:bg-slate-100/70" data-action="sort-cert" data-column="organizacion">
                Organización ${renderSortArrow('organizacion')}
              </th>
              <th scope="col" class="py-3 px-4 cursor-pointer hover:bg-slate-100/70" data-action="sort-cert" data-column="numero_certificado">
                Código de Certificado ${renderSortArrow('numero_certificado')}
              </th>
              <th scope="col" class="py-3 px-4 cursor-pointer hover:bg-slate-100/70" data-action="sort-cert" data-column="norma">
                Norma ${renderSortArrow('norma')}
              </th>
              <th scope="col" class="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70" data-action="sort-cert" data-column="sedes">
                Sedes Multisitio ${renderSortArrow('sedes')}
              </th>
              <th scope="col" class="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70" data-action="sort-cert" data-column="estatus">
                Estatus ${renderSortArrow('estatus')}
              </th>
              <th scope="col" class="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70" data-action="sort-cert" data-column="vigencia">
                Vigencia ${renderSortArrow('vigencia')}
              </th>
              <th scope="col" class="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${certificates
              .map((cert) => {
                const branchCount = countMultisiteBranches(cert.sitios);
                const branchText = formatMultisiteBranchCountText(branchCount);
                const statusVisual = getStatusBadge(cert.estatus);

                return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Organización Link (Zero-UUID) -->
                  <td class="py-3 px-4">
                    <button
                      type="button"
                      data-action="view-org-from-cert"
                      data-org-id="${cert.id_organizacion}"
                      class="text-left font-bold text-slate-900 hover:text-sky-700 transition-colors cursor-pointer group"
                    >
                      <span class="group-hover:underline">${escapeHtml(cert.organizacion_nombre)}</span>
                      <span class="block text-[11px] font-mono text-slate-500 font-normal">RIF: ${escapeHtml(cert.organizacion_rif)}</span>
                    </button>
                  </td>

                  <!-- Código de Certificado -->
                  <td class="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      data-action="select-cert"
                      data-cert-id="${cert.id}"
                      class="font-mono text-xs font-bold text-slate-900 bg-slate-100 hover:bg-sky-50 hover:text-sky-900 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      📜 ${escapeHtml(cert.numero_certificado)}
                    </button>
                  </td>

                  <!-- Norma -->
                  <td class="py-3 px-4 whitespace-nowrap">
                    <div class="font-semibold text-slate-800">${escapeHtml(cert.norma_codigo)}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(cert.esquema)}</div>
                  </td>

                  <!-- Sedes Multisitio (Principal Site 0 Excluded) -->
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      branchCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                    }">
                      <span>${branchCount > 0 ? '🏢' : '📍'}</span>
                      <span>${branchText}</span>
                    </span>
                  </td>

                  <!-- Estatus -->
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusVisual.badgeClass}">
                      <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                      <span>${escapeHtml(statusVisual.label)}</span>
                    </span>
                  </td>

                  <!-- Vigencia -->
                  <td class="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px] text-slate-600 tabular-nums">
                    ${escapeHtml(cert.fecha_emision)} — ${escapeHtml(cert.fecha_vencimiento)}
                  </td>

                  <!-- Acciones -->
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      data-action="select-cert"
                      data-cert-id="${cert.id}"
                      class="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspeccionar</span>
                      <span>→</span>
                    </button>
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
 * Renders the High-Density Cards Grid View.
 * NOTE: No Cobertura Normativa progress bar in the main list/grid view.
 */
function renderCertificateCardGrid(certificates: CertificadoDetailEntity[]): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${certificates
        .map((cert) => {
          const branchCount = countMultisiteBranches(cert.sitios);
          const branchText = formatMultisiteBranchCountText(branchCount);
          const statusVisual = getStatusBadge(cert.estatus);

          return `
          <div
            data-action="select-cert"
            data-cert-id="${cert.id}"
            class="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <!-- Card Header: Code & Status -->
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  📜 ${escapeHtml(cert.numero_certificado)}
                </span>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusVisual.badgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                  <span>${escapeHtml(statusVisual.label)}</span>
                </span>
              </div>

              <div>
                <h4 class="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                  ${escapeHtml(cert.organizacion_nombre)}
                </h4>
                <div class="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                  <span class="font-mono">RIF: ${escapeHtml(cert.organizacion_rif)}</span>
                  <span>·</span>
                  <span>${escapeHtml(cert.norma_codigo)}</span>
                </div>
              </div>
            </div>

            <!-- Card Body: Sector & Multisite Branch Count -->
            <div class="text-xs text-slate-600 bg-slate-50/75 p-3 rounded-lg border border-slate-100 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-slate-500 text-[11px]">Sector IAF ${cert.sector_iaf}:</span>
                <span class="font-medium text-slate-800 truncate max-w-[200px]" title="${escapeHtml(cert.sector_iaf_descripcion)}">
                  ${escapeHtml(cert.sector_iaf_descripcion)}
                </span>
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-slate-200/50">
                <span class="text-slate-500 text-[11px]">Esquema Multisitio:</span>
                <span class="font-medium text-slate-800 inline-flex items-center gap-1">
                  <span>${branchCount > 0 ? '🏢' : '📍'}</span>
                  <span>${branchText}</span>
                </span>
              </div>
            </div>

            <!-- Card Footer: Validity & Details Link -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span class="font-mono text-[11px] tabular-nums">Vigencia: ${escapeHtml(cert.fecha_vencimiento)}</span>
              <span class="font-semibold text-sky-700 group-hover:text-sky-900 inline-flex items-center gap-1">
                <span>Ver Ficha</span>
                <span>→</span>
              </span>
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

/**
 * Standardized 4-Zone Detail Page Architecture & 5 Specialized Child Tabs
 * Adheres strictly to ISO/IEC 17021-1:2015 and the 4-zone design blueprint:
 * Header: Forensic Changelog Trigger [🕒 Historial de Cambios]
 * Zone 1: Upper Relational Metadata (Parent Data Section)
 * Zone 2: Visual Separator
 * Zone 3: Direct Record Attributes with 10-1000 char counter for `alcance`
 * Zone 4: Five specialized child tabs (Sitios with Site 0 first, Procesos with `tipo`, Turnos, No Aplicables, Auditorías)
 */
function renderCertificadoDetailPage(
  profile: UserProfile,
  state: CertificadoViewState,
  cert: CertificadoDetailEntity
): string {
  const activeTab: CertificadoChildTab = state.activeChildTab || 'sitios';
  const statusVisual = getStatusBadge(cert.estatus);
  const isStaff =
    profile.status === 'APPROVED' &&
    (profile.role === 'ADMIN' || profile.role === 'WORKER');
  const isEditing = isStaff && state.isEditingAttributes;

  const currentAlcance = isEditing
    ? state.editFormData?.alcance ?? cert.alcance
    : cert.alcance;
  const alcanceLength = currentAlcance.length;
  const isAlcanceTooShort = alcanceLength < 10;
  const isAlcanceTooLong = alcanceLength > 1000;

  // Enforce Site 0 sorting algorithm for Tab 1
  const sortedSites = sortSitesWithPrincipalFirst(cert.sitios);

  return `
    <div class="space-y-6">
      <!-- Top Action Bar: Back Navigation + Forensic Changelog Modal Trigger -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          data-action="back-to-cert-list"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-start"
        >
          <span>←</span>
          <span>Volver a Certificados</span>
        </button>

        <button
          type="button"
          data-action="open-changelog"
          data-table-name="certificado"
          data-record-id="${cert.id}"
          data-entity-name="${escapeHtml(cert.numero_certificado)}"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>🕒</span>
          <span>Historial de Cambios</span>
        </button>
      </div>

      <!-- Main Detail Card -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <!-- Hero Header -->
        <div class="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                📜 CERTIFICADO DE CONFORMIDAD
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusVisual.badgeClass}">
                <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                <span>${escapeHtml(statusVisual.label)}</span>
              </span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">
              ${escapeHtml(cert.numero_certificado)}
            </h1>
            <p class="text-xs text-slate-300">
              ${escapeHtml(cert.norma_titulo)} (${escapeHtml(cert.norma_codigo)})
            </p>
          </div>

          <div class="text-left md:text-right space-y-1">
            <div class="text-xs text-slate-400">Organización Titular</div>
            <button
              type="button"
              data-action="view-org-from-cert"
              data-org-id="${cert.id_organizacion}"
              class="text-sm font-bold text-sky-400 hover:text-sky-300 cursor-pointer block underline"
            >
              ${escapeHtml(cert.organizacion_nombre)}
            </button>
            <div class="text-[11px] font-mono text-slate-400">RIF: ${escapeHtml(cert.organizacion_rif)}</div>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- ZONE 1: UPPER ZONE - RELATIONAL METADATA (PARENT DATA SECTION) -->
          <section aria-labelledby="zone1-title" class="space-y-3">
            <h3 id="zone1-title" class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔗</span>
              <span>ZONA 1: METADATOS RELACIONALES Y ACREDITACIÓN (ISO/IEC 17021-1:2015)</span>
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Item 1: Organización -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Organización Titular:</span>
                <button
                  type="button"
                  data-action="view-org-from-cert"
                  data-org-id="${cert.id_organizacion}"
                  class="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer text-left"
                >
                  <span>🏢</span>
                  <span class="hover:underline">${escapeHtml(cert.organizacion_nombre)}</span>
                  <span>→</span>
                </button>
              </div>

              <!-- Item 2: Norma Aplicable -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Norma Aplicable:</span>
                <button
                  type="button"
                  data-action="view-norma-from-cert"
                  data-norma-id="${cert.id_norma}"
                  class="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer text-left"
                >
                  <span>📘</span>
                  <span class="hover:underline">${escapeHtml(cert.norma_codigo)}</span>
                  <span>→</span>
                </button>
              </div>

              <!-- Item 3: Sector IAF -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Sector IAF:</span>
                <button
                  type="button"
                  data-action="view-iaf-from-cert"
                  data-sector-id="${cert.id_sector_iaf}"
                  class="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer text-left"
                >
                  <span>🏭</span>
                  <span class="hover:underline">Sector ${cert.sector_iaf} · ${escapeHtml(cert.sector_iaf_descripcion)}</span>
                  <span>→</span>
                </button>
              </div>

              <!-- Item 4: Sub-Sector IAF & Riesgo -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Sub-Sector IAF & Riesgo:</span>
                <p class="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                  <span>⚙️</span>
                  <span>${escapeHtml(cert.subsector_iaf_codigo || '17.1')} ${escapeHtml(cert.subsector_iaf_descripcion || 'Metales básicos')}</span>
                  ${
                    cert.subsector_categoria_riesgo
                      ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">${cert.subsector_categoria_riesgo}</span>`
                      : ''
                  }
                </p>
              </div>

              <!-- Item 5: Organismo Acreditador -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Organismo Acreditador:</span>
                <p class="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>${escapeHtml(cert.organismo_acreditador_codigo || 'ENAC')} (${escapeHtml(cert.numero_acreditacion || '01/C-SC001')})</span>
                </p>
              </div>

              <!-- Item 6: Estatus Canónico -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Estatus del Certificado:</span>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${statusVisual.badgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                  <span>${escapeHtml(cert.estatus)}</span>
                </span>
              </div>
            </div>
          </section>

          <!-- ZONE 2: VISUAL SEPARATOR (CLEAN MINIMAL RULE) -->
          <div class="relative py-2" role="separator">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="bg-white px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                DECLARACIÓN TÉCNICA Y ATRIBUTOS DIRECTOS
              </span>
            </div>
          </div>

          <!-- ZONE 3: DIRECT RECORD ATTRIBUTES SECTION (VIEW / EDIT STATE) -->
          <section aria-labelledby="zone3-title" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 id="zone3-title" class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span>
                <span>ZONA 3: ATRIBUTOS DIRECTOS Y DECLARACIÓN DE ALCANCE</span>
              </h3>
              ${
                isStaff
                  ? !isEditing
                    ? `
                <button
                  type="button"
                  id="startEditCertBtn"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Editar Alcance y Atributos</span>
                </button>
              `
                    : `
                <button
                  type="button"
                  id="cancelEditCertBtn"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  <span>✕</span>
                  <span>Cancelar Edición</span>
                </button>
              `
                  : ''
              }
            </div>

            <!-- Error or Success Message Feedback -->
            ${
              state.editErrorMessage
                ? `
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                ⚠️ ${escapeHtml(state.editErrorMessage)}
              </div>
            `
                : ''
            }
            ${
              state.saveSuccessMessage
                ? `
              <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
                ✓ ${escapeHtml(state.saveSuccessMessage)}
              </div>
            `
                : ''
            }

            ${
              !isEditing
                ? `
              <!-- Read-only View State -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Número de Certificado:</span>
                  <p class="font-mono text-xs font-bold text-slate-900">${escapeHtml(cert.numero_certificado)}</p>
                </div>
                <div class="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Fecha de Emisión:</span>
                  <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(cert.fecha_emision)}</p>
                </div>
                <div class="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Fecha de Vencimiento:</span>
                  <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(cert.fecha_vencimiento)}</p>
                </div>

                <!-- Alcance Block with Counter Display -->
                <div class="col-span-1 md:col-span-3 p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-slate-500 block">
                      Alcance de la Certificación (ISO/IEC 17021-1:2015 cláusula 8.2.2):
                    </span>
                    <span class="text-xs font-mono font-medium text-slate-500 tabular-nums">
                      (${cert.alcance.length} / 1000 caracteres)
                    </span>
                  </div>
                  <p class="text-xs text-slate-800 leading-relaxed font-sans bg-white p-3.5 rounded border border-slate-200/80">
                    ${escapeHtml(cert.alcance)}
                  </p>
                </div>
              </div>
            `
                : `
              <!-- Edit Form State with Live Counter -->
              <form id="editCertForm" class="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label for="editCertFechaEmision" class="text-xs font-bold text-slate-700">Fecha de Emisión *</label>
                    <input
                      type="date"
                      id="editCertFechaEmision"
                      name="fecha_emision"
                      value="${escapeHtml(state.editFormData?.fecha_emision || cert.fecha_emision)}"
                      required
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <label for="editCertFechaVencimiento" class="text-xs font-bold text-slate-700">Fecha de Vencimiento *</label>
                    <input
                      type="date"
                      id="editCertFechaVencimiento"
                      name="fecha_vencimiento"
                      value="${escapeHtml(state.editFormData?.fecha_vencimiento || cert.fecha_vencimiento)}"
                      required
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label for="editCertAlcanceInput" class="text-xs font-bold text-slate-700">
                      Declaración de Alcance de la Certificación (10 a 1000 caracteres) *
                    </label>
                    <span
                      id="certAlcanceLiveCounter"
                      class="text-xs font-mono font-bold tabular-nums ${
                        isAlcanceTooShort || isAlcanceTooLong ? 'text-rose-600' : 'text-slate-600'
                      }"
                    >
                      (${alcanceLength} / 1000 caracteres)
                    </span>
                  </div>
                  <textarea
                    id="editCertAlcanceInput"
                    name="alcance"
                    rows="4"
                    required
                    minlength="10"
                    maxlength="1000"
                    class="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-sans focus:ring-2 focus:ring-slate-900 focus:outline-none leading-relaxed ${
                      isAlcanceTooShort || isAlcanceTooLong ? 'border-rose-300 focus:ring-rose-500' : ''
                    }"
                  >${escapeHtml(currentAlcance)}</textarea>
                  ${
                    isAlcanceTooShort
                      ? `<p id="alcanceLengthError" class="text-[11px] text-rose-600 font-medium">⚠️ El texto debe tener al menos 10 caracteres.</p>`
                      : ''
                  }
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    id="cancelEditCertBtnSecondary"
                    class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="saveCertBtn"
                    class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    💾 Guardar Cambios
                  </button>
                </div>
              </form>
            `
            }
          </section>

          <!-- ZONE 4: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE) -->
          <section aria-labelledby="zone4-title" class="space-y-4 pt-4 border-t border-slate-100">
            <h3 id="zone4-title" class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>📑</span>
              <span>ZONA 4: PESTAÑAS RELACIONALES ESPECIALIZADAS (5 MÓDULOS HIJOS)</span>
            </h3>

            <!-- 5 Child Tab Navigation Buttons -->
            <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200" role="tablist">
              <button
                type="button"
                data-cert-tab="sitios"
                role="tab"
                aria-selected="${activeTab === 'sitios' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'sitios'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>🏢</span>
                <span>Sitios (${cert.sitios.length})</span>
              </button>

              <button
                type="button"
                data-cert-tab="procesos"
                role="tab"
                aria-selected="${activeTab === 'procesos' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'procesos'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>⚙️</span>
                <span>Procesos (${cert.procesos.length})</span>
              </button>

              <button
                type="button"
                data-cert-tab="turnos"
                role="tab"
                aria-selected="${activeTab === 'turnos' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'turnos'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>⏱️</span>
                <span>Turnos (${cert.turnos.length})</span>
              </button>

              <button
                type="button"
                data-cert-tab="no_aplicables"
                role="tab"
                aria-selected="${activeTab === 'no_aplicables' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'no_aplicables'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>🚫</span>
                <span>No Aplicables (${cert.noAplicables.length})</span>
              </button>

              <button
                type="button"
                data-cert-tab="auditorias"
                role="tab"
                aria-selected="${activeTab === 'auditorias' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'auditorias'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>📋</span>
                <span>Auditorías (${cert.auditorias.length})</span>
              </button>
            </div>

            <!-- Active Child Tab Content -->
            <div class="pt-2">
              ${renderActiveChildTab(activeTab, sortedSites, cert)}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * Dispatches and renders one of the 5 specialized child tabs.
 */
function renderActiveChildTab(
  tab: CertificadoChildTab,
  sortedSites: SiteEntity[],
  cert: CertificadoDetailEntity
): string {
  switch (tab) {
    case 'sitios':
      return renderSitiosChildTab(sortedSites);
    case 'procesos':
      return renderProcesosChildTab(cert.procesos);
    case 'turnos':
      return renderTurnosChildTab(cert.turnos);
    case 'no_aplicables':
      return renderNoAplicablesChildTab(cert.noAplicables);
    case 'auditorias':
      return renderAuditoriasChildTab(cert.auditorias);
    default:
      return renderSitiosChildTab(sortedSites);
  }
}

/**
 * TAB 1: Sitios (public.sitio)
 * MANDATORY REQUIREMENT: Site 0 (Headquarters) is ALWAYS RENDERED FIRST with the primary badge `★ Sede Central / Principal`.
 */
function renderSitiosChildTab(sites: SiteEntity[]): string {
  if (sites.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay sedes o plantas registradas para este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">N° Sede</th>
              <th scope="col" class="py-3 px-4">Nombre de la Sede</th>
              <th scope="col" class="py-3 px-4">Tipo de Sede</th>
              <th scope="col" class="py-3 px-4">Dirección Física</th>
              <th scope="col" class="py-3 px-4 text-center">Personal</th>
              <th scope="col" class="py-3 px-4">Turnos Asignados</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${sites
              .map((site) => {
                const isHq = site.numero_sitio === 0;

                return `
                <tr class="hover:bg-slate-50/70 transition-colors ${isHq ? 'bg-sky-50/30' : ''}">
                  <!-- Site Number -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <span class="font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      isHq
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }">
                      Sede #${site.numero_sitio}
                    </span>
                  </td>

                  <!-- Site Name -->
                  <td class="py-3.5 px-4 font-bold text-slate-900">
                    <div class="flex items-center gap-1.5">
                      <span>${isHq ? '🏢' : '📍'}</span>
                      <span>${escapeHtml(site.nombre_sitio)}</span>
                    </div>
                    ${
                      site.actividades
                        ? `<p class="text-[11px] text-slate-500 font-normal pt-0.5 line-clamp-1">${escapeHtml(site.actividades)}</p>`
                        : ''
                    }
                  </td>

                  <!-- Site Type Badge: HQ has prominent star badge -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    ${
                      isHq
                        ? `
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                        <span>★</span>
                        <span>Sede Central / Principal</span>
                      </span>
                    `
                        : `
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <span>Sucursal Operativa</span>
                      </span>
                    `
                    }
                  </td>

                  <!-- Physical Address -->
                  <td class="py-3.5 px-4 text-slate-700">
                    <p class="max-w-xs truncate" title="${escapeHtml(site.direccion_sitio)}">
                      ${escapeHtml(site.direccion_sitio)}
                    </p>
                  </td>

                  <!-- Personal Count -->
                  <td class="py-3.5 px-4 text-center whitespace-nowrap tabular-nums font-mono font-medium text-slate-700">
                    ${site.personal_count !== undefined ? `${site.personal_count} personas` : '—'}
                  </td>

                  <!-- Linked Shifts -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <div class="flex flex-wrap gap-1">
                      ${(site.turnos_vinculados || ['Turno Diurno'])
                        .map(
                          (t) => `
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          ${escapeHtml(t)}
                        </span>
                      `
                        )
                        .join('')}
                    </div>
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
 * TAB 2: Procesos (public.proceso)
 * Displays processes tagged with their mandatory `tipo` classification badge (`Estratégico`, `Medular`, `De Apoyo`, `Otro`)
 * and expandable normative clauses (`requisito`).
 */
function renderProcesosChildTab(procesos: ProcessEntity[]): string {
  if (procesos.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay procesos del sistema de gestión registrados para este certificado.
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-500 px-1">
        Procesos operativos y estratégicos declarados bajo el esquema de certificación:
      </div>

      <div class="grid grid-cols-1 gap-3">
        ${procesos
          .map((proc) => {
            const visual = getProcessTypeVisual(proc.tipo);

            return `
            <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <!-- Process Header: Name, Tipo & Responsible -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div class="flex items-center gap-2">
                  <span class="text-base">${visual.icon}</span>
                  <h4 class="text-sm font-bold text-slate-900">${escapeHtml(proc.nombre_proceso)}</h4>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${visual.badgeClass}">
                    <span>${visual.icon}</span>
                    <span>${escapeHtml(visual.label)}</span>
                  </span>
                  ${
                    proc.responsable
                      ? `<span class="text-[11px] text-slate-500 font-medium">Resp: ${escapeHtml(proc.responsable)}</span>`
                      : ''
                  }
                </div>
              </div>

              <!-- Mapped Requirements (Requisitos / Cláusulas ISO) -->
              <div class="space-y-1.5">
                <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Cláusulas y Requisitos Normativos Mapeados:
                </span>
                <div class="flex flex-wrap gap-2">
                  ${
                    proc.requisitos_detalle && proc.requisitos_detalle.length > 0
                      ? proc.requisitos_detalle
                          .map(
                            (req) => `
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs" title="${escapeHtml(req.titulo)}">
                          <span class="font-mono font-bold text-sky-800">Cláusula ${escapeHtml(req.codigo)}</span>
                          <span class="text-slate-400">·</span>
                          <span class="text-slate-700 truncate max-w-xs">${escapeHtml(req.titulo)}</span>
                        </div>
                      `
                          )
                          .join('')
                      : proc.clausulas_cubiertas
                          .map(
                            (c) => `
                        <span class="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-800">
                          Cláusula ${escapeHtml(c)}
                        </span>
                      `
                          )
                          .join('')
                  }
                </div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>
  `;
}

/**
 * TAB 3: Turnos (public.turno)
 * Operational shifts, schedules, active employee counts, and shift descriptions per site.
 */
function renderTurnosChildTab(turnos: ShiftEntity[]): string {
  if (turnos.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay turnos productivos configurados para las sedes de este certificado.
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${turnos
        .map((turno) => `
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-sm text-slate-900">${escapeHtml(turno.descripcion)}</h4>
            <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 tabular-nums">
              ⏱️ ${escapeHtml(turno.hora_entrada)} — ${escapeHtml(turno.hora_salida)}
            </span>
          </div>

          <div class="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500">Personal en Turno:</span>
              <span class="font-mono font-semibold text-slate-800 tabular-nums">
                ${turno.empleados_activos !== undefined ? `${turno.empleados_activos} trabajadores` : 'Estimado normal'}
              </span>
            </div>
            <div class="pt-1">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sedes con este Horario:</span>
              <div class="flex flex-wrap gap-1">
                ${turno.sitios_vinculados
                  .map(
                    (s) => `
                  <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                    📍 ${escapeHtml(s)}
                  </span>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `)
        .join('')}
    </div>
  `;
}

/**
 * TAB 4: No Aplicables (public.requisitos_no_aplicables_certificado)
 * Excluded ISO 9001 clause 4.3 records displaying requirement codes, titles, and mandatory non-empty justification text.
 */
function renderNoAplicablesChildTab(noAplicables: NonApplicableRequirementEntity[]): string {
  if (noAplicables.length === 0) {
    return `
      <div class="p-8 text-center text-slate-600 text-xs bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
        <span class="text-2xl block">✓</span>
        <h4 class="text-sm font-bold text-emerald-900">Aplicabilidad Completa</h4>
        <p class="text-xs text-emerald-700 max-w-md mx-auto">
          Este certificado aplica la totalidad de los requisitos de la norma evaluada sin exclusiones declaradas bajo la cláusula 4.3.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <strong>Exclusiones Normativas Declaradas:</strong> De conformidad con la cláusula 4.3 de las normas ISO,
        la organización debe justificar técnicamente cualquier requisito no aplicable que no afecte la conformidad del producto o servicio.
      </div>

      <div class="space-y-3">
        ${noAplicables
          .map((item) => `
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5">
                <div class="inline-flex items-center gap-1.5">
                  <span class="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 font-mono text-xs font-bold rounded">
                    Cláusula ${escapeHtml(item.requisito_codigo)}
                  </span>
                  <span class="text-xs font-bold text-slate-900">${escapeHtml(item.requisito_titulo)}</span>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                NO APLICABLE
              </span>
            </div>

            <div class="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-500 block">
                Justificación Técnica Obligatoria:
              </span>
              <p class="text-slate-800 leading-relaxed font-sans">
                ${escapeHtml(item.justificacion)}
              </p>
            </div>
          </div>
        `)
          .join('')}
      </div>
    </div>
  `;
}

/**
 * TAB 5: Auditorías (public.auditoria)
 * Chronological history and scheduled future audits linked to the certificate.
 */
function renderAuditoriasChildTab(auditorias: AuditEntity[]): string {
  if (auditorias.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay auditorías registradas para este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Código Auditoría</th>
              <th scope="col" class="py-3 px-4">Modalidad</th>
              <th scope="col" class="py-3 px-4">Metodología</th>
              <th scope="col" class="py-3 px-4">Fecha Programada</th>
              <th scope="col" class="py-3 px-4">Auditor Líder</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditorias
              .map((aud) => {
                const isCompleted = aud.estatus === 'Completada' || aud.estatus === 'Cerrada';
                return `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    📋 ${escapeHtml(aud.codigo_auditoria)}
                  </td>
                  <td class="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    ${escapeHtml(aud.tipo_auditoria)}
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      ${escapeHtml(aud.metodologia)}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums whitespace-nowrap">
                    ${escapeHtml(aud.fecha_programacion)}
                  </td>
                  <td class="py-3 px-4 text-slate-800 whitespace-nowrap">
                    ${escapeHtml(aud.auditor_lider)}
                  </td>
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }">
                      <span>${isCompleted ? '✓' : '🕒'}</span>
                      <span>${escapeHtml(aud.estatus)}</span>
                    </span>
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
