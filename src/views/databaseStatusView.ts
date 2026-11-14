import { escapeHtml } from '../lib/html';
import { summarizeHealthChecks, type HealthCheckItem } from '../lib/healthCheck';
import { APP_SHELL_CONTAINER_CLASS } from '../lib/layout';

function renderCheckState(state: HealthCheckItem['state']): string {
  if (state === 'pass') {
    return `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Working
    </span>`;
  }
  if (state === 'warn') {
    return `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      Warning
    </span>`;
  }
  if (state === 'fail') {
    return `<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Issue
    </span>`;
  }
  return `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
    <svg class="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path>
    </svg>
    Checking
  </span>`;
}

export function renderDatabaseStatusView(
  checks: HealthCheckItem[],
  running: boolean,
  lastCheckedAt: string | null
): string {
  const summary = summarizeHealthChecks(checks);

  let statusColor = 'text-slate-700';
  let statusTag = 'Checking';
  if (summary.overall === 'operational') {
    statusColor = 'text-emerald-700';
    statusTag = 'Healthy';
  } else if (summary.overall === 'attention') {
    statusColor = 'text-amber-700';
    statusTag = 'Attention Needed';
  } else if (summary.overall === 'offline') {
    statusColor = 'text-rose-700';
    statusTag = 'Connection Issue';
  }

  const metaParts: string[] = [summary.subtext];
  if (summary.avgLatencyMs !== null) {
    metaParts.push(`Avg. response ${summary.avgLatencyMs} ms`);
  }
  if (lastCheckedAt) {
    metaParts.push(`Last checked ${lastCheckedAt}`);
  }

  const rows = checks
    .map(
      (item) => `
      <div class="bg-white px-6 sm:px-8 py-5 flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-slate-900">${escapeHtml(item.label)}</div>
          <p class="text-xs text-slate-500 mt-0.5 max-w-xl">${escapeHtml(item.description)}</p>
          <p class="text-xs text-slate-700 mt-1.5 font-medium">${escapeHtml(item.detail)}</p>
        </div>
        <div class="shrink-0 text-right space-y-1">
          <div>${renderCheckState(item.state)}</div>
          ${
            typeof item.durationMs === 'number'
              ? `<div class="text-xs font-mono tabular-nums text-slate-400">${item.durationMs} ms</div>`
              : ''
          }
        </div>
      </div>
    `
    )
    .join('');

  return `
    <main class="flex-1 ${APP_SHELL_CONTAINER_CLASS} py-8 sm:py-10">
      <section class="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
        <div class="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1.5">
            <div class="text-xs font-semibold ${statusColor}">${statusTag}</div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900" style="text-wrap: balance;">
              ${escapeHtml(summary.headline)}
            </h1>
            <p class="text-xs text-slate-500 leading-relaxed tabular-nums">
              ${escapeHtml(metaParts.join(' · '))}
            </p>
          </div>

          <button
            id="runCheckBtn"
            type="button"
            ${running ? 'disabled' : ''}
            class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            ${running ? 'Checking...' : 'Run health check'}
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-100">
          ${rows}
        </div>
      </section>
    </main>
  `;
}
