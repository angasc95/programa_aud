import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { CertificateRecord } from '../lib/searchControls';
import { sortSitesWithPrincipalFirst } from '../lib/multisiteSampling';
import type { AuditorDetailEntity } from '../lib/competencyMatrix';
import {
  canEditAuditScheduleOrTeam,
  canMutateAuditExecution,
} from '../lib/accessControl';
import {
  filterAndSortProgramacionAudits,
  getAuditStatusVisualStyle,
  getMethodologyVisualStyle,
  getModalityVisualStyle,
  type ProgramacionAuditEntity,
  type ProgramacionChildTab,
  type ProgramacionViewState,
} from '../lib/auditExecution';

export type { ProgramacionViewState, ProgramacionChildTab };

export interface ProgramacionViewProps {
  profile: UserProfile;
  state: ProgramacionViewState;
  audits: ProgramacionAuditEntity[];
  auditors: AuditorDetailEntity[];
  certificates: CertificateRecord[];
  loading?: boolean;
}

export function renderProgramacionView(props: ProgramacionViewProps): string {
  const { profile, state, audits, auditors, certificates, loading = false } = props;

  if (state.selectedAuditId) {
    const selected = audits.find((a) => a.id === state.selectedAuditId);
    if (selected) {
      return renderProgramacionDetailView(profile, state, selected, auditors);
    }
  }

  return renderProgramacionDirectoryView(profile, state, audits, auditors, certificates, loading);
}

function renderProgramacionDirectoryView(
  profile: UserProfile,
  state: ProgramacionViewState,
  allAudits: ProgramacionAuditEntity[],
  auditors: AuditorDetailEntity[],
  certificates: CertificateRecord[],
  loading: boolean
): string {
  const canPlan = canEditAuditScheduleOrTeam(profile);

  const filtered = filterAndSortProgramacionAudits(allAudits, {
    query: state.query,
    selectedTipo: state.selectedTipo,
    selectedMetodologia: state.selectedMetodologia,
    selectedEstatus: state.selectedEstatus,
    selectedAuditorLider: state.selectedAuditorLider,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
  });

  // Facet counts
  const tipoCounts: Record<string, number> = {};
  const metCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const leaderCounts: Record<string, number> = {};

  for (const a of allAudits) {
    tipoCounts[a.tipo_auditoria] = (tipoCounts[a.tipo_auditoria] || 0) + 1;
    metCounts[a.metodologia] = (metCounts[a.metodologia] || 0) + 1;
    statusCounts[a.estatus] = (statusCounts[a.estatus] || 0) + 1;
    leaderCounts[a.auditor_lider] = (leaderCounts[a.auditor_lider] || 0) + 1;
  }

  const hasActiveFilter =
    Boolean(state.query.trim()) ||
    state.selectedTipo !== 'ALL' ||
    state.selectedMetodologia !== 'ALL' ||
    state.selectedEstatus !== 'ALL' ||
    state.selectedAuditorLider !== 'ALL';

  const renderSortArrow = (col: NonNullable<ProgramacionViewState['sortColumn']>) => {
    if (state.sortColumn !== col || state.sortDirection === 'none') {
      return '<span class="text-slate-300 ml-1">⇅</span>';
    }
    return state.sortDirection === 'asc'
      ? '<span class="text-indigo-700 ml-1 font-bold">↑</span>'
      : '<span class="text-indigo-700 ml-1 font-bold">↓</span>';
  };

  return `
    <div class="space-y-6">
      <!-- Semantic Header Banner -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200">
              <span aria-hidden="true">🗓️</span>
              <span>DOMINIO AUDITORÍAS · PROGRAMACIÓN</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Programación de Auditorías de Campo
            </h2>
            <p class="text-xs text-slate-500 max-w-3xl">
              Planificación de eventos de evaluación, asignación de equipos auditores y muestreo multisitio conforme a ISO/IEC 17021-1:2015 e ISO 19011:2018
            </p>
          </div>

          ${
            canPlan
              ? `
                <div class="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    data-action="open-plan-audit"
                    class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <span aria-hidden="true">➕</span>
                    <span>Planificar Nueva Auditoría</span>
                  </button>
                </div>
              `
              : ''
          }
        </div>

        <!-- Inline Audit Planning Form -->
        ${
          state.isPlanningModalOpen && canPlan
            ? renderPlanAuditForm(auditors, certificates)
            : ''
        }

        <!-- Controls Bar: Search + Match Count + View Mode Switcher -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div class="relative flex-1 max-w-xl">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              id="programacionSearchInput"
              placeholder="Buscar por código (AUD-2024-001), organización, certificado, norma o auditor... (/)"
              value="${escapeHtml(state.query)}"
              aria-label="Buscar auditorías programadas"
              class="w-full text-xs rounded-lg border border-slate-300 bg-white pl-9 pr-14 py-2 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div class="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              ${
                state.query
                  ? `
                    <button
                      type="button"
                      id="clearProgramacionSearchBtn"
                      title="Limpiar búsqueda (Esc)"
                      aria-label="Limpiar búsqueda"
                      class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  `
                  : `
                    <kbd class="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded select-none">
                      /
                    </kbd>
                  `
              }
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div class="text-xs text-slate-500 font-medium tabular-nums">
              <span class="font-bold text-slate-800">${filtered.length}</span>
              <span> de ${allAudits.length} eventos</span>
            </div>

            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs" role="group" aria-label="Modo de vista de programación">
              <button
                type="button"
                data-prog-view-mode="grid"
                aria-pressed="${state.viewMode === 'grid' ? 'true' : 'false'}"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  state.viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">⊞</span>
                <span class="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                type="button"
                data-prog-view-mode="list"
                aria-pressed="${state.viewMode === 'list' ? 'true' : 'false'}"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  state.viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">☰</span>
                <span class="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Body: Sidebar Facets + Content Area -->
      <div class="flex flex-col lg:flex-row gap-6 items-start">
        <aside class="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-5" aria-label="Filtros y Facetas de Programación">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span aria-hidden="true">⚡</span>
              <span>Filtros y Facetas</span>
            </h3>
            ${
              hasActiveFilter
                ? `
                  <button
                    type="button"
                    id="resetProgFiltersBtn"
                    class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Limpiar
                  </button>
                `
                : ''
            }
          </div>

          ${renderFacetSection('Tipo de Auditoría', 'tipo', state.selectedTipo, tipoCounts, allAudits.length)}
          ${renderFacetSection('Metodología', 'metodologia', state.selectedMetodologia, metCounts, allAudits.length)}
          ${renderFacetSection('Estatus Operativo', 'estatus', state.selectedEstatus, statusCounts, allAudits.length)}
          ${renderFacetSection('Auditor Líder', 'auditor', state.selectedAuditorLider, leaderCounts, allAudits.length)}
        </aside>

        <section class="flex-1 min-w-0 space-y-4">
          ${
            loading
              ? `<div class="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">Cargando programación de auditorías...</div>`
              : filtered.length === 0
              ? `
                <div class="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-2xs">
                  <div class="text-3xl select-none" aria-hidden="true">🗓️</div>
                  <h3 class="text-sm font-bold text-slate-900">No se encontraron auditorías programadas</h3>
                  <p class="text-xs text-slate-500 max-w-md mx-auto">
                    Ajuste los criterios de búsqueda o restablezca las facetas laterales para visualizar todos los eventos planificados.
                  </p>
                  ${
                    hasActiveFilter
                      ? `
                        <button
                          type="button"
                          id="resetProgFiltersEmptyBtn"
                          class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Restablecer Filtros
                        </button>
                      `
                      : ''
                  }
                </div>
              `
              : state.viewMode === 'list'
              ? renderProgramacionTable(filtered, renderSortArrow)
              : renderProgramacionGrid(filtered)
          }
        </section>
      </div>
    </div>
  `;
}

