import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { OrganizacionEntity } from '../lib/activeCertificates';
import {
  countMultisiteBranches,
  formatMultisiteBranchCountText,
  sortSitesWithPrincipalFirst,
  getProcessTypeVisual,
  type CertificadoDetailEntity,
  type CertificadoViewState,
  type CertificadoChildTab,
  type SiteEntity,
  type ProcessEntity,
  type ShiftEntity,
  type NonApplicableRequirementEntity,
  type AuditEntity,
} from '../lib/multisiteSampling';
import {
  computeReactiveFacetCounts,
  filterRecordsWithFacets,
  sortItems,
  type ColumnDefinition,
  type MultiViewFacetCategory,
  type MultiViewSelectionMap,
} from '../lib/universalTemplate';
import { renderUniversalTemplate } from './universalTemplate';
import { renderDetailPageTemplate, type DetailParentChip } from './detailTemplate';

export type { CertificadoViewState, CertificadoChildTab };

export interface CertificadoViewProps {
  profile: UserProfile;
  state: CertificadoViewState;
  certificates: CertificadoDetailEntity[];
  organizaciones?: OrganizacionEntity[];
  loading?: boolean;
}

/**
 * Returns canonical operational status styling.
 */
function getStatusBadge(status: string): { label: string; badgeClass: string; dotClass: string } {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'ACTIVO':
    case 'VIGENTE':
      return {
        label: 'ACTIVO',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'ESTUDIO':
    case 'EN_PROCESO':
      return {
        label: 'EN ESTUDIO',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500',
      };
    case 'SUSPENDIDO':
      return {
        label: 'SUSPENDIDO',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'CANCELADO':
    case 'INACTIVO':
      return {
        label: 'CANCELADO',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        dotClass: 'bg-rose-500',
      };
    case 'PLANIFICADO':
    case 'PLANIFICADA':
      return {
        label: 'PLANIFICADO',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dotClass: 'bg-indigo-500',
      };
    case 'EN EJECUCIÓN':
    case 'EN EJECUCION':
      return {
        label: 'EN EJECUCIÓN',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        dotClass: 'bg-teal-500',
      };
    default:
      return {
        label: status || 'DESCONOCIDO',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
  }
}

/**
 * Primary view entry point: Renders either the universal directory or the 4-zone detail page.
 */
export function renderCertificadoView(props: CertificadoViewProps): string {
  const { profile, state, certificates, organizaciones = [], loading = false } = props;

  if (state.selectedCertId) {
    const selectedCert = certificates.find((c) => c.id === state.selectedCertId);
    if (selectedCert) {
      return renderCertificadoDetailPage(profile, state, selectedCert);
    }
  }

  return renderCertificadoDirectory(profile, state, certificates, organizaciones, loading);
}

function renderCreateCertificadoForm(
  certificates: CertificadoDetailEntity[],
  organizaciones: OrganizacionEntity[],
  errorMessage?: string | null
): string {
  const orgOptionEntries =
    organizaciones.length > 0
      ? organizaciones.map((o) => ({ id: o.id, label: `${o.nombre} (${o.rif})` }))
      : Array.from(
          new Map(
            certificates.map((c) => [
              c.id_organizacion,
              `${c.organizacion_nombre} (${c.organizacion_rif})`,
            ])
          ).entries()
        ).map(([id, label]) => ({ id, label }));

  const sectorMap = new Map<number, string>();
  for (const cert of certificates) {
    if (cert.sector_iaf) {
      sectorMap.set(cert.sector_iaf, cert.sector_iaf_descripcion);
    }
  }
  const sectorOptions = Array.from(sectorMap.entries())
    .sort(([a], [b]) => a - b)
    .map(
      ([num, desc]) =>
        `<option value="${num}|${escapeHtml(desc)}">Sector ${num} · ${escapeHtml(desc)}</option>`
    )
    .join('');

  return `
    <div class="bg-sky-50/70 border border-sky-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-slate-900">Emitir / Registrar Certificado de Conformidad</h2>
        <button
          type="button"
          data-action="close-create-cert"
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
      <form id="createCertificadoForm" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createCertOrgSelect" class="block text-xs font-semibold text-slate-700 mb-1">Organización Titular *</label>
            <select id="createCertOrgSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${orgOptionEntries
                .map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label for="createCertNumeroInput" class="block text-xs font-semibold text-slate-700 mb-1">N° de Certificado *</label>
            <input id="createCertNumeroInput" type="text" required placeholder="Ej. FN-QMS-2025-001" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
          <div>
            <label for="createCertNormaSelect" class="block text-xs font-semibold text-slate-700 mb-1">Norma de Gestión *</label>
            <select id="createCertNormaSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="ISO 9001:2015">ISO 9001:2015</option>
              <option value="ISO 14001:2015">ISO 14001:2015</option>
              <option value="ISO 45001:2018">ISO 45001:2018</option>
              <option value="ISO/IEC 27001:2022">ISO/IEC 27001:2022</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label for="createCertEstatusSelect" class="block text-xs font-semibold text-slate-700 mb-1">Estatus Inicial *</label>
            <select id="createCertEstatusSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="Activo">Activo</option>
              <option value="Estudio">Estudio</option>
              <option value="Suspendido">Suspendido</option>
            </select>
          </div>
          <div>
            <label for="createCertSectorSelect" class="block text-xs font-semibold text-slate-700 mb-1">Sector IAF *</label>
            <select id="createCertSectorSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${sectorOptions || '<option value="17|Metales básicos y productos metálicos">Sector 17 · Metales básicos y productos metálicos</option>'}
            </select>
          </div>
          <div>
            <label for="createCertFechaEmisionInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Emisión *</label>
            <input id="createCertFechaEmisionInput" type="date" required value="2025-01-15" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createCertFechaVencimientoInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Vencimiento *</label>
            <input id="createCertFechaVencimientoInput" type="date" required value="2028-01-14" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div class="sm:col-span-3">
            <label for="createCertAlcanceInput" class="block text-xs font-semibold text-slate-700 mb-1">Alcance de Certificación (mín. 10 caracteres) *</label>
            <input id="createCertAlcanceInput" type="text" required minlength="10" placeholder="Diseño, fabricación y comercialización de..." class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <label class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
            <input id="createCertMultisitioCheckbox" type="checkbox" class="h-3.5 w-3.5 rounded border-slate-300 text-sky-600" />
            <span>Esquema Multisitio</span>
          </label>
        </div>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            data-action="close-create-cert"
            class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Guardar Certificado
          </button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Renders the Universal Multi View Directory for Certificados (Decluttered Clean Layout).
 * NOTE: The "Cobertura Normativa" column is strictly excluded from the list view.
 */
function renderCertificadoDirectory(
  profile: UserProfile,
  state: CertificadoViewState,
  allCertificates: CertificadoDetailEntity[],
  organizaciones: OrganizacionEntity[],
  loading: boolean
): string {
  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');

  const sectorMap = new Map<number, string>();
  for (const cert of allCertificates) {
    if (cert.sector_iaf) {
      sectorMap.set(cert.sector_iaf, cert.sector_iaf_descripcion || `Sector ${cert.sector_iaf}`);
    }
  }
  const sectorEntries = Array.from(sectorMap.entries()).sort(([a], [b]) => a - b);

  const facetCategories: MultiViewFacetCategory<CertificadoDetailEntity>[] = [
    {
      id: 'estatus',
      label: 'Estatus',
      extractValues: (c) => c.estatus,
    },
    {
      id: 'norma',
      label: 'Norma ISO',
      extractValues: (c) => c.norma_codigo,
    },
    {
      id: 'sector_iaf',
      label: 'Sector IAF',
      options: sectorEntries.map(([num, desc]) => ({
        value: String(num),
        label: `Sector ${num} · ${desc}`,
      })),
      extractValues: (c) => String(c.sector_iaf),
    },
    {
      id: 'modalidad',
      label: 'Modalidad',
      options: [
        { value: 'MULTISITIO', label: 'Multisitio' },
        { value: 'SEDE_UNICA', label: 'Sede Única' },
      ],
      extractValues: (c) =>
        c.multisitio || countMultisiteBranches(c.sitios) > 0 ? 'MULTISITIO' : 'SEDE_UNICA',
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        estatus:
          state.selectedStatus !== 'ALL' ? new Set([state.selectedStatus]) : new Set<string>(),
        norma:
          state.selectedStandard !== 'ALL' ? new Set([state.selectedStandard]) : new Set<string>(),
        sector_iaf:
          state.selectedSectorIaf !== 'ALL' ? new Set([state.selectedSectorIaf]) : new Set<string>(),
        modalidad: new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (cert: CertificadoDetailEntity) =>
      [
        cert.numero_certificado,
        cert.organizacion_nombre,
        cert.organizacion_rif,
        cert.norma_codigo,
        cert.esquema,
        cert.alcance,
        cert.sector_iaf_descripcion,
      ].join(' '),
  };

  const filtered = filterRecordsWithFacets(
    allCertificates,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const sorted = sortItems(filtered, state.sortColumn, state.sortDirection, (cert, col) => {
    switch (col) {
      case 'numero_certificado':
        return cert.numero_certificado;
      case 'organizacion':
        return cert.organizacion_nombre;
      case 'norma':
        return cert.norma_codigo;
      case 'estatus':
        return cert.estatus;
      case 'vigencia':
        return cert.fecha_vencimiento || '';
      case 'sedes':
        return countMultisiteBranches(cert.sitios);
      default:
        return '';
    }
  });

  const facetGroups = computeReactiveFacetCounts(
    allCertificates,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  // MANDATORY CLEAN LIST RULE:
  // Columns: Organización, Código de Certificado, Norma, Sedes Multisitio, Estatus, Vigencia, Acciones.
  const columns: ColumnDefinition<CertificadoDetailEntity>[] = [
    {
      id: 'organizacion',
      header: 'Organización',
      sortable: true,
      renderCell: (cert) => `
        <button
          type="button"
          data-action="view-org-from-cert"
          data-org-id="${escapeHtml(cert.id_organizacion)}"
          class="text-left font-bold text-slate-900 hover:text-sky-700 transition-colors cursor-pointer group"
        >
          <span class="group-hover:underline">${escapeHtml(cert.organizacion_nombre)}</span>
          <span class="block text-[11px] font-mono text-slate-500 font-normal">RIF: ${escapeHtml(cert.organizacion_rif)}</span>
        </button>
      `,
    },
    {
      id: 'numero_certificado',
      header: 'Código de Certificado',
      sortable: true,
      renderCell: (cert) => `
        <button
          type="button"
          data-action="select-cert"
          data-cert-id="${escapeHtml(cert.id)}"
          class="font-mono text-xs font-bold text-slate-900 bg-slate-100 hover:bg-sky-50 hover:text-sky-900 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          📜 ${escapeHtml(cert.numero_certificado)}
        </button>
      `,
    },
    {
      id: 'norma',
      header: 'Norma',
      sortable: true,
      renderCell: (cert) => `
        <div class="font-semibold text-slate-800 whitespace-nowrap">${escapeHtml(cert.norma_codigo)}</div>
        <div class="text-[11px] text-slate-500">${escapeHtml(cert.esquema)}</div>
      `,
    },
    {
      id: 'sedes',
      header: 'Sedes Multisitio',
      sortable: true,
      align: 'center',
      renderCell: (cert) => {
        const branchCount = countMultisiteBranches(cert.sitios);
        const branchText = formatMultisiteBranchCountText(branchCount);
        return `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
            branchCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
          }">
            <span>${branchCount > 0 ? '🏢' : '📍'}</span>
            <span>${branchText}</span>
          </span>
        `;
      },
    },
    {
      id: 'estatus',
      header: 'Estatus',
      sortable: true,
      align: 'center',
      renderCell: (cert) => {
        const statusVisual = getStatusBadge(cert.estatus);
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${statusVisual.badgeClass}">
            <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
            <span>${escapeHtml(statusVisual.label)}</span>
          </span>
        `;
      },
    },
    {
      id: 'vigencia',
      header: 'Vigencia',
      sortable: true,
      align: 'right',
      renderCell: (cert) => `
        <div class="font-mono text-[11px] text-slate-700 tabular-nums whitespace-nowrap leading-tight">
          <div>${escapeHtml(cert.fecha_emision)}</div>
          <div class="text-slate-400">→ ${escapeHtml(cert.fecha_vencimiento)}</div>
        </div>
      `,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      sortable: false,
      align: 'center',
      renderCell: (cert) => `
        <button
          type="button"
          data-action="select-cert"
          data-cert-id="${escapeHtml(cert.id)}"
          class="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <span>Inspeccionar</span>
          <span>→</span>
        </button>
      `,
    },
  ];

  const renderCard = (cert: CertificadoDetailEntity): string => {
    const branchCount = countMultisiteBranches(cert.sitios);
    const branchText = formatMultisiteBranchCountText(branchCount);
    const statusVisual = getStatusBadge(cert.estatus);

    return `
      <div
        data-action="select-cert"
        data-cert-id="${escapeHtml(cert.id)}"
        class="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              📜 ${escapeHtml(cert.numero_certificado)}
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusVisual.badgeClass}">
              <span class="w-1.5 h-1.5 rounded-full ${statusVisual.dotClass}"></span>
              <span>${escapeHtml(statusVisual.label)}</span>
            </span>
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
              ${escapeHtml(cert.organizacion_nombre)}
            </h3>
            <div class="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
              <span class="font-mono">RIF: ${escapeHtml(cert.organizacion_rif)}</span>
              <span>·</span>
              <span>${escapeHtml(cert.norma_codigo)}</span>
            </div>
          </div>
        </div>

        <div class="text-xs text-slate-600 bg-slate-50/75 p-3 rounded-lg border border-slate-100 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-500 text-[11px]">Sector IAF ${cert.sector_iaf}:</span>
            <span class="font-medium text-slate-800 truncate max-w-[200px]" title="${escapeHtml(cert.sector_iaf_descripcion)}">
              ${escapeHtml(cert.sector_iaf_descripcion)}
            </span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-slate-200/50">
            <span class="text-slate-500 text-[11px]">Esquema Multisitio:</span>
            <span class="font-medium text-slate-800 inline-flex items-center gap-1">
              <span>${branchCount > 0 ? '🏢' : '📍'}</span>
              <span>${branchText}</span>
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span class="font-mono text-[11px] tabular-nums">Vigencia: ${escapeHtml(cert.fecha_vencimiento)}</span>
          <span class="font-semibold text-sky-700 group-hover:text-sky-900 inline-flex items-center gap-1">
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
        data-action="open-create-cert"
        class="px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
      >
        <span aria-hidden="true">+</span>
        <span>Nuevo Certificado</span>
      </button>
    `
    : '';

  const inlineFormHtml =
    isStaff && state.isCreating
      ? renderCreateCertificadoForm(allCertificates, organizaciones, state.createErrorMessage)
      : '';

  return renderUniversalTemplate<CertificadoDetailEntity>({
    domainKey: 'certificados',
    title: 'Certificados de Conformidad',
    subtitle:
      'Gestión de certificados emitidos bajo ISO/IEC 17021-1:2015, alcance técnico, sedes multisitio y trazabilidad',
    entityLabel: 'certificados registrados',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar por N° Certificado, organización, RIF, norma o alcance... (Presione "/" para enfocar)',
    searchInputId: 'certDirectorySearchInput',
    clearSearchBtnId: 'clearCertSearchBtn',
    totalCount: allCertificates.length,
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
    emptyStateTitle: 'No se encontraron certificados',
    emptyStateMessage:
      'No hay registros que coincidan con el término de búsqueda o las facetas seleccionadas.',
    actionsHtml,
    inlineFormHtml,
    loading,
    loadingMessage: 'Cargando certificados emitidos...',
  });
}

