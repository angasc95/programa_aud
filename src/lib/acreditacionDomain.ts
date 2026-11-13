/**
 * Phase 4.1.3: Accreditation Domain Module (`acreditacion_norma_iaf` + `organismo_acreditacion`)
 * Compliant with ISO/IEC 17011, ISO/IEC 17021-1, and IAF Mandatory Documents.
 * Strictly typed (0 any) and Zero-UUID presentation compliant.
 */

import { isActiveCertificateStatus, normalizeText } from './activeCertificates';
import {
  INITIAL_ACREDITACIONES,
  INITIAL_NORMAS,
  INITIAL_ORGANISMOS,
  INITIAL_SECTORES_IAF,
  type AcreditacionNormaIaf,
  type NormaEntity,
  type OrganismoAcreditacion,
  type SectorIafEntity,
  type SubsectorIafEntity,
} from './extraDomain';

export type AcreditacionEstatus = 'Activa' | 'Suspendida' | 'Vencida' | 'En Renovación';

export type AcreditacionExpiryState =
  | 'Vigente'
  | 'Por Vencer'
  | 'Vencida'
  | 'Sin Vencimiento';

export interface AcreditacionExpiryEvaluation {
  state: AcreditacionExpiryState;
  daysRemaining: number | null;
}

export interface AcreditacionDetailEntity {
  id: string;
  id_organismo: string;
  organismo_codigo: string;
  organismo_nombre: string;
  organismo_pais: string;
  organismo_sitio_web: string | null;
  id_norma: string;
  norma_codigo: string;
  norma_titulo: string;
  id_sector_iaf: string | null;
  sector_numero: number | null;
  sector_descripcion: string | null;
  numero_acreditacion: string;
  fecha_concesion: string;
  fecha_vencimiento: string | null;
  estatus: AcreditacionEstatus;
  activeCertificatesCount: number;
  deleted_at: string | null;
}

export interface CertificateCoverageInput {
  id?: string;
  estatus?: string | null;
  id_norma?: string | null;
  norma_id?: string | null;
  norma_codigo?: string | null;
  norma?: string | null;
  id_sector_iaf?: string | null;
  sector_iaf?: number | null;
}

export interface AccreditationValidationInput {
  organismoMode?: 'existing' | 'new';
  id_organismo?: string | null;
  organismo_codigo?: string | null;
  organismo_nombre?: string | null;
  organismo_pais?: string | null;
  organismo_sitio_web?: string | null;
  id_norma: string | null | undefined;
  id_sector_iaf?: string | null;
  numero_acreditacion: string | null | undefined;
  fecha_concesion: string | null | undefined;
  fecha_vencimiento?: string | null;
  estatus?: string | null;
  existingAccreditations?: ReadonlyArray<
    Pick<AcreditacionDetailEntity, 'id' | 'id_organismo' | 'numero_acreditacion' | 'deleted_at'>
  >;
}

export interface AccreditationValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    id_norma: string;
    id_sector_iaf: string | null;
    numero_acreditacion: string;
    fecha_concesion: string;
    fecha_vencimiento: string | null;
    estatus: AcreditacionEstatus;
  };
}

export interface SupabaseOrganismoJoinRow {
  id?: unknown;
  codigo?: unknown;
  nombre?: unknown;
  pais?: unknown;
  sitio_web?: unknown;
  deleted_at?: unknown;
}

export interface SupabaseNormaJoinRow {
  id?: unknown;
  codigo?: unknown;
  titulo?: unknown;
  norma?: unknown;
  esquema?: unknown;
  deleted_at?: unknown;
}

export interface SupabaseSectorIafJoinRow {
  id?: unknown;
  sector?: unknown;
  deleted_at?: unknown;
}

export interface SupabaseAcreditacionJoinRow {
  id?: unknown;
  id_organismo?: unknown;
  id_norma?: unknown;
  id_sector_iaf?: unknown;
  numero_acreditacion?: unknown;
  fecha_concesion?: unknown;
  fecha_vencimiento?: unknown;
  estatus?: unknown;
  deleted_at?: unknown;
  organismo?: SupabaseOrganismoJoinRow | null;
  norma?: SupabaseNormaJoinRow | null;
  sector_iaf?: SupabaseSectorIafJoinRow | null;
}

