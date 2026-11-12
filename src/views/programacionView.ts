import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  type AuditEventEntity,
  type AuditModality,
  type ExecutionMethodology,
  type AuditEventStatus,
  getModalityVisual,
  getMethodologyVisual,
  getAuditStatusVisual,
  filterAuditEvents,
} from '../lib/auditDomain';
import type { SortDirection } from '../lib/universalTemplate';

export interface ProgramacionViewState {
  selectedAuditId: string | null;
  query: string;
  selectedModality: string;
  selectedMethodology: string;
  selectedStatus: string;
  selectedAuditor: string;
  viewMode: 'grid' | 'list';
  sortColumn: 'codigo' | 'organizacion' | 'fecha' | 'dias' | 'estatus' | null;
  sortDirection: SortDirection;
  activeChildTab: 'equipo' | 'sedes' | 'normativa';
  isPlanningModalOpen: boolean;
  isAddingTeamMemberModalOpen: boolean;
  isAddingSiteScheduleModalOpen: boolean;
}

export function renderProgramacionView(
  profile: UserProfile,
  audits: AuditEventEntity[],
  state: ProgramacionViewState
): string {
  const isSelected = !!state.selectedAuditId;
  const selectedAudit = audits.find((a) => a.id === state.selectedAuditId) || null;

  if (isSelected && selectedAudit) {
    return renderProgramacionDetailView(profile, selectedAudit, state);
  }

  return renderProgramacionDirectoryView(profile, audits, state);
}

/**
 * Universal List / Grid Directory View for Audit Scheduling
 */
