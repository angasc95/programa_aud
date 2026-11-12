import { escapeHtml } from '../lib/html';
import {
  getRoleVisualMeta,
  getStatusVisualMeta,
  getVisibleDomainMenus,
  type ActiveRoute,
  type UserProfile,
} from '../lib/healthCheck';
import {
  renderCertificateGrid,
  renderCertificateList,
  renderEmptySearchState,
  renderSearchControls,
} from './searchControlsView';
import type {
  CertificateRecord,
  SearchControlsFilterState,
} from '../lib/searchControls';

export interface DashboardExplorationState {
  filters: SearchControlsFilterState;
  filteredRecords: CertificateRecord[];
  allRecords: CertificateRecord[];
  availableStatuses: string[];
  availableStandards: string[];
  loading: boolean;
}

export function renderDashboardView(
  profile: UserProfile,
  email: string,
  activeRoute: ActiveRoute = 'dashboard',
  activeSubSection: string | null = null,
  exploration?: DashboardExplorationState
): string {
  const roleMeta = getRoleVisualMeta(profile.role);
  const statusMeta = getStatusVisualMeta(profile.status);
  const visibleDomains = getVisibleDomainMenus(profile);

  const selectedDomain = visibleDomains.find((d) => d.id === activeRoute);
  const selectedItem = selectedDomain?.items.find((i) => i.id === activeSubSection);

  let statusNotice = `
    <p class="text-sm text-slate-600 leading-relaxed">
      Su espacio de trabajo está activo. Utilice los controles de exploración inferiores para buscar, filtrar y analizar certificados de conformidad y cobertura normativa ISO.
    </p>
  `;

  if (selectedDomain) {
    statusNotice = `
      <div class="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span aria-hidden="true">${selectedItem ? selectedItem.symbol : selectedDomain.symbol}</span>
            <span>${escapeHtml(selectedDomain.label)}${selectedItem ? ` / ${escapeHtml(selectedItem.label)}` : ''}</span>
          </div>
          <button
            type="button"
            data-nav="dashboard"
            class="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
          >
            Volver a la vista general
          </button>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed">
          ${escapeHtml(selectedItem ? selectedItem.tooltip : selectedDomain.tooltip)}
        </p>
      </div>
    `;
  } else if (profile.status === 'PENDING') {
    statusNotice = `
      <div class="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
        <span class="font-semibold block mb-1">Aprobación administrativa pendiente</span>
        Su solicitud de cuenta está en espera de revisión y autorización por un administrador del sistema antes de habilitar los módulos operativos.
      </div>
    `;
  } else if (profile.status === 'REJECTED') {
    statusNotice = `
      <div class="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
        <span class="font-semibold block mb-1">Acceso no autorizado</span>
        Esta cuenta no fue aprobada por un administrador. Comuníquese con la coordinación técnica de FONDONORMA.
      </div>
    `;
  }

  // Exploration Section (Active for Approved users)
  let explorationHtml = '';
  if (profile.status === 'APPROVED' && exploration) {
    const totalCount = exploration.allRecords.length;
    const matchCount = exploration.filteredRecords.length;
    const activeCount = exploration.allRecords.filter(
      (r) => r.estatus.toUpperCase() === 'ACTIVO'
    ).length;
    const avgCoverage =
      totalCount > 0
        ? Math.round(
            exploration.allRecords.reduce((acc, r) => acc + r.cobertura_porcentaje, 0) /
              totalCount
          )
        : 0;

    let viewContainerHtml = '';
    if (exploration.loading) {
      viewContainerHtml = `
        <div class="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm font-medium">
          <div class="inline-block animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full mb-3"></div>
          <p>Cargando registros operativos y cobertura ISO...</p>
        </div>
      `;
    } else if (matchCount === 0) {
      viewContainerHtml = renderEmptySearchState(exploration.filters.query);
    } else if (exploration.filters.viewMode === 'list') {
      viewContainerHtml = renderCertificateList(exploration.filteredRecords);
    } else {
      viewContainerHtml = renderCertificateGrid(exploration.filteredRecords);
    }

    explorationHtml = `
      <section class="space-y-4 pt-2">
        <!-- Section Header with Stats -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Explorador Operativo de Certificados</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                ISO/IEC 17021-1
              </span>
            </h2>
            <p class="text-xs text-slate-600">
              Búsqueda en tiempo real multi-criterio (N° Certificado, Empresa, RIF) y alternancia entre vista de cuadrícula relacional y lista tabular.
            </p>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="flex items-center gap-2 text-xs">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs font-medium">
              <span class="text-slate-600">Total:</span>
              <strong class="text-slate-900 font-bold">${totalCount}</strong>
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>${activeCount} Activos</span>
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-medium" title="Promedio de cumplimiento normativo">
              <span>🎯 ${avgCoverage}% Cobertura Media</span>
            </span>
          </div>
        </div>

        <!-- Search & View Controls Bar -->
        ${renderSearchControls({
          filters: exploration.filters,
          availableStatuses: exploration.availableStatuses,
          availableStandards: exploration.availableStandards,
          matchCount,
          totalCount,
        })}

        <!-- Dynamic Results Container -->
        <div id="explorationResultsContainer" class="pt-1">
          ${viewContainerHtml}
        </div>
      </section>
    `;
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- User Profile & Navigation Context Card -->
      <section class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              ${
                profile.status === 'APPROVED'
                  ? `
                    <span
                      title="${escapeHtml(roleMeta.tooltip)}"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${roleMeta.badgeClass}"
                    >
                      <span aria-hidden="true">${roleMeta.symbol}</span>
                      <span>${escapeHtml(roleMeta.label)}</span>
                    </span>
                  `
                  : ''
              }
              <span
                title="${escapeHtml(statusMeta.tooltip)}"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${statusMeta.badgeClass}"
              >
                <span aria-hidden="true">${statusMeta.symbol}</span>
                <span>${escapeHtml(statusMeta.label)}</span>
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Bienvenido, ${escapeHtml(profile.nombre)}
            </h1>
            <p class="text-xs text-slate-600">
              Sesión iniciada con <span class="font-medium text-slate-700">${escapeHtml(email)}</span>
            </p>
          </div>

          <!-- Shortcuts or quick actions -->
          ${
            profile.status === 'APPROVED' && profile.role === 'ADMIN'
              ? `
                <div class="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    data-nav="database"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span>📊</span>
                    <span>Estado del Sistema</span>
                  </button>
                </div>
              `
              : ''
          }
        </div>

        <div class="pt-3 border-t border-slate-100">
          ${statusNotice}
        </div>
      </section>

      <!-- Sub-Phase 4.2 Interactive Exploration Controls & Grid/List Results -->
      ${explorationHtml}
    </main>
  `;
}
