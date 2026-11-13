import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { EstatusCatalogItem } from '../lib/extraDomain';
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
import { renderDetailPageTemplate } from './detailTemplate';
import type { CertificadoDetailEntity } from '../lib/multisiteSampling';
import type { ProgramacionAuditEntity } from '../lib/auditExecution';

export interface EstatusViewState {
  selectedEstatusId: string | null;
  activeChildTab?: 'reglas' | 'certificados' | 'auditorias';
  query: string;
  selectedCategory?: string;
  viewMode: 'grid' | 'list';
  sortColumn: string | null;
  sortDirection: SortDirection;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
}

export interface EstatusViewProps {
  profile: UserProfile;
  state: EstatusViewState;
  estatusList: EstatusCatalogItem[];
  certificados?: CertificadoDetailEntity[];
  audits?: ProgramacionAuditEntity[];
  loading?: boolean;
}

export function renderEstatusView(props: EstatusViewProps): string {
  const { state, estatusList, certificados = [], audits = [] } = props;

  // If a specific status is selected, render its detail page
  if (state.selectedEstatusId) {
    const selectedItem =
      estatusList.find((e) => e.id === state.selectedEstatusId || e.estatus.toLowerCase() === state.selectedEstatusId?.toLowerCase()) ||
      estatusList[0];

    if (selectedItem) {
      return renderEstatusDetailPage({
        item: selectedItem,
        activeTab: state.activeChildTab || 'certificados',
        certificados: certificados.filter(
          (c) => c.estatus.toLowerCase() === selectedItem.estatus.toLowerCase()
        ),
        audits: audits.filter(
          (a) => a.estatus.toLowerCase() === selectedItem.estatus.toLowerCase()
        ),
      });
    }
  }

  // Otherwise, render the Universal Multi View Directory
  return renderEstatusDirectoryView({
    state,
    estatusList,
    loading: props.loading,
  });
}