/**
 * Standardized 3-Zone Detail Page Architecture & List-Only Child Tabs
 */
function renderCertificadoDetailPage(
  profile: UserProfile,
  state: CertificadoViewState,
  cert: CertificadoDetailEntity
): string {
  const activeTab: CertificadoChildTab = state.activeChildTab || 'sitios';
  const statusVisual = getStatusBadge(cert.estatus);
  const isStaff =
    profile.status === 'APPROVED' &&
    (profile.role === 'ADMIN' || profile.role === 'WORKER');
  const isEditing = isStaff && state.isEditingAttributes;

  const currentAlcance = isEditing
    ? state.editFormData?.alcance ?? cert.alcance
    : cert.alcance;
  const alcanceLength = currentAlcance.length;
  const isAlcanceTooShort = alcanceLength < 10;
  const isAlcanceTooLong = alcanceLength > 1000;

  // Enforce Site 0 sorting algorithm for Sitios tab
  const sortedSites = sortSitesWithPrincipalFirst(cert.sitios);

  // Zone 1: Clickable Parent & Classification Chips
  const parents: DetailParentChip[] = [
    {
      label: 'Organización',
      value: `${cert.organizacion_nombre} (${cert.organizacion_rif})`,
      symbol: '🏢',
      navAction: {
        nav: 'certificacion',
        subview: 'organizations',
        entityType: 'org',
        entityId: cert.id_organizacion,
      },
    },
    {
      label: 'Norma',
      value: cert.norma_codigo,
      symbol: '📘',
      navAction: {
        nav: 'extra',
        subview: 'standards',
        entityType: 'norma',
        entityId: cert.id_norma,
      },
    },
    {
      label: 'Sector IAF',
      value: `Sector ${cert.sector_iaf} · ${cert.sector_iaf_descripcion}`,
      symbol: '🏭',
      navAction: {
        nav: 'extra',
        subview: 'iaf',
        entityType: 'sector_iaf',
        entityId: cert.id_sector_iaf,
        sectorNumber: cert.sector_iaf,
      },
    },
  ];

  const recordActionsHtml = isStaff
    ? !isEditing
      ? `
        <button
          type="button"
          id="startEditCertBtn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <span aria-hidden="true">✏️</span>
          <span>Editar</span>
        </button>
      `
      : `
        <button
          type="button"
          id="cancelEditCertBtn"
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
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Número de Certificado</span>
          <p class="font-mono text-xs font-bold text-slate-900">${escapeHtml(cert.numero_certificado)}</p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Emisión</span>
          <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(cert.fecha_emision)}</p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Vencimiento</span>
          <p class="font-mono text-xs font-medium text-slate-900">${escapeHtml(cert.fecha_vencimiento)}</p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Organismo Acreditador</span>
          <p class="text-xs font-semibold text-slate-800">
            ${escapeHtml(cert.organismo_acreditador_codigo || 'ENAC')} (${escapeHtml(cert.numero_acreditacion || '01/C-SC001')})
          </p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Sub-Sector IAF & Riesgo</span>
          <p class="text-xs font-medium text-slate-800 flex items-center gap-1.5">
            <span>${escapeHtml(cert.subsector_iaf_codigo || '17.1')} ${escapeHtml(cert.subsector_iaf_descripcion || 'Metales básicos')}</span>
            ${
              cert.subsector_categoria_riesgo
                ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">${escapeHtml(cert.subsector_categoria_riesgo)}</span>`
                : ''
            }
          </p>
        </div>
        <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Modalidad Multisitio</span>
          <p class="text-xs font-semibold text-slate-800">
            ${cert.multisitio ? formatMultisiteBranchCountText(countMultisiteBranches(cert.sitios)) : 'Sede Única (Principal)'}
          </p>
        </div>

        <div class="col-span-1 md:col-span-3 p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">
              Alcance de la Certificación (ISO/IEC 17021-1:2015 cláusula 8.2.2)
            </span>
            <span class="text-xs font-mono font-medium text-slate-500 tabular-nums">
              (${cert.alcance.length} / 1000 caracteres)
            </span>
          </div>
          <p class="text-xs text-slate-800 leading-relaxed font-sans bg-white p-3.5 rounded border border-slate-200/80">
            ${escapeHtml(cert.alcance)}
          </p>
        </div>
      </div>
    `
    : `
      <form id="editCertForm" class="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="editCertFechaEmision" class="text-xs font-bold text-slate-700">Fecha de Emisión *</label>
            <input
              type="date"
              id="editCertFechaEmision"
              name="fecha_emision"
              value="${escapeHtml(state.editFormData?.fecha_emision || cert.fecha_emision)}"
              required
              class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <div class="space-y-1">
            <label for="editCertFechaVencimiento" class="text-xs font-bold text-slate-700">Fecha de Vencimiento *</label>
            <input
              type="date"
              id="editCertFechaVencimiento"
              name="fecha_vencimiento"
              value="${escapeHtml(state.editFormData?.fecha_vencimiento || cert.fecha_vencimiento)}"
              required
              class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="editCertAlcanceInput" class="text-xs font-bold text-slate-700">
              Declaración de Alcance de la Certificación (10 a 1000 caracteres) *
            </label>
            <span
              id="certAlcanceLiveCounter"
              class="text-xs font-mono font-bold tabular-nums ${
                isAlcanceTooShort || isAlcanceTooLong ? 'text-rose-600' : 'text-slate-600'
              }"
            >
              (${alcanceLength} / 1000 caracteres)
            </span>
          </div>
          <textarea
            id="editCertAlcanceInput"
            name="alcance"
            rows="4"
            required
            minlength="10"
            maxlength="1000"
            class="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-sans focus:ring-2 focus:ring-slate-900 focus:outline-none leading-relaxed ${
              isAlcanceTooShort || isAlcanceTooLong ? 'border-rose-300 focus:ring-rose-500' : ''
            }"
          >${escapeHtml(currentAlcance)}</textarea>
          ${
            isAlcanceTooShort
              ? `<p id="alcanceLengthError" class="text-[11px] text-rose-600 font-medium">⚠️ El texto debe tener al menos 10 caracteres.</p>`
              : ''
          }
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            id="cancelEditCertBtnSecondary"
            class="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="saveCertBtn"
            class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            💾 Guardar Cambios
          </button>
        </div>
      </form>
    `;

  const uniqueMappedClauses = new Set<string>();
  for (const proc of cert.procesos) {
    if (proc.requisitos_detalle && proc.requisitos_detalle.length > 0) {
      proc.requisitos_detalle.forEach((r) => uniqueMappedClauses.add(r.codigo));
    } else {
      proc.clausulas_cubiertas.forEach((c) => uniqueMappedClauses.add(c));
    }
  }

  return renderDetailPageTemplate({
    entityType: 'Certificado de Conformidad',
    entitySymbol: '📜',
    title: cert.numero_certificado,
    eyebrowCode: cert.norma_codigo,
    subtitle: `${cert.norma_titulo} · ${cert.esquema}`,
    statusBadge: {
      label: statusVisual.label,
      badgeClass: statusVisual.badgeClass,
      dotClass: statusVisual.dotClass,
    },
    backButton: {
      label: 'Volver a Certificados',
      nav: 'certificacion',
      subview: 'certificates',
      action: 'back-to-cert-list',
    },
    parents,
    tableName: 'certificado',
    recordId: cert.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml,
    childTabs: [
      { id: 'sitios', label: 'Sitios', symbol: '📍', count: cert.sitios.length },
      { id: 'procesos', label: 'Procesos', symbol: '⚙️', count: cert.procesos.length },
      { id: 'turnos', label: 'Turnos', symbol: '⏱️', count: cert.turnos.length },
      { id: 'no_aplicables', label: 'No Aplicables', symbol: '🚫', count: cert.noAplicables.length },
      { id: 'cobertura', label: 'Cobertura Normativa', symbol: '✅', count: uniqueMappedClauses.size },
      { id: 'auditorias', label: 'Auditorías', symbol: '📋', count: cert.auditorias.length },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-cert-tab',
    renderChildTabContent: (tabId) => renderActiveChildTab(tabId as CertificadoChildTab, sortedSites, cert),
  });
}

/**
 * Dispatches and renders one of the list-only specialized child tabs.
 */
function renderActiveChildTab(
  tab: CertificadoChildTab,
  sortedSites: SiteEntity[],
  cert: CertificadoDetailEntity
): string {
  switch (tab) {
    case 'sitios':
      return renderSitiosChildTab(sortedSites, cert.id);
    case 'procesos':
      return renderProcesosChildTab(cert.procesos, cert.id);
    case 'turnos':
      return renderTurnosChildTab(cert.turnos, cert.id);
    case 'no_aplicables':
      return renderNoAplicablesChildTab(cert.noAplicables);
    case 'cobertura':
      return renderCoberturaNormativaChildTab(cert);
    case 'auditorias':
      return renderAuditoriasChildTab(cert.auditorias);
    default:
      return renderSitiosChildTab(sortedSites, cert.id);
  }
}

/**
 * TAB 1: Sitios (public.sitio) — List-Only
 * MANDATORY REQUIREMENT: Site 0 (Headquarters) is ALWAYS RENDERED FIRST with the primary badge `★ Sede Central / Principal`.
 * Prepared with row-click hook for Phase 4.2.2 Sitio Detail View.
 */
function renderSitiosChildTab(sites: SiteEntity[], certId: string): string {
  if (sites.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay sedes o plantas registradas para este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">N° Sede</th>
              <th scope="col" class="py-3 px-4">Nombre de la Sede</th>
              <th scope="col" class="py-3 px-4">Tipo de Sede</th>
              <th scope="col" class="py-3 px-4">Dirección Física</th>
              <th scope="col" class="py-3 px-4 text-center">Personal</th>
              <th scope="col" class="py-3 px-4">Turnos Asignados</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${sites
              .map((site) => {
                const isHq = site.numero_sitio === 0;

                return `
                <tr
                  data-action="select-sitio-preview"
                  data-sitio-id="${escapeHtml(site.id)}"
                  data-cert-id="${escapeHtml(certId)}"
                  class="hover:bg-slate-50/80 transition-colors cursor-pointer ${isHq ? 'bg-sky-50/30' : ''}"
                >
                  <td class="py-3 px-4 whitespace-nowrap">
                    <span class="font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      isHq
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }">
                      Sede #${site.numero_sitio}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-bold text-slate-900">
                    <button
                      type="button"
                      data-action="select-sitio"
                      data-sitio-id="${escapeHtml(site.id)}"
                      data-cert-id="${escapeHtml(certId)}"
                      class="flex items-center gap-1.5 text-left font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                    >
                      <span aria-hidden="true">${isHq ? '🏢' : '📍'}</span>
                      <span>${escapeHtml(site.nombre_sitio)}</span>
                    </button>
                    ${
                      site.actividades
                        ? `<p class="text-[11px] text-slate-500 font-normal pt-0.5 line-clamp-1">${escapeHtml(site.actividades)}</p>`
                        : ''
                    }
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap">
                    ${
                      isHq
                        ? `
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                        <span>★</span>
                        <span>Sede Central / Principal</span>
                      </span>
                    `
                        : `
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <span>Sucursal Operativa</span>
                      </span>
                    `
                    }
                  </td>
                  <td class="py-3 px-4 text-slate-700">
                    <p class="max-w-xs truncate" title="${escapeHtml(site.direccion_sitio)}">
                      ${escapeHtml(site.direccion_sitio)}
                    </p>
                  </td>
                  <td class="py-3 px-4 text-center whitespace-nowrap tabular-nums font-mono font-medium text-slate-700">
                    ${site.personal_count !== undefined ? `${site.personal_count} personas` : '—'}
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap">
                    <div class="flex flex-wrap gap-1">
                      ${(site.turnos_vinculados || ['Turno Diurno'])
                        .map(
                          (t) => `
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          ${escapeHtml(t)}
                        </span>
                      `
                        )
                        .join('')}
                    </div>
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

