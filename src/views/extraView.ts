import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  INITIAL_NORMAS,
  INITIAL_ACREDITACIONES,
  INITIAL_ORGANISMOS,
  INITIAL_REQUISITOS_LTREE,
  INITIAL_SECTORES_IAF,
  INITIAL_SUBSECTORES_IAF,
  INITIAL_ESTATUS_CATALOG,
  INITIAL_TIPOS_AUDITORIA_CATALOG,
  INITIAL_METODOLOGIAS_CATALOG,
  calculateLtreeIndentation,
  type NormaEntity,
  type OrganismoAcreditacion,
  type RequisitoLtree,
  type SectorIafEntity,
} from '../lib/extraDomain';
import {
  buildInitialAcreditacionEntities,
  toLegacyAcreditacionNormaIaf,
  type AcreditacionDetailEntity,
} from '../lib/acreditacionDomain';
import {
  renderNormaView,
  type NormaViewState,
} from './normaView';
import {
  renderSectorIafView,
  type SectorIafViewState,
} from './sectorIafView';
import {
  renderAcreditacionView,
  type AcreditacionViewState,
} from './acreditacionView';
import {
  renderEstatusView,
  type EstatusViewState,
} from './estatusView';
import {
  renderTipoAuditoriaView,
  type TipoAuditoriaViewState,
} from './tipoAuditoriaView';
import {
  renderMetodologiaAuditoriaView,
  type MetodologiaAuditoriaViewState,
} from './metodologiaAuditoriaView';

// Backward-compatible type aliases for existing codebase imports
export interface StandardRecord {
  id: string;
  esquema: string;
  norma: string;
  codigo?: string;
  titulo?: string;
  estatus?: 'Vigente' | 'En Revisión' | 'Obsoleta' | string;
  fecha_publicacion?: string;
  clausulas_count?: number;
  acreditaciones_count?: number;
}

export interface RequirementRecord {
  id: string;
  codigo: string;
  ruta_materializada: string;
  norma: string;
  titulo?: string;
  descripcion?: string;
  id_norma?: string;
}

export interface IafRecord {
  id: string;
  sector: number;
  descripcion: string;
  subsectores_count?: number;
  auditores_count?: number;
}

export interface CatalogItem {
  categoria: string;
  valor: string;
  descripcion?: string;
}

export interface ExtraViewState {
  activeSubSection: string;
  standards: StandardRecord[];
  requirements: RequirementRecord[];
  iafSectors: IafRecord[];
  catalogs: CatalogItem[];
  loading: boolean;
  organismos?: OrganismoAcreditacion[];
  accreditations?: AcreditacionDetailEntity[];
  // Deep navigation sub-states
  normaState?: Partial<NormaViewState>;
  iafState?: Partial<SectorIafViewState>;
  acreditacionState?: Partial<AcreditacionViewState>;
  estatusState?: Partial<EstatusViewState>;
  tipoState?: Partial<TipoAuditoriaViewState>;
  metodologiaState?: Partial<MetodologiaAuditoriaViewState>;
}

