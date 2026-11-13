import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import { getPhase5FindingTypeMeta } from '../lib/auditExecution';
import type { RequisitoLtree } from '../lib/extraDomain';
import { getProcessTypeVisual, type ProcesoTipo } from '../lib/multisiteSampling';
import {
  VALID_PROCESO_TIPOS,
  canArchiveProceso,
  getAllSeededNormaRequirements,
  getScopedNormaRequirements,
  type ProcesoAuditoriaLink,
  type ProcesoDetailEntity,
  type ProcesoHallazgoLink,
  type ProcesoRequisitoLink,
} from '../lib/procesoDomain';
import { renderDetailPageTemplate, type DetailParentChip } from './detailTemplate';

export type ProcesoChildTab = 'requisitos' | 'hallazgos' | 'auditorias';

export interface ProcesoViewState {
  selectedProcesoId: string | null;
  activeChildTab: ProcesoChildTab;
  isEditingAttributes: boolean;
  editFormData?: {
    nombre_proceso?: string;
    tipo?: ProcesoTipo;
    responsable?: string;
  };
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  archiveConfirmOpen?: boolean;
  archiveErrorMessage?: string | null;
  isAssigningRequisito?: boolean;
  requisitoActionMessage?: string | null;
}

export interface ProcesoViewProps {
  profile: UserProfile;
  state: ProcesoViewState;
  proceso: ProcesoDetailEntity;
  requirementsCatalog?: ReadonlyArray<RequisitoLtree>;
}