function getStatusBadgeClasses(colorToken: string): string {
  switch (colorToken) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'sky':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'amber':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'rose':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'indigo':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'teal':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'orange':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'slate':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

function getEstatusOperationalUsage(item: EstatusCatalogItem): string {
  if (item.usage_count === 0) return 'SIN_USO';
  if (item.categoria_aplicable.toLowerCase().includes('certificado')) {
    return 'EN_CERTIFICADOS';
  }
  return 'EN_AUDITORIAS';
}

function renderEstatusDirectoryView(params: {
  state: EstatusViewState;
  estatusList: EstatusCatalogItem[];
  loading?: boolean;
}): string {
  const { state, estatusList, loading } = params;

  const facetCategories: MultiViewFacetCategory<EstatusCatalogItem>[] = [
    {
      id: 'uso',
      label: 'Uso Operativo',
      options: [
        { value: 'EN_CERTIFICADOS', label: 'En Certificados' },
        { value: 'EN_AUDITORIAS', label: 'En Auditorías / Gestión' },
        { value: 'SIN_USO', label: 'Sin Uso' },
      ],
      extractValues: (item) => getEstatusOperationalUsage(item),
    },
  ];

  const effectiveSelections: MultiViewSelectionMap = state.facetSelections
    ? state.facetSelections
    : {
        uso:
          state.selectedCategory && state.selectedCategory !== 'ALL'
            ? new Set([
                state.selectedCategory.toLowerCase().includes('certificado')
                  ? 'EN_CERTIFICADOS'
                  : 'EN_AUDITORIAS',
              ])
            : new Set<string>(),
      };

  const searchOptions = {
    getSearchableText: (item: EstatusCatalogItem) =>
      `${item.estatus} ${item.descripcion} ${item.categoria_aplicable}`,
  };

  const filtered = filterRecordsWithFacets(
    estatusList,
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
        case 'estatus':
          return item.estatus;
        case 'descripcion':
          return item.descripcion;
        case 'categoria':
          return item.categoria_aplicable;
        case 'usage':
          return item.usage_count;
        default:
          return (item as unknown as Record<string, unknown>)[col];
      }
    }
  );

  const facetGroups = computeReactiveFacetCounts(
    estatusList,
    state.query,
    facetCategories,
    effectiveSelections,
    searchOptions
  );

  const columns: ColumnDefinition<EstatusCatalogItem>[] = [
    {
      id: 'estatus',
      header: 'Estatus Canónico',
      sortable: true,
      renderCell: (item) => {
        const badgeClass = getStatusBadgeClasses(item.color_token);
        return `
          <button
            type="button"
            data-action="select-estatus"
            data-estatus-id="${escapeHtml(item.id)}"
            class="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
          >
            <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${badgeClass}">
              ${escapeHtml(item.estatus)}
            </span>
          </button>
        `;
      },
    },
    {
      id: 'descripcion',
      header: 'Significado y Regla Operativa',
      sortable: true,
      renderCell: (item) => `
        <span class="text-slate-700 font-medium">${escapeHtml(item.descripcion)}</span>
      `,
    },
    {
      id: 'categoria',
      header: 'Ámbito de Aplicación',
      sortable: true,
      renderCell: (item) => `
        <span class="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
          ${escapeHtml(item.categoria_aplicable)}
        </span>
      `,
    },
    {
      id: 'usage',
      header: 'Métricas de Uso',
      sortable: true,
      align: 'center',
      renderCell: (item) => `
        <span class="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200 tabular-nums">
          <span aria-hidden="true">📊</span>
          <span>${item.usage_count} registros</span>
        </span>
      `,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      align: 'right',
      renderCell: (item) => `
        <button
          type="button"
          data-action="select-estatus"
          data-estatus-id="${escapeHtml(item.id)}"
          class="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
        >
          Ver Detalle →
        </button>
      `,
    },
  ];

  const renderCard = (item: EstatusCatalogItem): string => {
    const badgeClass = getStatusBadgeClasses(item.color_token);
    return `
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}">
              ${escapeHtml(item.estatus)}
            </span>
            <span class="text-[10px] font-mono text-slate-400">Canónico</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed font-medium">
            ${escapeHtml(item.descripcion)}
          </p>
          <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <strong class="text-slate-600">Ámbito:</strong> ${escapeHtml(item.categoria_aplicable)}
          </div>
        </div>
        <div class="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
          <span class="font-mono text-slate-500 font-semibold tabular-nums">${item.usage_count} usos</span>
          <button
            type="button"
            data-action="select-estatus"
            data-estatus-id="${escapeHtml(item.id)}"
            class="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Detalle →
          </button>
        </div>
      </div>
    `;
  };

  return renderUniversalTemplate({
    domainKey: 'estatus',
    title: 'Estatus Canónicos del Sistema',
    subtitle:
      'Padrón estandarizado de los 8 estados del ciclo de vida de auditorías, certificados, no conformidades y organizaciones cliente.',
    entityLabel: 'estatus operativos',
    searchQuery: state.query,
    searchPlaceholder: 'Buscar estatus (Activo, Suspendido, En Ejecución...)...',
    searchInputId: 'estatusSearchInput',
    clearSearchBtnId: 'clearEstatusSearchBtn',
    totalCount: estatusList.length,
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
    emptyStateTitle: 'No se encontraron estatus',
    emptyStateMessage: 'No se encontraron estatus que coincidan con los filtros aplicados.',
    loading,
  });
}