function renderProgramacionDirectoryView(
  profile: UserProfile,
  allAudits: AuditEventEntity[],
  state: ProgramacionViewState
): string {
  const filteredAudits = filterAuditEvents(allAudits, {
    query: state.query,
    selectedModality: state.selectedModality,
    selectedMethodology: state.selectedMethodology,
    selectedStatus: state.selectedStatus,
    selectedAuditor: state.selectedAuditor,
  });

  const canPlan = ['ADMIN', 'WORKER'].includes(profile.role);

  // Calculate facet counts
  const modalities = ['ALL', 'Renovación', 'Etapa 1', 'Etapa 2', 'Seguimiento 1', 'Extraordinaria'];
  const methodologies = ['ALL', 'Presencial', 'Remota', 'Mixta'];
  const statuses = ['ALL', 'Planificado', 'En Ejecución', 'En Espera', 'Completada', 'Cerrada'];

  return `
    <div class="space-y-6">
      <!-- Semantic Domain Header -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🗓️</span>
            <h2 class="text-lg font-bold text-slate-900 tracking-tight">Programación de Auditorías</h2>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Planificación de eventos de evaluación de conformidad conforme a ISO/IEC 17021-1:2015 e ISO 19011:2018
          </p>
        </div>

        <div class="flex items-center gap-2">
          ${
            canPlan
              ? `
                <button
                  type="button"
                  data-action="open-plan-audit-modal"
                  class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>➕</span>
                  <span>Planificar Nueva Auditoría</span>
                </button>
              `
              : ''
          }
          <button
            type="button"
            data-open-changelog="public.auditoria"
            data-changelog-title="Auditorías del Sistema"
            class="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            title="Ver historial de auditoría de eventos de evaluación"
          >
            <span>🕒</span>
            <span>Historial de Cambios</span>
          </button>
        </div>
      </div>

      <!-- Main Layout: Left Facets Sidebar + Right Content Area -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <!-- Collapsible Facets Sidebar -->
        <aside class="lg:col-span-1 space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Filtros Operativos</span>
              <button
                type="button"
                data-action="reset-audit-filters"
                class="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Limpiar
              </button>
            </div>

            <!-- Modalidad Facet -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Modalidad de Auditoría</label>
              <div class="space-y-1">
                ${modalities
                  .map((mod) => {
                    const isSelected =
                      (state.selectedModality || 'ALL') === mod ||
                      (!state.selectedModality && mod === 'ALL');
                    const count =
                      mod === 'ALL'
                        ? allAudits.length
                        : allAudits.filter((a) => a.tipo_auditoria === mod).length;
                    return `
                      <button
                        type="button"
                        data-action="filter-audit-modality"
                        data-modality="${escapeHtml(mod)}"
                        class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }"
                      >
                        <span>${escapeHtml(mod === 'ALL' ? 'Todas las modalidades' : mod)}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }">${count}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Metodología Facet -->
            <div class="pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Metodología de Ejecución</label>
              <div class="space-y-1">
                ${methodologies
                  .map((meth) => {
                    const isSelected =
                      (state.selectedMethodology || 'ALL') === meth ||
                      (!state.selectedMethodology && meth === 'ALL');
                    const count =
                      meth === 'ALL'
                        ? allAudits.length
                        : allAudits.filter((a) => a.metodologia === meth).length;
                    return `
                      <button
                        type="button"
                        data-action="filter-audit-methodology"
                        data-methodology="${escapeHtml(meth)}"
                        class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }"
                      >
                        <span>${escapeHtml(meth === 'ALL' ? 'Todas las metodologías' : meth)}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }">${count}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <!-- Estatus Facet -->
            <div class="pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Estatus Operativo</label>
              <div class="space-y-1">
                ${statuses
                  .map((stat) => {
                    const isSelected =
                      (state.selectedStatus || 'ALL') === stat ||
                      (!state.selectedStatus && stat === 'ALL');
                    const count =
                      stat === 'ALL'
                        ? allAudits.length
                        : allAudits.filter((a) => a.estatus === stat).length;
                    return `
                      <button
                        type="button"
                        data-action="filter-audit-status"
                        data-status="${escapeHtml(stat)}"
                        class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }"
                      >
                        <span>${escapeHtml(stat === 'ALL' ? 'Todos los estatus' : stat)}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }">${count}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </aside>

        <!-- Right Content: Filter Bar + Records Grid/List -->
        <main class="lg:col-span-3 space-y-4">
          <!-- Real-time Search and Layout Switcher -->
          <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="relative w-full sm:w-80">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                id="auditSearchInput"
                placeholder="Buscar por código, cliente, certificado, norma... (Presiona /)"
                value="${escapeHtml(state.query || '')}"
                class="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden bg-white"
              />
              <span class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">/</kbd>
              </span>
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span class="text-xs font-semibold text-slate-500">
                ${filteredAudits.length} ${filteredAudits.length === 1 ? 'auditoría encontrada' : 'auditorías encontradas'}
              </span>

              <!-- Layout Switcher: Grid vs List -->
              <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group">
                <button
                  type="button"
                  data-action="set-audit-view-mode"
                  data-mode="grid"
                  class="px-2.5 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    state.viewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }"
                  title="Vista en Cuadrícula"
                >
                  <span>⊞</span>
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  data-action="set-audit-view-mode"
                  data-mode="list"
                  class="px-2.5 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    state.viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }"
                  title="Vista en Lista"
                >
                  <span>☰</span>
                  <span>Lista</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          ${
            filteredAudits.length === 0
              ? `
                <div class="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
                  <span class="text-3xl block">🔍</span>
                  <h3 class="text-sm font-bold text-slate-900">No se encontraron eventos de auditoría</h3>
                  <p class="text-xs text-slate-500 max-w-sm mx-auto">
                    Intente modificar el término de búsqueda o restablecer los filtros de modalidad, metodología y estatus.
                  </p>
                  <button
                    type="button"
                    data-action="reset-audit-filters"
                    class="px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Restablecer Filtros
                  </button>
                </div>
              `
              : state.viewMode === 'list'
              ? renderAuditListView(filteredAudits)
              : renderAuditGridView(filteredAudits)
          }
        </main>
      </div>

      <!-- Plan Audit Modal (if open) -->
      ${renderPlanAuditModal(state.isPlanningModalOpen)}
    </div>
  `;
}

/**
 * Audit Grid View
 */
function renderAuditGridView(audits: AuditEventEntity[]): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${audits
        .map((audit) => {
          const modMeta = getModalityVisual(audit.tipo_auditoria);
          const methMeta = getMethodologyVisual(audit.metodologia);
          const statMeta = getAuditStatusVisual(audit.estatus);

          return `
            <div
              class="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer group"
              data-action="select-audit"
              data-audit-id="${escapeHtml(audit.id)}"
            >
              <div class="space-y-3">
                <!-- Top row: Code + Badges -->
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-0.5">
                    <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      ${escapeHtml(audit.codigo_auditoria)}
                    </span>
                    <div class="text-[11px] font-mono text-slate-500">
                      Certificado: <span class="font-bold text-slate-700">${escapeHtml(audit.numero_certificado)}</span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statMeta.badgeClass}">
                      <span>${statMeta.symbol}</span>
                      <span>${escapeHtml(statMeta.label)}</span>
                    </span>
                  </div>
                </div>

                <!-- Organization & Standard -->
                <div>
                  <h3 class="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    ${escapeHtml(audit.organizacion_nombre)}
                  </h3>
                  <div class="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                    <span class="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
                      ${escapeHtml(audit.norma_codigo)}
                    </span>
                    <span class="text-[11px] text-slate-500 truncate">IAF ${audit.sector_iaf}</span>
                  </div>
                </div>

                <!-- Modality & Methodology Pills -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${modMeta.badgeClass}">
                    <span>${modMeta.symbol}</span>
                    <span>${escapeHtml(modMeta.label)}</span>
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${methMeta.badgeClass}">
                    <span>${methMeta.symbol}</span>
                    <span>${escapeHtml(methMeta.label)}</span>
                  </span>
                </div>

                <!-- Schedule & Lead Auditor -->
                <div class="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <div class="flex items-center justify-between text-slate-600">
                    <span class="text-slate-500">Fechas:</span>
                    <span class="font-mono font-medium text-slate-800">${escapeHtml(audit.fecha_inicio)} al ${escapeHtml(audit.fecha_fin)}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-600">
                    <span class="text-slate-500">Auditor Líder:</span>
                    <span class="font-semibold text-slate-800">${escapeHtml(audit.auditor_lider_nombre)}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-600">
                    <span class="text-slate-500">Días Auditor:</span>
                    <span class="font-bold text-indigo-700">${audit.dias_auditor.toFixed(1)} días</span>
                  </div>
                </div>
              </div>

              <!-- Bottom Bar with Sampling and Action -->
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span class="text-[11px] text-slate-500">
                  ${audit.sedesMuestreo.length} ${audit.sedesMuestreo.length === 1 ? 'sede evaluada' : 'sedes evaluadas'}
                </span>
                <span class="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  <span>Ver Detalle</span>
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
 * Audit List View
 */
