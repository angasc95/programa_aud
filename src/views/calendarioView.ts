import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { AuditorDetailEntity } from '../lib/competencyMatrix';
import {
  buildCalendarMonthGrid,
  detectAuditorConflicts,
  filterCalendarAudits,
  formatIsoDateParts,
  getAuditStatusVisualStyle,
  getMethodologyVisualStyle,
  getModalityVisualStyle,
  getQuarterMonthsForMonth,
  type AuditScheduleConflict,
  type CalendarioViewState,
  type CalendarDisplayMode,
  type ProgramacionAuditEntity,
} from '../lib/auditExecution';

export type { CalendarioViewState, CalendarDisplayMode };

export interface CalendarioViewProps {
  profile: UserProfile;
  state: CalendarioViewState;
  audits: ProgramacionAuditEntity[];
  auditors: AuditorDetailEntity[];
  standards: Array<{ norma: string }>;
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

const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const GRID_COLS_BY_DAYS: Record<number, string> = {
  28: 'grid-cols-[repeat(28,minmax(0,1fr))]',
  29: 'grid-cols-[repeat(29,minmax(0,1fr))]',
  30: 'grid-cols-[repeat(30,minmax(0,1fr))]',
  31: 'grid-cols-[repeat(31,minmax(0,1fr))]',
};

const COL_START_CLASSES: Record<number, string> = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4',
  5: 'col-start-5',
  6: 'col-start-6',
  7: 'col-start-7',
  8: 'col-start-8',
  9: 'col-start-9',
  10: 'col-start-10',
  11: 'col-start-11',
  12: 'col-start-12',
  13: 'col-start-13',
  14: 'col-start-14',
  15: 'col-start-15',
  16: 'col-start-16',
  17: 'col-start-17',
  18: 'col-start-18',
  19: 'col-start-19',
  20: 'col-start-20',
  21: 'col-start-21',
  22: 'col-start-22',
  23: 'col-start-23',
  24: 'col-start-24',
  25: 'col-start-25',
  26: 'col-start-26',
  27: 'col-start-27',
  28: 'col-start-28',
  29: 'col-start-29',
  30: 'col-start-30',
  31: 'col-start-31',
};

const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
  13: 'col-span-13',
  14: 'col-span-14',
  15: 'col-span-15',
  16: 'col-span-16',
  17: 'col-span-17',
  18: 'col-span-18',
  19: 'col-span-19',
  20: 'col-span-20',
  21: 'col-span-21',
  22: 'col-span-22',
  23: 'col-span-23',
  24: 'col-span-24',
  25: 'col-span-25',
  26: 'col-span-26',
  27: 'col-span-27',
  28: 'col-span-28',
  29: 'col-span-29',
  30: 'col-span-30',
  31: 'col-span-31',
};

