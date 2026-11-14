import { escapeHtml } from '../lib/html';
import {
  computeFieldDiffs,
  formatAuditTimestampLocal,
  formatDiffValue,
  getActionVisualMeta,
  resolveAuditActorDisplay,
  type ActorDirectoryEntry,
  type AuditLogEntry,
} from '../lib/auditLog';

export interface AuditLogModalProps {
  isOpen: boolean;
  entityName: string;
  tableName: string;
  recordId: string;
  entries: AuditLogEntry[];
  actorDirectory?: Record<string, ActorDirectoryEntry>;
  loading: boolean;
  errorMessage?: string | null;
}

export function renderAuditLogModal(props: AuditLogModalProps): string {
  const {
    isOpen,
    entityName,
    tableName,
    entries,
    actorDirectory,
    loading,
    errorMessage,
  } = props;

  if (!isOpen) return '';

  let bodyContentHtml = '';

  if (loading) {
    bodyContentHtml = `
      <div class="py-12 text-center space-y-3">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true"></div>
        <p class="text-xs text-slate-500 font-medium">Consultando auditoría forense en public.audit_log...</p>
      </div>
    `;
  } else if (errorMessage) {
    bodyContentHtml = `
      <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
        <div class="font-bold">Error al consultar el historial de auditoría</div>
        <div>${escapeHtml(errorMessage)}</div>
      </div>
    `;
  } else if (entries.length === 0) {
    bodyContentHtml = `
      <div class="py-10 text-center space-y-2">
        <div class="text-2xl" aria-hidden="true">📜</div>
        <div class="text-xs font-bold text-slate-800">No hay registros de auditoría disponibles</div>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          No se encontraron eventos de inserción o modificación en public.audit_log para esta entidad.
        </p>
      </div>
    `;
  } else {
    bodyContentHtml = `
      <div class="space-y-4">
        <div class="text-xs text-slate-500 font-medium">
          Se encontraron <span class="font-bold text-slate-900">${entries.length}</span> evento(s) de mutación registrados:
        </div>

        <div class="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-6">
          ${entries
            .map((entry) => {
              const op = entry.operation || entry.action || 'UPDATE';
              const timestamp =
                entry.performed_at ||
                entry.changed_at ||
                entry.created_at ||
                new Date().toISOString();
              const actionMeta = getActionVisualMeta(op);
              const diffs = computeFieldDiffs(entry.old_data, entry.new_data, op);
              const actorInfo = resolveAuditActorDisplay(entry, actorDirectory);
              const formattedLocal = formatAuditTimestampLocal(timestamp);

              return `
                <div class="relative space-y-2.5">
                  <!-- Timeline node dot -->
                  <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-indigo-500"></div>

                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${actionMeta.badgeClass}">
                        <span aria-hidden="true">${actionMeta.symbol}</span>
                        <span>${escapeHtml(actionMeta.label)}</span>
                      </span>
                      <span class="text-xs font-semibold text-slate-700">
                        ${escapeHtml(actorInfo.formatted)}
                      </span>
                    </div>
                    <time class="text-[11px] font-mono text-slate-500" datetime="${escapeHtml(timestamp)}">
                      ${escapeHtml(formattedLocal)}
                    </time>
                  </div>

                  <!-- Field diffs table -->
                  ${
                    diffs.length > 0
                      ? `
                        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Campos Afectados (${diffs.length})
                          </div>
                          <div class="space-y-1.5 font-mono text-[11px]">
                            ${diffs
                              .map((diff) => {
                                const oldFormatted = formatDiffValue(diff.oldValue);
                                const newFormatted = formatDiffValue(diff.newValue);

                                return `
                                  <div class="p-2 rounded bg-white border border-slate-200/80 space-y-1">
                                    <div class="font-bold text-slate-800 text-xs">
                                      ${escapeHtml(diff.fieldName)}
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                      <div class="text-rose-700 bg-rose-50/60 p-1.5 rounded border border-rose-100 truncate" title="Anterior: ${escapeHtml(oldFormatted)}">
                                        <span class="font-bold select-none">- </span>${escapeHtml(oldFormatted)}
                                      </div>
                                      <div class="text-emerald-700 bg-emerald-50/60 p-1.5 rounded border border-emerald-100 truncate" title="Nuevo: ${escapeHtml(newFormatted)}">
                                        <span class="font-bold select-none">+ </span>${escapeHtml(newFormatted)}
                                      </div>
                                    </div>
                                  </div>
                                `;
                              })
                              .join('')}
                          </div>
                        </div>
                      `
                      : `
                        <div class="text-xs text-slate-400 italic">
                          Sin diferencias registradas en campos de datos.
                        </div>
                      `
                  }
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  return `
    <div
      id="auditLogModalBackdrop"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auditLogModalTitle"
    >
      <div class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-xl shrink-0 select-none" aria-hidden="true">🕒</span>
            <div class="min-w-0">
              <h2 id="auditLogModalTitle" class="text-sm font-bold text-slate-900 truncate">
                Historial de Cambios · ${escapeHtml(entityName)}
              </h2>
              <p class="text-[11px] text-slate-500 font-mono truncate">
                Tabla: ${escapeHtml(tableName)}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="closeAuditLogModalBtn"
            title="Cerrar modal (Esc)"
            aria-label="Cerrar historial de cambios"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 max-h-[70vh] overflow-y-auto">
          ${bodyContentHtml}
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
          <span class="text-slate-400 text-[11px]">
            Inmutabilidad garantizada por triggers forenses PostgreSQL (ISO/IEC 17021-1:2015)
          </span>
          <button
            type="button"
            id="closeAuditLogModalFooterBtn"
            class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `;
}
