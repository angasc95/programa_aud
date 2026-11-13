import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  countDistinctQualifiedSectors,
  countDistinctQualifiedSubsectors,
  getAuditRoleVisual,
  getCredentialValidityState,
  getQualificationStatusVisual,
  type AuditorChildTab,
  type AuditorDetailEntity,
  type AuditorViewState,
  type CompetenciaAuditorEntity,
  type AuditoriaRealizadaEntity,
} from '../lib/competencyMatrix';
import {
  computeReactiveFacetCounts,
  filterRecordsWithFacets,
  sortItems,
  type ColumnDefinition,
  type MultiViewFacetCategory,
  type MultiViewSelectionMap,
} from '../lib/universalTemplate';
import { renderUniversalTemplate } from './universalTemplate';
import {
  renderDetailPageTemplate,
  type DetailParentChip,
} from './detailTemplate';

export type { AuditorViewState, AuditorChildTab };

export interface AuditorViewProps {
  profile: UserProfile;
  state: AuditorViewState;
  auditors: AuditorDetailEntity[];
  loading?: boolean;
}

export function renderAuditorView(props: AuditorViewProps): string {
  const { profile, state, auditors, loading = false } = props;

  if (state.selectedAuditorId) {
    const selectedAuditor = auditors.find((a) => a.id === state.selectedAuditorId);
    if (selectedAuditor) {
      return renderAuditorDetailPage(profile, state, selectedAuditor);
    }
  }

  return renderAuditorDirectory(profile, state, auditors, loading);
}

function renderCreateAuditorForm(errorMessage?: string | null): string {
  return `
    <div class="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-slate-900">Registrar Nuevo Auditor en el Cuerpo Evaluador</h2>
        <button
          type="button"
          data-action="close-create-auditor"
          class="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          ✕ Cancelar
        </button>
      </div>
      ${
        errorMessage
          ? `<div class="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-800">${escapeHtml(errorMessage)}</div>`
          : ''
      }
      <form id="createAuditorForm" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createAuditorNombreInput" class="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
            <input id="createAuditorNombreInput" type="text" required placeholder="Ej. Ing. Elena Mendoza" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createAuditorTituloInput" class="block text-xs font-semibold text-slate-700 mb-1">Título Profesional *</label>
            <input id="createAuditorTituloInput" type="text" required placeholder="Ingeniera Industrial · Esp. SGC" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createAuditorCredencialInput" class="block text-xs font-semibold text-slate-700 mb-1">Código de Credencial *</label>
            <input id="createAuditorCredencialInput" type="text" required placeholder="Ej. AUD-2025-099" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createAuditorEmailInput" class="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
            <input id="createAuditorEmailInput" type="email" required placeholder="emendoza@fondonorma.org.ve" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createAuditorTelefonoInput" class="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
            <input id="createAuditorTelefonoInput" type="text" placeholder="+58 414 555 0199" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createAuditorCalificacionSelect" class="block text-xs font-semibold text-slate-700 mb-1">Calificación *</label>
            <select id="createAuditorCalificacionSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="Calificado">Calificado</option>
              <option value="En Entrenamiento">En Entrenamiento</option>
              <option value="Observador">Observador</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="createAuditorNormasInput" class="block text-xs font-semibold text-slate-700 mb-1">Normas Acreditadas (separadas por coma)</label>
            <input id="createAuditorNormasInput" type="text" value="ISO 9001:2015" placeholder="ISO 9001:2015, ISO 14001:2015" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createAuditorSectoresInput" class="block text-xs font-semibold text-slate-700 mb-1">Sectores IAF (números separados por coma)</label>
            <input id="createAuditorSectoresInput" type="text" value="17" placeholder="17, 18" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            data-action="close-create-auditor"
            class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Guardar Auditor
          </button>
        </div>
      </form>
    </div>
  `;
}

function getAuditorValidityStates(auditor: AuditorDetailEntity): string[] {
  if (!auditor.competencias || auditor.competencias.length === 0) {
    return ['Vigente'];
  }
  const states = new Set<string>();
  for (const comp of auditor.competencias) {
    states.add(getCredentialValidityState(comp.fecha_vencimiento));
  }
  return Array.from(states);
}