export function renderCalendarioView(props: CalendarioViewProps): string {
  const { state, audits, auditors, standards } = props;

  const filteredAudits = filterCalendarAudits(audits, {
    auditorId: state.filterAuditorId,
    standard: state.filterStandard,
    methodology: state.filterMethodology,
  });

  const conflicts = detectAuditorConflicts(filteredAudits);
  const conflictingAuditIds = new Set<string>();
  for (const c of conflicts) {
    conflictingAuditIds.add(c.audit_a_id);
    conflictingAuditIds.add(c.audit_b_id);
  }

  const monthLabel = `${MONTH_NAMES_ES[(state.referenceMonth - 1 + 12) % 12]} ${state.referenceYear}`;
  const quarterNum = Math.floor((state.referenceMonth - 1) / 3) + 1;
  const periodTitle =
    state.displayMode === 'quarter'
      ? `Trimestre Q${quarterNum} · ${state.referenceYear}`
      : monthLabel;

  const uniqueStandards = Array.from(
    new Set([
      ...standards.map((s) => s.norma),
      ...audits.map((a) => a.norma_codigo),
    ])
  ).sort();

  const drawerAudit = state.drawerAuditId
    ? audits.find((a) => a.id === state.drawerAuditId) || null
    : null;

  return `
    <div class="space-y-5">
      <!-- Header & Multi-Criteria Filter Bar -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Calendario Operativo y Línea de Tiempo de Evaluaciones
            </h2>
            <p class="text-xs text-slate-500">
              Agenda cronológica codificada por modalidad/metodología y detección de solapamientos de recursos auditores
            </p>
          </div>

          <!-- View Switcher + Totalizer -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="text-xs text-slate-500 font-medium tabular-nums">
              Mostrando <span class="font-bold text-slate-900 tabular-nums">${filteredAudits.length}</span> de <span class="font-semibold text-slate-700 tabular-nums">${audits.length}</span> auditorías programadas
            </div>
            <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs" role="group" aria-label="Modo de presentación del calendario">
              <button
                type="button"
                data-cal-mode="month"
                aria-pressed="${state.displayMode === 'month' ? 'true' : 'false'}"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  state.displayMode === 'month'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">📅</span>
                <span>Mensual</span>
              </button>
              <button
                type="button"
                data-cal-mode="quarter"
                aria-pressed="${state.displayMode === 'quarter' ? 'true' : 'false'}"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  state.displayMode === 'quarter'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">🗓️</span>
                <span>Trimestral</span>
              </button>
              <button
                type="button"
                data-cal-mode="gantt"
                aria-pressed="${state.displayMode === 'gantt' ? 'true' : 'false'}"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  state.displayMode === 'gantt'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                <span aria-hidden="true">📊</span>
                <span>Timeline / Gantt</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Period Navigation + Multi-Criteria Filtering Controls -->
        <div class="pt-3 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div class="lg:col-span-4 flex items-center gap-2">
            <button
              type="button"
              id="calPrevPeriodBtn"
              aria-label="Período anterior"
              class="px-2.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              ← Anterior
            </button>
            <div class="flex-1 text-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900">
              ${escapeHtml(periodTitle)}
            </div>
            <button
              type="button"
              id="calNextPeriodBtn"
              aria-label="Período siguiente"
              class="px-2.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Siguiente →
            </button>
          </div>

          <div class="lg:col-span-3">
            <label for="calFilterAuditor" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Auditor Líder / Equipo
            </label>
            <select id="calFilterAuditor" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="ALL" ${state.filterAuditorId === 'ALL' ? 'selected' : ''}>Todos los auditores (${auditors.length})</option>
              ${auditors
                .map(
                  (a) =>
                    `<option value="${escapeHtml(a.id)}" ${state.filterAuditorId === a.id ? 'selected' : ''}>${escapeHtml(a.nombre)}</option>`
                )
                .join('')}
            </select>
          </div>

          <div class="lg:col-span-3">
            <label for="calFilterStandard" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Norma ISO
            </label>
            <select id="calFilterStandard" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="ALL" ${state.filterStandard === 'ALL' ? 'selected' : ''}>Todas las normas</option>
              ${uniqueStandards
                .map(
                  (std) =>
                    `<option value="${escapeHtml(std)}" ${state.filterStandard === std ? 'selected' : ''}>${escapeHtml(std)}</option>`
                )
                .join('')}
            </select>
          </div>

          <div class="lg:col-span-2">
            <label for="calFilterMethodology" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Metodología
            </label>
            <select id="calFilterMethodology" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="ALL" ${state.filterMethodology === 'ALL' ? 'selected' : ''}>Todas</option>
              <option value="Presencial" ${state.filterMethodology === 'Presencial' ? 'selected' : ''}>Presencial</option>
              <option value="Remota" ${state.filterMethodology === 'Remota' ? 'selected' : ''}>Remota</option>
              <option value="Mixta" ${state.filterMethodology === 'Mixta' ? 'selected' : ''}>Mixta</option>
            </select>
          </div>
        </div>

        <!-- Color Legend -->
        <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-slate-500 uppercase tracking-wider mr-1">Leyenda:</span>
            <span class="px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200 font-semibold">📑 Etapa 1</span>
            <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold">🔍 Etapa 2</span>
            <span class="px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200 font-semibold">🔎 Seguimiento</span>
            <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 font-semibold">🔄 Renovación</span>
            <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-semibold">⚡ Extraordinaria</span>
          </div>
          <div class="text-slate-500 font-medium">
            Mostrando <strong class="text-slate-900">${filteredAudits.length}</strong> evento(s) · Clic en cualquier auditoría para abrir detalles
          </div>
        </div>
      </header>

      <!-- Resource Conflict Alert Banner -->
      ${renderConflictBanner(conflicts)}

      <!-- Primary Calendar Canvas -->
      ${
        state.displayMode === 'gantt'
          ? renderGanttTimelineView(filteredAudits, state.referenceYear, state.referenceMonth, conflictingAuditIds)
          : state.displayMode === 'quarter'
          ? renderQuarterlyGridView(filteredAudits, state.referenceYear, state.referenceMonth, conflictingAuditIds)
          : renderMonthlyGridView(filteredAudits, state.referenceYear, state.referenceMonth, conflictingAuditIds)
      }

      <!-- Slide-Over Event Detail Drawer -->
      ${drawerAudit ? renderCalendarEventDrawer(drawerAudit) : ''}
    </div>
  `;
}

