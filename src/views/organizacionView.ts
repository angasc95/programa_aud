import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  countActiveCertificates,
  formatActiveCertificateBadge,
  getCertificatesByOrganizacion,
  type CertificadoSummary,
  type OrganizacionEntity,
} from '../lib/activeCertificates';
import type { ProgramacionAuditEntity } from '../lib/auditExecution';
import {
  computeReactiveFacetCounts,
  filterRecordsWithFacets,
  sortItems,
  type ColumnDefinition,
  type MultiViewFacetCategory,
  type MultiViewSelectionMap,
  type SortDirection,
} from '../lib/universalTemplate';
import { renderUniversalTemplate } from './universalTemplate';
import { renderDetailPageTemplate, type DetailParentChip } from './detailTemplate';
import {
  canArchiveRecord,
  extractUniversalArchiveProps,
  renderArchivarButtonHtml,
  type ArchiveMultiViewConfig,
} from '../lib/archiveGovernance';

export interface OrganizacionViewState {
  selectedOrganizacionId: string | null;
  query: string;
  hasActiveCertificates: 'ALL' | 'WITH_ACTIVE' | 'WITHOUT_ACTIVE';
  selectedSectorIaf: string;
  viewMode: 'grid' | 'list';
  sortColumn: 'nombre' | 'rif' | 'certificados_activos' | 'sector' | null;
  sortDirection: SortDirection;
  isEditingAttributes: boolean;
  activeChildTab: 'certificados' | 'auditorias';
  editFormData?: Partial<OrganizacionEntity>;
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
  isCreating?: boolean;
  createErrorMessage?: string | null;
}

export interface OrganizacionViewProps {
  profile: UserProfile;
  state: OrganizacionViewState;
  organizaciones: OrganizacionEntity[];
  certificados: CertificadoSummary[];
  auditorias?: ProgramacionAuditEntity[];
  loading?: boolean;
  archiveConfig?: ArchiveMultiViewConfig;
}

export function renderOrganizacionView(props: OrganizacionViewProps): string {
  const { profile, state, organizaciones, certificados, auditorias = [], loading, archiveConfig } = props;
  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');

  // If an organization is selected, render the Standardized 3-Zone Detail Page
  if (state.selectedOrganizacionId) {
    const org =
      organizaciones.find((o) => o.id === state.selectedOrganizacionId) ||
      organizaciones[0];
    if (org) {
      return renderOrganizacionDetailView({
        profile,
        state,
        org,
        certificados,
        auditorias,
        isStaff,
      });
    }
  }

  // Otherwise render Universal Multi View Directory
  return renderOrganizacionDirectoryView({
    profile,
    state,
    organizaciones,
    certificados,
    isStaff,
    loading,
    archiveConfig,
  });
}

