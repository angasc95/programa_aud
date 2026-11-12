import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  type FindingItem,
  type AuditEventEntity,
  type FindingClassification,
  type FindingLifecycleStatus,
  getFindingSeverityMeta,
  getFindingLifecycleMeta,
  evaluateCertificationRecommendation,
} from '../lib/auditDomain';

export interface ResultadoViewState {
  selectedAuditId: string; // 'ALL' or specific audit ID
  viewMode: 'table' | 'kanban';
  filterClassification: string; // 'ALL', 'NC_MAYOR', 'NC_MENOR', 'OBSERVACION', 'OPORTUNIDAD_MEJORA'
  filterLifecycle: string; // 'ALL', 'Abierto', 'Causa Raíz Analizada', etc.
  searchQuery: string;
  isNewFindingModalOpen: boolean;
  selectedFindingIdForDetail: string | null;
  isRecommendationModalOpen: boolean;
}

const LIFECYCLE_STAGES: FindingLifecycleStatus[] = [
  'Abierto',
  'Causa Raíz Analizada',
  'Plan de Acción Enviado',
  'Verificado',
  'Cerrado',
];

export function renderResultadoView(
  profile: UserProfile,
  allAudits: AuditEventEntity[],
  findings: FindingItem[],
  state: ResultadoViewState
): string {
  const isAuditorOrWorker = ['ADMIN', 'WORKER', 'AUDITOR'].includes(profile.role);

  // Filter findings by audit selection
  const auditScopedFindings =
    state.selectedAuditId && state.selectedAuditId !== 'ALL'
      ? findings.filter((f) => f.id_auditoria === state.selectedAuditId)
      : findings;

  // Selected audit entity
  const currentAudit =
    state.selectedAuditId && state.selectedAuditId !== 'ALL'
      ? allAudits.find((a) => a.id === state.selectedAuditId) || null
      : allAudits[0] || null;

  // Evaluate recommendation for the selected audit (or default audit)
  const recommendation = evaluateCertificationRecommendation(
    currentAudit
      ? findings.filter((f) => f.id_auditoria === currentAudit.id)
      : findings,
    currentAudit
      ? {
          nombre: currentAudit.auditor_lider_nombre,
          credencial: 'AUD-LEAD-2024-REG',
        }
      : undefined
  );

  // Apply search and facet filters
  const filteredFindings = auditScopedFindings.filter((finding) => {
    if (state.filterClassification && state.filterClassification !== 'ALL') {
      if (finding.tipo !== state.filterClassification) return false;
    }

    if (state.filterLifecycle && state.filterLifecycle !== 'ALL') {
      if (finding.estado !== state.filterLifecycle) return false;
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      const matchCode = finding.codigo_hallazgo.toLowerCase().includes(q);
      const matchAudit = finding.codigo_auditoria.toLowerCase().includes(q);
      const matchOrg = finding.organizacion_nombre.toLowerCase().includes(q);
      const matchDesc = finding.descripcion.toLowerCase().includes(q);
      const matchReq = finding.requisito_codigo.toLowerCase().includes(q);
      const matchProc = finding.proceso_nombre.toLowerCase().includes(q);
      if (!matchCode && !matchAudit && !matchOrg && !matchDesc && !matchReq && !matchProc) {
        return false;
      }
    }

    return true;
  });

  // Calculate stats
  const totalFindings = auditScopedFindings.length;
  const majorNc = auditScopedFindings.filter((f) => f.tipo === 'NC_MAYOR').length;
  const minorNc = auditScopedFindings.filter((f) => f.tipo === 'NC_MENOR').length;
  const observations = auditScopedFindings.filter((f) => f.tipo === 'OBSERVACION').length;
  const opportunities = auditScopedFindings.filter((f) => f.tipo === 'OPORTUNIDAD_MEJORA').length;
  const openCount = auditScopedFindings.filter((f) => !f.cerrado && f.estado !== 'Cerrado').length;
  const closedCount = auditScopedFindings.filter((f) => f.cerrado || f.estado === 'Cerrado').length;

  const inspectingFinding = state.selectedFindingIdForDetail
    ? findings.find((f) => f.id === state.selectedFindingIdForDetail) || null
    : null;

  return `
    <div class="space-y-6">
      <!-- Semantic Domain Header -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📋</span>
            <h2 class="text-lg font-bold text-slate-900 tracking-tight">Resultado y Gestión de Hallazgos</h2>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Registro, causa raíz, acciones correctivas y dictamen de recomendación ISO/IEC 17021-1:2015
          </p>
        </div>

        <div class="flex items-center gap-2">
          ${
            isAuditorOrWorker
              ? `
                <button
                  type="button"
                  data-action="open-new-finding-modal"
                  class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>➕</span>
                  <span>Registrar Hallazgo</span>
                </button>
              `
              : ''
          }
          <button
            type="button"
            data-open-changelog="public.hallazgo"
            data-changelog-title="Bitácora de Hallazgos"
            class="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>🕒</span>
            <span>Historial de Cambios</span>
          </button>
        </div>
      </div>

      <!-- ISO/IEC 17021-1 Certification Recommendation Engine Banner -->
      ${renderRecommendationBanner(currentAudit, recommendation)}

      <!-- Audit Context Selector & Metrics Row -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-700">Auditoría Evaluada:</span>
            <select
              id="findingsAuditScopeSelect"
              data-action="change-findings-audit-scope"
              class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">Todas las auditorías registradas</option>
              ${allAudits
                .map(
                  (a) => `
                <option value="${escapeHtml(a.id)}" ${
                    state.selectedAuditId === a.id ? 'selected' : ''
                  }>
                  ${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)} (${escapeHtml(a.tipo_auditoria)} — ${escapeHtml(a.norma_codigo)})
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <!-- View Switcher: Table vs Kanban -->
          <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group">
            <button
              type="button"
              data-action="set-findings-view-mode"
              data-mode="table"
              class="px-3 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                state.viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }"
            >
              <span>☰</span>
              <span>Tabla de Hallazgos</span>
            </button>
            <button
              type="button"
              data-action="set-findings-view-mode"
              data-mode="kanban"
              class="px-3 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                state.viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }"
            >
              <span>📋</span>
              <span>Tablero Kanban</span>
            </button>
          </div>
        </div>

        <!-- Metric Cards: 4 Classifications + Status -->
        <div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
            <div class="text-xl font-bold text-rose-900 font-mono">${majorNc}</div>
            <div class="text-[10px] font-bold text-rose-700 uppercase tracking-wider">🚨 NC Mayor</div>
          </div>
          <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <div class="text-xl font-bold text-amber-900 font-mono">${minorNc}</div>
            <div class="text-[10px] font-bold text-amber-700 uppercase tracking-wider">⚠️ NC Menor</div>
          </div>
          <div class="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <div class="text-xl font-bold text-blue-900 font-mono">${observations}</div>
            <div class="text-[10px] font-bold text-blue-700 uppercase tracking-wider">👁️ Observación</div>
          </div>
          <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <div class="text-xl font-bold text-emerald-900 font-mono">${opportunities}</div>
            <div class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">💡 Oportunidad</div>
          </div>
          <div class="p-3 rounded-lg bg-slate-100 border border-slate-200 text-center">
            <div class="text-xl font-bold text-slate-800 font-mono">${openCount}</div>
            <div class="text-[10px] font-bold text-slate-600 uppercase tracking-wider">⏳ Abiertos</div>
          </div>
          <div class="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-center">
            <div class="text-xl font-bold text-emerald-800 font-mono">${closedCount}</div>
            <div class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">✓ Cerrados</div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <!-- Text search -->
          <div class="relative w-full sm:w-72">
            <input
              type="text"
              id="findingsSearchInput"
              placeholder="Filtrar por código, proceso, cláusula..."
              value="${escapeHtml(state.searchQuery || '')}"
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <!-- Classification & Lifecycle Selectors -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-1">
              <span class="text-slate-500 font-semibold">Tipo:</span>
              <select
                id="filterClassificationSelect"
                data-action="change-filter-classification"
                class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 font-medium"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="NC_MAYOR" ${state.filterClassification === 'NC_MAYOR' ? 'selected' : ''}>🚨 NC Mayor</option>
                <option value="NC_MENOR" ${state.filterClassification === 'NC_MENOR' ? 'selected' : ''}>⚠️ NC Menor</option>
                <option value="OBSERVACION" ${state.filterClassification === 'OBSERVACION' ? 'selected' : ''}>👁️ Observación</option>
                <option value="OPORTUNIDAD_MEJORA" ${state.filterClassification === 'OPORTUNIDAD_MEJORA' ? 'selected' : ''}>💡 Oportunidad Mejora</option>
              </select>
            </div>

            <div class="flex items-center gap-1">
              <span class="text-slate-500 font-semibold">Etapa:</span>
              <select
                id="filterLifecycleSelect"
                data-action="change-filter-lifecycle"
                class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 font-medium"
              >
                <option value="ALL">Todas las etapas</option>
                ${LIFECYCLE_STAGES.map(
                  (stage) => `
                  <option value="${escapeHtml(stage)}" ${
                    state.filterLifecycle === stage ? 'selected' : ''
                  }>${escapeHtml(stage)}</option>
                `
                ).join('')}
              </select>
            </div>

            <button
              type="button"
              data-action="reset-findings-filters"
              class="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer ml-1"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Main Display: Table or Kanban -->
      ${
        filteredFindings.length === 0
          ? `
            <div class="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
              <span class="text-3xl block">🔍</span>
              <h3 class="text-sm font-bold text-slate-900">No se encontraron hallazgos registrados</h3>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">
                No hay desviaciones o notas de auditoría que coincidan con los filtros seleccionados.
              </p>
            </div>
          `
          : state.viewMode === 'kanban'
          ? renderKanbanBoard(filteredFindings)
          : renderFindingsTable(filteredFindings)
      }

      <!-- Finding Detail / Action Plan Modal -->
      ${renderFindingDetailModal(inspectingFinding, isAuditorOrWorker)}

      <!-- New Finding Modal -->
      ${renderNewFindingModal(state.isNewFindingModalOpen, allAudits)}
    </div>
  `;
}

/**
 * ISO/IEC 17021-1 Recommendation Banner
 */
function renderRecommendationBanner(
  audit: AuditEventEntity | null,
  recommendation: ReturnType<typeof evaluateCertificationRecommendation>
): string {
  if (!audit) return '';

  const isApproved = recommendation.status === 'APROBADA';

  return `
    <div class="rounded-xl border-2 p-5 shadow-sm space-y-3 ${
      isApproved
        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
        : 'bg-rose-50/80 border-rose-300 text-rose-950'
    }">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">${isApproved ? '✅' : '🚫'}</span>
            <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
              isApproved
                ? 'bg-emerald-200 text-emerald-900'
                : 'bg-rose-200 text-rose-900'
            }">
              Dictamen ISO/IEC 17021-1:2015
            </span>
            <span class="font-mono text-xs font-bold text-slate-700">
              ${escapeHtml(audit.codigo_auditoria)} · ${escapeHtml(audit.numero_certificado)}
            </span>
          </div>
          <h3 class="text-base font-bold tracking-tight">
            ${escapeHtml(recommendation.dictamen)}
          </h3>
          <p class="text-xs leading-relaxed max-w-3xl ${
            isApproved ? 'text-emerald-800' : 'text-rose-800'
          }">
            ${escapeHtml(recommendation.summaryText)}
          </p>
        </div>

        <div class="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
          <span class="text-xs font-mono font-bold px-3 py-1 rounded-full ${
            isApproved
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-rose-600 text-white shadow-2xs'
          }">
            ${isApproved ? 'EMISIÓN APROBADA' : 'EMISIÓN BLOQUEADA'}
          </span>
          <div class="text-[11px] font-mono ${isApproved ? 'text-emerald-700' : 'text-rose-700'}">
            NC Mayores Abiertas: <strong>${recommendation.openMajorNcCount}</strong>
          </div>
        </div>
      </div>

      <!-- Blocking reasons list (if any) -->
      ${
        recommendation.blockingReasons.length > 0
          ? `
            <div class="pt-2 border-t border-rose-200 space-y-1.5 text-xs text-rose-900">
              <span class="font-bold text-[11px] uppercase tracking-wider block">Motivos de Bloqueo Normativo:</span>
              <ul class="list-disc list-inside space-y-1 bg-white/70 p-3 rounded-lg border border-rose-200 font-medium">
                ${recommendation.blockingReasons
                  .map((r) => `<li>${escapeHtml(r)}</li>`)
                  .join('')}
              </ul>
            </div>
          `
          : ''
      }

      <!-- Electronic Signature Box -->
      ${
        recommendation.electronicSignature
          ? `
            <div class="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900 bg-white/60 p-2.5 rounded-lg">
              <div class="flex items-center gap-2">
                <span class="text-sm">✍️</span>
                <span>Dictaminado por: <strong class="font-bold">${escapeHtml(recommendation.electronicSignature.auditor_nombre)}</strong> (${escapeHtml(recommendation.electronicSignature.auditor_credencial)})</span>
              </div>
              <div class="font-mono text-[10px] text-emerald-800">
                Firma Digital: ${escapeHtml(recommendation.electronicSignature.hash_trazabilidad)} · ${escapeHtml(recommendation.electronicSignature.fecha_dictamen)}
              </div>
            </div>
          `
          : ''
      }
    </div>
  `;
}

/**
 * Tabular View for Findings
 */
function renderFindingsTable(findings: FindingItem[]): string {
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4">Código / Auditoría</th>
              <th class="py-3 px-3">Severidad</th>
              <th class="py-3 px-3">Cláusula & Proceso</th>
              <th class="py-3 px-4">Descripción de Evidencia</th>
              <th class="py-3 px-3">Etapa de Ciclo</th>
              <th class="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            ${findings
              .map((finding) => {
                const sevMeta = getFindingSeverityMeta(finding.tipo);
                const lifeMeta = getFindingLifecycleMeta(finding.estado);

                return `
                  <tr
                    class="hover:bg-slate-50/80 transition-colors cursor-pointer ${sevMeta.borderClass}"
                    data-action="inspect-finding"
                    data-finding-id="${escapeHtml(finding.id)}"
                  >
                    <td class="py-3 px-4">
                      <div class="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <span>${escapeHtml(finding.codigo_hallazgo)}</span>
                      </div>
                      <div class="text-[11px] text-slate-500 font-mono">
                        ${escapeHtml(finding.codigo_auditoria)} · ${escapeHtml(finding.organizacion_nombre)}
                      </div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] border ${sevMeta.badgeClass}">
                        <span>${sevMeta.symbol}</span>
                        <span>${escapeHtml(sevMeta.label)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-3">
                      <div class="font-mono font-bold text-indigo-700">Cláusula ${escapeHtml(finding.requisito_codigo)}</div>
                      <div class="text-[11px] text-slate-500 truncate max-w-44">${escapeHtml(finding.proceso_nombre)}</div>
                    </td>
                    <td class="py-3 px-4 max-w-xs">
                      <div class="font-medium text-slate-900 truncate">${escapeHtml(finding.descripcion)}</div>
                      <div class="text-[11px] text-slate-500 italic truncate">${escapeHtml(finding.evidencia_objetiva)}</div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${lifeMeta.badgeClass}">
                        <span>${finding.cerrado ? '✓' : '⏳'}</span>
                        <span>${escapeHtml(lifeMeta.label)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button
                        type="button"
                        data-action="inspect-finding"
                        data-finding-id="${escapeHtml(finding.id)}"
                        class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Detalles</span>
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
 * Kanban Board View for Findings
 */
function renderKanbanBoard(findings: FindingItem[]): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
      ${LIFECYCLE_STAGES.map((stage) => {
        const stageFindings = findings.filter((f) => f.estado === stage);
        const stageMeta = getFindingLifecycleMeta(stage);

        return `
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 min-h-96 flex flex-col">
            <!-- Column Header -->
            <div class="flex items-center justify-between pb-2 border-b border-slate-200">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full ${stage === 'Cerrado' ? 'bg-emerald-500' : 'bg-indigo-500'}"></span>
                <span>${escapeHtml(stage)}</span>
              </span>
              <span class="px-1.5 py-0.2 rounded-full bg-white border border-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                ${stageFindings.length}
              </span>
            </div>

            <!-- Cards Column -->
            <div class="space-y-2.5 flex-1">
              ${
                stageFindings.length === 0
                  ? `<div class="p-6 text-center text-slate-400 text-xs italic">Sin hallazgos en esta etapa</div>`
                  : stageFindings
                      .map((finding) => {
                        const sevMeta = getFindingSeverityMeta(finding.tipo);
                        return `
                        <div
                          class="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs hover:shadow-md transition-shadow cursor-pointer space-y-2 ${sevMeta.borderClass}"
                          data-action="inspect-finding"
                          data-finding-id="${escapeHtml(finding.id)}"
                        >
                          <div class="flex items-start justify-between gap-1">
                            <span class="font-mono text-xs font-bold text-slate-900">${escapeHtml(finding.codigo_hallazgo)}</span>
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${sevMeta.badgeClass}">
                              <span>${sevMeta.symbol}</span>
                              <span>${escapeHtml(sevMeta.label)}</span>
                            </span>
                          </div>

                          <div class="text-[11px] font-semibold text-slate-800 line-clamp-2">
                            ${escapeHtml(finding.descripcion)}
                          </div>

                          <div class="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-100">
                            <span>Cláusula ${escapeHtml(finding.requisito_codigo)}</span>
                            <span class="truncate max-w-24 text-right">${escapeHtml(finding.sitio_nombre)}</span>
                          </div>
                        </div>
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

/**
 * Finding Detail / Action Plan Modal
 */
function renderFindingDetailModal(
  finding: FindingItem | null,
  isAuditorOrWorker: boolean
): string {
  if (!finding) return '';

  const sevMeta = getFindingSeverityMeta(finding.tipo);
  const lifeMeta = getFindingLifecycleMeta(finding.estado);

  return `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in duration-150">
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                ${escapeHtml(finding.codigo_hallazgo)}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${sevMeta.badgeClass}">
                <span>${sevMeta.symbol}</span>
                <span>${escapeHtml(sevMeta.label)}</span>
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${lifeMeta.badgeClass}">
                <span>${finding.cerrado ? '✓' : '⏳'}</span>
                <span>${escapeHtml(lifeMeta.label)}</span>
              </span>
            </div>
            <h3 class="text-base font-bold text-slate-900">
              ${escapeHtml(finding.organizacion_nombre)} · Auditoría ${escapeHtml(finding.codigo_auditoria)}
            </h3>
          </div>
          <button
            type="button"
            data-action="close-finding-detail-modal"
            class="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Finding Attributes Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span class="text-slate-500 font-bold block">Requisito Normativo</span>
            <span class="font-mono font-bold text-indigo-700">Cláusula ${escapeHtml(finding.requisito_codigo)}</span>
            <span class="text-[11px] text-slate-500 block truncate">${escapeHtml(finding.requisito_titulo || '')}</span>
          </div>
          <div>
            <span class="text-slate-500 font-bold block">Proceso Afectado</span>
            <span class="font-bold text-slate-800">${escapeHtml(finding.proceso_nombre)}</span>
          </div>
          <div>
            <span class="text-slate-500 font-bold block">Sede de Identificación</span>
            <span class="font-bold text-slate-800">${escapeHtml(finding.sitio_nombre)}</span>
          </div>
        </div>

        <!-- Description & Objective Evidence -->
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Descripción de la Desviación (Hecho Auditado)</label>
            <p class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
              ${escapeHtml(finding.descripcion)}
            </p>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Evidencia Objetiva Verificada</label>
            <p class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-mono text-[11px]">
              ${escapeHtml(finding.evidencia_objetiva)}
            </p>
          </div>
        </div>

        <!-- Corrective Action Workflow & Root Cause Analysis -->
        <div class="space-y-3 pt-3 border-t border-slate-200 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Análisis de Causa Raíz (Cliente)</label>
            <p class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed italic">
              ${escapeHtml(finding.causa_raiz || 'Pendiente de formulación por la organización auditada')}
            </p>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Plan de Acción Correctiva y Plazo</label>
            <p class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
              ${escapeHtml(finding.plan_accion_cliente || 'Pendiente de presentación por el representante de la calidad')}
            </p>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Comentarios de Verificación del Auditor Líder</label>
            <p class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-medium">
              ${escapeHtml(finding.comentarios_verificacion_auditor || 'Sin evaluación de eficacia registrada todavía')}
            </p>
          </div>
        </div>

        <!-- Modal Footer Actions (Workflow Progression) -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div class="flex items-center gap-2">
            ${
              isAuditorOrWorker && !finding.cerrado
                ? `
                  <button
                    type="button"
                    data-action="advance-finding-lifecycle"
                    data-finding-id="${escapeHtml(finding.id)}"
                    class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>Avanzar Estado ➔</span>
                  </button>
                  <button
                    type="button"
                    data-action="close-finding-formally"
                    data-finding-id="${escapeHtml(finding.id)}"
                    class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>✓ Cerrar Formalmente</span>
                  </button>
                `
                : ''
            }
          </div>

          <button
            type="button"
            data-action="close-finding-detail-modal"
            class="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Register New Finding Modal
 */
function renderNewFindingModal(isOpen: boolean, audits: AuditEventEntity[]): string {
  if (!isOpen) return '';

  return `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">📝</span>
            <h3 class="text-base font-bold text-slate-900">Registrar Nuevo Hallazgo de Auditoría</h3>
          </div>
          <button
            type="button"
            data-action="close-new-finding-modal"
            class="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form id="registerFindingForm" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="newFindingAuditId" class="block font-semibold text-slate-700 mb-1">
                Auditoría Evaluada
              </label>
              <select id="newFindingAuditId" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                ${audits
                  .map(
                    (a) => `
                  <option value="${escapeHtml(a.id)}">
                    ${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)} (${escapeHtml(a.norma_codigo)})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div>
              <label for="newFindingClassification" class="block font-semibold text-slate-700 mb-1">
                Clasificación Formal ISO
              </label>
              <select id="newFindingClassification" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="NC_MENOR">⚠️ No Conformidad Menor (NC_MENOR)</option>
                <option value="NC_MAYOR">🚨 No Conformidad Mayor (NC_MAYOR - Bloquea Certificación)</option>
                <option value="OBSERVACION">👁️ Observación (OBSERVACION)</option>
                <option value="OPORTUNIDAD_MEJORA">💡 Oportunidad de Mejora (OPORTUNIDAD_MEJORA)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="newFindingReq" class="block font-semibold text-slate-700 mb-1">
                Requisito Normativo
              </label>
              <select id="newFindingReq" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="8.5">Cláusula 8.5 (Operación y provisión del servicio)</option>
                <option value="4.1">Cláusula 4.1 (Comprensión de la organización y contexto)</option>
                <option value="6.1">Cláusula 6.1 (Acciones para abordar riesgos)</option>
                <option value="8.2">Cláusula 8.2 (Preparación y respuesta ante emergencias)</option>
              </select>
            </div>

            <div>
              <label for="newFindingProcess" class="block font-semibold text-slate-700 mb-1">
                Proceso Auditado
              </label>
              <input
                type="text"
                id="newFindingProcess"
                required
                value="Troquelado y Fundición"
                class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label for="newFindingDesc" class="block font-semibold text-slate-700 mb-1">
              Descripción de la Desviación
            </label>
            <textarea
              id="newFindingDesc"
              rows="3"
              required
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Describa con exactitud y neutralidad técnica el hecho verificado..."
            ></textarea>
          </div>

          <div>
            <label for="newFindingEvidence" class="block font-semibold text-slate-700 mb-1">
              Evidencia Objetiva
            </label>
            <input
              type="text"
              id="newFindingEvidence"
              required
              class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Ej. Registro de calibración Nº 102 con fecha vencida..."
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              data-action="close-new-finding-modal"
              class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Registrar Hallazgo
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
