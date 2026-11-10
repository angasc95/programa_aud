import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import type { CertificateRecord } from '../lib/searchControls';
import type {
  OrganizationRecord,
  SiteRecord,
  ProcessRecord,
  ShiftRecord,
} from './certificacionView';
import type { StandardRecord, RequirementRecord } from './extraView';
import type { AuditRecord, AuditorRecord } from './auditoriasView';
import {
  getFindingTypeMeta,
  type FindingRecord,
  type FindingStats,
  calculateFindingStats,
} from '../lib/drillDown';

export type DrillDownSubTab = 'sites' | 'processes' | 'matrix' | 'findings';

export interface DrillDownViewState {
  selectedOrgId: string | null;
  selectedCertId: string | null;
  activeTab: DrillDownSubTab;
  organizations: OrganizationRecord[];
  certificates: CertificateRecord[];
  sites: SiteRecord[];
  processes: ProcessRecord[];
  shifts: ShiftRecord[];
  standards: StandardRecord[];
  requirements: RequirementRecord[];
  audits: AuditRecord[];
  auditors: AuditorRecord[];
  findings: FindingRecord[];
  findingFilterType: string;
  findingFilterStatus: 'all' | 'open' | 'closed';
  isLoggingFinding: boolean;
  loggingAuditId: string | null;
  loading: boolean;
}

