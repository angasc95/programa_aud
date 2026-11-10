import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';

export function renderDashboardView(profile: UserProfile, email: string): string {
  let statusNotice = `
    <p class="text-sm text-slate-600 leading-relaxed">
      Your workspace is active. Audit program tools and modules will appear here as they are added.
    </p>
  `;

  if (profile.status === 'PENDING') {
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
        <div class="space-y-1.5">
          <div class="text-xs font-medium text-slate-500">
            ${escapeHtml(profile.role)} · ${escapeHtml(profile.status)}
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
