import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  formatRiskCategoryBadge,
  INITIAL_SUBSECTORES_IAF,
  type NormaEntity,
  type OrganismoAcreditacion,
  type SectorIafEntity,
  type SubsectorIafEntity,
} from '../lib/extraDomain';
import {
  ALL_SECTORS_FACET_VALUE,
  ALL_SECTORS_LABEL,
  evaluateAccreditationExpiry,
  filterCoveredCertificatesForAccreditation,
  formatAcreditacionDirectoryStatusBadge,
  formatAcreditacionExpiryBadge,
  formatAcreditacionSectorLabel,
  getAcreditacionSectorFacetValue,
  getSubsectoresForAccreditation,
  type AcreditacionDetailEntity,
} from '../lib/acreditacionDomain';
import type { CertificadoDetailEntity } from '../lib/multisiteSampling';
import {
  computeReactiveFacetCounts,
  filterRecordsWithFacets,
  sortItems,
  type ColumnDefinition,
  type MultiViewFacetCategory,
  type MultiViewFacetOptionSpec,
  type MultiViewSelectionMap,
  type SortDirection,
} from '../lib/universalTemplate';
import { renderUniversalTemplate } from './universalTemplate';
import { renderDetailPageTemplate, type DetailParentChip } from './detailTemplate';
import {
  extractUniversalArchiveProps,
  type ArchiveMultiViewConfig,
} from '../lib/archiveGovernance';

export type AcreditacionChildTab = 'certificados' | 'subsectores';

export interface AcreditacionViewState {
  selectedAccreditationId: string | null;
  activeChildTab?: AcreditacionChildTab;
  query: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
  isCreating?: boolean;
  createErrorMessage?: string | null;
  createSuccessMessage?: string | null;
  organismoMode?: 'existing' | 'new';
  isEditingAttributes?: boolean;
  editFormData?: {
    numero_acreditacion?: string;
    fecha_concesion?: string;
    fecha_vencimiento?: string | null;
    estatus?: string;
  };
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  archiveConfirmOpen?: boolean;
  archiveErrorMessage?: string | null;
}

export interface AcreditacionViewProps {
  profile: UserProfile;
  state: AcreditacionViewState;
  acreditaciones: AcreditacionDetailEntity[];
  organismos: OrganismoAcreditacion[];
  normas: NormaEntity[];
  sectores: SectorIafEntity[];
  certificates?: ReadonlyArray<CertificadoDetailEntity>;
  subsectores?: ReadonlyArray<SubsectorIafEntity>;
  loading?: boolean;
  archiveConfig?: ArchiveMultiViewConfig;
}

export function renderAcreditacionView(props: AcreditacionViewProps): string {
  const {
    profile,
    state,
    acreditaciones,
    organismos,
    normas,
    sectores,
    certificates = [],
    subsectores = INITIAL_SUBSECTORES_IAF,
    loading,
    archiveConfig,
  } = props;
  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');

  const activeAccreditations = acreditaciones.filter((a) => !a.deleted_at);

  if (state.selectedAccreditationId) {
    const selected = activeAccreditations.find((a) => a.id === state.selectedAccreditationId);
    if (selected) {
      return renderAcreditacionDetailView({
        acr: selected,
        state,
        isStaff,
        certificates,
        subsectores,
      });
    }
  }

  return renderAcreditacionDirectoryView({
    state,
    acreditaciones: activeAccreditations,
    organismos,
    normas,
    sectores,
    isStaff,
    loading,
    archiveConfig,
  });
}

