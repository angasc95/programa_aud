/**
 * Phase 4.2.3: Turno Domain Module (`turno` + `turnos_por_sitio` + `turnos_sitio_auditoria`)
 * Supports overnight shift duration calculation, reciprocal Sitio drill-down, and shift audits.
 */

import type { ProgramacionAuditEntity } from './auditExecution';
import type { CertificadoDetailEntity } from './multisiteSampling';
import {
  INITIAL_TURNO_CATALOG,
  formatShiftTime,
  type TurnoCatalogItem,
} from './sitioDomain';

export interface TurnoSitioLink {
  id_sitio: string;
  numero_sitio: number;
  nombre_sitio: string;
  direccion_sitio: string;
  id_certificado: string;
  numero_certificado: string;
  norma_codigo: string;
  id_organizacion: string;
  organizacion_nombre: string;
}

export interface TurnoAuditoriaLink {
  id_auditoria: string;
  codigo_auditoria: string;
  tipo_auditoria: string;
  metodologia: string;
  fecha_programacion: string;
  estatus: string;
  id_sitio: string | null;
  numero_sitio: number | null;
  nombre_sitio: string;
  id_certificado: string;
  numero_certificado: string;
}

export interface TurnoParentSitioContext {
  id_sitio: string;
  numero_sitio: number;
  nombre_sitio: string;
  id_certificado: string;
  numero_certificado: string;
  norma_codigo: string;
}

export interface TurnoDetailEntity {
  id: string;
  hora_entrada: string;
  hora_salida: string;
  descripcion: string;
  durationLabel: string;
  isOvernight: boolean;
  deleted_at: string | null;
  parentSitio: TurnoParentSitioContext | null;
  sitios: TurnoSitioLink[];
  auditorias: TurnoAuditoriaLink[];
}

export interface TurnoInputValidationParams {
  hora_entrada: string;
  hora_salida: string;
  descripcion?: string;
}

export interface TurnoInputValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    hora_entrada: string;
    hora_salida: string;
    descripcion: string;
    durationLabel: string;
  };
}

export interface TurnoArchiveGuardResult {
  allowed: boolean;
  reason?: string;
}

