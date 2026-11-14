import { escapeHtml } from '../lib/html';
import type { BreadcrumbEntityType } from '../lib/breadcrumb';

export interface DetailAttributeItem {
  label: string;
  value: string;
  isMono?: boolean;
  tooltip?: string;
  badgeClass?: string;
  colSpanFull?: boolean;
  linkAction?: {
    nav: string;
    subview?: string;
    entityType?: BreadcrumbEntityType;
    entityId?: string;
    label: string;
  };
}

export interface DetailParentChip {
  label: string;
  value: string;
  symbol?: string;
  navAction?: {
    nav: string;
    subview?: string;
    entityType?: BreadcrumbEntityType;
    entityId?: string;
    sectorNumber?: number;
  };
}

export interface DetailChildTab {
  id: string;
  label: string;
  symbol?: string;
  count: number;
}

export interface DetailPageTemplateProps {
  entityType: string;
  entitySymbol: string;
  title: string;
  subtitle?: string;
  eyebrowCode?: string;
  statusBadge?: {
    label: string;
    badgeClass: string;
    symbol?: string;
    dotClass?: string;
  };
  secondaryHeaderBadge?: {
    label: string;
    badgeClass?: string;
  };
  backButton: {
    label: string;
    nav: string;
    subview?: string;
    action?: string;
  };
  extraActionButtonsHtml?: string;
  parents?: DetailParentChip[];
  /** @deprecated Prefer `parents` array; kept for backwards compatibility */
  parentInfo?: {
    parentLabel: string;
    parentName: string;
    navAction?: {
      nav: string;
      subview?: string;
      entityId?: string;
    };
  };
  parentMetaHtml?: string;
  tableName: string;
  recordId: string;
  recordActionsHtml?: string;
  feedbackHtml?: string;
  attributes: DetailAttributeItem[];
  customRecordBodyHtml?: string;
  editableScopeField?: {
    label: string;
    value: string;
    maxLength: number;
    fieldName: string;
  };
  childTabs?: DetailChildTab[];
  activeChildTabId?: string;
  childTabAttrName?: string;
  renderChildTabContent?: (activeTabId: string) => string;
  extraSectionsHtml?: string;
  modalsHtml?: string;
}

