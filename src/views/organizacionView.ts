import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  countActiveCertificates,
  filterOrganizaciones,
  formatActiveCertificateBadge,
  getCertificatesByOrganizacion,
  type CertificadoSummary,
  type OrganizacionEntity,
  type OrganizacionFilterOptions,
} from '../lib/activeCertificates';
import {
  cycleSortDirection,
  renderSortIndicator,
  type SortDirection,
} from '../lib/universalTemplate';

export interface OrganizacionViewState {
  selectedOrganizacionId: string | null;
  query: string;
  hasActiveCertificates: 'ALL' | 'WITH_ACTIVE' | 'WITHOUT_ACTIVE';
  selectedSectorIaf: string;
  viewMode: 'grid' | 'list';
  sortColumn: 'nombre' | 'rif' | 'certificados_activos' | 'sector' | null;
  sortDirection: SortDirection;
  isEditingAttributes: boolean;
  activeChildTab: 'certificados';
  editFormData?: Partial<OrganizacionEntity>;
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
}

export interface OrganizacionViewProps {
  profile: UserProfile;
  state: OrganizacionViewState;
  organizaciones: OrganizacionEntity[];
  certificados: CertificadoSummary[];
  loading?: boolean;
}

export function renderOrganizacionView(props: OrganizacionViewProps): string {
  const { profile, state, organizaciones, certificados, loading } = props;
  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';

  // If an organization is selected, render the Standardized 4-Zone Detail Page
  if (state.selectedOrganizacionId) {
    const org =
      organizaciones.find((o) => o.id === state.selectedOrganizacionId) ||
      organizaciones[0];
    if (org) {
      return renderOrganizacionDetailView({
        profile,
        state,
        org,
        certificados,
        isStaff,
      });
    }
  }

  // Otherwise render Universal List / Grid Directory View
  return renderOrganizacionDirectoryView({
    profile,
    state,
    organizaciones,
    certificados,
    isStaff,
    loading,
  });
}

/**
 * Renders the Universal List / Grid Directory View for Organizaciones
 */
