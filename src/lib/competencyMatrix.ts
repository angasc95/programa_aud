/**
 * Phase 4.3: Auditor Directory & Competency Matrix Engine
 * Aligned with ISO/IEC 17021-1:2015 (clause 7.2 on competence of personnel and audit teams),
 * ISO 19011:2018 (competency evaluation), and IAF MD 1:2018.
 */
import type { MultiViewSelectionMap } from './universalTemplate';

export type AuditorCalificacion = 'Calificado' | 'En Entrenamiento' | 'Observador';

export type AuditorRolCalificado =
  | 'Auditor Líder'
  | 'Auditor Equipo'
  | 'Especialista'
  | 'Experto Técnico';

export type CredencialEstado = 'Vigente' | 'Por Vencer' | 'Vencido';

export interface CompetenciaAuditorEntity {
  id: string;
  id_auditor: string;
  id_norma: string;
  norma_codigo: string;
  norma_titulo?: string;
  id_sector_iaf: string;
  sector_iaf_numero: number;
  sector_iaf_descripcion: string;
  id_subsector_iaf?: string;
  subsector_iaf_codigo?: string;
  subsector_iaf_descripcion?: string;
  rol_calificado: AuditorRolCalificado;
  fecha_calificacion: string;
  fecha_vencimiento: string;
  numero_registro?: string;
}

export interface AuditoriaRealizadaEntity {
  id: string;
  id_auditor: string;
  codigo_auditoria: string;
  organizacion_nombre: string;
  numero_certificado: string;
  norma_codigo: string;
  tipo_auditoria: string;
  metodologia: 'Presencial' | 'Remota' | 'Mixta';
  rol_en_auditoria: string;
  fecha_ejecucion: string;
  estatus: 'Planificada' | 'En Ejecución' | 'Completada' | 'Cerrada';
}

export interface AuditorDetailEntity {
  id: string;
  nombre: string;
  titulo_profesional: string;
  codigo_credencial: string;
  email: string;
  telefono: string;
  biografia: string;
  instituto_registro: string;
  categoria_profesional: string;
  calificacion: AuditorCalificacion;
  normas_acreditadas: string[];
  sectores_iaf: number[];
  competencias: CompetenciaAuditorEntity[];
  historialAuditorias: AuditoriaRealizadaEntity[];
}

export type AuditorChildTab = 'competencias' | 'historial';

export interface AuditorViewState {
  selectedAuditorId: string | null;
  activeChildTab: AuditorChildTab;
  query: string;
  selectedCalificacion: string;
  selectedStandard: string;
  selectedSectorIaf: string;
  viewMode: 'grid' | 'list';
  sortColumn: 'nombre' | 'codigo_credencial' | 'calificacion' | 'normas' | 'sectores' | null;
  sortDirection: 'asc' | 'desc' | 'none';
  isEditingAttributes: boolean;
  editFormData?: Partial<AuditorDetailEntity>;
  editErrorMessage?: string | null;
  saveSuccessMessage?: string | null;
  isAddCompetencyModalOpen?: boolean;
  isSidebarOpen?: boolean;
  facetSelections?: MultiViewSelectionMap;
  isCreating?: boolean;
  createErrorMessage?: string | null;
}

export interface AuditorFilterCriteria {
  query?: string;
  selectedCalificacion?: string;
  selectedStandard?: string;
  selectedSectorIaf?: string;
  sortColumn?: 'nombre' | 'codigo_credencial' | 'calificacion' | 'normas' | 'sectores' | null;
  sortDirection?: 'asc' | 'desc' | 'none';
}

/**
 * Normalizes text for comparison (diacritics removed, lowercased, trimmed).
 */
export function normalizeText(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parses YYYY-MM-DD or ISO string into a UTC midnight timestamp.
 */
function parseDateUtc(dateStr: string | Date | undefined): number {
  if (!dateStr) return NaN;
  if (dateStr instanceof Date) {
    return dateStr.getTime();
  }
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    return Date.UTC(y, m - 1, d);
  }
  return new Date(dateStr).getTime();
}