function parseMinutes(rawTime: string | null | undefined): number | null {
  if (!rawTime) return null;
  const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(rawTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/**
 * Formats shift time as `HH:MM`.
 */
export function formatTurnoTime(rawTime: string | null | undefined): string {
  return formatShiftTime(rawTime);
}

/**
 * Normalizes a valid `HH:MM` or `HH:MM:SS` input into PostgreSQL `TIME` string `HH:MM:00`.
 */
export function normalizeTurnoTimeForDb(rawTime: string): string {
  const formatted = formatTurnoTime(rawTime);
  if (/^\d{2}:\d{2}$/.test(formatted)) {
    return `${formatted}:00`;
  }
  return rawTime.trim();
}

/**
 * Calculates shift duration in `"Xh XXm"` format, appending `" (nocturno)"`
 * when the shift wraps past midnight (`endMin <= startMin`, e.g. `22:00` → `06:00` = `"8h 00m (nocturno)"`).
 */
export function computeShiftDurationLabel(
  horaEntrada: string | null | undefined,
  horaSalida: string | null | undefined
): string {
  const startMin = parseMinutes(horaEntrada);
  const endMin = parseMinutes(horaSalida);
  if (startMin === null || endMin === null) {
    return '—';
  }
  const isOvernight = endMin <= startMin;
  const diff = isOvernight ? endMin - startMin + 24 * 60 : endMin - startMin;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  const base = `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return isOvernight ? `${base} (nocturno)` : base;
}

export function isOvernightShift(
  horaEntrada: string | null | undefined,
  horaSalida: string | null | undefined
): boolean {
  const startMin = parseMinutes(horaEntrada);
  const endMin = parseMinutes(horaSalida);
  if (startMin === null || endMin === null) return false;
  return endMin <= startMin;
}

/**
 * Validates shift schedule attributes (`hora_entrada` and `hora_salida` valid `HH:MM` and unequal).
 */
export function validateTurnoInput(
  params: TurnoInputValidationParams
): TurnoInputValidationResult {
  const startFormatted = formatTurnoTime(params.hora_entrada);
  const endFormatted = formatTurnoTime(params.hora_salida);

  if (parseMinutes(params.hora_entrada) === null) {
    return {
      valid: false,
      error: 'La hora de entrada debe tener formato válido HH:MM (ej. 07:00).',
    };
  }
  if (parseMinutes(params.hora_salida) === null) {
    return {
      valid: false,
      error: 'La hora de salida debe tener formato válido HH:MM (ej. 15:00).',
    };
  }
  if (startFormatted === endFormatted) {
    return {
      valid: false,
      error: 'La hora de salida debe ser distinta a la hora de entrada.',
    };
  }

  const descripcion = (params.descripcion || '').trim() || `Turno ${startFormatted} – ${endFormatted}`;

  return {
    valid: true,
    normalized: {
      hora_entrada: normalizeTurnoTimeForDb(startFormatted),
      hora_salida: normalizeTurnoTimeForDb(endFormatted),
      descripcion,
      durationLabel: computeShiftDurationLabel(startFormatted, endFormatted),
    },
  };
}

/**
 * Governance guard matching `get_archive_dependency_summary('turno', ...)`:
 * Blocks archiving a shift while active `turnos_por_sitio` links exist.
 */
export function canArchiveTurno(params: {
  assignedSitiosCount: number;
}): TurnoArchiveGuardResult {
  if (params.assignedSitiosCount > 0) {
    return {
      allowed: false,
      reason: `No se puede archivar este turno porque está asignado a ${params.assignedSitiosCount} sede(s) operativa(s). Desvincúlelo primero de las sedes.`,
    };
  }
  return { allowed: true };
}

/**
 * Resolves a `TurnoDetailEntity` by ID, joining all operating sites (`turnos_por_sitio`)
 * and scheduled audits (`turnos_sitio_auditoria`).
 * Populates `parentSitio` ONLY when `originatingSitioId` is provided and resolves cleanly.
 */
export function resolveTurnoDetailById(params: {
  turnoId: string;
  originatingSitioId?: string | null;
  certificates: ReadonlyArray<CertificadoDetailEntity>;
  programacionAudits: ReadonlyArray<ProgramacionAuditEntity>;
  shiftCatalog?: ReadonlyArray<TurnoCatalogItem>;
  archivedSiteIds?: ReadonlySet<string>;
  archivedTurnoIds?: ReadonlySet<string>;
}): TurnoDetailEntity | null {
  const {
    turnoId,
    originatingSitioId,
    certificates,
    programacionAudits,
    shiftCatalog = INITIAL_TURNO_CATALOG,
    archivedSiteIds,
    archivedTurnoIds,
  } = params;

  if (!turnoId || archivedTurnoIds?.has(turnoId)) {
    return null;
  }

  // Locate shift definition from catalog or certificate shift entries
  let baseShift: { id: string; hora_entrada: string; hora_salida: string; descripcion: string } | null =
    shiftCatalog.find((t) => t.id === turnoId) || null;

  if (!baseShift) {
    for (const cert of certificates) {
      const found = cert.turnos.find((t) => t.id === turnoId);
      if (found) {
        baseShift = {
          id: found.id,
          hora_entrada: found.hora_entrada,
          hora_salida: found.hora_salida,
          descripcion: found.descripcion,
        };
        break;
      }
    }
  }

  if (!baseShift) {
    return null;
  }

  const cleanShiftDesc = baseShift.descripcion.trim().toLowerCase();

  // Resolve all operating sites linked to this shift across active certificates
  const sitios: TurnoSitioLink[] = [];
  const seenSitioIds = new Set<string>();

  for (const cert of certificates) {
    const certHasShift = cert.turnos.some((t) => t.id === baseShift!.id);
    const certShiftEntry = cert.turnos.find((t) => t.id === baseShift!.id) || null;

    for (const site of cert.sitios) {
      if (archivedSiteIds?.has(site.id)) continue;
      if (seenSitioIds.has(site.id)) continue;

      const linkedInSiteLabels = (site.turnos_vinculados || []).some(
        (lbl) => lbl.trim().toLowerCase() === cleanShiftDesc || lbl === baseShift!.id
      );
      const linkedInCertShift =
        certHasShift &&
        (certShiftEntry?.sitios_vinculados || []).some(
          (name) => name.trim().toLowerCase() === site.nombre_sitio.trim().toLowerCase()
        );

      if (linkedInSiteLabels || linkedInCertShift) {
        seenSitioIds.add(site.id);
        sitios.push({
          id_sitio: site.id,
          numero_sitio: site.numero_sitio,
          nombre_sitio: site.nombre_sitio,
          direccion_sitio: site.direccion_sitio,
          id_certificado: cert.id,
          numero_certificado: cert.numero_certificado,
          norma_codigo: cert.norma_codigo,
          id_organizacion: cert.id_organizacion,
          organizacion_nombre: cert.organizacion_nombre,
        });
      }
    }
  }

  // Contextual parent Sitio ONLY when navigated from a specific Sitio
  let parentSitio: TurnoParentSitioContext | null = null;
  if (originatingSitioId && !archivedSiteIds?.has(originatingSitioId)) {
    for (const cert of certificates) {
      const site = cert.sitios.find((s) => s.id === originatingSitioId);
      if (site) {
        parentSitio = {
          id_sitio: site.id,
          numero_sitio: site.numero_sitio,
          nombre_sitio: site.nombre_sitio,
          id_certificado: cert.id,
          numero_certificado: cert.numero_certificado,
          norma_codigo: cert.norma_codigo,
        };
        break;
      }
    }
  }

  // Resolve audits evaluating sites with this shift
  const auditorias: TurnoAuditoriaLink[] = [];
  const seenAuditSiteKeys = new Set<string>();

  for (const audit of programacionAudits) {
    const matchingSites = audit.sitiosMuestreo.filter((sm) =>
      sitios.some(
        (linkedSite) =>
          linkedSite.id_certificado === audit.id_certificado &&
          (linkedSite.id_sitio === sm.id_sitio || linkedSite.numero_sitio === sm.numero_sitio)
      )
    );
    for (const sm of matchingSites) {
      const matchedSite = sitios.find(
        (s) =>
          s.id_certificado === audit.id_certificado &&
          (s.id_sitio === sm.id_sitio || s.numero_sitio === sm.numero_sitio)
      );
      if (!matchedSite) continue;
      const key = `${audit.id}::${matchedSite.id_sitio}`;
      if (seenAuditSiteKeys.has(key)) continue;
      seenAuditSiteKeys.add(key);
      auditorias.push({
        id_auditoria: audit.id,
        codigo_auditoria: audit.codigo_auditoria,
        tipo_auditoria: audit.tipo_auditoria,
        metodologia: audit.metodologia,
        fecha_programacion: sm.fecha_asignada || audit.fecha_inicio,
        estatus: audit.estatus,
        id_sitio: matchedSite.id_sitio,
        numero_sitio: matchedSite.numero_sitio,
        nombre_sitio: matchedSite.nombre_sitio,
        id_certificado: audit.id_certificado,
        numero_certificado: audit.numero_certificado,
      });
    }
  }

  for (const cert of certificates) {
    for (const certAud of cert.auditorias) {
      const matchingCertSites = sitios.filter(
        (s) =>
          s.id_certificado === cert.id &&
          (!certAud.sitios_alcance ||
            certAud.sitios_alcance.length === 0 ||
            certAud.sitios_alcance.some(
              (lbl) => lbl.trim().toLowerCase() === s.nombre_sitio.trim().toLowerCase()
            ))
      );
      for (const matchedSite of matchingCertSites) {
        const key = `${certAud.id}::${matchedSite.id_sitio}`;
        if (seenAuditSiteKeys.has(key)) continue;
        seenAuditSiteKeys.add(key);
        auditorias.push({
          id_auditoria: certAud.id,
          codigo_auditoria: certAud.codigo_auditoria,
          tipo_auditoria: certAud.tipo_auditoria,
          metodologia: certAud.metodologia,
          fecha_programacion: certAud.fecha_programacion,
          estatus: certAud.estatus,
          id_sitio: matchedSite.id_sitio,
          numero_sitio: matchedSite.numero_sitio,
          nombre_sitio: matchedSite.nombre_sitio,
          id_certificado: cert.id,
          numero_certificado: cert.numero_certificado,
        });
      }
    }
  }

  return {
    id: baseShift.id,
    hora_entrada: baseShift.hora_entrada,
    hora_salida: baseShift.hora_salida,
    descripcion: baseShift.descripcion,
    durationLabel: computeShiftDurationLabel(baseShift.hora_entrada, baseShift.hora_salida),
    isOvernight: isOvernightShift(baseShift.hora_entrada, baseShift.hora_salida),
    deleted_at: null,
    parentSitio,
    sitios,
    auditorias,
  };
}
