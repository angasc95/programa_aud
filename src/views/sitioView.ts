import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  canArchiveSitio,
  formatShiftTime,
  INITIAL_TURNO_CATALOG,
  type SitioAuditoriaLink,
  type SitioDetailEntity,
  type SitioTurnoAssignment,
  type TurnoCatalogItem,
} from '../lib/sitioDomain';
import { renderDetailPageTemplate, type DetailParentChip } from './detailTemplate';

export type SitioChildTab = 'turnos' | 'auditorias';

export interface SitioViewState {
  selectedSitioId: string | null;
  activeChildTab: SitioChildTab;
  isEditingAttributes: boolean;
  editFormData?: {
    numero_sitio?: number | string;
    nombre_sitio?: string;
    direccion_sitio?: string;
  };
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  archiveConfirmOpen?: boolean;
  archiveErrorMessage?: string | null;
  isAssigningShift?: boolean;
  shiftActionMessage?: string | null;
}

export interface SitioViewProps {
  profile: UserProfile;
  state: SitioViewState;
  sitio: SitioDetailEntity;
  siblingSites?: ReadonlyArray<{
    id: string;
    id_certificado: string;
    numero_sitio: number;
    deleted_at?: string | null;
  }>;
  shiftCatalog?: ReadonlyArray<TurnoCatalogItem>;
}

