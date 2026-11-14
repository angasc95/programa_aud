import { escapeHtml } from '../lib/html';
import {
  formatSpanishDate,
  getProfileGovernanceMeta,
  type UserProfile,
  type UserStatus,
} from '../lib/healthCheck';
import { normalizeText, type AuditorDetailEntity } from '../lib/competencyMatrix';
import { APP_SHELL_CONTAINER_CLASS } from '../lib/layout';

export interface ClientOrgAccessSummary {
  id_organizacion: string;
  organizacion_nombre: string;
  rif?: string;
  estado: UserStatus;
  fecha_solicitud?: string;
}

export interface ProfileFormState {
  nombreInput: string;
  savingProfile: boolean;
  profileFeedback: string | null;
  profileError: string | null;
  passwordSectionOpen: boolean;
  newPasswordInput: string;
  confirmPasswordInput: string;
  savingPassword: boolean;
  passwordFeedback: string | null;
  passwordError: string | null;
}

export interface ProfileViewProps {
  profile: UserProfile;
  userEmail: string;
  formState: ProfileFormState;
  clientAccessItems?: ClientOrgAccessSummary[];
  auditorsDetailed?: AuditorDetailEntity[];
}

function formatClientAccessStatus(estado: UserStatus): {
  label: string;
  textClass: string;
} {
  switch (estado) {
    case 'APPROVED':
      return { label: 'Aprobado', textClass: 'text-emerald-700' };
    case 'REJECTED':
      return { label: 'Rechazado', textClass: 'text-rose-700' };
    case 'PENDING':
    default:
      return { label: 'Pendiente', textClass: 'text-amber-700' };
  }
}

function findMatchingAuditor(
  profile: UserProfile,
  userEmail: string,
  auditorsDetailed: AuditorDetailEntity[]
): AuditorDetailEntity | null {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const normalizedName = normalizeText(profile.nombre);

  return (
    auditorsDetailed.find((a) => a.id === profile.id) ||
    auditorsDetailed.find(
      (a) => normalizedEmail && a.email.trim().toLowerCase() === normalizedEmail
    ) ||
    auditorsDetailed.find(
      (a) => normalizedName && normalizeText(a.nombre) === normalizedName
    ) ||
    null
  );
}

