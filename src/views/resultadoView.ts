import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import { canMutateAuditExecution } from '../lib/accessControl';
import {
  calculatePhase5FindingStats,
  evaluateIso17021Recommendation,
  filterPhase5Findings,
  FINDING_LIFECYCLE_ORDER,
  getLifecycleStatusMeta,
  getPhase5FindingTypeMeta,
  type FindingLifecycleStatus,
  type Iso17021RecommendationEvaluation,
  type Phase5FindingEntity,
  type ProgramacionAuditEntity,
  type ResultadoViewState,
} from '../lib/auditExecution';

export type { ResultadoViewState };

export interface ResultadoViewProps {
  profile: UserProfile;
  state: ResultadoViewState;
  audits: ProgramacionAuditEntity[];
  findings: Phase5FindingEntity[];
  processes: Array<{ id: string; nombre_proceso: string }>;
  requirements: Array<{ id: string; codigo: string; norma: string }>;
}

export function renderResultadoView(props: ResultadoViewProps): string {
  const { profile, state, audits, findings, processes, requirements } = props;

  const canMutateAudit = (audit: ProgramacionAuditEntity | null | undefined): boolean =>
    canMutateAuditExecution(audit, profile);

  const activeAudit =
    audits.find((a) => a.id === state.activeAuditIdForDecision) || audits[0] || null;
  const mutableAudits = audits.filter((a) => canMutateAudit(a));
  const isStaffOrAssignedAuditor = mutableAudits.length > 0;
  const canSignDecision = canMutateAudit(activeAudit);

  const recommendationEval: Iso17021RecommendationEvaluation | null = activeAudit
    ? evaluateIso17021Recommendation(findings, activeAudit.id)
    : null;

  const scopedFindings = filterPhase5Findings(findings, {
    auditId: state.selectedAuditId,
    type: state.filterType,
    lifecycle: state.filterLifecycle,
    query: state.searchQuery,
  });

  const stats = calculatePhase5FindingStats(
    state.selectedAuditId === 'ALL'
      ? findings
      : findings.filter((f) => f.id_auditoria === state.selectedAuditId)
  );

  const inspectingFinding = state.inspectingFindingId
    ? findings.find((f) => f.id === state.inspectingFindingId) || null
    : null;
  const inspectingFindingAudit = inspectingFinding
    ? audits.find((a) => a.id === inspectingFinding.id_auditoria) || null
    : null;
  const canEditInspectingFinding = Boolean(
    inspectingFinding && canMutateAudit(inspectingFindingAudit)
  );
  const editableAuditIds = new Set(mutableAudits.map((a) => a.id));

  return `
    <div class="space-y-6">
      <!-- Top Audit Selector & ISO 17021-1 Recommendation Engine -->
      ${
        activeAudit && recommendationEval
          ? renderRecommendationEngineCard(
              activeAudit,
              audits,
              recommendationEval,
              canSignDecision,
              state
            )
          : ''
      }

      <!-- Findings Board Header, KPIs & Filters -->
      <section class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Tablero de Hallazgos y Acciones Correctivas
            </h2>
            <p class="text-xs text-slate-500">
              Clasificación formal ISO 19011:2018 (NC Mayor, NC Menor, Observación, Oportunidad de Mejora) y seguimiento de cierre
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="text-xs text-slate-500 font-medium tabular-nums mr-1">
              Mostrando <span class="font-bold text-slate-900 tabular-nums">${scopedFindings.length}</span> de <span class="font-semibold text-slate-700 tabular-nums">${findings.length}</span> hallazgos registrados
            </div>
            <!-- View Switcher: Tabla | Kanban -->
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs" role="group" aria-label="Vista del tablero de hallazgos">
              <button
                type="button"
                data-res-display-mode="list"
                aria-pressed="${state.displayMode === 'list' ? 'true' : 'false'}"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  state.displayMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">☰</span>
                <span>Tabla</span>
              </button>
              <button
                type="button"
                data-res-display-mode="kanban"
                aria-pressed="${state.displayMode === 'kanban' ? 'true' : 'false'}"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
                  state.displayMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">🗂️</span>
                <span>Kanban</span>
              </button>
            </div>

            ${
              activeAudit
                ? `
                  <button
                    type="button"
                    data-action="open-changelog"
                    data-table-name="hallazgo"
                    data-record-id="${escapeHtml(activeAudit.id)}"
                    data-entity-name="Hallazgos · ${escapeHtml(activeAudit.codigo_auditoria)}"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span aria-hidden="true">🕒</span>
                    <span>Historial de Cambios</span>
                  </button>
                `
                : ''
            }

            ${
              isStaffOrAssignedAuditor
                ? `
                  <button
                    type="button"
                    id="openNewFindingFormBtn"
                    class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <span aria-hidden="true">➕</span>
                    <span>Registrar Hallazgo</span>
                  </button>
                `
                : ''
            }
          </div>
        </div>

        <!-- 4-Tier Finding Classification Metrics -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div class="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-rose-800">🚨 NC Mayor</span>
              <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-200/70 text-rose-900">
                ${stats.ncMayorAbiertas} abiertas
              </span>
            </div>
            <div class="text-2xl font-bold text-rose-950 mt-1 tabular-nums">${stats.ncMayor}</div>
          </div>

          <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div class="text-[11px] font-bold uppercase tracking-wider text-amber-800">⚠️ NC Menor</div>
            <div class="text-2xl font-bold text-amber-950 mt-1 tabular-nums">${stats.ncMenor}</div>
          </div>

          <div class="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div class="text-[11px] font-bold uppercase tracking-wider text-blue-800">👁️ Observación</div>
            <div class="text-2xl font-bold text-blue-950 mt-1 tabular-nums">${stats.observaciones}</div>
          </div>

          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">💡 Oport. Mejora</div>
            <div class="text-2xl font-bold text-emerald-950 mt-1 tabular-nums">${stats.oportunidadesMejora}</div>
          </div>

          <div class="col-span-2 lg:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-600">Estado Global</div>
            <div class="text-xs font-semibold text-slate-800 mt-1.5 flex items-center justify-between">
              <span>⏳ Abiertos: <strong>${stats.abiertos}</strong></span>
              <span>✓ Cerrados: <strong>${stats.cerrados}</strong></span>
            </div>
          </div>
        </div>

        <!-- Inline Registration Form -->
        ${
          state.isLoggingFinding && isStaffOrAssignedAuditor
            ? renderLogFindingForm(
                mutableAudits,
                mutableAudits.some((a) => a.id === activeAudit?.id)
                  ? activeAudit?.id || ''
                  : mutableAudits[0]?.id || '',
                processes,
                requirements,
                state.findingFormError
              )
            : ''
        }

        <!-- Filter Controls -->
        <div class="pt-3 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div class="lg:col-span-4 relative min-w-0">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs" aria-hidden="true">🔍</span>
            <input
              type="text"
              id="resultadoSearchInput"
              autocomplete="off"
              value="${escapeHtml(state.searchQuery)}"
              placeholder="Buscar por código, cláusula, proceso, evidencia... (/)"
              aria-label="Buscar hallazgos"
              class="w-full min-w-0 text-xs rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <div class="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              ${
                state.searchQuery
                  ? `
                    <button
                      type="button"
                      id="clearResultadoSearchBtn"
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

          <div class="lg:col-span-3 min-w-0">
            <select
              id="resultadoBoardAuditFilter"
              aria-label="Filtrar tablero por auditoría"
              class="w-full min-w-0 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            >
              <option value="ALL" ${state.selectedAuditId === 'ALL' ? 'selected' : ''}>Todas las auditorías (${findings.length})</option>
              ${audits
                .map(
                  (a) =>
                    `<option value="${escapeHtml(a.id)}" ${state.selectedAuditId === a.id ? 'selected' : ''}>${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)}</option>`
                )
                .join('')}
            </select>
          </div>

          <div class="lg:col-span-2 min-w-0">
            <select
              id="resultadoLifecycleFilter"
              aria-label="Filtrar por estado de ciclo de vida"
              class="w-full min-w-0 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            >
              <option value="ALL" ${state.filterLifecycle === 'ALL' ? 'selected' : ''}>Todos los estados</option>
              <option value="OPEN_ONLY" ${state.filterLifecycle === 'OPEN_ONLY' ? 'selected' : ''}>Solo Abiertos</option>
              <option value="CLOSED_ONLY" ${state.filterLifecycle === 'CLOSED_ONLY' ? 'selected' : ''}>Solo Cerrados</option>
              ${FINDING_LIFECYCLE_ORDER.map(
                (st) =>
                  `<option value="${escapeHtml(st)}" ${state.filterLifecycle === st ? 'selected' : ''}>${escapeHtml(st)}</option>`
              ).join('')}
            </select>
          </div>

          <div class="lg:col-span-3 min-w-0 flex flex-wrap gap-1 justify-start lg:justify-end">
            ${renderClassificationFilterButton('ALL', 'Todos', state.filterType)}
            ${renderClassificationFilterButton('NC_MAYOR', '🚨 Mayor', state.filterType)}
            ${renderClassificationFilterButton('NC_MENOR', '⚠️ Menor', state.filterType)}
            ${renderClassificationFilterButton('OBSERVACION', '👁️ Obs', state.filterType)}
            ${renderClassificationFilterButton('OPORTUNIDAD_MEJORA', '💡 OM', state.filterType)}
          </div>
        </div>
      </section>

      <!-- Findings Board Content: Tabular vs Kanban -->
      ${
        state.displayMode === 'kanban'
          ? renderFindingsKanbanBoard(scopedFindings, editableAuditIds)
          : renderFindingsTable(scopedFindings, editableAuditIds)
      }

      <!-- Finding Detail / Lifecycle & CAPA Modal -->
      ${
        inspectingFinding
          ? renderFindingDetailModal(inspectingFinding, canEditInspectingFinding)
          : ''
      }
    </div>
  `;
}

function renderClassificationFilterButton(
  value: string,
  label: string,
  current: string
): string {
  const active = current === value;
  return `
    <button
      type="button"
      data-res-filter-type="${escapeHtml(value)}"
      class="px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
        active
          ? 'bg-slate-900 text-white shadow-2xs'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderRecommendationEngineCard(
  audit: ProgramacionAuditEntity,
  allAudits: ProgramacionAuditEntity[],
  evalResult: Iso17021RecommendationEvaluation,
  canSign: boolean,
  state: ResultadoViewState
): string {
  const isApproved = evalResult.canApprove;
  const containerTheme = isApproved
    ? 'bg-emerald-50/70 border-emerald-300'
    : 'bg-rose-50/80 border-rose-300';
  const verdictBadgeTheme = isApproved
    ? 'bg-emerald-600 text-white'
    : 'bg-rose-700 text-white';

  return `
    <section class="border-2 rounded-xl p-5 shadow-2xs space-y-4 ${containerTheme}" aria-label="Motor de Recomendación ISO/IEC 17021-1">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="space-y-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-600">
              Motor de Decisión ISO/IEC 17021-1:2015 (Cláusula 9.5)
            </span>
            <span class="px-3 py-0.5 rounded-md text-xs font-extrabold tracking-wide ${verdictBadgeTheme}">
              Recomendación: ${escapeHtml(evalResult.status)}
            </span>
          </div>
          <p class="text-xs text-slate-700 font-medium">
            ${escapeHtml(evalResult.summaryText)}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 w-full lg:w-auto lg:max-w-md shrink-0">
          <label for="decisionAuditSelector" class="text-xs font-bold text-slate-700 whitespace-nowrap shrink-0">
            Auditoría Evaluada:
          </label>
          <select
            id="decisionAuditSelector"
            class="w-full sm:w-auto min-w-0 max-w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 shadow-2xs"
          >
            ${allAudits
              .map(
                (a) =>
                  `<option value="${escapeHtml(a.id)}" ${a.id === audit.id ? 'selected' : ''}>${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)} (${escapeHtml(a.norma_codigo)})</option>`
              )
              .join('')}
          </select>
        </div>
      </div>

      <!-- Blocking Reasons or Clear Indicators -->
      ${
        evalResult.blockingReasons.length > 0
          ? `
            <div class="bg-white/90 border border-rose-200 rounded-lg p-3.5 space-y-1.5">
              <div class="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <span aria-hidden="true">🔒</span>
                <span>Bloqueos Normativos Activos (Aprobación Impedida):</span>
              </div>
              <ul class="list-disc pl-5 text-xs text-rose-800 space-y-1">
                ${evalResult.blockingReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
              </ul>
            </div>
          `
          : ''
      }

      ${
        evalResult.warnings.length > 0
          ? `
            <div class="bg-white/80 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
              ${evalResult.warnings.map((w) => `<div>• ${escapeHtml(w)}</div>`).join('')}
            </div>
          `
          : ''
      }

      ${
        state.recommendationError
          ? `<div class="p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold">⚠️ ${escapeHtml(state.recommendationError)}</div>`
          : ''
      }
      ${
        state.recommendationSuccess
          ? `<div class="p-3 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">✓ ${escapeHtml(state.recommendationSuccess)}</div>`
          : ''
      }

      <!-- Signed Recommendation Record or Signature Form -->
      ${
        audit.recomendacion
          ? `
            <div class="bg-white border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div class="space-y-1">
                <div class="font-bold text-emerald-900">
                  ✓ Dictamen Registrado en public.auditoria — ${escapeHtml(audit.recomendacion.estado)}
                </div>
                <div class="text-slate-600">
                  Auditor Líder: <strong>${escapeHtml(audit.recomendacion.auditor_lider_nombre)}</strong> ·
                  Firma Electrónica: <span class="font-mono font-bold text-slate-800">${escapeHtml(audit.recomendacion.firma_electronica)}</span>
                </div>
                <div class="text-slate-500 italic">"${escapeHtml(audit.recomendacion.comentarios)}"</div>
              </div>
              <div class="text-right shrink-0 space-y-1">
                <div class="font-mono text-[11px] text-slate-500">${escapeHtml(audit.recomendacion.timestamp.slice(0, 19).replace('T', ' '))} UTC</div>
                <button
                  type="button"
                  data-action="open-changelog"
                  data-table-name="auditoria"
                  data-record-id="${escapeHtml(audit.id)}"
                  data-entity-name="${escapeHtml(audit.codigo_auditoria)} · Recomendación"
                  class="text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                >
                  🕒 Ver en Historial
                </button>
              </div>
            </div>
          `
          : canSign
          ? `
            <form id="signRecommendationForm" data-audit-id="${escapeHtml(audit.id)}" class="bg-white/90 border border-slate-200 rounded-lg p-4 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label for="recSignatureInput" class="block text-xs font-semibold text-slate-700 mb-1">
                    Firma Electrónica / Credencial Auditor Líder
                  </label>
                  <input
                    type="text"
                    id="recSignatureInput"
                    placeholder="Ej. AUD-REG-2021-05 · C. Mendoza"
                    ${!isApproved ? 'disabled' : ''}
                    class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label for="recCommentsInput" class="block text-xs font-semibold text-slate-700 mb-1">
                    Justificación Técnica de Recomendación
                  </label>
                  <input
                    type="text"
                    id="recCommentsInput"
                    placeholder="Ej. Evidencia objetiva verificada conforme a ISO/IEC 17021-1 cláusula 9.5..."
                    ${!isApproved ? 'disabled' : ''}
                    class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[11px] text-slate-500">
                  Auditor Líder titular: <strong>${escapeHtml(audit.auditor_lider)}</strong>
                </span>
                <button
                  type="submit"
                  id="submitRecommendationBtn"
                  ${!isApproved ? 'disabled' : ''}
                  class="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold text-center transition-colors ${
                    isApproved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }"
                >
                  ${
                    isApproved
                      ? '✍️ Firmar y Emitir Recomendación APROBADA'
                      : '🔒 Aprobación Bloqueada (NC Mayor / Plan Pendiente)'
                  }
                </button>
              </div>
            </form>
          `
          : ''
      }
    </section>
  `;
}

