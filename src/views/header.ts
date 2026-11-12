import { escapeHtml } from '../lib/html';
import {
  getUserIdentityDisplay,
  getVisibleDomainMenus,
  type ActiveRoute,
  type DomainRoute,
  type UserProfile,
} from '../lib/healthCheck';

export type { ActiveRoute, DomainRoute };
export type HeaderDropdownId = DomainRoute | 'account';

export interface HeaderOptions {
  profile: UserProfile | null;
  email: string | null;
  isAdmin: boolean;
  canViewApprovals?: boolean;
  activeRoute: ActiveRoute;
  activeSubSection: string | null;
  pendingCount: number;
  openMenu: HeaderDropdownId | null;
}

function getDropdownVisibilityClass(isOpen: boolean): string {
  return isOpen
    ? 'opacity-100 visible translate-y-0 pointer-events-auto'
    : 'opacity-0 invisible translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:pointer-events-auto';
}

export function renderHeader(opts: HeaderOptions): string {
  const {
    profile,
    email,
    isAdmin,
    canViewApprovals = false,
    activeRoute,
    activeSubSection,
    pendingCount,
    openMenu,
  } = opts;

  if (!profile) {
    return `
      <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white text-sm font-bold shrink-0" aria-hidden="true">PA</span>
            <span class="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              Programa de Auditoría
            </span>
          </div>
          <span class="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
            Certificación FN · ISO/IEC 17021-1
          </span>
        </div>
      </header>
    `;
  }

  const identity = getUserIdentityDisplay(profile);
  const visibleDomains = getVisibleDomainMenus(profile);
  const accountMenuOpen = openMenu === 'account';
  const accountMenuVisibility = getDropdownVisibilityClass(accountMenuOpen);

  const domainMenusHtml =
    visibleDomains.length > 0
      ? `
        <nav
          aria-label="Dominios Operativos"
          class="relative w-full lg:w-auto order-3 lg:order-2 border-t border-slate-100 lg:border-t-0 py-2 lg:py-0 flex flex-wrap items-center gap-2"
        >
          ${visibleDomains
            .map((domain) => {
              const isOpen = openMenu === domain.id;
              const isActiveDomain = activeRoute === domain.id;
              const visibility = getDropdownVisibilityClass(isOpen);

              return `
                <div class="static md:relative group" data-header-dropdown="${domain.id}">
                  <div class="inline-flex items-center rounded-lg border transition-colors ${
                    isActiveDomain || isOpen
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }">
                    <button
                      type="button"
                      data-nav="${domain.id}"
                      data-nav-reset="true"
                      title="Ir a raíz de ${escapeHtml(domain.label)} (Restablecer navegación)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      <span aria-hidden="true">${domain.symbol}</span>
                      <span>${escapeHtml(domain.label)}</span>
                    </button>
                    <button
                      id="domainMenuTrigger-${domain.id}"
                      type="button"
                      data-menu-toggle="${domain.id}"
                      aria-haspopup="menu"
                      aria-expanded="${isOpen ? 'true' : 'false'}"
                      title="Ver secciones de ${escapeHtml(domain.label)}"
                      aria-label="Menú ${escapeHtml(domain.label)}"
                      class="px-1.5 py-1.5 border-l border-white/20 transition-opacity hover:opacity-100 opacity-80 cursor-pointer"
                    >
                      <svg class="w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : 'group-hover:rotate-180'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <div class="absolute left-0 right-0 md:right-auto md:w-64 top-full pt-2 z-40 transition-all duration-150 ${visibility}">
                    <div
                      role="menu"
                      aria-labelledby="domainMenuTrigger-${domain.id}"
                      class="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      <div class="px-3.5 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          ${escapeHtml(domain.label)}
                        </span>
                        <span class="text-xs" aria-hidden="true">${domain.symbol}</span>
                      </div>
                      <div class="py-1">
                        ${domain.items
                          .map((item) => {
                            const isActiveItem =
                              isActiveDomain && activeSubSection === item.id;
                            return `
                              <button
                                type="button"
                                role="menuitem"
                                data-nav="${domain.id}"
                                data-subview="${item.id}"
                                data-nav-reset="true"
                                title="${escapeHtml(item.tooltip)}"
                                class="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                                  isActiveItem
                                    ? 'bg-slate-100 font-semibold text-slate-900'
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }"
                              >
                                <span class="text-sm shrink-0" aria-hidden="true">${item.symbol}</span>
                                <span class="truncate">${escapeHtml(item.label)}</span>
                              </button>
                            `;
                          })
                          .join('')}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </nav>
      `
      : '';

  const showStaffApprovals =
    profile.status === 'APPROVED' && (isAdmin || canViewApprovals);

  const adminItems = showStaffApprovals
    ? `
      <div class="py-1 border-b border-slate-100">
        <button
          type="button"
          role="menuitem"
          data-nav="dashboard"
          data-nav-reset="true"
          title="Panel general"
          class="w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeRoute === 'dashboard'
              ? 'bg-slate-100 font-semibold text-slate-900'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }"
        >
          <span class="inline-flex items-center gap-2">
            <span aria-hidden="true">🏠</span>
            <span>Mi Perfil / Panel</span>
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          data-nav="approvals"
          data-nav-reset="true"
          title="${isAdmin ? 'Panel de Aprobaciones de Usuarios' : 'Consulta de Usuarios y Aprobaciones (Solo lectura)'}"
          class="w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeRoute === 'approvals'
              ? 'bg-slate-100 font-semibold text-slate-900'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }"
        >
          <span class="inline-flex items-center gap-2">
            <span aria-hidden="true">✅</span>
            <span>${isAdmin ? 'Panel Aprobaciones' : 'Usuarios (Solo lectura)'}</span>
          </span>
          ${
            pendingCount > 0
              ? `<span class="inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">${pendingCount}</span>`
              : ''
          }
        </button>
        ${
          isAdmin
            ? `
              <button
                type="button"
                role="menuitem"
                data-nav="database"
                data-nav-reset="true"
                title="Estado y conectividad de base de datos"
                class="w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeRoute === 'database'
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }"
              >
                <span class="inline-flex items-center gap-2">
                  <span aria-hidden="true">🩺</span>
                  <span>Estado DB</span>
                </span>
              </button>
            `
            : ''
        }
      </div>
    `
    : '';

  return `
    <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div class="max-w-6xl mx-auto px-3 sm:px-6 min-h-16 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-2 sm:gap-x-4 gap-y-0">
        <button
          type="button"
          data-nav="dashboard"
          data-nav-reset="true"
          title="Programa de Auditoría — Ir al Inicio"
          class="order-1 py-2.5 lg:py-0 inline-flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap min-w-0 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <span class="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 text-white text-[11px] sm:text-xs font-bold shrink-0" aria-hidden="true">PA</span>
          <span class="truncate">Programa de Auditoría</span>
        </button>

        ${domainMenusHtml}

        <div id="userMenuContainer" class="relative group order-2 lg:order-3 ml-auto lg:ml-0 py-2 lg:py-0 shrink-0" data-header-dropdown="account">
          <button
            id="userMenuTrigger"
            type="button"
            data-menu-toggle="account"
            aria-haspopup="menu"
            aria-expanded="${accountMenuOpen ? 'true' : 'false'}"
            title="${escapeHtml(identity.tooltip)}"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <span class="text-base select-none shrink-0" aria-hidden="true">${identity.icon}</span>
            <div class="text-left leading-tight min-w-0">
              <div class="text-xs font-bold text-slate-900 truncate max-w-32 sm:max-w-44">
                ${escapeHtml(profile.nombre)}
              </div>
              <div class="text-[10px] text-slate-500 font-medium truncate">
                ${escapeHtml(identity.subtitle)}
              </div>
            </div>
            ${
              showStaffApprovals && pendingCount > 0
                ? `<span title="${pendingCount} solicitudes pendientes" class="inline-flex items-center justify-center min-w-4 px-1 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold shrink-0">${pendingCount}</span>`
                : ''
            }
            <svg class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${accountMenuOpen ? 'rotate-180' : 'group-hover:rotate-180'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown panel -->
          <div class="absolute right-0 top-full pt-2 w-72 max-w-[calc(100vw-2rem)] z-40 transition-all duration-150 ${accountMenuVisibility}">
            <div
              role="menu"
              aria-labelledby="userMenuTrigger"
              class="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div class="flex items-center gap-2.5">
                  <span class="text-2xl select-none shrink-0" aria-hidden="true">${identity.icon}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-slate-900 truncate">${escapeHtml(profile.nombre)}</div>
                    <div class="text-[11px] text-slate-500 truncate">${escapeHtml(email || '')}</div>
                    <div class="text-[10px] font-semibold text-slate-600 mt-0.5">${escapeHtml(identity.subtitle)}</div>
                  </div>
                </div>
              </div>

              ${adminItems}

              <div class="py-1">
                <button
                  id="signOutBtn"
                  type="button"
                  role="menuitem"
                  class="w-full text-left px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                >
                  <span aria-hidden="true">🚪</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}
