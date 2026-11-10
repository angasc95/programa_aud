import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';
import {
  renderCertificateGrid,
  renderCertificateList,
  renderEmptySearchState,
  renderSearchControls,
} from './searchControlsView';
import type {
  CertificateRecord,
  SearchControlsFilterState,
} from '../lib/searchControls';

export interface OrganizationRecord {
  id: string;
  nombre: string;
  rif: string;
  direccion_fiscal?: string;
  certificados_count: number;
}

export interface SiteRecord {
  id: string;
  numero_sitio: number;
  nombre_sitio: string;
  direccion_sitio: string;
  numero_certificado: string;
  turnos_count: number;
}

export interface ProcessRecord {
  id: string;
  nombre_proceso: string;
  numero_certificado: string;
  clausulas_cubiertas: string[];
}

export interface ShiftRecord {
  id: string;
  hora_entrada: string;
  hora_salida: string;
  descripcion: string;
  sitios_vinculados: string[];
}

export interface CertificacionViewState {
  activeSubSection: string;
  filters: SearchControlsFilterState;
  filteredCertificates: CertificateRecord[];
  allCertificates: CertificateRecord[];
  availableStatuses: string[];
  availableStandards: string[];
  organizations: OrganizationRecord[];
  sites: SiteRecord[];
  processes: ProcessRecord[];
  shifts: ShiftRecord[];
  loading: boolean;
}