/**
 * Renders the Universal Multi View Directory for Auditores
 */
function renderAuditorDirectory(
  profile: UserProfile,
  state: AuditorViewState,
  allAuditors: AuditorDetailEntity[],
  loading: boolean
): string {
  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');

  const uniqueNormas = Array.from(
    new Set(allAuditors.flatMap((a) => a.normas_acreditadas))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const uniqueSectors = Array.from(
    new Set(allAuditors.flatMap((a) => a.sectores_iaf))
  ).sort((a, b) => a - b);

  const facetCategories: MultiViewFacetCategory<AuditorDetailEntity>[] = [
    {
      id: 'norma',
      label: 'Norma Calificada',
      options: uniqueNormas.map((n) => ({ value: n, label: n })),
      extractValues: (aud) => aud.normas_acreditadas,
    },
    {
      id: 'sector_iaf',
      label: 'Sector IAF',
      options: uniqueSectors.map((s) => ({ value: String(s), label: `Sector IAF ${s}` })),
      extractValues: (aud) => aud.sectores_iaf.map((s) => String(s)),
    },
    {
      id: 'vigencia',
      label: 'Vigencia de Credenciales',
      options: [
        { value: 'Vigente', label: 'Vigente' },
        { value: 'Por Vencer', label: 'Por Vencer' },
        { value: 'Vencido', label: 'Vencido' },
      ],
      extractValues: (aud) => getAuditorValidityStates(aud),
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        norma:
          state.selectedStandard !== 'ALL' ? new Set([state.selectedStandard]) : new Set<string>(),
        sector_iaf:
          state.selectedSectorIaf !== 'ALL'
            ? new Set([state.selectedSectorIaf])
            : new Set<string>(),
        vigencia: new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (aud: AuditorDetailEntity) =>
      [
        aud.nombre,
        aud.codigo_credencial,
        aud.email,
        aud.titulo_profesional,
        aud.categoria_profesional,
        aud.calificacion,
        aud.normas_acreditadas.join(' '),
        aud.sectores_iaf.map((s) => `Sector ${s}`).join(' '),
      ].join(' '),
  };

  let filtered = filterRecordsWithFacets(
    allAuditors,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  if (!state.facetSelections && state.selectedCalificacion !== 'ALL') {
    filtered = filtered.filter((a) => a.calificacion === state.selectedCalificacion);
  }

  const sorted = sortItems(filtered, state.sortColumn, state.sortDirection, (aud, col) => {
    switch (col) {
      case 'nombre':
        return aud.nombre;
      case 'codigo_credencial':
        return aud.codigo_credencial;
      case 'calificacion':
        return aud.calificacion;
      case 'normas':
        return aud.normas_acreditadas.length;
      case 'sectores':
        return aud.sectores_iaf.length;
      default:
        return '';
    }
  });

  const facetGroups = computeReactiveFacetCounts(
    allAuditors,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<AuditorDetailEntity>[] = [
    {
      id: 'nombre',
      header: 'Auditor',
      sortable: true,
      renderCell: (auditor) => `
        <button
          type="button"
          data-action="select-auditor"
          data-auditor-id="${escapeHtml(auditor.id)}"
          class="text-left font-bold text-slate-900 hover:text-indigo-700 transition-colors cursor-pointer group"
        >
          <span class="group-hover:underline text-sm font-bold">${escapeHtml(auditor.nombre)}</span>
          <span class="block text-[11px] text-slate-500 font-normal line-clamp-1">${escapeHtml(auditor.titulo_profesional)}</span>
        </button>
      `,
    },
    {
      id: 'codigo_credencial',
      header: 'Credencial',
      sortable: true,
      renderCell: (auditor) => `
        <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
          ${escapeHtml(auditor.codigo_credencial)}
        </span>
      `,
    },
    {
      id: 'calificacion',
      header: 'Calificación',
      sortable: true,
      align: 'center',
      renderCell: (auditor) => {
        const statusVisual = getQualificationStatusVisual(auditor.calificacion);
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${statusVisual.badgeClass}">
            <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
            <span>${escapeHtml(statusVisual.label)}</span>
          </span>
        `;
      },
    },
    {
      id: 'normas',
      header: 'Normas Acreditadas',
      sortable: true,
      renderCell: (auditor) => `
        <div class="flex flex-wrap gap-1 max-w-xs">
          ${auditor.normas_acreditadas
            .map(
              (n) => `
                <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                  ${escapeHtml(n)}
                </span>
              `
            )
            .join('')}
        </div>
      `,
    },
    {
      id: 'sectores',
      header: 'Sectores IAF',
      sortable: true,
      align: 'center',
      renderCell: (auditor) => {
        const distinctSectors = countDistinctQualifiedSectors(auditor.competencias);
        return `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold whitespace-nowrap">
            <span>🏭</span>
            <span>${distinctSectors} sectores</span>
          </span>
        `;
      },
    },
    {
      id: 'contacto',
      header: 'Contacto',
      sortable: false,
      align: 'right',
      renderCell: (auditor) => `
        <div class="font-mono text-[11px] text-slate-600 whitespace-nowrap">${escapeHtml(auditor.email)}</div>
        <div class="font-mono text-[11px] text-slate-400 whitespace-nowrap">${escapeHtml(auditor.telefono)}</div>
      `,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      sortable: false,
      align: 'center',
      renderCell: (auditor) => `
        <button
          type="button"
          data-action="select-auditor"
          data-auditor-id="${escapeHtml(auditor.id)}"
          class="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <span>Ver Ficha</span>
          <span>→</span>
        </button>
      `,
    },
  ];

  const renderCard = (auditor: AuditorDetailEntity): string => {
    const statusVisual = getQualificationStatusVisual(auditor.calificacion);
    const distinctSectors = countDistinctQualifiedSectors(auditor.competencias);
    const distinctSubsectors = countDistinctQualifiedSubsectors(auditor.competencias);

    return `
      <div
        data-action="select-auditor"
        data-auditor-id="${escapeHtml(auditor.id)}"
        class="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 flex-1 min-w-0">
              <span class="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                🪪 ${escapeHtml(auditor.codigo_credencial)}
              </span>
              <h3 class="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                ${escapeHtml(auditor.nombre)}
              </h3>
              <p class="text-xs text-slate-500 line-clamp-1">
                ${escapeHtml(auditor.titulo_profesional)}
              </p>
            </div>

            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${statusVisual.badgeClass}">
              <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
              <span>${escapeHtml(statusVisual.label)}</span>
            </span>
          </div>
        </div>

        <div class="text-xs text-slate-600 bg-slate-50/75 p-3 rounded-lg border border-slate-100 space-y-2">
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Normas Acreditadas:</span>
            <div class="flex flex-wrap gap-1">
              ${auditor.normas_acreditadas
                .map(
                  (n) => `
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-800 border border-slate-200">
                      📘 ${escapeHtml(n)}
                    </span>
                  `
                )
                .join('')}
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-slate-200/50">
            <span class="text-slate-500 text-[11px]">Sectores IAF Calificados:</span>
            <span class="font-medium text-slate-800 inline-flex items-center gap-1">
              <span>🏭</span>
              <span>${distinctSectors} sectores (${distinctSubsectors} subsectores)</span>
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span class="font-mono text-[11px] truncate max-w-[180px]">✉️ ${escapeHtml(auditor.email)}</span>
          <span class="font-semibold text-indigo-700 group-hover:text-indigo-900 inline-flex items-center gap-1">
            <span>Ver Ficha</span>
            <span>→</span>
          </span>
        </div>
      </div>
    `;
  };

  const actionsHtml = isStaff
    ? `
      <button
        type="button"
        data-action="open-create-auditor"
        class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
      >
        <span aria-hidden="true">+</span>
        <span>Nuevo Auditor</span>
      </button>
    `
    : '';

  const inlineFormHtml =
    isStaff && state.isCreating ? renderCreateAuditorForm(state.createErrorMessage) : '';

  return renderUniversalTemplate<AuditorDetailEntity>({
    domainKey: 'auditores',
    title: 'Equipo de Auditores',
    subtitle:
      'Cuerpo de evaluadores técnicos calificados bajo ISO/IEC 17021-1:2015 cláusula 7.2 e ISO 19011:2018',
    entityLabel: 'auditores registrados',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar por nombre, credencial, email o especialidad... (Presione "/" para enfocar)',
    searchInputId: 'auditorDirectorySearchInput',
    clearSearchBtnId: 'clearAuditorSearchBtn',
    totalCount: allAuditors.length,
    filteredCount: sorted.length,
    viewMode: state.viewMode,
    isSidebarOpen: state.isSidebarOpen ?? true,
    sortState: {
      column: state.sortColumn,
      direction: state.sortDirection,
    },
    facetGroups,
    items: sorted,
    columns,
    renderCard,
    emptyStateTitle: 'No se encontraron auditores',
    emptyStateMessage:
      'No hay evaluadores que coincidan con el término de búsqueda o las facetas seleccionadas.',
    actionsHtml,
    inlineFormHtml,
    loading,
    loadingMessage: 'Cargando cuerpo de auditores y competencias...',
  });
}

/**
 * Standardized 3-Zone Detail Page Architecture & Competency Matrix
 */
function renderAuditorDetailPage(
  profile: UserProfile,
  state: AuditorViewState,
  auditor: AuditorDetailEntity
): string {
  const activeTab: AuditorChildTab = state.activeChildTab || 'competencias';
  const statusVisual = getQualificationStatusVisual(auditor.calificacion);
  const isStaff =
    profile.status === 'APPROVED' &&
    (profile.role === 'ADMIN' || profile.role === 'WORKER');
  const isEditing = isStaff && state.isEditingAttributes;

  const currentBio = isEditing
    ? state.editFormData?.biografia ?? auditor.biografia
    : auditor.biografia;

  const parents: DetailParentChip[] = [
    {
      label: 'Registro',
      value: auditor.instituto_registro,
      symbol: '🏛️',
    },
    {
      label: 'Categoría',
      value: auditor.categoria_profesional,
      symbol: '★',
    },
    ...(auditor.normas_acreditadas.length > 0
      ? [
          {
            label: 'Normas Calificadas',
            value: auditor.normas_acreditadas.join(', '),
            symbol: '📘',
          },
        ]
      : []),
  ];

  const recordActionsHtml = isStaff
    ? !isEditing
      ? `
        <button
          type="button"
          id="startEditAuditorBtn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <span aria-hidden="true">✏️</span>
          <span>Editar</span>
        </button>
      `
      : `
        <button
          type="button"
          id="cancelEditAuditorBtn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
        >
          <span>✕</span>
          <span>Cancelar Edición</span>
        </button>
      `
    : '';

  const feedbackHtml = `
    ${
      state.editErrorMessage
        ? `
      <div class="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
        ⚠️ ${escapeHtml(state.editErrorMessage)}
      </div>
    `
        : ''
    }
    ${
      state.saveSuccessMessage
        ? `
      <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
        ✓ ${escapeHtml(state.saveSuccessMessage)}
      </div>
    `
        : ''
    }
  `;

  const customRecordBodyHtml = !isEditing
    ? `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Código de Credencial</span>
          <p class="font-mono text-xs font-bold text-slate-900">${escapeHtml(auditor.codigo_credencial)}</p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Correo Electrónico</span>
          <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(auditor.email)}</p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Teléfono de Contacto</span>
          <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(auditor.telefono)}</p>
        </div>

        <div class="col-span-1 md:col-span-3 p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">
            Biografía y Resumen Profesional (ISO 19011:2018)
          </span>
          <p class="text-xs text-slate-800 leading-relaxed font-sans bg-white p-3.5 rounded border border-slate-200/80">
            ${escapeHtml(auditor.biografia || 'Sin biografía registrada.')}
          </p>
        </div>
      </div>
    `
    : `
      <form id="editAuditorForm" class="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-1">
            <label for="editAuditorTitulo" class="text-xs font-bold text-slate-700">Título Profesional *</label>
            <input
              type="text"
              id="editAuditorTitulo"
              name="titulo_profesional"
              value="${escapeHtml(state.editFormData?.titulo_profesional || auditor.titulo_profesional)}"
              required
              class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <div class="space-y-1">
            <label for="editAuditorEmail" class="text-xs font-bold text-slate-700">Correo Electrónico *</label>
            <input
              type="email"
              id="editAuditorEmail"
              name="email"
              value="${escapeHtml(state.editFormData?.email || auditor.email)}"
              required
              class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <div class="space-y-1">
            <label for="editAuditorTelefono" class="text-xs font-bold text-slate-700">Teléfono *</label>
            <input
              type="text"
              id="editAuditorTelefono"
              name="telefono"
              value="${escapeHtml(state.editFormData?.telefono || auditor.telefono)}"
              required
              class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="editAuditorBio" class="text-xs font-bold text-slate-700">
            Biografía y Resumen Profesional
          </label>
          <textarea
            id="editAuditorBio"
            name="biografia"
            rows="3"
            class="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-sans focus:ring-2 focus:ring-slate-900 focus:outline-none leading-relaxed"
          >${escapeHtml(currentBio)}</textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            id="cancelEditAuditorBtnSecondary"
            class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            💾 Guardar Cambios
          </button>
        </div>
      </form>
    `;

  return renderDetailPageTemplate({
    entityType: 'Auditor Calificado',
    entitySymbol: '🪪',
    title: auditor.nombre,
    eyebrowCode: auditor.codigo_credencial,
    subtitle: `${auditor.titulo_profesional} · ${auditor.instituto_registro}`,
    statusBadge: {
      label: statusVisual.label,
      badgeClass: statusVisual.badgeClass,
      dotClass: statusVisual.dotClass,
    },
    secondaryHeaderBadge: {
      label: auditor.categoria_profesional,
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    backButton: {
      label: 'Volver a Auditores',
      nav: 'certificacion',
      subview: 'auditors',
      action: 'back-to-auditor-list',
    },
    parents,
    tableName: 'auditor',
    recordId: auditor.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml,
    childTabs: [
      {
        id: 'competencias',
        label: 'Competencias',
        symbol: '🛡️',
        count: auditor.competencias.length,
      },
      {
        id: 'historial',
        label: 'Historial de Auditorías',
        symbol: '📋',
        count: auditor.historialAuditorias.length,
      },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-auditor-tab',
    renderChildTabContent: (tabId) =>
      tabId === 'competencias'
        ? renderCompetenciasChildTab(auditor.competencias, profile.role === 'ADMIN')
        : renderHistorialChildTab(auditor.historialAuditorias),
  });
}

/**
 * TAB 1: Matriz de Competencias Normativas y de Sector (public.competencia_auditor)
 */
function renderCompetenciasChildTab(
  competencies: CompetenciaAuditorEntity[],
  isAdmin: boolean
): string {
  if (competencies.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <span class="text-2xl block">🛡️</span>
        <p class="font-bold text-slate-800">Sin competencias técnicas registradas</p>
        <p class="text-slate-500">Este auditor aún no cuenta con cualificaciones vinculadas bajo ISO 17021-1.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Alcance normativo y sectorial calificado bajo ISO/IEC 17021-1:</span>
        ${
          isAdmin
            ? `
          <button
            type="button"
            data-action="open-add-competency-modal"
            class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <span>+</span>
            <span>Asignar Nueva Competencia</span>
          </button>
        `
            : ''
        }
      </div>

      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <th scope="col" class="py-3 px-4">Norma de Gestión</th>
                <th scope="col" class="py-3 px-4">Sector Técnico IAF</th>
                <th scope="col" class="py-3 px-4">Sub-Sector Técnico</th>
                <th scope="col" class="py-3 px-4 text-center">Rol Calificado</th>
                <th scope="col" class="py-3 px-4 text-center">Vigencia Credencial</th>
                <th scope="col" class="py-3 px-4 text-right">N° Folio</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${competencies
                .map((comp) => {
                  const roleVisual = getAuditRoleVisual(comp.rol_calificado);
                  const validityState = getCredentialValidityState(comp.fecha_vencimiento);

                  let validityBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (validityState === 'Por Vencer') {
                    validityBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else if (validityState === 'Vencido') {
                    validityBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                  }

                  return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="view-norma-from-auditor"
                        data-norma-code="${escapeHtml(comp.norma_codigo)}"
                        class="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 hover:underline font-bold cursor-pointer"
                      >
                        <span aria-hidden="true">📘</span>
                        <span>${escapeHtml(comp.norma_codigo)}</span>
                      </button>
                    </td>

                    <td class="py-3.5 px-4">
                      <button
                        type="button"
                        data-action="view-iaf-from-auditor"
                        data-sector-number="${comp.sector_iaf_numero}"
                        class="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                      >
                        <span aria-hidden="true">🏭</span>
                        <span>Sector ${comp.sector_iaf_numero}</span>
                      </button>
                      <p class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(comp.sector_iaf_descripcion)}</p>
                    </td>

                    <td class="py-3.5 px-4">
                      ${
                        comp.subsector_iaf_codigo
                          ? `
                        <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          ${escapeHtml(comp.subsector_iaf_codigo)}
                        </span>
                        <span class="text-slate-700 text-xs ml-1">${escapeHtml(comp.subsector_iaf_descripcion || '')}</span>
                      `
                          : '<span class="text-slate-400 italic">Sector completo</span>'
                      }
                    </td>

                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleVisual.badgeClass}">
                        <span>${roleVisual.icon}</span>
                        <span>${escapeHtml(roleVisual.label)}</span>
                      </span>
                    </td>

                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${validityBadgeClass}">
                        <span>${validityState === 'Vencido' ? '⚠️' : '✓'}</span>
                        <span>${escapeHtml(comp.fecha_vencimiento)} (${validityState})</span>
                      </span>
                    </td>

                    <td class="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                      ${escapeHtml(comp.numero_registro || '—')}
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
}

/**
 * TAB 2: Historial de Auditorías Realizadas (public.auditoria)
 */
function renderHistorialChildTab(historial: AuditoriaRealizadaEntity[]): string {
  if (historial.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <span class="text-2xl block">📋</span>
        <p class="font-bold text-slate-800">Sin historial de auditorías ejecutadas</p>
        <p class="text-slate-500">Este auditor aún no ha participado en jornadas de auditoría registradas en el sistema.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Código Auditoría</th>
              <th scope="col" class="py-3 px-4">Organización Cliente</th>
              <th scope="col" class="py-3 px-4">Certificado Vinculado</th>
              <th scope="col" class="py-3 px-4">Modalidad</th>
              <th scope="col" class="py-3 px-4">Rol en Jornada</th>
              <th scope="col" class="py-3 px-4">Fecha Ejecución</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${historial
              .map((aud) => {
                const isCompleted = aud.estatus === 'Completada' || aud.estatus === 'Cerrada';
                return `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <button
                      type="button"
                      data-action="select-prog-audit-by-code"
                      data-audit-code="${escapeHtml(aud.codigo_auditoria)}"
                      class="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 hover:underline font-mono font-bold cursor-pointer"
                    >
                      <span aria-hidden="true">📋</span>
                      <span>${escapeHtml(aud.codigo_auditoria)}</span>
                    </button>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-800">
                    🏢 ${escapeHtml(aud.organizacion_nombre)}
                  </td>
                  <td class="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                    📜 ${escapeHtml(aud.numero_certificado)}
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      ${escapeHtml(aud.tipo_auditoria)} (${escapeHtml(aud.metodologia)})
                    </span>
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap font-medium text-indigo-700">
                    ★ ${escapeHtml(aud.rol_en_auditoria)}
                  </td>
                  <td class="py-3.5 px-4 font-mono text-[11px] text-slate-700 tabular-nums whitespace-nowrap">
                    ${escapeHtml(aud.fecha_ejecucion)}
                  </td>
                  <td class="py-3.5 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }">
                      <span>${isCompleted ? '✓' : '🕒'}</span>
                      <span>${escapeHtml(aud.estatus)}</span>
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
  `;
}
