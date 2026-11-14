import { escapeHtml } from '../lib/html';
import {
  collapseBreadcrumbForDisplay,
  truncateBreadcrumbLabel,
  type BreadcrumbSegment,
} from '../lib/breadcrumb';

export interface BreadcrumbViewOptions {
  trail: BreadcrumbSegment[];
}

const CHEVRON_SVG = `<svg class="w-3.5 h-3.5 text-slate-300 shrink-0 select-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>`;

export function renderBreadcrumbBar(opts: BreadcrumbViewOptions): string {
  const { trail } = opts;
  if (!trail || trail.length <= 1) {
    return '';
  }

  const collapsed = collapseBreadcrumbForDisplay(trail);
  const lastIndex = trail.length - 1;

  const itemsHtml = collapsed
    .map((item) => {
      if (item.kind === 'ellipsis') {
        return `
          <li class="inline-flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-breadcrumb-id="${escapeHtml(item.backtrackSegmentId)}"
              data-breadcrumb-ellipsis="true"
              title="${escapeHtml(item.tooltip)}"
              aria-label="Retroceder a niveles anteriores: ${escapeHtml(item.tooltip)}"
              class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            >
              …
            </button>
            ${CHEVRON_SVG}
          </li>
        `;
      }

      const seg = item.segment;
      const isLast = item.index === lastIndex;
      const { display } = truncateBreadcrumbLabel(seg.label);
      const fullLabel = seg.tooltip || seg.label;

      if (isLast) {
        return `
          <li class="inline-flex items-center gap-1.5 min-w-0" aria-current="page">
            <span
              title="${escapeHtml(fullLabel)}"
              class="font-semibold text-slate-900 text-xs truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px] lg:max-w-[360px] xl:max-w-[460px]"
            >
              ${escapeHtml(display)}
            </span>
          </li>
        `;
      }

      return `
        <li class="inline-flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            data-breadcrumb-id="${escapeHtml(seg.id)}"
            data-breadcrumb-idx="${item.index}"
            title="${escapeHtml(fullLabel)}"
            class="font-medium text-slate-600 hover:text-indigo-600 hover:underline transition-colors cursor-pointer text-xs truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[280px] xl:max-w-[360px] text-left"
          >
            ${escapeHtml(display)}
          </button>
          ${CHEVRON_SVG}
        </li>
      `;
    })
    .join('');

  return `
    <nav aria-label="Navegación jerárquica" class="w-full py-1 mb-2">
      <ol class="flex flex-nowrap items-center gap-1.5 text-xs text-slate-500 overflow-hidden whitespace-nowrap">
        <li class="inline-flex items-center gap-1 text-slate-400 select-none shrink-0 mr-0.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </li>
        ${itemsHtml}
      </ol>
    </nav>
  `;
}