export const ALL_SECTORS_FACET_VALUE = '__ALL_SECTORS__';
export const ALL_SECTORS_LABEL = 'Todos los Sectores';
export const EXPIRY_WARNING_DAYS = 90;

const VALID_ACREDITACION_STATUSES: readonly AcreditacionEstatus[] = [
  'Activa',
  'Suspendida',
  'Vencida',
  'En Renovación',
];

function parseIsoDateUtcMs(raw: string | Date | null | undefined): number | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
  }

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!isoDateMatch) return null;

  const year = Number(isoDateMatch[1]);
  const month = Number(isoDateMatch[2]);
  const day = Number(isoDateMatch[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const utcMs = Date.UTC(year, month - 1, day);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return utcMs;
}

/**
 * Evaluates accreditation expiry state against a reference date (UTC day precision).
 * - > 90 days remaining -> 'Vigente'
 * - 0..90 days remaining -> 'Por Vencer'
 * - < 0 days remaining -> 'Vencida'
 * - missing/null expiry -> 'Sin Vencimiento'
 */
export function evaluateAccreditationExpiry(
  fechaVencimiento: string | null | undefined,
  referenceDate: Date | string = new Date()
): AcreditacionExpiryEvaluation {
  const expiryMs = parseIsoDateUtcMs(fechaVencimiento);
  if (expiryMs === null) {
    return {
      state: 'Sin Vencimiento',
      daysRemaining: null,
    };
  }

  const refMs = parseIsoDateUtcMs(referenceDate) ?? parseIsoDateUtcMs(new Date())!;
  const daysRemaining = Math.round((expiryMs - refMs) / 86_400_000);

  if (daysRemaining < 0) {
    return { state: 'Vencida', daysRemaining };
  }
  if (daysRemaining <= EXPIRY_WARNING_DAYS) {
    return { state: 'Por Vencer', daysRemaining };
  }
  return { state: 'Vigente', daysRemaining };
}

/**
 * Normalizes accreditation status string into canonical AcreditacionEstatus.
 */
export function normalizeAcreditacionStatus(raw: string | null | undefined): AcreditacionEstatus {
  const cleaned = normalizeText(raw);
  if (cleaned === 'suspendida' || cleaned === 'suspendido') return 'Suspendida';
  if (cleaned === 'vencida' || cleaned === 'vencido') return 'Vencida';
  if (cleaned === 'en renovacion') return 'En Renovación';
  return 'Activa';
}

/**
 * Filters active operational certificates covered by a specific accreditation scope.
 * Matches active certificates sharing (id_norma, id_sector_iaf) or all active certificates
 * for that norm when id_sector_iaf is null ("Todos los Sectores").
 */
export function filterCoveredCertificatesForAccreditation<T extends CertificateCoverageInput>(
  accreditation: Pick<
    AcreditacionDetailEntity,
    'id_norma' | 'norma_codigo' | 'id_sector_iaf' | 'sector_numero'
  >,
  certificates: ReadonlyArray<T>
): T[] {
  if (!certificates || certificates.length === 0) return [];

  const targetNormCode = normalizeText(accreditation.norma_codigo);
  const isGeneralScope =
    accreditation.id_sector_iaf === null && accreditation.sector_numero === null;

  const matched: T[] = [];
  for (const cert of certificates) {
    if (!isActiveCertificateStatus(cert.estatus)) {
      continue;
    }

    const certNormId = cert.id_norma || cert.norma_id || null;
    const certNormCode = normalizeText(cert.norma_codigo || cert.norma || '');
    const normMatches =
      (Boolean(certNormId) && certNormId === accreditation.id_norma) ||
      (Boolean(targetNormCode) && certNormCode === targetNormCode);

    if (!normMatches) {
      continue;
    }

    if (isGeneralScope) {
      matched.push(cert);
      continue;
    }

    const sectorMatchesById =
      Boolean(cert.id_sector_iaf) &&
      Boolean(accreditation.id_sector_iaf) &&
      cert.id_sector_iaf === accreditation.id_sector_iaf;
    const sectorMatchesByNum =
      cert.sector_iaf !== null &&
      cert.sector_iaf !== undefined &&
      accreditation.sector_numero !== null &&
      accreditation.sector_numero !== undefined &&
      Number(cert.sector_iaf) === accreditation.sector_numero;

    if (sectorMatchesById || sectorMatchesByNum) {
      matched.push(cert);
    }
  }

  return matched;
}

/**
 * Computes active operational certificates covered by a specific accreditation scope.
 */
export function computeActiveCertificatesCountForAccreditation(
  accreditation: Pick<
    AcreditacionDetailEntity,
    'id_norma' | 'norma_codigo' | 'id_sector_iaf' | 'sector_numero'
  >,
  certificates: ReadonlyArray<CertificateCoverageInput>
): number {
  return filterCoveredCertificatesForAccreditation(accreditation, certificates).length;
}

/**
 * Resolves IAF technical sub-sectors covered by an accreditation scope.
 * When `id_sector_iaf` and `sector_numero` are both null ("Todos los Sectores"),
 * returns all registered technical sub-sectors ordered by code.
 */
export function getSubsectoresForAccreditation(
  accreditation: Pick<AcreditacionDetailEntity, 'id_sector_iaf' | 'sector_numero'>,
  subsectores: ReadonlyArray<SubsectorIafEntity>
): SubsectorIafEntity[] {
  if (!subsectores || subsectores.length === 0) return [];
  const isGeneralScope =
    accreditation.id_sector_iaf === null && accreditation.sector_numero === null;

  const filtered = isGeneralScope
    ? [...subsectores]
    : subsectores.filter(
        (sub) =>
          (Boolean(accreditation.id_sector_iaf) && sub.id_sector_iaf === accreditation.id_sector_iaf) ||
          (accreditation.sector_numero !== null && sub.sector_numero === accreditation.sector_numero)
      );

  return filtered.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
}

/**
 * Returns a copy of accreditations with freshly computed `activeCertificatesCount`.
 */
export function enrichAcreditacionesWithImpact(
  accreditations: ReadonlyArray<AcreditacionDetailEntity>,
  certificates: ReadonlyArray<CertificateCoverageInput>
): AcreditacionDetailEntity[] {
  return accreditations.map((acc) => ({
    ...acc,
    activeCertificatesCount: computeActiveCertificatesCountForAccreditation(acc, certificates),
  }));
}

/**
 * Validates accreditation creation/update payloads.
 * Enforces required organism (existing ID or new body fields), standard,
 * non-empty accreditation number, valid grant date, and coherent expiry >= grant date.
 */
export function validateAccreditationInput(
  input: AccreditationValidationInput
): AccreditationValidationResult {
  const mode = input.organismoMode ?? 'existing';

  if (mode === 'new') {
    const orgCode = (input.organismo_codigo || '').trim();
    const orgName = (input.organismo_nombre || '').trim();
    const orgCountry = (input.organismo_pais || '').trim();
    const orgWeb = (input.organismo_sitio_web || '').trim();

    if (orgCode.length < 2 || orgCode.length > 20) {
      return {
        valid: false,
        error: 'El código del organismo acreditador es obligatorio (entre 2 y 20 caracteres, ej. ENAC).',
      };
    }
    if (orgName.length < 3) {
      return {
        valid: false,
        error: 'El nombre completo del organismo acreditador es obligatorio (mínimo 3 caracteres).',
      };
    }
    if (orgCountry.length < 2) {
      return {
        valid: false,
        error: 'El país de origen del organismo acreditador es obligatorio.',
      };
    }
    if (orgWeb && !/^https?:\/\/.+/i.test(orgWeb)) {
      return {
        valid: false,
        error: 'El sitio web del organismo debe comenzar con http:// o https://.',
      };
    }
  } else {
    const idOrganismo = (input.id_organismo || '').trim();
    if (!idOrganismo) {
      return {
        valid: false,
        error: 'Debe seleccionar un organismo de acreditación válido.',
      };
    }
  }

  const idNorma = (input.id_norma || '').trim();
  if (!idNorma) {
    return {
      valid: false,
      error: 'Debe seleccionar la norma ISO cubierta por la acreditación.',
    };
  }

  const numeroAcreditacion = (input.numero_acreditacion || '').trim();
  if (numeroAcreditacion.length < 2) {
    return {
      valid: false,
      error: 'El número de acreditación es obligatorio (mínimo 2 caracteres).',
    };
  }

  const fechaConcesion = (input.fecha_concesion || '').trim();
  const grantMs = parseIsoDateUtcMs(fechaConcesion);
  if (grantMs === null) {
    return {
      valid: false,
      error: 'La fecha de concesión es obligatoria y debe tener formato YYYY-MM-DD válido.',
    };
  }

  const rawExpiry = (input.fecha_vencimiento || '').trim();
  let fechaVencimiento: string | null = null;
  if (rawExpiry) {
    const expiryMs = parseIsoDateUtcMs(rawExpiry);
    if (expiryMs === null) {
      return {
        valid: false,
        error: 'La fecha de vencimiento debe tener formato YYYY-MM-DD válido.',
      };
    }
    if (expiryMs < grantMs) {
      return {
        valid: false,
        error: 'La fecha de vencimiento debe ser igual o posterior a la fecha de concesión.',
      };
    }
    fechaVencimiento = rawExpiry;
  }

  const rawStatus = (input.estatus || 'Activa').trim();
  const matchedStatus = VALID_ACREDITACION_STATUSES.find(
    (s) => normalizeText(s) === normalizeText(rawStatus)
  );
  if (!matchedStatus) {
    return {
      valid: false,
      error: 'El estatus de acreditación seleccionado no es válido.',
    };
  }

  const idSectorIaf = (input.id_sector_iaf || '').trim() || null;

  if (input.existingAccreditations && mode === 'existing' && input.id_organismo) {
    const duplicate = input.existingAccreditations.some(
      (existing) =>
        !existing.deleted_at &&
        existing.id_organismo === input.id_organismo &&
        normalizeText(existing.numero_acreditacion) === normalizeText(numeroAcreditacion)
    );
    if (duplicate) {
      return {
        valid: false,
        error: `Ya existe una acreditación activa con el número "${numeroAcreditacion}" para ese organismo.`,
      };
    }
  }

  return {
    valid: true,
    normalized: {
      id_norma: idNorma,
      id_sector_iaf: idSectorIaf,
      numero_acreditacion: numeroAcreditacion,
      fecha_concesion: fechaConcesion,
      fecha_vencimiento: fechaVencimiento,
      estatus: matchedStatus,
    },
  };
}

export interface AccreditationEditValidationInput {
  id: string;
  id_organismo: string;
  numero_acreditacion: string | null | undefined;
  fecha_concesion: string | null | undefined;
  fecha_vencimiento?: string | null;
  estatus?: string | null;
  existingAccreditations?: ReadonlyArray<
    Pick<AcreditacionDetailEntity, 'id' | 'id_organismo' | 'numero_acreditacion' | 'deleted_at'>
  >;
}

export interface AccreditationEditValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    numero_acreditacion: string;
    fecha_concesion: string;
    fecha_vencimiento: string | null;
    estatus: AcreditacionEstatus;
  };
}

