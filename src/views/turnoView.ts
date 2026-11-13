import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  canArchiveTurno,
  formatTurnoTime,
  type TurnoAuditoriaLink,
  type TurnoDetailEntity,
  type TurnoSitioLink,
} from '../lib/turnoDomain';
import { renderDetailPageTemplate, type DetailParentChip } from './detailTemplate';

export type TurnoChildTab = 'sitios' | 'auditorias';

export interface TurnoViewState {
  selectedTurnoId: string | null;
  originatingSitioId: string | null;
  activeChildTab: TurnoChildTab;
  isEditingAttributes: boolean;
  editFormData?: {
    hora_entrada?: string;
    hora_salida?: string;
    descripcion?: string;
  };
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  archiveConfirmOpen?: boolean;
  archiveErrorMessage?: string | null;
}

export interface TurnoViewProps {
  profile: UserProfile;
  state: TurnoViewState;
  turno: TurnoDetailEntity;
}

export function renderTurnoView(props: TurnoViewProps): string {
  const { profile, state, turno } = props;

  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');
  const isEditing = Boolean(state.isEditingAttributes) && isStaff;
  const activeTab: TurnoChildTab =
    state.activeChildTab === 'auditorias' ? 'auditorias' : 'sitios';

  const startFormatted = formatTurnoTime(turno.hora_entrada);
  const endFormatted = formatTurnoTime(turno.hora_salida);
  const titleLabel = `${startFormatted} – ${endFormatted}`;

  const archiveGuard = canArchiveTurno({
    assignedSitiosCount: turno.sitios.length,
  });

  // Contextual Parent Zone: populated ONLY when opened from a specific Sitio
  const parents: DetailParentChip[] = turno.parentSitio
    ? [
        {
          label: 'Sitio',
          value: `Sitio ${turno.parentSitio.numero_sitio} — ${turno.parentSitio.nombre_sitio}`,
          symbol: turno.parentSitio.numero_sitio === 0 ? '🏢' : '📍',
          navAction: {
            nav: 'certificacion',
            subview: 'certificates',
            entityType: 'sitio',
            entityId: turno.parentSitio.id_sitio,
          },
        },
        {
          label: 'Certificado',
          value: `${turno.parentSitio.numero_certificado} · ${turno.parentSitio.norma_codigo}`,
          symbol: '📜',
          navAction: {
            nav: 'certificacion',
            subview: 'certificates',
            entityType: 'cert',
            entityId: turno.parentSitio.id_certificado,
          },
        },
      ]
    : [];

  const recordActionsHtml = isStaff
    ? `
      <div class="flex flex-wrap items-center gap-2">
        ${
          isEditing
            ? `
              <button
                type="button"
                id="cancelEditTurnoBtn"
                class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Cancelar Edición
              </button>
            `
            : `
              <button
                type="button"
                id="startEditTurnoBtn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <span aria-hidden="true">✏️</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                data-action="open-archive-turno"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${
                  archiveGuard.allowed
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                } rounded-lg border transition-colors cursor-pointer"
              >
                <span aria-hidden="true">🗄️</span>
                <span>Archivar</span>
              </button>
            `
        }
      </div>
    `
    : '';

  const feedbackHtml = `
    ${
      state.saveSuccessMessage
        ? `
          <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
            <span>✓</span>
            <span>${escapeHtml(state.saveSuccessMessage)}</span>
          </div>
        `
        : ''
    }
    ${
      state.editErrorMessage
        ? `
          <div role="alert" class="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
            <span>✕</span>
            <span>${escapeHtml(state.editErrorMessage)}</span>
          </div>
        `
        : ''
    }
    ${
      state.archiveErrorMessage
        ? `
          <div role="alert" class="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium rounded-lg flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>${escapeHtml(state.archiveErrorMessage)}</span>
          </div>
        `
        : ''
    }
    ${
      isStaff && state.archiveConfirmOpen
        ? archiveGuard.allowed
          ? `
            <div class="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3">
              <div class="space-y-0.5">
                <h4 class="text-xs font-bold text-rose-900">Confirmar archivo lógico de turno operativo</h4>
                <p class="text-[11px] text-rose-800">
                  El turno <strong>${escapeHtml(titleLabel)}</strong> (${escapeHtml(turno.descripcion)}) pasará a estado archivado (soft-delete) manteniendo la trazabilidad en Historial de Cambios.
                </p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div class="sm:col-span-2">
                  <label for="archiveTurnoReasonInput" class="sr-only">Motivo de archivo</label>
                  <input
                    id="archiveTurnoReasonInput"
                    type="text"
                    placeholder="Motivo de archivo (opcional, ej. Ajuste de jornadas operativas)"
                    class="w-full text-xs rounded-lg border border-rose-300 bg-white px-2.5 py-1.5"
                  />
                </div>
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    id="cancelArchiveTurnoBtn"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="confirmArchiveTurnoBtn"
                    class="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
                  >
                    Confirmar Archivo
                  </button>
                </div>
              </div>
            </div>
          `
          : `
            <div role="alert" class="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="text-xs font-medium text-amber-900">
                <strong class="font-bold">Archivo bloqueado:</strong> ${escapeHtml(archiveGuard.reason || 'Existen sedes activas vinculadas a este turno.')}
              </div>
              <button
                type="button"
                id="cancelArchiveTurnoBtn"
                class="px-3 py-1 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg cursor-pointer self-start sm:self-auto"
              >
                Entendido
              </button>
            </div>
          `
        : ''
    }
  `;

  const customRecordBodyHtml = isEditing
    ? renderEditTurnoForm(turno, state.editFormData)
    : renderReadOnlyTurnoBody(turno, startFormatted, endFormatted);

  return renderDetailPageTemplate({
    entityType: 'Turno Operativo',
    entitySymbol: turno.isOvernight ? '🌙' : '🕒',
    title: titleLabel,
    eyebrowCode: turno.descripcion,
    subtitle: turno.parentSitio
      ? `Contexto operativo en Sitio ${turno.parentSitio.numero_sitio} (${turno.parentSitio.nombre_sitio})`
      : `Jornada laboral aplicable en ${turno.sitios.length} sede(s) operativa(s)`,
    statusBadge: {
      label: `Duración: ${turno.durationLabel}`,
      badgeClass: turno.isOvernight
        ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
        : 'bg-emerald-50 text-emerald-900 border-emerald-200',
      symbol: turno.isOvernight ? '🌙' : '⏱️',
    },
    secondaryHeaderBadge: {
      label: `${turno.sitios.length} sede(s) vinculada(s)`,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    backButton: {
      label: turno.parentSitio
        ? `Volver a Sitio ${turno.parentSitio.numero_sitio}`
        : 'Volver',
      nav: 'certificacion',
      subview: 'certificates',
      action: 'back-from-turno',
    },
    parents,
    tableName: 'turno',
    recordId: turno.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml,
    childTabs: [
      {
        id: 'sitios',
        label: 'Sedes Operativas con este Turno',
        symbol: '📍',
        count: turno.sitios.length,
      },
      {
        id: 'auditorias',
        label: 'Auditorías en este Turno',
        symbol: '🗓️',
        count: turno.auditorias.length,
      },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-turno-tab',
    renderChildTabContent: (tabId) =>
      tabId === 'auditorias'
        ? renderTurnoAuditoriasTab(turno, turno.auditorias)
        : renderTurnoSitiosTab(turno, turno.sitios),
  });
}

function renderReadOnlyTurnoBody(
  turno: TurnoDetailEntity,
  startFormatted: string,
  endFormatted: string
): string {
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Horario de Entrada</div>
        <div class="text-sm font-mono font-bold text-slate-900">${escapeHtml(startFormatted)}</div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Horario de Salida</div>
        <div class="text-sm font-mono font-bold text-slate-900">${escapeHtml(endFormatted)}</div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duración Calculada</div>
        <div>
          <span class="inline-flex px-2 py-0.5 rounded font-mono text-xs font-bold border ${
            turno.isOvernight
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }">
            ${escapeHtml(turno.durationLabel)}
          </span>
        </div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción Operativa</div>
        <div class="text-xs font-bold text-slate-900">${escapeHtml(turno.descripcion)}</div>
      </div>
    </div>
  `;
}

function renderEditTurnoForm(
  turno: TurnoDetailEntity,
  formData?: TurnoViewState['editFormData']
): string {
  const startVal = formatTurnoTime(formData?.hora_entrada ?? turno.hora_entrada);
  const endVal = formatTurnoTime(formData?.hora_salida ?? turno.hora_salida);
  const descVal = formData?.descripcion ?? turno.descripcion;

  return `
    <form id="editTurnoForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="space-y-1">
          <label for="editTurnoEntradaInput" class="block text-xs font-bold text-slate-700">Hora Entrada (HH:MM) *</label>
          <input
            id="editTurnoEntradaInput"
            name="hora_entrada"
            type="time"
            required
            value="${escapeHtml(startVal)}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div class="space-y-1">
          <label for="editTurnoSalidaInput" class="block text-xs font-bold text-slate-700">Hora Salida (HH:MM) *</label>
          <input
            id="editTurnoSalidaInput"
            name="hora_salida"
            type="time"
            required
            value="${escapeHtml(endVal)}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p class="text-[10px] text-slate-500">Admite cruce de medianoche (ej. 22:00 → 06:00).</p>
        </div>

        <div class="space-y-1">
          <label for="editTurnoDescripcionInput" class="block text-xs font-bold text-slate-700">Descripción Operativa</label>
          <input
            id="editTurnoDescripcionInput"
            name="descripcion"
            type="text"
            value="${escapeHtml(descVal)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          id="cancelEditTurnoBtnSecondary"
          class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          💾 Guardar Turno
        </button>
      </div>
    </form>
  `;
}

function renderTurnoSitiosTab(
  turno: TurnoDetailEntity,
  sitios: ReadonlyArray<TurnoSitioLink>
): string {
  if (sitios.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">📍</div>
        <h4 class="text-xs font-bold text-slate-800">Sin sedes operativas vinculadas a este turno</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Ninguna sede física tiene actualmente asignada la franja horaria ${escapeHtml(formatTurnoTime(turno.hora_entrada))} – ${escapeHtml(formatTurnoTime(turno.hora_salida))}.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Sedes Operativas con este Turno</h3>
        <p class="text-xs text-slate-500">
          Instalaciones físicas donde opera el turno ${escapeHtml(formatTurnoTime(turno.hora_entrada))} – ${escapeHtml(formatTurnoTime(turno.hora_salida))}.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Sitio Operativo</th>
              <th scope="col" class="py-3 px-4">Certificado</th>
              <th scope="col" class="py-3 px-4">Organización</th>
              <th scope="col" class="py-3 px-4">Dirección</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${sitios
              .map((site) => {
                const isHq = site.numero_sitio === 0;
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-sitio"
                        data-sitio-id="${escapeHtml(site.id_sitio)}"
                        data-cert-id="${escapeHtml(site.id_certificado)}"
                        class="inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer text-left"
                      >
                        <span class="font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          isHq ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }">
                          Sitio ${site.numero_sitio}
                        </span>
                        <span>${escapeHtml(site.nombre_sitio)}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-cert"
                        data-cert-id="${escapeHtml(site.id_certificado)}"
                        class="font-mono font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                      >
                        📜 ${escapeHtml(site.numero_certificado)}
                      </button>
                      <div class="text-[11px] text-slate-500">${escapeHtml(site.norma_codigo)}</div>
                    </td>
                    <td class="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      ${escapeHtml(site.organizacion_nombre)}
                    </td>
                    <td class="py-3 px-4 text-slate-600">
                      ${escapeHtml(site.direccion_sitio)}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTurnoAuditoriasTab(
  turno: TurnoDetailEntity,
  auditorias: ReadonlyArray<TurnoAuditoriaLink>
): string {
  if (auditorias.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">🗓️</div>
        <h4 class="text-xs font-bold text-slate-800">Sin auditorías programadas en este turno</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          No hay jornadas de auditoría asignadas actualmente a las sedes que operan en ${escapeHtml(formatTurnoTime(turno.hora_entrada))} – ${escapeHtml(formatTurnoTime(turno.hora_salida))}.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Auditorías en este Turno</h3>
        <p class="text-xs text-slate-500">
          Eventos de evaluación programados o ejecutados durante la cobertura de este turno.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Código Auditoría</th>
              <th scope="col" class="py-3 px-4">Sitio Evaluado</th>
              <th scope="col" class="py-3 px-4">Fecha</th>
              <th scope="col" class="py-3 px-4">Metodología</th>
              <th scope="col" class="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditorias
              .map((aud) => {
                const isDone =
                  aud.estatus === 'Completada' ||
                  aud.estatus === 'Completado' ||
                  aud.estatus === 'Cerrada' ||
                  aud.estatus === 'Cerrado';
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(aud.id_auditoria)}"
                        class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <span aria-hidden="true">🗓️</span>
                        <span>${escapeHtml(aud.codigo_auditoria)}</span>
                      </button>
                      <div class="text-[11px] text-slate-500">${escapeHtml(aud.tipo_auditoria)} · ${escapeHtml(aud.numero_certificado)}</div>
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                      ${
                        aud.id_sitio
                          ? `
                            <button
                              type="button"
                              data-action="select-sitio"
                              data-sitio-id="${escapeHtml(aud.id_sitio)}"
                              data-cert-id="${escapeHtml(aud.id_certificado)}"
                              class="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer text-left"
                            >
                              ${aud.numero_sitio !== null ? `Sitio ${aud.numero_sitio} — ` : ''}${escapeHtml(aud.nombre_sitio)}
                            </button>
                          `
                          : `<span class="text-slate-700">${escapeHtml(aud.nombre_sitio)}</span>`
                      }
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">${escapeHtml(aud.fecha_programacion)}</td>
                    <td class="py-3 px-4 text-slate-700 whitespace-nowrap">${escapeHtml(aud.metodologia)}</td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }">
                        ${escapeHtml(aud.estatus)}
                      </span>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
