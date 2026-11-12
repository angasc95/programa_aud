import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  getFindingTypeMeta,
  getAuditModalityMeta,
  calculateFindingStats,
  filterFindings,
  type FindingRecord,
  type FindingStats,
} from '../lib/drillDown';
import type { CertificateRecord } from '../lib/searchControls';
import type { SiteRecord, ProcessRecord, ShiftRecord } from './certificacionView';

export interface AuditRecord {
  id: string;
  id_certificado?: string;
  numero_certificado: string;
  organizacion_nombre: string;
  tipo_auditoria: string;
  metodologia: string;
  fecha_programacion: string;
  fecha_reprogramacion?: string | null;
  auditor_lider?: string;
  estatus: string;
  comentarios_count?: number;
}

export interface AuditorRecord {
  id: string;
  nombre: string;
  normas: string[];
  sectores_iaf: number[];
  rol?: string;
}

export interface AuditoriasViewState {
  activeSubSection: string;
  audits: AuditRecord[];
  auditors: AuditorRecord[];
  findings?: FindingRecord[];
  certificates?: CertificateRecord[];
  sites?: SiteRecord[];
  processes?: ProcessRecord[];
  shifts?: ShiftRecord[];
  requirements?: Array<{ id: string; codigo: string; norma: string }>;
  isPlanningModalOpen?: boolean;
  isLoggingFinding?: boolean;
  findingFilterType?: string;
  findingFilterStatus?: 'all' | 'open' | 'closed';
  selectedScopeAuditId?: string | null;
  isConfiguringScope?: boolean;
  loading: boolean;
}