function renderCreateOrganizacionForm(
  organizaciones: OrganizacionEntity[],
  errorMessage?: string | null
): string {
  const sectorMap = new Map<number, string>();
  for (const org of organizaciones) {
    if (org.sector_iaf_numero) {
      sectorMap.set(org.sector_iaf_numero, org.sector_principal || `Sector ${org.sector_iaf_numero}`);
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
    <div class="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-slate-900">Registrar Nueva Organización Cliente</h2>
        <button
          type="button"
          data-action="close-create-org"
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
      <form id="createOrganizacionForm" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createOrgNombreInput" class="block text-xs font-semibold text-slate-700 mb-1">Razón Social *</label>
            <input id="createOrgNombreInput" type="text" required placeholder="Ej. Industrias Alfa C.A." class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createOrgRifInput" class="block text-xs font-semibold text-slate-700 mb-1">RIF / NIF *</label>
            <input id="createOrgRifInput" type="text" required placeholder="Ej. J-30998877-1" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
          <div>
            <label for="createOrgSectorSelect" class="block text-xs font-semibold text-slate-700 mb-1">Sector IAF Principal *</label>
            <select id="createOrgSectorSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${sectorOptions || '<option value="17|Metales básicos y productos metálicos">Sector 17 · Metales básicos y productos metálicos</option>'}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createOrgContactoInput" class="block text-xs font-semibold text-slate-700 mb-1">Contacto Principal</label>
            <input id="createOrgContactoInput" type="text" placeholder="Nombre del representante" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createOrgCorreoInput" class="block text-xs font-semibold text-slate-700 mb-1">Correo Corporativo</label>
            <input id="createOrgCorreoInput" type="email" placeholder="calidad@empresa.com" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createOrgTelefonoInput" class="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
            <input id="createOrgTelefonoInput" type="text" placeholder="+58 212 555 0100" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label for="createOrgDireccionInput" class="block text-xs font-semibold text-slate-700 mb-1">Dirección Fiscal *</label>
            <input id="createOrgDireccionInput" type="text" required placeholder="Zona Industrial, Parcela 14..." class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
          <div>
            <label for="createOrgGrupoInput" class="block text-xs font-semibold text-slate-700 mb-1">Grupo Corporativo</label>
            <input id="createOrgGrupoInput" type="text" placeholder="Independiente" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            data-action="close-create-org"
            class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Guardar Organización
          </button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Renders the Universal Multi View Directory for Organizaciones
 */
function renderOrganizacionDirectoryView(props: {
  profile: UserProfile;
  state: OrganizacionViewState;
  organizaciones: OrganizacionEntity[];
  certificados: CertificadoSummary[];
  isStaff: boolean;
  loading?: boolean;
  archiveConfig?: ArchiveMultiViewConfig;
}): string {
  const { state, organizaciones, certificados, isStaff, loading, archiveConfig } = props;

  // Compute unique IAF sectors represented across organizations
  const sectorMap = new Map<number, string>();
  for (const org of organizaciones) {
    if (org.sector_iaf_numero) {
      sectorMap.set(org.sector_iaf_numero, org.sector_principal || `Sector ${org.sector_iaf_numero}`);
    }
  }
  const sectorEntries = Array.from(sectorMap.entries()).sort(([a], [b]) => a - b);

  const facetCategories: MultiViewFacetCategory<OrganizacionEntity>[] = [
    {
      id: 'vigencia',
      label: 'Vigencia de Certificados',
      options: [
        { value: 'WITH_ACTIVE', label: 'Con Certificados Activos' },
        { value: 'WITHOUT_ACTIVE', label: 'Sin Certificados Activos' },
      ],
      extractValues: (org) =>
        countActiveCertificates(certificados, org.id) > 0 ? 'WITH_ACTIVE' : 'WITHOUT_ACTIVE',
    },
    {
      id: 'sector_iaf',
      label: 'Sector IAF',
      options: sectorEntries.map(([secNum, secDesc]) => ({
        value: String(secNum),
        label: `Sector ${secNum} · ${secDesc}`,
      })),
      extractValues: (org) => (org.sector_iaf_numero ? String(org.sector_iaf_numero) : null),
    },
  ];

  // Backwards-compatible fallback when facetSelections is not yet initialized
  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        vigencia:
          state.hasActiveCertificates !== 'ALL'
            ? new Set([state.hasActiveCertificates])
            : new Set<string>(),
        sector_iaf:
          state.selectedSectorIaf !== 'ALL'
            ? new Set([state.selectedSectorIaf])
            : new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (org: OrganizacionEntity) =>
      [
        org.nombre,
        org.rif,
        org.direccion_fiscal || '',
        org.contacto_principal || '',
        org.correo_contacto || '',
        org.grupo_corporativo || '',
        org.sector_principal || '',
      ].join(' '),
  };

  const filteredOrgs = filterRecordsWithFacets(
    organizaciones,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const sortedOrgs = sortItems(
    filteredOrgs,
    state.sortColumn,
    state.sortDirection,
    (org, col) => {
      switch (col) {
        case 'nombre':
          return org.nombre;
        case 'rif':
          return org.rif;
        case 'sector':
          return org.sector_iaf_numero || 0;
        case 'certificados_activos':
          return countActiveCertificates(certificados, org.id);
        default:
          return '';
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    organizaciones,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<OrganizacionEntity>[] = [
    {
      id: 'nombre',
      header: 'Organización',
      sortable: true,
      renderCell: (org) => `
        <button
          type="button"
          data-action="select-org"
          data-org-id="${escapeHtml(org.id)}"
          class="text-left group cursor-pointer"
        >
          <span class="block font-bold text-slate-900 group-hover:text-emerald-700 group-hover:underline transition-colors">
            ${escapeHtml(org.nombre)}
          </span>
          <span class="block text-[10px] text-slate-400">
            ${escapeHtml(org.grupo_corporativo || 'Independiente')}
          </span>
        </button>
      `,
    },
    {
      id: 'rif',
      header: 'RIF / NIF',
      sortable: true,
      renderCell: (org) => `
        <span class="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
          ${escapeHtml(org.rif)}
        </span>
      `,
    },
    {
      id: 'contacto',
      header: 'Contacto Principal',
      sortable: false,
      renderCell: (org) => `
        <div class="font-medium text-slate-800 max-w-[170px] xl:max-w-[260px] truncate">${escapeHtml(org.contacto_principal || '—')}</div>
        <div class="text-[11px] text-slate-500 font-mono max-w-[170px] xl:max-w-[260px] truncate" title="${escapeHtml(org.correo_contacto || '')}">${escapeHtml(org.correo_contacto || '')}</div>
      `,
    },
    {
      id: 'sector',
      header: 'Sector Principal',
      sortable: true,
      renderCell: (org) => `
        <span class="inline-block max-w-[200px] xl:max-w-[300px] leading-snug px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
          Sector ${org.sector_iaf_numero || '—'}: ${escapeHtml(org.sector_principal || 'General')}
        </span>
      `,
    },
    {
      id: 'certificados_activos',
      header: 'Certificados Activos',
      sortable: true,
      align: 'center',
      renderCell: (org) => {
        const activeCount = countActiveCertificates(certificados, org.id);
        const activeBadge = formatActiveCertificateBadge(activeCount);
        const totalCerts = getCertificatesByOrganizacion(certificados, org.id).length;
        return `
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${activeBadge.badgeClass}">
            <span>${activeBadge.symbol}</span>
            <span>${activeCount} de ${totalCerts}</span>
          </span>
        `;
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      sortable: false,
      align: 'right',
      renderCell: (org) => `
        <button
          type="button"
          data-action="select-org"
          data-org-id="${escapeHtml(org.id)}"
          class="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer whitespace-nowrap"
        >
          Ver Ficha →
        </button>
      `,
    },
  ];

  const renderCard = (org: OrganizacionEntity): string => {
    const activeCount = countActiveCertificates(certificados, org.id);
    const activeBadge = formatActiveCertificateBadge(activeCount);
    const totalOrgCerts = getCertificatesByOrganizacion(certificados, org.id).length;

    return `
      <div
        data-action="select-org"
        data-org-id="${escapeHtml(org.id)}"
        class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1 flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-base" aria-hidden="true">🏢</span>
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                  ${escapeHtml(org.nombre)}
                </h3>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  RIF: ${escapeHtml(org.rif)}
                </span>
                <span class="text-[10px] text-slate-400">·</span>
                <span class="text-[11px] font-medium text-slate-500 truncate">
                  ${escapeHtml(org.grupo_corporativo || 'Independiente')}
                </span>
              </div>
            </div>

            <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${activeBadge.badgeClass}">
              <span>${activeBadge.symbol}</span>
              <span>${activeCount} Activos</span>
            </span>
          </div>

          <div class="pt-1">
            <span class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
              <span aria-hidden="true">🏭</span>
              <span>Sector ${org.sector_iaf_numero || '—'}: ${escapeHtml(org.sector_principal || 'No especificado')}</span>
            </span>
          </div>
        </div>

        <div class="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-400">Contacto:</span>
            <span class="font-medium text-slate-800 truncate">${escapeHtml(org.contacto_principal || 'No registrado')}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-400">Correo:</span>
            <span class="font-mono text-slate-700 truncate max-w-[180px]">${escapeHtml(org.correo_contacto || '—')}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-400">Teléfono:</span>
            <span class="font-mono text-slate-700">${escapeHtml(org.telefono_contacto || '—')}</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] text-slate-500">
            Total Certificados: <strong class="text-slate-900 tabular-nums">${totalOrgCerts}</strong>
          </span>
          <span class="text-xs font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
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
        data-action="open-create-org"
        class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
      >
        <span aria-hidden="true">+</span>
        <span>Nueva Organización</span>
      </button>
    `
    : '';

  const inlineFormHtml =
    isStaff && state.isCreating
      ? renderCreateOrganizacionForm(organizaciones, state.createErrorMessage)
      : '';

  return renderUniversalTemplate<OrganizacionEntity>({
    domainKey: 'organizaciones',
    title: 'Organizaciones Clientes',
    subtitle:
      'Empresas titulares de sistemas de gestión certificados, RIF fiscal y métricas de certificados activos bajo ISO/IEC 17021-1:2015',
    entityLabel: 'organizaciones clientes',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar por Razón Social, RIF, dirección fiscal o contacto... (Presione "/" para enfocar)',
    searchInputId: 'orgSearchInput',
    clearSearchBtnId: 'clearOrgSearchBtn',
    totalCount: organizaciones.length,
    filteredCount: sortedOrgs.length,
    viewMode: state.viewMode,
    isSidebarOpen: state.isSidebarOpen ?? true,
    sortState: {
      column: state.sortColumn,
      direction: state.sortDirection,
    },
    facetGroups,
    items: sortedOrgs,
    columns,
    renderCard,
    emptyStateTitle: 'No se encontraron organizaciones clientes',
    emptyStateMessage:
      'Intente ajustar el término de búsqueda o restablecer las facetas laterales para visualizar todas las empresas registradas.',
    actionsHtml,
    inlineFormHtml,
    loading,
    loadingMessage: 'Cargando directorio de organizaciones clientes...',
    ...extractUniversalArchiveProps(archiveConfig, 'organizaciones'),
  });
}

/**
 * Standardized 3-Zone Detail Page Architecture for Organización
 */
function renderOrganizacionDetailView(props: {
  profile: UserProfile;
  state: OrganizacionViewState;
  org: OrganizacionEntity;
  certificados: CertificadoSummary[];
  auditorias: ProgramacionAuditEntity[];
  isStaff: boolean;
}): string {
  const { state, org, certificados, auditorias, isStaff } = props;

  // Active certificates vs total certificates
  const activeCount = countActiveCertificates(certificados, org.id);
  const orgCertificates = getCertificatesByOrganizacion(certificados, org.id);
  const orgAudits = auditorias.filter(
    (a) =>
      a.id_organizacion === org.id ||
      a.organizacion_nombre.trim().toLowerCase() === org.nombre.trim().toLowerCase()
  );
  const activeBadge = formatActiveCertificateBadge(activeCount);

  // Edit form state
  const isEditing = state.isEditingAttributes && isStaff;
  const currentFormData = state.editFormData || { ...org };
  const activeTab: 'certificados' | 'auditorias' =
    state.activeChildTab === 'auditorias' ? 'auditorias' : 'certificados';

  const parents: DetailParentChip[] = [];
  if (org.sector_iaf_numero || org.sector_principal) {
    parents.push({
      label: 'Sector IAF',
      value: `Sector ${org.sector_iaf_numero || '—'} · ${org.sector_principal || 'General'}`,
      symbol: '🏭',
      navAction: {
        nav: 'extra',
        subview: 'iaf',
        entityType: 'sector_iaf',
        entityId: org.id_sector_iaf,
        sectorNumber: org.sector_iaf_numero || 17,
      },
    });
  }
  if (org.grupo_corporativo && org.grupo_corporativo !== 'Independiente') {
    parents.push({
      label: 'Grupo Corporativo',
      value: org.grupo_corporativo,
      symbol: '🏛️',
    });
  }

  const canArchive = canArchiveRecord(props.profile);
  const archiveBtnHtml = canArchive
    ? renderArchivarButtonHtml({
        tableName: 'organizacion',
        recordId: org.id,
        entityLabel: 'Organización Cliente',
        recordTitle: org.nombre,
        recordSubtitle: `RIF: ${org.rif}`,
      })
    : '';

  const recordActionsHtml = isStaff
    ? isEditing
      ? `
        <button
          type="button"
          id="cancelEditOrgBtn"
          class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
        >
          ✕ Cancelar Edición
        </button>
      `
      : `
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="startEditOrgBtn"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <span aria-hidden="true">✏️</span>
            <span>Editar</span>
          </button>
          ${archiveBtnHtml}
        </div>
      `
    : '';

  const feedbackHtml = `
    ${
      state.saveSuccessMessage
        ? `
      <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
        <span>✓</span>
        <span>${escapeHtml(state.saveSuccessMessage)}</span>
      </div>
    `
        : ''
    }
    ${
      state.editErrorMessage
        ? `
      <div class="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
        <span>✕</span>
        <span>${escapeHtml(state.editErrorMessage)}</span>
      </div>
    `
        : ''
    }
  `;

  return renderDetailPageTemplate({
    entityType: 'Organización Cliente',
    entitySymbol: '🏢',
    title: org.nombre,
    eyebrowCode: `RIF: ${org.rif}`,
    subtitle: `Sector Principal: Sector ${org.sector_iaf_numero || '—'} · ${org.sector_principal || 'No especificado'} · ${orgCertificates.length} certificado${orgCertificates.length === 1 ? '' : 's'} en total`,
    statusBadge: {
      label: activeBadge.label,
      badgeClass: activeBadge.badgeClass,
      symbol: activeBadge.symbol,
    },
    backButton: {
      label: 'Volver a Organizaciones',
      nav: 'certificacion',
      subview: 'organizations',
      action: 'back-to-org-list',
    },
    parents,
    tableName: 'organizacion',
    recordId: org.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml: isEditing
      ? renderEditForm(org, currentFormData)
      : renderReadOnlyAttributes(org, activeCount, orgCertificates.length),
    childTabs: [
      {
        id: 'certificados',
        label: 'Certificados',
        symbol: '📜',
        count: orgCertificates.length,
      },
      {
        id: 'auditorias',
        label: 'Auditorías',
        symbol: '🗓️',
        count: orgAudits.length,
      },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-org-tab',
    renderChildTabContent: (tabId) =>
      tabId === 'auditorias'
        ? renderChildAuditsTable(orgAudits, org)
        : renderChildCertificatesTable(orgCertificates, org),
  });
}

/**
 * Read-Only Attributes Grid for Record Zone
 */
function renderReadOnlyAttributes(
  org: OrganizacionEntity,
  activeCount: number,
  totalCount: number
): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
      <!-- Legal Name -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Razón Social:</span>
        <p class="text-xs font-bold text-slate-900">${escapeHtml(org.nombre)}</p>
      </div>

      <!-- RIF / NIF -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">RIF / NIF Fiscal:</span>
        <p class="text-xs font-mono font-bold text-slate-900">${escapeHtml(org.rif)}</p>
      </div>

      <!-- Website -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Sitio Web Corporativo:</span>
        <p class="text-xs font-medium text-slate-900">
          ${
            org.sitio_web
              ? `<a href="https://${escapeHtml(org.sitio_web.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline flex items-center gap-1">
                  <span>🌐</span>
                  <span>${escapeHtml(org.sitio_web)}</span>
                </a>`
              : '<span class="text-slate-400 italic">No especificado</span>'
          }
        </p>
      </div>

      <!-- Primary Contact -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Contacto Principal:</span>
        <p class="text-xs font-bold text-slate-900">${escapeHtml(org.contacto_principal || 'No registrado')}</p>
      </div>

      <!-- Email -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Correo Electrónico:</span>
        <p class="text-xs font-mono font-medium text-slate-800">${escapeHtml(org.correo_contacto || '—')}</p>
      </div>

      <!-- Phone -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Teléfono de Oficina:</span>
        <p class="text-xs font-mono font-medium text-slate-800">${escapeHtml(org.telefono_contacto || '—')}</p>
      </div>

      <!-- Certificados Activos -->
      <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Certificados Activos / Emitidos:</span>
        <p class="text-xs font-bold text-slate-900 tabular-nums">${activeCount} activos (${totalCount} emitidos)</p>
      </div>

      <!-- Fiscal Address (balanced in 4x2 grid on xl) -->
      <div class="md:col-span-2 xl:col-span-1 p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-0.5">
        <span class="text-[10px] uppercase font-bold text-slate-400">Dirección Fiscal de la Sede Principal:</span>
        <p class="text-xs font-medium text-slate-800">${escapeHtml(org.direccion_fiscal || 'No especificada')}</p>
      </div>
    </div>
  `;
}

/**
 * Edit Mode Form for Zone 3
 */
function renderEditForm(
  org: OrganizacionEntity,
  formData: Partial<OrganizacionEntity>
): string {
  return `
    <form id="editOrgForm" class="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Razón Social -->
        <div class="space-y-1">
          <label for="edit_org_nombre" class="block text-xs font-bold text-slate-700">Razón Social *</label>
          <input
            type="text"
            id="edit_org_nombre"
            name="nombre"
            required
            value="${escapeHtml(formData.nombre || org.nombre)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- RIF / NIF -->
        <div class="space-y-1">
          <label for="edit_org_rif" class="block text-xs font-bold text-slate-700">RIF / NIF Fiscal *</label>
          <input
            type="text"
            id="edit_org_rif"
            name="rif"
            required
            value="${escapeHtml(formData.rif || org.rif)}"
            placeholder="Ej: J-40192831-2"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Sitio Web -->
        <div class="space-y-1">
          <label for="edit_org_sitio_web" class="block text-xs font-bold text-slate-700">Sitio Web</label>
          <input
            type="text"
            id="edit_org_sitio_web"
            name="sitio_web"
            value="${escapeHtml(formData.sitio_web || org.sitio_web || '')}"
            placeholder="www.empresa.com"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Contacto Principal -->
        <div class="space-y-1">
          <label for="edit_org_contacto" class="block text-xs font-bold text-slate-700">Contacto Principal</label>
          <input
            type="text"
            id="edit_org_contacto"
            name="contacto_principal"
            value="${escapeHtml(formData.contacto_principal || org.contacto_principal || '')}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Correo Electrónico -->
        <div class="space-y-1">
          <label for="edit_org_correo" class="block text-xs font-bold text-slate-700">Correo Electrónico</label>
          <input
            type="email"
            id="edit_org_correo"
            name="correo_contacto"
            value="${escapeHtml(formData.correo_contacto || org.correo_contacto || '')}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Teléfono -->
        <div class="space-y-1">
          <label for="edit_org_telefono" class="block text-xs font-bold text-slate-700">Teléfono</label>
          <input
            type="text"
            id="edit_org_telefono"
            name="telefono_contacto"
            value="${escapeHtml(formData.telefono_contacto || org.telefono_contacto || '')}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Grupo Corporativo -->
        <div class="space-y-1">
          <label for="edit_org_grupo" class="block text-xs font-bold text-slate-700">Grupo Corporativo / Holding</label>
          <input
            type="text"
            id="edit_org_grupo"
            name="grupo_corporativo"
            value="${escapeHtml(formData.grupo_corporativo || org.grupo_corporativo || '')}"
            placeholder="Independiente"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>

        <!-- Dirección Fiscal (Span 2) -->
        <div class="md:col-span-2 space-y-1">
          <label for="edit_org_direccion" class="block text-xs font-bold text-slate-700">Dirección Fiscal Sede Principal *</label>
          <input
            type="text"
            id="edit_org_direccion"
            name="direccion_fiscal"
            required
            value="${escapeHtml(formData.direccion_fiscal || org.direccion_fiscal || '')}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          id="cancelEditOrgBtnSecondary"
          class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          💾 Guardar Atributos
        </button>
      </div>
    </form>
  `;
}

/**
 * Child Tab 1: Certificados de la Organización
 */
function renderChildCertificatesTable(
  certificados: CertificadoSummary[],
  org: OrganizacionEntity
): string {
  if (certificados.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">📜</div>
        <h4 class="text-xs font-bold text-slate-800">No hay certificados registrados para esta organización</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          La organización ${escapeHtml(org.nombre)} aún no cuenta con certificados de conformidad expedidos o en estudio.
        </p>
      </div>
    `;
  }

  return `
    <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Código de Certificado</th>
              <th scope="col" class="py-3 px-4">Norma de Gestión</th>
              <th scope="col" class="py-3 px-4">Vigencia</th>
              <th scope="col" class="py-3 px-4 text-center">Sedes Multisitio</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
              <th scope="col" class="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${certificados
              .map((c) => {
                const estatusClean = (c.estatus || 'Activo').toLowerCase();
                let statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                if (estatusClean.includes('estudio') || estatusClean.includes('proceso')) {
                  statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                } else if (estatusClean.includes('suspendido')) {
                  statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                } else if (estatusClean.includes('cancelado') || estatusClean.includes('inactivo')) {
                  statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                }

                const emision = c.fecha_emision ? c.fecha_emision.slice(0, 4) : '2024';
                const vencimiento = c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 4) : '2027';

                return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Código -->
                  <td class="py-3 px-4 font-mono font-bold text-slate-900">
                    <button
                      type="button"
                      data-action="drilldown-to-cert"
                      data-cert-id="${escapeHtml(c.id)}"
                      data-cert-code="${escapeHtml(c.numero_certificado)}"
                      class="text-indigo-600 hover:text-indigo-800 hover:underline font-bold font-mono cursor-pointer flex items-center gap-1.5"
                      title="Navegar al certificado y añadir a la ruta de exploración"
                    >
                      <span>📜</span>
                      <span>${escapeHtml(c.numero_certificado)}</span>
                    </button>
                  </td>

                  <!-- Norma -->
                  <td class="py-3 px-4 font-semibold text-slate-800">
                    <span>${escapeHtml(c.norma)}</span>
                    ${
                      c.esquema
                        ? `<div class="text-[10px] text-slate-400 font-normal">${escapeHtml(c.esquema)}</div>`
                        : ''
                    }
                  </td>

                  <!-- Vigencia -->
                  <td class="py-3 px-4 font-mono text-slate-600">
                    ${emision} — ${vencimiento}
                  </td>

                  <!-- Sedes -->
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                      c.multisitio
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }">
                      ${c.multisitio ? `${c.sitios_count || 2} sedes multisitio` : 'Sede Principal (HQ)'}
                    </span>
                  </td>

                  <!-- Estatus -->
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClass}">
                      ${escapeHtml(c.estatus)}
                    </span>
                  </td>

                  <!-- Acción -->
                  <td class="py-3 px-4 text-right">
                    <button
                      type="button"
                      data-action="drilldown-to-cert"
                      data-cert-id="${escapeHtml(c.id)}"
                      data-cert-code="${escapeHtml(c.numero_certificado)}"
                      class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Inspeccionar →
                    </button>
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
 * Child Tab 2: Auditorías de la Organización (List-Only)
 */
function renderChildAuditsTable(
  auditorias: ProgramacionAuditEntity[],
  org: OrganizacionEntity
): string {
  if (auditorias.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">🗓️</div>
        <h4 class="text-xs font-bold text-slate-800">No hay auditorías programadas para esta organización</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          ${escapeHtml(org.nombre)} aún no registra jornadas de auditoría en el cronograma operativo.
        </p>
      </div>
    `;
  }

  return `
    <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Código Auditoría</th>
              <th scope="col" class="py-3 px-4">Certificado</th>
              <th scope="col" class="py-3 px-4">Modalidad</th>
              <th scope="col" class="py-3 px-4">Fechas</th>
              <th scope="col" class="py-3 px-4">Auditor Líder</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
              <th scope="col" class="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditorias
              .map((aud) => {
                const isCompleted = aud.estatus === 'Completado' || aud.estatus === 'Cerrado';
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(aud.id)}"
                        class="text-indigo-600 hover:text-indigo-800 hover:underline font-bold font-mono cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>🗓️</span>
                        <span>${escapeHtml(aud.codigo_auditoria)}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">${escapeHtml(aud.numero_certificado)}</td>
                    <td class="py-3 px-4 text-slate-800 whitespace-nowrap">
                      <span class="font-semibold">${escapeHtml(aud.tipo_auditoria)}</span>
                      <span class="text-slate-400"> · </span>
                      <span class="text-slate-600">${escapeHtml(aud.metodologia)}</span>
                    </td>
                    <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      ${escapeHtml(aud.fecha_inicio)} → ${escapeHtml(aud.fecha_fin)}
                    </td>
                    <td class="py-3 px-4 text-slate-800 whitespace-nowrap">${escapeHtml(aud.auditor_lider)}</td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }">
                        ${escapeHtml(aud.estatus)}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(aud.id)}"
                        class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Inspeccionar →
                      </button>
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
