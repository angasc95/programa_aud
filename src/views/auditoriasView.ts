import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { CertificateRecord } from '../lib/searchControls';
import type { AuditorDetailEntity } from '../lib/competencyMatrix';
import type {
  CalendarioViewState,
  Phase5FindingEntity,
  ProgramacionAuditEntity,
  ProgramacionViewState,
  ResultadoViewState,
} from '../lib/auditExecution';
import { renderProgramacionView } from './programacionView';
import { renderCalendarioView } from './calendarioView';
import { renderResultadoView } from './resultadoView';

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
  programacionState: ProgramacionViewState;
  calendarioState: CalendarioViewState;
  resultadoState: ResultadoViewState;
  programacionAudits: ProgramacionAuditEntity[];
  phase5Findings: Phase5FindingEntity[];
  allAuditorsDetailed: AuditorDetailEntity[];
  certificates: CertificateRecord[];
  processes: Array<{ id: string; nombre_proceso: string }>;
  requirements: Array<{ id: string; codigo: string; norma: string }>;
  standards: Array<{ norma: string }>;
  loading: boolean;
}

export function renderAuditoriasView(
  profile: UserProfile,
  state: AuditoriasViewState
): string {
  // Map legacy 'team'/'scope' subsections gracefully to 'scheduling'
  const rawSub = state.activeSubSection || 'scheduling';
  const activeSub =
    rawSub === 'calendar' || rawSub === 'findings' ? rawSub : 'scheduling';

  const subTabs = [
    {
      id: 'scheduling',
      label: 'Programación',
      symbol: '🗓️',
      desc: 'Planificación, equipo evaluador, muestreo multisitio y matriz normativa',
    },
    {
      id: 'calendar',
      label: 'Calendario',
      symbol: '📆',
      desc: 'Agenda cronológica mensual/trimestral, Timeline Gantt y conflictos',
    },
    {
      id: 'findings',
      label: 'Resultado',
      symbol: '📋',
      desc: 'Tablero de hallazgos ISO 19011 y recomendación ISO/IEC 17021-1',
    },
  ];

  let contentHtml = '';
  if (activeSub === 'calendar') {
    contentHtml = renderCalendarioView({
      profile,
      state: state.calendarioState,
      audits: state.programacionAudits,
      auditors: state.allAuditorsDetailed,
      standards: state.standards,
    });
  } else if (activeSub === 'findings') {
    contentHtml = renderResultadoView({
      profile,
      state: state.resultadoState,
      audits: state.programacionAudits,
      findings: state.phase5Findings,
      processes: state.processes,
      requirements: state.requirements,
    });
  } else {
    contentHtml = renderProgramacionView({
      profile,
      state: state.programacionState,
      audits: state.programacionAudits,
      auditors: state.allAuditorsDetailed,
      certificates: state.certificates,
      loading: state.loading,
    });
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Domain Banner & 3 Operational Stage Switcher -->
      <section class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold tracking-wide">
              <span aria-hidden="true">📅</span>
              <span>BLOQUE 1 · AUDITORÍAS</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">
              Ciclo Operativo de Auditorías ISO/IEC 17021-1
            </h1>
          </div>

          <div class="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200" role="tablist" aria-label="Etapas del Dominio Auditorías">
            ${subTabs
              .map((tab) => {
                const isActive = tab.id === activeSub;
                return `
                  <button
                    type="button"
                    role="tab"
                    data-nav="auditorias"
                    data-subview="${tab.id}"
                    aria-selected="${isActive ? 'true' : 'false'}"
                    title="${escapeHtml(tab.desc)}"
                    class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }"
                  >
                    <span aria-hidden="true">${tab.symbol}</span>
                    <span>${escapeHtml(tab.label)}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      </section>

      ${contentHtml}
    </main>
  `;
}