function renderRoleContextPanel(
  profile: UserProfile,
  userEmail: string,
  clientAccessItems: ClientOrgAccessSummary[],
  auditorsDetailed: AuditorDetailEntity[]
): string {
  if (profile.role === 'CLIENT') {
    const itemsHtml =
      clientAccessItems.length === 0
        ? `
          <p class="text-sm text-slate-600">
            No existen organizaciones vinculadas a esta cuenta actualmente.
          </p>
        `
        : `
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th class="py-2.5 pr-4">Organización</th>
                  <th class="py-2.5 px-4">RIF</th>
                  <th class="py-2.5 px-4">Estado de Acceso</th>
                  <th class="py-2.5 pl-4 text-right">Solicitud</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${clientAccessItems
                  .map((item) => {
                    const statusInfo = formatClientAccessStatus(item.estado);
                    return `
                      <tr>
                        <td class="py-3 pr-4 font-medium text-slate-900">
                          ${escapeHtml(item.organizacion_nombre)}
                        </td>
                        <td class="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                          ${escapeHtml(item.rif || 'Sin RIF')}
                        </td>
                        <td class="py-3 px-4 text-xs font-semibold ${statusInfo.textClass}">
                          ${escapeHtml(statusInfo.label)}
                        </td>
                        <td class="py-3 pl-4 text-right text-xs text-slate-500 tabular-nums">
                          ${escapeHtml(formatSpanishDate(item.fecha_solicitud))}
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `;

    return `
      <section class="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div class="space-y-1 border-b border-slate-100 pb-3">
          <h2 class="text-base font-semibold text-slate-900">
            Organizaciones vinculadas
          </h2>
          <p class="text-xs text-slate-500">
            Alcance de lectura autorizado en client_organization_access (solo lectura).
          </p>
        </div>
        ${itemsHtml}
      </section>
    `;
  }

  if (profile.role === 'AUDITOR') {
    const auditorMatch = findMatchingAuditor(profile, userEmail, auditorsDetailed);

    const contentHtml = auditorMatch
      ? `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div class="space-y-1">
            <div class="text-xs text-slate-500">Credencial técnica</div>
            <div class="font-mono tabular-nums font-semibold text-slate-900">
              ${escapeHtml(auditorMatch.codigo_credencial)}
            </div>
            <div class="text-xs text-slate-600">
              Calificación: ${escapeHtml(auditorMatch.calificacion)}
            </div>
          </div>

          <div class="space-y-1">
            <div class="text-xs text-slate-500">Normas acreditadas (${auditorMatch.normas_acreditadas.length})</div>
            <div class="font-medium text-slate-900">
              ${escapeHtml(auditorMatch.normas_acreditadas.join(' · ') || 'Sin normas asignadas')}
            </div>
          </div>

          <div class="space-y-1">
            <div class="text-xs text-slate-500">Sectores IAF (${auditorMatch.sectores_iaf.length})</div>
            <div class="font-mono tabular-nums font-medium text-slate-900">
              ${
                auditorMatch.sectores_iaf.length > 0
                  ? escapeHtml(auditorMatch.sectores_iaf.map((s) => `IAF ${s}`).join(' · '))
                  : 'Sin sectores asignados'
              }
            </div>
            <div class="text-xs text-slate-600 tabular-nums">
              ${auditorMatch.competencias.length} competencia(s) registrada(s)
            </div>
          </div>
        </div>
      `
      : `
        <p class="text-sm text-slate-600">
          No se encontró una matriz de competencias asociada aún a este perfil de auditor.
        </p>
      `;

    return `
      <section class="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div class="space-y-1 border-b border-slate-100 pb-3">
          <h2 class="text-base font-semibold text-slate-900">
            Resumen de competencias técnicas
          </h2>
          <p class="text-xs text-slate-500">
            Calificaciones registradas conforme a ISO/IEC 17021-1 cláusula 7.2 (solo lectura).
          </p>
        </div>
        ${contentHtml}
      </section>
    `;
  }

  return '';
}

export function renderProfileView(props: ProfileViewProps): string {
  const {
    profile,
    userEmail,
    formState,
    clientAccessItems = [],
    auditorsDetailed = [],
  } = props;

  const govMeta = getProfileGovernanceMeta(profile);
  const createdLabel = formatSpanishDate(profile.created_at);

  const profileAlertHtml = formState.profileError
    ? `
      <div role="alert" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
        ${escapeHtml(formState.profileError)}
      </div>
    `
    : formState.profileFeedback
    ? `
      <div role="status" class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
        ${escapeHtml(formState.profileFeedback)}
      </div>
    `
    : '';

  const passwordAlertHtml = formState.passwordError
    ? `
      <div role="alert" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
        ${escapeHtml(formState.passwordError)}
      </div>
    `
    : formState.passwordFeedback
    ? `
      <div role="status" class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
        ${escapeHtml(formState.passwordFeedback)}
      </div>
    `
    : '';

  const roleContextHtml = renderRoleContextPanel(
    profile,
    userEmail,
    clientAccessItems,
    auditorsDetailed
  );

  return `
    <main class="flex-1 ${APP_SHELL_CONTAINER_CLASS} py-8">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div class="xl:col-span-7 space-y-6">
          <!-- 1. Account Summary & Read-Only Governance Card -->
          <section class="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <div class="space-y-1 min-w-0">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 truncate">
              ${escapeHtml(profile.nombre)}
            </h1>
            <p class="text-sm text-slate-600 truncate">
              ${escapeHtml(userEmail)}
            </p>
          </div>
          <p class="text-xs text-slate-500 shrink-0 tabular-nums">
            Cuenta creada el ${escapeHtml(createdLabel)}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="space-y-1">
            <div class="text-xs font-medium text-slate-500">Rol asignado</div>
            <div class="text-sm font-semibold text-slate-900">
              ${escapeHtml(govMeta.roleLabel)}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-xs font-medium text-slate-500">Estado de cuenta</div>
            <div class="text-sm font-semibold text-slate-900">
              ${escapeHtml(govMeta.statusLabel)}
            </div>
          </div>
        </div>

        <p class="text-xs text-slate-500 border-t border-slate-100 pt-3 max-w-3xl">
          ${escapeHtml(govMeta.governanceNote)}
        </p>
      </section>

      <!-- 4. Role-Contextual Read-Only Panel (CLIENT / AUDITOR) -->
      ${roleContextHtml}
        </div>

        <div class="xl:col-span-5 space-y-6">
      <!-- 2. Self-Service Name Update Form -->
      <section class="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-slate-900">
            Información personal
          </h2>
          <p class="text-xs text-slate-500">
            Actualice su nombre visible dentro de la plataforma. Los permisos y rol permanecen protegidos.
          </p>
        </div>

        ${profileAlertHtml}

        <form id="profileNameForm" class="space-y-4">
          <div class="space-y-1.5">
            <label for="profileNombreInput" class="block text-xs font-medium text-slate-700">
              Nombre completo
            </label>
            <input
              id="profileNombreInput"
              name="nombre"
              type="text"
              required
              minlength="2"
              maxlength="150"
              value="${escapeHtml(formState.nombreInput)}"
              placeholder="Ej. Ing. Carlos Mendoza"
              class="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 transition-colors"
              ${formState.savingProfile ? 'disabled' : ''}
            />
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              type="submit"
              id="saveProfileNameBtn"
              class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              ${formState.savingProfile ? 'disabled' : ''}
            >
              ${formState.savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>

      <!-- 3. Optional Self-Service Password Update Section -->
      <section class="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">
              Seguridad de acceso
            </h2>
            <p class="text-xs text-slate-500">
              Cambie su contraseña de inicio de sesión cuando lo requiera.
            </p>
          </div>
          <button
            type="button"
            id="togglePasswordSectionBtn"
            aria-expanded="${formState.passwordSectionOpen ? 'true' : 'false'}"
            class="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
          >
            ${formState.passwordSectionOpen ? 'Ocultar formulario' : 'Cambiar contraseña'}
          </button>
        </div>

        ${
          formState.passwordSectionOpen
            ? `
              <div class="pt-3 border-t border-slate-100 space-y-4">
                ${passwordAlertHtml}
                <form id="profilePasswordForm" class="space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label for="profileNewPasswordInput" class="block text-xs font-medium text-slate-700">
                        Nueva contraseña
                      </label>
                      <input
                        id="profileNewPasswordInput"
                        name="newPassword"
                        type="password"
                        required
                        minlength="8"
                        autocomplete="new-password"
                        value="${escapeHtml(formState.newPasswordInput)}"
                        placeholder="Mínimo 8 caracteres"
                        class="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 transition-colors"
                        ${formState.savingPassword ? 'disabled' : ''}
                      />
                    </div>
                    <div class="space-y-1.5">
                      <label for="profileConfirmPasswordInput" class="block text-xs font-medium text-slate-700">
                        Confirmar nueva contraseña
                      </label>
                      <input
                        id="profileConfirmPasswordInput"
                        name="confirmPassword"
                        type="password"
                        required
                        minlength="8"
                        autocomplete="new-password"
                        value="${escapeHtml(formState.confirmPasswordInput)}"
                        placeholder="Repita la contraseña"
                        class="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 transition-colors"
                        ${formState.savingPassword ? 'disabled' : ''}
                      />
                    </div>
                  </div>
                  <div class="flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      id="saveProfilePasswordBtn"
                      class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      ${formState.savingPassword ? 'disabled' : ''}
                    >
                      ${formState.savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                    </button>
                  </div>
                </form>
              </div>
            `
            : ''
        }
      </section>
        </div>
      </div>
    </main>
  `;
}