export function renderAuditoriasView(
  profile: UserProfile,
  state: AuditoriasViewState
): string {
  const activeSub = state.activeSubSection || 'scheduling';
  const allFindings = state.findings || [];
  const findingStats: FindingStats = calculateFindingStats(allFindings);
  const filteredFindings = filterFindings(allFindings, {
    type: state.findingFilterType,
    status: state.findingFilterStatus,
  });
  const isAuditorOrWorker = ['ADMIN', 'WORKER', 'AUDITOR'].includes(profile.role);
  const canPlanAudit = ['ADMIN', 'WORKER'].includes(profile.role);

  const subTabs = [
    {
      id: 'scheduling',
      label: 'Programación de Auditorías',
      symbol: '🗓️',
      desc: 'Seguimiento y planificación de eventos de evaluación de conformidad ISO',
    },
    {
      id: 'calendar',
      label: 'Calendario Operativo',
      symbol: '📆',
      desc: 'Cronograma mensual y fechas de ejecución / reprogramación',
    },
    {
      id: 'team',
      label: 'Equipo Evaluador',
      symbol: '👥',
      desc: 'Auditores calificados por norma certificable y sector IAF acreditado',
    },
    {
      id: 'scope',
      label: 'Alcance de Campo',
      symbol: '🏭',
      desc: 'Configuración de sedes, turnos y procesos bajo evaluación',
    },
    {
      id: 'findings',
      label: 'Gestión de Hallazgos',
      symbol: '📋',
      desc: 'No conformidades mayores, menores, observaciones y oportunidades de mejora',
    },
  ];

  let contentHtml = '';

  // Tab 1: Scheduling (Event Planning)
  if (activeSub === 'scheduling') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Eventos de Auditoría de Campo</h3>
              <p class="text-xs text-slate-500">
                Planificación formal de auditorías conforme a ISO/IEC 17021-1:2015 e ISO 19011:2018
              </p>
            </div>
            ${
              canPlanAudit
                ? `
                  <button
                    type="button"
                    data-action="open-plan-audit"
                    class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                  >
                    <span>➕</span>
                    <span>Planificar Nueva Auditoría</span>
                  </button>
                `
                : ''
            }
          </div>

          <!-- Inline Audit Planning Form if toggled -->
          ${
            state.isPlanningModalOpen
              ? `
                <div class="bg-indigo-50/70 border-2 border-indigo-300 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-base">📅</span>
                      <h4 class="text-sm font-bold text-slate-900">Planificación de Nuevo Evento de Auditoría</h4>
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
                          ${
                            state.certificates && state.certificates.length > 0
                              ? state.certificates
                                  .map(
                                    (c) => `
                                  <option value="${escapeHtml(c.id)}">${escapeHtml(c.numero_certificado)} · ${escapeHtml(c.organizacion_nombre)} (${escapeHtml(c.norma)})</option>
                                `
                                  )
                                  .join('')
                              : `
                                <option value="40000000-0000-0000-0000-000000000001">FN-QMS-2024-001 · Iberometal Componentes S.A. (ISO 9001:2015)</option>
                              `
                          }
                        </select>
                      </div>

                      <div>
                        <label for="planTypeSelect" class="block text-xs font-semibold text-slate-700 mb-1">Modalidad de Auditoría</label>
                        <select id="planTypeSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                          <option value="b0000000-0000-0000-0000-000000000005">RECERTIFICACION (Ciclo Trienal)</option>
                          <option value="b0000000-0000-0000-0000-000000000001">ETAPA_1 (Revisión Documental)</option>
                          <option value="b0000000-0000-0000-0000-000000000002">ETAPA_2 (Evaluación In Situ)</option>
                          <option value="b0000000-0000-0000-0000-000000000003">VIGILANCIA_1 (Anual Año 1)</option>
                          <option value="b0000000-0000-0000-0000-000000000004">VIGILANCIA_2 (Anual Año 2)</option>
                          <option value="b0000000-0000-0000-0000-000000000006">EXTRAORDINARIA (Especial)</option>
                        </select>
                      </div>

                      <div>
                        <label for="planMethodologySelect" class="block text-xs font-semibold text-slate-700 mb-1">Metodología de Ejecución</label>
                        <select id="planMethodologySelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                          <option value="c0000000-0000-0000-0000-000000000001">PRESENCIAL</option>
                          <option value="c0000000-0000-0000-0000-000000000002">REMOTA</option>
                          <option value="c0000000-0000-0000-0000-000000000003">HIBRIDA</option>
                        </select>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label for="planDateInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Programada</label>
                        <input
                          type="date"
                          id="planDateInput"
                          required
                          value="2024-11-20"
                          class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                        />
                      </div>

                      <div>
                        <label for="planRescheduleInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha Reprogramación (Opcional)</label>
                        <input
                          type="date"
                          id="planRescheduleInput"
                          class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                        />
                      </div>

                      <div>
                        <label for="planAuditorSelect" class="block text-xs font-semibold text-slate-700 mb-1">Designación Auditor Líder</label>
                        <select id="planAuditorSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                          ${state.auditors
                            .map(
                              (aud) => `
                            <option value="${escapeHtml(aud.id)}">${escapeHtml(aud.nombre)} (${escapeHtml(aud.normas.join(', '))})</option>
                          `
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
                        Crear y Registrar Auditoría
                      </button>
                    </div>
                  </form>
                </div>
              `
              : ''
          }

          <!-- Audits List Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th class="py-3 px-4">Certificado / Organización</th>
                    <th class="py-3 px-3">Modalidad</th>
                    <th class="py-3 px-3">Metodología</th>
                    <th class="py-3 px-3">Fecha Planificada</th>
                    <th class="py-3 px-3">Auditor Líder</th>
                    <th class="py-3 px-3">Estatus</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                  ${state.audits
                    .map((audit) => {
                      const modMeta = getAuditModalityMeta(audit.tipo_auditoria);
                      return `
                        <tr class="hover:bg-slate-50/80 transition-colors">
                          <td class="py-3 px-4">
                            <div class="font-mono font-bold text-slate-900">${escapeHtml(audit.numero_certificado)}</div>
                            <div class="text-[11px] text-slate-500 font-normal">${escapeHtml(audit.organizacion_nombre)}</div>
                          </td>
                          <td class="py-3 px-3">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${modMeta.badgeClass}" title="${escapeHtml(modMeta.description)}">
                              <span>${modMeta.symbol}</span>
                              <span>${escapeHtml(audit.tipo_auditoria)}</span>
                            </span>
                          </td>
                          <td class="py-3 px-3">
                            <span class="text-slate-600">${escapeHtml(audit.metodologia)}</span>
                          </td>
                          <td class="py-3 px-3 font-mono">
                            <div>${escapeHtml(audit.fecha_programacion)}</div>
                            ${
                              audit.fecha_reprogramacion
                                ? `<span class="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5">
                                    <span>Reprog:</span>
                                    <span>${escapeHtml(audit.fecha_reprogramacion)}</span>
                                   </span>`
                                : ''
                            }
                          </td>
                          <td class="py-3 px-3 font-medium text-slate-900">
                            ${escapeHtml(audit.auditor_lider || 'Por asignar')}
                          </td>
                          <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ${escapeHtml(audit.estatus)}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-right">
                            <div class="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                data-nav="drilldown"
                                class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>🔍</span>
                                <span>Drill-Down</span>
                              </button>
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
        </div>
      </div>
    `;
  } else if (activeSub === 'calendar') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Calendario Operativo de Evaluaciones</h3>
              <p class="text-xs text-slate-500">Visualización cronológica de auditorías programadas</p>
            </div>
            <div class="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>${state.audits.length} ${state.audits.length === 1 ? 'evento programado' : 'eventos programados'}</span>
            </div>
          </div>

          <!-- Calendar Timeline Cards -->
          <div class="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            ${state.audits
              .map((audit) => `
                <div class="p-4 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <div class="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex flex-col items-center justify-center shrink-0">
                      <span class="text-[10px] font-bold uppercase leading-none">Nov</span>
                      <span class="text-base font-bold leading-tight">20</span>
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          ${escapeHtml(audit.numero_certificado)}
                        </span>
                        <span class="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          ${escapeHtml(audit.tipo_auditoria)}
                        </span>
                      </div>
                      <div class="text-sm font-bold text-slate-900">${escapeHtml(audit.organizacion_nombre)}</div>
                      <div class="text-xs text-slate-500">
                        Metodología: <span class="font-medium text-slate-700">${escapeHtml(audit.metodologia)}</span> · Auditor Líder: <span class="font-medium text-slate-700">${escapeHtml(audit.auditor_lider || 'Por asignar')}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 self-start sm:self-auto text-xs">
                    <span class="px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ${escapeHtml(audit.estatus)}
                    </span>
                    <button
                      type="button"
                      data-nav="drilldown"
                      class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              `)
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'team') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Equipo Evaluador & Competencias Técnicas</h3>
              <p class="text-xs text-slate-500">
                Verificación de calificación técnica según ISO 19011:2018 y sectores IAF acreditados
              </p>
            </div>
            <div class="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <span>👥</span>
              <span>${state.auditors.length} auditores registrados</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.auditors
              .map(
                (aud) => `
              <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-0.5">
                    <h4 class="text-sm font-bold text-slate-900">${escapeHtml(aud.nombre)}</h4>
                    <span class="text-xs font-semibold text-indigo-700">${escapeHtml(aud.rol || 'Auditor Calificado')}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Acreditado
                  </span>
                </div>

                <div class="pt-2 border-t border-slate-100 space-y-2">
                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Normas ISO Habilitadas
                    </span>
                    <div class="flex flex-wrap gap-1">
                      ${aud.normas
                        .map(
                          (n) => `
                        <span class="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 text-slate-800">
                          ${escapeHtml(n)}
                        </span>
                      `
                        )
                        .join('')}
                    </div>
                  </div>

                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Sectores IAF Calificados
                    </span>
                    <div class="flex flex-wrap gap-1">
                      ${aud.sectores_iaf
                        .map(
                          (sec) => `
                        <span class="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                          IAF ${sec}
                        </span>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'scope') {
    const selectedScopeAudit =
      state.audits.find((a) => a.id === state.selectedScopeAuditId) ||
      state.audits[0] ||
      null;

    const certSites =
      selectedScopeAudit && state.sites
        ? state.sites.filter(
            (s) => s.numero_certificado === selectedScopeAudit.numero_certificado
          )
        : state.sites || [];

    const certProcesses =
      selectedScopeAudit && state.processes
        ? state.processes.filter(
            (p) => p.numero_certificado === selectedScopeAudit.numero_certificado
          )
        : state.processes || [];

    const shifts = state.shifts || [];

    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Alcance de Campo & Estructura de Evaluación</h3>
              <p class="text-xs text-slate-500">
                Sedes multisitio, turnos y procesos configurados para la auditoría activa conforme a ISO/IEC 17021-1:2015
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-nav="drilldown"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>Explorar en Drill-Down</span>
              </button>
            </div>
          </div>

          <!-- Audit Selector for Scope -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm">🎯</span>
              <label for="scopeAuditSelector" class="text-xs font-bold text-slate-700 whitespace-nowrap">
                Auditoría Evaluada:
              </label>
              <select
                id="scopeAuditSelector"
                data-action="change-scope-audit"
                class="text-xs font-medium rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 shadow-2xs"
              >
                ${state.audits
                  .map(
                    (a) => `
                  <option value="${escapeHtml(a.id)}" ${
                      selectedScopeAudit && a.id === selectedScopeAudit.id ? 'selected' : ''
                    }>
                    ${escapeHtml(a.tipo_auditoria)} · ${escapeHtml(a.numero_certificado)} (${escapeHtml(a.organizacion_nombre)})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            ${
              selectedScopeAudit
                ? `
                  <div class="text-xs text-slate-500 font-mono">
                    Fecha: <span class="text-slate-800 font-bold">${escapeHtml(selectedScopeAudit.fecha_programacion)}</span> ·
                    Líder: <span class="text-slate-800 font-bold">${escapeHtml(selectedScopeAudit.auditor_lider || 'Por asignar')}</span>
                  </div>
                `
                : ''
            }
          </div>

          <!-- Scope Tripartite Breakdown -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Sedes Card -->
            <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base">🏭</span>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Sedes Físicas (${certSites.length})</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Multisitio
                </span>
              </div>
              <div class="space-y-2">
                ${
                  certSites.length > 0
                    ? certSites
                        .map(
                          (s) => `
                        <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                          <div class="font-bold text-slate-900 flex items-center justify-between">
                            <span>${escapeHtml(s.nombre_sitio)}</span>
                            <span class="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border">#${s.numero_sitio}</span>
                          </div>
                          <div class="text-[11px] text-slate-500 truncate">${escapeHtml(s.direccion_sitio)}</div>
                        </div>
                      `
                        )
                        .join('')
                    : `<p class="text-xs text-slate-400 italic">No hay sedes asignadas.</p>`
                }
              </div>
            </div>

            <!-- Turnos Card -->
            <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base">⏰</span>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Turnos en Campo (${shifts.length})</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Operativos
                </span>
              </div>
              <div class="space-y-2">
                ${
                  shifts.length > 0
                    ? shifts
                        .map(
                          (sh) => `
                        <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                          <span class="font-medium text-slate-800">${escapeHtml(sh.descripcion)}</span>
                          <span class="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            ${escapeHtml(sh.hora_entrada)} - ${escapeHtml(sh.hora_salida)}
                          </span>
                        </div>
                      `
                        )
                        .join('')
                    : `<p class="text-xs text-slate-400 italic">No hay turnos registrados.</p>`
                }
              </div>
            </div>

            <!-- Procesos Card -->
            <div class="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base">⚙️</span>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Procesos Clave (${certProcesses.length})</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  Auditables
                </span>
              </div>
              <div class="space-y-2">
                ${
                  certProcesses.length > 0
                    ? certProcesses
                        .map(
                          (proc) => `
                        <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                          <div class="font-bold text-slate-900">${escapeHtml(proc.nombre_proceso)}</div>
                          <div class="flex flex-wrap gap-1">
                            ${proc.clausulas_cubiertas
                              .map(
                                (c) => `
                              <span class="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Cláusula ${escapeHtml(c)}
                              </span>
                            `
                              )
                              .join('')}
                          </div>
                        </div>
                      `
                        )
                        .join('')
                    : `<p class="text-xs text-slate-400 italic">No hay procesos mapeados.</p>`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'findings') {
    contentHtml = `
      <div class="space-y-4">
        <!-- Findings Stats & Action Header -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Gestión de Hallazgos de Auditoría</h3>
              <p class="text-xs text-slate-500">
                Levantamiento de evidencias y no conformidades conforme a ISO 19011:2018
              </p>
            </div>
            ${
              isAuditorOrWorker
                ? `
                  <button
                    type="button"
                    data-action="open-log-finding"
                    data-audit-id="${escapeHtml(state.audits[0]?.id || '')}"
                    class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                  >
                    <span>➕</span>
                    <span>Registrar Nuevo Hallazgo</span>
                  </button>
                `
                : ''
            }
          </div>

          <!-- Finding Metrics Pills -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
              <div class="text-xl font-bold text-rose-900">${findingStats.ncMayor}</div>
              <div class="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">NC Mayor</div>
            </div>
            <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <div class="text-xl font-bold text-amber-900">${findingStats.ncMenor}</div>
              <div class="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">NC Menor</div>
            </div>
            <div class="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <div class="text-xl font-bold text-blue-900">${findingStats.observaciones}</div>
              <div class="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Observación</div>
            </div>
            <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
              <div class="text-xl font-bold text-emerald-900">${findingStats.oportunidadesMejora}</div>
              <div class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Oportunidad Mejora</div>
            </div>
          </div>

          <!-- Findings Filter Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              <span class="text-slate-500 font-semibold mr-1">Filtrar tipo:</span>
              <button
                type="button"
                data-auditorias-filter-type="ALL"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterType === 'ALL' || !state.findingFilterType
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }"
              >
                Todos (${findingStats.total})
              </button>
              <button
                type="button"
                data-auditorias-filter-type="NC_MAYOR"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterType === 'NC_MAYOR'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }"
              >
                🚨 NC Mayor (${findingStats.ncMayor})
              </button>
              <button
                type="button"
                data-auditorias-filter-type="NC_MENOR"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterType === 'NC_MENOR'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }"
              >
                ⚠️ NC Menor (${findingStats.ncMenor})
              </button>
              <button
                type="button"
                data-auditorias-filter-type="OBSERVACION"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterType === 'OBSERVACION'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }"
              >
                👁️ Observación (${findingStats.observaciones})
              </button>
              <button
                type="button"
                data-auditorias-filter-type="OPORTUNIDAD_MEJORA"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterType === 'OPORTUNIDAD_MEJORA'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }"
              >
                💡 Oportunidad (${findingStats.oportunidadesMejora})
              </button>
            </div>

            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-slate-500 font-semibold mr-1">Estado:</span>
              <button
                type="button"
                data-auditorias-filter-status="all"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterStatus === 'all' || !state.findingFilterStatus
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }"
              >
                Todos
              </button>
              <button
                type="button"
                data-auditorias-filter-status="open"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterStatus === 'open'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }"
              >
                ⏳ Abiertos (${findingStats.abiertos})
              </button>
              <button
                type="button"
                data-auditorias-filter-status="closed"
                class="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  state.findingFilterStatus === 'closed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }"
              >
                ✓ Cerrados (${findingStats.cerrados})
              </button>
            </div>
          </div>
        </div>

        <!-- Finding Registration Form (if active) -->
        ${
          state.isLoggingFinding
            ? `
              <div class="bg-indigo-50/70 border-2 border-indigo-300 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">📝</span>
                    <h4 class="text-sm font-bold text-slate-900">Registrar Nuevo Hallazgo de Campo</h4>
                  </div>
                  <button
                    type="button"
                    data-action="close-log-finding"
                    class="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <form id="newFindingForm" class="space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label for="findingAuditSelect" class="block text-xs font-semibold text-slate-700 mb-1">Auditoría Destino</label>
                      <select id="findingAuditSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        ${state.audits
                          .map(
                            (a) => `
                          <option value="${escapeHtml(a.id)}">${escapeHtml(a.tipo_auditoria)} · ${escapeHtml(a.numero_certificado)} (${escapeHtml(a.fecha_programacion)})</option>
                        `
                          )
                          .join('')}
                      </select>
                    </div>

                    <div>
                      <label for="findingTypeSelect" class="block text-xs font-semibold text-slate-700 mb-1">Clasificación del Hallazgo</label>
                      <select id="findingTypeSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        <option value="NC_MENOR">⚠️ No Conformidad Menor (NC_MENOR)</option>
                        <option value="NC_MAYOR">🚨 No Conformidad Mayor (NC_MAYOR)</option>
                        <option value="OBSERVACION">👁️ Observación (OBSERVACION)</option>
                        <option value="OPORTUNIDAD_MEJORA">💡 Oportunidad de Mejora (OPORTUNIDAD_MEJORA)</option>
                      </select>
                    </div>

                    <div>
                      <label for="findingProcessSelect" class="block text-xs font-semibold text-slate-700 mb-1">Proceso Auditado</label>
                      <select id="findingProcessSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        ${
                          state.processes && state.processes.length > 0
                            ? state.processes
                                .map(
                                  (p) => `
                              <option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre_proceso)}</option>
                            `
                                )
                                .join('')
                            : `<option value="60000000-0000-0000-0000-000000000001">Troquelado y Fundición</option>`
                        }
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label for="findingReqSelect" class="block text-xs font-semibold text-slate-700 mb-1">Requisito Normativo Incumplido</label>
                      <select id="findingReqSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        ${
                          state.requirements && state.requirements.length > 0
                            ? state.requirements
                                .map(
                                  (r) => `
                              <option value="${escapeHtml(r.id)}">Cláusula ${escapeHtml(r.codigo)} (${escapeHtml(r.norma)})</option>
                            `
                                )
                                .join('')
                            : `
                              <option value="f0000000-0000-0000-0000-000000000085">Cláusula 8.5 (Operación / Control Operacional)</option>
                              <option value="f0000000-0000-0000-0000-000000000041">Cláusula 4.1 (Contexto de la Organización)</option>
                              <option value="f0000000-0000-0000-0000-000000000042">Cláusula 4.2 (Partes Interesadas)</option>
                            `
                        }
                      </select>
                    </div>

                    <div>
                      <label for="findingEvidenceInput" class="block text-xs font-semibold text-slate-700 mb-1">Evidencia Objetiva / Registro</label>
                      <input
                        type="text"
                        id="findingEvidenceInput"
                        placeholder="Ej. Registro fotográfico, orden de trabajo Nº 401..."
                        class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="findingDescInput" class="block text-xs font-semibold text-slate-700 mb-1">Descripción de la Desviación</label>
                    <textarea
                      id="findingDescInput"
                      rows="2"
                      required
                      placeholder="Describa el hecho verificado con precisión y objetividad..."
                      class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                    ></textarea>
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      data-action="close-log-finding"
                      class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Guardar Hallazgo en Base de Datos
                    </button>
                  </div>
                </form>
              </div>
            `
            : ''
        }

        <!-- Findings List -->
        <div class="space-y-3">
          ${
            filteredFindings.length > 0
              ? filteredFindings
                  .map((finding) => {
                    const meta = getFindingTypeMeta(finding.tipo);
                    const canEdit =
                      ['ADMIN', 'WORKER'].includes(profile.role) ||
                      (profile.role === 'AUDITOR');

                    return `
                      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 ${meta.borderClass}">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${meta.badgeClass}">
                              <span aria-hidden="true">${meta.symbol}</span>
                              <span>${escapeHtml(meta.label)}</span>
                            </span>
                            <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              Cláusula ${escapeHtml(finding.requisito_codigo)}
                            </span>
                            <span class="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              Proceso: ${escapeHtml(finding.proceso_nombre)}
                            </span>
                          </div>

                          <div class="flex items-center gap-2">
                            ${
                              finding.cerrado
                                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    ✓ Cerrado
                                   </span>`
                                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                    ⏳ Abierto
                                   </span>`
                            }

                            ${
                              canEdit
                                ? `
                                  <button
                                    type="button"
                                    data-action="toggle-finding-status"
                                    data-finding-id="${escapeHtml(finding.id)}"
                                    data-current-closed="${finding.cerrado ? 'true' : 'false'}"
                                    class="text-xs font-semibold px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                                      finding.cerrado
                                        ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                        : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }"
                                  >
                                    ${finding.cerrado ? 'Reabrir' : 'Cerrar Hallazgo'}
                                  </button>
                                `
                                : ''
                            }
                          </div>
                        </div>

                        <div class="text-sm font-medium text-slate-900">
                          ${escapeHtml(finding.descripcion)}
                        </div>

                        ${
                          finding.evidencia
                            ? `
                            <div class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                              <span class="text-slate-400 shrink-0">📎 Evidencia:</span>
                              <span class="font-mono text-slate-800">${escapeHtml(finding.evidencia)}</span>
                            </div>
                          `
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')
              : `
              <div class="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs space-y-2">
                <p>No se encontraron hallazgos registrados con los filtros seleccionados.</p>
                ${
                  state.findingFilterType !== 'ALL' || state.findingFilterStatus !== 'all'
                    ? `<button
                        type="button"
                        data-auditorias-filter-type="ALL"
                        data-auditorias-filter-status="all"
                        class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                      >
                        Restablecer filtros
                      </button>`
                    : ''
                }
              </div>
            `
          }
        </div>
      </div>
    `;
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Domain Header Banner -->
      <section class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
              <span>📅</span>
              <span>DOMINIO AUDITORÍAS · ISO 19011:2018</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Planificación y Gestión de Auditorías de Campo
            </h1>
            <p class="text-xs text-slate-600">
              Programación de eventos, asignación de equipos evaluadores acreditados, definición de alcance y levantamiento de hallazgos.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-nav="drilldown"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>🔍</span>
              <span>Exploración Drill-Down</span>
            </button>
            <button
              type="button"
              data-nav="dashboard"
              class="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>←</span>
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        <!-- Sub-tabs navigation -->
        <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          ${subTabs
            .map(
              (tab) => `
            <button
              type="button"
              data-nav="auditorias"
              data-subview="${tab.id}"
              title="${escapeHtml(tab.desc)}"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSub === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }"
            >
              <span>${tab.symbol}</span>
              <span>${escapeHtml(tab.label)}</span>
            </button>
          `
            )
            .join('')}
        </div>
      </section>

      <!-- Active Sub-tab View Content -->
      ${contentHtml}
    </main>
  `;
}
