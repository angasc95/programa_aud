import { escapeHtml } from '../lib/html';
import {
  formatArchiveDependencyLines,
  ARCHIVE_REASON_MAX_LENGTH,
  type ArchiveModalState,
  type ArchiveToastState,
} from '../lib/archiveGovernance';

export function renderArchiveModal(modalState: ArchiveModalState): string {
  if (!modalState.isOpen) return '';

  const summary = modalState.summary;
  const isBlocked = Boolean(summary && !summary.can_archive);
  const canConfirm = Boolean(
    !modalState.loadingSummary &&
      !modalState.submitting &&
      summary &&
      summary.can_archive
  );
  const dependencyLines = summary ? formatArchiveDependencyLines(summary) : [];

  let bodyHtml = '';

  if (modalState.loadingSummary) {
    bodyHtml = `
      <div class="py-10 text-center space-y-3">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true"></div>
        <p class="text-xs font-medium text-slate-600">
          Verificando dependencias activas en la base de datos...
        </p>
      </div>
    `;
  } else if (isBlocked && summary) {
    bodyHtml = `
      <div class="space-y-4">
        <div role="alert" class="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2.5">
          <div class="flex items-start gap-2.5">
            <span class="text-lg leading-none shrink-0" aria-hidden="true">⚠️</span>
            <div class="space-y-1">
              <h3 class="text-xs font-bold text-amber-950">
                Archivo bloqueado por dependencias activas (${summary.total_active_dependencies})
              </h3>
              <p class="text-xs text-amber-900 leading-relaxed">
                No es posible archivar <strong>${escapeHtml(modalState.recordTitle)}</strong> mientras existan registros dependientes activos:
              </p>
            </div>
          </div>
          <ul class="pl-7 space-y-1 text-xs font-semibold text-amber-950 list-disc">
            ${dependencyLines
              .map(
                (line) =>
                  `<li class="tabular-nums">${escapeHtml(line)}</li>`
              )
              .join('')}
          </ul>
          <p class="text-[11px] text-amber-800 pt-1 border-t border-amber-200/80">
            Archive o desvincule primero los registros dependientes indicados para habilitar el archivo lógico seguro.
          </p>
        </div>

        ${
          modalState.errorMessage
            ? `
              <div role="alert" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
                ${escapeHtml(modalState.errorMessage)}
              </div>
            `
            : ''
        }
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="space-y-4">
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Archivo Lógico Seguro (Soft-Delete)
          </div>
          <p class="text-xs text-slate-700 leading-relaxed">
            El registro <strong>${escapeHtml(modalState.recordTitle)}</strong> dejará de mostrarse en las vistas operativas y quedará registrado en la bitácora forense de auditoría. Un administrador podrá restaurarlo posteriormente si fuese necesario.
          </p>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <label for="archiveReasonInput" class="block text-xs font-bold text-slate-700">
              Motivo de archivo / retención <span class="font-normal text-slate-400">(opcional)</span>
            </label>
            <span class="text-[11px] font-mono text-slate-400 tabular-nums">
              <span id="archiveReasonCharCount">${modalState.reason.length}</span> / ${ARCHIVE_REASON_MAX_LENGTH}
            </span>
          </div>
          <input
            id="archiveReasonInput"
            type="text"
            maxlength="${ARCHIVE_REASON_MAX_LENGTH}"
            value="${escapeHtml(modalState.reason)}"
            placeholder="Ej. Cierre operativo, fin de vigencia o duplicado administrativo"
            class="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        ${
          modalState.errorMessage
            ? `
              <div role="alert" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
                ${escapeHtml(modalState.errorMessage)}
              </div>
            `
            : ''
        }
      </div>
    `;
  }

  return `
    <div
      id="archiveGovernanceModalBackdrop"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archiveGovernanceModalTitle"
    >
      <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-xl shrink-0 select-none" aria-hidden="true">🗄️</span>
            <div class="min-w-0">
              <h2 id="archiveGovernanceModalTitle" class="text-sm font-bold text-slate-900 truncate">
                Archivar ${escapeHtml(modalState.entityTypeLabel)}
              </h2>
              <p class="text-[11px] text-slate-500 truncate">
                ${escapeHtml(modalState.recordTitle)}${
                  modalState.recordSubtitle
                    ? ` · ${escapeHtml(modalState.recordSubtitle)}`
                    : ''
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            id="closeArchiveModalBtn"
            title="Cerrar diálogo (Esc)"
            aria-label="Cerrar diálogo de archivo"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="px-6 py-5">
          ${bodyHtml}
        </div>

        <div class="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            id="cancelArchiveModalBtn"
            ${modalState.submitting ? 'disabled' : ''}
            class="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            ${isBlocked ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            type="button"
            id="confirmArchiveModalBtn"
            ${!canConfirm ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              canConfirm
                ? 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer shadow-2xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }"
          >
            ${
              modalState.submitting
                ? 'Archivando...'
                : 'Confirmar Archivo'
            }
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderArchiveToast(toast: ArchiveToastState | null): string {
  if (!toast) return '';
  const toneClass =
    toast.tone === 'warning'
      ? 'bg-amber-900 text-amber-50 border-amber-700'
      : toast.tone === 'info'
      ? 'bg-slate-900 text-slate-50 border-slate-700'
      : 'bg-emerald-900 text-emerald-50 border-emerald-700';

  return `
    <div
      id="archiveGovernanceToast"
      role="status"
      aria-live="polite"
      class="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border px-4 py-3 shadow-lg flex items-center justify-between gap-3 text-xs font-semibold ${toneClass}"
    >
      <span>${escapeHtml(toast.message)}</span>
      <button
        type="button"
        id="dismissArchiveToastBtn"
        aria-label="Cerrar notificación"
        class="text-white/70 hover:text-white cursor-pointer shrink-0"
      >
        ✕
      </button>
    </div>
  `;
}