/**
 * Checks whether an auditor competency or credential has passed its expiration date.
 */
export function isCredentialExpired(
  fechaVencimiento: string,
  referenceDate?: string | Date
): boolean {
  if (!fechaVencimiento) return false;
  const expiryTime = parseDateUtc(fechaVencimiento);
  if (isNaN(expiryTime)) return false;

  const nowTime = referenceDate ? parseDateUtc(referenceDate) : Date.now();
  return expiryTime < nowTime;
}

/**
 * Evaluates the validity state of a credential:
 * - 'Vencido': Expiration date is in the past
 * - 'Por Vencer': Expiration date is within 90 days
 * - 'Vigente': Valid for more than 90 days
 */
export function getCredentialValidityState(
  fechaVencimiento: string,
  referenceDate?: string | Date
): CredencialEstado {
  if (!fechaVencimiento) return 'Vigente';
  const expiryTime = parseDateUtc(fechaVencimiento);
  if (isNaN(expiryTime)) return 'Vigente';

  const nowTime = referenceDate ? parseDateUtc(referenceDate) : Date.now();
  if (expiryTime < nowTime) {
    return 'Vencido';
  }

  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  if (expiryTime - nowTime <= ninetyDaysMs) {
    return 'Por Vencer';
  }

  return 'Vigente';
}

/**
 * Evaluates whether an auditor is technically qualified for a given audit scope.
 * Complies with ISO/IEC 17021-1:2015 clause 7.2:
 * 1. Checks matching normative standard (e.g., ISO 9001:2015).
 * 2. Checks matching primary IAF sector (e.g., Sector 17).
 * 3. If targetSubsectorIaf is provided, validates that a subsector qualification matches (e.g. 17.1).
 * 4. Checks credential expiration.
 */
export function isAuditorQualifiedForScope(
  competencies: CompetenciaAuditorEntity[],
  targetNorma: string,
  targetSectorIaf: number | string,
  targetSubsectorIaf?: string,
  referenceDate?: string | Date
): {
  qualified: boolean;
  matchedRole?: AuditorRolCalificado;
  isExpired?: boolean;
  reason?: string;
} {
  if (!Array.isArray(competencies) || competencies.length === 0) {
    return {
      qualified: false,
      reason: 'El auditor no posee competencias técnicas registradas.',
    };
  }

  const normClean = normalizeText(targetNorma);
  const targetSectorNum = Number(targetSectorIaf);
  const targetSubClean = targetSubsectorIaf ? normalizeText(targetSubsectorIaf) : undefined;

  let expiredMatch: CompetenciaAuditorEntity | null = null;

  for (const comp of competencies) {
    const compNorma = normalizeText(comp.norma_codigo);
    const normaMatch = compNorma === normClean || compNorma.includes(normClean) || normClean.includes(compNorma);

    const sectorMatch = comp.sector_iaf_numero === targetSectorNum;

    let subsectorMatch = true;
    if (targetSubClean) {
      const compSub = normalizeText(comp.subsector_iaf_codigo);
      subsectorMatch = compSub === targetSubClean || compSub.includes(targetSubClean);
    }

    if (normaMatch && sectorMatch && subsectorMatch) {
      const expired = isCredentialExpired(comp.fecha_vencimiento, referenceDate);
      if (expired) {
        expiredMatch = comp;
      } else {
        return {
          qualified: true,
          matchedRole: comp.rol_calificado,
          isExpired: false,
        };
      }
    }
  }

  if (expiredMatch) {
    return {
      qualified: false,
      matchedRole: expiredMatch.rol_calificado,
      isExpired: true,
      reason: `Calificación vencida el ${expiredMatch.fecha_vencimiento} para ${expiredMatch.norma_codigo} en Sector ${expiredMatch.sector_iaf_numero}.`,
    };
  }

  return {
    qualified: false,
    reason: `Sin calificación vigente para ${targetNorma} y Sector IAF ${targetSectorIaf}${
      targetSubsectorIaf ? ` (${targetSubsectorIaf})` : ''
    }.`,
  };
}