function renderEstatusDetailPage(params: {
  item: EstatusCatalogItem;
  activeTab: 'reglas' | 'certificados' | 'auditorias';
  certificados: CertificadoDetailEntity[];
  audits: ProgramacionAuditEntity[];
}): string {
  const { item, activeTab, certificados, audits } = params;
  const badgeClass = getStatusBadgeClasses(item.color_token);

  const tabCertificadosHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <th class="py-3 px-4">N° Certificado</th>
            <th class="py-3 px-4">Organización</th>
            <th class="py-3 px-4">Norma</th>
            <th class="py-3 px-4">Vigencia</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${
            certificados.length === 0
              ? `
                <tr>
                  <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                    No hay certificados con estatus "${escapeHtml(item.estatus)}".
                  </td>
                </tr>
              `
              : certificados
                  .map(
                    (c) => `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            data-action="select-cert"
                            data-cert-id="${escapeHtml(c.id)}"
                            class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                          >
                            📜 ${escapeHtml(c.numero_certificado)}
                          </button>
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(c.organizacion_nombre)}</td>
                        <td class="py-3 px-4 text-slate-700">${escapeHtml(c.norma_codigo)}</td>
                        <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          ${escapeHtml(c.fecha_emision)} → ${escapeHtml(c.fecha_vencimiento)}
                        </td>
                      </tr>
                    `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>
  `;

  const tabAuditoriasHtml = `
    <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
            <th class="py-3 px-4">Código Auditoría</th>
            <th class="py-3 px-4">Organización</th>
            <th class="py-3 px-4">Modalidad</th>
            <th class="py-3 px-4">Fechas</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${
            audits.length === 0
              ? `
                <tr>
                  <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                    No hay auditorías con estatus "${escapeHtml(item.estatus)}".
                  </td>
                </tr>
              `
              : audits
                  .map(
                    (a) => `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            data-action="select-prog-audit"
                            data-audit-id="${escapeHtml(a.id)}"
                            class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                          >
                            🗓️ ${escapeHtml(a.codigo_auditoria)}
                          </button>
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(a.organizacion_nombre)}</td>
                        <td class="py-3 px-4 text-slate-700">${escapeHtml(a.tipo_auditoria)} · ${escapeHtml(a.metodologia)}</td>
                        <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          ${escapeHtml(a.fecha_inicio)} → ${escapeHtml(a.fecha_fin)}
                        </td>
                      </tr>
                    `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>
  `;

  const tabReglasHtml = `
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">Reglas Normativas del Ciclo de Vida</h3>
      <p class="text-xs text-slate-600 leading-relaxed">
        En conformidad con <strong>ISO/IEC 17021-1:2015 cláusulas 9.6 y 9.7</strong>, este estatus forma parte del ciclo de vida controlado de la certificación. Los cambios a este estatus requieren registro auditable en <code>public.audit_log</code> con trazabilidad forense del actor responsable y justificación técnica correspondiente.
      </p>
    </div>
  `;

  return renderDetailPageTemplate({
    entityType: 'Estatus Canónico',
    entitySymbol: '🏷️',
    title: item.estatus,
    subtitle: item.descripcion,
    statusBadge: {
      label: item.estatus,
      badgeClass,
    },
    backButton: {
      label: 'Volver al Catálogo de Estatus',
      nav: 'extra',
      subview: 'estatus',
      action: 'back-to-estatus-list',
    },
    parents: [],
    tableName: 'estatus',
    recordId: item.id,
    attributes: [
      { label: 'Denominación Canónica', value: item.estatus },
      { label: 'Ámbitos de Aplicación', value: item.categoria_aplicable },
      { label: 'Registros en el Sistema', value: `${item.usage_count} Entidades Asignadas` },
    ],
    childTabs: [
      { id: 'certificados', label: 'Certificados', symbol: '📜', count: certificados.length },
      { id: 'auditorias', label: 'Auditorías', symbol: '🗓️', count: audits.length },
      { id: 'reglas', label: 'Reglas del Ciclo', symbol: '⚖️', count: 1 },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-estatus-tab',
    renderChildTabContent: (tabId) => {
      if (tabId === 'auditorias') return tabAuditoriasHtml;
      if (tabId === 'reglas') return tabReglasHtml;
      return tabCertificadosHtml;
    },
  });
}
