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
  type AcreditacionNormaIaf,
  type OrganismoAcreditacion,
  type RequisitoLtree,
  type SectorIafEntity,
  type SubsectorIafEntity,
  type EstatusCatalogItem,
  type TipoAuditoriaCatalogItem,
  type MetodologiaAuditoriaCatalogItem,
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
  const activeSub = state.activeSubSection || 'standards';

  const subTabs = [
    {
      id: 'standards',
      label: 'Normas ISO',
      symbol: '📘',
      desc: 'Esquemas normativos certificables, acreditaciones y requisitos',
    },
    {
      id: 'iaf',
      label: 'Sectores IAF',
      symbol: '🏭',
      desc: 'Sectores técnicos y sub-sectores de acreditación internacional',
    },
    {
      id: 'estatus',
      label: 'Estatus',
      symbol: '🏷️',
      desc: 'Catálogo de los 8 estatus canónicos del sistema',
    },
    {
      id: 'tipos',
      label: 'Tipos de Auditoría',
      symbol: '📑',
      desc: 'Las 9 modalidades canónicas de ciclos de certificación ISO 17021-1',
    },
    {
      id: 'metodologias',
      label: 'Metodologías',
      symbol: '🌐',
      desc: 'Metodologías de ejecución presencial, remota (IAF MD 4) y mixta',
    },
    {
      id: 'requirements',
      label: 'Requisitos LTREE',
      symbol: '🌳',
      desc: 'Jerarquía de cláusulas normativas con operador de ruta materializada',
    },
    {
      id: 'catalogs',
      label: 'Todos los Catálogos',
      symbol: '📋',
      desc: 'Visor unificado de catálogos maestros y estandarización',
    },
  ];

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

  if (activeSub === 'standards' || activeSub === 'norma' || activeSub === 'normas') {
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
  } else if (activeSub === 'iaf' || activeSub === 'sector_iaf') {
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
  } else if (activeSub === 'requirements') {
    // Requisitos ltree master hierarchy view
    activeContentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-1">
                <span>🌳</span>
                <span>POSTGRESQL LTREE REQUISITOS</span>
              </div>
              <h3 class="text-base font-bold text-slate-900">Estructura Jerárquica de Requisitos Normativos</h3>
              <p class="text-xs text-slate-500">Árbol de cláusulas con rutas materializadas y propagación de cobertura de auditoría</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              ${mappedRequisitos.length} Cláusulas Indexadas
            </span>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th class="py-3 px-4">Cláusula</th>
                  <th class="py-3 px-4">Título del Requisito</th>
                  <th class="py-3 px-4">Ruta Materializada (ltree)</th>
                  <th class="py-3 px-4">Norma Asociada</th>
                  <th class="py-3 px-4 text-center">Nivel Jerárquico</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${mappedRequisitos
                  .map((req) => {
                    const indent = calculateLtreeIndentation(req.ruta_materializada, req.codigo);
                    const isParent = indent.isParent;
                    return `
                      <tr class="hover:bg-slate-50/80 transition-colors ${isParent ? 'bg-slate-50/40' : ''}">
                        <td class="py-3 px-4 font-mono font-bold ${isParent ? 'text-slate-900 text-sm' : 'text-slate-700'}" style="padding-left: ${Math.max(16, 16 + indent.indentPx)}px;">
                          ${escapeHtml(req.codigo)}
                        </td>
                        <td class="py-3 px-4 font-medium text-slate-900">
                          ${escapeHtml(req.titulo || req.codigo)}
                        </td>
                        <td class="py-3 px-4 font-mono text-xs text-indigo-700 font-semibold">
                          ${escapeHtml(req.ruta_materializada)}
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-700">
                          ${escapeHtml(req.norma_codigo)}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isParent
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }">
                            ${isParent ? 'Cláusula Principal' : `Nivel ${indent.level}`}
                          </span>
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
    `;
  } else {
    // catalogs master overview
    activeContentHtml = `
      <div class="space-y-6">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Catálogos Maestros de Referencia</h3>
            <p class="text-xs text-slate-500">Visor unificado de taxonomías normalizadas según directrices ISO/IEC 17021-1 e ISO 19011</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- 8 Canonical Estatus -->
            <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>Estatus Canónicos (8)</span>
                </h4>
                <button type="button" data-nav="extra" data-subview="estatus" class="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                  Explorar →
                </button>
              </div>
              <div class="space-y-1.5">
                ${INITIAL_ESTATUS_CATALOG
                  .map(
                    (e) => `
                    <div class="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200/60">
                      <span class="font-bold text-slate-800">${escapeHtml(e.estatus)}</span>
                      <span class="text-[10px] text-slate-500 font-mono">${e.usage_count} usos</span>
                    </div>
                  `
                  )
                  .join('')}
              </div>
            </div>

            <!-- 9 Canonical Audit Modalities -->
            <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>📑</span>
                  <span>Tipos de Auditoría (9)</span>
                </h4>
                <button type="button" data-nav="extra" data-subview="tipos" class="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                  Explorar →
                </button>
              </div>
              <div class="space-y-1.5">
                ${INITIAL_TIPOS_AUDITORIA_CATALOG
                  .map(
                    (t) => `
                    <div class="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200/60">
                      <span class="font-bold text-slate-800 font-mono">${escapeHtml(t.tipo)}</span>
                      <span class="text-[10px] text-indigo-600 font-semibold">${escapeHtml(t.etapa_ciclo)}</span>
                    </div>
                  `
                  )
                  .join('')}
              </div>
            </div>

            <!-- 3 Canonical Methodologies -->
            <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>Metodologías (3)</span>
                </h4>
                <button type="button" data-nav="extra" data-subview="metodologias" class="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                  Explorar →
                </button>
              </div>
              <div class="space-y-1.5">
                ${INITIAL_METODOLOGIAS_CATALOG
                  .map(
                    (m) => `
                    <div class="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200/60">
                      <span class="font-bold text-slate-800 font-mono">${escapeHtml(m.metodologia)}</span>
                      <span class="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">IAF MD 4</span>
                    </div>
                  `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      <!-- Domain Extra Sub-Navigation Bar -->
      <nav aria-label="Navegación del Dominio Extra" class="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
        <div class="flex flex-wrap items-center gap-1.5">
          ${subTabs
            .map((tab) => {
              const isActive =
                activeSub === tab.id ||
                (tab.id === 'standards' && (activeSub === 'norma' || activeSub === 'normas')) ||
                (tab.id === 'iaf' && activeSub === 'sector_iaf') ||
                (tab.id === 'tipos' && activeSub === 'tipo') ||
                (tab.id === 'metodologias' && activeSub === 'metodologia');

              return `
                <button
                  type="button"
                  data-nav="extra"
                  data-subview="${tab.id}"
                  title="${escapeHtml(tab.desc)}"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }"
                >
                  <span aria-hidden="true">${tab.symbol}</span>
                  <span>${escapeHtml(tab.label)}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </nav>

      <!-- Active Content View -->
      <div id="extraActiveViewContainer">
        ${activeContentHtml}
      </div>
    </main>
  `;
}
