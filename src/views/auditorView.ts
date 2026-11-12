import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  countDistinctAccreditedStandards,
  countDistinctQualifiedSectors,
  countDistinctQualifiedSubsectors,
  filterAuditors,
  getAuditRoleVisual,
  getCredentialValidityState,
  getQualificationStatusVisual,
  type AuditorChildTab,
  type AuditorDetailEntity,
  type AuditorViewState,
  type CompetenciaAuditorEntity,
  type AuditoriaRealizadaEntity,
} from '../lib/competencyMatrix';

export type { AuditorViewState, AuditorChildTab };

export interface AuditorViewProps {
  profile: UserProfile;
  state: AuditorViewState;
  auditors: AuditorDetailEntity[];
  loading?: boolean;
}

export function renderAuditorView(props: AuditorViewProps): string {
  const { profile, state, auditors, loading = false } = props;

  if (state.selectedAuditorId) {
    const selectedAuditor = auditors.find((a) => a.id === state.selectedAuditorId);
    if (selectedAuditor) {
      return renderAuditorDetailPage(profile, state, selectedAuditor);
    }
  }

  return renderAuditorDirectory(profile, state, auditors, loading);
}

/**
 * Renders the Universal List / Grid Directory View for Auditores
 */
function renderAuditorDirectory(
  profile: UserProfile,
  state: AuditorViewState,
  allAuditors: AuditorDetailEntity[],
  loading: boolean
): string {
  const filtered = filterAuditors(allAuditors, {
    query: state.query,
    selectedCalificacion: state.selectedCalificacion,
    selectedStandard: state.selectedStandard,
    selectedSectorIaf: state.selectedSectorIaf,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
  });

  // Calculate facet distributions
  const calificacionCounts: Record<string, number> = {};
  const standardCounts: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};

  for (const aud of allAuditors) {
    calificacionCounts[aud.calificacion] = (calificacionCounts[aud.calificacion] || 0) + 1;
    for (const std of aud.normas_acreditadas) {
      standardCounts[std] = (standardCounts[std] || 0) + 1;
    }
    for (const sec of aud.sectores_iaf) {
      const secKey = String(sec);
      sectorCounts[secKey] = (sectorCounts[secKey] || 0) + 1;
    }
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
      <!-- Header Banner & Regulatory Context -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
            <span>👤</span>
            <span>DOMINIO CERTIFICACIÓN · FASE 4.3</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Directorio de Auditores y Matriz de Competencias
          </h2>
          <p class="text-xs text-slate-600">
            Cuerpo de evaluadores técnicos calificados bajo ISO/IEC 17021-1:2015 cláusula 7.2 e ISO 19011:2018
          </p>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 tabular-nums">
            Total: <strong>${allAuditors.length}</strong> auditores
          </span>
        </div>
      </div>

      <!-- Main Directory Layout: Sidebar Facets + Content Area -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <!-- Sidebar Facets Panel -->
        <aside class="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-5" aria-label="Filtros y Facetas">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡</span>
                <span>Filtros y Facetas</span>
              </h3>
              ${
                state.query ||
                state.selectedCalificacion !== 'ALL' ||
                state.selectedStandard !== 'ALL' ||
                state.selectedSectorIaf !== 'ALL'
                  ? `
                <button
                  type="button"
                  id="resetAuditorFiltersBtn"
                  class="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Restablecer
                </button>
              `
                  : ''
              }
            </div>

            <!-- Facet 1: Calificación Status -->
            <div class="space-y-2">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Calificación</span>
              <div class="space-y-1">
                <button
                  type="button"
                  data-auditor-filter-calificacion="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    state.selectedCalificacion === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todas las Calificaciones</span>
                  <span class="text-[10px] tabular-nums ${state.selectedCalificacion === 'ALL' ? 'text-slate-300' : 'text-slate-500'}">
                    ${allAuditors.length}
                  </span>
                </button>
                ${['Calificado', 'En Entrenamiento', 'Observador']
                  .map((cal) => {
                    const visual = getQualificationStatusVisual(cal);
                    const count = calificacionCounts[cal] || 0;
                    const isSelected = state.selectedCalificacion === cal;
                    return `
                    <button
                      type="button"
                      data-auditor-filter-calificacion="${escapeHtml(cal)}"
                      class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }"
                    >
                      <span class="inline-flex items-center gap-1.5 truncate">
                        <span class="w-1.5 h-1.5 rounded-full ${visual.dotClass}"></span>
                        <span>${escapeHtml(cal)}</span>
                      </span>
                      <span class="text-[10px] tabular-nums ${isSelected ? 'text-slate-300' : 'text-slate-500'}">
                        ${count}
                      </span>
                    </button>
                  `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Facet 2: Normas Acreditadas -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Norma de Gestión</span>
              <div class="space-y-1">
                <button
                  type="button"
                  data-auditor-filter-standard="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    state.selectedStandard === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todas las Normas</span>
                </button>
                ${Object.entries(standardCounts)
                  .map(([std, count]) => `
                    <button
                      type="button"
                      data-auditor-filter-standard="${escapeHtml(std)}"
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

            <!-- Facet 3: Sector Técnico IAF -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sector Técnico IAF</span>
              <div class="space-y-1">
                <button
                  type="button"
                  data-auditor-filter-iaf="ALL"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    state.selectedSectorIaf === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }"
                >
                  <span>Todos los Sectores</span>
                </button>
                ${Object.entries(sectorCounts)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([sec, count]) => `
                    <button
                      type="button"
                      data-auditor-filter-iaf="${escapeHtml(sec)}"
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
        <main class="lg:col-span-3 space-y-4">
          <!-- Controls Bar -->
          <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="relative flex-1 min-w-0">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span aria-hidden="true">🔍</span>
              </div>
              <input
                id="auditorDirectorySearchInput"
                type="search"
                value="${escapeHtml(state.query)}"
                placeholder="Buscar por Nombre, credencial, email o especialidad... (/ para enfocar)"
                class="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              ${
                state.query
                  ? `
                <button
                  type="button"
                  id="clearAuditorSearchBtn"
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
                data-auditor-view-mode="grid"
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
                data-auditor-view-mode="list"
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
            Mostrando <strong>${filtered.length}</strong> de <strong>${allAuditors.length}</strong> evaluadores registrados
          </div>

          <!-- Dynamic Presentation View -->
          ${
            loading
              ? `
            <div class="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm font-medium">
              <div class="inline-block animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full mb-3"></div>
              <p>Cargando cuerpo de auditores y competencias...</p>
            </div>
          `
              : filtered.length === 0
              ? `
            <div class="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <span class="text-4xl block">🔍</span>
              <h4 class="text-base font-bold text-slate-900">No se encontraron auditores</h4>
              <p class="text-xs text-slate-500 max-w-md mx-auto">
                No hay auditores que coincidan con la búsqueda "${escapeHtml(state.query)}" o los filtros aplicados.
              </p>
              <button
                type="button"
                id="resetAuditorFiltersBtn"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          `
              : state.viewMode === 'list'
              ? renderAuditorListTable(filtered, renderSortArrow)
              : renderAuditorCardGrid(filtered)
          }
        </main>
      </div>
    </div>
  `;
}

/**
 * Renders the High-Density Cards Grid View for Auditors
 */
function renderAuditorCardGrid(auditors: AuditorDetailEntity[]): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${auditors
        .map((auditor) => {
          const statusVisual = getQualificationStatusVisual(auditor.calificacion);
          const distinctSectors = countDistinctQualifiedSectors(auditor.competencias);
          const distinctSubsectors = countDistinctQualifiedSubsectors(auditor.competencias);

          return `
          <div
            data-action="select-auditor"
            data-auditor-id="${auditor.id}"
            class="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <!-- Card Header: Name, Credential & Status -->
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="space-y-1 flex-1 min-w-0">
                  <span class="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    🪪 ${escapeHtml(auditor.codigo_credencial)}
                  </span>
                  <h4 class="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                    ${escapeHtml(auditor.nombre)}
                  </h4>
                  <p class="text-xs text-slate-500 line-clamp-1">
                    ${escapeHtml(auditor.titulo_profesional)}
                  </p>
                </div>

                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${statusVisual.badgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                  <span>${escapeHtml(statusVisual.label)}</span>
                </span>
              </div>
            </div>

            <!-- Card Body: Accredited Standards & Sector Scopes -->
            <div class="text-xs text-slate-600 bg-slate-50/75 p-3 rounded-lg border border-slate-100 space-y-2">
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Normas Acreditadas:</span>
                <div class="flex flex-wrap gap-1">
                  ${auditor.normas_acreditadas
                    .map(
                      (n) => `
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-800 border border-slate-200">
                      📘 ${escapeHtml(n)}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-slate-200/50">
                <span class="text-slate-500 text-[11px]">Sectores IAF Calificados:</span>
                <span class="font-medium text-slate-800 inline-flex items-center gap-1">
                  <span>🏭</span>
                  <span>${distinctSectors} sectores (${distinctSubsectors} subsectores)</span>
                </span>
              </div>
            </div>

            <!-- Card Footer: Contact & Details Link -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span class="font-mono text-[11px] truncate max-w-[180px]">✉️ ${escapeHtml(auditor.email)}</span>
              <span class="font-semibold text-indigo-700 group-hover:text-indigo-900 inline-flex items-center gap-1">
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
 * Renders the Tabular List View for Auditors
 */
function renderAuditorListTable(
  auditors: AuditorDetailEntity[],
  renderSortArrow: (col: string) => string
): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <th scope="col" class="py-3 px-4 cursor-pointer hover:bg-slate-100/70" data-action="sort-auditor" data-column="nombre">
                Auditor ${renderSortArrow('nombre')}
              </th>
              <th scope="col" class="py-3 px-4 cursor-pointer hover:bg-slate-100/70" data-action="sort-auditor" data-column="codigo_credencial">
                Credencial ${renderSortArrow('codigo_credencial')}
              </th>
              <th scope="col" class="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70" data-action="sort-auditor" data-column="calificacion">
                Calificación ${renderSortArrow('calificacion')}
              </th>
              <th scope="col" class="py-3 px-4 cursor-pointer hover:bg-slate-100/70" data-action="sort-auditor" data-column="normas">
                Normas Acreditadas ${renderSortArrow('normas')}
              </th>
              <th scope="col" class="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70" data-action="sort-auditor" data-column="sectores">
                Sectores IAF ${renderSortArrow('sectores')}
              </th>
              <th scope="col" class="py-3 px-4 text-right">Contacto</th>
              <th scope="col" class="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditors
              .map((auditor) => {
                const statusVisual = getQualificationStatusVisual(auditor.calificacion);
                const distinctSectors = countDistinctQualifiedSectors(auditor.competencias);

                return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Name & Title -->
                  <td class="py-3 px-4">
                    <button
                      type="button"
                      data-action="select-auditor"
                      data-auditor-id="${auditor.id}"
                      class="text-left font-bold text-slate-900 hover:text-indigo-700 transition-colors cursor-pointer group"
                    >
                      <span class="group-hover:underline text-sm font-bold">${escapeHtml(auditor.nombre)}</span>
                      <span class="block text-[11px] text-slate-500 font-normal line-clamp-1">${escapeHtml(auditor.titulo_profesional)}</span>
                    </button>
                  </td>

                  <!-- Credential Code -->
                  <td class="py-3 px-4 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                    <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ${escapeHtml(auditor.codigo_credencial)}
                    </span>
                  </td>

                  <!-- Qualification Status Badge -->
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusVisual.badgeClass}">
                      <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                      <span>${escapeHtml(statusVisual.label)}</span>
                    </span>
                  </td>

                  <!-- Accredited Standards -->
                  <td class="py-3 px-4">
                    <div class="flex flex-wrap gap-1 max-w-xs">
                      ${auditor.normas_acreditadas
                        .map(
                          (n) => `
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          ${escapeHtml(n)}
                        </span>
                      `
                        )
                        .join('')}
                    </div>
                  </td>

                  <!-- Sectors IAF Count -->
                  <td class="py-3 px-4 text-center whitespace-nowrap font-semibold text-slate-800">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <span>🏭</span>
                      <span>${distinctSectors} sectores</span>
                    </span>
                  </td>

                  <!-- Contact -->
                  <td class="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px] text-slate-600">
                    <div>${escapeHtml(auditor.email)}</div>
                    <div class="text-slate-400">${escapeHtml(auditor.telefono)}</div>
                  </td>

                  <!-- Acciones -->
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      data-action="select-auditor"
                      data-auditor-id="${auditor.id}"
                      class="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Ficha</span>
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
 * Standardized 4-Zone Detail Page Architecture & Competency Matrix
 * Zone 1: Parent Data Section (Accreditation Body & Professional Category)
 * Zone 2: Visual Separator
 * Zone 3: Direct Record Attributes (View / Edit Mode with Credential, Bio & Contacts)
 * Zone 4: Multipage Child Tabs (Tab 1: Matriz de Competencias, Tab 2: Historial de Auditorías)
 */
function renderAuditorDetailPage(
  profile: UserProfile,
  state: AuditorViewState,
  auditor: AuditorDetailEntity
): string {
  const activeTab: AuditorChildTab = state.activeChildTab || 'competencias';
  const statusVisual = getQualificationStatusVisual(auditor.calificacion);
  const isStaff =
    profile.status === 'APPROVED' &&
    (profile.role === 'ADMIN' || profile.role === 'WORKER');
  const isEditing = isStaff && state.isEditingAttributes;

  const currentBio = isEditing
    ? state.editFormData?.biografia ?? auditor.biografia
    : auditor.biografia;

  return `
    <div class="space-y-6">
      <!-- Top Action Bar: Back Navigation + Forensic Changelog Trigger -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          data-action="back-to-auditor-list"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-start"
        >
          <span>←</span>
          <span>Volver a Auditores</span>
        </button>

        <button
          type="button"
          data-action="open-changelog"
          data-table-name="auditor"
          data-record-id="${auditor.id}"
          data-entity-name="${escapeHtml(auditor.nombre)}"
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
              <span class="text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                📋 AUDITOR TÉCNICO CALIFICADO
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusVisual.badgeClass}">
                <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                <span>${escapeHtml(statusVisual.label)}</span>
              </span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">
              ${escapeHtml(auditor.nombre)}
            </h1>
            <p class="text-xs text-slate-300">
              ${escapeHtml(auditor.titulo_profesional)}
            </p>
          </div>

          <div class="text-left md:text-right space-y-1">
            <span class="font-mono text-xs font-bold text-slate-200 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 inline-block">
              🪪 ${escapeHtml(auditor.codigo_credencial)}
            </span>
            <div class="text-[11px] text-slate-400">${escapeHtml(auditor.instituto_registro)}</div>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- ZONE 1: UPPER ZONE - RELATIONAL METADATA (PARENT DATA SECTION) -->
          <section aria-labelledby="zone1-auditor-title" class="space-y-3">
            <h3 id="zone1-auditor-title" class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔗</span>
              <span>ZONA 1: METADATOS RELACIONALES Y REGISTRO PROFESIONAL (ISO/IEC 17021-1:2015)</span>
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Item 1: Instituto de Registro -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Instituto de Registro / Acreditación:</span>
                <p class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>${escapeHtml(auditor.instituto_registro)}</span>
                </p>
              </div>

              <!-- Item 2: Categoría Profesional -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Categoría Profesional Principal:</span>
                <p class="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <span>★</span>
                  <span>${escapeHtml(auditor.categoria_profesional)}</span>
                </p>
              </div>

              <!-- Item 3: Estatus de Calificación -->
              <div class="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-500 block">Estado de Calificación Operativa:</span>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${statusVisual.badgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
                  <span>${escapeHtml(auditor.calificacion)}</span>
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
                ATRIBUTOS PROFESIONALES Y CREDENCIALES
              </span>
            </div>
          </div>

          <!-- ZONE 3: DIRECT RECORD ATTRIBUTES SECTION (VIEW / EDIT STATE) -->
          <section aria-labelledby="zone3-auditor-title" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 id="zone3-auditor-title" class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span>
                <span>ZONA 3: ATRIBUTOS DIRECTOS Y PERFIL PROFESIONAL</span>
              </h3>
              ${
                isStaff
                  ? !isEditing
                    ? `
                <button
                  type="button"
                  id="startEditAuditorBtn"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Editar Perfil</span>
                </button>
              `
                    : `
                <button
                  type="button"
                  id="cancelEditAuditorBtn"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  <span>✕</span>
                  <span>Cancelar Edición</span>
                </button>
              `
                  : ''
              }
            </div>

            <!-- Feedback Notifications -->
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
              <!-- Read-only View -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Código de Credencial:</span>
                  <p class="font-mono text-xs font-bold text-slate-900">${escapeHtml(auditor.codigo_credencial)}</p>
                </div>
                <div class="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Correo Electrónico:</span>
                  <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(auditor.email)}</p>
                </div>
                <div class="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Teléfono de Contacto:</span>
                  <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(auditor.telefono)}</p>
                </div>

                <!-- Biography Block -->
                <div class="col-span-1 md:col-span-3 p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">
                    Biografía y Resumen Profesional (ISO 19011:2018):
                  </span>
                  <p class="text-xs text-slate-800 leading-relaxed font-sans bg-white p-3.5 rounded border border-slate-200/80">
                    ${escapeHtml(auditor.biografia || 'Sin biografía registrada.')}
                  </p>
                </div>
              </div>
            `
                : `
              <!-- Edit Form -->
              <form id="editAuditorForm" class="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="space-y-1">
                    <label for="editAuditorTitulo" class="text-xs font-bold text-slate-700">Título Profesional *</label>
                    <input
                      type="text"
                      id="editAuditorTitulo"
                      name="titulo_profesional"
                      value="${escapeHtml(state.editFormData?.titulo_profesional || auditor.titulo_profesional)}"
                      required
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <label for="editAuditorEmail" class="text-xs font-bold text-slate-700">Correo Electrónico *</label>
                    <input
                      type="email"
                      id="editAuditorEmail"
                      name="email"
                      value="${escapeHtml(state.editFormData?.email || auditor.email)}"
                      required
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <label for="editAuditorTelefono" class="text-xs font-bold text-slate-700">Teléfono *</label>
                    <input
                      type="text"
                      id="editAuditorTelefono"
                      name="telefono"
                      value="${escapeHtml(state.editFormData?.telefono || auditor.telefono)}"
                      required
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label for="editAuditorBio" class="text-xs font-bold text-slate-700">
                    Biografía y Resumen Profesional
                  </label>
                  <textarea
                    id="editAuditorBio"
                    name="biografia"
                    rows="3"
                    class="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-sans focus:ring-2 focus:ring-slate-900 focus:outline-none leading-relaxed"
                  >${escapeHtml(currentBio)}</textarea>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    id="cancelEditAuditorBtnSecondary"
                    class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
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
          <section aria-labelledby="zone4-auditor-title" class="space-y-4 pt-4 border-t border-slate-100">
            <h3 id="zone4-auditor-title" class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>📑</span>
              <span>ZONA 4: PESTAÑAS RELACIONALES (MATRIZ DE COMPETENCIAS E HISTORIAL DE AUDITORÍAS)</span>
            </h3>

            <!-- 2 Child Tab Navigation Buttons -->
            <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200" role="tablist">
              <button
                type="button"
                data-auditor-tab="competencias"
                role="tab"
                aria-selected="${activeTab === 'competencias' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'competencias'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>🛡️</span>
                <span>Matriz de Competencias (${auditor.competencias.length})</span>
              </button>

              <button
                type="button"
                data-auditor-tab="historial"
                role="tab"
                aria-selected="${activeTab === 'historial' ? 'true' : 'false'}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeTab === 'historial'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span>📋</span>
                <span>Historial de Auditorías (${auditor.historialAuditorias.length})</span>
              </button>
            </div>

            <!-- Active Child Tab Content -->
            <div class="pt-2">
              ${
                activeTab === 'competencias'
                  ? renderCompetenciasChildTab(auditor.competencias, profile.role === 'ADMIN')
                  : renderHistorialChildTab(auditor.historialAuditorias)
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * TAB 1: Matriz de Competencias Normativas y de Sector (public.competencia_auditor)
 */
function renderCompetenciasChildTab(
  competencies: CompetenciaAuditorEntity[],
  isAdmin: boolean
): string {
  if (competencies.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <span class="text-2xl block">🛡️</span>
        <p class="font-bold text-slate-800">Sin competencias técnicas registradas</p>
        <p class="text-slate-500">Este auditor aún no cuenta con cualificaciones vinculadas bajo ISO 17021-1.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Alcance normativo y sectorial calificado bajo ISO/IEC 17021-1:</span>
        ${
          isAdmin
            ? `
          <button
            type="button"
            data-action="open-add-competency-modal"
            class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <span>+</span>
            <span>Asignar Nueva Competencia</span>
          </button>
        `
            : ''
        }
      </div>

      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <th scope="col" class="py-3 px-4">Norma de Gestión</th>
                <th scope="col" class="py-3 px-4">Sector Técnico IAF</th>
                <th scope="col" class="py-3 px-4">Sub-Sector Técnico</th>
                <th scope="col" class="py-3 px-4 text-center">Rol Calificado</th>
                <th scope="col" class="py-3 px-4 text-center">Vigencia Credencial</th>
                <th scope="col" class="py-3 px-4 text-right">N° Folio</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${competencies
                .map((comp) => {
                  const roleVisual = getAuditRoleVisual(comp.rol_calificado);
                  const validityState = getCredentialValidityState(comp.fecha_vencimiento);

                  let validityBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (validityState === 'Por Vencer') {
                    validityBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else if (validityState === 'Vencido') {
                    validityBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                  }

                  return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <!-- Norma -->
                    <td class="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      📘 ${escapeHtml(comp.norma_codigo)}
                    </td>

                    <!-- Sector IAF -->
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <span>🏭</span>
                        <span>Sector ${comp.sector_iaf_numero}</span>
                      </span>
                      <p class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(comp.sector_iaf_descripcion)}</p>
                    </td>

                    <!-- Sub-Sector IAF -->
                    <td class="py-3.5 px-4">
                      ${
                        comp.subsector_iaf_codigo
                          ? `
                        <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          ${escapeHtml(comp.subsector_iaf_codigo)}
                        </span>
                        <span class="text-slate-700 text-xs ml-1">${escapeHtml(comp.subsector_iaf_descripcion || '')}</span>
                      `
                          : '<span class="text-slate-400 italic">Sector completo</span>'
                      }
                    </td>

                    <!-- Rol Calificado -->
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleVisual.badgeClass}">
                        <span>${roleVisual.icon}</span>
                        <span>${escapeHtml(roleVisual.label)}</span>
                      </span>
                    </td>

                    <!-- Validity Date & State -->
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${validityBadgeClass}">
                        <span>${validityState === 'Vencido' ? '⚠️' : '✓'}</span>
                        <span>${escapeHtml(comp.fecha_vencimiento)} (${validityState})</span>
                      </span>
                    </td>

                    <!-- N° Folio / Registro -->
                    <td class="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                      ${escapeHtml(comp.numero_registro || '—')}
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * TAB 2: Historial de Auditorías Realizadas (public.auditoria)
 */
function renderHistorialChildTab(historial: AuditoriaRealizadaEntity[]): string {
  if (historial.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <span class="text-2xl block">📋</span>
        <p class="font-bold text-slate-800">Sin historial de auditorías ejecutadas</p>
        <p class="text-slate-500">Este auditor aún no ha participado en jornadas de auditoría registradas en el sistema.</p>
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
              <th scope="col" class="py-3 px-4">Organización Cliente</th>
              <th scope="col" class="py-3 px-4">Certificado Vinculado</th>
              <th scope="col" class="py-3 px-4">Modalidad</th>
              <th scope="col" class="py-3 px-4">Rol en Jornada</th>
              <th scope="col" class="py-3 px-4">Fecha Ejecución</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${historial
              .map((aud) => {
                const isCompleted = aud.estatus === 'Completada' || aud.estatus === 'Cerrada';
                return `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    📋 ${escapeHtml(aud.codigo_auditoria)}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-800">
                    🏢 ${escapeHtml(aud.organizacion_nombre)}
                  </td>
                  <td class="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                    📜 ${escapeHtml(aud.numero_certificado)}
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      ${escapeHtml(aud.tipo_auditoria)} (${escapeHtml(aud.metodologia)})
                    </span>
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap font-medium text-indigo-700">
                    ★ ${escapeHtml(aud.rol_en_auditoria)}
                  </td>
                  <td class="py-3.5 px-4 font-mono text-[11px] text-slate-700 tabular-nums whitespace-nowrap">
                    ${escapeHtml(aud.fecha_ejecucion)}
                  </td>
                  <td class="py-3.5 px-4 text-center whitespace-nowrap">
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