export function renderCertificacionView(
  profile: UserProfile,
  state: CertificacionViewState
): string {
  const activeSub = state.activeSubSection || 'certificates';
  const isStaff = profile.role === 'ADMIN' || profile.role === 'WORKER';

  const subTabs = [
    {
      id: 'certificates',
      label: 'Certificados Emitidos',
      symbol: '📜',
      desc: 'Certificados de conformidad y avance de cobertura normativa ISO',
    },
    {
      id: 'organizations',
      label: 'Organizaciones Clientes',
      symbol: '🏢',
      desc: 'Empresas titulares, RIF y acceso autorizado de usuarios clientes',
    },
    {
      id: 'sites',
      label: 'Sedes Multisitio',
      symbol: '📍',
      desc: 'Plantas operativas y sedes físicas auditadas por certificado',
    },
    {
      id: 'processes',
      label: 'Mapa de Procesos',
      symbol: '⚙️',
      desc: 'Procesos operativos declarados y requisitos normativos vinculados',
    },
  ];

  if (isStaff) {
    subTabs.push({
      id: 'shifts',
      label: 'Turnos Productivos',
      symbol: '🕒',
      desc: 'Regímenes de turnos de trabajo y horarios operativos por sede',
    });
  }

  let contentHtml = '';

  if (activeSub === 'organizations') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Organizaciones Clientes Registradas</h3>
              <p class="text-xs text-slate-500">Padrón de empresas evaluadas y titulares de certificados</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              ${state.organizations.length} Empresas Registradas
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.organizations
              .map(
                (org) => `
              <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-0.5">
                    <h4 class="text-sm font-bold text-slate-900">${escapeHtml(org.nombre)}</h4>
                    <span class="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      ${escapeHtml(org.rif)}
                    </span>
                  </div>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ACTIVA
                  </span>
                </div>

                <div class="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400">Dirección Fiscal:</span>
                    <p class="text-slate-700 font-medium">${escapeHtml(org.direccion_fiscal || 'No especificada')}</p>
                  </div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-slate-500">Certificados Vinculados:</span>
                    <span class="font-bold text-slate-900">${org.certificados_count}</span>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'sites') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Sedes Físicas y Esquemas Multisitio</h3>
              <p class="text-xs text-slate-500">Plantas y ubicaciones productivas vinculadas a certificados</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Esquemas Validados
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.sites
              .map(
                (site) => `
              <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        Sede #${site.numero_sitio}
                      </span>
                      <span class="font-mono text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        ${escapeHtml(site.numero_certificado)}
                      </span>
                    </div>
                    <h4 class="text-sm font-bold text-slate-900">${escapeHtml(site.nombre_sitio)}</h4>
                  </div>
                </div>

                <div class="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/60">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-slate-400">Ubicación Física:</span>
                    <p class="text-slate-700 font-medium">${escapeHtml(site.direccion_sitio)}</p>
                  </div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-slate-500">Turnos Asignados:</span>
                    <span class="font-semibold text-slate-800">${site.turnos_count} turnos activos</span>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'processes') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Mapa de Procesos Operativos</h3>
              <p class="text-xs text-slate-500">Mapeo de procesos de certificación y vinculación con cláusulas ISO</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              ${state.processes.length} Procesos Declarados
            </span>
          </div>

          <div class="space-y-3">
            ${state.processes
              .map(
                (proc) => `
              <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                    <h4 class="text-sm font-bold text-slate-900">${escapeHtml(proc.nombre_proceso)}</h4>
                    <span class="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      ${escapeHtml(proc.numero_certificado)}
                    </span>
                  </div>
                  <span class="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                    COBERTURA DIRECTA
                  </span>
                </div>
                <div class="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Requisitos Normativos Mapeados:</span>
                  <div class="flex flex-wrap gap-1.5">
                    ${proc.clausulas_cubiertas
                      .map(
                        (c) => `
                      <span class="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-800">
                        Cláusula ${escapeHtml(c)}
                      </span>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'shifts') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Regímenes de Turnos Productivos</h3>
              <p class="text-xs text-slate-500">Horarios operativos por sede para planificación de jornadas de auditoría</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              ${state.shifts.length} Turnos Configurados
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.shifts
              .map(
                (shift) => `
              <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-sm text-slate-900">${escapeHtml(shift.descripcion)}</span>
                  <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    ${escapeHtml(shift.hora_entrada)} - ${escapeHtml(shift.hora_salida)}
                  </span>
                </div>
                <div class="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sedes con este horario:</span>
                  <p class="text-slate-800 font-medium">${shift.sitios_vinculados.join(', ') || 'Planta Valencia'}</p>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else {
    // certificates - Interactive Exploration View with Sub-Phase 4.2 components!
    const totalCount = state.allCertificates.length;
    const matchCount = state.filteredCertificates.length;

    let viewContainerHtml = '';
    if (state.loading) {
      viewContainerHtml = `
        <div class="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm font-medium">
          <div class="inline-block animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full mb-3"></div>
          <p>Cargando certificados emitidos y cobertura normativa...</p>
        </div>
      `;
    } else if (matchCount === 0) {
      viewContainerHtml = renderEmptySearchState(state.filters.query);
    } else if (state.filters.viewMode === 'list') {
      viewContainerHtml = renderCertificateList(state.filteredCertificates);
    } else {
      viewContainerHtml = renderCertificateGrid(state.filteredCertificates);
    }

    contentHtml = `
      <div class="space-y-4">
        ${renderSearchControls({
          filters: state.filters,
          availableStatuses: state.availableStatuses,
          availableStandards: state.availableStandards,
          matchCount,
          totalCount,
        })}

        <div id="explorationResultsContainer">
          ${viewContainerHtml}
        </div>
      </div>
    `;
  }

  return `
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Domain Header Banner -->
      <section class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
              <span>🏛️</span>
              <span>DOMINIO CERTIFICACIÓN · ISO/IEC 17021-1:2015</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Estructura Operativa y Certificación
            </h1>
            <p class="text-xs text-slate-600">
              Gestión integral de certificados, organizaciones clientes, sedes multisitio, mapas de procesos y turnos.
            </p>
          </div>
          <button
            type="button"
            data-nav="dashboard"
            class="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </button>
        </div>

        <!-- Sub-tabs navigation -->
        <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          ${subTabs
            .map(
              (tab) => `
            <button
              type="button"
              data-nav="certificacion"
              data-subview="${tab.id}"
              title="${escapeHtml(tab.desc)}"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSub === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }"
            >
              <span>${tab.symbol}</span>
              <span>${escapeHtml(tab.label)}</span>
            </button>
          `
            )
            .join('')}
        </div>
      </section>

      <!-- Active Sub-tab View Content -->
      ${contentHtml}
    </main>
  `;
}
