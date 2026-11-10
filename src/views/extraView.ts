import { escapeHtml } from '../lib/html';
import type { UserProfile } from '../lib/healthCheck';

export interface StandardRecord {
  id: string;
  esquema: string;
  norma: string;
  clausulas_count?: number;
}

export interface RequirementRecord {
  id: string;
  codigo: string;
  ruta_materializada: string;
  norma: string;
}

export interface IafRecord {
  id: string;
  sector: number;
  descripcion: string;
}

export interface CatalogItem {
  categoria: string;
  valor: string;
  descripcion?: string;
}

export interface ExtraViewState {
  activeSubSection: string;
  standards: StandardRecord[];
  requirements: RequirementRecord[];
  iafSectors: IafRecord[];
  catalogs: CatalogItem[];
  loading: boolean;
}

export function renderExtraView(
  profile: UserProfile,
  state: ExtraViewState
): string {
  const activeSub = state.activeSubSection || 'standards';

  const subTabs = [
    {
      id: 'standards',
      label: 'Normas ISO',
      symbol: '📘',
      desc: 'Esquemas y normas certificables internacionales',
    },
    {
      id: 'requirements',
      label: 'Requisitos LTREE',
      symbol: '🌳',
      desc: 'Jerarquía de cláusulas y sub-requisitos normativos con ruta materializada',
    },
    {
      id: 'iaf',
      label: 'Sectores IAF',
      symbol: '🏭',
      desc: 'Sectores técnicos de acreditación internacional IAF',
    },
    {
      id: 'catalogs',
      label: 'Estatus y Metodologías',
      symbol: '🏷️',
      desc: 'Catálogos maestros de estatus operativos, tipos y metodologías de auditoría',
    },
  ];

  let contentHtml = '';

  if (activeSub === 'requirements') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Estructura Jerárquica LTREE de Requisitos</h3>
              <p class="text-xs text-slate-500">Árbol de cláusulas y operadores de propagación de cobertura</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Extension PostgreSQL ltree
            </span>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th class="py-3 px-4">Código Cláusula</th>
                  <th class="py-3 px-4">Ruta Materializada (ltree)</th>
                  <th class="py-3 px-4">Norma Asociada</th>
                  <th class="py-3 px-4 text-center">Nivel Jerárquico</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${state.requirements
                  .map((req) => {
                    const isParent = !req.codigo.includes('.');
                    return `
                      <tr class="hover:bg-slate-50/80 transition-colors ${isParent ? 'bg-slate-50/40' : ''}">
                        <td class="py-3 px-4 font-mono font-bold ${isParent ? 'text-slate-900 text-sm' : 'text-slate-700 pl-8'}">
                          ${escapeHtml(req.codigo)}
                        </td>
                        <td class="py-3 px-4 font-mono text-xs text-indigo-700">
                          ${escapeHtml(req.ruta_materializada)}
                        </td>
                        <td class="py-3 px-4 font-medium text-slate-800">
                          ${escapeHtml(req.norma)}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isParent
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }">
                            ${isParent ? 'Cláusula Principal' : 'Sub-requisito'}
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
      </div>
    `;
  } else if (activeSub === 'iaf') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Sectores Técnicos de Acreditación IAF</h3>
              <p class="text-xs text-slate-500">Clasificación internacional de sectores industriales y de servicios</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              ${state.iafSectors.length} Sectores Registrados
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${state.iafSectors
              .map(
                (iaf) => `
              <div class="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-base font-bold text-slate-900">IAF ${iaf.sector}</span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                    Acreditado
                  </span>
                </div>
                <p class="text-xs text-slate-600 font-medium">${escapeHtml(iaf.descripcion)}</p>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else if (activeSub === 'catalogs') {
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Catálogos Maestros del Sistema</h3>
            <p class="text-xs text-slate-500">Estatus operativos, tipos de auditoría y metodologías admitidas</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Estatus -->
            <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Estatus Operativos</h4>
              <div class="space-y-1 pt-1">
                ${state.catalogs
                  .filter((c) => c.categoria === 'estatus')
                  .map(
                    (c) => `
                  <div class="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                    <span class="font-semibold text-slate-800">${escapeHtml(c.valor)}</span>
                    <span class="w-2 h-2 rounded-full ${
                      c.valor === 'ACTIVO' ? 'bg-emerald-500' : c.valor === 'SUSPENDIDO' ? 'bg-amber-500' : 'bg-slate-400'
                    }"></span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Tipos de Auditoría -->
            <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Tipos de Auditoría</h4>
              <div class="space-y-1 pt-1">
                ${state.catalogs
                  .filter((c) => c.categoria === 'tipo_auditoria')
                  .map(
                    (c) => `
                  <div class="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                    <span class="font-semibold text-slate-800">${escapeHtml(c.valor)}</span>
                    <span class="text-[10px] text-slate-400">Etapa ISO</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Metodologías -->
            <div class="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Metodologías de Ejecución</h4>
              <div class="space-y-1 pt-1">
                ${state.catalogs
                  .filter((c) => c.categoria === 'metodologia')
                  .map(
                    (c) => `
                  <div class="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                    <span class="font-semibold text-slate-800">${escapeHtml(c.valor)}</span>
                    <span class="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">ISO 19011</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // standards
    contentHtml = `
      <div class="space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">Normas y Esquemas Certificables ISO</h3>
              <p class="text-xs text-slate-500">Catálogo maestro de estándares evaluados por FONDONORMA</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              ${state.standards.length} Normas Acreditadas
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.standards
              .map(
                (std) => `
              <div class="p-5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-1">
                    <span class="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
                      ${escapeHtml(std.norma)}
                    </span>
                    <h4 class="text-sm font-bold text-slate-900 leading-snug">${escapeHtml(std.esquema)}</h4>
                  </div>
                  <span class="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    VIGENTE
                  </span>
                </div>
                <div class="text-xs text-slate-600 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span>Esquema de Gestión</span>
                  <span class="font-bold text-slate-800">${std.clausulas_count || 7} Requisitos Mapeados</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
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
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <span>📚</span>
              <span>DOMINIO EXTRA · CATÁLOGOS MAESTROS</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Catálogos Base y Competencias
            </h1>
            <p class="text-xs text-slate-600">
              Esquemas normativos ISO, jerarquías de requisitos ltree, sectores IAF y metodologías de auditoría.
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
              data-nav="extra"
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
