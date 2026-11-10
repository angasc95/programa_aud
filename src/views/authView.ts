import { escapeHtml } from '../lib/html';
import { TEST_ACCOUNTS, type UserRole } from '../lib/healthCheck';

export interface AuthViewState {
  mode: 'login' | 'signup';
  errorMessage: string | null;
  successMessage: string | null;
  submitting: boolean;
  quickLoginEmail: string | null;
  email: string;
  nombre: string;
  requestedRole: UserRole;
  resetModalOpen: boolean;
  resettingDb: boolean;
  resetErrorMessage: string | null;
}

export function renderAuthView(state: AuthViewState): string {
  const isLogin = state.mode === 'login';

  const errorBanner = state.errorMessage
    ? `<div role="alert" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed">
        ${escapeHtml(state.errorMessage)}
      </div>`
    : '';

  const successBanner = state.successMessage
    ? `<div role="status" class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
        ${escapeHtml(state.successMessage)}
      </div>`
    : '';

  const tabs = `
    <div role="tablist" aria-label="Authentication mode" class="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
      <button
        type="button"
        role="tab"
        data-auth-mode="login"
        aria-selected="${isLogin ? 'true' : 'false'}"
        class="py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
          isLogin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
        }"
      >
        Log In
      </button>
      <button
        type="button"
        role="tab"
        data-auth-mode="signup"
        aria-selected="${!isLogin ? 'true' : 'false'}"
        class="py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
          !isLogin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
        }"
      >
        Sign up
      </button>
    </div>
  `;

  if (isLogin) {
    const testButtons = TEST_ACCOUNTS.map((acc) => {
      const loadingThis = state.submitting && state.quickLoginEmail === acc.email;
      return `
        <button
          type="button"
          data-quick-login="${escapeHtml(acc.email)}"
          ${state.submitting ? 'disabled' : ''}
          class="px-3 py-2 text-left border border-slate-200 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
        >
          <div class="text-xs font-semibold text-slate-900 whitespace-nowrap">
            ${loadingThis ? 'Signing in...' : escapeHtml(acc.label)}
          </div>
          <div class="text-[11px] text-slate-500 truncate">${escapeHtml(acc.role)} · ${escapeHtml(acc.email)}</div>
        </button>
      `;
    }).join('');

    return `
      <main class="flex-1 flex items-center justify-center px-4 py-10">
        <section class="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div class="space-y-1.5">
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Sign in to Programa de Auditoría</h1>
            <p class="text-xs text-slate-600 leading-relaxed">
              Access your workspace or switch quickly between test accounts.
            </p>
          </div>

          ${tabs}

          <form id="loginForm" class="space-y-4">
            ${errorBanner}
            ${successBanner}

            <div>
              <label for="loginEmail" class="block text-xs font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="loginEmail"
                name="email"
                type="email"
                required
                autocomplete="email"
                value="${escapeHtml(state.email)}"
                placeholder="name@fondonorma.test"
                class="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            <div>
              <label for="loginPassword" class="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="loginPassword"
                name="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="Enter your password"
                class="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            <button
              type="submit"
              ${state.submitting ? 'disabled' : ''}
              class="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              ${state.submitting && !state.quickLoginEmail ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div class="pt-5 border-t border-slate-100 space-y-2.5">
            <div class="text-xs font-semibold text-slate-700">Quick test login</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${testButtons}
            </div>
          </div>

          <div class="pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-700">Testing database</div>
              <div class="text-[11px] text-slate-500">Rebuild schema and restore seed data.</div>
            </div>
            <button
              id="openResetDbModalBtn"
              type="button"
              ${state.submitting || state.resettingDb ? 'disabled' : ''}
              class="px-3 py-1.5 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Reset DB
            </button>
          </div>
        </section>
      </main>
      ${
        state.resetModalOpen
          ? `<div
              id="resetDbBackdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="resetDbModalTitle"
              class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
            >
              <div class="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-6 space-y-4">
                <div class="space-y-1.5">
                  <h2 id="resetDbModalTitle" class="text-base font-bold text-slate-900">
                    Reset testing database?
                  </h2>
                  <p class="text-xs text-slate-600 leading-relaxed">
                    This will clear the <code class="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">public</code> schema and run every SQL script inside <code class="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">public/supabase/queries/</code> in sequential order (schema, functions, indexes, RLS, test users, and sample data).
                  </p>
                </div>

                ${
                  state.resetErrorMessage
                    ? `<div role="alert" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed">
                        ${escapeHtml(state.resetErrorMessage)}
                      </div>`
                    : ''
                }

                <div class="flex items-center justify-end gap-2 pt-2">
                  <button
                    id="cancelResetDbBtn"
                    type="button"
                    ${state.resettingDb ? 'disabled' : ''}
                    class="px-3.5 py-2 border border-slate-300 hover:border-slate-400 disabled:opacity-60 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirmResetDbBtn"
                    type="button"
                    ${state.resettingDb ? 'disabled' : ''}
                    class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    ${state.resettingDb ? 'Resetting database...' : 'Confirm Reset'}
                  </button>
                </div>
              </div>
            </div>`
          : ''
      }
    `;
  }

  return `
    <main class="flex-1 flex items-center justify-center px-4 py-10">
      <section class="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div class="space-y-1.5">
          <h1 class="text-xl font-bold tracking-tight text-slate-900">Create an account</h1>
          <p class="text-xs text-slate-600 leading-relaxed">
            Register a new account. Staff, auditor, and administrator requests require admin approval.
          </p>
        </div>

        ${tabs}

        <form id="signupForm" class="space-y-4">
          ${errorBanner}
          ${successBanner}

          <div>
            <label for="signupName" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Full name
            </label>
            <input
              id="signupName"
              name="nombre"
              type="text"
              required
              autocomplete="name"
              value="${escapeHtml(state.nombre)}"
              placeholder="Maria Rodriguez"
              class="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div>
            <label for="signupEmail" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Email address
            </label>
            <input
              id="signupEmail"
              name="email"
              type="email"
              required
              autocomplete="email"
              value="${escapeHtml(state.email)}"
              placeholder="maria@company.com"
              class="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div>
            <label for="signupPassword" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <input
              id="signupPassword"
              name="password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="Minimum 6 characters"
              class="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          <div>
            <label for="signupRole" class="block text-xs font-semibold text-slate-700 mb-1.5">
              Account type
            </label>
            <select
              id="signupRole"
              name="role"
              class="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value="CLIENT" ${state.requestedRole === 'CLIENT' ? 'selected' : ''}>Client (Organization access)</option>
              <option value="AUDITOR" ${state.requestedRole === 'AUDITOR' ? 'selected' : ''}>Auditor (Requires admin approval)</option>
              <option value="WORKER" ${state.requestedRole === 'WORKER' ? 'selected' : ''}>Worker / Staff (Requires admin approval)</option>
              <option value="ADMIN" ${state.requestedRole === 'ADMIN' ? 'selected' : ''}>Administrator (Requires admin approval)</option>
            </select>
          </div>

          <button
            type="submit"
            ${state.submitting ? 'disabled' : ''}
            class="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            ${state.submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  `;
}
