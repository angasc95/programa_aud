/**
 * Sub-Phase 4.2: Pure data exploration and search filtering logic
 * Aligned with ISO/IEC 17021-1:2015 and ISO 19011:2018 domain structures.
 */

export type ViewMode = 'grid' | 'list';

export interface CoverageBreakdown {
  covered: number;
  nonApplicable: number;
  pending: number;
  total: number;
}

export interface CertificateRecord {
  id: string;
  numero_certificado: string;
  organizacion_id?: string;
  organizacion_nombre: string;
  organizacion_rif: string;
  direccion_fiscal?: string;
  norma_id?: string;
  norma: string;
  esquema: string;
  estatus: string;
  sector_iaf?: number;
  multisitio: boolean;
  sitios_count: number;
  cobertura_porcentaje: number;
  cobertura_resumen?: CoverageBreakdown;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  alcance?: string;
}

export interface SearchControlsFilterState {
  query: string;
  selectedStatus: string;
  selectedStandard: string;
  viewMode: ViewMode;
}

export const VIEW_MODE_STORAGE_KEY = 'programa_aud_view_mode';

/**
 * Normalizes strings by lowercasing and removing accents for reliable client-side search.
 */
export function normalizeSearchToken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Checks whether a certificate matches a search query across:
 * - Certificate Code / Number (e.g., 'FN-QMS-2024-001')
 * - Company / Organization Name (e.g., 'Iberometal Componentes S.A.')
 * - Tax ID / RIF (e.g., 'J-30492817-0' or 'J304928170')
 */
export function matchesSearchCriteria(
  record: CertificateRecord,
  query: string
): boolean {
  const cleanQuery = normalizeSearchToken(query);
  if (!cleanQuery) return true;

  // Split multi-word query tokens to match all tokens against any field
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const normalizedCode = normalizeSearchToken(record.numero_certificado);
  const normalizedName = normalizeSearchToken(record.organizacion_nombre);
  const normalizedRif = normalizeSearchToken(record.organizacion_rif);
  const rawRifDigitsOnly = normalizedRif.replace(/[^a-z0-9]/g, '');
  const normalizedStandard = normalizeSearchToken(record.norma);

  return tokens.every((token) => {
    const tokenDigitsOnly = token.replace(/[^a-z0-9]/g, '');
    const matchesCode = normalizedCode.includes(token);
    const matchesName = normalizedName.includes(token);
    const matchesRif =
      normalizedRif.includes(token) ||
      (tokenDigitsOnly.length >= 3 && rawRifDigitsOnly.includes(tokenDigitsOnly));
    const matchesStandard = normalizedStandard.includes(token);

    return matchesCode || matchesName || matchesRif || matchesStandard;
  });
}

/**
 * Filters certificate records by search query and optional status/standard facets.
 */
export function filterCertificateRecords(
  records: CertificateRecord[],
  filters: Pick<SearchControlsFilterState, 'query' | 'selectedStatus' | 'selectedStandard'>
): CertificateRecord[] {
  const { query, selectedStatus, selectedStandard } = filters;

  return records.filter((rec) => {
    // 1. Multi-attribute text search
    if (!matchesSearchCriteria(rec, query)) {
      return false;
    }

    // 2. Status facet filter
    if (
      selectedStatus &&
      selectedStatus !== 'ALL' &&
      rec.estatus.toUpperCase() !== selectedStatus.toUpperCase()
    ) {
      return false;
    }

    // 3. Standard / Scheme facet filter
    if (
      selectedStandard &&
      selectedStandard !== 'ALL' &&
      rec.norma !== selectedStandard
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Extracts sorted, distinct operational statuses from a list of records.
 */
export function extractUniqueStatuses(records: CertificateRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    if (r.estatus) set.add(r.estatus.toUpperCase());
  }
  return Array.from(set).sort();
}

/**
 * Extracts sorted, distinct standards from a list of records.
 */
export function extractUniqueStandards(records: CertificateRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    if (r.norma) set.add(r.norma);
  }
  return Array.from(set).sort();
}

/**
 * Returns user-friendly count summary text for matched records.
 */
export function formatMatchCountText(matchCount: number, totalCount: number): string {
  if (totalCount === 0) return '0 certificados registrados';
  if (matchCount === totalCount) {
    return `${totalCount} ${totalCount === 1 ? 'certificado registrado' : 'certificados registrados'}`;
  }
  return `${matchCount} de ${totalCount} ${totalCount === 1 ? 'coincidente' : 'coincidentes'}`;
}

/**
 * Safely loads the active view mode preference from localStorage with fallback.
 */
export function getStoredViewMode(fallback: ViewMode = 'grid'): ViewMode {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') {
        return stored;
      }
    }
  } catch {
    // Return fallback if localStorage is disabled or restricted in iframe
  }
  return fallback;
}

/**
 * Safely persists the active view mode preference to localStorage.
 */