export function renderExtraView(
  profile: UserProfile,
  state: ExtraViewState
): string {
  const activeSub = (state.activeSubSection || 'standards').toLowerCase();

  // Map standards to NormaEntity
  const mappedNormas: NormaEntity[] = (state.standards && state.standards.length > 0)
    ? state.standards.map((s, idx) => {
        const fallback = INITIAL_NORMAS[idx % INITIAL_NORMAS.length];
        return {
          id: s.id || fallback.id,
          codigo: s.codigo || s.norma || fallback.codigo,
          titulo: s.titulo || (fallback.codigo === s.norma ? fallback.titulo : `Sistema de Gestión — ${s.esquema}`),
          estatus: (s.estatus as 'Vigente' | 'En Revisión' | 'Obsoleta') || fallback.estatus || 'Vigente',
          esquema: s.esquema || fallback.esquema,
          fecha_publicacion: s.fecha_publicacion || fallback.fecha_publicacion || '2015-09-15',
          norma: s.norma || fallback.norma,
          clausulas_count: s.clausulas_count || fallback.clausulas_count || 7,
          acreditaciones_count: s.acreditaciones_count || fallback.acreditaciones_count || 1,
        };
      })
    : [...INITIAL_NORMAS];

  // Map IAF sectors
  const mappedSectores: SectorIafEntity[] = (state.iafSectors && state.iafSectors.length > 0)
    ? state.iafSectors.map((sec, idx) => {
        const fallback = INITIAL_SECTORES_IAF[idx % INITIAL_SECTORES_IAF.length];
        return {
          id: sec.id || fallback.id,
          sector: sec.sector || fallback.sector,
          descripcion: sec.descripcion || fallback.descripcion,
          subsectores_count: sec.subsectores_count ?? (fallback.sector === sec.sector ? fallback.subsectores_count : 1),
          auditores_count: sec.auditores_count ?? (fallback.sector === sec.sector ? fallback.auditores_count : 1),
        };
      })
    : [...INITIAL_SECTORES_IAF];

  // Requisitos mapped
  const mappedRequisitos: RequisitoLtree[] = (state.requirements && state.requirements.length > 0)
    ? state.requirements.map((r, idx) => {
        const fallback = INITIAL_REQUISITOS_LTREE[idx % INITIAL_REQUISITOS_LTREE.length];
        const indent = calculateLtreeIndentation(r.ruta_materializada, r.codigo);
        return {
          id: r.id || fallback.id,
          id_norma: r.id_norma || fallback.id_norma,
          norma_codigo: r.norma || fallback.norma_codigo,
          id_requisito_padre: fallback.id_requisito_padre,
          codigo: r.codigo || fallback.codigo,
          titulo: r.titulo || fallback.titulo || `Cláusula ${r.codigo}`,
          descripcion: r.descripcion || fallback.descripcion || 'Requisito normativo auditable del sistema de gestión.',
          ruta_materializada: r.ruta_materializada || fallback.ruta_materializada || r.codigo,
          nivel: indent.level,
          es_padre: indent.isParent,
        };
      })
    : [...INITIAL_REQUISITOS_LTREE];

  const mappedOrganismos: OrganismoAcreditacion[] =
    state.organismos && state.organismos.length > 0
      ? state.organismos
      : [...INITIAL_ORGANISMOS];

  const mappedAcreditaciones: AcreditacionDetailEntity[] =
    state.accreditations && state.accreditations.length > 0
      ? state.accreditations
      : buildInitialAcreditacionEntities();

  const legacyAcreditaciones =
    state.accreditations && state.accreditations.length > 0
      ? mappedAcreditaciones.map(toLegacyAcreditacionNormaIaf)
      : [...INITIAL_ACREDITACIONES];

  let activeContentHtml = '';

  if (activeSub === 'iaf' || activeSub === 'sector_iaf') {
    const iafState: SectorIafViewState = {
      selectedSectorId: state.iafState?.selectedSectorId || null,
      activeChildTab: state.iafState?.activeChildTab || 'subsectores',
      query: state.iafState?.query || '',
      selectedRisk: state.iafState?.selectedRisk || 'ALL',
      viewMode: state.iafState?.viewMode || 'grid',
      sortColumn: state.iafState?.sortColumn || null,
      sortDirection: state.iafState?.sortDirection || 'none',
      isAddSubsectorModalOpen: Boolean(state.iafState?.isAddSubsectorModalOpen),
      isSidebarOpen: state.iafState?.isSidebarOpen ?? true,
      facetSelections: state.iafState?.facetSelections,
    };

    activeContentHtml = renderSectorIafView({
      profile,
      state: iafState,
      sectores: mappedSectores,
      subsectores: INITIAL_SUBSECTORES_IAF,
      loading: state.loading,
    });
  } else if (
    activeSub === 'accreditations' ||
    activeSub === 'acreditacion' ||
    activeSub === 'acreditaciones'
  ) {
    const acredState: AcreditacionViewState = {
      selectedAccreditationId: state.acreditacionState?.selectedAccreditationId || null,
      query: state.acreditacionState?.query || '',
      viewMode: state.acreditacionState?.viewMode || 'grid',
      sortColumn: state.acreditacionState?.sortColumn || null,
      sortDirection: state.acreditacionState?.sortDirection || 'none',
      isSidebarOpen: state.acreditacionState?.isSidebarOpen ?? true,
      facetSelections: state.acreditacionState?.facetSelections,
      isCreating: Boolean(state.acreditacionState?.isCreating),
      createErrorMessage: state.acreditacionState?.createErrorMessage ?? null,
      createSuccessMessage: state.acreditacionState?.createSuccessMessage ?? null,
      organismoMode: state.acreditacionState?.organismoMode || 'existing',
    };

    activeContentHtml = renderAcreditacionView({
      profile,
      state: acredState,
      acreditaciones: mappedAcreditaciones,
      organismos: mappedOrganismos,
      normas: mappedNormas,
      sectores: mappedSectores,
      loading: state.loading,
    });
  } else if (activeSub === 'estatus') {
    const estatusState: EstatusViewState = {
      selectedEstatusId: state.estatusState?.selectedEstatusId || null,
      query: state.estatusState?.query || '',
      selectedCategory: state.estatusState?.selectedCategory || 'ALL',
      viewMode: state.estatusState?.viewMode || 'grid',
      sortColumn: state.estatusState?.sortColumn || null,
      sortDirection: state.estatusState?.sortDirection || 'none',
      isSidebarOpen: state.estatusState?.isSidebarOpen ?? true,
      facetSelections: state.estatusState?.facetSelections,
    };

    activeContentHtml = renderEstatusView({
      profile,
      state: estatusState,
      estatusList: INITIAL_ESTATUS_CATALOG,
      loading: state.loading,
    });
  } else if (activeSub === 'tipos' || activeSub === 'tipo') {
    const tipoState: TipoAuditoriaViewState = {
      selectedTipoId: state.tipoState?.selectedTipoId || null,
      query: state.tipoState?.query || '',
      selectedCycle: state.tipoState?.selectedCycle || 'ALL',
      viewMode: state.tipoState?.viewMode || 'grid',
      sortColumn: state.tipoState?.sortColumn || null,
      sortDirection: state.tipoState?.sortDirection || 'none',
      isSidebarOpen: state.tipoState?.isSidebarOpen ?? true,
      facetSelections: state.tipoState?.facetSelections,
    };

    activeContentHtml = renderTipoAuditoriaView({
      profile,
      state: tipoState,
      tiposList: INITIAL_TIPOS_AUDITORIA_CATALOG,
      loading: state.loading,
    });
  } else if (activeSub === 'metodologias' || activeSub === 'metodologia') {
    const metState: MetodologiaAuditoriaViewState = {
      selectedMetodologiaId: state.metodologiaState?.selectedMetodologiaId || null,
      query: state.metodologiaState?.query || '',
      viewMode: state.metodologiaState?.viewMode || 'grid',
      sortColumn: state.metodologiaState?.sortColumn || null,
      sortDirection: state.metodologiaState?.sortDirection || 'none',
      isSidebarOpen: state.metodologiaState?.isSidebarOpen ?? true,
      facetSelections: state.metodologiaState?.facetSelections,
    };

    activeContentHtml = renderMetodologiaAuditoriaView({
      profile,
      state: metState,
      metodologiasList: INITIAL_METODOLOGIAS_CATALOG,
      loading: state.loading,
    });
  } else {
    // 'standards' (and graceful fallback for retired 'requirements' / 'catalogs')
    const normaState: NormaViewState = {
      selectedNormaId: state.normaState?.selectedNormaId || null,
      activeChildTab: state.normaState?.activeChildTab || 'acreditacion',
      query: state.normaState?.query || '',
      selectedStatus: state.normaState?.selectedStatus || 'ALL',
      selectedScheme: state.normaState?.selectedScheme || 'ALL',
      viewMode: state.normaState?.viewMode || 'grid',
      sortColumn: state.normaState?.sortColumn || null,
      sortDirection: state.normaState?.sortDirection || 'none',
      isAddAccreditationModalOpen: Boolean(state.normaState?.isAddAccreditationModalOpen),
      inspectingClauseId: state.normaState?.inspectingClauseId || null,
      isSidebarOpen: state.normaState?.isSidebarOpen ?? true,
      facetSelections: state.normaState?.facetSelections,
    };

    activeContentHtml = renderNormaView({
      profile,
      state: normaState,
      normas: mappedNormas,
      acreditaciones: legacyAcreditaciones,
      organismos: mappedOrganismos,
      requisitos: mappedRequisitos,
      sectores: mappedSectores,
      loading: state.loading,
    });
  }

  return `
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3 pb-8 space-y-5">
      <div id="extraActiveViewContainer">
        ${activeContentHtml}
      </div>
    </main>
  `;
}