function renderCreateAcreditacionForm(params: {
  organismos: OrganismoAcreditacion[];
  normas: NormaEntity[];
  sectores: SectorIafEntity[];
  organismoMode: 'existing' | 'new';
  errorMessage?: string | null;
}): string {
  const { organismos, normas, sectores, organismoMode, errorMessage } = params;
  const todayIso = new Date().toISOString().slice(0, 10);

  return `
    <div class="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="flex items-center justify-between gap-2">
        <div class="space-y-0.5">
          <h2 class="text-sm font-bold text-slate-900">Registrar Nueva Acreditación ISO/IEC 17011</h2>
          <p class="text-[11px] text-slate-600">
            Vincule un organismo acreditador reconocido con la norma certificable y el alcance técnico IAF.
          </p>
        </div>
        <button
          type="button"
          data-action="close-create-acreditacion"
          class="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
        >
          ✕ Cancelar
        </button>
      </div>

      ${
        errorMessage
          ? `<div role="alert" class="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-800">${escapeHtml(errorMessage)}</div>`
          : ''
      }

      <form id="createAcreditacionForm" class="space-y-4">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-semibold text-slate-700">Organismo de Acreditación *</span>
            <div class="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]" role="group" aria-label="Modo de organismo acreditador">
              <button
                type="button"
                data-action="set-accred-org-mode"
                data-org-mode="existing"
                aria-pressed="${organismoMode === 'existing' ? 'true' : 'false'}"
                class="px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  organismoMode === 'existing'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                Organismo Existente
              </button>
              <button
                type="button"
                data-action="set-accred-org-mode"
                data-org-mode="new"
                aria-pressed="${organismoMode === 'new' ? 'true' : 'false'}"
                class="px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  organismoMode === 'new'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }"
              >
                + Nuevo Organismo
              </button>
            </div>
          </div>

          ${
            organismoMode === 'new'
              ? `
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/80 border border-indigo-200/80 rounded-lg p-3">
                  <div>
                    <label for="createAcredOrgCodigoInput" class="block text-xs font-semibold text-slate-700 mb-1">Código *</label>
                    <input id="createAcredOrgCodigoInput" name="organismo_codigo" type="text" required maxlength="20" placeholder="Ej. ONAC" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono uppercase" />
                  </div>
                  <div class="sm:col-span-2">
                    <label for="createAcredOrgNombreInput" class="block text-xs font-semibold text-slate-700 mb-1">Nombre del Organismo *</label>
                    <input id="createAcredOrgNombreInput" name="organismo_nombre" type="text" required placeholder="Ej. Organismo Nacional de Acreditación" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
                  </div>
                  <div>
                    <label for="createAcredOrgPaisInput" class="block text-xs font-semibold text-slate-700 mb-1">País *</label>
                    <input id="createAcredOrgPaisInput" name="organismo_pais" type="text" required placeholder="Ej. Colombia" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
                  </div>
                  <div class="sm:col-span-4">
                    <label for="createAcredOrgWebInput" class="block text-xs font-semibold text-slate-700 mb-1">Sitio Web Oficial (Opcional)</label>
                    <input id="createAcredOrgWebInput" name="organismo_sitio_web" type="url" placeholder="https://www.ejemplo.org" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2" />
                  </div>
                </div>
              `
              : `
                <div>
                  <label for="createAcredOrgSelect" class="sr-only">Seleccionar organismo de acreditación</label>
                  <select id="createAcredOrgSelect" name="id_organismo" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                    ${organismos
                      .map(
                        (org) =>
                          `<option value="${escapeHtml(org.id)}">${escapeHtml(org.codigo)} — ${escapeHtml(org.nombre)} (${escapeHtml(org.pais)})</option>`
                      )
                      .join('')}
                  </select>
                </div>
              `
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createAcredNumeroInput" class="block text-xs font-semibold text-slate-700 mb-1">N° de Acreditación *</label>
            <input id="createAcredNumeroInput" name="numero_acreditacion" type="text" required placeholder="Ej. 01/C-SC002" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
          <div>
            <label for="createAcredNormaSelect" class="block text-xs font-semibold text-slate-700 mb-1">Norma ISO *</label>
            <select id="createAcredNormaSelect" name="id_norma" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              ${normas
                .map(
                  (norma) =>
                    `<option value="${escapeHtml(norma.id)}">${escapeHtml(norma.codigo)} — ${escapeHtml(norma.titulo)}</option>`
                )
                .join('')}
            </select>
          </div>
          <div>
            <label for="createAcredSectorSelect" class="block text-xs font-semibold text-slate-700 mb-1">Sector IAF</label>
            <select id="createAcredSectorSelect" name="id_sector_iaf" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="">${escapeHtml(ALL_SECTORS_LABEL)} (Cobertura general)</option>
              ${sectores
                .map(
                  (sec) =>
                    `<option value="${escapeHtml(sec.id)}">Sector ${sec.sector} — ${escapeHtml(sec.descripcion)}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="createAcredFechaConcesionInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Concesión *</label>
            <input id="createAcredFechaConcesionInput" name="fecha_concesion" type="date" required value="${todayIso}" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
          <div>
            <label for="createAcredFechaVencimientoInput" class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Vencimiento</label>
            <input id="createAcredFechaVencimientoInput" name="fecha_vencimiento" type="date" class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono" />
          </div>
          <div>
            <label for="createAcredEstatusSelect" class="block text-xs font-semibold text-slate-700 mb-1">Estatus *</label>
            <select id="createAcredEstatusSelect" name="estatus" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
              <option value="Activa">Activa</option>
              <option value="Suspendida">Suspendida</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            data-action="close-create-acreditacion"
            class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Guardar Acreditación
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderAcreditacionDirectoryView(params: {
  state: AcreditacionViewState;
  acreditaciones: AcreditacionDetailEntity[];
  organismos: OrganismoAcreditacion[];
  normas: NormaEntity[];
  sectores: SectorIafEntity[];
  isStaff: boolean;
  loading?: boolean;
  archiveConfig?: ArchiveMultiViewConfig;
}): string {
  const { state, acreditaciones, organismos, normas, sectores, isStaff, loading, archiveConfig } = params;

  // Build facet option lists dynamically so both live records and catalog choices appear cleanly
  const orgMap = new Map<string, string>();
  for (const org of organismos) {
    orgMap.set(org.codigo, `${org.codigo} (${org.pais})`);
  }
  for (const acr of acreditaciones) {
    if (!orgMap.has(acr.organismo_codigo)) {
      orgMap.set(acr.organismo_codigo, `${acr.organismo_codigo} (${acr.organismo_pais})`);
    }
  }
  const orgOptions: MultiViewFacetOptionSpec[] = Array.from(orgMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([codigo, label]) => ({ value: codigo, label }));

  const normaSet = new Set<string>();
  for (const n of normas) {
    normaSet.add(n.codigo || n.norma);
  }
  for (const acr of acreditaciones) {
    normaSet.add(acr.norma_codigo);
  }
  const normaOptions: MultiViewFacetOptionSpec[] = Array.from(normaSet)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((codigo) => ({ value: codigo, label: codigo }));

  const sectorMap = new Map<number, string>();
  for (const sec of sectores) {
    sectorMap.set(sec.sector, sec.descripcion);
  }
  for (const acr of acreditaciones) {
    if (acr.sector_numero !== null && !sectorMap.has(acr.sector_numero)) {
      sectorMap.set(
        acr.sector_numero,
        acr.sector_descripcion || `Sector IAF ${acr.sector_numero}`
      );
    }
  }
  const sectorOptions: MultiViewFacetOptionSpec[] = [
    { value: ALL_SECTORS_FACET_VALUE, label: ALL_SECTORS_LABEL },
    ...Array.from(sectorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, desc]) => ({
        value: String(num),
        label: `Sector ${num} · ${desc}`,
      })),
  ];

  const statusOptions: MultiViewFacetOptionSpec[] = [
    { value: 'Activa', label: 'Activa' },
    { value: 'Suspendida', label: 'Suspendida' },
    { value: 'Vencida', label: 'Vencida' },
    ...(acreditaciones.some((a) => a.estatus === 'En Renovación')
      ? [{ value: 'En Renovación', label: 'En Renovación' }]
      : []),
  ];

  const facetCategories: MultiViewFacetCategory<AcreditacionDetailEntity>[] = [
    {
      id: 'organismo',
      label: 'Organismo de Acreditación',
      options: orgOptions,
      extractValues: (acr) => acr.organismo_codigo,
    },
    {
      id: 'norma',
      label: 'Norma ISO',
      options: normaOptions,
      extractValues: (acr) => acr.norma_codigo,
    },
    {
      id: 'sector_iaf',
      label: 'Sector IAF',
      options: sectorOptions,
      extractValues: (acr) => getAcreditacionSectorFacetValue(acr),
    },
    {
      id: 'estatus',
      label: 'Estatus',
      options: statusOptions,
      extractValues: (acr) => acr.estatus,
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections ?? {};

  const searchOptions = {
    getSearchableText: (acr: AcreditacionDetailEntity) => {
      const sectorLabel = formatAcreditacionSectorLabel(
        acr.sector_numero,
        acr.sector_descripcion
      );
      return [
        acr.numero_acreditacion,
        acr.organismo_codigo,
        acr.organismo_nombre,
        acr.organismo_pais,
        acr.norma_codigo,
        acr.norma_titulo,
        sectorLabel.shortLabel,
        acr.sector_descripcion || ALL_SECTORS_LABEL,
        acr.estatus,
      ].join(' ');
    },
  };

  const filtered = filterRecordsWithFacets(
    acreditaciones,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const sorted = sortItems(
    filtered,
    state.sortColumn,
    state.sortDirection,
    (item, col) => {
      switch (col) {
        case 'numero_acreditacion':
          return item.numero_acreditacion;
        case 'organismo':
          return item.organismo_codigo;
        case 'norma':
          return item.norma_codigo;
        case 'sector_iaf':
          return item.sector_numero ?? -1;
        case 'fecha_concesion':
          return item.fecha_concesion;
        case 'fecha_vencimiento':
          return item.fecha_vencimiento || '9999-12-31';
        case 'estatus':
          return item.estatus;
        case 'certificados':
          return item.activeCertificatesCount;
        default:
          return (item as unknown as Record<string, unknown>)[col];
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    acreditaciones,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<AcreditacionDetailEntity>[] = [
    {
      id: 'numero_acreditacion',
      header: 'Acreditación',
      sortable: true,
      className: '!px-2 whitespace-nowrap',
      renderCell: (acr) => `
        <button
          type="button"
          data-action="select-accreditation"
          data-accreditation-id="${escapeHtml(acr.id)}"
          class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer inline-flex items-center gap-1 text-left whitespace-nowrap"
        >
          <span aria-hidden="true">🏅</span>
          <span>${escapeHtml(acr.numero_acreditacion)}</span>
        </button>
      `,
    },
    {
      id: 'organismo',
      header: 'Organismo',
      sortable: true,
      className: '!px-2',
      renderCell: (acr) => `
        <div class="space-y-0.5 max-w-[8.75rem]">
          <div class="font-bold text-slate-900 truncate" title="${escapeHtml(acr.organismo_codigo)} — ${escapeHtml(acr.organismo_pais)}">${escapeHtml(acr.organismo_codigo)} · ${escapeHtml(acr.organismo_pais)}</div>
          <div class="text-[11px] text-slate-500 truncate" title="${escapeHtml(acr.organismo_nombre)}">${escapeHtml(acr.organismo_nombre)}</div>
        </div>
      `,
    },
    {
      id: 'norma',
      header: 'Norma',
      sortable: true,
      className: '!px-2 whitespace-nowrap',
      renderCell: (acr) => `
        <span class="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono text-[11px] font-bold whitespace-nowrap">
          ${escapeHtml(acr.norma_codigo)}
        </span>
      `,
    },
    {
      id: 'sector_iaf',
      header: 'Sector IAF',
      sortable: true,
      className: '!px-2',
      renderCell: (acr) => {
        const sectorMeta = formatAcreditacionSectorLabel(
          acr.sector_numero,
          acr.sector_descripcion
        );
        return `
          <div class="space-y-0.5 max-w-[7.5rem]">
            <div class="font-semibold text-slate-800 truncate">${escapeHtml(sectorMeta.shortLabel)}</div>
            <div class="text-[11px] text-slate-500 truncate" title="${escapeHtml(sectorMeta.detailLabel)}">${escapeHtml(sectorMeta.detailLabel)}</div>
          </div>
        `;
      },
    },
    {
      id: 'fecha_concesion',
      header: 'Concesión',
      sortable: true,
      className: '!px-2 whitespace-nowrap',
      renderCell: (acr) => `
        <span class="font-mono text-[11px] text-slate-700 tabular-nums whitespace-nowrap">${escapeHtml(acr.fecha_concesion)}</span>
      `,
    },
    {
      id: 'fecha_vencimiento',
      header: 'Vencimiento',
      sortable: true,
      className: '!px-2 whitespace-nowrap',
      renderCell: (acr) => {
        const expiryEval = evaluateAccreditationExpiry(acr.fecha_vencimiento);
        const expiryBadge = formatAcreditacionExpiryBadge(expiryEval);
        return `
          <div class="space-y-0.5 whitespace-nowrap">
            <div class="font-mono text-[11px] text-slate-800 font-medium tabular-nums">${escapeHtml(acr.fecha_vencimiento || 'Indefinida')}</div>
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${expiryBadge.badgeClass}">
              ${escapeHtml(expiryBadge.label)}
            </span>
          </div>
        `;
      },
    },
    {
      id: 'estatus',
      header: 'Estatus',
      sortable: true,
      align: 'center',
      className: '!px-2 whitespace-nowrap',
      renderCell: (acr) => {
        const badge = formatAcreditacionDirectoryStatusBadge(acr.estatus);
        return `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${badge.badgeClass}">
            <span>${badge.symbol}</span>
            <span>${escapeHtml(badge.label)}</span>
          </span>
        `;
      },
    },
    {
      id: 'certificados',
      header: 'Certs.',
      sortable: true,
      align: 'center',
      className: '!px-2 whitespace-nowrap',
      renderCell: (acr) => `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono tabular-nums" title="Certificados activos cubiertos por esta acreditación">
          <span>${acr.activeCertificatesCount}</span>
        </span>
      `,
    },
  ];

  const renderCard = (acr: AcreditacionDetailEntity): string => {
    const statusBadge = formatAcreditacionDirectoryStatusBadge(acr.estatus);
    const expiryEval = evaluateAccreditationExpiry(acr.fecha_vencimiento);
    const expiryBadge = formatAcreditacionExpiryBadge(expiryEval);
    const sectorMeta = formatAcreditacionSectorLabel(
      acr.sector_numero,
      acr.sector_descripcion
    );

    return `
      <article
        data-accreditation-card="true"
        data-accreditation-id="${escapeHtml(acr.id)}"
        class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs hover:border-indigo-200 transition-all cursor-pointer space-y-3.5 flex flex-col justify-between"
      >
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-bold font-mono">
                  <span aria-hidden="true">🏛️</span>
                  <span>${escapeHtml(acr.organismo_codigo)}</span>
                </span>
                <span class="text-[11px] font-medium text-slate-500">${escapeHtml(acr.organismo_pais)}</span>
              </div>
              <h3 class="text-sm font-bold text-slate-900 font-mono truncate">
                ${escapeHtml(acr.numero_acreditacion)}
              </h3>
              <p class="text-xs text-slate-600 truncate" title="${escapeHtml(acr.organismo_nombre)}">
                ${escapeHtml(acr.organismo_nombre)}
              </p>
            </div>

            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.badgeClass} shrink-0">
              <span>${statusBadge.symbol}</span>
              <span>${escapeHtml(statusBadge.label)}</span>
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div class="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Norma ISO</div>
              <div class="font-mono font-bold text-indigo-800 truncate">${escapeHtml(acr.norma_codigo)}</div>
            </div>
            <div class="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sector IAF</div>
              <div class="font-semibold text-slate-800 truncate" title="${escapeHtml(sectorMeta.detailLabel)}">${escapeHtml(sectorMeta.shortLabel)}</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
            <div>
              <span class="text-slate-400">Concesión:</span>
              <span class="font-mono font-semibold text-slate-800 tabular-nums">${escapeHtml(acr.fecha_concesion)}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">Vence:</span>
              <span class="font-mono font-semibold text-slate-800 tabular-nums">${escapeHtml(acr.fecha_vencimiento || 'Indefinida')}</span>
              <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${expiryBadge.badgeClass}">
                ${escapeHtml(expiryBadge.label)}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 tabular-nums">
            <span aria-hidden="true">📜</span>
            <span><strong class="font-mono text-slate-900">${acr.activeCertificatesCount}</strong> ${
              acr.activeCertificatesCount === 1 ? 'certificado activo' : 'certificados activos'
            }</span>
          </span>
          <button
            type="button"
            data-action="select-accreditation"
            data-accreditation-id="${escapeHtml(acr.id)}"
            aria-label="Ver detalle de acreditación ${escapeHtml(acr.numero_acreditacion)}"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Ver Alcance</span>
            <span>→</span>
          </button>
        </div>
      </article>
    `;
  };

  const actionsHtml = isStaff
    ? `
      <button
        type="button"
        id="openCreateAcreditacionBtn"
        data-action="open-create-acreditacion"
        class="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
      >
        <span>+ Nueva Acreditación</span>
      </button>
    `
    : '';

  const successBannerHtml = state.createSuccessMessage
    ? `
      <div class="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2">
        <span>✓ ${escapeHtml(state.createSuccessMessage)}</span>
      </div>
    `
    : '';

  const inlineFormHtml =
    isStaff && state.isCreating
      ? renderCreateAcreditacionForm({
          organismos,
          normas,
          sectores,
          organismoMode: state.organismoMode || 'existing',
          errorMessage: state.createErrorMessage,
        })
      : successBannerHtml;

  return renderUniversalTemplate({
    domainKey: 'acreditaciones',
    title: 'Acreditaciones Vigentes',
    subtitle:
      'Alcances de acreditación oficial ISO/IEC 17011 ante organismos internacionales (ENAC, UKAS, ANAB) vinculados a normas ISO y sectores técnicos IAF.',
    entityLabel: 'acreditaciones registradas',
    searchQuery: state.query,
    searchPlaceholder:
      'Buscar por N° acreditación, organismo (ENAC, UKAS...), norma o sector IAF...',
    searchInputId: 'acreditacionSearchInput',
    clearSearchBtnId: 'clearAcreditacionSearchBtn',
    totalCount: acreditaciones.length,
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
    emptyStateTitle: 'No se encontraron acreditaciones',
    emptyStateMessage:
      'No hay alcances de acreditación que coincidan con la búsqueda o facetas seleccionadas.',
    actionsHtml,
    inlineFormHtml,
    loading,
    loadingMessage: 'Cargando acreditaciones registradas...',
    ...extractUniversalArchiveProps(archiveConfig, 'acreditaciones'),
  });
}

function renderAcreditacionDetailView(params: {
  acr: AcreditacionDetailEntity;
  state: AcreditacionViewState;
  isStaff: boolean;
  certificates: ReadonlyArray<CertificadoDetailEntity>;
  subsectores: ReadonlyArray<SubsectorIafEntity>;
}): string {
  const { acr, state, isStaff, certificates, subsectores } = params;
  const statusBadge = formatAcreditacionDirectoryStatusBadge(acr.estatus);
  const expiryEval = evaluateAccreditationExpiry(acr.fecha_vencimiento);
  const expiryBadge = formatAcreditacionExpiryBadge(expiryEval);
  const sectorMeta = formatAcreditacionSectorLabel(
    acr.sector_numero,
    acr.sector_descripcion
  );

  const coveredCerts = filterCoveredCertificatesForAccreditation(acr, certificates);
  const scopedSubsectores = getSubsectoresForAccreditation(acr, subsectores);
  const activeTab: AcreditacionChildTab =
    state.activeChildTab === 'subsectores' ? 'subsectores' : 'certificados';
  const isEditing = Boolean(state.isEditingAttributes) && isStaff;

  const parents: DetailParentChip[] = [
    {
      label: 'Organismo de Acreditación',
      value: `${acr.organismo_codigo} — ${acr.organismo_nombre} (${acr.organismo_pais})`,
      symbol: '🏛️',
    },
    {
      label: 'Norma',
      value: acr.norma_codigo,
      symbol: '📘',
      navAction: {
        nav: 'extra',
        subview: 'standards',
        entityType: 'norma',
        entityId: acr.id_norma,
      },
    },
    acr.id_sector_iaf || acr.sector_numero !== null
      ? {
          label: 'Sector IAF',
          value: `Sector ${acr.sector_numero ?? '—'}${acr.sector_descripcion ? ` · ${acr.sector_descripcion}` : ''}`,
          symbol: '🏭',
          navAction: {
            nav: 'extra',
            subview: 'iaf',
            entityType: 'sector_iaf',
            entityId: acr.id_sector_iaf || String(acr.sector_numero),
            sectorNumber: acr.sector_numero ?? undefined,
          },
        }
      : {
          label: 'Sector IAF',
          value: ALL_SECTORS_LABEL,
          symbol: '🌐',
        },
  ];

  const normalizedWebsiteUrl = acr.organismo_sitio_web
    ? /^https?:\/\//i.test(acr.organismo_sitio_web.trim())
      ? acr.organismo_sitio_web.trim()
      : `https://${acr.organismo_sitio_web.trim()}`
    : null;

  const parentMetaHtml = normalizedWebsiteUrl
    ? `
      <a
        href="${escapeHtml(normalizedWebsiteUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
      >
        <span aria-hidden="true">🌐</span>
        <span>Sitio web ${escapeHtml(acr.organismo_codigo)}</span>
        <span aria-hidden="true">↗</span>
      </a>
    `
    : '';

  const recordActionsHtml = isStaff
    ? `
      <div class="flex flex-wrap items-center gap-2">
        ${
          isEditing
            ? `
              <button
                type="button"
                id="cancelEditAcreditacionBtn"
                class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Cancelar Edición
              </button>
            `
            : `
              <button
                type="button"
                id="startEditAcreditacionBtn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <span aria-hidden="true">✏️</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                data-action="open-archive-accreditacion"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <span aria-hidden="true">🗄️</span>
                <span>Archivar</span>
              </button>
            `
        }
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
          <div role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
            <span>✕</span>
            <span>${escapeHtml(state.editErrorMessage)}</span>
          </div>
        `
        : ''
    }
    ${
      state.archiveErrorMessage
        ? `
          <div role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
            <span>✕</span>
            <span>${escapeHtml(state.archiveErrorMessage)}</span>
          </div>
        `
        : ''
    }
    ${
      isStaff && state.archiveConfirmOpen
        ? `
          <div class="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5">
                <h4 class="text-xs font-bold text-rose-900">Confirmar archivo lógico de acreditación</h4>
                <p class="text-[11px] text-rose-800">
                  La acreditación <strong>${escapeHtml(acr.numero_acreditacion)}</strong> pasará a estado archivado (soft-delete) preservando la bitácora forense ISO/IEC 17021-1.
                </p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <div class="sm:col-span-2">
                <label for="archiveAcreditacionReasonInput" class="sr-only">Motivo de archivo</label>
                <input
                  id="archiveAcreditacionReasonInput"
                  type="text"
                  placeholder="Motivo de archivo (opcional, ej. Retiro voluntario del alcance)"
                  class="w-full text-xs rounded-lg border border-rose-300 bg-white px-2.5 py-1.5"
                />
              </div>
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  id="cancelArchiveAcreditacionBtn"
                  class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="confirmArchiveAcreditacionBtn"
                  class="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
                >
                  Confirmar Archivo
                </button>
              </div>
            </div>
          </div>
        `
        : ''
    }
  `;

  const effectiveCoveredCount =
    certificates.length > 0 ? coveredCerts.length : acr.activeCertificatesCount;

  const customRecordBodyHtml = isEditing
    ? renderEditAcreditacionForm(acr, state.editFormData)
    : renderReadOnlyAcreditacionBody(acr, expiryBadge, sectorMeta, effectiveCoveredCount);

  return renderDetailPageTemplate({
    entityType: 'Acreditación ISO/IEC 17011',
    entitySymbol: '🏅',
    title: acr.numero_acreditacion,
    eyebrowCode: `${acr.organismo_codigo} · ${acr.norma_codigo}`,
    subtitle: `${acr.organismo_nombre} (${acr.organismo_pais}) · ${acr.norma_titulo}`,
    statusBadge: {
      label: statusBadge.label,
      badgeClass: statusBadge.badgeClass,
      symbol: statusBadge.symbol,
    },
    secondaryHeaderBadge: {
      label: expiryBadge.label,
      badgeClass: expiryBadge.badgeClass,
    },
    backButton: {
      label: 'Volver a Acreditaciones Vigentes',
      nav: 'extra',
      subview: 'accreditations',
      action: 'back-to-accreditations-list',
    },
    parents,
    parentMetaHtml,
    tableName: 'acreditacion_norma_iaf',
    recordId: acr.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml,
    childTabs: [
      {
        id: 'certificados',
        label: 'Certificados Amparados',
        symbol: '📜',
        count: coveredCerts.length,
      },
      {
        id: 'subsectores',
        label: 'Sub-Sectores IAF del Alcance',
        symbol: '🧩',
        count: scopedSubsectores.length,
      },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-accred-tab',
    renderChildTabContent: (tabId) =>
      tabId === 'subsectores'
        ? renderAcreditacionSubsectoresTab(acr, scopedSubsectores)
        : renderAcreditacionCertificadosTab(acr, coveredCerts),
  });
}

function renderReadOnlyAcreditacionBody(
  acr: AcreditacionDetailEntity,
  expiryBadge: { label: string; badgeClass: string },
  sectorMeta: { shortLabel: string; detailLabel: string },
  effectiveCoveredCount: number
): string {
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Número de Acreditación</div>
        <div class="text-xs font-mono font-bold text-slate-900">${escapeHtml(acr.numero_acreditacion)}</div>
        <div class="text-[11px] text-slate-500">${escapeHtml(acr.organismo_codigo)} · ${escapeHtml(acr.organismo_pais)}</div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alcance Sectorial IAF</div>
        <div class="text-xs font-bold text-slate-900">${escapeHtml(sectorMeta.shortLabel)}</div>
        <div class="text-[11px] text-slate-500 line-clamp-2">${escapeHtml(sectorMeta.detailLabel)}</div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vigencia & Expiración</div>
        <div class="text-xs font-mono font-semibold text-slate-800 tabular-nums">
          ${escapeHtml(acr.fecha_concesion)} → ${escapeHtml(acr.fecha_vencimiento || 'Indefinida')}
        </div>
        <div>
          <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${expiryBadge.badgeClass}">
            ${escapeHtml(expiryBadge.label)}
          </span>
        </div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Certificados Amparados</div>
        <div class="text-lg font-mono font-bold text-slate-900 tabular-nums">${effectiveCoveredCount}</div>
        <div class="text-[11px] text-slate-500">${
          effectiveCoveredCount === 1
            ? 'Certificado activo cubierto'
            : 'Certificados activos cubiertos'
        }</div>
      </div>
    </div>
  `;
}

function renderEditAcreditacionForm(
  acr: AcreditacionDetailEntity,
  formData?: AcreditacionViewState['editFormData']
): string {
  const numeroValue = formData?.numero_acreditacion ?? acr.numero_acreditacion;
  const concesionValue = formData?.fecha_concesion ?? acr.fecha_concesion;
  const vencimientoValue =
    formData?.fecha_vencimiento !== undefined
      ? formData.fecha_vencimiento || ''
      : acr.fecha_vencimiento || '';
  const estatusValue = formData?.estatus ?? acr.estatus;

  return `
    <form id="editAcreditacionForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="space-y-1">
          <label for="editAccredNumeroInput" class="block text-xs font-bold text-slate-700">N° de Acreditación *</label>
          <input
            id="editAccredNumeroInput"
            name="numero_acreditacion"
            type="text"
            required
            value="${escapeHtml(numeroValue)}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div class="space-y-1">
          <label for="editAccredFechaConcesionInput" class="block text-xs font-bold text-slate-700">Fecha de Concesión *</label>
          <input
            id="editAccredFechaConcesionInput"
            name="fecha_concesion"
            type="date"
            required
            value="${escapeHtml(concesionValue)}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div class="space-y-1">
          <label for="editAccredFechaVencimientoInput" class="block text-xs font-bold text-slate-700">Fecha de Vencimiento</label>
          <input
            id="editAccredFechaVencimientoInput"
            name="fecha_vencimiento"
            type="date"
            value="${escapeHtml(vencimientoValue)}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div class="space-y-1">
          <label for="editAccredEstatusSelect" class="block text-xs font-bold text-slate-700">Estatus *</label>
          <select
            id="editAccredEstatusSelect"
            name="estatus"
            required
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            ${(['Activa', 'Suspendida', 'Vencida', 'En Renovación'] as const)
              .map(
                (opt) =>
                  `<option value="${opt}" ${estatusValue === opt ? 'selected' : ''}>${opt}</option>`
              )
              .join('')}
          </select>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          id="cancelEditAcreditacionBtnSecondary"
          class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          💾 Guardar Cambios
        </button>
      </div>
    </form>
  `;
}

function renderAcreditacionCertificadosTab(
  acr: AcreditacionDetailEntity,
  certificates: ReadonlyArray<CertificadoDetailEntity>
): string {
  if (certificates.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">📜</div>
        <h4 class="text-xs font-bold text-slate-800">Sin certificados activos amparados actualmente</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          No existen certificados activos emitidos bajo ${escapeHtml(acr.norma_codigo)} dentro del alcance sectorial de ${escapeHtml(acr.numero_acreditacion)}.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Certificados Amparados por ${escapeHtml(acr.numero_acreditacion)}</h3>
        <p class="text-xs text-slate-500">
          Certificados operativos cubiertos bajo ${escapeHtml(acr.norma_codigo)} (${escapeHtml(formatAcreditacionSectorLabel(acr.sector_numero, acr.sector_descripcion).shortLabel)}).
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">N° Certificado</th>
              <th scope="col" class="py-3 px-4">Organización Cliente</th>
              <th scope="col" class="py-3 px-4">Norma</th>
              <th scope="col" class="py-3 px-4">Sector IAF</th>
              <th scope="col" class="py-3 px-4">Vigencia</th>
              <th scope="col" class="py-3 px-4 text-center">Estatus</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${certificates
              .map(
                (cert) => `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-cert"
                        data-cert-id="${escapeHtml(cert.id)}"
                        class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span aria-hidden="true">📜</span>
                        <span>${escapeHtml(cert.numero_certificado)}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(cert.organizacion_nombre)}</td>
                    <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">${escapeHtml(cert.norma_codigo)}</td>
                    <td class="py-3 px-4 text-slate-600 whitespace-nowrap">Sector ${cert.sector_iaf}</td>
                    <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      ${escapeHtml(cert.fecha_emision)} → ${escapeHtml(cert.fecha_vencimiento)}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ${escapeHtml(cert.estatus)}
                      </span>
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

function renderAcreditacionSubsectoresTab(
  acr: AcreditacionDetailEntity,
  subsectores: ReadonlyArray<SubsectorIafEntity>
): string {
  if (subsectores.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">🧩</div>
        <h4 class="text-xs font-bold text-slate-800">Sin sub-sectores IAF detallados</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          No hay sub-sectores técnicos registrados para el alcance de la acreditación ${escapeHtml(acr.numero_acreditacion)}.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Sub-Sectores Técnicos IAF del Alcance</h3>
        <p class="text-xs text-slate-500">
          Clasificación técnica IAF y nivel de complejidad/riesgo para ${escapeHtml(acr.numero_acreditacion)}.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Código</th>
              <th scope="col" class="py-3 px-4">Sector IAF</th>
              <th scope="col" class="py-3 px-4">Descripción Técnica</th>
              <th scope="col" class="py-3 px-4 text-center">Nivel de Riesgo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${subsectores
              .map((sub) => {
                const risk = formatRiskCategoryBadge(sub.categoria_riesgo);
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">${escapeHtml(sub.codigo)}</td>
                    <td class="py-3 px-4 text-slate-700 whitespace-nowrap">Sector ${sub.sector_numero}</td>
                    <td class="py-3 px-4 text-slate-700">${escapeHtml(sub.descripcion)}</td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${risk.badgeClass}">
                        <span>${risk.symbol}</span>
                        <span>${escapeHtml(risk.label)}</span>
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
