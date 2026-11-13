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
  type RequisitoLtree,
  type SectorIafEntity,
} from '../lib/extraDomain';
import {
  renderNormaView,
  type NormaViewState,
} from './normaView';
import {
  renderSectorIafView,
  type SectorIafViewState,
} from './sectorIafView';
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
  // Deep navigation sub-states
  normaState?: Partial<NormaViewState>;
  iafState?: Partial<SectorIafViewState>;
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
    activeContentHtml = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span aria-hidden="true">🏅</span>
              <span>Organismos y Alcances de Acreditación</span>
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Catálogo de acreditaciones vigentes por organismo acreditador, norma ISO y sector técnico IAF.
            </p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200 self-start sm:self-auto">
            ${INITIAL_ACREDITACIONES.length} Acreditaciones · ${INITIAL_ORGANISMOS.length} Organismos
          </span>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th class="py-3 px-4">Organismo</th>
                  <th class="py-3 px-4">N° Acreditación</th>
                  <th class="py-3 px-4">Norma</th>
                  <th class="py-3 px-4">Concesión</th>
                  <th class="py-3 px-4">Estatus</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${INITIAL_ACREDITACIONES.map(
                  (acr) => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4 font-semibold text-slate-900">
                      <span>${escapeHtml(acr.organismo_codigo)}</span>
                      <span class="text-slate-500 font-normal"> · ${escapeHtml(acr.organismo_nombre)}</span>
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-700">${escapeHtml(acr.numero_acreditacion)}</td>
                    <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(acr.norma_codigo)}</td>
                    <td class="py-3 px-4 font-mono text-slate-600">${escapeHtml(acr.fecha_concesion)}</td>
                    <td class="py-3 px-4">
                      <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        acr.estatus === 'Activa'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : acr.estatus === 'En Renovación'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }">
                        ${escapeHtml(acr.estatus)}
                      </span>
                    </td>
                  </tr>
                `
                ).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'estatus') {
    const estatusState: EstatusViewState = {
      selectedEstatusId: state.estatusState?.selectedEstatusId || null,
      query: state.estatusState?.query || '',
      selectedCategory: state.estatusState?.selectedCategory || 'ALL',
      viewMode: state.estatusState?.viewMode || 'grid',
      sortColumn: state.estatusState?.sortColumn || null,
      sortDirection: state.estatusState?.sortDirection || 'none',
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
    };

    activeContentHtml = renderNormaView({
      profile,
      state: normaState,
      normas: mappedNormas,
      acreditaciones: INITIAL_ACREDITACIONES,
      organismos: INITIAL_ORGANISMOS,
      requisitos: mappedRequisitos,
      sectores: mappedSectores,
      loading: state.loading,
    });
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3 pb-8 space-y-5">
      <div id="extraActiveViewContainer">
        ${activeContentHtml}
      </div>
    </main>
  `;
}
