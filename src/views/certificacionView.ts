import type { UserProfile } from '../lib/healthCheck';
import type {
  CertificateRecord,
  SearchControlsFilterState,
} from '../lib/searchControls';
import {
  renderOrganizacionView,
  type OrganizacionViewState,
} from './organizacionView';
import {
  INITIAL_ORGANIZACIONES,
  type OrganizacionEntity,
  type CertificadoSummary,
} from '../lib/activeCertificates';
import {
  renderCertificadoView,
  type CertificadoViewState,
} from './certificadoView';
import {
  INITIAL_CERTIFICADOS_DETAILED,
  type CertificadoDetailEntity,
} from '../lib/multisiteSampling';
import {
  renderAuditorView,
  type AuditorViewState,
} from './auditorView';
import {
  INITIAL_AUDITORES_DETAILED,
  type AuditorDetailEntity,
} from '../lib/competencyMatrix';

export interface OrganizationRecord {
  id: string;
  nombre: string;
  rif: string;
  direccion_fiscal?: string;
  certificados_count: number;
}

export interface SiteRecord {
  id: string;
  numero_sitio: number;
  nombre_sitio: string;
  direccion_sitio: string;
  numero_certificado: string;
  turnos_count: number;
}

export interface ProcessRecord {
  id: string;
  nombre_proceso: string;
  numero_certificado: string;
  clausulas_cubiertas: string[];
}

export interface ShiftRecord {
  id: string;
  hora_entrada: string;
  hora_salida: string;
  descripcion: string;
  sitios_vinculados: string[];
}

export interface CertificacionViewState {
  activeSubSection: string;
  filters: SearchControlsFilterState;
  filteredCertificates: CertificateRecord[];
  allCertificates: CertificateRecord[];
  availableStatuses: string[];
  availableStandards: string[];
  organizations: OrganizationRecord[];
  sites: SiteRecord[];
  processes: ProcessRecord[];
  shifts: ShiftRecord[];
  loading: boolean;
  organizacionState?: Partial<OrganizacionViewState>;
  allOrganizaciones?: OrganizacionEntity[];
  certificadoState?: Partial<CertificadoViewState>;
  allCertificadosDetailed?: CertificadoDetailEntity[];
  auditorState?: Partial<AuditorViewState>;
  allAuditorsDetailed?: AuditorDetailEntity[];
}

