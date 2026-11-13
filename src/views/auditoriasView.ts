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
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3 pb-8 space-y-5">
      ${contentHtml}
    </main>
  `;
}
