import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type {
  NormaEntity,
  OrganismoAcreditacion,
  SectorIafEntity,
} from '../lib/extraDomain';
import {
  ALL_SECTORS_FACET_VALUE,
  ALL_SECTORS_LABEL,
  evaluateAccreditationExpiry,
  formatAcreditacionDirectoryStatusBadge,
  formatAcreditacionExpiryBadge,
  formatAcreditacionSectorLabel,
  getAcreditacionSectorFacetValue,
  type AcreditacionDetailEntity,
} from '../lib/acreditacionDomain';
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

export interface AcreditacionViewState {
  selectedAccreditationId: string | null;
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
}

export interface AcreditacionViewProps {
  profile: UserProfile;
  state: AcreditacionViewState;
  acreditaciones: AcreditacionDetailEntity[];
  organismos: OrganismoAcreditacion[];
  normas: NormaEntity[];
  sectores: SectorIafEntity[];
  loading?: boolean;
}

export function renderAcreditacionView(props: AcreditacionViewProps): string {
  const { profile, state, acreditaciones, organismos, normas, sectores, loading } = props;
  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');

  if (state.selectedAccreditationId) {
    const selected = acreditaciones.find((a) => a.id === state.selectedAccreditationId);
    if (selected) {
      return renderAcreditacionDetailPreview(selected);
    }
  }

  return renderAcreditacionDirectoryView({
    state,
    acreditaciones,
    organismos,
    normas,
    sectores,
    isStaff,
    loading,
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
}): string {
  const { state, acreditaciones, organismos, normas, sectores, isStaff, loading } = params;

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
  });
}

function renderAcreditacionDetailPreview(acr: AcreditacionDetailEntity): string {
  const statusBadge = formatAcreditacionDirectoryStatusBadge(acr.estatus);
  const expiryEval = evaluateAccreditationExpiry(acr.fecha_vencimiento);
  const expiryBadge = formatAcreditacionExpiryBadge(expiryEval);
  const sectorMeta = formatAcreditacionSectorLabel(
    acr.sector_numero,
    acr.sector_descripcion
  );

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-action="back-to-accreditations-list"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Volver a Acreditaciones Vigentes</span>
        </button>

        <button
          type="button"
          data-action="open-changelog"
          data-table-name="acreditacion_norma_iaf"
          data-record-id="${escapeHtml(acr.id)}"
          data-entity-name="Acreditación ${escapeHtml(acr.numero_acreditacion)}"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <span aria-hidden="true">🕒</span>
          <span>Historial de Cambios</span>
        </button>
      </div>

      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <span class="text-3xl select-none shrink-0" aria-hidden="true">🏅</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                ${escapeHtml(acr.organismo_codigo)} · ${escapeHtml(acr.organismo_pais)}
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono truncate">
                ${escapeHtml(acr.numero_acreditacion)}
              </h1>
              <p class="text-xs text-slate-600 font-medium">
                ${escapeHtml(acr.organismo_nombre)} · ${escapeHtml(acr.norma_codigo)}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${statusBadge.badgeClass}">
              <span>${statusBadge.symbol}</span>
              <span>${escapeHtml(statusBadge.label)}</span>
            </span>
          </div>
        </div>
      </header>

      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Norma Cubierta</div>
          <div class="text-xs font-mono font-bold text-indigo-800">${escapeHtml(acr.norma_codigo)}</div>
          <div class="text-[11px] text-slate-500 line-clamp-2">${escapeHtml(acr.norma_titulo)}</div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alcance Sectorial IAF</div>
          <div class="text-xs font-bold text-slate-900">${escapeHtml(sectorMeta.shortLabel)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(sectorMeta.detailLabel)}</div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vigencia de Concesión</div>
          <div class="text-xs font-mono font-semibold text-slate-800">
            ${escapeHtml(acr.fecha_concesion)} → ${escapeHtml(acr.fecha_vencimiento || 'Indefinida')}
          </div>
          <div>
            <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${expiryBadge.badgeClass}">
              ${escapeHtml(expiryBadge.label)}
            </span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Impacto Operativo</div>
          <div class="text-lg font-mono font-bold text-slate-900 tabular-nums">${acr.activeCertificatesCount}</div>
          <div class="text-[11px] text-slate-500">${
            acr.activeCertificatesCount === 1
              ? 'Certificado activo cubierto'
              : 'Certificados activos cubiertos'
          }</div>
        </div>
      </section>
    </div>
  `;
}