/**
 * Returns the count of distinct normative standards accredited for an auditor.
 */
export function countDistinctAccreditedStandards(
  competencies: CompetenciaAuditorEntity[]
): number {
  if (!Array.isArray(competencies)) return 0;
  const set = new Set(competencies.map((c) => c.norma_codigo.trim()));
  return set.size;
}

/**
 * Returns the count of distinct IAF economic sectors covered by an auditor's competencies.
 */
export function countDistinctQualifiedSectors(
  competencies: CompetenciaAuditorEntity[]
): number {
  if (!Array.isArray(competencies)) return 0;
  const set = new Set(competencies.map((c) => c.sector_iaf_numero));
  return set.size;
}

/**
 * Returns the count of distinct technical subsectors covered by an auditor's competencies.
 */
export function countDistinctQualifiedSubsectors(
  competencies: CompetenciaAuditorEntity[]
): number {
  if (!Array.isArray(competencies)) return 0;
  const set = new Set(
    competencies
      .filter((c) => Boolean(c.subsector_iaf_codigo))
      .map((c) => c.subsector_iaf_codigo!.trim())
  );
  return set.size;
}

/**
 * Validates auditor credential registration code format.
 * Examples: AUD-REG-2022-88, AUD-2024-01, IRCA-102938
 */
export function validateCredentialCode(
  code: string | null | undefined
): { valid: boolean; error?: string } {
  if (!code || !code.trim()) {
    return {
      valid: false,
      error: 'El código de credencial del auditor es obligatorio.',
    };
  }
  const clean = code.trim().toUpperCase();
  if (clean.length < 5 || clean.length > 25) {
    return {
      valid: false,
      error: 'El código de credencial debe tener entre 5 y 25 caracteres (ejemplo: AUD-REG-2024-01).',
    };
  }
  return { valid: true };
}

/**
 * Visual metadata for qualification status badge.
 */
export function getQualificationStatusVisual(calificacion: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
  symbol: string;
} {
  const norm = (calificacion || '').toUpperCase();
  if (norm.includes('CALIFICADO')) {
    return {
      label: 'CALIFICADO',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
      symbol: '✓',
    };
  }
  if (norm.includes('ENTRENAMIENTO')) {
    return {
      label: 'EN ENTRENAMIENTO',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      symbol: '⏳',
    };
  }
  return {
    label: 'OBSERVADOR',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
    symbol: '👁️',
  };
}

/**
 * Visual styling for qualified audit roles.
 */
export function getAuditRoleVisual(rol: AuditorRolCalificado | string): {
  label: string;
  badgeClass: string;
  icon: string;
} {
  switch (rol) {
    case 'Auditor Líder':
      return {
        label: 'Auditor Líder',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold',
        icon: '★',
      };
    case 'Auditor Equipo':
      return {
        label: 'Auditor de Equipo',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        icon: '👤',
      };
    case 'Especialista':
      return {
        label: 'Especialista',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        icon: '🔬',
      };
    case 'Experto Técnico':
      return {
        label: 'Experto Técnico',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        icon: '⚙️',
      };
    default:
      return {
        label: rol || 'Evaluador',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: '•',
      };
  }
}

/**
 * Filters and sorts auditors by text query and multi-dimensional facets.
 */