/**
 * Validates updates to an existing accreditation record (`numero_acreditacion`, dates, status).
 */
export function validateAccreditationEditInput(
  input: AccreditationEditValidationInput
): AccreditationEditValidationResult {
  const numeroAcreditacion = (input.numero_acreditacion || '').trim();
  if (numeroAcreditacion.length < 2) {
    return {
      valid: false,
      error: 'El número de acreditación es obligatorio (mínimo 2 caracteres).',
    };
  }

  const fechaConcesion = (input.fecha_concesion || '').trim();
  const grantMs = parseIsoDateUtcMs(fechaConcesion);
  if (grantMs === null) {
    return {
      valid: false,
      error: 'La fecha de concesión es obligatoria y debe tener formato YYYY-MM-DD válido.',
    };
  }

  const rawExpiry = (input.fecha_vencimiento || '').trim();
  let fechaVencimiento: string | null = null;
  if (rawExpiry) {
    const expiryMs = parseIsoDateUtcMs(rawExpiry);
    if (expiryMs === null) {
      return {
        valid: false,
        error: 'La fecha de vencimiento debe tener formato YYYY-MM-DD válido.',
      };
    }
    if (expiryMs < grantMs) {
      return {
        valid: false,
        error: 'La fecha de vencimiento debe ser igual o posterior a la fecha de concesión.',
      };
    }
    fechaVencimiento = rawExpiry;
  }

  const rawStatus = (input.estatus || 'Activa').trim();
  const matchedStatus = VALID_ACREDITACION_STATUSES.find(
    (s) => normalizeText(s) === normalizeText(rawStatus)
  );
  if (!matchedStatus) {
    return {
      valid: false,
      error: 'El estatus de acreditación seleccionado no es válido.',
    };
  }

  if (input.existingAccreditations) {
    const duplicate = input.existingAccreditations.some(
      (existing) =>
        existing.id !== input.id &&
        !existing.deleted_at &&
        existing.id_organismo === input.id_organismo &&
        normalizeText(existing.numero_acreditacion) === normalizeText(numeroAcreditacion)
    );
    if (duplicate) {
      return {
        valid: false,
        error: `Ya existe otra acreditación activa con el número "${numeroAcreditacion}" para este organismo.`,
      };
    }
  }

  return {
    valid: true,
    normalized: {
      numero_acreditacion: numeroAcreditacion,
      fecha_concesion: fechaConcesion,
      fecha_vencimiento: fechaVencimiento,
      estatus: matchedStatus,
    },
  };
}