export function renderProcesoView(props: ProcesoViewProps): string {
  const {
    profile,
    state,
    proceso,
    requirementsCatalog = getAllSeededNormaRequirements(),
  } = props;

  const isStaff =
    (profile.role === 'ADMIN' || profile.role === 'WORKER') &&
    (!profile.status || profile.status === 'APPROVED');
  const isEditing = Boolean(state.isEditingAttributes) && isStaff;
  const activeTab: ProcesoChildTab =
    state.activeChildTab === 'hallazgos' || state.activeChildTab === 'auditorias'
      ? state.activeChildTab
      : 'requisitos';

  const visual = getProcessTypeVisual(proceso.tipo);
  const archiveGuard = canArchiveProceso({
    associatedHallazgosCount: proceso.hallazgos.length,
    associatedAuditoriasCount: proceso.auditorias.length,
  });

  const scopedNormaRequirements = getScopedNormaRequirements({
    id_norma: proceso.id_norma,
    norma_codigo: proceso.norma_codigo,
    requirementsCatalog,
  });

  const parents: DetailParentChip[] = [
    {
      label: 'Organización',
      value: `${proceso.organizacion_nombre} (${proceso.organizacion_rif})`,
      symbol: '🏢',
      navAction: {
        nav: 'certificacion',
        subview: 'organizations',
        entityType: 'org',
        entityId: proceso.id_organizacion,
      },
    },
    {
      label: 'Certificado',
      value: `${proceso.numero_certificado} · ${proceso.norma_codigo}`,
      symbol: '📜',
      navAction: {
        nav: 'certificacion',
        subview: 'certificates',
        entityType: 'cert',
        entityId: proceso.id_certificado,
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
                id="cancelEditProcesoBtn"
                class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Cancelar Edición
              </button>
            `
            : `
              <button
                type="button"
                id="startEditProcesoBtn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <span aria-hidden="true">✏️</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                data-action="open-archive-proceso"
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
                <h4 class="text-xs font-bold text-rose-900">Confirmar archivo lógico de proceso</h4>
                <p class="text-[11px] text-rose-800">
                  El proceso <strong>${escapeHtml(proceso.nombre_proceso)}</strong> pasará a estado archivado (soft-delete) preservando la trazabilidad en Historial de Cambios.
                </p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div class="sm:col-span-2">
                  <label for="archiveProcesoReasonInput" class="sr-only">Motivo de archivo</label>
                  <input
                    id="archiveProcesoReasonInput"
                    type="text"
                    placeholder="Motivo de archivo (opcional, ej. Reorganización de mapa de procesos)"
                    class="w-full text-xs rounded-lg border border-rose-300 bg-white px-2.5 py-1.5"
                  />
                </div>
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    id="cancelArchiveProcesoBtn"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="confirmArchiveProcesoBtn"
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
                <strong class="font-bold">Archivo bloqueado:</strong> ${escapeHtml(archiveGuard.reason || 'Existen dependencias activas asociadas a este proceso.')}
              </div>
              <button
                type="button"
                id="cancelArchiveProcesoBtn"
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
    ? renderEditProcesoForm(proceso, state.editFormData)
    : renderReadOnlyProcesoBody(proceso, visual.badgeClass, visual.icon);

  return renderDetailPageTemplate({
    entityType: 'Proceso del Sistema',
    entitySymbol: visual.icon,
    title: proceso.nombre_proceso,
    eyebrowCode: `${proceso.numero_certificado} · ${proceso.norma_codigo}`,
    subtitle: `${proceso.organizacion_nombre} (${proceso.organizacion_rif})${
      proceso.responsable ? ` · Responsable: ${proceso.responsable}` : ''
    }`,
    statusBadge: {
      label: visual.label,
      badgeClass: visual.badgeClass,
      symbol: visual.icon,
    },
    secondaryHeaderBadge: {
      label: `${proceso.requisitos.length} cláusula${proceso.requisitos.length === 1 ? '' : 's'} mapeada${proceso.requisitos.length === 1 ? '' : 's'}`,
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    backButton: {
      label: `Volver a ${proceso.numero_certificado}`,
      nav: 'certificacion',
      subview: 'certificates',
      action: 'back-to-cert-from-proceso',
    },
    parents,
    tableName: 'proceso',
    recordId: proceso.id,
    recordActionsHtml,
    feedbackHtml,
    attributes: [],
    customRecordBodyHtml,
    childTabs: [
      {
        id: 'requisitos',
        label: 'Requisitos Normativos Vinculados',
        symbol: '📐',
        count: proceso.requisitos.length,
      },
      {
        id: 'hallazgos',
        label: 'Hallazgos Asociados',
        symbol: '📌',
        count: proceso.hallazgos.length,
      },
      {
        id: 'auditorias',
        label: 'Auditorías Programadas',
        symbol: '🗓️',
        count: proceso.auditorias.length,
      },
    ],
    activeChildTabId: activeTab,
    childTabAttrName: 'data-proceso-tab',
    renderChildTabContent: (tabId) => {
      if (tabId === 'hallazgos') {
        return renderProcesoHallazgosTab(proceso, proceso.hallazgos);
      }
      if (tabId === 'auditorias') {
        return renderProcesoAuditoriasTab(proceso, proceso.auditorias);
      }
      return renderProcesoRequisitosTab({
        proceso,
        requisitos: proceso.requisitos,
        scopedNormaRequirements,
        isStaff,
        isAssigningRequisito: Boolean(state.isAssigningRequisito),
        requisitoActionMessage: state.requisitoActionMessage,
      });
    },
  });
}

function renderReadOnlyProcesoBody(
  proceso: ProcesoDetailEntity,
  badgeClass: string,
  icon: string
): string {
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre del Proceso</div>
        <div class="text-xs font-bold text-slate-900">${escapeHtml(proceso.nombre_proceso)}</div>
        <div class="text-[11px] text-slate-500">Responsable: ${escapeHtml(proceso.responsable || 'Por designar')}</div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clasificación</div>
        <div>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}">
            <span aria-hidden="true">${icon}</span>
            <span>${escapeHtml(proceso.tipo)}</span>
          </span>
        </div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cobertura LTREE</div>
        <div class="text-xs font-mono font-bold text-indigo-800">
          ${proceso.requisitos.length} cláusula(s) ISO
        </div>
        <div class="text-[11px] text-slate-500">${escapeHtml(proceso.norma_codigo)}</div>
      </div>

      <div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Certificado Vinculado</div>
        <div class="text-xs font-mono font-bold text-slate-900">${escapeHtml(proceso.numero_certificado)}</div>
        <div class="text-[11px] text-slate-500">Estatus ${escapeHtml(proceso.certificado_estatus)}</div>
      </div>
    </div>
  `;
}

function renderEditProcesoForm(
  proceso: ProcesoDetailEntity,
  formData?: ProcesoViewState['editFormData']
): string {
  const nombreVal = formData?.nombre_proceso ?? proceso.nombre_proceso;
  const tipoVal = formData?.tipo ?? proceso.tipo;
  const responsableVal = formData?.responsable ?? (proceso.responsable || '');

  return `
    <form id="editProcesoForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-2 space-y-1">
          <label for="editProcesoNombreInput" class="block text-xs font-bold text-slate-700">Nombre del Proceso *</label>
          <input
            id="editProcesoNombreInput"
            name="nombre_proceso"
            type="text"
            maxlength="150"
            required
            value="${escapeHtml(nombreVal)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p class="text-[10px] text-slate-500">Máximo 150 caracteres; único dentro del certificado.</p>
        </div>

        <div class="space-y-1">
          <label for="editProcesoTipoSelect" class="block text-xs font-bold text-slate-700">Clasificación *</label>
          <select
            id="editProcesoTipoSelect"
            name="tipo"
            required
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            ${VALID_PROCESO_TIPOS.map(
              (t) => `<option value="${escapeHtml(t)}" ${tipoVal === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
            ).join('')}
          </select>
        </div>

        <div class="sm:col-span-3 space-y-1">
          <label for="editProcesoResponsableInput" class="block text-xs font-bold text-slate-700">Responsable del Proceso</label>
          <input
            id="editProcesoResponsableInput"
            name="responsable"
            type="text"
            placeholder="Ej. Ing. Roberto Silva (Jefe de Planta)"
            value="${escapeHtml(responsableVal)}"
            class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          type="button"
          id="cancelEditProcesoBtnSecondary"
          class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          💾 Guardar Proceso
        </button>
      </div>
    </form>
  `;
}

function renderProcesoRequisitosTab(params: {
  proceso: ProcesoDetailEntity;
  requisitos: ReadonlyArray<ProcesoRequisitoLink>;
  scopedNormaRequirements: ReadonlyArray<RequisitoLtree>;
  isStaff: boolean;
  isAssigningRequisito: boolean;
  requisitoActionMessage?: string | null;
}): string {
  const {
    proceso,
    requisitos,
    scopedNormaRequirements,
    isStaff,
    isAssigningRequisito,
    requisitoActionMessage,
  } = params;

  const assignedCodes = new Set(requisitos.map((r) => r.codigo.trim().toLowerCase()));
  const availableRequirements = scopedNormaRequirements.filter(
    (req) => !assignedCodes.has(req.codigo.trim().toLowerCase())
  );

  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Requisitos Normativos Vinculados</h3>
          <p class="text-xs text-slate-500">
            Cláusulas LTREE de <strong>${escapeHtml(proceso.norma_codigo)}</strong> asignadas a ${escapeHtml(proceso.nombre_proceso)}.
          </p>
        </div>

        ${
          isStaff
            ? `
              <button
                type="button"
                data-action="toggle-assign-proceso-req"
                class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                ${isAssigningRequisito ? '✕ Cerrar Selector' : '+ Vincular Requisito'}
              </button>
            `
            : ''
        }
      </div>

      ${
        requisitoActionMessage
          ? `
            <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
              <span>✓</span>
              <span>${escapeHtml(requisitoActionMessage)}</span>
            </div>
          `
          : ''
      }

      ${
        isStaff && isAssigningRequisito
          ? `
            <form id="assignProcesoRequisitoForm" class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div class="flex-1 space-y-1">
                <label for="assignProcesoReqSelect" class="block text-xs font-bold text-slate-700">
                  Seleccionar Cláusula (${escapeHtml(proceso.norma_codigo)})
                </label>
                ${
                  availableRequirements.length === 0
                    ? `<p class="text-xs text-slate-500 py-1.5">Todas las cláusulas catalogadas de ${escapeHtml(proceso.norma_codigo)} ya están vinculadas a este proceso.</p>`
                    : `
                      <select
                        id="assignProcesoReqSelect"
                        name="id_requisito"
                        required
                        class="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      >
                        ${availableRequirements
                          .map(
                            (req) => `
                              <option value="${escapeHtml(req.id)}">
                                ${escapeHtml(req.codigo)} — ${escapeHtml(req.titulo)} [${escapeHtml(req.ruta_materializada)}]
                              </option>
                            `
                          )
                          .join('')}
                      </select>
                    `
                }
              </div>
              ${
                availableRequirements.length > 0
                  ? `
                    <button
                      type="submit"
                      class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Vincular Cláusula
                    </button>
                  `
                  : ''
              }
            </form>
          `
          : ''
      }

      ${
        requisitos.length === 0
          ? `
            <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <div class="text-2xl">📐</div>
              <h4 class="text-xs font-bold text-slate-800">Sin requisitos normativos vinculados</h4>
              <p class="text-xs text-slate-500 max-w-md mx-auto">
                Utilice el botón "+ Vincular Requisito" para asociar cláusulas LTREE de ${escapeHtml(proceso.norma_codigo)} a este proceso.
              </p>
            </div>
          `
          : `
            <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                    <th scope="col" class="py-3 px-4">Cláusula</th>
                    <th scope="col" class="py-3 px-4">Título del Requisito</th>
                    <th scope="col" class="py-3 px-4">Ruta LTREE</th>
                    <th scope="col" class="py-3 px-4">Norma</th>
                    ${isStaff ? `<th scope="col" class="py-3 px-4 text-right">Acciones</th>` : ''}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${requisitos
                    .map(
                      (req) => `
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 font-mono font-bold text-sky-800 whitespace-nowrap">
                            Cláusula ${escapeHtml(req.codigo)}
                          </td>
                          <td class="py-3 px-4 font-semibold text-slate-900">
                            <div>${escapeHtml(req.titulo)}</div>
                            ${
                              req.descripcion
                                ? `<div class="text-[11px] font-normal text-slate-500 pt-0.5">${escapeHtml(req.descripcion)}</div>`
                                : ''
                            }
                          </td>
                          <td class="py-3 px-4 whitespace-nowrap">
                            <span class="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-bold">
                              ${escapeHtml(req.ruta_materializada)}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-slate-700 whitespace-nowrap">${escapeHtml(req.norma_codigo)}</td>
                          ${
                            isStaff
                              ? `
                                <td class="py-3 px-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    data-action="unassign-proceso-req"
                                    data-proceso-id="${escapeHtml(proceso.id)}"
                                    data-req-id="${escapeHtml(req.id_requisito)}"
                                    data-req-codigo="${escapeHtml(req.codigo)}"
                                    class="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                                  >
                                    Desvincular
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

function renderProcesoHallazgosTab(
  proceso: ProcesoDetailEntity,
  hallazgos: ReadonlyArray<ProcesoHallazgoLink>
): string {
  if (hallazgos.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">📌</div>
        <h4 class="text-xs font-bold text-slate-800">Sin hallazgos registrados para este proceso</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          No existen no conformidades, observaciones ni oportunidades de mejora vinculadas a ${escapeHtml(proceso.nombre_proceso)}.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Hallazgos Asociados</h3>
        <p class="text-xs text-slate-500">
          Desviaciones y observaciones detectadas durante auditorías sobre ${escapeHtml(proceso.nombre_proceso)}.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Tipo</th>
              <th scope="col" class="py-3 px-4">Cláusula</th>
              <th scope="col" class="py-3 px-4">Descripción</th>
              <th scope="col" class="py-3 px-4 text-center">Estado</th>
              <th scope="col" class="py-3 px-4 text-right">Auditoría</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${hallazgos
              .map((h) => {
                const tMeta = getPhase5FindingTypeMeta(h.tipo);
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${tMeta.badgeClass}">
                        <span aria-hidden="true">${tMeta.symbol}</span>
                        <span>${escapeHtml(tMeta.shortLabel)}</span>
                      </span>
                    </td>
                    <td class="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      Cláusula ${escapeHtml(h.requisito_codigo)}
                    </td>
                    <td class="py-3 px-4 text-slate-700 max-w-md">
                      <div class="font-mono text-[10px] text-slate-500">${escapeHtml(h.codigo_hallazgo)}</div>
                      <p class="line-clamp-2">${escapeHtml(h.descripcion)}</p>
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        h.cerrado
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }">
                        ${h.cerrado ? 'Cerrado' : 'Abierto'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-action="go-audit-results"
                        data-audit-id="${escapeHtml(h.id_auditoria)}"
                        class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                      >
                        <span class="font-mono">${escapeHtml(h.codigo_auditoria)}</span>
                        <span aria-hidden="true">→</span>
                      </button>
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

function renderProcesoAuditoriasTab(
  proceso: ProcesoDetailEntity,
  auditorias: ReadonlyArray<ProcesoAuditoriaLink>
): string {
  if (auditorias.length === 0) {
    return `
      <div class="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
        <div class="text-2xl">🗓️</div>
        <h4 class="text-xs font-bold text-slate-800">Sin auditorías programadas para este proceso</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          ${escapeHtml(proceso.nombre_proceso)} aún no figura en el programa de evaluación de sitios y turnos.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Auditorías Programadas</h3>
        <p class="text-xs text-slate-500">
          Sedes, turnos y eventos de auditoría que evalúan ${escapeHtml(proceso.nombre_proceso)}.
        </p>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <th scope="col" class="py-3 px-4">Auditoría</th>
              <th scope="col" class="py-3 px-4">Sitio Evaluado</th>
              <th scope="col" class="py-3 px-4">Turno Operativo</th>
              <th scope="col" class="py-3 px-4">Fecha</th>
              <th scope="col" class="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${auditorias
              .map((row) => {
                const isDone =
                  row.estatus === 'Completada' ||
                  row.estatus === 'Completado' ||
                  row.estatus === 'Cerrada' ||
                  row.estatus === 'Cerrado';
                return `
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        data-action="select-prog-audit"
                        data-audit-id="${escapeHtml(row.id_auditoria)}"
                        class="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <span aria-hidden="true">🗓️</span>
                        <span>${escapeHtml(row.codigo_auditoria)}</span>
                      </button>
                      <div class="text-[11px] text-slate-500">${escapeHtml(row.tipo_auditoria)} · ${escapeHtml(row.metodologia)}</div>
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                      ${
                        row.id_sitio
                          ? `
                            <button
                              type="button"
                              data-action="select-sitio"
                              data-sitio-id="${escapeHtml(row.id_sitio)}"
                              data-cert-id="${escapeHtml(proceso.id_certificado)}"
                              class="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer text-left"
                            >
                              ${row.numero_sitio !== null ? `Sitio ${row.numero_sitio} — ` : ''}${escapeHtml(row.nombre_sitio)}
                            </button>
                          `
                          : `<span class="text-slate-700">${escapeHtml(row.nombre_sitio)}</span>`
                      }
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                      ${
                        row.id_turno
                          ? `
                            <button
                              type="button"
                              data-action="select-turno"
                              data-turno-id="${escapeHtml(row.id_turno)}"
                              ${row.id_sitio ? `data-sitio-id="${escapeHtml(row.id_sitio)}"` : ''}
                              data-cert-id="${escapeHtml(proceso.id_certificado)}"
                              class="font-medium text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer text-left"
                            >
                              🕒 ${escapeHtml(row.turno_label)}
                            </button>
                          `
                          : `<span class="text-slate-600">${escapeHtml(row.turno_label)}</span>`
                      }
                    </td>
                    <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">${escapeHtml(row.fecha_programacion)}</td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }">
                        ${escapeHtml(row.estatus)}
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