/**
 * TAB 2: Procesos (public.proceso) — List-Only Table
 * Prepared with row-click hook for Phase 4.2.3 Proceso Detail View.
 */
function renderProcesosChildTab(procesos: ProcessEntity[], certId: string): string {
  if (procesos.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay procesos del sistema de gestión registrados para este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Proceso</th>
              <th scope="col" class="py-3 px-4">Tipo</th>
              <th scope="col" class="py-3 px-4">Responsable</th>
              <th scope="col" class="py-3 px-4">Cláusulas Normativas Cubiertas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${procesos
              .map((proc) => {
                const visual = getProcessTypeVisual(proc.tipo);
                return `
                  <tr
                    data-action="select-proceso-preview"
                    data-proceso-id="${escapeHtml(proc.id)}"
                    data-cert-id="${escapeHtml(certId)}"
                    class="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td class="py-3 px-4 font-bold text-slate-900">
                      <button
                        type="button"
                        data-action="select-proceso"
                        data-proceso-id="${escapeHtml(proc.id)}"
                        data-cert-id="${escapeHtml(certId)}"
                        class="inline-flex items-center gap-1.5 text-left font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                      >
                        <span aria-hidden="true">${visual.icon}</span>
                        <span>${escapeHtml(proc.nombre_proceso)}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${visual.badgeClass}">
                        <span>${escapeHtml(visual.label)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-700 whitespace-nowrap">
                      ${escapeHtml(proc.responsable || 'Por designar')}
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex flex-wrap gap-1.5">
                        ${
                          proc.requisitos_detalle && proc.requisitos_detalle.length > 0
                            ? proc.requisitos_detalle
                                .map(
                                  (req) => `
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px]" title="${escapeHtml(req.titulo)}">
                                <span class="font-mono font-bold text-sky-800">${escapeHtml(req.codigo)}</span>
                              </span>
                            `
                                )
                                .join('')
                            : proc.clausulas_cubiertas
                                .map(
                                  (c) => `
                              <span class="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono font-bold text-slate-800">
                                ${escapeHtml(c)}
                              </span>
                            `
                                )
                                .join('')
                        }
                      </div>
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

/**
 * TAB 3: Turnos (public.turno) — List-Only Table
 */
function renderTurnosChildTab(turnos: ShiftEntity[], certId: string): string {
  if (turnos.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay turnos productivos configurados para las sedes de este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Turno Operativo</th>
              <th scope="col" class="py-3 px-4">Horario</th>
              <th scope="col" class="py-3 px-4 text-center">Personal</th>
              <th scope="col" class="py-3 px-4">Sedes Vinculadas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${turnos
              .map(
                (turno) => `
              <tr
                data-action="select-turno-preview"
                data-turno-id="${escapeHtml(turno.id)}"
                data-cert-id="${escapeHtml(certId)}"
                class="hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <td class="py-3 px-4 font-bold text-slate-900">
                  <button
                    type="button"
                    data-action="select-turno"
                    data-turno-id="${escapeHtml(turno.id)}"
                    data-cert-id="${escapeHtml(certId)}"
                    class="inline-flex items-center gap-1.5 text-left font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                  >
                    <span aria-hidden="true">⏱️</span>
                    <span>${escapeHtml(turno.descripcion)}</span>
                  </button>
                </td>
                <td class="py-3 px-4 font-mono font-semibold text-indigo-700 tabular-nums whitespace-nowrap">
                  ${escapeHtml(turno.hora_entrada)} — ${escapeHtml(turno.hora_salida)}
                </td>
                <td class="py-3 px-4 text-center font-mono text-slate-700 tabular-nums whitespace-nowrap">
                  ${turno.empleados_activos !== undefined ? `${turno.empleados_activos} trabajadores` : 'Estándar'}
                </td>
                <td class="py-3 px-4">
                  <div class="flex flex-wrap gap-1">
                    ${turno.sitios_vinculados
                      .map(
                        (s) => `
                      <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                        📍 ${escapeHtml(s)}
                      </span>
                    `
                      )
                      .join('')}
                  </div>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * TAB 4: No Aplicables (public.requisitos_no_aplicables_certificado) — List-Only Table
 */
function renderNoAplicablesChildTab(noAplicables: NonApplicableRequirementEntity[]): string {
  if (noAplicables.length === 0) {
    return `
      <div class="p-8 text-center text-slate-600 text-xs bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
        <span class="text-2xl block">✓</span>
        <h4 class="text-sm font-bold text-emerald-900">Aplicabilidad Completa</h4>
        <p class="text-xs text-emerald-700 max-w-md mx-auto">
          Este certificado aplica la totalidad de los requisitos de la norma evaluada sin exclusiones declaradas bajo la cláusula 4.3.
        </p>
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Cláusula</th>
              <th scope="col" class="py-3 px-4">Requisito Excluido</th>
              <th scope="col" class="py-3 px-4">Justificación Técnica Obligatoria (ISO 4.3)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${noAplicables
              .map(
                (item) => `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-4 whitespace-nowrap">
                  <span class="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 font-mono text-xs font-bold rounded">
                    Cláusula ${escapeHtml(item.requisito_codigo)}
                  </span>
                </td>
                <td class="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                  ${escapeHtml(item.requisito_titulo)}
                </td>
                <td class="py-3 px-4 text-slate-700 leading-relaxed">
                  ${escapeHtml(item.justificacion)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * TAB 5: Cobertura Normativa — List-Only Table
 * Summarizes covered clauses mapped to processes vs excluded clauses (ISO 4.3).
 */
function renderCoberturaNormativaChildTab(cert: CertificadoDetailEntity): string {
  const rows: Array<{
    codigo: string;
    titulo: string;
    estado: 'Cubierta' | 'No Aplicable';
    origen: string;
  }> = [];
  const seen = new Set<string>();

  for (const proc of cert.procesos) {
    if (proc.requisitos_detalle && proc.requisitos_detalle.length > 0) {
      for (const req of proc.requisitos_detalle) {
        if (!seen.has(req.codigo)) {
          seen.add(req.codigo);
          rows.push({
            codigo: req.codigo,
            titulo: req.titulo,
            estado: 'Cubierta',
            origen: proc.nombre_proceso,
          });
        }
      }
    } else {
      for (const c of proc.clausulas_cubiertas) {
        if (!seen.has(c)) {
          seen.add(c);
          rows.push({
            codigo: c,
            titulo: `Requisito ${c}`,
            estado: 'Cubierta',
            origen: proc.nombre_proceso,
          });
        }
      }
    }
  }

  for (const ex of cert.noAplicables) {
    rows.push({
      codigo: ex.requisito_codigo,
      titulo: ex.requisito_titulo,
      estado: 'No Aplicable',
      origen: ex.justificacion,
    });
  }

  if (rows.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay mapeo de cobertura normativa registrado para este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Cláusula</th>
              <th scope="col" class="py-3 px-4">Requisito Normativo</th>
              <th scope="col" class="py-3 px-4 text-center">Estado</th>
              <th scope="col" class="py-3 px-4">Proceso / Justificación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows
              .map((row) => {
                const isCovered = row.estado === 'Cubierta';
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      Cláusula ${escapeHtml(row.codigo)}
                    </td>
                    <td class="py-3 px-4 font-semibold text-slate-900">
                      ${escapeHtml(row.titulo)}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        isCovered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }">
                        ${isCovered ? '✓ Cubierta' : '🚫 No Aplicable'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600">
                      ${escapeHtml(row.origen)}
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

/**
 * TAB 6: Auditorías (public.auditoria) — List-Only Clickable Table
 */
function renderAuditoriasChildTab(auditorias: AuditEntity[]): string {
  if (auditorias.length === 0) {
    return `
      <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
        No hay auditorías registradas para este certificado.
      </div>
    `;
  }

  return `
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" class="py-3 px-4">Código Auditoría</th>
              <th scope="col" class="py-3 px-4">Modalidad</th>
              <th scope="col" class="py-3 px-4">Metodología</th>
              <th scope="col" class="py-3 px-4">Fecha Programada</th>
              <th scope="col" class="py-3 px-4">Auditor Líder</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditorias
              .map((aud) => {
                const isCompleted = aud.estatus === 'Completada' || aud.estatus === 'Cerrada';
                return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <button
                      type="button"
                      data-action="select-prog-audit-by-code"
                      data-audit-code="${escapeHtml(aud.codigo_auditoria)}"
                      data-audit-id="${escapeHtml(aud.id)}"
                      class="text-indigo-600 hover:text-indigo-800 hover:underline font-mono font-bold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>📋</span>
                      <span>${escapeHtml(aud.codigo_auditoria)}</span>
                    </button>
                  </td>
                  <td class="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    ${escapeHtml(aud.tipo_auditoria)}
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      ${escapeHtml(aud.metodologia)}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums whitespace-nowrap">
                    ${escapeHtml(aud.fecha_programacion)}
                  </td>
                  <td class="py-3 px-4 text-slate-800 whitespace-nowrap">
                    ${escapeHtml(aud.auditor_lider)}
                  </td>
                  <td class="py-3 px-4 text-center whitespace-nowrap">
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