/**
 * Formats the IAF sector scope label cleanly for cards, tables, and facets.
 */
export function formatAcreditacionSectorLabel(
  sectorNumero: number | null | undefined,
  sectorDescripcion?: string | null
): { shortLabel: string; detailLabel: string } {
  if (sectorNumero === null || sectorNumero === undefined || Number.isNaN(sectorNumero)) {
    return {
      shortLabel: ALL_SECTORS_LABEL,
      detailLabel: 'Cobertura multisectorial general',
    };
  }
  return {
    shortLabel: `Sector ${sectorNumero}`,
    detailLabel: sectorDescripcion || `Sector técnico IAF ${sectorNumero}`,
  };
}

/**
 * Returns the canonical facet option key for Sector IAF on an accreditation record.
 */
export function getAcreditacionSectorFacetValue(
  accreditation: Pick<AcreditacionDetailEntity, 'sector_numero'>
): string {
  if (
    accreditation.sector_numero === null ||
    accreditation.sector_numero === undefined ||
    Number.isNaN(accreditation.sector_numero)
  ) {
    return ALL_SECTORS_FACET_VALUE;
  }
  return String(accreditation.sector_numero);
}

/**
 * Visual styling helper for accreditation operational status badges.
 */
export function formatAcreditacionDirectoryStatusBadge(estatus: string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (normalizeText(estatus)) {
    case 'activa':
      return {
        label: 'Activa',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '✓',
      };
    case 'suspendida':
      return {
        label: 'Suspendida',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        symbol: '⏸',
      };
    case 'vencida':
      return {
        label: 'Vencida',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        symbol: '✕',
      };
    case 'en renovacion':
    default:
      return {
        label: estatus || 'En Renovación',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        symbol: '⏳',
      };
  }
}

