import { escapeHtml } from '../lib/html';
import {
  canModifyProfileRole,
  canModifyProfileStatus,
  filterProfilesByStatus,
  formatDisplayDate,
  USER_ROLES,
  type ProfileFilter,
  type UserProfile,
  type UserStatus,
} from '../lib/healthCheck';

export interface ApprovalsViewState {
  profiles: UserProfile[];
  filter: ProfileFilter;
  loading: boolean;
  updatingId: string | null;
  errorMessage: string | null;
  successMessage: string | null;
  currentAdminId: string;
}

function renderStatusText(status: UserStatus): string {
  if (status === 'APPROVED') {
    return `<span class="text-xs font-semibold text-emerald-700 whitespace-nowrap">Approved</span>`;
  }
  if (status === 'REJECTED') {
    return `<span class="text-xs font-semibold text-rose-700 whitespace-nowrap">Rejected</span>`;
  }
  return `<span class="text-xs font-semibold text-amber-700 whitespace-nowrap">Pending</span>`;
}

export function renderApprovalsView(state: ApprovalsViewState): string {
  const pendingCount = state.profiles.filter((p) => p.status === 'PENDING').length;
  const approvedCount = state.profiles.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = state.profiles.filter((p) => p.status === 'REJECTED').length;
  const filtered = filterProfilesByStatus(state.profiles, state.filter);

  const filterTabs: Array<{ id: ProfileFilter; label: string }> = [
    { id: 'PENDING', label: `Pending (${pendingCount})` },
    { id: 'APPROVED', label: `Approved (${approvedCount})` },
    { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
    { id: 'ALL', label: `All (${state.profiles.length})` },
  ];

  const tabsHtml = filterTabs
    .map(
      (tab) => `
      <button
        type="button"
        data-approval-filter="${tab.id}"
        class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
          state.filter === tab.id
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }"
      >
        ${escapeHtml(tab.label)}
      </button>
    `
    )
    .join('');

  let bodyHtml = '';

  if (state.loading && state.profiles.length === 0) {
    bodyHtml = `
      <div class="p-8 text-center text-xs text-slate-500">
        Loading user requests...
      </div>
    `;
  } else if (filtered.length === 0) {
    const emptyText =
      state.filter === 'PENDING'
        ? 'No users are currently waiting for approval.'
        : 'No users match this filter.';

    bodyHtml = `
      <div class="p-8 text-center space-y-3">
        <p class="text-sm font-medium text-slate-700">${emptyText}</p>
        ${
          state.filter !== 'ALL'
            ? `<button type="button" data-approval-filter="ALL" class="px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg cursor-pointer">
                View all users
              </button>`
            : ''
        }
      </div>
    `;
  } else {
    bodyHtml = filtered
      .map((item) => {
        const isUpdating = state.updatingId === item.id;
        const canModify = canModifyProfileStatus(item.id, state.currentAdminId);
        const canChangeRole = canModifyProfileRole(item.id, state.currentAdminId, item.status);

        let actions = `<span class="text-xs text-slate-400 whitespace-nowrap">Current account</span>`;
        if (canModify) {
          const roleSelect = canChangeRole
            ? `<label class="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span class="sr-only">Role</span>
                <select
                  data-role-select="${escapeHtml(item.id)}"
                  aria-label="Change role for ${escapeHtml(item.nombre)}"
                  ${isUpdating ? 'disabled' : ''}
                  class="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-slate-400 disabled:opacity-60 text-slate-700 text-xs font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
                >
                  ${USER_ROLES.map(
                    (roleOption) =>
                      `<option value="${roleOption}" ${
                        item.role === roleOption ? 'selected' : ''
                      }>${roleOption}</option>`
                  ).join('')}
                </select>
              </label>`
            : '';

          const approveBtn =
            item.status !== 'APPROVED'
              ? `<button
                  type="button"
                  data-approve-user="${escapeHtml(item.id)}"
                  ${isUpdating ? 'disabled' : ''}
                  class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  ${isUpdating ? 'Saving...' : 'Approve'}
                </button>`
              : '';

          const rejectBtn =
            item.status !== 'REJECTED'
              ? `<button
                  type="button"
                  data-reject-user="${escapeHtml(item.id)}"
                  ${isUpdating ? 'disabled' : ''}
                  class="px-3 py-1.5 border border-slate-300 hover:border-rose-300 hover:text-rose-700 disabled:opacity-60 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  ${isUpdating ? 'Saving...' : item.status === 'APPROVED' ? 'Revoke' : 'Reject'}
                </button>`
              : '';

          actions = `<div class="flex items-center gap-2 shrink-0 flex-wrap">${roleSelect}${approveBtn}${rejectBtn}</div>`;
        }

        return `
          <div class="px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-900">${escapeHtml(item.nombre)}</span>
                <span class="text-xs text-slate-400" aria-hidden="true">·</span>
                <span class="text-xs font-medium text-slate-600">${escapeHtml(item.role)}</span>
                <span class="text-xs text-slate-400" aria-hidden="true">·</span>
                ${renderStatusText(item.status)}
              </div>
              <div class="text-xs text-slate-500 tabular-nums">
                Requested ${escapeHtml(formatDisplayDate(item.created_at))}
              </div>
            </div>

            ${actions}
          </div>
        `;
      })
      .join('');
  }

  const errorBanner = state.errorMessage
    ? `<div role="alert" class="mx-6 sm:mx-8 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
        ${escapeHtml(state.errorMessage)}
      </div>`
    : '';

  const successBanner = state.successMessage
    ? `<div role="status" class="mx-6 sm:mx-8 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
        ${escapeHtml(state.successMessage)}
      </div>`
    : '';

  return `
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <section class="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div class="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <h1 class="text-xl font-bold tracking-tight text-slate-900">User Approvals</h1>
            <p class="text-xs text-slate-500">
              Approve, reject, or manage roles for user accounts.
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              id="refreshApprovalsBtn"
              type="button"
              ${state.loading ? 'disabled' : ''}
              class="px-3.5 py-2 border border-slate-300 hover:border-slate-400 disabled:opacity-60 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              ${state.loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div class="px-6 sm:px-8 py-3 bg-slate-50/70 flex items-center justify-between gap-4 overflow-x-auto">
          <div class="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            ${tabsHtml}
          </div>
        </div>

        ${errorBanner}
        ${successBanner}
        ${bodyHtml}
      </section>
    </main>
  `;
}