function renderFacetSection(
  label: string,
  groupKey: 'tipo' | 'metodologia' | 'estatus' | 'auditor',
  selectedValue: string,
  counts: Record<string, number>,
  totalCount: number
): string {
  const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  return `
    <div class="space-y-1.5 pt-1 border-t border-slate-100 first:border-t-0 first:pt-0">
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">${escapeHtml(label)}</div>
      <div class="space-y-1">
        <button
          type="button"
          data-prog-facet="${groupKey}"
          data-prog-facet-value="ALL"
          class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
            selectedValue === 'ALL'
              ? 'bg-indigo-50 font-semibold text-indigo-900 border border-indigo-200/80'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }"
        >
          <span class="truncate">Todos</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full font-semibold tabular-nums ${
            selectedValue === 'ALL' ? 'bg-indigo-200/70 text-indigo-900' : 'bg-slate-100 text-slate-500'
          }">${totalCount}</span>
        </button>
        ${entries
          .map(([val, count]) => {
            const active = selectedValue === val;
            return `
              <button
                type="button"
                data-prog-facet="${groupKey}"
                data-prog-facet-value="${escapeHtml(val)}"
                class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-50 font-semibold text-indigo-900 border border-indigo-200/80'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }"
              >
                <span class="truncate">${escapeHtml(val)}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full font-semibold tabular-nums ${
                  active ? 'bg-indigo-200/70 text-indigo-900' : 'bg-slate-100 text-slate-500'
                }">${count}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderPlanAuditForm(
  auditors: AuditorDetailEntity[],
  certificates: CertificateRecord[]
): string {
  const certOptions =
    certificates.length > 0
      ? certificates
          .map(
            (c) =>
              `<option value="${escapeHtml(c.id)}">${escapeHtml(c.numero_certificado)} · ${escapeHtml(c.organizacion_nombre)} (${escapeHtml(c.norma)})</option>`
          )
          .join('')
      : `<option value="40000000-0000-0000-0000-000000000001">FN-QMS-2024-001 · Iberometal Componentes S.A. (ISO 9001:2015)</option>`;

  return `
    <div class="bg-indigo-50/70 border-2 border-indigo-300 rounded-xl p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-base" aria-hidden="true">📅</span>
          <h3 class="text-sm font-bold text-slate-900">Planificación de Nuevo Evento de Auditoría</h3>
        </div>
        <button
          type="button"
          data-action="close-plan-audit"
          class="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
        >
          ✕ Cancelar
        </button>
      </div>

      <form id="planAuditForm" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="planCertSelect" class="block text-xs font-semibold text-slate-700 mb-1">Certificado a Auditar</label>
            <select id="planCertSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${certOptions}
            </select>
          </div>

          <div>
            <label for="planTypeSelect" class="block text-xs font-semibold text-slate-700 mb-1">Tipo / Modalidad de Auditoría</label>
            <select id="planTypeSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="Etapa 1">Etapa 1 (Revisión Documental)</option>
              <option value="Etapa 2">Etapa 2 (Evaluación In Situ)</option>
              <option value="Seguimiento 1">Seguimiento 1 (Anual Año 1)</option>
              <option value="Seguimiento 2">Seguimiento 2 (Anual Año 2)</option>
              <option value="Renovación">Renovación (Ciclo Trienal)</option>
              <option value="Diagnóstico">Diagnóstico</option>
              <option value="Extraordinaria">Extraordinaria (Especial)</option>
            </select>
          </div>

          <div>
            <label for="planMethodologySelect" class="block text-xs font-semibold text-slate-700 mb-1">Metodología de Ejecución</label>
            <select id="planMethodologySelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="Presencial">Presencial</option>
              <option value="Remota">Remota</option>
              <option value="Mixta">Mixta</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label for="planDateInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              id="planDateInput"
              required
              value="2024-11-28"
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            />
          </div>

          <div>
            <label for="planEndDateInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              id="planEndDateInput"
              required
              value="2024-11-29"
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            />
          </div>

          <div>
            <label for="planDaysInput" class="block text-xs font-semibold text-slate-700 mb-1">Días-Auditor</label>
            <input
              type="number"
              id="planDaysInput"
              min="0.5"
              max="30"
              step="0.5"
              value="2"
              required
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            />
          </div>

          <div>
            <label for="planAuditorSelect" class="block text-xs font-semibold text-slate-700 mb-1">Auditor Líder Asignado</label>
            <select id="planAuditorSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${auditors
                .map(
                  (aud) =>
                    `<option value="${escapeHtml(aud.id)}">${escapeHtml(aud.nombre)} (${escapeHtml(aud.normas_acreditadas.join(', '))})</option>`
                )
                .join('')}
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            data-action="close-plan-audit"
            class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Registrar Planificación
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderProgramacionTable(
  audits: ProgramacionAuditEntity[],
  renderSortArrow: (col: NonNullable<ProgramacionViewState['sortColumn']>) => string
): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600 border-collapse">
          <thead class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <tr>
              <th scope="col" class="px-3 py-3">
                <button type="button" data-prog-sort="codigo" class="inline-flex items-center font-bold hover:text-indigo-700 cursor-pointer">
                  <span>Código</span>${renderSortArrow('codigo')}
                </button>
              </th>
              <th scope="col" class="px-3 py-3">
                <button type="button" data-prog-sort="organizacion" class="inline-flex items-center font-bold hover:text-indigo-700 cursor-pointer">
                  <span>Organización & Certificado</span>${renderSortArrow('organizacion')}
                </button>
              </th>
              <th scope="col" class="px-2.5 py-3">
                <button type="button" data-prog-sort="tipo" class="inline-flex items-center font-bold hover:text-indigo-700 cursor-pointer">
                  <span>Modalidad</span>${renderSortArrow('tipo')}
                </button>
              </th>
              <th scope="col" class="px-2.5 py-3">
                <button type="button" data-prog-sort="fecha" class="inline-flex items-center font-bold hover:text-indigo-700 cursor-pointer">
                  <span>Fechas / Días</span>${renderSortArrow('fecha')}
                </button>
              </th>
              <th scope="col" class="px-2.5 py-3">Auditor Líder</th>
              <th scope="col" class="px-2.5 py-3">
                <button type="button" data-prog-sort="estatus" class="inline-flex items-center font-bold hover:text-indigo-700 cursor-pointer">
                  <span>Estatus</span>${renderSortArrow('estatus')}
                </button>
              </th>
              <th scope="col" class="px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${audits
              .map((a) => {
                const mod = getModalityVisualStyle(a.tipo_auditoria);
                const met = getMethodologyVisualStyle(a.metodologia);
                const st = getAuditStatusVisualStyle(a.estatus);
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(a.id)}"
                        class="text-indigo-700 hover:text-indigo-900 hover:underline font-mono font-bold cursor-pointer"
                      >
                        ${escapeHtml(a.codigo_auditoria)}
                      </button>
                    </td>
                    <td class="px-3 py-3 max-w-[200px]">
                      <div class="font-bold text-slate-900 leading-snug">${escapeHtml(a.organizacion_nombre)}</div>
                      <div class="text-[11px] font-mono text-slate-500 mt-0.5">
                        ${escapeHtml(a.numero_certificado)} · <span class="font-sans font-semibold text-slate-600">${escapeHtml(a.norma_codigo)}</span>
                      </div>
                    </td>
                    <td class="px-2.5 py-3 whitespace-nowrap">
                      <div class="flex flex-col items-start gap-1">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${mod.badgeClass}">
                          <span aria-hidden="true">${mod.symbol}</span>
                          <span>${escapeHtml(a.tipo_auditoria)}</span>
                        </span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${met.badgeClass}">
                          <span aria-hidden="true">${met.symbol}</span>
                          <span>${escapeHtml(a.metodologia)}</span>
                        </span>
                      </div>
                    </td>
                    <td class="px-2.5 py-3 font-mono whitespace-nowrap">
                      <div class="text-slate-900 font-semibold text-[11px]">${escapeHtml(a.fecha_inicio)}</div>
                      <div class="text-slate-500 text-[11px]">→ ${escapeHtml(a.fecha_fin)}</div>
                      <div class="text-[10px] font-sans text-slate-500 mt-0.5">${a.dias_auditor} día(s)-auditor</div>
                    </td>
                    <td class="px-2.5 py-3 text-slate-800 font-medium max-w-[130px] leading-snug">
                      ${escapeHtml(a.auditor_lider)}
                    </td>
                    <td class="px-2.5 py-3 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.badgeClass}">
                        <span class="w-1.5 h-1.5 rounded-full ${st.dotClass}"></span>
                        <span>${escapeHtml(st.label)}</span>
                      </span>
                    </td>
                    <td class="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(a.id)}"
                        class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-800 border border-slate-200 hover:border-indigo-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Detalle →
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

function renderProgramacionGrid(audits: ProgramacionAuditEntity[]): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${audits
        .map((a) => {
          const mod = getModalityVisualStyle(a.tipo_auditoria);
          const met = getMethodologyVisualStyle(a.metodologia);
          const st = getAuditStatusVisualStyle(a.estatus);
          return `
            <article class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-4">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      ${escapeHtml(a.codigo_auditoria)}
                    </span>
                    <h3 class="text-sm font-bold text-slate-900 mt-1.5">
                      ${escapeHtml(a.organizacion_nombre)}
                    </h3>
                    <div class="text-xs text-slate-500 font-mono">
                      ${escapeHtml(a.numero_certificado)} · <span class="font-sans font-semibold text-slate-700">${escapeHtml(a.norma_codigo)}</span>
                    </div>
                  </div>

                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${st.badgeClass}">
                    <span class="w-1.5 h-1.5 rounded-full ${st.dotClass}"></span>
                    <span>${escapeHtml(st.label)}</span>
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${mod.badgeClass}">
                    <span aria-hidden="true">${mod.symbol}</span>
                    <span>${escapeHtml(a.tipo_auditoria)}</span>
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${met.badgeClass}">
                    <span aria-hidden="true">${met.symbol}</span>
                    <span>${escapeHtml(a.metodologia)}</span>
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <span aria-hidden="true">🏭</span>
                    <span>IAF ${a.sector_iaf}</span>
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Fechas Planificadas</span>
                    <span class="font-mono font-semibold text-slate-800">${escapeHtml(a.fecha_inicio)} al ${escapeHtml(a.fecha_fin)}</span>
                    <span class="text-[11px] text-slate-500 block">${a.dias_auditor} día(s)-auditor</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Auditor Líder</span>
                    <span class="font-semibold text-slate-800 block truncate">${escapeHtml(a.auditor_lider)}</span>
                    <span class="text-[11px] text-slate-500 block">${a.equipo.length} miembro(s) · ${a.sitiosMuestreo.length} sede(s)</span>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-action="open-changelog"
                  data-table-name="auditoria"
                  data-record-id="${escapeHtml(a.id)}"
                  data-entity-name="${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)}"
                  class="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer inline-flex items-center gap-1"
                >
                  <span aria-hidden="true">🕒</span>
                  <span>Historial</span>
                </button>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    data-action="go-audit-results"
                    data-audit-id="${escapeHtml(a.id)}"
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Resultados
                  </button>
                  <button
                    type="button"
                    data-action="select-prog-audit"
                    data-audit-id="${escapeHtml(a.id)}"
                    class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Abrir Detalle →
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

/**
 * Standardized 4-Zone Detail View for a Scheduled Audit Event
 */
function renderProgramacionDetailView(
  profile: UserProfile,
  state: ProgramacionViewState,
  audit: ProgramacionAuditEntity,
  allAuditors: AuditorDetailEntity[]
): string {
  const canEditSchedule = canEditAuditScheduleOrTeam(profile);
  const canAssignTeam = canEditSchedule;
  const canEditMatrix = canMutateAuditExecution(audit, profile);
  const mod = getModalityVisualStyle(audit.tipo_auditoria);
  const met = getMethodologyVisualStyle(audit.metodologia);
  const st = getAuditStatusVisualStyle(audit.estatus);

  const sortedSites = sortSitesWithPrincipalFirst(audit.sitiosMuestreo);
  const activeTab: ProgramacionChildTab = state.activeChildTab || 'equipo';

  const tabs: Array<{ id: ProgramacionChildTab; label: string; symbol: string; count: number }> = [
    { id: 'equipo', label: 'Equipo Evaluador', symbol: '👥', count: audit.equipo.length },
    { id: 'muestreo', label: 'Sedes y Muestreo', symbol: '🏭', count: sortedSites.length },
    { id: 'matriz', label: 'Matriz de Verificación Normativa', symbol: '✅', count: audit.matrizNormativa.length },
  ];

  let tabContentHtml = '';
  if (activeTab === 'equipo') {
    tabContentHtml = renderTeamChildTab(audit, allAuditors, canAssignTeam, state.isAddingTeamMember);
  } else if (activeTab === 'muestreo') {
    tabContentHtml = renderSamplingChildTab(audit, sortedSites, canEditSchedule);
  } else {
    tabContentHtml = renderVerificationMatrixTab(audit, canEditMatrix);
  }

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          id="backToProgramacionListBtn"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver a Programación</span>
        </button>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-action="go-audit-results"
            data-audit-id="${escapeHtml(audit.id)}"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span aria-hidden="true">📋</span>
            <span>Ver Resultados y Hallazgos</span>
          </button>

          <button
            type="button"
            data-action="open-changelog"
            data-table-name="auditoria"
            data-record-id="${escapeHtml(audit.id)}"
            data-entity-name="${escapeHtml(audit.codigo_auditoria)} · ${escapeHtml(audit.organizacion_nombre)}"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <span aria-hidden="true">🕒</span>
            <span>Historial de Cambios</span>
          </button>
        </div>
      </div>

      <!-- Zone 1: Relational Header Banner -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="text-3xl select-none shrink-0" aria-hidden="true">🗓️</span>
            <div class="space-y-1">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Evento de Auditoría Planificado
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  ${escapeHtml(audit.codigo_auditoria)}
                </h2>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${mod.badgeClass}">
                  <span aria-hidden="true">${mod.symbol}</span>
                  <span>${escapeHtml(audit.tipo_auditoria)}</span>
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${met.badgeClass}">
                  <span aria-hidden="true">${met.symbol}</span>
                  <span>${escapeHtml(audit.metodologia)}</span>
                </span>
              </div>
              <p class="text-xs text-slate-500">
                ${escapeHtml(audit.norma_codigo)} · Sector IAF ${audit.sector_iaf} · ${escapeHtml(audit.sede_principal_direccion)}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.badgeClass}">
              <span class="w-2 h-2 rounded-full ${st.dotClass}"></span>
              <span>${escapeHtml(st.label)}</span>
            </span>
          </div>
        </div>

        <!-- Parent Relational Links (Zero-UUID) -->
        <div class="px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 font-medium">Organización Cliente:</span>
              <button
                type="button"
                data-action="open-org-from-audit"
                data-org-id="${escapeHtml(audit.id_organizacion)}"
                class="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span aria-hidden="true">🏢</span>
                <span>${escapeHtml(audit.organizacion_nombre)}</span>
              </button>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 font-medium">Certificado Vinculado:</span>
              <button
                type="button"
                data-action="open-cert-from-audit"
                data-cert-id="${escapeHtml(audit.id_certificado)}"
                class="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                📜 ${escapeHtml(audit.numero_certificado)}
              </button>
            </div>
          </div>
          ${
            audit.recomendacion
              ? `
                <span class="px-2.5 py-0.5 rounded font-bold text-[11px] border ${
                  audit.recomendacion.estado === 'APROBADA'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }">
                  Recomendación ISO 17021-1: ${escapeHtml(audit.recomendacion.estado)}
                </span>
              `
              : ''
          }
        </div>
      </header>

      <!-- Zone 2: Separator -->
      <div class="border-t border-slate-200/60"></div>

      <!-- Zone 3: Direct Record Attributes + Inline Edit -->
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600">
            Atributos Directos de Planificación
          </h3>
          ${
            canEditSchedule && !state.isEditingAttributes
              ? `
                <button
                  type="button"
                  id="startEditProgAuditBtn"
                  class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  ✏️ Editar Planificación
                </button>
              `
              : ''
          }
        </div>

        ${
          state.saveSuccessMessage
            ? `<div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">✓ ${escapeHtml(state.saveSuccessMessage)}</div>`
            : ''
        }
        ${
          state.editErrorMessage
            ? `<div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">⚠️ ${escapeHtml(state.editErrorMessage)}</div>`
            : ''
        }

        ${
          state.isEditingAttributes && canEditSchedule
            ? renderEditAuditAttributesForm(audit, allAuditors)
            : `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                ${renderAttrCard('Código de Auditoría', audit.codigo_auditoria, true)}
                ${renderAttrCard('Tipo / Modalidad', audit.tipo_auditoria)}
                ${renderAttrCard('Metodología de Ejecución', audit.metodologia)}
                ${renderAttrCard('Fecha Inicio / Fin', `${audit.fecha_inicio} → ${audit.fecha_fin}`, true)}
                ${renderAttrCard('Días-Auditor Planificados', `${audit.dias_auditor} día(s)-auditor`)}
                ${renderAttrCard('Auditor Líder', audit.auditor_lider)}
                ${renderAttrCard('Norma Evaluada', audit.norma_codigo)}
                ${renderAttrCard('Sector IAF', `Sector IAF ${audit.sector_iaf}`)}
                ${renderAttrCard('Estatus Operativo', audit.estatus)}
              </div>
            `
        }
      </section>

      <!-- Zone 4: 3 Specialized Child Tabs -->
      <section class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div class="px-4 pt-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap gap-2" role="tablist" aria-label="Secciones de Programación de Auditoría">
          ${tabs
            .map((tab) => {
              const isActive = tab.id === activeTab;
              return `
                <button
                  type="button"
                  role="tab"
                  data-prog-tab="${tab.id}"
                  aria-selected="${isActive ? 'true' : 'false'}"
                  class="px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-b-2 ${
                    isActive
                      ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
                  }"
                >
                  <span aria-hidden="true">${tab.symbol}</span>
                  <span>${escapeHtml(tab.label)}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-600'
                  }">${tab.count}</span>
                </button>
              `;
            })
            .join('')}
        </div>

        <div class="p-5">
          ${tabContentHtml}
        </div>
      </section>
    </div>
  `;
}

function renderAttrCard(label: string, value: string, isMono = false): string {
  return `
    <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
      <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(label)}</div>
      <div class="text-xs font-semibold text-slate-900 ${isMono ? 'font-mono' : ''}">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

