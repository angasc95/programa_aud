import { escapeHtml } from '../lib/html';

export interface DetailAttributeItem {
  label: string;
  value: string;
  isMono?: boolean;
  tooltip?: string;
  badgeClass?: string;
  linkAction?: {
    nav: string;
    subview?: string;
    entityId?: string;
    label: string;
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
  statusBadge?: {
    label: string;
    badgeClass: string;
    symbol?: string;
  };
  backButton: {
    label: string;
    nav: string;
    subview?: string;
  };
  parentInfo?: {
    parentLabel: string;
    parentName: string;
    navAction?: {
      nav: string;
      subview?: string;
      entityId?: string;
    };
  };
  tableName: string;
  recordId: string;
  attributes: DetailAttributeItem[];
  editableScopeField?: {
    label: string;
    value: string;
    maxLength: number;
    fieldName: string;
  };
  childTabs?: DetailChildTab[];
  activeChildTabId?: string;
  renderChildTabContent?: (activeTabId: string) => string;
}

export function renderDetailPageTemplate(props: DetailPageTemplateProps): string {
  const {
    entityType,
    entitySymbol,
    title,
    subtitle,
    statusBadge,
    backButton,
    parentInfo,
    tableName,
    recordId,
    attributes,
    editableScopeField,
    childTabs = [],
    activeChildTabId,
    renderChildTabContent,
  } = props;

  // 1. Zone 1: Parent Data Zone & Action Bar
  const parentBannerHtml = parentInfo
    ? `
      <div class="px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2">
          <span class="text-slate-400 font-medium">${escapeHtml(parentInfo.parentLabel)}:</span>
          ${
            parentInfo.navAction
              ? `
                <button
                  type="button"
                  data-nav="${escapeHtml(parentInfo.navAction.nav)}"
                  ${parentInfo.navAction.subview ? `data-subview="${escapeHtml(parentInfo.navAction.subview)}"` : ''}
                  ${parentInfo.navAction.entityId ? `data-drilldown-select-org="${escapeHtml(parentInfo.navAction.entityId)}"` : ''}
                  class="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>🏢</span>
                  <span>${escapeHtml(parentInfo.parentName)}</span>
                </button>
              `
              : `<span class="font-bold text-slate-800">${escapeHtml(parentInfo.parentName)}</span>`
          }
        </div>
        <span class="text-[11px] text-slate-400 italic">Relación Padre-Hijo Verificada</span>
      </div>
    `
    : '';

  // 2. Zone 3: Direct Record Attributes
  const attributesHtml = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${attributes
        .map((attr) => {
          return `
            <div class="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-1">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ${escapeHtml(attr.label)}
              </div>
              <div class="text-xs text-slate-900 font-medium ${attr.isMono ? 'font-mono' : ''}">
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
                        data-nav="${escapeHtml(attr.linkAction.nav)}"
                        ${attr.linkAction.subview ? `data-subview="${escapeHtml(attr.linkAction.subview)}"` : ''}
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
  `;

  // Scope statement with character counter if present
  const editableScopeHtml = editableScopeField
    ? `
      <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-2">
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
          class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        >${escapeHtml(editableScopeField.value)}</textarea>
        <p class="text-[11px] text-slate-400">
          Alcance de certificación formal auditable conforme a ISO/IEC 17021-1:2015 cláusula 8.2.
        </p>
      </div>
    `
    : '';

  // 3. Zone 4: Multipage Child Tabs
  let childTabsHtml = '';
  if (childTabs.length > 0 && renderChildTabContent) {
    const activeTab = activeChildTabId || childTabs[0].id;
    childTabsHtml = `
      <section class="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden space-y-0">
        <!-- Tab Bar -->
        <div class="px-4 pt-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap gap-2" role="tablist">
          ${childTabs
            .map((tab) => {
              const isActive = tab.id === activeTab;
              return `
                <button
                  type="button"
                  role="tab"
                  data-detail-tab="${escapeHtml(tab.id)}"
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

        <!-- Tab Body -->
        <div class="p-5">
          ${renderChildTabContent(activeTab)}
        </div>
      </section>
    `;
  }

  return `
    <div class="space-y-6">
      <!-- Zone 0: Action Bar (Back + Changelog Trigger) -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          data-nav="${escapeHtml(backButton.nav)}"
          ${backButton.subview ? `data-subview="${escapeHtml(backButton.subview)}"` : ''}
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>${escapeHtml(backButton.label)}</span>
        </button>

        <!-- Top-Right Changelog Trigger [🕒 Historial de Cambios] -->
        <button
          type="button"
          data-action="open-changelog"
          data-table-name="${escapeHtml(tableName)}"
          data-record-id="${escapeHtml(recordId)}"
          data-entity-name="${escapeHtml(title)}"
          title="Ver registro cronológico de auditoría forense"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <span aria-hidden="true">🕒</span>
          <span>Historial de Cambios</span>
        </button>
      </div>

      <!-- Zone 1: Main Entity Banner -->
      <header class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="text-3xl select-none shrink-0" aria-hidden="true">${entitySymbol}</span>
            <div class="space-y-1 min-w-0">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ${escapeHtml(entityType)}
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                ${escapeHtml(title)}
              </h1>
              ${
                subtitle
                  ? `<p class="text-xs text-slate-500">${escapeHtml(subtitle)}</p>`
                  : ''
              }
            </div>
          </div>

          ${
            statusBadge
              ? `
                <div class="self-start sm:self-auto shrink-0">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${statusBadge.badgeClass}">
                    ${statusBadge.symbol ? `<span>${statusBadge.symbol}</span>` : ''}
                    <span>${escapeHtml(statusBadge.label)}</span>
                  </span>
                </div>
              `
              : ''
          }
        </div>

        ${parentBannerHtml}
      </header>

      <!-- Zone 2: Visual Separator -->
      <div class="border-t border-slate-200/60 my-1"></div>

      <!-- Zone 3: Direct Record Attributes -->
      <section class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">
          Atributos Directos del Registro
        </h2>
        ${attributesHtml}
        ${editableScopeHtml}
      </section>

      <!-- Zone 4: Multipage Child Tabs -->
      ${childTabsHtml}
    </div>
  `;
}
