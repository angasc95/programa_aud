import { escapeHtml } from '../lib/html';
import type { DashboardSummaryMetrics } from '../lib/accessControl';
import type { UserProfile } from '../lib/healthCheck';

const DEFAULT_METRICS: DashboardSummaryMetrics = {
  organizacionesActivas: 0,
  certificadosVigentes: 0,
  auditoriasProgramadas: 0,
  acreditacionesActivas: 0,
  hallazgosAbiertos: 0,
};

interface SummaryTileSpec {
  label: string;
  value: number;
  context: string;
}

function getScopedMetricsTiles(
  profile: UserProfile,
  metrics: DashboardSummaryMetrics
): SummaryTileSpec[] {
  const scopeLabel =
    profile.role === 'CLIENT'
      ? 'Organizaciones autorizadas'
      : profile.role === 'AUDITOR'
      ? 'Organizaciones en alcance'
      : 'En operación vigente';

  const auditContext =
    profile.role === 'AUDITOR'
      ? 'Asignadas a su equipo'
      : profile.role === 'CLIENT'
      ? 'Programadas en su cuenta'
      : 'Ciclo activo de evaluación';

  return [
    {
      label: 'Organizaciones Activas',
      value: metrics.organizacionesActivas,
      context: scopeLabel,
    },
    {
      label: 'Certificados Vigentes',
      value: metrics.certificadosVigentes,
      context: 'Conforme a ISO/IEC 17021-1',
    },
    {
      label: 'Auditorías Programadas',
      value: metrics.auditoriasProgramadas,
      context: auditContext,
    },
    {
      label: 'Acreditaciones Activas',
      value: metrics.acreditacionesActivas,
      context: 'Alcance Norma × Sector IAF',
    },
    {
      label: 'Hallazgos Abiertos',
      value: metrics.hallazgosAbiertos,
      context: 'Pendientes de cierre',
    },
  ];
}

export function renderDashboardView(
  profile: UserProfile,
  email: string,
  metrics: DashboardSummaryMetrics = DEFAULT_METRICS
): string {
  const isApproved = profile.status === 'APPROVED';

  let workspaceBodyHtml = '';

  if (profile.status === 'PENDING') {
    workspaceBodyHtml = `
      <section
        aria-label="Estado de cuenta pendiente"
        class="bg-amber-50/70 border border-amber-200 rounded-xl p-6 space-y-2"
      >
        <div class="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <span aria-hidden="true">⏳</span>
          <span>Aprobación administrativa pendiente</span>
          <span class="text-xs font-medium text-amber-800">· PENDING</span>
        </div>
        <p class="text-sm text-amber-900/90 leading-relaxed max-w-3xl">
          Su solicitud de cuenta está en espera de revisión y autorización por un administrador del sistema antes de habilitar los módulos operativos. Puede revisar sus datos de cuenta desde Mi Perfil.
        </p>
      </section>
    `;
  } else if (profile.status === 'REJECTED') {
    workspaceBodyHtml = `
      <section
        aria-label="Acceso no autorizado"
        class="bg-rose-50/70 border border-rose-200 rounded-xl p-6 space-y-2"
      >
        <div class="flex items-center gap-2 text-sm font-semibold text-rose-900">
          <span aria-hidden="true">❌</span>
          <span>Acceso no autorizado</span>
          <span class="text-xs font-medium text-rose-800">· REJECTED</span>
        </div>
        <p class="text-sm text-rose-900/90 leading-relaxed max-w-3xl">
          Esta cuenta no fue aprobada por un administrador. Comuníquese con la coordinación técnica de FONDONORMA para solicitar una revisión.
        </p>
      </section>
    `;
  } else if (isApproved) {
    const tiles = getScopedMetricsTiles(profile, metrics);
    workspaceBodyHtml = `
      <section aria-label="Resumen operativo del espacio de trabajo" class="space-y-4">
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="text-sm font-semibold text-slate-900 tracking-tight">
            Resumen Operativo
          </h2>
          <span class="text-xs text-slate-500">
            Métricas acotadas a su alcance autorizado
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          ${tiles
            .map(
              (tile) => `
                <article class="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-slate-600">
                      ${escapeHtml(tile.label)}
                    </p>
                    <p class="text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                      ${tile.value}
                    </p>
                  </div>
                  <p class="text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                    ${escapeHtml(tile.context)}
                  </p>
                </article>
              `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
      <section class="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
          Bienvenido, ${escapeHtml(profile.nombre)}
        </h1>
        <p class="text-sm text-slate-600">
          Sesión iniciada con <span class="font-medium text-slate-800">${escapeHtml(email)}</span>
        </p>
      </section>

      ${workspaceBodyHtml}
    </main>
  `;
}