function renderEditAuditAttributesForm(
  audit: ProgramacionAuditEntity,
  auditors: AuditorDetailEntity[]
): string {
  const modalities = [
    'Etapa 1',
    'Etapa 2',
    'Seguimiento 1',
    'Seguimiento 2',
    'Renovación',
    'Diagnóstico',
    'Extraordinaria',
    'Especial',
  ];
  const statuses = ['Planificado', 'En Ejecución', 'En Espera', 'Completado', 'Cerrado', 'Cancelado'];

  return `
    <form id="editProgAuditForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label for="editProgTipo" class="block text-xs font-semibold text-slate-700 mb-1">Tipo / Modalidad</label>
          <select id="editProgTipo" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
            ${modalities
              .map(
                (m) =>
                  `<option value="${escapeHtml(m)}" ${audit.tipo_auditoria === m ? 'selected' : ''}>${escapeHtml(m)}</option>`
              )
              .join('')}
          </select>
        </div>

        <div>
          <label for="editProgMetodologia" class="block text-xs font-semibold text-slate-700 mb-1">Metodología</label>
          <select id="editProgMetodologia" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
            ${(['Presencial', 'Remota', 'Mixta'] as const)
              .map(
                (met) =>
                  `<option value="${met}" ${audit.metodologia === met ? 'selected' : ''}>${met}</option>`
              )
              .join('')}
          </select>
        </div>

        <div>
          <label for="editProgEstatus" class="block text-xs font-semibold text-slate-700 mb-1">Estatus Operativo</label>
          <select id="editProgEstatus" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
            ${statuses
              .map(
                (s) =>
                  `<option value="${escapeHtml(s)}" ${audit.estatus === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
              )
              .join('')}
          </select>
        </div>

        <div>
          <label for="editProgFechaInicio" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio</label>
          <input type="date" id="editProgFechaInicio" value="${escapeHtml(audit.fecha_inicio)}" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
        </div>

        <div>
          <label for="editProgFechaFin" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Fin</label>
          <input type="date" id="editProgFechaFin" value="${escapeHtml(audit.fecha_fin)}" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
        </div>

        <div>
          <label for="editProgDias" class="block text-xs font-semibold text-slate-700 mb-1">Días-Auditor</label>
          <input type="number" id="editProgDias" min="0.5" max="30" step="0.5" value="${audit.dias_auditor}" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
        </div>
      </div>

      <div>
        <label for="editProgAuditorLider" class="block text-xs font-semibold text-slate-700 mb-1">Auditor Líder Designado</label>
        <select id="editProgAuditorLider" class="w-full sm:w-1/2 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
          ${auditors
            .map(
              (aud) =>
                `<option value="${escapeHtml(aud.id)}" ${aud.id === audit.auditor_lider_id ? 'selected' : ''}>${escapeHtml(aud.nombre)} (${escapeHtml(aud.normas_acreditadas.join(', '))})</option>`
            )
            .join('')}
        </select>
      </div>

      <div class="flex items-center justify-end gap-2">
        <button type="button" id="cancelEditProgAuditBtn" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer">
          Cancelar
        </button>
        <button type="submit" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
          Guardar Cambios
        </button>
      </div>
    </form>
  `;
}

function renderTeamChildTab(
  audit: ProgramacionAuditEntity,
  allAuditors: AuditorDetailEntity[],
  canAssignTeam: boolean,
  isAddingTeamMember: boolean
): string {
  const existingIds = new Set(audit.equipo.map((m) => m.id_auditor));
  const availableAuditors = allAuditors.filter((a) => !existingIds.has(a.id));

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 class="text-sm font-bold text-slate-900">Equipo Evaluador Designado (equipo_auditor)</h4>
          <p class="text-xs text-slate-500">
            Miembros calificados bajo ISO/IEC 17021-1:2015 cláusula 7.2 para ${escapeHtml(audit.norma_codigo)} · Sector IAF ${audit.sector_iaf}
          </p>
        </div>
        ${
          canAssignTeam && availableAuditors.length > 0 && !isAddingTeamMember
            ? `
              <button
                type="button"
                id="openAddTeamMemberBtn"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer self-start sm:self-auto"
              >
                ➕ Asignar Evaluador
              </button>
            `
            : ''
        }
      </div>

      ${
        isAddingTeamMember && canAssignTeam && availableAuditors.length > 0
          ? `
            <form id="addTeamMemberForm" class="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="teamAuditorSelect" class="block text-xs font-semibold text-slate-700 mb-1">Auditor / Experto Disponible</label>
                  <select id="teamAuditorSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                    ${availableAuditors
                      .map((aud) => {
                        const normaMatch = aud.normas_acreditadas.some((n) =>
                          n.toLowerCase().includes(audit.norma_codigo.toLowerCase().split(':')[0])
                        );
                        const iafMatch = aud.sectores_iaf.includes(audit.sector_iaf);
                        const badgeText =
                          normaMatch && iafMatch
                            ? '✓ Competente en Norma + IAF'
                            : normaMatch
                            ? '⚠️ Solo Norma (Requiere Experto IAF)'
                            : 'ℹ️ Apoyo / Formación';
                        return `<option value="${escapeHtml(aud.id)}">${escapeHtml(aud.nombre)} — ${badgeText}</option>`;
                      })
                      .join('')}
                  </select>
                </div>
                <div>
                  <label for="teamRoleSelect" class="block text-xs font-semibold text-slate-700 mb-1">Rol en el Equipo Auditor</label>
                  <select id="teamRoleSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                    <option value="Auditor de Equipo">Auditor de Equipo</option>
                    <option value="Experto Técnico">Experto Técnico</option>
                    <option value="Auditor Líder">Auditor Líder</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2">
                <button type="button" id="cancelAddTeamMemberBtn" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer">Cancelar</button>
                <button type="submit" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">Confirmar Asignación</button>
              </div>
            </form>
          `
          : ''
      }

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th class="px-4 py-2.5">Integrante</th>
                <th class="px-3 py-2.5">Rol en Auditoría</th>
                <th class="px-3 py-2.5">Alcance de Competencia</th>
                <th class="px-3 py-2.5">Credencial</th>
                <th class="px-3 py-2.5">Contacto</th>
                ${canAssignTeam ? '<th class="px-4 py-2.5 text-right">Acciones</th>' : ''}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${audit.equipo
                .map((m) => {
                  const roleBadge =
                    m.rol === 'Auditor Líder'
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                      : m.rol === 'Experto Técnico'
                      ? 'bg-purple-50 text-purple-900 border-purple-200'
                      : 'bg-sky-50 text-sky-900 border-sky-200';
                  const credBadge =
                    m.estado_credencial === 'Vigente'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : m.estado_credencial === 'Por Vencer'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200';
                  return `
                    <tr class="hover:bg-slate-50/70">
                      <td class="px-4 py-3 font-bold text-slate-900">${escapeHtml(m.nombre)}</td>
                      <td class="px-3 py-3">
                        <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${roleBadge}">
                          ${escapeHtml(m.rol)}
                        </span>
                      </td>
                      <td class="px-3 py-3">
                        <div class="font-semibold text-slate-800">${escapeHtml(m.competencia_norma)}</div>
                        <div class="text-[11px] text-slate-500">Sector IAF ${m.competencia_sector_iaf}</div>
                      </td>
                      <td class="px-3 py-3">
                        <div class="font-mono text-[11px] font-semibold text-slate-700">${escapeHtml(m.credencial_codigo)}</div>
                        <span class="inline-flex mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${credBadge}">${escapeHtml(m.estado_credencial)}</span>
                      </td>
                      <td class="px-3 py-3 text-[11px] text-slate-600">
                        <div>${escapeHtml(m.email || '—')}</div>
                        <div class="font-mono">${escapeHtml(m.telefono || '')}</div>
                      </td>
                      ${
                        canAssignTeam
                          ? `
                            <td class="px-4 py-3 text-right">
                              ${
                                m.rol !== 'Auditor Líder'
                                  ? `
                                    <button
                                      type="button"
                                      data-action="remove-team-member"
                                      data-audit-id="${escapeHtml(audit.id)}"
                                      data-member-id="${escapeHtml(m.id)}"
                                      class="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                                    >
                                      Retirar
                                    </button>
                                  `
                                  : '<span class="text-[11px] text-slate-400">Titular</span>'
                              }
                            </td>
                          `
                          : ''
                      }
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