function renderOrganizacionDirectoryView(props: {
  profile: UserProfile;
  state: OrganizacionViewState;
  organizaciones: OrganizacionEntity[];
  certificados: CertificadoSummary[];
  isStaff: boolean;
  loading?: boolean;
}): string {
  const { state, organizaciones, certificados, loading } = props;

  // Filter & sort organizations
  const filteredOrgs = filterOrganizaciones(organizaciones, certificados, {
    query: state.query,
    hasActiveCertificates: state.hasActiveCertificates,
    selectedSectorIaf: state.selectedSectorIaf,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
  });

  const totalOrgs = organizaciones.length;
  const matchCount = filteredOrgs.length;

  // Compute unique IAF sectors represented across organizations
  const sectorMap = new Map<number, string>();
  organizaciones.forEach((o) => {
    if (o.sector_iaf_numero) {
      sectorMap.set(
        o.sector_iaf_numero,
        o.sector_principal || `Sector ${o.sector_iaf_numero}`
      );
    }
  });

  const sectorEntries = Array.from(sectorMap.entries()).sort(
    ([a], [b]) => a - b
  );

  return `
    <div class="space-y-6">
      <!-- Header Banner & Operational Context -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1.5">
            <span>🏢</span>
            <span>DOMINIO CERTIFICACIÓN · FASE 4.1</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">Directorio de Organizaciones Clientes</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Empresas titulares de sistemas de gestión certificados, RIF fiscal y métricas de certificados activos bajo ISO/IEC 17021-1:2015
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Total organizations badge -->
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs">
            <span class="text-slate-400">Total:</span>
            <span class="font-mono text-slate-900">${totalOrgs}</span>
            <span class="text-slate-400">empresas</span>
          </span>
        </div>
      </div>

      <!-- Main Directory Layout: Sidebar Facets + Content Area -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <!-- Sidebar Facets Panel -->
        <aside aria-label="Filtros y Facetas" class="lg:col-span-1 space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Filtros y Facetas</span>
              </h3>
              ${
                state.query ||
                state.hasActiveCertificates !== 'ALL' ||
                state.selectedSectorIaf !== 'ALL'
                  ? `
                <button
                  type="button"
                  id="resetOrgFiltersBtn"
                  class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Restablecer
                </button>
              `
                  : ''
              }
            </div>

            <!-- Facet 1: Active Certificate Presence -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-700">Certificados Activos</label>
              <div class="space-y-1">
                <button
                  type="button"
                  data-org-filter-active="ALL"
                  class="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    state.hasActiveCertificates === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todas las Empresas</span>
                  <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    state.hasActiveCertificates === 'ALL'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-200 text-slate-700'
                  }">
                    ${totalOrgs}
                  </span>
                </button>

                <button
                  type="button"
                  data-org-filter-active="WITH_ACTIVE"
                  class="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    state.hasActiveCertificates === 'WITH_ACTIVE'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span class="flex items-center gap-1.5">
                    <span class="text-emerald-500 ${state.hasActiveCertificates === 'WITH_ACTIVE' ? 'text-white' : ''}">●</span>
                    <span>Con Certificados Activos</span>
                  </span>
                  <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    state.hasActiveCertificates === 'WITH_ACTIVE'
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-slate-200 text-slate-700'
                  }">
                    ${
                      organizaciones.filter(
                        (o) => countActiveCertificates(certificados, o.id) > 0
                      ).length
                    }
                  </span>
                </button>

                <button
                  type="button"
                  data-org-filter-active="WITHOUT_ACTIVE"
                  class="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    state.hasActiveCertificates === 'WITHOUT_ACTIVE'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span class="flex items-center gap-1.5">
                    <span class="text-slate-400 ${state.hasActiveCertificates === 'WITHOUT_ACTIVE' ? 'text-white' : ''}">○</span>
                    <span>Sin Certificados Activos</span>
                  </span>
                  <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    state.hasActiveCertificates === 'WITHOUT_ACTIVE'
                      ? 'bg-slate-900 text-slate-100'
                      : 'bg-slate-200 text-slate-700'
                  }">
                    ${
                      organizaciones.filter(
                        (o) => countActiveCertificates(certificados, o.id) === 0
                      ).length
                    }
                  </span>
                </button>
              </div>
            </div>

            <!-- Facet 2: Primary Sector IAF -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold text-slate-700">Sector Económico / IAF</label>
              <div class="space-y-1">
                <button
                  type="button"
                  data-org-filter-sector="ALL"
                  class="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    state.selectedSectorIaf === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos los Sectores</span>
                </button>

                ${sectorEntries
                  .map(([secNum, secDesc]) => {
                    const isSelected =
                      state.selectedSectorIaf === String(secNum);
                    const count = organizaciones.filter(
                      (o) => o.sector_iaf_numero === secNum
                    ).length;
                    return `
                    <button
                      type="button"
                      data-org-filter-sector="${secNum}"
                      class="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }"
                      title="${escapeHtml(secDesc)}"
                    >
                      <span class="truncate pr-2">Sector ${secNum} · ${escapeHtml(secDesc)}</span>
                      <span class="text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                        isSelected
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-200 text-slate-700'
                      }">
                        ${count}
                      </span>
                    </button>
                  `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Content Area: Search Bar + Layout Toggle + Records View -->
        <main class="lg:col-span-3 space-y-4">
          <!-- Controls Bar -->
          <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <!-- Search Input with Keyboard Shortcut hints -->
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span aria-hidden="true">🔍</span>
              </div>
              <input
                type="text"
                id="orgSearchInput"
                value="${escapeHtml(state.query)}"
                placeholder="Buscar por Razón Social, RIF, contacto o dirección... (/ para enfocar)"
                class="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
              />
              ${
                state.query
                  ? `
                <button
                  type="button"
                  id="clearOrgSearchBtn"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpiar búsqueda (Esc)"
                >
                  ✕
                </button>
              `
                  : ''
              }
            </div>

            <!-- View Mode Switcher -->
            <div class="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                data-org-view-mode="grid"
                class="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  state.viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
                title="Vista en Tarjetas Cuadrícula"
              >
                <span>⊞</span>
                <span class="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                type="button"
                data-org-view-mode="list"
                class="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  state.viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
                title="Vista en Tabla Detallada"
              >
                <span>☰</span>
                <span class="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>

          <!-- Active Filter Pill Summary -->
          <div class="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Mostrando <strong class="text-slate-900">${matchCount}</strong> de <strong class="text-slate-900">${totalOrgs}</strong> organizaciones clientes
            </span>
            ${
              state.sortColumn && state.sortDirection !== 'none'
                ? `
              <span class="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                Orden: <strong>${escapeHtml(state.sortColumn)}</strong> (${state.sortDirection === 'asc' ? 'Ascendente' : 'Descendente'})
              </span>
            `
                : ''
            }
          </div>

          <!-- Records Area -->
          ${
            loading
              ? `
            <div class="p-12 text-center bg-white rounded-xl border border-slate-200">
              <div class="inline-block animate-spin text-2xl mb-2">⌛</div>
              <p class="text-xs text-slate-500 font-medium">Cargando directorio de organizaciones clientes...</p>
            </div>
          `
              : matchCount === 0
              ? renderEmptyState(state)
              : state.viewMode === 'grid'
              ? renderGridView(filteredOrgs, certificados)
              : renderListView(filteredOrgs, certificados, state)
          }
        </main>
      </div>
    </div>
  `;
}