function renderConflictBanner(conflicts: AuditScheduleConflict[]): string {
  if (conflicts.length === 0) return '';
  return `
    <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" role="status">
      <div class="flex items-start gap-2.5">
        <span class="text-lg shrink-0" aria-hidden="true">⚠️</span>
        <div class="text-xs space-y-1">
          <div class="font-bold text-rose-900">
            Conflicto de Disponibilidad de Auditor Detectado (${conflicts.length})
          </div>
          <ul class="space-y-0.5 text-rose-800">
            ${conflicts
              .map(
                (c) => `
                  <li>
                    <strong>${escapeHtml(c.auditor_nombre)}</strong> presenta solapamiento entre
                    <button type="button" data-action="open-cal-drawer" data-audit-id="${escapeHtml(c.audit_a_id)}" class="font-mono font-bold underline cursor-pointer">${escapeHtml(c.audit_a_codigo)}</button>
                    y
                    <button type="button" data-action="open-cal-drawer" data-audit-id="${escapeHtml(c.audit_b_id)}" class="font-mono font-bold underline cursor-pointer">${escapeHtml(c.audit_b_codigo)}</button>
                    (${escapeHtml(c.overlap_start)} al ${escapeHtml(c.overlap_end)}, ${c.overlap_days} día(s)).
                  </li>
                `
              )
              .join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function renderMonthlyGridView(
  audits: ProgramacionAuditEntity[],
  year: number,
  month: number,
  conflictingAuditIds: Set<string>
): string {
  const cells = buildCalendarMonthGrid(year, month, audits);

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <!-- Weekday Headers -->
      <div class="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        ${WEEKDAYS_ES.map(
          (day) =>
            `<div class="px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">${day}</div>`
        ).join('')}
      </div>

      <!-- Calendar Days Grid -->
      <div class="grid grid-cols-7 divide-x divide-y divide-slate-100">
        ${cells
          .map((cell) => {
            const bgClass = !cell.inCurrentMonth
              ? 'bg-slate-50/70 text-slate-400'
              : cell.isWeekend
              ? 'bg-slate-50/40'
              : 'bg-white';

            return `
              <div class="min-h-28 p-2 space-y-1.5 ${bgClass}">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold tabular-nums ${
                    cell.inCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }">${cell.dayOfMonth}</span>
                  ${
                    cell.audits.length > 0
                      ? `<span class="text-[10px] font-mono font-bold text-indigo-600">${cell.audits.length}</span>`
                      : ''
                  }
                </div>

                <div class="space-y-1">
                  ${cell.audits
                    .map((a) => {
                      const mod = getModalityVisualStyle(a.tipo_auditoria);
                      const met = getMethodologyVisualStyle(a.metodologia);
                      const isConflict = conflictingAuditIds.has(a.id);
                      return `
                        <button
                          type="button"
                          data-action="open-cal-drawer"
                          data-audit-id="${escapeHtml(a.id)}"
                          title="${escapeHtml(a.codigo_auditoria)} — ${escapeHtml(a.organizacion_nombre)} (${escapeHtml(a.tipo_auditoria)} · ${escapeHtml(a.metodologia)})"
                          class="w-full text-left px-1.5 py-1 rounded border text-[10px] leading-tight transition-colors cursor-pointer block ${
                            mod.calendarChipClass
                          } ${isConflict ? 'ring-2 ring-rose-500' : ''}"
                        >
                          <div class="flex items-center justify-between gap-1 font-mono font-bold">
                            <span class="truncate">${escapeHtml(a.codigo_auditoria)}</span>
                            <span aria-hidden="true">${met.symbol}</span>
                          </div>
                          <div class="truncate font-semibold">${escapeHtml(a.organizacion_nombre)}</div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderQuarterlyGridView(
  audits: ProgramacionAuditEntity[],
  year: number,
  month: number,
  conflictingAuditIds: Set<string>
): string {
  const quarterMonths = getQuarterMonthsForMonth(year, month);

  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      ${quarterMonths
        .map((qm) => {
          const monthPrefix = `${qm.year}-${String(qm.month).padStart(2, '0')}`;
          const monthAudits = audits.filter((a) => {
            const start = a.fecha_reprogramacion || a.fecha_inicio;
            return start.startsWith(monthPrefix) || a.fecha_fin.startsWith(monthPrefix);
          });
          const cells = buildCalendarMonthGrid(qm.year, qm.month, monthAudits);

          return `
            <section class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 class="text-sm font-bold text-slate-900">${escapeHtml(qm.label)}</h3>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 tabular-nums">
                  ${monthAudits.length} evento(s)
                </span>
              </div>

              <!-- Mini Month Grid -->
              <div class="grid grid-cols-7 gap-1 text-center text-[10px]">
                ${WEEKDAYS_ES.map((w) => `<div class="font-bold text-slate-400 py-1">${w[0]}</div>`).join('')}
                ${cells
                  .map((c) => {
                    if (!c.inCurrentMonth) {
                      return `<div class="py-1 text-slate-300">${c.dayOfMonth}</div>`;
                    }
                    const hasAudits = c.audits.length > 0;
                    const firstAudit = c.audits[0];
                    if (hasAudits && firstAudit) {
                      const mod = getModalityVisualStyle(firstAudit.tipo_auditoria);
                      return `
                        <button
                          type="button"
                          data-action="open-cal-drawer"
                          data-audit-id="${escapeHtml(firstAudit.id)}"
                          title="${escapeHtml(c.audits.map((x) => `${x.codigo_auditoria} ${x.organizacion_nombre}`).join(', '))}"
                          class="py-1 rounded font-bold border cursor-pointer ${mod.calendarChipClass}"
                        >
                          ${c.dayOfMonth}
                        </button>
                      `;
                    }
                    return `<div class="py-1 text-slate-600">${c.dayOfMonth}</div>`;
                  })
                  .join('')}
              </div>

              <!-- Month Audits List -->
              <div class="space-y-1.5 pt-2 border-t border-slate-100">
                ${
                  monthAudits.length > 0
                    ? monthAudits
                        .map((a) => {
                          const mod = getModalityVisualStyle(a.tipo_auditoria);
                          const hasConf = conflictingAuditIds.has(a.id);
                          return `
                            <button
                              type="button"
                              data-action="open-cal-drawer"
                              data-audit-id="${escapeHtml(a.id)}"
                              class="w-full text-left p-2 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                mod.calendarChipClass
                              } ${hasConf ? 'ring-2 ring-rose-500' : ''}"
                            >
                              <div class="min-w-0">
                                <div class="font-mono font-bold truncate">${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.fecha_inicio)}</div>
                                <div class="truncate font-semibold">${escapeHtml(a.organizacion_nombre)}</div>
                              </div>
                              <span class="shrink-0 text-[10px] font-bold">${escapeHtml(a.metodologia)}</span>
                            </button>
                          `;
                        })
                        .join('')
                    : `<p class="text-xs text-slate-400 italic py-2 text-center">Sin auditorías en este mes</p>`
                }
              </div>
            </section>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderGanttTimelineView(
  audits: ProgramacionAuditEntity[],
  year: number,
  month: number,
  conflictingAuditIds: Set<string>
): string {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const gridColsClass = GRID_COLS_BY_DAYS[daysInMonth] || GRID_COLS_BY_DAYS[30];
  const winStartStr = formatIsoDateParts(year, month, 1);
  const winEndStr = formatIsoDateParts(year, month, daysInMonth);

  // Group audits by Lead Auditor
  const byAuditor = new Map<string, ProgramacionAuditEntity[]>();
  for (const a of audits) {
    const start = a.fecha_reprogramacion || a.fecha_inicio;
    const end = a.fecha_fin >= start ? a.fecha_fin : start;
    if (end < winStartStr || start > winEndStr) continue;

    const list = byAuditor.get(a.auditor_lider) || [];
    list.push(a);
    byAuditor.set(a.auditor_lider, list);
  }

  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
        <div class="text-xs font-bold text-slate-800">
          Línea de Tiempo por Auditor Líder — ${escapeHtml(MONTH_NAMES_ES[month - 1])} ${year}
        </div>
        <div class="text-[11px] text-slate-500">
          Barras con borde rojo indican conflicto de agenda en fechas superpuestas
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="min-w-[820px]">
          <!-- Timeline Header -->
          <div class="grid grid-cols-12 border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500">
            <div class="col-span-3 px-4 py-2 border-r border-slate-200 uppercase tracking-wider">
              Auditor Líder
            </div>
            <div class="col-span-9 grid ${gridColsClass} text-center">
              ${dayNumbers
                .map(
                  (d) =>
                    `<div class="py-2 border-r border-slate-100 font-mono tabular-nums">${d}</div>`
                )
                .join('')}
            </div>
          </div>

          <!-- Timeline Rows -->
          ${
            byAuditor.size === 0
              ? `<div class="p-8 text-center text-xs text-slate-500">No existen eventos asignados en ${escapeHtml(MONTH_NAMES_ES[month - 1])} ${year} bajo los filtros actuales.</div>`
              : Array.from(byAuditor.entries())
                  .map(([auditorName, auditorAudits]) => {
                    return `
                      <div class="grid grid-cols-12 border-b border-slate-100 hover:bg-slate-50/40">
                        <div class="col-span-3 px-4 py-3 border-r border-slate-200 flex flex-col justify-center">
                          <div class="text-xs font-bold text-slate-900 truncate">${escapeHtml(auditorName)}</div>
                          <div class="text-[10px] text-slate-500">${auditorAudits.length} evento(s) este mes</div>
                        </div>

                        <div class="col-span-9 p-2 space-y-1.5">
                          ${auditorAudits
                            .map((a) => {
                              const startStr = a.fecha_reprogramacion || a.fecha_inicio;
                              const endStr = a.fecha_fin >= startStr ? a.fecha_fin : startStr;
                              const clampedStart = startStr < winStartStr ? winStartStr : startStr;
                              const clampedEnd = endStr > winEndStr ? winEndStr : endStr;

                              const startDay = Math.max(1, Number(clampedStart.slice(8, 10)) || 1);
                              const endDay = Math.min(daysInMonth, Number(clampedEnd.slice(8, 10)) || startDay);
                              const spanDays = Math.max(1, endDay - startDay + 1);

                              const startCls = COL_START_CLASSES[startDay] || 'col-start-1';
                              const spanCls = COL_SPAN_CLASSES[spanDays] || 'col-span-1';
                              const mod = getModalityVisualStyle(a.tipo_auditoria);
                              const hasConflict = conflictingAuditIds.has(a.id);

                              return `
                                <div class="grid ${gridColsClass} items-center">
                                  <button
                                    type="button"
                                    data-action="open-cal-drawer"
                                    data-audit-id="${escapeHtml(a.id)}"
                                    title="${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)} (${escapeHtml(a.fecha_inicio)} → ${escapeHtml(a.fecha_fin)})"
                                    class="${startCls} ${spanCls} px-2 py-1.5 rounded-md border text-[10px] font-bold truncate text-left cursor-pointer shadow-2xs transition-opacity hover:opacity-90 ${
                                      mod.ganttBarClass
                                    } ${hasConflict ? 'ring-2 ring-rose-500 ring-offset-1' : ''}"
                                  >
                                    ${hasConflict ? '⚠️ ' : ''}${escapeHtml(a.codigo_auditoria)} · ${escapeHtml(a.organizacion_nombre)}
                                  </button>
                                </div>
                              `;
                            })
                            .join('')}
                        </div>
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>
      </div>
    </div>
  `;
}

function renderCalendarEventDrawer(audit: ProgramacionAuditEntity): string {
  const mod = getModalityVisualStyle(audit.tipo_auditoria);
  const met = getMethodologyVisualStyle(audit.metodologia);
  const st = getAuditStatusVisualStyle(audit.estatus);

  return `
    <div
      id="calDrawerBackdrop"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calDrawerTitle"
    >
      <div class="w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
        <div class="p-6 space-y-5">
          <!-- Drawer Header -->
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  ${escapeHtml(audit.codigo_auditoria)}
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.badgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${st.dotClass}"></span>
                  <span>${escapeHtml(st.label)}</span>
                </span>
              </div>
              <h3 id="calDrawerTitle" class="text-lg font-bold text-slate-900">
                ${escapeHtml(audit.organizacion_nombre)}
              </h3>
              <div class="text-xs font-mono text-slate-500">
                ${escapeHtml(audit.numero_certificado)} · ${escapeHtml(audit.norma_codigo)}
              </div>
            </div>

            <button
              type="button"
              id="closeCalDrawerBtn"
              aria-label="Cerrar panel de evento"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Primary Site Location Address -->
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ubicación de Sede Principal
            </div>
            <div class="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
              <span aria-hidden="true">📍</span>
              <span>${escapeHtml(audit.sede_principal_direccion)}</span>
            </div>
          </div>

          <!-- Modality & Schedule -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl border border-slate-200 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Modalidad</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${mod.badgeClass}">
                <span aria-hidden="true">${mod.symbol}</span>
                <span>${escapeHtml(audit.tipo_auditoria)}</span>
              </span>
            </div>

            <div class="p-3 rounded-xl border border-slate-200 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Metodología</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${met.badgeClass}">
                <span aria-hidden="true">${met.symbol}</span>
                <span>${escapeHtml(audit.metodologia)}</span>
              </span>
            </div>

            <div class="col-span-2 p-3 rounded-xl border border-slate-200 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cronograma Planificado</span>
              <div class="font-mono font-bold text-slate-900">
                ${escapeHtml(audit.fecha_inicio)} al ${escapeHtml(audit.fecha_fin)} (${audit.dias_auditor} día(s)-auditor)
              </div>
            </div>
          </div>

          <!-- Assigned Audit Team & Contact Coordinates -->
          <div class="space-y-2.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Equipo Auditor Asignado y Contacto (${audit.equipo.length})
            </div>
            <div class="space-y-2">
              ${audit.equipo
                .map(
                  (m) => `
                  <div class="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-bold text-slate-900">${escapeHtml(m.nombre)}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        ${escapeHtml(m.rol)}
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-500">
                      ${escapeHtml(m.competencia_norma)} · Credencial ${escapeHtml(m.credencial_codigo)}
                    </div>
                    <div class="text-[11px] text-slate-600 font-mono flex flex-wrap gap-3 pt-1">
                      ${m.email ? `<span>✉️ ${escapeHtml(m.email)}</span>` : ''}
                      ${m.telefono ? `<span>📞 ${escapeHtml(m.telefono)}</span>` : ''}
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Direct Action Footer -->
        <div class="p-5 border-t border-slate-200 bg-slate-50 space-y-2">
          <button
            type="button"
            data-action="drawer-go-programacion"
            data-audit-id="${escapeHtml(audit.id)}"
            class="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Ir al Detalle de Programación →
          </button>
          <button
            type="button"
            data-action="drawer-go-resultado"
            data-audit-id="${escapeHtml(audit.id)}"
            class="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Ver Resultados y Hallazgos →
          </button>
          <button
            type="button"
            data-action="open-changelog"
            data-table-name="auditoria"
            data-record-id="${escapeHtml(audit.id)}"
            data-entity-name="${escapeHtml(audit.codigo_auditoria)} · ${escapeHtml(audit.organizacion_nombre)}"
            class="w-full py-1.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            🕒 Historial de Cambios
          </button>
        </div>
      </div>
    </div>
  `;
}