export function renderDrillDownView(
  profile: UserProfile,
  state: DrillDownViewState
): string {
  const selectedOrg = state.organizations.find((o) => o.id === state.selectedOrgId) || null;
  const orgCerts = selectedOrg
    ? state.certificates.filter(
        (c) =>
          c.organizacion_id === selectedOrg.id ||
          c.organizacion_nombre.toLowerCase() === selectedOrg.nombre.toLowerCase()
      )
    : [];

  const selectedCert =
    state.certificates.find((c) => c.id === state.selectedCertId) ||
    (orgCerts.length > 0 ? orgCerts[0] : null);

  const certSites = selectedCert
    ? state.sites.filter(
        (s) => s.numero_certificado === selectedCert.numero_certificado
      )
    : [];

  const certProcesses = selectedCert
    ? state.processes.filter(
        (p) => p.numero_certificado === selectedCert.numero_certificado
      )
    : [];

  const certAudits = selectedCert
    ? state.audits.filter(
        (a) => a.numero_certificado === selectedCert.numero_certificado
      )
    : [];

  const certAuditIds = new Set(certAudits.map((a) => a.id));
  const certFindings = state.findings.filter(
    (f) =>
      certAuditIds.has(f.id_auditoria) ||
      (selectedCert && f.numero_certificado === selectedCert.numero_certificado)
  );

  const findingStats: FindingStats = calculateFindingStats(certFindings);

  // Breadcrumbs Bar
  const breadcrumbsHtml = `
    <nav aria-label="Navegación jerárquica Drill-Down" class="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-2xs">
      <button
        type="button"
        data-drilldown-select-org=""
        class="font-medium hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1 ${
          !selectedOrg ? 'text-indigo-600 font-bold' : ''
        }"
      >
        <span>🏢</span>
        <span>Organizaciones (${state.organizations.length})</span>
      </button>

      <span class="text-slate-300">/</span>

      ${
        selectedOrg
          ? `
            <button
              type="button"
              data-drilldown-select-org="${escapeHtml(selectedOrg.id)}"
              class="font-medium hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1 ${
                !selectedCert ? 'text-indigo-600 font-bold' : 'text-slate-700'
              }"
            >
              <span class="truncate max-w-48 sm:max-w-64">${escapeHtml(selectedOrg.nombre)}</span>
            </button>
          `
          : `<span class="text-slate-400 italic">Seleccione organización</span>`
      }

      ${
        selectedCert
          ? `
            <span class="text-slate-300">/</span>
            <span class="font-bold text-slate-900 font-mono inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              <span>📜</span>
              <span>${escapeHtml(selectedCert.numero_certificado)}</span>
            </span>
          `
          : ''
      }
    </nav>
  `;

  // Main Header Banner
  const headerBanner = `
    <section class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
            <span>🔍</span>
            <span>NAVEGACIÓN RELACIONAL DRILL-DOWN · ISO/IEC 17021-1</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Exploración Jerárquica en Cascada
          </h1>
          <p class="text-xs text-slate-600 max-w-2xl">
            Inspección granular desde la organización cliente hacia certificados, sedes multisitio, turnos de trabajo, procesos mapeados, matriz de requisitos y hallazgos de auditoría.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-nav="certificacion"
            class="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>←</span>
            <span>Volver a Certificación</span>
          </button>
        </div>
      </div>
      ${breadcrumbsHtml}
    </section>
  `;

  // Step 1: Organizations Selector Grid (if no org selected)
  if (!selectedOrg) {
    return `
      <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        ${headerBanner}

        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">
              Paso 1: Seleccione una Organización Cliente para Iniciar el Drill-Down
            </h2>
            <span class="text-xs text-slate-500">${state.organizations.length} registradas</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.organizations
              .map((org) => {
                const certs = state.certificates.filter(
                  (c) =>
                    c.organizacion_id === org.id ||
                    c.organizacion_nombre.toLowerCase() === org.nombre.toLowerCase()
                );
                return `
                  <div class="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <span class="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          RIF: ${escapeHtml(org.rif)}
                        </span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ${certs.length} Certificado${certs.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <h3 class="text-base font-bold text-slate-900">${escapeHtml(org.nombre)}</h3>
                      <p class="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>📍</span>
                        <span class="truncate">${escapeHtml(org.direccion_fiscal || 'Sin dirección fiscal registrada')}</span>
                      </p>
                    </div>

                    <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div class="text-[11px] text-slate-500">
                        ${
                          certs.length > 0
                            ? certs.map((c) => escapeHtml(c.norma)).join(', ')
                            : 'Sin certificados asociados'
                        }
                      </div>
                      <button
                        type="button"
                        data-drilldown-select-org="${escapeHtml(org.id)}"
                        class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Explorar Estructura</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </section>
      </main>
    `;
  }

  // Step 2 & 3: Selected Org & Certificate Drill-Down
  const activeTab = state.activeTab || 'sites';

  // Tabs for the active certificate
  const detailTabs = [
    {
      id: 'sites',
      label: 'Sedes y Turnos',
      symbol: '🏭',
      count: certSites.length,
      desc: 'Sedes físicas multisitio y horarios operativos amparados',
    },
    {
      id: 'processes',
      label: 'Mapa de Procesos',
      symbol: '⚙️',
      count: certProcesses.length,
      desc: 'Procesos auditables y cláusulas ISO vinculadas',
    },
    {
      id: 'matrix',
      label: 'Matriz Normativa (ltree)',
      symbol: '📊',
      count: selectedCert?.cobertura_resumen ? selectedCert.cobertura_resumen.total : 7,
      desc: 'Trazabilidad jerárquica de requisitos y porcentaje de cumplimiento',
    },
    {
      id: 'findings',
      label: 'Auditorías y Hallazgos',
      symbol: '📋',
      count: certFindings.length,
      desc: 'No conformidades mayores, menores, observaciones y mejoras',
    },
  ];

  // Tab Content Builder
  let tabContentHtml = '';

  if (activeTab === 'sites') {
    tabContentHtml = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Sedes Físicas y Turnos de Trabajo</h3>
            <p class="text-xs text-slate-500">Estructura multisitio amparada bajo el certificado ${escapeHtml(selectedCert?.numero_certificado || '')}</p>
          </div>
          <span class="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
            ${certSites.length} ${certSites.length === 1 ? 'sede evaluada' : 'sedes evaluadas'}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${
            certSites.length > 0
              ? certSites
                  .map(
                    (site) => `
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 text-slate-700">
                      Sede #${site.numero_sitio}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Auditada
                    </span>
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-slate-900">${escapeHtml(site.nombre_sitio)}</h4>
                    <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <span>📍</span>
                      <span>${escapeHtml(site.direccion_sitio)}</span>
                    </p>
                  </div>

                  <!-- Connected Shifts -->
                  <div class="pt-2 border-t border-slate-100 space-y-1.5">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Turnos de Producción / Operación
                    </div>
                    <div class="space-y-1">
                      ${state.shifts
                        .map(
                          (sh) => `
                        <div class="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                          <span class="font-medium text-slate-800">${escapeHtml(sh.descripcion)}</span>
                          <span class="font-mono text-[11px] text-slate-600 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                            ${escapeHtml(sh.hora_entrada)} - ${escapeHtml(sh.hora_salida)}
                          </span>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                </div>
              `
                  )
                  .join('')
              : `
              <div class="col-span-2 p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                No hay sedes multisitio registradas para este certificado.
              </div>
            `
          }
        </div>
      </div>
    `;
  } else if (activeTab === 'processes') {
    tabContentHtml = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Mapa de Procesos del Alcance</h3>
            <p class="text-xs text-slate-500">Procesos operacionales y requisitos normativos cubiertos</p>
          </div>
          <span class="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
            ${certProcesses.length} ${certProcesses.length === 1 ? 'proceso mapeado' : 'procesos mapeados'}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${
            certProcesses.length > 0
              ? certProcesses
                  .map(
                    (proc) => `
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>⚙️</span>
                      <span>${escapeHtml(proc.nombre_proceso)}</span>
                    </h4>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Operativo
                    </span>
                  </div>

                  <div class="pt-2 border-t border-slate-100 space-y-2">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Cláusulas Normativas Cubiertas Directamente
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      ${proc.clausulas_cubiertas
                        .map(
                          (c) => `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-mono font-bold">
                          <span>✓</span>
                          <span>Cláusula ${escapeHtml(c)}</span>
                        </span>
                      `
                        )
                        .join('')}
                    </div>
                  </div>

                  <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Exclusiones justificadas:</span>
                    <span class="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      Cláusula 5.1 (No Aplicable)
                    </span>
                  </div>
                </div>
              `
                  )
                  .join('')
              : `
              <div class="col-span-2 p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                No hay procesos registrados para este certificado.
              </div>
            `
          }
        </div>
      </div>
    `;
  } else if (activeTab === 'matrix') {
    const cov = selectedCert?.cobertura_resumen || { covered: 4, nonApplicable: 2, pending: 1, total: 7 };
    const pct = selectedCert?.cobertura_porcentaje ?? 86;

    tabContentHtml = `
      <div class="space-y-4">
        <!-- Coverage summary bar -->
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Matriz de Cobertura Normativa Jerárquica (ltree)</h3>
              <p class="text-xs text-slate-500">Evaluada con el procedimiento almacenado <code class="bg-slate-100 px-1 py-0.5 rounded text-[11px]">cobertura_normativa_certificado()</code></p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold font-mono text-emerald-700">${pct}%</span>
              <span class="text-xs font-semibold text-slate-500">Conformidad Global</span>
            </div>
          </div>

          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div class="bg-emerald-500 h-2" style="width: ${Math.round((cov.covered / cov.total) * 100)}%" title="Cubierto: ${cov.covered}"></div>
            <div class="bg-slate-400 h-2" style="width: ${Math.round((cov.nonApplicable / cov.total) * 100)}%" title="No Aplicable: ${cov.nonApplicable}"></div>
            <div class="bg-amber-400 h-2" style="width: ${Math.round((cov.pending / cov.total) * 100)}%" title="Pendiente: ${cov.pending}"></div>
          </div>

          <div class="flex flex-wrap items-center gap-4 text-xs pt-1">
            <span class="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>${cov.covered} Cubiertos</span>
            </span>
            <span class="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span>${cov.nonApplicable} No Aplicables</span>
            </span>
            <span class="inline-flex items-center gap-1.5 font-semibold text-amber-800">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>${cov.pending} Pendiente</span>
            </span>
          </div>
        </div>

        <!-- Requirements Breakdown Table -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Requisitos Evaluados (${state.requirements.length})</span>
            <span class="text-xs font-mono text-slate-500">${escapeHtml(selectedCert?.norma || 'ISO 9001:2015')}</span>
          </div>
          <div class="divide-y divide-slate-100 text-xs">
            ${state.requirements
              .map((req) => {
                let statusBadge = `
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200">
                    <span>✓</span> CUBIERTO
                  </span>
                `;
                if (req.codigo === '5.1') {
                  statusBadge = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                      <span>–</span> NO_APLICABLE
                    </span>
                  `;
                } else if (req.codigo === '4.2') {
                  statusBadge = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                      <span>⏳</span> PENDIENTE
                    </span>
                  `;
                }

                return `
                  <div class="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          Cláusula ${escapeHtml(req.codigo)}
                        </span>
                        <span class="font-mono text-[10px] text-slate-500">
                          ltree: ${escapeHtml(req.ruta_materializada)}
                        </span>
                      </div>
                      <div class="text-slate-600 text-xs">
                        ${
                          req.codigo === '4'
                            ? 'Contexto de la organización (Cláusula Padre)'
                            : req.codigo === '4.1'
                            ? 'Comprensión de la organización y de su contexto'
                            : req.codigo === '4.2'
                            ? 'Comprensión de las necesidades y expectativas de las partes interesadas'
                            : req.codigo === '5'
                            ? 'Liderazgo (Cláusula Padre)'
                            : req.codigo === '5.1'
                            ? 'Liderazgo y compromiso (Exclusión autorizada)'
                            : req.codigo === '8'
                            ? 'Operación (Cláusula Padre)'
                            : req.codigo === '8.5'
                            ? 'Producción y provisión del servicio (Control operacional)'
                            : 'Requisito normativo auditable'
                        }
                      </div>
                    </div>
                    <div>${statusBadge}</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeTab === 'findings') {
    const isAuditorOrWorker = ['ADMIN', 'WORKER', 'AUDITOR'].includes(profile.role);

    tabContentHtml = `
      <div class="space-y-4">
        <!-- Findings Stats & Action Header -->
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Registro de Hallazgos de Campo</h3>
              <p class="text-xs text-slate-500">Desviaciones y evidencias identificadas según directrices ISO 19011:2018</p>
            </div>
            ${
              isAuditorOrWorker
                ? `
                  <button
                    type="button"
                    data-action="open-log-finding"
                    data-audit-id="${escapeHtml(certAudits[0]?.id || '')}"
                    class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                  >
                    <span>➕</span>
                    <span>Registrar Nuevo Hallazgo</span>
                  </button>
                `
                : ''
            }
          </div>

          <!-- Finding Metrics Pills -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
              <div class="text-base font-bold text-rose-900">${findingStats.ncMayor}</div>
              <div class="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">NC Mayor</div>
            </div>
            <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <div class="text-base font-bold text-amber-900">${findingStats.ncMenor}</div>
              <div class="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">NC Menor</div>
            </div>
            <div class="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <div class="text-base font-bold text-blue-900">${findingStats.observaciones}</div>
              <div class="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Observación</div>
            </div>
            <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
              <div class="text-base font-bold text-emerald-900">${findingStats.oportunidadesMejora}</div>
              <div class="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Oportunidad Mejora</div>
            </div>
          </div>
        </div>

        <!-- Finding Creation Modal / Inline Form if active -->
        ${
          state.isLoggingFinding
            ? `
              <div class="bg-indigo-50/70 border-2 border-indigo-300 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">📝</span>
                    <h4 class="text-sm font-bold text-slate-900">Formulario de Registro de Hallazgo (ISO 19011:2018)</h4>
                  </div>
                  <button
                    type="button"
                    data-action="close-log-finding"
                    class="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <form id="newFindingForm" class="space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label for="findingAuditSelect" class="block text-xs font-semibold text-slate-700 mb-1">Auditoría Destino</label>
                      <select id="findingAuditSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        ${certAudits
                          .map(
                            (a) => `
                          <option value="${escapeHtml(a.id)}">${escapeHtml(a.tipo_auditoria)} · ${escapeHtml(a.numero_certificado)} (${escapeHtml(a.fecha_programacion)})</option>
                        `
                          )
                          .join('')}
                      </select>
                    </div>

                    <div>
                      <label for="findingTypeSelect" class="block text-xs font-semibold text-slate-700 mb-1">Clasificación del Hallazgo</label>
                      <select id="findingTypeSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        <option value="NC_MENOR">⚠️ No Conformidad Menor (NC_MENOR)</option>
                        <option value="NC_MAYOR">🚨 No Conformidad Mayor (NC_MAYOR)</option>
                        <option value="OBSERVACION">👁️ Observación (OBSERVACION)</option>
                        <option value="OPORTUNIDAD_MEJORA">💡 Oportunidad de Mejora (OPORTUNIDAD_MEJORA)</option>
                      </select>
                    </div>

                    <div>
                      <label for="findingProcessSelect" class="block text-xs font-semibold text-slate-700 mb-1">Proceso Auditado</label>
                      <select id="findingProcessSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        ${certProcesses
                          .map(
                            (p) => `
                          <option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre_proceso)}</option>
                        `
                          )
                          .join('')}
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label for="findingReqSelect" class="block text-xs font-semibold text-slate-700 mb-1">Requisito Normativo Incumplido / Auditado</label>
                      <select id="findingReqSelect" required class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2">
                        ${state.requirements
                          .map(
                            (r) => `
                          <option value="${escapeHtml(r.id)}">Cláusula ${escapeHtml(r.codigo)} (${escapeHtml(r.norma)})</option>
                        `
                          )
                          .join('')}
                      </select>
                    </div>

                    <div>
                      <label for="findingEvidenceInput" class="block text-xs font-semibold text-slate-700 mb-1">Evidencia Objetiva / Registro</label>
                      <input
                        type="text"
                        id="findingEvidenceInput"
                        placeholder="Ej. Registro fotográfico, orden de trabajo Nº 401..."
                        class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="findingDescInput" class="block text-xs font-semibold text-slate-700 mb-1">Descripción de la Desviación / Observación</label>
                    <textarea
                      id="findingDescInput"
                      rows="2"
                      required
                      placeholder="Describa el hecho verificado con precisión y objetividad..."
                      class="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                    ></textarea>
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      data-action="close-log-finding"
                      class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Guardar Hallazgo en Base de Datos
                    </button>
                  </div>
                </form>
              </div>
            `
            : ''
        }

        <!-- Findings List -->
        <div class="space-y-3">
          ${
            certFindings.length > 0
              ? certFindings
                  .map((finding) => {
                    const meta = getFindingTypeMeta(finding.tipo);
                    const canEdit =
                      ['ADMIN', 'WORKER'].includes(profile.role) ||
                      (profile.role === 'AUDITOR' && certAuditIds.has(finding.id_auditoria));

                    return `
                      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 ${meta.borderClass}">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${meta.badgeClass}">
                              <span aria-hidden="true">${meta.symbol}</span>
                              <span>${escapeHtml(meta.label)}</span>
                            </span>
                            <span class="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              Cláusula ${escapeHtml(finding.requisito_codigo)}
                            </span>
                            <span class="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              Proceso: ${escapeHtml(finding.proceso_nombre)}
                            </span>
                          </div>

                          <div class="flex items-center gap-2">
                            ${
                              finding.cerrado
                                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    ✓ Cerrado
                                   </span>`
                                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                    ⏳ Abierto
                                   </span>`
                            }

                            ${
                              canEdit
                                ? `
                                  <button
                                    type="button"
                                    data-action="toggle-finding-status"
                                    data-finding-id="${escapeHtml(finding.id)}"
                                    data-current-closed="${finding.cerrado ? 'true' : 'false'}"
                                    title="${finding.cerrado ? 'Reabrir hallazgo' : 'Marcar hallazgo como cerrado / resuelto'}"
                                    class="text-xs font-semibold px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                                      finding.cerrado
                                        ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                        : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }"
                                  >
                                    ${finding.cerrado ? 'Reabrir' : 'Cerrar Hallazgo'}
                                  </button>
                                `
                                : ''
                            }
                          </div>
                        </div>

                        <div class="text-sm font-medium text-slate-900">
                          ${escapeHtml(finding.descripcion)}
                        </div>

                        ${
                          finding.evidencia
                            ? `
                            <div class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                              <span class="text-slate-400 shrink-0">📎 Evidencia:</span>
                              <span class="font-mono text-slate-800">${escapeHtml(finding.evidencia)}</span>
                            </div>
                          `
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')
              : `
              <div class="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                No se han registrado desviaciones ni hallazgos para este certificado.
              </div>
            `
          }
        </div>
      </div>
    `;
  }

  // Complete Detailed View for Selected Org & Certificate
  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      ${headerBanner}

      <!-- Step 2 Header: Organization Banner -->
      <section class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-lg">🏢</span>
              <h2 class="text-lg font-bold text-slate-900">${escapeHtml(selectedOrg.nombre)}</h2>
              <span class="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                ${escapeHtml(selectedOrg.rif)}
              </span>
            </div>
            <p class="text-xs text-slate-500 flex items-center gap-1.5">
              <span>📍</span>
              <span>${escapeHtml(selectedOrg.direccion_fiscal || 'Sin dirección fiscal registrada')}</span>
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              data-drilldown-select-org=""
              class="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Cambiar Organización
            </button>
          </div>
        </div>

        <!-- Certificates Selector Pill Carousel -->
        <div class="pt-3 border-t border-slate-100 space-y-2">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Certificados Activos Amparados (${orgCerts.length})
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${orgCerts
              .map(
                (cert) => `
              <button
                type="button"
                data-drilldown-select-cert="${escapeHtml(cert.id)}"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCert?.id === cert.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                }"
              >
                <span>📜</span>
                <span class="font-mono font-bold">${escapeHtml(cert.numero_certificado)}</span>
                <span class="opacity-80">· ${escapeHtml(cert.norma)}</span>
                <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  selectedCert?.id === cert.id ? 'bg-white/20 text-white' : 'bg-white text-slate-800 border'
                }">
                  ${cert.cobertura_porcentaje}%
                </span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </section>

      <!-- Step 3: Deep-Drill Detail Tabs (Sites, Processes, Matrix, Findings) -->
      ${
        selectedCert
          ? `
            <section class="space-y-4">
              <!-- Sub-tabs navigation -->
              <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                ${detailTabs
                  .map(
                    (tab) => `
                  <button
                    type="button"
                    data-drilldown-subtab="${tab.id}"
                    title="${escapeHtml(tab.desc)}"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                    }"
                  >
                    <span>${tab.symbol}</span>
                    <span>${escapeHtml(tab.label)}</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }">
                      ${tab.count}
                    </span>
                  </button>
                `
                  )
                  .join('')}
              </div>

              <!-- Sub-tab Rendered Content -->
              ${tabContentHtml}
            </section>
          `
          : ''
      }
    </main>
  `;
}