/**
 * Empty search or filter state
 */
function renderEmptyState(state: OrganizacionViewState): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
      <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
        🏢
      </div>
      <h3 class="text-sm font-bold text-slate-900">No se encontraron organizaciones</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        No hay empresas clientes que coincidan con "${escapeHtml(state.query || 'los filtros aplicados')}".
      </p>
      <div>
        <button
          type="button"
          id="resetOrgFiltersBtn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span>Limpiar filtros de búsqueda</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Grid Presentation Mode for Organizaciones
 */
function renderGridView(
  orgs: OrganizacionEntity[],
  certificados: CertificadoSummary[]
): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${orgs
        .map((org) => {
          const activeCount = countActiveCertificates(certificados, org.id);
          const activeBadge = formatActiveCertificateBadge(activeCount);
          const totalOrgCerts = getCertificatesByOrganizacion(certificados, org.id).length;

          return `
          <div
            data-action="select-org"
            data-org-id="${escapeHtml(org.id)}"
            class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <!-- Card Header -->
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-base" aria-hidden="true">🏢</span>
                    <h4 class="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                      ${escapeHtml(org.nombre)}
                    </h4>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      RIF: ${escapeHtml(org.rif)}
                    </span>
                    <span class="text-[10px] text-slate-400">·</span>
                    <span class="text-[11px] font-medium text-slate-500 truncate">
                      ${escapeHtml(org.grupo_corporativo || 'Independiente')}
                    </span>
                  </div>
                </div>

                <!-- Active certificate badge -->
                <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${activeBadge.badgeClass}">
                  <span>${activeBadge.symbol}</span>
                  <span>${activeCount} Activos</span>
                </span>
              </div>

              <!-- Sector IAF Badge -->
              <div class="pt-1">
                <span class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  <span>💻</span>
                  <span>Sector ${org.sector_iaf_numero || '—'}: ${escapeHtml(org.sector_principal || 'No especificado')}</span>
                </span>
              </div>
            </div>

            <!-- Card Attributes -->
            <div class="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Contacto:</span>
                <span class="font-medium text-slate-800">${escapeHtml(org.contacto_principal || 'No registrado')}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Correo:</span>
                <span class="font-mono text-slate-700 truncate max-w-[180px]">${escapeHtml(org.correo_contacto || '—')}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Teléfono:</span>
                <span class="font-mono text-slate-700">${escapeHtml(org.telefono_contacto || '—')}</span>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[11px] text-slate-500">
                Total Certificados: <strong class="text-slate-900">${totalOrgCerts}</strong>
              </span>
              <span class="text-xs font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
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
 * Tabular List Presentation Mode with Excel-style Column Sorting
 */
function renderListView(
  orgs: OrganizacionEntity[],
  certificados: CertificadoSummary[],
  state: OrganizacionViewState
): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <!-- Column 1: Organización (Sortable) -->
              <th
                scope="col"
                data-action="sort-org"
                data-sort-col="nombre"
                class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div class="flex items-center gap-1.5">
                  <span>Organización</span>
                  ${renderSortIndicator(state.sortColumn === 'nombre' ? state.sortDirection : 'none')}
                </div>
              </th>

              <!-- Column 2: RIF / NIF (Sortable) -->
              <th
                scope="col"
                data-action="sort-org"
                data-sort-col="rif"
                class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div class="flex items-center gap-1.5">
                  <span>RIF / NIF</span>
                  ${renderSortIndicator(state.sortColumn === 'rif' ? state.sortDirection : 'none')}
                </div>
              </th>

              <!-- Column 3: Contacto Principal -->
              <th scope="col" class="py-3 px-4">
                <span>Contacto Principal</span>
              </th>

              <!-- Column 4: Sector IAF (Sortable) -->
              <th
                scope="col"
                data-action="sort-org"
                data-sort-col="sector"
                class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div class="flex items-center gap-1.5">
                  <span>Sector Principal</span>
                  ${renderSortIndicator(state.sortColumn === 'sector' ? state.sortDirection : 'none')}
                </div>
              </th>

              <!-- Column 5: Certificados Activos (Sortable) -->
              <th
                scope="col"
                data-action="sort-org"
                data-sort-col="certificados_activos"
                class="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div class="flex items-center justify-center gap-1.5">
                  <span>Certificados Activos</span>
                  ${renderSortIndicator(state.sortColumn === 'certificados_activos' ? state.sortDirection : 'none')}
                </div>
              </th>

              <!-- Column 6: Acciones -->
              <th scope="col" class="py-3 px-4 text-right">
                <span>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${orgs
              .map((org) => {
                const activeCount = countActiveCertificates(certificados, org.id);
                const activeBadge = formatActiveCertificateBadge(activeCount);
                const totalCerts = getCertificatesByOrganizacion(certificados, org.id).length;

                return `
                <tr
                  data-action="select-org"
                  data-org-id="${escapeHtml(org.id)}"
                  class="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <!-- Organización -->
                  <td class="py-3 px-4">
                    <div class="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      ${escapeHtml(org.nombre)}
                    </div>
                    <div class="text-[10px] text-slate-400">
                      ${escapeHtml(org.grupo_corporativo || 'Independiente')}
                    </div>
                  </td>

                  <!-- RIF -->
                  <td class="py-3 px-4 font-mono font-semibold text-slate-700">
                    <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ${escapeHtml(org.rif)}
                    </span>
                  </td>

                  <!-- Contacto -->
                  <td class="py-3 px-4">
                    <div class="font-medium text-slate-800">${escapeHtml(org.contacto_principal || '—')}</div>
                    <div class="text-[11px] text-slate-500 font-mono">${escapeHtml(org.correo_contacto || '')}</div>
                  </td>

                  <!-- Sector -->
                  <td class="py-3 px-4">
                    <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Sector ${org.sector_iaf_numero || '—'}: ${escapeHtml(org.sector_principal || 'General')}
                    </span>
                  </td>

                  <!-- Certificados Activos -->
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${activeBadge.badgeClass}">
                      <span>${activeBadge.symbol}</span>
                      <span>${activeCount} de ${totalCerts}</span>
                    </span>
                  </td>

                  <!-- Acciones -->
                  <td class="py-3 px-4 text-right">
                    <button
                      type="button"
                      data-action="select-org"
                      data-org-id="${escapeHtml(org.id)}"
                      class="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                    >
                      Ver Ficha →
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
 * Standardized 4-Zone Detail Page Architecture for Organización
 */
function renderOrganizacionDetailView(props: {
  profile: UserProfile;
  state: OrganizacionViewState;
  org: OrganizacionEntity;
  certificados: CertificadoSummary[];
  isStaff: boolean;
}): string {
  const { state, org, certificados, isStaff } = props;

  // Active certificates vs total certificates
  const activeCount = countActiveCertificates(certificados, org.id);
  const orgCertificates = getCertificatesByOrganizacion(certificados, org.id);
  const activeBadge = formatActiveCertificateBadge(activeCount);

  // Edit form state
  const isEditing = state.isEditingAttributes && isStaff;
  const currentFormData = state.editFormData || { ...org };

  return `
    <div class="space-y-6">
      <!-- Top Action Bar & Forensic Changelog Trigger -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-action="back-to-org-list"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver a Organizaciones</span>
        </button>

        <div class="flex items-center gap-2">
          <!-- Top-Right Changelog Trigger (Mandatory 🕒 Historial de Cambios) -->
          <button
            type="button"
            data-action="open-changelog"
            data-table-name="organizacion"
            data-record-id="${escapeHtml(org.id)}"
            data-entity-name="${escapeHtml(org.nombre)}"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Ver trazabilidad forense de mutaciones en public.audit_log"
          >
            <span>🕒</span>
            <span>Historial de Cambios</span>
          </button>
        </div>
      </div>

      <!-- Detail Card Container -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <!-- Main Header Banner -->
        <div class="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="inline-flex items-center gap-2">
                <span class="text-xl" aria-hidden="true">🏢</span>
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded">
                  ORGANIZACIÓN CLIENTE
                </span>
                <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  RIF: ${escapeHtml(org.rif)}
                </span>
              </div>
              <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">
                ${escapeHtml(org.nombre)}
              </h1>
              <p class="text-xs text-slate-500">
                Sector Principal: <strong>Sector ${org.sector_iaf_numero || '—'} · ${escapeHtml(org.sector_principal || 'No especificado')}</strong>
              </p>
            </div>

            <!-- Active certificate KPI pill -->
            <div class="flex flex-col sm:items-end gap-1">
              <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${activeBadge.badgeClass}">
                <span>${activeBadge.symbol}</span>
                <span>${activeBadge.label}</span>
              </span>
              <span class="text-[11px] text-slate-400">
                ${orgCertificates.length} certificado${orgCertificates.length === 1 ? '' : 's'} emitido${orgCertificates.length === 1 ? '' : 's'} en total
              </span>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- ZONE 1: PARENT DATA SECTION (UPPER ZONE - RELATIONAL METADATA) -->
          <section aria-labelledby="zone1-heading" class="space-y-3">
            <h3 id="zone1-heading" class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🔗</span>
              <span>ZONA 1: METADATOS RELACIONALES Y SECTOR ECONÓMICO</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Holding / Corporate Group -->
              <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-400">Grupo Corporativo / Holding:</span>
                <p class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>${escapeHtml(org.grupo_corporativo || 'Independiente (Sin Matriz Corporativa)')}</span>
                </p>
              </div>

              <!-- Primary Economic / IAF Sector with Interactive Navigation Link -->
              <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-400">Sector Económico Principal (IAF):</span>
                <p class="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <span>💻</span>
                  <button
                    type="button"
                    data-action="view-sector-iaf"
                    data-sector-number="${org.sector_iaf_numero || 17}"
                    class="hover:underline cursor-pointer font-bold text-left"
                    title="Hacer clic para inspeccionar sector técnico IAF"
                  >
                    Sector ${org.sector_iaf_numero || '—'} · ${escapeHtml(org.sector_principal || 'General')} →
                  </button>
                </p>
              </div>
            </div>
          </section>

          <!-- ZONE 2: VISUAL SEPARATOR (CLEAN MINIMAL RULE) -->
          <div class="relative py-1">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                DATOS DIRECTOS DE LA EMPRESA
              </span>
            </div>
          </div>

          <!-- ZONE 3: DIRECT RECORD ATTRIBUTES SECTION (MULTI-COLUMN VIEW / EDIT STATE) -->
          <section aria-labelledby="zone3-heading" class="space-y-4">
            <div class="flex items-center justify-between pb-1">
              <h3 id="zone3-heading" class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>📋</span>
                <span>ZONA 3: ATRIBUTOS FISCALES Y DE CONTACTO</span>
              </h3>

              ${
                isStaff
                  ? `
                <div class="flex items-center gap-2">
                  ${
                    isEditing
                      ? `
                    <button
                      type="button"
                      id="cancelEditOrgBtn"
                      class="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  `
                      : `
                    <button
                      type="button"
                      id="startEditOrgBtn"
                      class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>✏️</span>
                      <span>Editar Atributos</span>
                    </button>
                  `
                  }
                </div>
              `
                  : ''
              }
            </div>

            ${
              state.saveSuccessMessage
                ? `
              <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
                <span>✓</span>
                <span>${escapeHtml(state.saveSuccessMessage)}</span>
              </div>
            `
                : ''
            }

            ${
              state.editErrorMessage
                ? `
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
                <span>✕</span>
                <span>${escapeHtml(state.editErrorMessage)}</span>
              </div>
            `
                : ''
            }

            ${
              isEditing
                ? renderEditForm(org, currentFormData)
                : renderReadOnlyAttributes(org)
            }
          </section>

          <!-- ZONE 4: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE) -->
          <section aria-labelledby="zone4-heading" class="space-y-4 pt-4 border-t border-slate-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5">
                  <span>📜</span>
                  <span>Certificados (${orgCertificates.length})</span>
                </span>
              </div>

              <span class="text-xs text-slate-500">
                Auditorías activas y trazabilidad ISO 17021-1
              </span>
            </div>

            <!-- Child Tab 1: Certificados de la Organización -->
            ${renderChildCertificatesTable(orgCertificates, org)}
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * Read-Only Attributes Grid for Zone 3
 */
function renderReadOnlyAttributes(org: OrganizacionEntity): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Legal Name -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Razón Social:</span>
        <p class="text-xs font-bold text-slate-900">${escapeHtml(org.nombre)}</p>
      </div>

      <!-- RIF / NIF -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">RIF / NIF Fiscal:</span>
        <p class="text-xs font-mono font-bold text-slate-900">${escapeHtml(org.rif)}</p>
      </div>

      <!-- Website -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Sitio Web Corporativo:</span>
        <p class="text-xs font-medium text-slate-900">
          ${
            org.sitio_web
              ? `<a href="https://${escapeHtml(org.sitio_web.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline flex items-center gap-1">
                  <span>🌐</span>
                  <span>${escapeHtml(org.sitio_web)}</span>
                </a>`
              : '<span class="text-slate-400 italic">No especificado</span>'
          }
        </p>
      </div>

      <!-- Primary Contact -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Contacto Principal:</span>
        <p class="text-xs font-bold text-slate-900">${escapeHtml(org.contacto_principal || 'No registrado')}</p>
      </div>

      <!-- Email -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Correo Electrónico:</span>
        <p class="text-xs font-mono font-medium text-slate-800">${escapeHtml(org.correo_contacto || '—')}</p>
      </div>

      <!-- Phone -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Teléfono de Oficina:</span>
        <p class="text-xs font-mono font-medium text-slate-800">${escapeHtml(org.telefono_contacto || '—')}</p>
      </div>

      <!-- Fiscal Address (full width) -->
      <div class="md:col-span-3 p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Dirección Fiscal de la Sede Principal:</span>
        <p class="text-xs font-medium text-slate-800">${escapeHtml(org.direccion_fiscal || 'No especificada')}</p>
      </div>
    </div>
  `;
}

/**
 * Edit Mode Form for Zone 3
 */
function renderEditForm(
  org: OrganizacionEntity,
  formData: Partial<OrganizacionEntity>
): string {
  return `
    <form id="editOrgForm" class="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Razón Social -->
        <div class="space-y-1">
          <label for="edit_org_nombre" class="block text-xs font-bold text-slate-700">Razón Social *</label>
          <input
            type="text"
            id="edit_org_nombre"
            name="nombre"
            required
            value="${escapeHtml(formData.nombre || org.nombre)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- RIF / NIF -->
        <div class="space-y-1">
          <label for="edit_org_rif" class="block text-xs font-bold text-slate-700">RIF / NIF Fiscal *</label>
          <input
            type="text"
            id="edit_org_rif"
            name="rif"
            required
            value="${escapeHtml(formData.rif || org.rif)}"
            placeholder="Ej: J-40192831-2"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Sitio Web -->
        <div class="space-y-1">
          <label for="edit_org_sitio_web" class="block text-xs font-bold text-slate-700">Sitio Web</label>
          <input
            type="text"
            id="edit_org_sitio_web"
            name="sitio_web"
            value="${escapeHtml(formData.sitio_web || org.sitio_web || '')}"
            placeholder="www.empresa.com"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Contacto Principal -->
        <div class="space-y-1">
          <label for="edit_org_contacto" class="block text-xs font-bold text-slate-700">Contacto Principal</label>
          <input
            type="text"
            id="edit_org_contacto"
            name="contacto_principal"
            value="${escapeHtml(formData.contacto_principal || org.contacto_principal || '')}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Correo Electrónico -->
        <div class="space-y-1">
          <label for="edit_org_correo" class="block text-xs font-bold text-slate-700">Correo Electrónico</label>
          <input
            type="email"
            id="edit_org_correo"
            name="correo_contacto"
            value="${escapeHtml(formData.correo_contacto || org.correo_contacto || '')}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Teléfono -->
        <div class="space-y-1">
          <label for="edit_org_telefono" class="block text-xs font-bold text-slate-700">Teléfono</label>
          <input
            type="text"
            id="edit_org_telefono"
            name="telefono_contacto"
            value="${escapeHtml(formData.telefono_contacto || org.telefono_contacto || '')}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Grupo Corporativo -->
        <div class="space-y-1">
          <label for="edit_org_grupo" class="block text-xs font-bold text-slate-700">Grupo Corporativo / Holding</label>
          <input
            type="text"
            id="edit_org_grupo"
            name="grupo_corporativo"
            value="${escapeHtml(formData.grupo_corporativo || org.grupo_corporativo || '')}"
            placeholder="Independiente"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Dirección Fiscal (Span 2) -->
        <div class="md:col-span-2 space-y-1">
          <label for="edit_org_direccion" class="block text-xs font-bold text-slate-700">Dirección Fiscal Sede Principal *</label>
          <input
            type="text"
            id="edit_org_direccion"
            name="direccion_fiscal"
            required
            value="${escapeHtml(formData.direccion_fiscal || org.direccion_fiscal || '')}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          id="cancelEditOrgBtn"
          class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          💾 Guardar Atributos
        </button>
      </div>
    </form>
  `;
}

/**
 * Child Tab 1: Certificados de la Organización
 */
function renderChildCertificatesTable(
  certificados: CertificadoSummary[],
  org: OrganizacionEntity
): string {
  if (certificados.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">📜</div>
        <h4 class="text-xs font-bold text-slate-800">No hay certificados registrados para esta organización</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          La organización ${escapeHtml(org.nombre)} aún no cuenta con certificados de conformidad expedidos o en estudio.
        </p>
      </div>
    `;
  }

  return `
    <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Código de Certificado</th>
              <th scope="col" class="py-3 px-4">Norma de Gestión</th>
              <th scope="col" class="py-3 px-4">Vigencia</th>
              <th scope="col" class="py-3 px-4 text-center">Sedes Multisitio</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
              <th scope="col" class="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${certificados
              .map((c) => {
                const estatusClean = (c.estatus || 'Activo').toLowerCase();
                let statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                if (estatusClean.includes('estudio') || estatusClean.includes('proceso')) {
                  statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                } else if (estatusClean.includes('suspendido')) {
                  statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                } else if (estatusClean.includes('cancelado') || estatusClean.includes('inactivo')) {
                  statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                }

                const emision = c.fecha_emision ? c.fecha_emision.slice(0, 4) : '2024';
                const vencimiento = c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 4) : '2027';

                return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Código -->
                  <td class="py-3 px-4 font-mono font-bold text-slate-900">
                    <button
                      type="button"
                      data-action="drilldown-to-cert"
                      data-cert-id="${escapeHtml(c.id)}"
                      data-cert-code="${escapeHtml(c.numero_certificado)}"
                      class="text-indigo-600 hover:text-indigo-800 hover:underline font-bold font-mono cursor-pointer flex items-center gap-1.5"
                      title="Navegar al certificado y añadir a la ruta de exploración"
                    >
                      <span>📜</span>
                      <span>${escapeHtml(c.numero_certificado)}</span>
                    </button>
                  </td>

                  <!-- Norma -->
                  <td class="py-3 px-4 font-semibold text-slate-800">
                    <span>${escapeHtml(c.norma)}</span>
                    ${
                      c.esquema
                        ? `<div class="text-[10px] text-slate-400 font-normal">${escapeHtml(c.esquema)}</div>`
                        : ''
                    }
                  </td>

                  <!-- Vigencia -->
                  <td class="py-3 px-4 font-mono text-slate-600">
                    ${emision} — ${vencimiento}
                  </td>

                  <!-- Sedes -->
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                      c.multisitio
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }">
                      ${c.multisitio ? `${c.sitios_count || 2} sedes multisitio` : 'Sede Principal (HQ)'}
                    </span>
                  </td>

                  <!-- Estatus -->
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClass}">
                      ${escapeHtml(c.estatus)}
                    </span>
                  </td>

                  <!-- Acción -->
                  <td class="py-3 px-4 text-right">
                    <button
                      type="button"
                      data-action="drilldown-to-cert"
                      data-cert-id="${escapeHtml(c.id)}"
                      data-cert-code="${escapeHtml(c.numero_certificado)}"
                      class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Inspeccionar →
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