function renderLogFindingForm(
  audits: ProgramacionAuditEntity[],
  defaultAuditId: string,
  processes: Array<{ id: string; nombre_proceso: string }>,
  requirements: Array<{ id: string; codigo: string; norma: string }>,
  errorMessage?: string | null
): string {
  const selectedAudit = audits.find((a) => a.id === defaultAuditId) || audits[0];
  const sitesForSelect = selectedAudit?.sitiosMuestreo || [];

  return `
    <div class="bg-indigo-50/70 border-2 border-indigo-300 rounded-xl p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-base" aria-hidden="true">📝</span>
          <h3 class="text-sm font-bold text-slate-900">Registrar Nuevo Hallazgo en Campo (public.hallazgo)</h3>
        </div>
        <button
          type="button"
          id="closeNewFindingFormBtn"
          class="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
        >
          ✕ Cancelar
        </button>
      </div>

      ${
        errorMessage
          ? `<div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">⚠️ ${escapeHtml(errorMessage)}</div>`
          : ''
      }

      <form id="phase5NewFindingForm" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label for="p5FindingAuditSelect" class="block text-xs font-semibold text-slate-700 mb-1">Auditoría</label>
            <select id="p5FindingAuditSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${audits
                .map(
                  (a) =>
                    `<option value="${escapeHtml(a.id)}" ${a.id === defaultAuditId ? 'selected' : ''}>${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)}</option>`
                )
                .join('')}
            </select>
          </div>

          <div>
            <label for="p5FindingTypeSelect" class="block text-xs font-semibold text-slate-700 mb-1">Clasificación ISO</label>
            <select id="p5FindingTypeSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="NC_MAYOR">🚨 No Conformidad Mayor (NC_MAYOR)</option>
              <option value="NC_MENOR">⚠️ No Conformidad Menor (NC_MENOR)</option>
              <option value="OBSERVACION">👁️ Observación (OBSERVACION)</option>
              <option value="OPORTUNIDAD_MEJORA">💡 Oportunidad de Mejora (OPORTUNIDAD_MEJORA)</option>
            </select>
          </div>

          <div>
            <label for="p5FindingReqSelect" class="block text-xs font-semibold text-slate-700 mb-1">Cláusula (Requisito)</label>
            <select id="p5FindingReqSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${
                requirements.length > 0
                  ? requirements
                      .map(
                        (r) =>
                          `<option value="${escapeHtml(r.id)}">Cláusula ${escapeHtml(r.codigo)} (${escapeHtml(r.norma)})</option>`
                      )
                      .join('')
                  : `<option value="f0000000-0000-0000-0000-000000000085">Cláusula 8.5 (ISO 9001:2015)</option>`
              }
            </select>
          </div>

          <div>
            <label for="p5FindingProcessSelect" class="block text-xs font-semibold text-slate-700 mb-1">Proceso Afectado</label>
            <select id="p5FindingProcessSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${
                processes.length > 0
                  ? processes
                      .map(
                        (p) =>
                          `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre_proceso)}</option>`
                      )
                      .join('')
                  : `<option value="60000000-0000-0000-0000-000000000001">Troquelado y Fundición</option>`
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="p5FindingSiteInput" class="block text-xs font-semibold text-slate-700 mb-1">Sede donde se detectó</label>
            <input
              type="text"
              id="p5FindingSiteInput"
              value="${escapeHtml(sitesForSelect[0]?.nombre_sitio || 'Planta Valencia')}"
              required
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            />
          </div>

          <div>
            <label for="p5FindingEvidenceInput" class="block text-xs font-semibold text-slate-700 mb-1">Evidencia Objetiva</label>
            <input
              type="text"
              id="p5FindingEvidenceInput"
              placeholder="Ej. Orden de trabajo OT-992 sin firma de liberación..."
              required
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            />
          </div>

          <div>
            <label for="p5FindingDueDateInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Límite</label>
            <input
              type="date"
              id="p5FindingDueDateInput"
              value="2024-12-30"
              required
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
            />
          </div>
        </div>

        <div>
          <label for="p5FindingDescInput" class="block text-xs font-semibold text-slate-700 mb-1">Descripción de la Desviación</label>
          <textarea
            id="p5FindingDescInput"
            rows="2"
            required
            placeholder="Redacte el hallazgo citando requisito, incumplimiento observado y evidencia objetiva..."
            class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2">
          <button type="button" id="cancelNewFindingFormBtn" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
            Guardar Hallazgo
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderFindingsTable(
  findings: Phase5FindingEntity[],
  editableAuditIds: Set<string>
): string {
  if (findings.length === 0) {
    return `
      <div class="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2 shadow-2xs">
        <div class="text-2xl" aria-hidden="true">📋</div>
        <h3 class="text-sm font-bold text-slate-900">No hay hallazgos que coincidan con el filtro</h3>
        <p class="text-xs text-slate-500">Modifique los filtros o registre un nuevo hallazgo de campo.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600 border-collapse">
          <thead class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3">Código & Severidad</th>
              <th class="px-3 py-3">Cláusula & Proceso</th>
              <th class="px-3 py-3">Desviación y Evidencia</th>
              <th class="px-3 py-3">Ciclo de Vida</th>
              <th class="px-3 py-3">Vencimiento</th>
              <th class="px-4 py-3 text-right">Gestión CAPA</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${findings
              .map((f) => {
                const typeMeta = getPhase5FindingTypeMeta(f.tipo);
                const lifeMeta = getLifecycleStatusMeta(f.estado_ciclo);
                const canManage = editableAuditIds.has(f.id_auditoria);
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors ${typeMeta.cardBorderClass}">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="font-mono font-bold text-slate-900">${escapeHtml(f.codigo_hallazgo)}</div>
                      <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${typeMeta.badgeClass}">
                        <span aria-hidden="true">${typeMeta.symbol}</span>
                        <span>${escapeHtml(typeMeta.shortLabel)}</span>
                      </span>
                    </td>
                    <td class="px-3 py-3">
                      <div class="font-mono font-bold text-indigo-700">Cláusula ${escapeHtml(f.requisito_codigo)}</div>
                      <div class="font-semibold text-slate-800">${escapeHtml(f.proceso_nombre)}</div>
                      <div class="text-[11px] text-slate-500">${escapeHtml(f.sitio_nombre)} · ${escapeHtml(f.organizacion_nombre || '')}</div>
                    </td>
                    <td class="px-3 py-3 max-w-md">
                      <div class="font-semibold text-slate-900">${escapeHtml(f.descripcion)}</div>
                      ${
                        f.evidencia
                          ? `<div class="text-[11px] text-slate-500 mt-0.5">Evidencia: ${escapeHtml(f.evidencia)}</div>`
                          : ''
                      }
                    </td>
                    <td class="px-3 py-3 whitespace-nowrap">
                      <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${lifeMeta.badgeClass}">
                        ${escapeHtml(lifeMeta.label)}
                      </span>
                    </td>
                    <td class="px-3 py-3 font-mono whitespace-nowrap">
                      <div>${escapeHtml(f.fecha_limite)}</div>
                      ${
                        f.fecha_cierre
                          ? `<div class="text-[10px] text-emerald-700 font-bold">Cerrado: ${escapeHtml(f.fecha_cierre)}</div>`
                          : ''
                      }
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-action="inspect-finding"
                        data-finding-id="${escapeHtml(f.id)}"
                        class="px-3 py-1.5 rounded-lg ${canManage ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} text-xs font-semibold cursor-pointer"
                      >
                        ${canManage ? 'Gestionar →' : 'Ver Detalle →'}
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

function renderFindingsKanbanBoard(
  findings: Phase5FindingEntity[],
  editableAuditIds: Set<string>
): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
      ${FINDING_LIFECYCLE_ORDER.map((colStatus) => {
        const colFindings = findings.filter((f) => f.estado_ciclo === colStatus);
        const colMeta = getLifecycleStatusMeta(colStatus);

        return `
          <div class="bg-slate-50/90 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div class="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${colMeta.headerBgClass}">
              <span class="text-xs font-bold truncate">${escapeHtml(colStatus)}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-slate-800 tabular-nums">
                ${colFindings.length}
              </span>
            </div>

            <div class="p-2.5 space-y-2.5 min-h-40">
              ${
                colFindings.length === 0
                  ? `<div class="py-8 text-center text-[11px] text-slate-400 italic">Sin hallazgos en esta etapa</div>`
                  : colFindings
                      .map((f) => {
                        const typeMeta = getPhase5FindingTypeMeta(f.tipo);
                        const canManage = editableAuditIds.has(f.id_auditoria);
                        return `
                          <article class="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2 ${typeMeta.cardBorderClass}">
                            <div class="flex items-center justify-between gap-1">
                              <span class="font-mono text-[11px] font-bold text-slate-900">${escapeHtml(f.codigo_hallazgo)}</span>
                              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${typeMeta.badgeClass}">
                                <span aria-hidden="true">${typeMeta.symbol}</span>
                                <span>${escapeHtml(typeMeta.shortLabel)}</span>
                              </span>
                            </div>
                            <div class="text-xs font-semibold text-slate-900 line-clamp-3">
                              ${escapeHtml(f.descripcion)}
                            </div>
                            <div class="text-[11px] text-slate-500">
                              <span class="font-mono font-bold text-indigo-700">Cl. ${escapeHtml(f.requisito_codigo)}</span> · ${escapeHtml(f.proceso_nombre)}
                            </div>
                            <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span class="font-mono text-[10px] text-slate-500">Lím: ${escapeHtml(f.fecha_limite)}</span>
                              <button
                                type="button"
                                data-action="inspect-finding"
                                data-finding-id="${escapeHtml(f.id)}"
                                class="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                              >
                                ${canManage ? 'Gestionar →' : 'Ver Detalle →'}
                              </button>
                            </div>
                          </article>
                        `;
                      })
                      .join('')
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderFindingDetailModal(
  finding: Phase5FindingEntity,
  canEditFinding: boolean
): string {
  const typeMeta = getPhase5FindingTypeMeta(finding.tipo);
  const lifeMeta = getLifecycleStatusMeta(finding.estado_ciclo);
  const availableStatuses: FindingLifecycleStatus[] = [...FINDING_LIFECYCLE_ORDER];

  return `
    <div
      id="findingDetailModalBackdrop"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="findingDetailModalTitle"
    >
      <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                ${escapeHtml(finding.codigo_hallazgo)}
              </span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${typeMeta.badgeClass}">
                <span aria-hidden="true">${typeMeta.symbol}</span>
                <span>${escapeHtml(typeMeta.label)}</span>
              </span>
              <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${lifeMeta.badgeClass}">
                ${escapeHtml(lifeMeta.label)}
              </span>
            </div>
            <h3 id="findingDetailModalTitle" class="text-sm font-bold text-slate-900">
              ${escapeHtml(finding.organizacion_nombre || '')} · Cláusula ${escapeHtml(finding.requisito_codigo)}
            </h3>
          </div>

          <button
            type="button"
            id="closeFindingDetailModalBtn"
            aria-label="Cerrar gestión de hallazgo"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form id="findingLifecycleForm" data-finding-id="${escapeHtml(finding.id)}" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <span class="text-[10px] font-bold uppercase text-slate-400 block">Proceso & Sede</span>
              <span class="font-bold text-slate-900">${escapeHtml(finding.proceso_nombre)}</span>
              <span class="block text-[11px] text-slate-500">${escapeHtml(finding.sitio_nombre)}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase text-slate-400 block">Fecha Límite</span>
              <span class="font-mono font-bold text-slate-900">${escapeHtml(finding.fecha_limite)}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase text-slate-400 block">Fecha de Cierre Formal</span>
              <span class="font-mono font-bold ${finding.fecha_cierre ? 'text-emerald-700' : 'text-slate-400'}">
                ${escapeHtml(finding.fecha_cierre || 'Pendiente de cierre')}
              </span>
            </div>
          </div>

          <div class="space-y-1">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Descripción de la Desviación</div>
            <p class="p-3 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium">${escapeHtml(finding.descripcion)}</p>
          </div>

          <div class="space-y-1">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Evidencia Objetiva</div>
            <p class="p-3 rounded-lg bg-white border border-slate-200 text-slate-700">${escapeHtml(finding.evidencia || 'Sin evidencia adjunta')}</p>
          </div>

          <div>
            <label for="modalFindingRootCause" class="block text-xs font-bold text-slate-700 mb-1">
              Análisis de Causa Raíz (Cliente)
            </label>
            <textarea
              id="modalFindingRootCause"
              rows="2"
              ${!canEditFinding ? 'readonly' : ''}
              placeholder="Describa la causa raíz identificada mediante 5 Porqués / Ishikawa..."
              class="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 ${!canEditFinding ? 'bg-slate-50' : ''}"
            >${escapeHtml(finding.analisis_causa_raiz)}</textarea>
          </div>

          <div>
            <label for="modalFindingCapa" class="block text-xs font-bold text-slate-700 mb-1">
              Plan de Acción Correctiva (CAPA)
            </label>
            <textarea
              id="modalFindingCapa"
              rows="2"
              ${!canEditFinding ? 'readonly' : ''}
              placeholder="Especifique acciones correctivas, responsables y evidencias de implementación..."
              class="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 ${!canEditFinding ? 'bg-slate-50' : ''}"
            >${escapeHtml(finding.plan_accion_correctiva)}</textarea>
          </div>

          <div>
            <label for="modalFindingVerification" class="block text-xs font-bold text-slate-700 mb-1">
              Comentarios de Verificación del Auditor
            </label>
            <textarea
              id="modalFindingVerification"
              rows="2"
              ${!canEditFinding ? 'readonly' : ''}
              placeholder="Resultados de verificación documental o en sitio de la eficacia..."
              class="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 ${!canEditFinding ? 'bg-slate-50' : ''}"
            >${escapeHtml(finding.comentarios_verificacion)}</textarea>
          </div>

          <div>
            <label for="modalFindingLifecycleSelect" class="block text-xs font-bold text-slate-700 mb-1">
              Estado en Ciclo de Vida del Hallazgo
            </label>
            <select
              id="modalFindingLifecycleSelect"
              ${!canEditFinding ? 'disabled' : ''}
              class="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50 disabled:text-slate-600"
            >
              ${availableStatuses
                .map(
                  (st) =>
                    `<option value="${escapeHtml(st)}" ${finding.estado_ciclo === st ? 'selected' : ''}>${escapeHtml(st)}</option>`
                )
                .join('')}
            </select>
          </div>

          <div id="findingLifecycleErrorBox" class="hidden p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"></div>

          <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              data-action="open-changelog"
              data-table-name="hallazgo"
              data-record-id="${escapeHtml(finding.id)}"
              data-entity-name="${escapeHtml(finding.codigo_hallazgo)} · ${escapeHtml(finding.tipo)}"
              class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              🕒 Historial del Hallazgo
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                id="cancelFindingDetailModalBtn"
                class="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              ${
                canEditFinding
                  ? `
                    <button
                      type="submit"
                      class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Guardar Actualización
                    </button>
                  `
                  : ''
              }
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}
