import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertZeroUuidExposure } from './zeroUuid.js';
import type { UserProfile } from './healthCheck.js';
import {
  INITIAL_AUDIT_EVENTS,
  INITIAL_FINDINGS_DETAILED,
} from './auditDomain.js';
import { renderProgramacionView, type ProgramacionViewState } from '../views/programacionView.js';
import { renderCalendarioView, type CalendarioViewState } from '../views/calendarioView.js';
import { renderResultadoView, type ResultadoViewState } from '../views/resultadoView.js';
import { renderAuditoriasView } from '../views/auditoriasView.js';

const mockProfile: UserProfile = {
  id: 'u-1',
  nombre: 'Ing. Carlos Mendoza',
  role: 'ADMIN',
  status: 'APPROVED',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Phase 5 - Programación de Auditorías (List, Grid & 4-Zone Detail)', () => {
  it('renders directory in grid view adhering to Zero-UUID mandate', () => {
    const state: ProgramacionViewState = {
      selectedAuditId: null,
      query: '',
      selectedModality: 'ALL',
      selectedMethodology: 'ALL',
      selectedStatus: 'ALL',
      selectedAuditor: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      activeChildTab: 'equipo',
      isPlanningModalOpen: false,
      isAddingTeamMemberModalOpen: false,
      isAddingSiteScheduleModalOpen: false,
    };

    const html = renderProgramacionView(mockProfile, INITIAL_AUDIT_EVENTS, state);
    assert.match(html, /Programación de Auditorías/);
    assert.match(html, /AUD-2024-001/);
    assert.match(html, /Iberometal Componentes S\.A\./);
    assert.match(html, /FN-QMS-2024-001/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });

  it('renders directory in list view adhering to Zero-UUID mandate', () => {
    const state: ProgramacionViewState = {
      selectedAuditId: null,
      query: '',
      selectedModality: 'ALL',
      selectedMethodology: 'ALL',
      selectedStatus: 'ALL',
      selectedAuditor: 'ALL',
      viewMode: 'list',
      sortColumn: null,
      sortDirection: 'none',
      activeChildTab: 'equipo',
      isPlanningModalOpen: false,
      isAddingTeamMemberModalOpen: false,
      isAddingSiteScheduleModalOpen: false,
    };

    const html = renderProgramacionView(mockProfile, INITIAL_AUDIT_EVENTS, state);
    assert.match(html, /<table/);
    assert.match(html, /Código \/ Cliente/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });

  it('renders 4-Zone Detail View with child tabs (Equipo, Sedes with Site 0, Normativa)', () => {
    const state: ProgramacionViewState = {
      selectedAuditId: INITIAL_AUDIT_EVENTS[0].id,
      query: '',
      selectedModality: 'ALL',
      selectedMethodology: 'ALL',
      selectedStatus: 'ALL',
      selectedAuditor: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      activeChildTab: 'sedes',
      isPlanningModalOpen: false,
      isAddingTeamMemberModalOpen: false,
      isAddingSiteScheduleModalOpen: false,
    };

    const html = renderProgramacionView(mockProfile, INITIAL_AUDIT_EVENTS, state);
    // Zone 1: Parent data
    assert.match(html, /Iberometal Componentes S\.A\./);
    assert.match(html, /FN-QMS-2024-001/);
    assert.match(html, /ISO 9001:2015/);
    // Zone 2 & 3: Attributes
    assert.match(html, /Ing\. Carlos Mendoza/);
    assert.match(html, /4\.0 días/);
    // Zone 4: Sedes Tab with Site 0
    assert.match(html, /Sede Principal \(HQ\)|Sede Principal HQ/);
    assert.match(html, /#0/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });
});

describe('Phase 5 - Calendario Operativo de Evaluaciones', () => {
  it('renders monthly grid view with month navigation and audit chips', () => {
    const state: CalendarioViewState = {
      calendarMonth: 10, // Noviembre
      calendarYear: 2024,
      calendarViewMode: 'month',
      filterAuditor: 'ALL',
      filterStandard: 'ALL',
      filterMethodology: 'ALL',
      drawerAuditId: null,
    };

    const html = renderCalendarioView(mockProfile, INITIAL_AUDIT_EVENTS, state);
    assert.match(html, /Noviembre 2024/);
    assert.match(html, /Matriz Mensual/);
    assert.match(html, /AUD-2024-001/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });

  it('renders timeline / Gantt view and slide-over event drawer', () => {
    const state: CalendarioViewState = {
      calendarMonth: 10,
      calendarYear: 2024,
      calendarViewMode: 'timeline',
      filterAuditor: 'ALL',
      filterStandard: 'ALL',
      filterMethodology: 'ALL',
      drawerAuditId: INITIAL_AUDIT_EVENTS[0].id,
    };

    const html = renderCalendarioView(mockProfile, INITIAL_AUDIT_EVENTS, state);
    assert.match(html, /Línea de Tiempo de Ocupación por Evaluador/);
    assert.match(html, /Ir al Detalle de Programación/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });
});

describe('Phase 5 - Resultado y Gestión de Hallazgos', () => {
  it('renders findings management table view and ISO 17021-1 recommendation banner', () => {
    const state: ResultadoViewState = {
      selectedAuditId: INITIAL_AUDIT_EVENTS[0].id,
      viewMode: 'table',
      filterClassification: 'ALL',
      filterLifecycle: 'ALL',
      searchQuery: '',
      isNewFindingModalOpen: false,
      selectedFindingIdForDetail: null,
      isRecommendationModalOpen: false,
    };

    const html = renderResultadoView(
      mockProfile,
      INITIAL_AUDIT_EVENTS,
      INITIAL_FINDINGS_DETAILED,
      state
    );

    assert.match(html, /Resultado y Gestión de Hallazgos/);
    assert.match(html, /Dictamen ISO\/IEC 17021-1:2015/);
    assert.match(html, /HAL-2024-001/);
    assert.match(html, /NC Menor/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });

  it('renders Kanban board with all 5 lifecycle stages', () => {
    const state: ResultadoViewState = {
      selectedAuditId: 'ALL',
      viewMode: 'kanban',
      filterClassification: 'ALL',
      filterLifecycle: 'ALL',
      searchQuery: '',
      isNewFindingModalOpen: false,
      selectedFindingIdForDetail: null,
      isRecommendationModalOpen: false,
    };

    const html = renderResultadoView(
      mockProfile,
      INITIAL_AUDIT_EVENTS,
      INITIAL_FINDINGS_DETAILED,
      state
    );

    assert.match(html, /Abierto/);
    assert.match(html, /Causa Raíz Analizada/);
    assert.match(html, /Plan de Acción Enviado/);
    assert.match(html, /Verificado/);
    assert.match(html, /Cerrado/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });

  it('renders finding detail modal and root cause analysis fields', () => {
    const state: ResultadoViewState = {
      selectedAuditId: INITIAL_AUDIT_EVENTS[0].id,
      viewMode: 'table',
      filterClassification: 'ALL',
      filterLifecycle: 'ALL',
      searchQuery: '',
      isNewFindingModalOpen: false,
      selectedFindingIdForDetail: INITIAL_FINDINGS_DETAILED[0].id,
      isRecommendationModalOpen: false,
    };

    const html = renderResultadoView(
      mockProfile,
      INITIAL_AUDIT_EVENTS,
      INITIAL_FINDINGS_DETAILED,
      state
    );

    assert.match(html, /Análisis de Causa Raíz \(Cliente\)/);
    assert.match(html, /Plan de Acción Correctiva y Plazo/);
    assert.match(html, /Comentarios de Verificación del Auditor Líder/);

    const check = assertZeroUuidExposure(html);
    assert.equal(check.compliant, true, `Zero-UUID violations: ${check.exposedUuids.join(', ')}`);
  });
});

describe('Phase 5 - Domain 1 Navigation Integration', () => {
  it('renders auditorias master view dispatching seamlessly across subviews', () => {
    const schedulingHtml = renderAuditoriasView(mockProfile, {
      activeSubSection: 'scheduling',
      audits: [],
      auditors: [],
      loading: false,
      auditEventsDetailed: INITIAL_AUDIT_EVENTS,
      findingsDetailed: INITIAL_FINDINGS_DETAILED,
    });
    assert.match(schedulingHtml, /Programación de Auditorías/);

    const calendarHtml = renderAuditoriasView(mockProfile, {
      activeSubSection: 'calendar',
      audits: [],
      auditors: [],
      loading: false,
      auditEventsDetailed: INITIAL_AUDIT_EVENTS,
      findingsDetailed: INITIAL_FINDINGS_DETAILED,
    });
    assert.match(calendarHtml, /Calendario Operativo de Evaluaciones/);

    const findingsHtml = renderAuditoriasView(mockProfile, {
      activeSubSection: 'findings',
      audits: [],
      auditors: [],
      loading: false,
      auditEventsDetailed: INITIAL_AUDIT_EVENTS,
      findingsDetailed: INITIAL_FINDINGS_DETAILED,
    });
    assert.match(findingsHtml, /Resultado y Gestión de Hallazgos/);
  });
});