export function renderSitioView(props: SitioViewProps): string {
  const {
    profile,
    state,
    sitio,
    siblingSites = [],
    shiftCatalog = INITIAL_TURNO_CATALOG,
  } = props;

  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');
  const isHq = sitio.numero_sitio === 0;
  const isEditing = Boolean(state.isEditingAttributes) && isStaff;
  const activeTab: SitioChildTab =
    state.activeChildTab === 'auditorias' ? 'auditorias' : 'turnos';

  const archiveGuard = canArchiveSitio({
    site: sitio,
    siblingSites,
    associatedAuditsCount: sitio.auditorias.length,
  });

  const parents: DetailParentChip[] = [
    {
      label: 'Organización',
      value: `${sitio.organizacion_nombre} (${sitio.organizacion_rif})`,
      symbol: '🏢',
      navAction: {
        nav: 'certificacion',
        subview: 'organizations',
        entityType: 'org',
        entityId: sitio.id_organizacion,
      },
    },
    {
      label: 'Certificado',
      value: `${sitio.numero_certificado} · ${sitio.norma_codigo}`,
      symbol: '📜',
      navAction: {
        nav: 'certificacion',
        subview: 'certificates',
        entityType: 'cert',
        entityId: sitio.id_certificado,
      },
    },
  ];

  const recordActionsHtml = isStaff
    ? `
      <div class="flex flex-wrap items-center gap-2">
        ${
          isEditing
            ? `
              <button
                type="button"
                id="cancelEditSitioBtn"
                class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Cancelar Edición
              </button>
            `
            : `
              <button
                type="button"
                id="startEditSitioBtn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <span aria-hidden="true">✏️</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                data-action="open-archive-sitio"
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
                <h4 class="text-xs font-bold text-rose-900">Confirmar archivo lógico de sitio</h4>
                <p class="text-[11px] text-rose-800">
                  El sitio <strong>Sitio ${sitio.numero_sitio} — ${escapeHtml(sitio.nombre_sitio)}</strong> pasará a estado archivado (soft-delete) manteniendo la trazabilidad en Historial de Cambios.
                </p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div class="sm:col-span-2">
                  <label for="archiveSitioReasonInput" class="sr-only">Motivo de archivo</label>
                  <input
                    id="archiveSitioReasonInput"
                    type="text"
                    placeholder="Motivo de archivo (opcional, ej. Cierre operativo de sucursal)"
                    class="w-full text-xs rounded-lg border border-rose-300 bg-white px-2.5 py-1.5"
                  />
                </div>
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    id="cancelArchiveSitioBtn"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="confirmArchiveSitioBtn"
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
                <strong class="font-bold">Archivo bloqueado:</strong> ${escapeHtml(archiveGuard.reason || 'Existen dependencias activas asociadas a este sitio.')}
              </div>
              <button
                type="button"
                id="cancelArchiveSitioBtn"
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
    ? renderEditSitioForm(sitio, state.editFormData)
    : renderReadOnlySitioBody(sitio, isHq);

  return renderDetailPageTemplate({
    entityType: 'Sitio Operativo',
    entitySymbol: isHq ? '🏢' : '📍',
    title: `Sitio ${sitio.numero_sitio} — ${sitio.nombre_sitio}`,
    eyebrowCode: `${sitio.numero_certificado} · ${sitio.norma_codigo}`,
    subtitle: `${sitio.organizacion_nombre} (${sitio.organizacion_rif}) · ${sitio.direccion_sitio}`,
    statusBadge: isHq
      ? {
          label: 'Sede Principal (Sitio 0)',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          symbol: '★',
        }
      : {
          label: `Sucursal Operativa (Sitio #${sitio.numero_sitio})`,
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          symbol: '📍',
        },
    secondaryHeaderBadge: {
      label: sitio.multisitio ? 'Alcance Multisitio' : 'Sede Única',
      badgeClass: sitio.multisitio
        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
        : 'bg-slate-50 text-slate-700 border-slate-200',
    },
    backButton: {
      label: `Volver a ${sitio.numero_certificado}`,
      nav: 'certificacion',
      subview: 'certificates',
      action: 'back-to-cert-from-sitio',
    },
    parents,
    tableName: 'sitio',
    recordId: sitio.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml,
    childTabs: [
      {
        id: 'turnos',
        label: 'Turnos Operativos Asignados',
        symbol: '🕒',
        count: sitio.turnos.length,
      },
      {
        id: 'auditorias',
        label: 'Auditorías en este Sitio',
        symbol: '🗓️',
        count: sitio.auditorias.length,
      },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-sitio-tab',
    renderChildTabContent: (tabId) =>
      tabId === 'auditorias'
        ? renderSitioAuditoriasTab(sitio, sitio.auditorias)
        : renderSitioTurnosTab({
            sitio,
            turnos: sitio.turnos,
            shiftCatalog,
            isStaff,
            isAssigningShift: Boolean(state.isAssigningShift),
            shiftActionMessage: state.shiftActionMessage,
          }),
  });
}

function renderReadOnlySitioBody(sitio: SitioDetailEntity, isHq: boolean): string {
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identificador de Sede</div>
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold px-2 py-0.5 rounded ${
            isHq
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          }">
            Sitio ${sitio.numero_sitio}
          </span>
          <span class="text-xs font-semibold text-slate-700">
            ${isHq ? 'Sede Principal (Sitio 0)' : escapeHtml(sitio.tipo_sitio || 'Sucursal Operativa')}
          </span>
        </div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre de la Sede</div>
        <div class="text-xs font-bold text-slate-900">${escapeHtml(sitio.nombre_sitio)}</div>
        <div class="text-[11px] text-slate-500">
          ${sitio.personal_count !== undefined ? `Personal asignado: ${sitio.personal_count} personas` : 'Personal operativo cubierto'}
        </div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Certificado Asociado</div>
        <div class="text-xs font-mono font-bold text-slate-900">${escapeHtml(sitio.numero_certificado)}</div>
        <div class="text-[11px] text-slate-500">${escapeHtml(sitio.norma_codigo)} · Estatus ${escapeHtml(sitio.certificado_estatus)}</div>
      </div>

      <div class="sm:col-span-2 lg:col-span-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dirección Física del Sitio</div>
        <div class="text-xs font-medium text-slate-900">${escapeHtml(sitio.direccion_sitio)}</div>
        ${
          sitio.actividades
            ? `<div class="text-[11px] text-slate-500 pt-0.5">${escapeHtml(sitio.actividades)}</div>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderEditSitioForm(
  sitio: SitioDetailEntity,
  formData?: SitioViewState['editFormData']
): string {
  const numVal = formData?.numero_sitio !== undefined ? String(formData.numero_sitio) : String(sitio.numero_sitio);
  const nameVal = formData?.nombre_sitio ?? sitio.nombre_sitio;
  const dirVal = formData?.direccion_sitio ?? sitio.direccion_sitio;

  return `
    <form id="editSitioForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="space-y-1">
          <label for="editSitioNumeroInput" class="block text-xs font-bold text-slate-700">Número de Sitio *</label>
          <input
            id="editSitioNumeroInput"
            name="numero_sitio"
            type="number"
            min="0"
            step="1"
            required
            value="${escapeHtml(numVal)}"
            class="w-full text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p class="text-[10px] text-slate-500">0 = Sede Principal (HQ), ≥ 1 = Sucursales.</p>
        </div>

        <div class="sm:col-span-2 space-y-1">
          <label for="editSitioNombreInput" class="block text-xs font-bold text-slate-700">Nombre de la Sede *</label>
          <input
            id="editSitioNombreInput"
            name="nombre_sitio"
            type="text"
            required
            value="${escapeHtml(nameVal)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div class="sm:col-span-3 space-y-1">
          <label for="editSitioDireccionInput" class="block text-xs font-bold text-slate-700">Dirección Física *</label>
          <input
            id="editSitioDireccionInput"
            name="direccion_sitio"
            type="text"
            required
            value="${escapeHtml(dirVal)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          id="cancelEditSitioBtnSecondary"
          class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          💾 Guardar Sitio
        </button>
      </div>
    </form>
  `;
}

function renderSitioTurnosTab(params: {
  sitio: SitioDetailEntity;
  turnos: ReadonlyArray<SitioTurnoAssignment>;
  shiftCatalog: ReadonlyArray<TurnoCatalogItem>;
  isStaff: boolean;
  isAssigningShift: boolean;
  shiftActionMessage?: string | null;
}): string {
  const { sitio, turnos, shiftCatalog, isStaff, isAssigningShift, shiftActionMessage } = params;
  const assignedTurnoIds = new Set(turnos.map((t) => t.id_turno));
  const availableShifts = shiftCatalog.filter((t) => !assignedTurnoIds.has(t.id));

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Turnos Operativos Asignados</h3>
          <p class="text-xs text-slate-500">
            Franjas horarias de operación vinculadas a Sitio ${sitio.numero_sitio} (${escapeHtml(sitio.nombre_sitio)}).
          </p>
        </div>

        ${
          isStaff
            ? `
              <button
                type="button"
                data-action="toggle-assign-sitio-turno"
                class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                ${isAssigningShift ? '✕ Cerrar Selector' : '+ Asignar Turno'}
              </button>
            `
            : ''
        }
      </div>

      ${
        shiftActionMessage
          ? `
            <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
              <span>✓</span>
              <span>${escapeHtml(shiftActionMessage)}</span>
            </div>
          `
          : ''
      }

      ${
        isStaff && isAssigningShift
          ? `
            <form id="assignSitioTurnoForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div class="flex-1 space-y-1">
                <label for="assignSitioTurnoSelect" class="block text-xs font-bold text-slate-700">Seleccionar Turno Operativo</label>
                ${
                  availableShifts.length === 0
                    ? `<p class="text-xs text-slate-500 py-1.5">Todos los turnos del catálogo ya están asignados a este sitio.</p>`
                    : `
                      <select
                        id="assignSitioTurnoSelect"
                        name="id_turno"
                        required
                        class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      >
                        ${availableShifts
                          .map(
                            (shift) => `
                              <option value="${escapeHtml(shift.id)}">
                                ${escapeHtml(formatShiftTime(shift.hora_entrada))} → ${escapeHtml(formatShiftTime(shift.hora_salida))} · ${escapeHtml(shift.descripcion)}
                              </option>
                            `
                          )
                          .join('')}
                      </select>
                    `
                }
              </div>
              ${
                availableShifts.length > 0
                  ? `
                    <button
                      type="submit"
                      class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Asignar al Sitio
                    </button>
                  `
                  : ''
              }
            </form>
          `
          : ''
      }

      ${
        turnos.length === 0
          ? `
            <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <div class="text-2xl">🕒</div>
              <h4 class="text-xs font-bold text-slate-800">No hay turnos asignados a este sitio</h4>
              <p class="text-xs text-slate-500 max-w-md mx-auto">
                Utilice el botón "+ Asignar Turno" para vincular franjas horarias cubiertas en las auditorías de campo.
              </p>
            </div>
          `
          : `
            <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                    <th scope="col" class="py-3 px-4">Horario Entrada</th>
                    <th scope="col" class="py-3 px-4">Horario Salida</th>
                    <th scope="col" class="py-3 px-4">Duración</th>
                    <th scope="col" class="py-3 px-4">Descripción Operativa</th>
                    ${isStaff ? `<th scope="col" class="py-3 px-4 text-right">Acciones</th>` : ''}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${turnos
                    .map(
                      (turno) => `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            ${escapeHtml(formatShiftTime(turno.hora_entrada))}
                          </td>
                          <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            ${escapeHtml(formatShiftTime(turno.hora_salida))}
                          </td>
                          <td class="py-3 px-4 whitespace-nowrap">
                            <span class="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono text-[11px] font-bold">
                              ${escapeHtml(turno.durationHoursLabel)}
                            </span>
                          </td>
                          <td class="py-3 px-4 font-medium text-slate-700">
                            <button
                              type="button"
                              data-action="select-turno"
                              data-turno-id="${escapeHtml(turno.id_turno)}"
                              data-sitio-id="${escapeHtml(sitio.id)}"
                              data-cert-id="${escapeHtml(sitio.id_certificado)}"
                              class="inline-flex items-center gap-1.5 text-left font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                            >
                              <span aria-hidden="true">🕒</span>
                              <span>${escapeHtml(turno.descripcion)}</span>
                            </button>
                          </td>
                          ${
                            isStaff
                              ? `
                                <td class="py-3 px-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    data-action="unassign-sitio-turno"
                                    data-sitio-id="${escapeHtml(sitio.id)}"
                                    data-turno-id="${escapeHtml(turno.id_turno)}"
                                    class="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                                  >
                                    Quitar
                                  </button>
                                </td>
                              `
                              : ''
                          }
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
      }
    </div>
  `;
}

function renderSitioAuditoriasTab(
  sitio: SitioDetailEntity,
  auditorias: ReadonlyArray<SitioAuditoriaLink>
): string {
  if (auditorias.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">🗓️</div>
        <h4 class="text-xs font-bold text-slate-800">Sin auditorías registradas en este sitio</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Sitio ${sitio.numero_sitio} (${escapeHtml(sitio.nombre_sitio)}) aún no tiene jornadas vinculadas en la programación de auditorías.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Auditorías en este Sitio</h3>
        <p class="text-xs text-slate-500">
          Jornadas de evaluación programadas o ejecutadas que incluyen a Sitio ${sitio.numero_sitio} (${escapeHtml(sitio.nombre_sitio)}).
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Código Auditoría</th>
              <th scope="col" class="py-3 px-4">Fecha</th>
              <th scope="col" class="py-3 px-4">Tipo</th>
              <th scope="col" class="py-3 px-4">Metodología</th>
              <th scope="col" class="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditorias
              .map((aud) => {
                const isDone = aud.estatus === 'Completada' || aud.estatus === 'Completado' || aud.estatus === 'Cerrada' || aud.estatus === 'Cerrado';
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(aud.id)}"
                        class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span aria-hidden="true">🗓️</span>
                        <span>${escapeHtml(aud.codigo_auditoria)}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">${escapeHtml(aud.fecha_programacion)}</td>
                    <td class="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">${escapeHtml(aud.tipo_auditoria)}</td>
                    <td class="py-3 px-4 text-slate-700 whitespace-nowrap">
                      ${escapeHtml(aud.metodologia)}${aud.modalidad_evaluacion ? ` (${escapeHtml(aud.modalidad_evaluacion)})` : ''}
                    </td>
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