export function setStoredViewMode(mode: ViewMode): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  } catch {
    // Ignore storage quota or cross-origin sandbox errors
  }
}

/**
 * Visual badge metadata for operational statuses in certification domain.
 */
export function getOperationalStatusVisual(status: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status.toUpperCase()) {
    case 'ACTIVO':
      return {
        label: 'ACTIVO',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'EN_PROCESO':
      return {
        label: 'EN PROCESO',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500',
      };
    case 'SUSPENDIDO':
      return {
        label: 'SUSPENDIDO',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'CANCELADO':
    case 'VENCIDO':
      return {
        label: status.toUpperCase(),
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        dotClass: 'bg-rose-500',
      };
    case 'PLANIFICADA':
      return {
        label: 'PLANIFICADA',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dotClass: 'bg-indigo-500',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
  }
}

/**
 * Resolves color coding based on ISO coverage percentage (CUBIERTO + NO_APLICABLE vs PENDIENTE).
 */
export function getCoverageVisual(percentage: number): {
  barClass: string;
  badgeClass: string;
  textClass: string;
  ratingLabel: string;
} {
  if (percentage >= 100) {
    return {
      barClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      textClass: 'text-emerald-700',
      ratingLabel: 'Cobertura Completa (100%)',
    };
  }
  if (percentage >= 80) {
    return {
      barClass: 'bg-sky-500',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      textClass: 'text-sky-700',
      ratingLabel: 'Cobertura Avanzada',
    };
  }
  if (percentage >= 50) {
    return {
      barClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      textClass: 'text-amber-700',
      ratingLabel: 'Cobertura Parcial',
    };
  }
  return {
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    textClass: 'text-rose-700',
    ratingLabel: 'Requisitos Críticos Pendientes',
  };
}

/**
 * Curated fallback records matching the database seed in 06_datos_prueba.sql
 * Ensures flawless exploration even when database connection has 1 sample record.
 */
export const SAMPLE_CERTIFICATE_RECORDS: CertificateRecord[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_id: '30000000-0000-0000-0000-000000000001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    organizacion_rif: 'J-30492817-0',
    direccion_fiscal: 'Zona Industrial Carabobo, Valencia',
    norma: 'ISO 9001:2015',
    esquema: 'SGC - Gestión de Calidad',
    estatus: 'ACTIVO',
    sector_iaf: 17,
    multisitio: true,
    sitios_count: 1,
    cobertura_porcentaje: 86,
    cobertura_resumen: { covered: 4, nonApplicable: 2, pending: 1, total: 7 },
    fecha_emision: '2024-03-15',
    fecha_vencimiento: '2027-03-14',
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    numero_certificado: 'FN-EMS-2024-002',
    organizacion_id: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    organizacion_rif: 'J-40819234-5',
    direccion_fiscal: 'Torre David, Chacao, Caracas',
    norma: 'ISO 14001:2015',
    esquema: 'SGA - Gestión Ambiental',
    estatus: 'EN_PROCESO',
    sector_iaf: 33,
    multisitio: false,
    sitios_count: 1,
    cobertura_porcentaje: 60,
    cobertura_resumen: { covered: 3, nonApplicable: 0, pending: 2, total: 5 },
    fecha_emision: '2024-06-01',
    fecha_vencimiento: '2027-05-31',
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    numero_certificado: 'FN-OHS-2023-018',
    organizacion_id: '30000000-0000-0000-0000-000000000003',
    organizacion_nombre: 'Petroquímica del Centro C.A.',
    organizacion_rif: 'J-00291834-1',
    direccion_fiscal: 'Complejo Petroquímico Morón, Edo. Carabobo',
    norma: 'ISO 45001:2018',
    esquema: 'SST - Seguridad y Salud Laboral',
    estatus: 'SUSPENDIDO',
    sector_iaf: 14,
    multisitio: true,
    sitios_count: 3,
    cobertura_porcentaje: 45,
    cobertura_resumen: { covered: 4, nonApplicable: 1, pending: 6, total: 11 },
    fecha_emision: '2023-09-10',
    fecha_vencimiento: '2026-09-09',
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    numero_certificado: 'FN-ISMS-2024-007',
    organizacion_id: '30000000-0000-0000-0000-000000000002',
    organizacion_nombre: 'CyberCloud Solutions S.L.',
    organizacion_rif: 'J-40819234-5',
    direccion_fiscal: 'Torre David, Chacao, Caracas',
    norma: 'ISO/IEC 27001:2022',
    esquema: 'SGSI - Seguridad de la Información',
    estatus: 'ACTIVO',
    sector_iaf: 33,
    multisitio: false,
    sitios_count: 1,
    cobertura_porcentaje: 100,
    cobertura_resumen: { covered: 8, nonApplicable: 1, pending: 0, total: 9 },
    fecha_emision: '2024-01-20',
    fecha_vencimiento: '2027-01-19',
  },
];