function renderAuditListView(audits: AuditEventEntity[]): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4">Código / Cliente</th>
              <th class="py-3 px-3">Certificado / Norma</th>
              <th class="py-3 px-3">Modalidad</th>
              <th class="py-3 px-3">Metodología</th>
              <th class="py-3 px-3">Fechas & Días</th>
              <th class="py-3 px-3">Auditor Líder</th>
              <th class="py-3 px-3">Estatus</th>
              <th class="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            ${audits
              .map((audit) => {
                const modMeta = getModalityVisual(audit.tipo_auditoria);
                const methMeta = getMethodologyVisual(audit.metodologia);
                const statMeta = getAuditStatusVisual(audit.estatus);

                return `
                  <tr
                    class="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    data-action="select-audit"
                    data-audit-id="${escapeHtml(audit.id)}"
                  >
                    <td class="py-3 px-4">
                      <div class="font-mono font-bold text-indigo-700">${escapeHtml(audit.codigo_auditoria)}</div>
                      <div class="text-[11px] font-semibold text-slate-900">${escapeHtml(audit.organizacion_nombre)}</div>
                    </td>
                    <td class="py-3 px-3">
                      <div class="font-mono font-bold text-slate-800">${escapeHtml(audit.numero_certificado)}</div>
                      <div class="text-[11px] text-slate-500">${escapeHtml(audit.norma_codigo)}</div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${modMeta.badgeClass}">
                        <span>${modMeta.symbol}</span>
                        <span>${escapeHtml(modMeta.label)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${methMeta.badgeClass}">
                        <span>${methMeta.symbol}</span>
                        <span>${escapeHtml(methMeta.label)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-3 font-mono">
                      <div class="text-slate-900 font-semibold">${escapeHtml(audit.fecha_inicio)}</div>
                      <div class="text-[10px] text-slate-500">${audit.dias_auditor.toFixed(1)} días</div>
                    </td>
                    <td class="py-3 px-3 font-semibold text-slate-900">
                      ${escapeHtml(audit.auditor_lider_nombre)}
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statMeta.badgeClass}">
                        <span>${statMeta.symbol}</span>
                        <span>${escapeHtml(statMeta.label)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button
                        type="button"
                        data-action="select-audit"
                        data-audit-id="${escapeHtml(audit.id)}"
                        class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Gestionar
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
 * Standardized 4-Zone Detail Page for Audit Planning
 */
function renderProgramacionDetailView(
  profile: UserProfile,
  audit: AuditEventEntity,
  state: ProgramacionViewState
): string {
  const modMeta = getModalityVisual(audit.tipo_auditoria);
  const methMeta = getMethodologyVisual(audit.metodologia);
  const statMeta = getAuditStatusVisual(audit.estatus);

  const activeTab = state.activeChildTab || 'equipo';

  return `
    <div class="space-y-6">
      <!-- Back to Directory Navigation Bar -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          data-action="back-to-audit-directory"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
        >
          <span>←</span>
          <span>Volver al Directorio de Auditorías</span>
        </button>

        <div class="flex items-center gap-2">
          <button
            type="button"
            data-open-changelog="public.auditoria"
            data-changelog-id="${escapeHtml(audit.id)}"
            data-changelog-title="Auditoría ${escapeHtml(audit.codigo_auditoria)}"
            class="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>🕒</span>
            <span>Historial de Cambios</span>
          </button>
        </div>
      </div>

      <!-- ZONE 1: Parent Data Zone -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                ${escapeHtml(audit.codigo_auditoria)}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${modMeta.badgeClass}">
                <span>${modMeta.symbol}</span>
                <span>${escapeHtml(modMeta.label)}</span>
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${statMeta.badgeClass}">
                <span>${statMeta.symbol}</span>
                <span>${escapeHtml(statMeta.label)}</span>
              </span>
            </div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">
              ${escapeHtml(audit.organizacion_nombre)}
            </h1>
            <div class="text-xs text-slate-500 font-mono">
              RIF: <span class="font-bold text-slate-700">${escapeHtml(audit.organizacion_rif)}</span> ·
              Dirección: <span class="text-slate-700 font-sans">${escapeHtml(audit.direccion_principal)}</span>
            </div>
          </div>

          <div class="flex flex-col items-start md:items-end gap-1.5">
            <div class="text-right">
              <div class="text-xs font-bold text-slate-900 font-mono">
                Certificado: ${escapeHtml(audit.numero_certificado)}
              </div>
              <div class="text-[11px] font-medium text-slate-500">
                Norma: <span class="font-bold text-slate-700">${escapeHtml(audit.norma_codigo)}</span> (IAF Sector ${audit.sector_iaf})
              </div>
            </div>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${methMeta.badgeClass}">
              <span>${methMeta.symbol}</span>
              <span>Metodología: ${escapeHtml(methMeta.label)}</span>
            </span>
          </div>
        </div>

        <!-- ZONE 2: Visual Separator -->
        <hr class="border-slate-200 my-2" />

        <!-- ZONE 3: Direct Record Attributes with Character Counters -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Fechas Planificadas</span>
            <div class="font-mono font-bold text-slate-900">
              ${escapeHtml(audit.fecha_inicio)} al ${escapeHtml(audit.fecha_fin)}
            </div>
            ${
              audit.fecha_reprogramacion
                ? `<div class="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 mt-1">
                     Reprogramado: ${escapeHtml(audit.fecha_reprogramacion)}
                   </div>`
                : ''
            }
          </div>

          <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Días Auditor Asignados</span>
            <div class="text-base font-bold text-indigo-700 font-mono">
              ${audit.dias_auditor.toFixed(1)} días
            </div>
            <div class="text-[10px] text-slate-500">Conforme a IAF MD 5:2019</div>
          </div>

          <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Auditor Líder Designado</span>
            <div class="font-bold text-slate-900 truncate">
              ${escapeHtml(audit.auditor_lider_nombre)}
            </div>
            <div class="text-[10px] text-slate-500 truncate">${escapeHtml(audit.auditor_lider_email || 'auditor@programa-aud.com')}</div>
          </div>

          <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Acceso Operativo</span>
            <div class="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                data-nav="auditorias"
                data-subview="calendar"
                data-calendar-audit-id="${escapeHtml(audit.id)}"
                class="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
              >
                <span>📆</span>
                <span>En Calendario</span>
              </button>
              <button
                type="button"
                data-nav="auditorias"
                data-subview="findings"
                data-audit-id="${escapeHtml(audit.id)}"
                class="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
              >
                <span>📋</span>
                <span>Hallazgos</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Objective & Scope Statement with Character Counter -->
        <div class="space-y-1 pt-2">
          <div class="flex items-center justify-between text-xs">
            <label class="font-bold text-slate-700">Objetivo y Alcance Específico de la Evaluación</label>
            <span class="text-[11px] font-mono text-slate-400">
              ${audit.objetivo.length} / 1000 caracteres
            </span>
          </div>
          <p class="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
            ${escapeHtml(audit.objetivo)}
          </p>
        </div>
      </div>

      <!-- ZONE 4: Multipage Child Tabs -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
        <!-- Tabs Header -->
        <div class="border-b border-slate-200 bg-slate-50 px-4 pt-2 flex items-center gap-2">
          <button
            type="button"
            data-action="set-audit-child-tab"
            data-tab="equipo"
            class="px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'equipo'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }"
          >
            <span>👥</span>
            <span>Tab 1: Equipo Evaluador (${audit.equipo.length})</span>
          </button>
          <button
            type="button"
            data-action="set-audit-child-tab"
            data-tab="sedes"
            class="px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'sedes'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }"
          >
            <span>🏭</span>
            <span>Tab 2: Sedes y Muestreo (${audit.sedesMuestreo.length})</span>
          </button>
          <button
            type="button"
            data-action="set-audit-child-tab"
            data-tab="normativa"
            class="px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'normativa'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }"
          >
            <span>📑</span>
            <span>Tab 3: Matriz de Verificación Normativa (${audit.verificacionNormativa.length})</span>
          </button>
        </div>

        <div class="p-5">
          ${
            activeTab === 'equipo'
              ? renderEquipoAuditorTab(audit, profile)
              : activeTab === 'sedes'
              ? renderSedesMuestreoTab(audit, profile)
              : renderVerificacionNormativaTab(audit, profile)
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * Tab 1: Equipo Evaluador
 */
function renderEquipoAuditorTab(audit: AuditEventEntity, profile: UserProfile): string {
  const canEdit = ['ADMIN', 'WORKER'].includes(profile.role);

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Equipo Auditor Asignado e Idoneidad Técnica</h3>
          <p class="text-xs text-slate-500">
            Designación formal de roles y competencia conforme a ISO 19011:2018 cláusula 7
          </p>
        </div>
        ${
          canEdit
            ? `
              <button
                type="button"
                data-action="open-add-team-member-modal"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <span>➕</span>
                <span>Asignar Miembro del Equipo</span>
              </button>
            `
            : ''
        }
      </div>

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4">Auditor / Evaluador</th>
              <th class="py-3 px-3">Rol Asignado</th>
              <th class="py-3 px-3">Credencial / Registro</th>
              <th class="py-3 px-3">Alcance de Competencia Evaluada</th>
              <th class="py-3 px-3">Días Asignados</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            ${audit.equipo
              .map((member) => {
                const isLeader = member.rol === 'Auditor Líder';
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900 flex items-center gap-2">
                        <span>${escapeHtml(member.nombre)}</span>
                        ${
                          isLeader
                            ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Líder</span>`
                            : ''
                        }
                      </div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded font-semibold text-[11px] ${
                        isLeader
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-800'
                      }">
                        ${escapeHtml(member.rol)}
                      </span>
                    </td>
                    <td class="py-3 px-3 font-mono text-slate-600">
                      ${escapeHtml(member.codigo_credencial || 'REG-OFICIAL-2024')}
                    </td>
                    <td class="py-3 px-3 text-slate-700">
                      ${escapeHtml(member.competencia_alcance)}
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-indigo-700">
                      ${member.dias_asignados.toFixed(1)} d
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
 * Tab 2: Sedes y Muestreo (Site 0 Convention first)
 */
function renderSedesMuestreoTab(audit: AuditEventEntity, profile: UserProfile): string {
  const canEdit = ['ADMIN', 'WORKER'].includes(profile.role);

  // Guarantee Site 0 (HQ) appears first
  const sortedSedes = [...audit.sedesMuestreo].sort((a, b) => a.numero_sitio - b.numero_sitio);

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Plan de Muestreo Multisitio & Distribución de Campo</h3>
          <p class="text-xs text-slate-500">
            Cumplimiento estricto de la convención de Sitio 0 (Sede Principal) y normas IAF MD 1:2018 / IAF MD 4:2022
          </p>
        </div>
        ${
          canEdit
            ? `
              <button
                type="button"
                data-action="open-add-site-schedule-modal"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <span>➕</span>
                <span>Programar Sede de Muestreo</span>
              </button>
            `
            : ''
        }
      </div>

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4">Nº Sitio</th>
              <th class="py-3 px-4">Sede / Ubicación</th>
              <th class="py-3 px-3">Modalidad de Evaluación</th>
              <th class="py-3 px-3">Fecha de Visita</th>
              <th class="py-3 px-3">Días Asignados</th>
              <th class="py-3 px-3">Auditor(es) Responsable(s)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            ${sortedSedes
              .map((sede) => {
                const isHq = sede.numero_sitio === 0;
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors ${isHq ? 'bg-amber-50/20' : ''}">
                    <td class="py-3 px-4 font-mono">
                      <span class="inline-flex items-center justify-center px-2 py-0.5 rounded font-bold ${
                        isHq
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }">
                        #${sede.numero_sitio}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900 flex items-center gap-2">
                        <span>${escapeHtml(sede.nombre_sitio)}</span>
                        ${
                          isHq
                            ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Sede Principal (HQ)</span>`
                            : ''
                        }
                      </div>
                      <div class="text-[11px] text-slate-500">${escapeHtml(sede.direccion)}</div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sede.tipo_evaluacion.includes('In Situ')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-sky-50 text-sky-800 border border-sky-200'
                      }">
                        ${escapeHtml(sede.tipo_evaluacion)}
                      </span>
                    </td>
                    <td class="py-3 px-3 font-mono text-slate-900 font-semibold">
                      ${escapeHtml(sede.fecha_asignada)}
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-indigo-700">
                      ${sede.dias_asignados.toFixed(1)} d
                    </td>
                    <td class="py-3 px-3 font-medium text-slate-800">
                      ${escapeHtml(sede.auditor_responsable)}
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
 * Tab 3: Matriz de Verificación Normativa
 */
function renderVerificacionNormativaTab(audit: AuditEventEntity, profile: UserProfile): string {
  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Matriz de Verificación de Requisitos Normativos</h3>
          <p class="text-xs text-slate-500">
            Cláusulas programadas para muestreo de conformidad y trazabilidad de proceso
          </p>
        </div>
        <div class="text-xs font-semibold text-slate-500">
          Total Cláusulas Evaluadas: <span class="font-bold text-slate-900">${audit.verificacionNormativa.length}</span>
        </div>
      </div>

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4">Cláusula ISO</th>
              <th class="py-3 px-4">Requisito / Título</th>
              <th class="py-3 px-3">Proceso Vinculado</th>
              <th class="py-3 px-3">Estado de Verificación</th>
              <th class="py-3 px-4">Notas de Campo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            ${audit.verificacionNormativa
              .map((item) => {
                let statusBadge = 'bg-slate-100 text-slate-700';
                if (item.estado === 'Verificado') {
                  statusBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold';
                } else if (item.estado === 'Con Desviación') {
                  statusBadge = 'bg-rose-50 text-rose-800 border border-rose-200 font-bold';
                }

                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-700">
                      ${escapeHtml(item.clausula_codigo)}
                    </td>
                    <td class="py-3 px-4 text-slate-900 font-semibold">
                      ${escapeHtml(item.clausula_titulo)}
                    </td>
                    <td class="py-3 px-3 text-slate-600">
                      ${escapeHtml(item.proceso_nombre)}
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[11px] ${statusBadge}">
                        ${item.estado === 'Verificado' ? '✓ ' : item.estado === 'Con Desviación' ? '⚠️ ' : '⏳ '}
                        ${escapeHtml(item.estado)}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600 italic">
                      ${escapeHtml(item.observaciones || 'Sin desviaciones registradas durante el muestreo')}
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
 * Plan Audit Modal
 */
function renderPlanAuditModal(isOpen: boolean): string {
  if (!isOpen) return '';

  return `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">📅</span>
            <h3 class="text-base font-bold text-slate-900">Planificar Nueva Auditoría de Certificación</h3>
          </div>
          <button
            type="button"
            data-action="close-plan-audit-modal"
            class="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form id="newAuditPlanningForm" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="planCertId" class="block text-xs font-semibold text-slate-700 mb-1">
                Certificado Objetivo
              </label>
              <select id="planCertId" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="40000000-0000-0000-0000-000000000001">FN-QMS-2024-001 · Iberometal Componentes S.A. (ISO 9001:2015)</option>
                <option value="40000000-0000-0000-0000-000000000002">FN-EMS-2024-002 · CyberCloud Solutions S.L. (ISO 14001:2015)</option>
                <option value="40000000-0000-0000-0000-000000000003">FN-OHS-2023-018 · Petroquímica del Centro C.A. (ISO 45001:2018)</option>
                <option value="40000000-0000-0000-0000-000000000004">FN-ISMS-2024-007 · CyberCloud Solutions S.L. (ISO/IEC 27001:2022)</option>
              </select>
            </div>

            <div>
              <label for="planModality" class="block text-xs font-semibold text-slate-700 mb-1">
                Modalidad de Evaluación
              </label>
              <select id="planModality" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="Renovación">Renovación (Ciclo Trienal)</option>
                <option value="Etapa 1">Etapa 1 (Revisión Documental)</option>
                <option value="Etapa 2">Etapa 2 (Evaluación de Campo)</option>
                <option value="Seguimiento 1">Seguimiento 1 (Vigilancia Anual Año 1)</option>
                <option value="Seguimiento 2">Seguimiento 2 (Vigilancia Anual Año 2)</option>
                <option value="Extraordinaria">Extraordinaria (Especial)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label for="planMethodology" class="block text-xs font-semibold text-slate-700 mb-1">
                Metodología
              </label>
              <select id="planMethodology" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="Presencial">Presencial (In Situ)</option>
                <option value="Remota">Remota (IAF MD 4)</option>
                <option value="Mixta">Mixta / Híbrida</option>
              </select>
            </div>

            <div>
              <label for="planStartDate" class="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                id="planStartDate"
                required
                value="2024-12-10"
                class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>

            <div>
              <label for="planEndDate" class="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                id="planEndDate"
                required
                value="2024-12-12"
                class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="planLeadAuditor" class="block text-xs font-semibold text-slate-700 mb-1">
                Auditor Líder Calificado
              </label>
              <select id="planLeadAuditor" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="10000000-0000-0000-0000-000000000001">Ing. Carlos Mendoza (ISO 9001 / IAF 17)</option>
                <option value="10000000-0000-0000-0000-000000000002">Ing. Roberto Silva (ISO 14001 / ISO 27001 / IAF 33)</option>
                <option value="10000000-0000-0000-0000-000000000003">Dra. Ana Belén Torres (ISO 45001 / IAF 14)</option>
              </select>
            </div>

            <div>
              <label for="planDays" class="block text-xs font-semibold text-slate-700 mb-1">
                Días Auditor Totales (IAF MD 5)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="30"
                id="planDays"
                required
                value="3.0"
                class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label for="planObjective" class="block text-xs font-semibold text-slate-700 mb-1">
              Objetivo de la Auditoría
            </label>
            <textarea
              id="planObjective"
              rows="3"
              required
              maxlength="1000"
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Describa el objetivo de la evaluación de conformidad..."
            >Verificación de la conformidad y eficacia del sistema de gestión bajo los requisitos de la norma certificable.</textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              data-action="close-plan-audit-modal"
              class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Registrar Auditoría
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
