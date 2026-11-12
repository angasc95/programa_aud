import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  type AuditEventEntity,
  type AuditorScheduleConflict,
  getModalityVisual,
  getMethodologyVisual,
  getAuditStatusVisual,
  detectAuditorScheduleConflicts,
} from '../lib/auditDomain';

export interface CalendarioViewState {
  calendarMonth: number; // 0 to 11 (e.g. 10 = Noviembre)
  calendarYear: number; // e.g. 2024
  calendarViewMode: 'month' | 'timeline';
  filterAuditor: string;
  filterStandard: string;
  filterMethodology: string;
  drawerAuditId: string | null;
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function renderCalendarioView(
  profile: UserProfile,
  allAudits: AuditEventEntity[],
  state: CalendarioViewState
): string {
  // Conflict detection
  const conflicts: AuditorScheduleConflict[] = detectAuditorScheduleConflicts(allAudits);

  // Apply filters
  const filteredAudits = allAudits.filter((audit) => {
    if (state.filterAuditor && state.filterAuditor !== 'ALL') {
      const isLead =
        audit.auditor_lider_id === state.filterAuditor ||
        audit.auditor_lider_nombre.toLowerCase().includes(state.filterAuditor.toLowerCase());
      const inTeam = audit.equipo.some(
        (m) =>
          m.id_auditor === state.filterAuditor ||
          m.nombre.toLowerCase().includes(state.filterAuditor.toLowerCase())
      );
      if (!isLead && !inTeam) return false;
    }

    if (state.filterStandard && state.filterStandard !== 'ALL') {
      if (!audit.norma_codigo.toLowerCase().includes(state.filterStandard.toLowerCase())) {
        return false;
      }
    }

    if (state.filterMethodology && state.filterMethodology !== 'ALL') {
      if (audit.metodologia.toLowerCase() !== state.filterMethodology.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  const selectedDrawerAudit = state.drawerAuditId
    ? allAudits.find((a) => a.id === state.drawerAuditId) || null
    : null;

  const currentMonthName = MONTH_NAMES_ES[state.calendarMonth] || 'Noviembre';

  return `
    <div class="space-y-6 relative">
      <!-- Semantic Domain Header -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📆</span>
            <h2 class="text-lg font-bold text-slate-900 tracking-tight">Calendario Operativo de Evaluaciones</h2>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Cronograma mensual y matriz de asignación temporal de auditores conforme a ISO 19011:2018
          </p>
        </div>

        <!-- View Switcher & Month Navigation -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Month Controls -->
          <div class="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs p-0.5 text-xs font-semibold">
            <button
              type="button"
              data-action="prev-calendar-month"
              class="px-2.5 py-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Mes Anterior"
            >
              ‹
            </button>
            <span class="px-3 py-1 font-bold text-slate-900 min-w-36 text-center">
              ${escapeHtml(currentMonthName)} ${state.calendarYear}
            </span>
            <button
              type="button"
              data-action="next-calendar-month"
              class="px-2.5 py-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Mes Siguiente"
            >
              ›
            </button>
          </div>

          <!-- Mode Switcher: Month Grid vs Timeline -->
          <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group">
            <button
              type="button"
              data-action="set-calendar-mode"
              data-mode="month"
              class="px-3 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                state.calendarViewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }"
            >
              <span>📅</span>
              <span>Matriz Mensual</span>
            </button>
            <button
              type="button"
              data-action="set-calendar-mode"
              data-mode="timeline"
              class="px-3 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                state.calendarViewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }"
            >
              <span>📊</span>
              <span>Línea de Tiempo / Gantt</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Resource Conflicts Warning Banner (if any) -->
      ${renderConflictBanner(conflicts)}

      <!-- Multi-Criteria Filter Bar -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Auditor Filter -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500 font-semibold">Auditor:</span>
            <select
              id="calendarAuditorFilter"
              data-action="change-calendar-auditor-filter"
              class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">Todos los auditores</option>
              <option value="Carlos Mendoza" ${state.filterAuditor === 'Carlos Mendoza' ? 'selected' : ''}>Ing. Carlos Mendoza</option>
              <option value="Roberto Silva" ${state.filterAuditor === 'Roberto Silva' ? 'selected' : ''}>Ing. Roberto Silva</option>
              <option value="Ana Belén Torres" ${state.filterAuditor === 'Ana Belén Torres' ? 'selected' : ''}>Dra. Ana Belén Torres</option>
            </select>
          </div>

          <!-- Standard Filter -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500 font-semibold">Norma ISO:</span>
            <select
              id="calendarStandardFilter"
              data-action="change-calendar-standard-filter"
              class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">Todas las normas</option>
              <option value="ISO 9001" ${state.filterStandard === 'ISO 9001' ? 'selected' : ''}>ISO 9001:2015</option>
              <option value="ISO 14001" ${state.filterStandard === 'ISO 14001' ? 'selected' : ''}>ISO 14001:2015</option>
              <option value="ISO 45001" ${state.filterStandard === 'ISO 45001' ? 'selected' : ''}>ISO 45001:2018</option>
              <option value="ISO/IEC 27001" ${state.filterStandard === 'ISO/IEC 27001' ? 'selected' : ''}>ISO/IEC 27001:2022</option>
            </select>
          </div>

          <!-- Methodology Filter -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500 font-semibold">Metodología:</span>
            <select
              id="calendarMethodologyFilter"
              data-action="change-calendar-methodology-filter"
              class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">Todas las metodologías</option>
              <option value="Presencial" ${state.filterMethodology === 'Presencial' ? 'selected' : ''}>Presencial</option>
              <option value="Remota" ${state.filterMethodology === 'Remota' ? 'selected' : ''}>Remota</option>
              <option value="Mixta" ${state.filterMethodology === 'Mixta' ? 'selected' : ''}>Mixta</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-slate-500">
            Mostrando <strong class="text-slate-900">${filteredAudits.length}</strong> eventos
          </span>
          <button
            type="button"
            data-action="reset-calendar-filters"
            class="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      <!-- Main Calendar Body: Month Grid or Timeline -->
      ${
        state.calendarViewMode === 'timeline'
          ? renderTimelineGanttView(filteredAudits, state.calendarMonth, state.calendarYear)
          : renderMonthGridView(filteredAudits, state.calendarMonth, state.calendarYear)
      }

      <!-- Quick-Access Interactive Slide-Over Event Drawer -->
      ${renderEventDrawer(selectedDrawerAudit)}
    </div>
  `;
}

/**
 * Render Conflict Warning Banner
 */
function renderConflictBanner(conflicts: AuditorScheduleConflict[]): string {
  if (conflicts.length === 0) return '';

  return `
    <div class="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 shadow-xs space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-base">🚨</span>
        <h4 class="text-xs font-bold uppercase tracking-wider text-rose-900">
          Alerta de Conflicto de Asignación de Recursos (${conflicts.length})
        </h4>
      </div>
      <div class="space-y-1 text-xs text-rose-800">
        ${conflicts
          .map(
            (c) => `
          <div class="flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-rose-200">
            <span class="font-bold text-rose-900">•</span>
            <div>
              <strong>${escapeHtml(c.auditor_nombre)}:</strong> ${escapeHtml(c.descripcion)}
              <span class="font-mono text-[11px] block text-rose-700 mt-0.5">
                Coincidencia el día ${escapeHtml(c.fecha_conflicto)} entre ${escapeHtml(c.auditoria_a_codigo)} (${escapeHtml(c.auditoria_a_fechas)}) y ${escapeHtml(c.auditoria_b_codigo)} (${escapeHtml(c.auditoria_b_fechas)}).
              </span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

/**
 * Monthly Grid View
 */
function renderMonthGridView(
  audits: AuditEventEntity[],
  monthIndex: number,
  year: number
): string {
  // Calculate days in month and starting weekday
  const firstDay = new Date(year, monthIndex, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Build calendar matrix cells
  const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;

  let cellsHtml = '';

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - startingDayOfWeek + 1;
    const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

    if (!isCurrentMonth) {
      cellsHtml += `
        <div class="min-h-28 bg-slate-50/50 border border-slate-100 p-1.5 text-slate-300">
          <span class="text-[11px] font-mono"></span>
        </div>
      `;
      continue;
    }

    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

    // Find audits active on this day
    const dayAudits = audits.filter((a) => {
      const start = a.fecha_reprogramacion || a.fecha_inicio;
      const end = a.fecha_fin >= start ? a.fecha_fin : start;
      return dateStr >= start && dateStr <= end;
    });

    const isToday = false; // standard view

    cellsHtml += `
      <div class="min-h-28 bg-white border border-slate-200 p-2 flex flex-col justify-between hover:bg-slate-50/80 transition-colors group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold font-mono ${
            isToday
              ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center'
              : 'text-slate-700'
          }">
            ${dayNumber}
          </span>
          ${
            dayAudits.length > 0
              ? `<span class="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-800">
                   ${dayAudits.length}
                 </span>`
              : ''
          }
        </div>

        <!-- Audit Chips on this Day -->
        <div class="space-y-1 my-1">
          ${dayAudits
            .map((audit) => {
              const modMeta = getModalityVisual(audit.tipo_auditoria);
              return `
                <button
                  type="button"
                  data-action="open-calendar-drawer"
                  data-audit-id="${escapeHtml(audit.id)}"
                  title="${escapeHtml(audit.codigo_auditoria)} · ${escapeHtml(audit.organizacion_nombre)} (${escapeHtml(audit.tipo_auditoria)})"
                  class="w-full text-left px-1.5 py-1 rounded text-[10px] font-semibold border ${modMeta.badgeClass} hover:opacity-90 transition-opacity cursor-pointer truncate block shadow-2xs"
                >
                  <span class="font-bold">${escapeHtml(audit.codigo_auditoria)}</span>
                  <span class="text-[9px] block truncate text-slate-600">${escapeHtml(audit.organizacion_nombre)}</span>
                </button>
              `;
            })
            .join('')}
        </div>

        <div class="text-[9px] text-slate-400 font-mono text-right">
          ${dayAudits.length > 0 ? `${dayAudits.map((a) => a.metodologia[0]).join('/')}` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <!-- Weekday Headers -->
      <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider text-center py-2.5">
        ${WEEKDAY_NAMES_ES.map((day) => `<div>${day}</div>`).join('')}
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7">
        ${cellsHtml}
      </div>
    </div>
  `;
}

/**
 * Timeline / Gantt View for Resource Conflict Detection
 */
function renderTimelineGanttView(
  audits: AuditEventEntity[],
  monthIndex: number,
  year: number
): string {
  // Extract distinct auditors
  const auditorMap = new Map<string, string>();
  for (const a of audits) {
    if (a.auditor_lider_id) {
      auditorMap.set(a.auditor_lider_id, a.auditor_lider_nombre);
    }
    for (const m of a.equipo) {
      if (m.id_auditor) {
        auditorMap.set(m.id_auditor, m.nombre);
      }
    }
  }

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Línea de Tiempo de Ocupación por Evaluador</h3>
          <p class="text-xs text-slate-500">
            Visualización longitudinal de fechas asignadas para detección de sobreposición y optimización logística
          </p>
        </div>
        <div class="text-xs font-semibold text-slate-500">
          Evaluadores Activos: <strong class="text-slate-800">${auditorMap.size}</strong>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 text-slate-600 text-[10px] font-mono border-b border-slate-200">
              <th class="py-2 px-3 text-left w-56 font-sans uppercase font-bold text-slate-700">Auditor Calificado</th>
              ${daysArray
                .map(
                  (d) => `
                <th class="py-2 px-1 text-center w-8 ${d % 2 === 0 ? 'bg-slate-100/50' : ''}">
                  ${d}
                </th>
              `
                )
                .join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${Array.from(auditorMap.entries())
              .map(([audId, audName]) => {
                return `
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div class="flex items-center gap-1.5">
                        <span>👤</span>
                        <span>${escapeHtml(audName)}</span>
                      </div>
                    </td>
                    ${daysArray
                      .map((d) => {
                        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        // Check if this auditor has an audit on dateStr
                        const activeAudits = audits.filter((a) => {
                          const isAssigned =
                            a.auditor_lider_id === audId ||
                            a.equipo.some((m) => m.id_auditor === audId);
                          if (!isAssigned) return false;
                          const start = a.fecha_reprogramacion || a.fecha_inicio;
                          const end = a.fecha_fin >= start ? a.fecha_fin : start;
                          return dateStr >= start && dateStr <= end;
                        });

                        if (activeAudits.length === 0) {
                          return `<td class="py-2 px-1 text-center border-l border-slate-100"></td>`;
                        }

                        const hasConflict = activeAudits.length > 1;

                        return `
                          <td class="py-1 px-0.5 text-center border-l border-slate-100">
                            <div
                              class="w-full h-7 rounded text-[9px] font-bold font-mono flex items-center justify-center cursor-pointer transition-all ${
                                hasConflict
                                  ? 'bg-rose-500 text-white animate-pulse'
                                  : 'bg-indigo-600 text-white'
                              }"
                              data-action="open-calendar-drawer"
                              data-audit-id="${escapeHtml(activeAudits[0].id)}"
                              title="${activeAudits.map((a) => a.codigo_auditoria).join(' & ')}"
                            >
                              ${hasConflict ? '⚠️' : activeAudits[0].codigo_auditoria.slice(-3)}
                            </div>
                          </td>
                        `;
                      })
                      .join('')}
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
 * Quick-Access Interactive Slide-Over Event Drawer
 */
function renderEventDrawer(audit: AuditEventEntity | null): string {
  if (!audit) return '';

  const modMeta = getModalityVisual(audit.tipo_auditoria);
  const methMeta = getMethodologyVisual(audit.metodologia);
  const statMeta = getAuditStatusVisual(audit.estatus);

  return `
    <div class="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div class="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <!-- Drawer Header -->
        <div class="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">📅</span>
            <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              ${escapeHtml(audit.codigo_auditoria)}
            </span>
          </div>
          <button
            type="button"
            data-action="close-calendar-drawer"
            class="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
            title="Cerrar panel lateral"
          >
            ✕
          </button>
        </div>

        <!-- Drawer Content -->
        <div class="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          <!-- Organization info -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Organización Cliente</span>
            <h3 class="text-base font-bold text-slate-900">${escapeHtml(audit.organizacion_nombre)}</h3>
            <div class="text-slate-500 font-mono text-[11px]">
              RIF: <span class="font-bold text-slate-700">${escapeHtml(audit.organizacion_rif)}</span>
            </div>
            <div class="text-slate-600 text-[11px] pt-1">
              📍 ${escapeHtml(audit.direccion_principal)}
            </div>
          </div>

          <!-- Certificate & Standard -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Certificado Asignado</span>
              <span class="font-mono font-bold text-indigo-700">${escapeHtml(audit.numero_certificado)}</span>
            </div>
            <div class="font-semibold text-slate-800">
              ${escapeHtml(audit.norma_codigo)} — ${escapeHtml(audit.norma_titulo)}
            </div>
            <div class="text-[10px] text-slate-500 font-mono">
              Sector Acreditado: IAF ${audit.sector_iaf}
            </div>
          </div>

          <!-- Modality & Methodology Badges -->
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2.5 rounded-lg border ${modMeta.badgeClass}">
              <div class="text-[10px] font-bold uppercase">Modalidad</div>
              <div class="font-semibold text-xs mt-0.5">${modMeta.symbol} ${escapeHtml(modMeta.label)}</div>
            </div>
            <div class="p-2.5 rounded-lg border ${methMeta.badgeClass}">
              <div class="text-[10px] font-bold uppercase">Metodología</div>
              <div class="font-semibold text-xs mt-0.5">${methMeta.symbol} ${escapeHtml(methMeta.label)}</div>
            </div>
          </div>

          <!-- Dates & Schedule -->
          <div class="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Fecha de Inicio:</span>
              <span class="font-mono font-bold text-slate-900">${escapeHtml(audit.fecha_inicio)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Fecha de Fin:</span>
              <span class="font-mono font-bold text-slate-900">${escapeHtml(audit.fecha_fin)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Días Auditor:</span>
              <span class="font-bold text-indigo-700">${audit.dias_auditor.toFixed(1)} días</span>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-slate-200">
              <span class="text-slate-500">Estatus Operativo:</span>
              <span class="font-bold ${statMeta.badgeClass} px-2 py-0.2 rounded text-[10px]">
                ${statMeta.symbol} ${escapeHtml(statMeta.label)}
              </span>
            </div>
          </div>

          <!-- Lead Auditor & Team -->
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Equipo Auditor</span>
            <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900">${escapeHtml(audit.auditor_lider_nombre)}</span>
                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Líder</span>
              </div>
              <div class="text-[11px] text-slate-500">${escapeHtml(audit.auditor_lider_email || '')}</div>
              ${audit.equipo
                .filter((m) => m.id_auditor !== audit.auditor_lider_id)
                .map(
                  (m) => `
                <div class="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
                  <span>${escapeHtml(m.nombre)}</span>
                  <span class="text-slate-500">${escapeHtml(m.rol)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Objective preview -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objetivo</span>
            <p class="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed text-[11px]">
              ${escapeHtml(audit.objetivo)}
            </p>
          </div>
        </div>

        <!-- Drawer Footer with Navigation Actions -->
        <div class="p-5 border-t border-slate-200 bg-slate-50/80 space-y-2">
          <button
            type="button"
            data-nav="auditorias"
            data-subview="scheduling"
            data-audit-id="${escapeHtml(audit.id)}"
            class="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer text-center shadow-2xs"
          >
            Ir al Detalle de Programación ↗
          </button>
          <button
            type="button"
            data-nav="auditorias"
            data-subview="findings"
            data-audit-id="${escapeHtml(audit.id)}"
            class="w-full py-2 px-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
          >
            Ver Resultados y Hallazgos ↗
          </button>
        </div>
      </div>
    </div>
  `;
}