export function filterAuditors(
  auditors: AuditorDetailEntity[],
  criteria: AuditorFilterCriteria = {}
): AuditorDetailEntity[] {
  const {
    query = '',
    selectedCalificacion = 'ALL',
    selectedStandard = 'ALL',
    selectedSectorIaf = 'ALL',
    sortColumn = null,
    sortDirection = 'none',
  } = criteria;

  const cleanQuery = normalizeText(query);

  const filtered = auditors.filter((auditor) => {
    // 1. Text Search across Name, Credential, Email, Biography, Title
    if (cleanQuery) {
      const matchName = normalizeText(auditor.nombre).includes(cleanQuery);
      const matchTitle = normalizeText(auditor.titulo_profesional).includes(cleanQuery);
      const matchCode = normalizeText(auditor.codigo_credencial).includes(cleanQuery);
      const matchEmail = normalizeText(auditor.email).includes(cleanQuery);
      const matchBio = normalizeText(auditor.biografia).includes(cleanQuery);
      if (!matchName && !matchTitle && !matchCode && !matchEmail && !matchBio) {
        return false;
      }
    }

    // 2. Facet: Qualification Status
    if (selectedCalificacion && selectedCalificacion !== 'ALL') {
      if (normalizeText(auditor.calificacion) !== normalizeText(selectedCalificacion)) {
        return false;
      }
    }

    // 3. Facet: Accredited Standard
    if (selectedStandard && selectedStandard !== 'ALL') {
      const normQuery = normalizeText(selectedStandard);
      const hasStandard = auditor.normas_acreditadas.some((std) =>
        normalizeText(std).includes(normQuery)
      );
      if (!hasStandard) {
        return false;
      }
    }

    // 4. Facet: IAF Sector
    if (selectedSectorIaf && selectedSectorIaf !== 'ALL') {
      const targetSector = Number(selectedSectorIaf);
      if (!auditor.sectores_iaf.includes(targetSector)) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  if (!sortColumn || sortDirection === 'none') {
    return filtered;
  }

  const factor = sortDirection === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    switch (sortColumn) {
      case 'nombre':
        return factor * a.nombre.localeCompare(b.nombre, 'es');
      case 'codigo_credencial':
        return factor * a.codigo_credencial.localeCompare(b.codigo_credencial, 'es');
      case 'calificacion':
        return factor * a.calificacion.localeCompare(b.calificacion, 'es');
      case 'normas':
        return factor * (a.normas_acreditadas.length - b.normas_acreditadas.length);
      case 'sectores':
        return factor * (a.sectores_iaf.length - b.sectores_iaf.length);
      default:
        return 0;
    }
  });
}

/**
 * Canonical test dataset aligned with database seed in 06_datos_prueba.sql
 */
export const INITIAL_AUDITORES_DETAILED: AuditorDetailEntity[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    nombre: 'Ing. Carlos Mendoza',
    titulo_profesional: 'Auditor Líder Certificado — Sistemas de Gestión Calidad y Ambiental',
    codigo_credencial: 'AUD-REG-2021-05',
    email: 'cmendoza@programa-aud.com',
    telefono: '+34 961 882 100',
    biografia: 'Ingeniero Industrial con más de 18 años de experiencia en auditorías de tercera parte bajo ISO 9001, ISO 14001 y sectores metalmecánicos y de construcción civil de alta complejidad.',
    instituto_registro: 'Entidad Nacional de Acreditación (ENAC)',
    categoria_profesional: 'Auditor Líder Senior / Evaluador Jefe',
    calificacion: 'Calificado',
    normas_acreditadas: ['ISO 9001:2015', 'ISO 14001:2015'],
    sectores_iaf: [17, 28],
    competencias: [
      {
        id: 'ca-1001',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        id_norma: 'e0000000-0000-0000-0000-000000009001',
        norma_codigo: 'ISO 9001:2015',
        norma_titulo: 'Sistemas de Gestión de la Calidad',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
        sector_iaf_numero: 17,
        sector_iaf_descripcion: 'Metales básicos y productos metálicos elaborados',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000171',
        subsector_iaf_codigo: '17.1',
        subsector_iaf_descripcion: 'Fabricación de metales básicos, fundición y siderurgia',
        rol_calificado: 'Auditor Líder',
        fecha_calificacion: '2021-03-15',
        fecha_vencimiento: '2027-03-14',
        numero_registro: 'ENAC-QMS-171',
      },
      {
        id: 'ca-1002',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        id_norma: 'e0000000-0000-0000-0000-000000014001',
        norma_codigo: 'ISO 14001:2015',
        norma_titulo: 'Sistemas de Gestión Ambiental',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000028',
        sector_iaf_numero: 28,
        sector_iaf_descripcion: 'Construcción e ingeniería civil',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000281',
        subsector_iaf_codigo: '28.1',
        subsector_iaf_descripcion: 'Edificación y obras públicas de infraestructura',
        rol_calificado: 'Auditor Líder',
        fecha_calificacion: '2021-06-20',
        fecha_vencimiento: '2027-06-19',
        numero_registro: 'ENAC-EMS-281',
      },
    ],
    historialAuditorias: [
      {
        id: 'ha-101',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        codigo_auditoria: 'AUD-2024-001',
        organizacion_nombre: 'Iberometal Componentes S.A.',
        numero_certificado: 'FN-QMS-2024-001',
        norma_codigo: 'ISO 9001:2015',
        tipo_auditoria: 'Renovación',
        metodologia: 'Presencial',
        rol_en_auditoria: 'Auditor Líder',
        fecha_ejecucion: '2024-11-20',
        estatus: 'Planificada',
      },
      {
        id: 'ha-102',
        id_auditor: '10000000-0000-0000-0000-000000000001',
        codigo_auditoria: 'AUD-2024-002',
        organizacion_nombre: 'CyberCloud Solutions S.L.',
        numero_certificado: 'FN-EMS-2024-002',
        norma_codigo: 'ISO 14001:2015',
        tipo_auditoria: 'Etapa 1',
        metodologia: 'Remota',
        rol_en_auditoria: 'Auditor Líder',
        fecha_ejecucion: '2024-05-10',
        estatus: 'Completada',
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    nombre: 'Ing. Roberto Silva',
    titulo_profesional: 'Auditor Líder Senior — Calidad, Seguridad Informática y Metalmecánica',
    codigo_credencial: 'AUD-REG-2022-88',
    email: 'rsilva@programa-aud.com',
    telefono: '+34 600 123 456',
    biografia: 'Ingeniero Mecánico y Especialista en Seguridad Tecnológica con 15 años liderando auditorías en España y Latinoamérica bajo ISO 9001 e ISO/IEC 27001.',
    instituto_registro: 'Entidad Nacional de Acreditación (ENAC)',
    categoria_profesional: 'Auditor Líder / Evaluador Jefe',
    calificacion: 'Calificado',
    normas_acreditadas: ['ISO 9001:2015', 'ISO/IEC 27001:2022'],
    sectores_iaf: [17, 33],
    competencias: [
      {
        id: 'ca-2001',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        id_norma: 'e0000000-0000-0000-0000-000000009001',
        norma_codigo: 'ISO 9001:2015',
        norma_titulo: 'Sistemas de Gestión de la Calidad',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
        sector_iaf_numero: 17,
        sector_iaf_descripcion: 'Metales básicos y productos metálicos elaborados',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000171',
        subsector_iaf_codigo: '17.1',
        subsector_iaf_descripcion: 'Fabricación de metales básicos, fundición y siderurgia',
        rol_calificado: 'Auditor Líder',
        fecha_calificacion: '2022-01-15',
        fecha_vencimiento: '2028-01-14',
        numero_registro: 'ENAC-QMS-1702',
      },
      {
        id: 'ca-2002',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        id_norma: 'e0000000-0000-0000-0000-000000027001',
        norma_codigo: 'ISO/IEC 27001:2022',
        norma_titulo: 'Seguridad de la Información',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000033',
        sector_iaf_numero: 33,
        sector_iaf_descripcion: 'Tecnología de la información y comunicaciones',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000331',
        subsector_iaf_codigo: '33.1',
        subsector_iaf_descripcion: 'Servicios de TI, centros de datos y cloud computing',
        rol_calificado: 'Auditor Líder',
        fecha_calificacion: '2022-05-10',
        fecha_vencimiento: '2028-05-09',
        numero_registro: 'ENAC-ISMS-331',
      },
    ],
    historialAuditorias: [
      {
        id: 'ha-201',
        id_auditor: '10000000-0000-0000-0000-000000000002',
        codigo_auditoria: 'AUD-2024-004',
        organizacion_nombre: 'CyberCloud Solutions S.L.',
        numero_certificado: 'FN-ISMS-2024-007',
        norma_codigo: 'ISO/IEC 27001:2022',
        tipo_auditoria: 'Etapa 2',
        metodologia: 'Mixta',
        rol_en_auditoria: 'Auditor Líder',
        fecha_ejecucion: '2024-01-15',
        estatus: 'Cerrada',
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    nombre: 'Dra. Ana Belén Torres',
    titulo_profesional: 'Auditora Especialista — Sector Químico, Farmacéutico y Seguridad Laboral',
    codigo_credencial: 'AUD-REG-2023-14',
    email: 'atorres@programa-aud.com',
    telefono: '+34 913 550 200',
    biografia: 'Doctora en Ciencias Químicas y Auditora Certificada IRCA. Experta evaluadora técnica en procesos petroquímicos, riesgos mayores y directivas Seveso bajo ISO 45001 e ISO 14001.',
    instituto_registro: 'IRCA / Chartered Quality Institute (CQI)',
    categoria_profesional: 'Auditora Senior / Experta Técnica',
    calificacion: 'Calificado',
    normas_acreditadas: ['ISO 45001:2018', 'ISO 14001:2015'],
    sectores_iaf: [14],
    competencias: [
      {
        id: 'ca-3001',
        id_auditor: '10000000-0000-0000-0000-000000000003',
        id_norma: 'e0000000-0000-0000-0000-000000045001',
        norma_codigo: 'ISO 45001:2018',
        norma_titulo: 'Sistemas de Seguridad y Salud Laboral',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000014',
        sector_iaf_numero: 14,
        sector_iaf_descripcion: 'Productos químicos, fibras sintéticas y farmacéuticos',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000141',
        subsector_iaf_codigo: '14.1',
        subsector_iaf_descripcion: 'Química básica, fertilizantes y polímeros',
        rol_calificado: 'Auditor Líder',
        fecha_calificacion: '2023-02-10',
        fecha_vencimiento: '2029-02-09',
        numero_registro: 'IRCA-OHS-141',
      },
    ],
    historialAuditorias: [
      {
        id: 'ha-301',
        id_auditor: '10000000-0000-0000-0000-000000000003',
        codigo_auditoria: 'AUD-2023-018',
        organizacion_nombre: 'Petroquímica del Centro C.A.',
        numero_certificado: 'FN-OHS-2023-018',
        norma_codigo: 'ISO 45001:2018',
        tipo_auditoria: 'Seguimiento 1',
        metodologia: 'Presencial',
        rol_en_auditoria: 'Auditor Líder',
        fecha_ejecucion: '2024-04-12',
        estatus: 'Cerrada',
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    nombre: 'Lic. Javier Morales',
    titulo_profesional: 'Auditor en Formación — Sistemas de Información y Calidad',
    codigo_credencial: 'AUD-REG-2024-42',
    email: 'jmorales@programa-aud.com',
    telefono: '+34 912 345 679',
    biografia: 'Licenciado en Sistemas de Información con 6 años de experiencia en gestión de calidad de software y seguridad informática. En proceso de calificación para rol de Auditor de Equipo bajo ISO 9001 e ISO 27001.',
    instituto_registro: 'Entidad Nacional de Acreditación (ENAC)',
    categoria_profesional: 'Auditor en Entrenamiento',
    calificacion: 'En Entrenamiento',
    normas_acreditadas: ['ISO 9001:2015'],
    sectores_iaf: [33],
    competencias: [
      {
        id: 'ca-4001',
        id_auditor: '10000000-0000-0000-0000-000000000004',
        id_norma: 'e0000000-0000-0000-0000-000000009001',
        norma_codigo: 'ISO 9001:2015',
        norma_titulo: 'Sistemas de Gestión de la Calidad',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000033',
        sector_iaf_numero: 33,
        sector_iaf_descripcion: 'Tecnología de la información y comunicaciones',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000331',
        subsector_iaf_codigo: '33.1',
        subsector_iaf_descripcion: 'Servicios de tecnologías de información y desarrollo de software',
        rol_calificado: 'Auditor Equipo',
        fecha_calificacion: '2024-03-01',
        fecha_vencimiento: '2026-02-28',
        numero_registro: 'ENAC-TRAIN-331',
      },
    ],
    historialAuditorias: [],
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    nombre: 'Ing. Patricia Salcedo',
    titulo_profesional: 'Auditora Observadora — Gestión Ambiental y Agroalimentaria',
    codigo_credencial: 'AUD-REG-2024-99',
    email: 'psalcedo@programa-aud.com',
    telefono: '+34 954 112 335',
    biografia: 'Ingeniera Agrónoma y Especialista Ambiental en fase de inducción y observación en campo para auditorías de sostenibilidad y gestión ambiental.',
    instituto_registro: 'Entidad Nacional de Acreditación (ENAC)',
    categoria_profesional: 'Auditora Observadora',
    calificacion: 'Observador',
    normas_acreditadas: ['ISO 14001:2015'],
    sectores_iaf: [14],
    competencias: [
      {
        id: 'ca-5001',
        id_auditor: '10000000-0000-0000-0000-000000000005',
        id_norma: 'e0000000-0000-0000-0000-000000014001',
        norma_codigo: 'ISO 14001:2015',
        norma_titulo: 'Sistemas de Gestión Ambiental',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000014',
        sector_iaf_numero: 14,
        sector_iaf_descripcion: 'Productos químicos, fibras sintéticas y farmacéuticos',
        rol_calificado: 'Experto Técnico',
        fecha_calificacion: '2024-05-15',
        fecha_vencimiento: '2025-05-14',
        numero_registro: 'ENAC-OBS-14',
      },
    ],
    historialAuditorias: [],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nombre: 'Auditor Técnico Evaluador',
    titulo_profesional: 'Auditor de Equipo Certificado — Calidad y Manufactura Metalmecánica',
    codigo_credencial: 'AUD-REG-2023-33',
    email: 'auditor@fondonorma.test',
    telefono: '+34 961 882 333',
    biografia: 'Auditor de tercera parte habilitado para evaluaciones ISO 9001:2015 en el sector metalmecánico e industrial.',
    instituto_registro: 'Entidad Nacional de Acreditación (ENAC)',
    categoria_profesional: 'Auditor de Equipo',
    calificacion: 'Calificado',
    normas_acreditadas: ['ISO 9001:2015'],
    sectores_iaf: [17],
    competencias: [
      {
        id: 'ca-3301',
        id_auditor: '33333333-3333-3333-3333-333333333333',
        id_norma: 'e0000000-0000-0000-0000-000000009001',
        norma_codigo: 'ISO 9001:2015',
        norma_titulo: 'Sistemas de Gestión de la Calidad',
        id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
        sector_iaf_numero: 17,
        sector_iaf_descripcion: 'Metales básicos y productos metálicos elaborados',
        id_subsector_iaf: 'da000000-0000-0000-0000-000000000172',
        subsector_iaf_codigo: '17.2',
        subsector_iaf_descripcion: 'Fabricación de productos metálicos elaborados y estampado',
        rol_calificado: 'Auditor Equipo',
        fecha_calificacion: '2023-02-01',
        fecha_vencimiento: '2027-01-31',
        numero_registro: 'ENAC-QMS-172',
      },
    ],
    historialAuditorias: [
      {
        id: 'ha-3301',
        id_auditor: '33333333-3333-3333-3333-333333333333',
        codigo_auditoria: 'AUD-2024-001',
        organizacion_nombre: 'Iberometal Componentes S.A.',
        numero_certificado: 'FN-QMS-2024-001',
        norma_codigo: 'ISO 9001:2015',
        tipo_auditoria: 'Renovación',
        metodologia: 'Presencial',
        rol_en_auditoria: 'Auditor de Equipo',
        fecha_ejecucion: '2024-11-20',
        estatus: 'Planificada',
      },
    ],
  },
];