export function renderCertificacionView(
  profile: UserProfile,
  state: CertificacionViewState
): string {
  const activeSub = state.activeSubSection || 'certificates';

  let contentHtml = '';

  if (activeSub === 'organizations') {
    const orgState: OrganizacionViewState = {
      selectedOrganizacionId: state.organizacionState?.selectedOrganizacionId || null,
      query: state.organizacionState?.query || '',
      hasActiveCertificates: state.organizacionState?.hasActiveCertificates || 'ALL',
      selectedSectorIaf: state.organizacionState?.selectedSectorIaf || 'ALL',
      viewMode: state.organizacionState?.viewMode || 'grid',
      sortColumn: state.organizacionState?.sortColumn || null,
      sortDirection: state.organizacionState?.sortDirection || 'none',
      isEditingAttributes: Boolean(state.organizacionState?.isEditingAttributes),
      activeChildTab: 'certificados',
      editFormData: state.organizacionState?.editFormData,
      editErrorMessage: state.organizacionState?.editErrorMessage,
      saveSuccessMessage: state.organizacionState?.saveSuccessMessage,
      isSidebarOpen: state.organizacionState?.isSidebarOpen ?? true,
      facetSelections: state.organizacionState?.facetSelections,
      isCreating: Boolean(state.organizacionState?.isCreating),
      createErrorMessage: state.organizacionState?.createErrorMessage,
    };

    const orgList: OrganizacionEntity[] =
      state.allOrganizaciones !== undefined
        ? state.allOrganizaciones
        : INITIAL_ORGANIZACIONES;

    const certSummaries: CertificadoSummary[] = state.allCertificates.map((c) => ({
      id: c.id,
      numero_certificado: c.numero_certificado,
      id_organizacion: c.organizacion_id,
      organizacion_id: c.organizacion_id,
      organizacion_nombre: c.organizacion_nombre,
      norma: c.norma,
      esquema: c.esquema,
      estatus: c.estatus,
      sector_iaf: c.sector_iaf,
      multisitio: c.multisitio,
      sitios_count: c.sitios_count,
      fecha_emision: c.fecha_emision,
      fecha_vencimiento: c.fecha_vencimiento,
      cobertura_porcentaje: c.cobertura_porcentaje,
    }));

    contentHtml = renderOrganizacionView({
      profile,
      state: orgState,
      organizaciones: orgList,
      certificados: certSummaries,
      loading: state.loading,
    });
  } else if (activeSub === 'auditors') {
    const audState: AuditorViewState = {
      selectedAuditorId: state.auditorState?.selectedAuditorId || null,
      activeChildTab: state.auditorState?.activeChildTab || 'competencias',
      query: state.auditorState?.query || '',
      selectedCalificacion: state.auditorState?.selectedCalificacion || 'ALL',
      selectedStandard: state.auditorState?.selectedStandard || 'ALL',
      selectedSectorIaf: state.auditorState?.selectedSectorIaf || 'ALL',
      viewMode: state.auditorState?.viewMode || 'grid',
      sortColumn: state.auditorState?.sortColumn || null,
      sortDirection: state.auditorState?.sortDirection || 'none',
      isEditingAttributes: Boolean(state.auditorState?.isEditingAttributes),
      editFormData: state.auditorState?.editFormData,
      editErrorMessage: state.auditorState?.editErrorMessage,
      saveSuccessMessage: state.auditorState?.saveSuccessMessage,
      isAddCompetencyModalOpen: Boolean(state.auditorState?.isAddCompetencyModalOpen),
      isSidebarOpen: state.auditorState?.isSidebarOpen ?? true,
      facetSelections: state.auditorState?.facetSelections,
      isCreating: Boolean(state.auditorState?.isCreating),
      createErrorMessage: state.auditorState?.createErrorMessage,
    };

    const audList: AuditorDetailEntity[] =
      state.allAuditorsDetailed !== undefined
        ? state.allAuditorsDetailed
        : INITIAL_AUDITORES_DETAILED;

    contentHtml = renderAuditorView({
      profile,
      state: audState,
      auditors: audList,
      loading: state.loading,
    });
  } else {
    // certificates (and graceful fallback for retired 'sites'/'processes'/'shifts'/'drilldown' subviews)
    const certState: CertificadoViewState = {
      selectedCertId: state.certificadoState?.selectedCertId || null,
      activeChildTab: state.certificadoState?.activeChildTab || 'sitios',
      query: state.certificadoState?.query || '',
      selectedStandard: state.certificadoState?.selectedStandard || 'ALL',
      selectedStatus: state.certificadoState?.selectedStatus || 'ALL',
      selectedSectorIaf: state.certificadoState?.selectedSectorIaf || 'ALL',
      viewMode: state.certificadoState?.viewMode || 'grid',
      sortColumn: state.certificadoState?.sortColumn || null,
      sortDirection: state.certificadoState?.sortDirection || 'none',
      isEditingAttributes: Boolean(state.certificadoState?.isEditingAttributes),
      editFormData: state.certificadoState?.editFormData,
      editErrorMessage: state.certificadoState?.editErrorMessage,
      saveSuccessMessage: state.certificadoState?.saveSuccessMessage,
      originatingOrganizacionId: state.certificadoState?.originatingOrganizacionId || null,
      isSidebarOpen: state.certificadoState?.isSidebarOpen ?? true,
      facetSelections: state.certificadoState?.facetSelections,
      isCreating: Boolean(state.certificadoState?.isCreating),
      createErrorMessage: state.certificadoState?.createErrorMessage,
    };

    const certList: CertificadoDetailEntity[] =
      state.allCertificadosDetailed !== undefined
        ? state.allCertificadosDetailed
        : INITIAL_CERTIFICADOS_DETAILED;

    const orgList: OrganizacionEntity[] =
      state.allOrganizaciones !== undefined
        ? state.allOrganizaciones
        : INITIAL_ORGANIZACIONES;

    contentHtml = renderCertificadoView({
      profile,
      state: certState,
      certificates: certList,
      organizaciones: orgList,
      loading: state.loading,
    });
  }

  return `
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3 pb-8 space-y-5">
      ${contentHtml}
    </main>
  `;
}