/**
 * Visual styling helper for accreditation expiry indicator badges.
 */
export function formatAcreditacionExpiryBadge(
  evaluation: AcreditacionExpiryEvaluation
): {
  label: string;
  badgeClass: string;
} {
  switch (evaluation.state) {
    case 'Vigente':
      return {
        label:
          evaluation.daysRemaining !== null
            ? `Vigente (${evaluation.daysRemaining} d)`
            : 'Vigente',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'Por Vencer':
      return {
        label:
          evaluation.daysRemaining !== null
            ? `Por Vencer (${evaluation.daysRemaining} d)`
            : 'Por Vencer',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'Vencida':
      return {
        label:
          evaluation.daysRemaining !== null
            ? `Vencida (${Math.abs(evaluation.daysRemaining)} d)`
            : 'Vencida',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'Sin Vencimiento':
    default:
      return {
        label: 'Sin Vencimiento',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

/**
 * Maps Supabase relational rows from `acreditacion_norma_iaf` (joined with
 * `organismo_acreditacion`, `norma`, `sector_iaf`) into typed `AcreditacionDetailEntity[]`.
 * Filters out soft-deleted rows (`deleted_at != null`) and never exposes raw UUIDs in labels.
 */
export function mapSupabaseAcreditacionRows(
  rows: ReadonlyArray<SupabaseAcreditacionJoinRow>,
  lookups: {
    organismos?: ReadonlyArray<OrganismoAcreditacion>;
    normas?: ReadonlyArray<NormaEntity>;
    sectores?: ReadonlyArray<SectorIafEntity>;
    certificates?: ReadonlyArray<CertificateCoverageInput>;
  } = {}
): AcreditacionDetailEntity[] {
  const organismos = lookups.organismos ?? INITIAL_ORGANISMOS;
  const normas = lookups.normas ?? INITIAL_NORMAS;
  const sectores = lookups.sectores ?? INITIAL_SECTORES_IAF;
  const certificates = lookups.certificates ?? [];

  const result: AcreditacionDetailEntity[] = [];

  for (const row of rows) {
    if (row.deleted_at) continue;

    const id = typeof row.id === 'string' ? row.id : String(row.id || '');
    if (!id) continue;

    const orgJoin = row.organismo || null;
    const normaJoin = row.norma || null;
    const sectorJoin = row.sector_iaf || null;

    const idOrganismo = String(row.id_organismo || orgJoin?.id || '');
    const matchedOrg = organismos.find((o) => o.id === idOrganismo);

    const idNorma = String(row.id_norma || normaJoin?.id || '');
    const matchedNorma = normas.find((n) => n.id === idNorma);

    const rawSectorId = row.id_sector_iaf ?? sectorJoin?.id ?? null;
    const idSectorIaf = rawSectorId ? String(rawSectorId) : null;
    const matchedSector = idSectorIaf
      ? sectores.find((s) => s.id === idSectorIaf)
      : undefined;

    const sectorNumRaw = sectorJoin?.sector ?? matchedSector?.sector ?? null;
    const sectorNumero =
      sectorNumRaw !== null && sectorNumRaw !== undefined && !Number.isNaN(Number(sectorNumRaw))
        ? Number(sectorNumRaw)
        : null;

    const matchedSectorByNum =
      sectorNumero !== null
        ? INITIAL_SECTORES_IAF.find((s) => s.sector === sectorNumero)
        : undefined;

    const entity: AcreditacionDetailEntity = {
      id,
      id_organismo: idOrganismo,
      organismo_codigo: String(
        orgJoin?.codigo || matchedOrg?.codigo || 'ORG'
      ),
      organismo_nombre: String(
        orgJoin?.nombre || matchedOrg?.nombre || 'Organismo de Acreditación'
      ),
      organismo_pais: String(
        orgJoin?.pais || matchedOrg?.pais || 'Internacional'
      ),
      organismo_sitio_web:
        orgJoin?.sitio_web !== undefined && orgJoin.sitio_web !== null
          ? String(orgJoin.sitio_web)
          : matchedOrg?.sitio_web ?? null,
      id_norma: idNorma,
      norma_codigo: String(
        normaJoin?.codigo || normaJoin?.norma || matchedNorma?.codigo || 'ISO'
      ),
      norma_titulo: String(
        normaJoin?.titulo || matchedNorma?.titulo || normaJoin?.esquema || 'Sistema de Gestión'
      ),
      id_sector_iaf: idSectorIaf,
      sector_numero: sectorNumero,
      sector_descripcion:
        sectorNumero !== null
          ? matchedSector?.descripcion || matchedSectorByNum?.descripcion || `Sector IAF ${sectorNumero}`
          : null,
      numero_acreditacion: String(row.numero_acreditacion || 'SIN-CODIGO'),
      fecha_concesion: String(row.fecha_concesion || ''),
      fecha_vencimiento:
        row.fecha_vencimiento !== undefined && row.fecha_vencimiento !== null && String(row.fecha_vencimiento).trim() !== ''
          ? String(row.fecha_vencimiento)
          : null,
      estatus: normalizeAcreditacionStatus(
        typeof row.estatus === 'string' ? row.estatus : String(row.estatus || 'Activa')
      ),
      activeCertificatesCount: 0,
      deleted_at: null,
    };

    entity.activeCertificatesCount = computeActiveCertificatesCountForAccreditation(
      entity,
      certificates
    );
    result.push(entity);
  }

  return result;
}

/**
 * Builds the default fallback list of `AcreditacionDetailEntity[]` from the seeded catalogs.
 */
export function buildInitialAcreditacionEntities(
  certificates: ReadonlyArray<CertificateCoverageInput> = []
): AcreditacionDetailEntity[] {
  return INITIAL_ACREDITACIONES.map((acr) => {
    const org = INITIAL_ORGANISMOS.find((o) => o.id === acr.id_organismo);
    const norma = INITIAL_NORMAS.find((n) => n.id === acr.id_norma);
    const sector = acr.id_sector_iaf
      ? INITIAL_SECTORES_IAF.find((s) => s.id === acr.id_sector_iaf)
      : undefined;

    const entity: AcreditacionDetailEntity = {
      id: acr.id,
      id_organismo: acr.id_organismo,
      organismo_codigo: acr.organismo_codigo,
      organismo_nombre: acr.organismo_nombre,
      organismo_pais: acr.organismo_pais,
      organismo_sitio_web: org?.sitio_web ?? null,
      id_norma: acr.id_norma,
      norma_codigo: acr.norma_codigo,
      norma_titulo: norma?.titulo ?? 'Sistema de Gestión',
      id_sector_iaf: acr.id_sector_iaf ?? null,
      sector_numero: acr.sector_iaf_numero ?? sector?.sector ?? null,
      sector_descripcion: acr.sector_iaf_descripcion ?? sector?.descripcion ?? null,
      numero_acreditacion: acr.numero_acreditacion,
      fecha_concesion: acr.fecha_concesion,
      fecha_vencimiento: acr.fecha_vencimiento ?? null,
      estatus: normalizeAcreditacionStatus(acr.estatus),
      activeCertificatesCount: 0,
      deleted_at: null,
    };

    entity.activeCertificatesCount = computeActiveCertificatesCountForAccreditation(
      entity,
      certificates
    );
    return entity;
  });
}

/**
 * Converts an `AcreditacionDetailEntity` back to legacy `AcreditacionNormaIaf`
 * so `Norma` detail tabs and Dashboard counters remain synchronized.
 */
export function toLegacyAcreditacionNormaIaf(
  entity: AcreditacionDetailEntity
): AcreditacionNormaIaf {
  const legacyStatus: AcreditacionNormaIaf['estatus'] =
    entity.estatus === 'Suspendida' || entity.estatus === 'Vencida'
      ? 'Suspendida'
      : entity.estatus === 'En Renovación'
      ? 'En Renovación'
      : 'Activa';

  return {
    id: entity.id,
    id_organismo: entity.id_organismo,
    organismo_codigo: entity.organismo_codigo,
    organismo_nombre: entity.organismo_nombre,
    organismo_pais: entity.organismo_pais,
    id_norma: entity.id_norma,
    norma_codigo: entity.norma_codigo,
    id_sector_iaf: entity.id_sector_iaf ?? undefined,
    sector_iaf_numero: entity.sector_numero ?? undefined,
    sector_iaf_descripcion: entity.sector_descripcion ?? undefined,
    numero_acreditacion: entity.numero_acreditacion,
    fecha_concesion: entity.fecha_concesion,
    fecha_vencimiento: entity.fecha_vencimiento ?? undefined,
    estatus: legacyStatus,
  };
}
