import { escapeHtml } from '../lib/html';
import {
  getRoleVisualMeta,
  getStatusVisualMeta,
  getVisibleDomainMenus,
  type ActiveRoute,
  type UserProfile,
} from '../lib/healthCheck';

export function renderDashboardView(
  profile: UserProfile,
  email: string,
  activeRoute: ActiveRoute = 'dashboard',
  activeSubSection: string | null = null
): string {
  const roleMeta = getRoleVisualMeta(profile.role);
  const statusMeta = getStatusVisualMeta(profile.status);
  const visibleDomains = getVisibleDomainMenus(profile);

  const selectedDomain = visibleDomains.find((d) => d.id === activeRoute);
  const selectedItem = selectedDomain?.items.find((i) => i.id === activeSubSection);

  let statusNotice = `
    <p class="text-sm text-slate-600 leading-relaxed">
      Your workspace is active. Select a module from the domain menus above to explore operational capabilities.
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
            Back to overview
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
        <span class="font-semibold block mb-1">Pending administrator approval</span>
        Your account request for <span class="font-semibold">${escapeHtml(profile.role)}</span> access is awaiting review by an administrator.
      </div>
    `;
  } else if (profile.status === 'REJECTED') {
    statusNotice = `
      <div class="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
        <span class="font-semibold block mb-1">Account access not approved</span>
        This account request was declined by an administrator. Contact your coordinator if you believe this is an error.
      </div>
    `;
  }

  return `
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
      <section class="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span
              title="${escapeHtml(roleMeta.tooltip)}"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${roleMeta.badgeClass}"
            >
              <span aria-hidden="true">${roleMeta.symbol}</span>
              <span>${escapeHtml(roleMeta.label)}</span>
            </span>
            <span
              title="${escapeHtml(statusMeta.tooltip)}"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${statusMeta.badgeClass}"
            >
              <span aria-hidden="true">${statusMeta.symbol}</span>
              <span>${escapeHtml(statusMeta.label)}</span>
            </span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">
            Welcome, ${escapeHtml(profile.nombre)}
          </h1>
          <p class="text-xs text-slate-500">
            Signed in as ${escapeHtml(email)}
          </p>
        </div>

        <div class="pt-4 border-t border-slate-100">
          ${statusNotice}
        </div>
      </section>
    </main>
  `;
}
