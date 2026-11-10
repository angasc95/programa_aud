import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';

export type ActiveRoute = 'dashboard' | 'approvals' | 'database';

export interface HeaderOptions {
  profile: UserProfile | null;
  email: string | null;
  isAdmin: boolean;
  activeRoute: ActiveRoute;
  pendingCount: number;
  menuOpen: boolean;
}

export function renderHeader(opts: HeaderOptions): string {
  const { profile, email, isAdmin, activeRoute, pendingCount, menuOpen } = opts;

  if (!profile) {
    return `
      <header class="bg-white border-b border-slate-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <span class="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Programa de Auditoría
          </span>
          <span class="text-xs text-slate-500 whitespace-nowrap shrink-0">
            Certificación FN
          </span>
        </div>
      </header>
    `;
  }

  const pendingLabel = pendingCount > 0 ? `User Approvals (${pendingCount})` : 'User Approvals';
  const menuVisibility = menuOpen
    ? 'opacity-100 visible translate-y-0 pointer-events-auto'
    : 'opacity-0 invisible translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:pointer-events-auto';

  const adminItems = isAdmin
    ? `
      <div class="py-1 border-b border-slate-100">
        <button
          type="button"
          data-nav="dashboard"
          class="w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeRoute === 'dashboard'
              ? 'bg-slate-50 font-semibold text-slate-900'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }"
        >
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          data-nav="approvals"
          class="w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeRoute === 'approvals'
              ? 'bg-slate-50 font-semibold text-slate-900'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }"
        >
          <span>${escapeHtml(pendingLabel)}</span>
        </button>
        <button
          type="button"
          data-nav="database"
          class="w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeRoute === 'database'
              ? 'bg-slate-50 font-semibold text-slate-900'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }"
        >
          <span>Database Status</span>
        </button>
      </div>
    `
    : '';

  return `
    <header class="bg-white border-b border-slate-200 relative z-30">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          data-nav="dashboard"
          class="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-slate-700 transition-colors cursor-pointer"
        >
          Programa de Auditoría
        </button>

        <div id="userMenuContainer" class="relative group shrink-0">
          <button
            id="userMenuTrigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded="${menuOpen ? 'true' : 'false'}"
            class="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <div class="text-right leading-tight">
              <div class="text-xs font-semibold text-slate-900">${escapeHtml(profile.nombre)}</div>
              <div class="text-[11px] text-slate-500">${escapeHtml(profile.role)} · ${escapeHtml(profile.status)}</div>
            </div>
            <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Hover bridge + dropdown panel -->
          <div class="absolute right-0 top-full pt-2 w-60 z-40 transition-all duration-150 ${menuVisibility}">
            <div
              role="menu"
              aria-labelledby="userMenuTrigger"
              class="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div class="text-xs font-semibold text-slate-900 truncate">${escapeHtml(profile.nombre)}</div>
                <div class="text-[11px] text-slate-500 truncate mt-0.5">${escapeHtml(email || '')}</div>
                <div class="text-[11px] text-slate-600 font-medium mt-1">
                  Role: ${escapeHtml(profile.role)} · ${escapeHtml(profile.status)}
                </div>
              </div>

              ${adminItems}

              <div class="py-1">
                <button
                  id="signOutBtn"
                  type="button"
                  role="menuitem"
                  class="w-full text-left px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}
