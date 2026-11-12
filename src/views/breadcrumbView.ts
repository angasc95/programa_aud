import { escapeHtml } from '../lib/html';
import {
  truncateBreadcrumbLabel,
  type BreadcrumbSegment,
} from '../lib/breadcrumb';

export interface BreadcrumbViewOptions {
  trail: BreadcrumbSegment[];
}

export function renderBreadcrumbBar(opts: BreadcrumbViewOptions): string {
  const { trail } = opts;
  if (!trail || trail.length <= 1) {
    return '';
  }

  const itemsHtml = trail
    .map((seg, idx) => {
      const isLast = idx === trail.length - 1;
      const { display } = truncateBreadcrumbLabel(seg.label);
      const fullLabel = seg.tooltip || seg.label;

      if (isLast) {
        return `
          <li class="inline-flex items-center gap-1.5 min-w-0" aria-current="page">
            <span
              title="${escapeHtml(fullLabel)}"
              class="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs truncate max-w-[200px] sm:max-w-[280px]"
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
            data-breadcrumb-idx="${idx}"
            title="${escapeHtml(fullLabel)}"
            class="font-medium text-slate-600 hover:text-indigo-600 hover:underline transition-colors cursor-pointer text-xs truncate max-w-[160px] sm:max-w-[240px] text-left"
          >
            ${escapeHtml(display)}
          </button>
          <svg class="w-3.5 h-3.5 text-slate-300 shrink-0 select-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </li>
      `;
    })
    .join('');

  return `
    <nav aria-label="Navegación jerárquica" class="w-full bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-2xs">
      <ol class="flex flex-wrap items-center gap-y-1 gap-x-1.5 text-xs text-slate-500">
        <li class="inline-flex items-center gap-1 text-slate-400 select-none mr-0.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </li>
        ${itemsHtml}
      </ol>
    </nav>
  `;
}