export function renderDetailPageTemplate(props: DetailPageTemplateProps): string {
  const {
    entityType,
    entitySymbol,
    title,
    subtitle,
    eyebrowCode,
    statusBadge,
    secondaryHeaderBadge,
    backButton,
    extraActionButtonsHtml = '',
    parents = [],
    parentInfo,
    parentMetaHtml = '',
    tableName,
    recordId,
    recordActionsHtml = '',
    feedbackHtml = '',
    attributes,
    customRecordBodyHtml,
    editableScopeField,
    childTabs = [],
    activeChildTabId,
    childTabAttrName = 'data-detail-tab',
    renderChildTabContent,
    extraSectionsHtml = '',
    modalsHtml = '',
  } = props;

  // Normalize legacy parentInfo into parents array when provided
  const resolvedParents: DetailParentChip[] =
    parents.length > 0
      ? parents
      : parentInfo
      ? [
          {
            label: parentInfo.parentLabel,
            value: parentInfo.parentName,
            symbol: '🏢',
            navAction: parentInfo.navAction
              ? {
                  nav: parentInfo.navAction.nav === 'drilldown' ? 'certificacion' : parentInfo.navAction.nav,
                  subview:
                    parentInfo.navAction.nav === 'drilldown'
                      ? 'organizations'
                      : parentInfo.navAction.subview,
                  entityType:
                    parentInfo.navAction.nav === 'drilldown' ? 'org' : undefined,
                  entityId: parentInfo.navAction.entityId,
                }
              : undefined,
          },
        ]
      : [];

  const hasParentZone = resolvedParents.length > 0 || Boolean(parentMetaHtml);

  // ZONE 1: Parent Zone (Top) — omitted cleanly on standalone root catalogs
  const parentZoneHtml = hasParentZone
    ? `
      <section aria-label="Contexto y relaciones superiores" class="flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex flex-wrap items-center gap-2">
          ${resolvedParents
            .map((parent) => {
              const sym = parent.symbol ? `<span aria-hidden="true">${parent.symbol}</span>` : '';
              if (parent.navAction) {
                const nav = parent.navAction;
                return `
                  <button
                    type="button"
                    data-parent-nav="true"
                    data-nav="${escapeHtml(nav.nav)}"
                    ${nav.subview ? `data-subview="${escapeHtml(nav.subview)}"` : ''}
                    ${nav.entityType ? `data-parent-type="${escapeHtml(nav.entityType)}"` : ''}
                    ${nav.entityId ? `data-entity-id="${escapeHtml(nav.entityId)}"` : ''}
                    ${
                      nav.sectorNumber !== undefined
                        ? `data-sector-number="${escapeHtml(String(nav.sectorNumber))}"`
                        : ''
                    }
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs transition-colors cursor-pointer group"
                    title="Abrir ${escapeHtml(parent.label)}: ${escapeHtml(parent.value)}"
                  >
                    ${sym}
                    <span class="text-slate-500 font-medium">${escapeHtml(parent.label)}:</span>
                    <span class="font-bold text-indigo-700 group-hover:text-indigo-900 group-hover:underline">${escapeHtml(parent.value)}</span>
                    <span class="text-indigo-500 text-[11px]" aria-hidden="true">→</span>
                  </button>
                `;
              }
              return `
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  ${sym}
                  <span class="text-slate-500 font-medium">${escapeHtml(parent.label)}:</span>
                  <span class="font-bold text-slate-800">${escapeHtml(parent.value)}</span>
                </div>
              `;
            })
            .join('')}
        </div>
        ${parentMetaHtml ? `<div class="flex items-center gap-2">${parentMetaHtml}</div>` : ''}
      </section>
      <hr class="border-t border-slate-200 my-4" />
    `
    : '';

  // ZONE 2: Record Zone Attributes (Middle)
  const attributesHtml =
    attributes.length > 0
      ? `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        ${attributes
          .map((attr) => {
            const spanClass = attr.colSpanFull ? 'col-span-full' : '';
            return `
              <div class="${spanClass} bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 space-y-1">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ${escapeHtml(attr.label)}
                </div>
                <div class="text-xs text-slate-900 font-semibold ${attr.isMono ? 'font-mono' : ''}">
                  ${
                    attr.badgeClass
                      ? `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${attr.badgeClass}">
                          ${escapeHtml(attr.value)}
                        </span>
                      `
                      : attr.linkAction
                      ? `
                        <button
                          type="button"
                          data-parent-nav="true"
                          data-nav="${escapeHtml(attr.linkAction.nav)}"
                          ${attr.linkAction.subview ? `data-subview="${escapeHtml(attr.linkAction.subview)}"` : ''}
                          ${attr.linkAction.entityType ? `data-parent-type="${escapeHtml(attr.linkAction.entityType)}"` : ''}
                          ${attr.linkAction.entityId ? `data-entity-id="${escapeHtml(attr.linkAction.entityId)}"` : ''}
                          class="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold transition-colors cursor-pointer"
                        >
                          ${escapeHtml(attr.value)}
                        </button>
                      `
                      : escapeHtml(attr.value || '—')
                  }
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `
      : '';

  const editableScopeHtml = editableScopeField
    ? `
      <div class="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-2">
        <div class="max-w-4xl space-y-2">
          <div class="flex items-center justify-between gap-2">
            <label for="detailScopeInput" class="text-xs font-bold uppercase tracking-wider text-slate-700">
              ${escapeHtml(editableScopeField.label)}
            </label>
            <div class="text-[11px] font-mono text-slate-400">
              <span id="scopeCharCount">${editableScopeField.value.length}</span> / ${editableScopeField.maxLength} caracteres
            </div>
          </div>
          <textarea
            id="detailScopeInput"
            name="${escapeHtml(editableScopeField.fieldName)}"
            maxlength="${editableScopeField.maxLength}"
            rows="3"
            class="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >${escapeHtml(editableScopeField.value)}</textarea>
          <p class="text-[11px] text-slate-400">
            Alcance de certificación formal auditable conforme a ISO/IEC 17021-1:2015 cláusula 8.2.
          </p>
        </div>
      </div>
    `
    : '';

  // ZONE 3: Children Zone / Multipage (Bottom)
  let childTabsHtml = '';
  if (childTabs.length > 0 && renderChildTabContent) {
    const activeTab = activeChildTabId || childTabs[0].id;
    childTabsHtml = `
      <section aria-label="Registros relacionados" class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="px-4 pt-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap gap-1.5" role="tablist">
          ${childTabs
            .map((tab) => {
              const isActive = tab.id === activeTab;
              return `
                <button
                  type="button"
                  role="tab"
                  ${childTabAttrName}="${escapeHtml(tab.id)}"
                  aria-selected="${isActive ? 'true' : 'false'}"
                  class="px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-b-2 ${
                    isActive
                      ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
                  }"
                >
                  ${tab.symbol ? `<span aria-hidden="true">${tab.symbol}</span>` : ''}
                  <span>${escapeHtml(tab.label)}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-600'
                  }">
                    ${tab.count}
                  </span>
                </button>
              `;
            })
            .join('')}
        </div>

        <div class="p-4 sm:p-5">
          ${renderChildTabContent(activeTab)}
        </div>
      </section>
    `;
  }

  return `
    <div class="space-y-4 sm:space-y-5">
      <!-- Top Action Bar (Back + Changelog Trigger) -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-nav="${escapeHtml(backButton.nav)}"
          data-nav-back="true"
          ${backButton.subview ? `data-subview="${escapeHtml(backButton.subview)}"` : ''}
          ${backButton.action ? `data-action="${escapeHtml(backButton.action)}"` : ''}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <span aria-hidden="true">←</span>
          <span>${escapeHtml(backButton.label)}</span>
        </button>

        <div class="flex flex-wrap items-center gap-2">
          ${extraActionButtonsHtml}
          <button
            type="button"
            data-action="open-changelog"
            data-table-name="${escapeHtml(tableName)}"
            data-record-id="${escapeHtml(recordId)}"
            data-entity-name="${escapeHtml(title)}"
            title="Ver registro cronológico de auditoría forense"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <span aria-hidden="true">🕒</span>
            <span>Historial de Cambios</span>
          </button>
        </div>
      </div>

      <!-- Standardized 3-Zone Main Card (Parent Zone -> Divider -> Record Zone) -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        ${parentZoneHtml}

        <!-- Record Zone (Middle) -->
        <section aria-label="Detalle del registro" class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <span class="text-2xl sm:text-3xl select-none shrink-0 mt-0.5" aria-hidden="true">${entitySymbol}</span>
              <div class="space-y-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ${escapeHtml(entityType)}
                  </span>
                  ${
                    eyebrowCode
                      ? `<span class="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${escapeHtml(eyebrowCode)}</span>`
                      : ''
                  }
                </div>
                <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
                  ${escapeHtml(title)}
                </h1>
                ${
                  subtitle
                    ? `<p class="text-xs text-slate-500 font-medium">${escapeHtml(subtitle)}</p>`
                    : ''
                }
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 self-start shrink-0">
              ${
                statusBadge
                  ? `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${statusBadge.badgeClass}">
                      ${statusBadge.dotClass ? `<span class="w-1.5 h-1.5 rounded-full ${statusBadge.dotClass}"></span>` : ''}
                      ${statusBadge.symbol ? `<span aria-hidden="true">${statusBadge.symbol}</span>` : ''}
                      <span>${escapeHtml(statusBadge.label)}</span>
                    </span>
                  `
                  : ''
              }
              ${
                secondaryHeaderBadge
                  ? `
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      secondaryHeaderBadge.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'
                    }">
                      ${escapeHtml(secondaryHeaderBadge.label)}
                    </span>
                  `
                  : ''
              }
              ${recordActionsHtml}
            </div>
          </div>

          ${feedbackHtml}
          ${customRecordBodyHtml ?? `${attributesHtml}${editableScopeHtml}`}
        </section>
      </div>

      <!-- Children Zone (Bottom - List-Only Multipage Tabs) -->
      ${childTabsHtml}
      ${extraSectionsHtml}
      ${modalsHtml}
    </div>
  `;
}
