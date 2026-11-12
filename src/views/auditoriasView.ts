import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { CertificateRecord } from '../lib/searchControls';
import type { SiteRecord, ProcessRecord, ShiftRecord } from './certificacionView';
import type { FindingRecord } from '../lib/drillDown';
import {
  type AuditEventEntity,
  type FindingItem,
  INITIAL_AUDIT_EVENTS,
  INITIAL_FINDINGS_DETAILED,
} from '../lib/auditDomain';
import {
  renderProgramacionView,
  type ProgramacionViewState,
} from './programacionView';
import {
  renderCalendarioView,
  type CalendarioViewState,
} from './calendarioView';
import {
  renderResultadoView,
  type ResultadoViewState,
} from './resultadoView';

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
  // Phase 5 additions:
  auditEventsDetailed?: AuditEventEntity[];
  findingsDetailed?: FindingItem[];
  programacionState?: ProgramacionViewState;
  calendarioState?: CalendarioViewState;
  resultadoState?: ResultadoViewState;
}

export function renderAuditoriasView(
  profile: UserProfile,
  state: AuditoriasViewState
): string {
  const activeSub = state.activeSubSection || 'scheduling';

  const allAuditEvents = state.auditEventsDetailed && state.auditEventsDetailed.length > 0
    ? state.auditEventsDetailed
    : INITIAL_AUDIT_EVENTS;

  const allFindings = state.findingsDetailed && state.findingsDetailed.length > 0
    ? state.findingsDetailed
    : INITIAL_FINDINGS_DETAILED;

  const defaultProgramacionState: ProgramacionViewState = {
    selectedAuditId: null,
    query: '',
    selectedModality: 'ALL',
    selectedMethodology: 'ALL',
    selectedStatus: 'ALL',
    selectedAuditor: 'ALL',
    viewMode: 'grid',
    sortColumn: null,
    sortDirection: 'none',
    activeChildTab: activeSub === 'team' ? 'equipo' : activeSub === 'scope' ? 'sedes' : 'equipo',
    isPlanningModalOpen: state.isPlanningModalOpen || false,
    isAddingTeamMemberModalOpen: false,
    isAddingSiteScheduleModalOpen: false,
  };

  const defaultCalendarioState: CalendarioViewState = {
    calendarMonth: 10, // November
    calendarYear: 2024,
    calendarViewMode: 'month',
    filterAuditor: 'ALL',
    filterStandard: 'ALL',
    filterMethodology: 'ALL',
    drawerAuditId: null,
  };

  const defaultResultadoState: ResultadoViewState = {
    selectedAuditId: '80000000-0000-0000-0000-000000000001',
    viewMode: 'table',
    filterClassification: state.findingFilterType || 'ALL',
    filterLifecycle: 'ALL',
    searchQuery: '',
    isNewFindingModalOpen: state.isLoggingFinding || false,
    selectedFindingIdForDetail: null,
    isRecommendationModalOpen: false,
  };

  const programacionState = state.programacionState || defaultProgramacionState;
  const calendarioState = state.calendarioState || defaultCalendarioState;
  const resultadoState = state.resultadoState || defaultResultadoState;

  // The 3 primary operational blocks according to Phase 5 Specification
  const primaryTabs = [
    {
      id: 'scheduling',
      label: 'Programación',
      symbol: '🗓️',
      desc: 'Planificación de auditorías, sedes y equipos',
    },
    {
      id: 'calendar',
      label: 'Calendario',
      symbol: '📆',
      desc: 'Cronograma mensual y línea de tiempo por evaluador',
    },
    {
      id: 'findings',
      label: 'Resultado',
      symbol: '📋',
      desc: 'Gestión de hallazgos y recomendación ISO 17021-1',
    },
  ];

  let viewBody = '';

  if (activeSub === 'calendar') {
    viewBody = renderCalendarioView(profile, allAuditEvents, calendarioState);
  } else if (activeSub === 'findings' || activeSub === 'resultado') {
    viewBody = renderResultadoView(profile, allAuditEvents, allFindings, resultadoState);
  } else {
    // 'scheduling', 'team', 'scope'
    viewBody = renderProgramacionView(profile, allAuditEvents, programacionState);
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      <!-- Domain Navigation Strip (3 Operational Blocks) -->
      <section class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm">
            📅
          </span>
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Dominio 1 · Operaciones</div>
            <h1 class="text-base font-bold text-slate-900 tracking-tight">Auditorías de Certificación</h1>
          </div>
        </div>

        <!-- 3 Primary Block Switchers -->
        <div class="flex flex-wrap items-center gap-2">
          ${primaryTabs
            .map((tab) => {
              const isActive =
                activeSub === tab.id ||
                (tab.id === 'findings' && activeSub === 'resultado') ||
                (tab.id === 'scheduling' && (activeSub === 'team' || activeSub === 'scope'));

              return `
                <button
                  type="button"
                  data-nav="auditorias"
                  data-subview="${tab.id}"
                  title="${escapeHtml(tab.desc)}"
                  class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }"
                >
                  <span aria-hidden="true">${tab.symbol}</span>
                  <span>${escapeHtml(tab.label)}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </section>

      <!-- Active Operational View -->
      ${viewBody}
    </main>
  `;
}