function renderSamplingChildTab(
  audit: ProgramacionAuditEntity,
  sortedSites: ProgramacionAuditEntity['sitiosMuestreo'],
  canEdit: boolean
): string {
  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 class="text-sm font-bold text-slate-900">Plan de Muestreo Multisitio (alcance_auditoria_sitio)</h4>
          <p class="text-xs text-slate-500">
            Distribución de sedes bajo IAF MD 1:2018 (Sitio 0 corresponde a Sede Principal HQ), modalidad presencial/remota y días asignados.
          </p>
        </div>
      </div>

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th class="px-4 py-2.5">Sitio</th>
                <th class="px-3 py-2.5">Ubicación</th>
                <th class="px-3 py-2.5">Modalidad de Evaluación</th>
                <th class="px-3 py-2.5">Fecha Asignada</th>
                <th class="px-3 py-2.5">Días</th>
                <th class="px-3 py-2.5">En Muestra</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${sortedSites
                .map((site) => {
                  const isHq = site.numero_sitio === 0;
                  return `
                    <tr class="hover:bg-slate-50/70">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1.5">
                          <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isHq
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }">
                            ${isHq ? 'Sitio 0 (HQ)' : `Sitio #${site.numero_sitio}`}
                          </span>
                          <span class="font-bold text-slate-900">${escapeHtml(site.nombre_sitio)}</span>
                        </div>
                        ${
                          site.notas
                            ? `<div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(site.notas)}</div>`
                            : ''
                        }
                      </td>
                      <td class="px-3 py-3 text-slate-600 max-w-xs">${escapeHtml(site.direccion_sitio)}</td>
                      <td class="px-3 py-3">
                        ${
                          canEdit
                            ? `
                              <select
                                aria-label="Modalidad para ${escapeHtml(site.nombre_sitio)}"
                                data-action="change-site-sampling-mode"
                                data-audit-id="${escapeHtml(audit.id)}"
                                data-site-id="${escapeHtml(site.id)}"
                                class="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2 py-1"
                              >
                                <option value="Presencial" ${site.modalidad_evaluacion === 'Presencial' ? 'selected' : ''}>🏭 Presencial</option>
                                <option value="Remota" ${site.modalidad_evaluacion === 'Remota' ? 'selected' : ''}>💻 Remota</option>
                              </select>
                            `
                            : `
                              <span class="px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                site.modalidad_evaluacion === 'Presencial'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                              }">${escapeHtml(site.modalidad_evaluacion)}</span>
                            `
                        }
                      </td>
                      <td class="px-3 py-3 font-mono text-slate-800">
                        ${
                          canEdit
                            ? `
                              <input
                                type="date"
                                aria-label="Fecha asignada para ${escapeHtml(site.nombre_sitio)}"
                                data-action="change-site-sampling-date"
                                data-audit-id="${escapeHtml(audit.id)}"
                                data-site-id="${escapeHtml(site.id)}"
                                value="${escapeHtml(site.fecha_asignada)}"
                                class="text-xs font-mono rounded-lg border border-slate-300 bg-white px-2 py-1"
                              />
                            `
                            : escapeHtml(site.fecha_asignada)
                        }
                      </td>
                      <td class="px-3 py-3 font-mono font-semibold text-slate-700">${site.dias_asignados} d</td>
                      <td class="px-3 py-3">
                        ${
                          canEdit
                            ? `
                              <button
                                type="button"
                                data-action="toggle-site-sampled"
                                data-audit-id="${escapeHtml(audit.id)}"
                                data-site-id="${escapeHtml(site.id)}"
                                class="px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-colors ${
                                  site.muestreado
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }"
                              >
                                ${site.muestreado ? '✓ Incluida' : 'No muestreada'}
                              </button>
                            `
                            : `<span class="text-xs font-semibold">${site.muestreado ? '✓ Incluida' : 'No'}</span>`
                        }
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

function renderVerificationMatrixTab(
  audit: ProgramacionAuditEntity,
  canEdit: boolean
): string {
  const statuses: Array<ProgramacionAuditEntity['matrizNormativa'][number]['estado_verificacion']> = [
    'Planificada',
    'Conforme',
    'Hallazgo',
    'No Aplicable',
  ];

  return `
    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-bold text-slate-900">Matriz de Verificación Normativa</h4>
        <p class="text-xs text-slate-500">
          Lista de verificación de cláusulas normativas (requisito) programadas por proceso auditado durante la ejecución.
        </p>
      </div>

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th class="px-4 py-2.5">Cláusula</th>
                <th class="px-3 py-2.5">Requisito Normativo</th>
                <th class="px-3 py-2.5">Proceso Auditado</th>
                <th class="px-3 py-2.5">Estado de Verificación</th>
                <th class="px-4 py-2.5">Notas de Campo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${audit.matrizNormativa
                .map((item) => {
                  const statusClass =
                    item.estado_verificacion === 'Conforme'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : item.estado_verificacion === 'Hallazgo'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : item.estado_verificacion === 'No Aplicable'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-sky-50 text-sky-800 border-sky-200';

                  return `
                    <tr class="hover:bg-slate-50/70">
                      <td class="px-4 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        Cláusula ${escapeHtml(item.codigo_clausula)}
                      </td>
                      <td class="px-3 py-3 font-semibold text-slate-900">
                        ${escapeHtml(item.titulo_clausula)}
                      </td>
                      <td class="px-3 py-3 text-slate-700">
                        ${escapeHtml(item.proceso_nombre)}
                      </td>
                      <td class="px-3 py-3">
                        ${
                          canEdit
                            ? `
                              <select
                                aria-label="Estado de verificación cláusula ${escapeHtml(item.codigo_clausula)}"
                                data-action="change-matrix-status"
                                data-audit-id="${escapeHtml(audit.id)}"
                                data-item-id="${escapeHtml(item.id)}"
                                class="text-xs font-semibold rounded-lg border px-2 py-1 ${statusClass}"
                              >
                                ${statuses
                                  .map(
                                    (st) =>
                                      `<option value="${st}" ${item.estado_verificacion === st ? 'selected' : ''}>${st}</option>`
                                  )
                                  .join('')}
                              </select>
                            `
                            : `
                              <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${statusClass}">
                                ${escapeHtml(item.estado_verificacion)}
                              </span>
                            `
                        }
                      </td>
                      <td class="px-4 py-3 text-slate-600">
                        ${escapeHtml(item.notas || '—')}
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
