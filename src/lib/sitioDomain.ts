/**
 * Phase 4.2.2: Sitio Domain Module (`sitio` + `turnos_por_sitio` + `sitios_por_auditoria`)
 * Compliant with ISO/IEC 17021-1:2015, IAF MD 1:2018 (Site 0 HQ governance), and Zero-UUID presentation.
 */

import type { ProgramacionAuditEntity } from './auditExecution';
import type { CertificadoDetailEntity, SiteEntity } from './multisiteSampling';

export interface TurnoCatalogItem {
  id: string;
  hora_entrada: string;
  hora_salida: string;
  descripcion: string;
}

export interface SitioTurnoAssignment {
  id: string;
  id_sitio: string;
  id_turno: string;
  hora_entrada: string;
  hora_salida: string;
  descripcion: string;
  durationHoursLabel: string;
}

export interface SitioAuditoriaLink {
  id: string;
  codigo_auditoria: string;
  fecha_programacion: string;
  tipo_auditoria: string;
  metodologia: string;
  estatus: string;
  modalidad_evaluacion?: string;
}

export interface SitioDetailEntity {
  id: string;
  id_certificado: string;
  numero_certificado: string;
  multisitio: boolean;
  certificado_estatus: string;
  norma_codigo: string;
  id_organizacion: string;
  organizacion_nombre: string;
  organizacion_rif: string;
  numero_sitio: number;
  nombre_sitio: string;
  direccion_sitio: string;
  tipo_sitio?: SiteEntity['tipo_sitio'];
  personal_count?: number;
  actividades?: string;
  deleted_at: string | null;
  turnos: SitioTurnoAssignment[];
  auditorias: SitioAuditoriaLink[];
}

export interface SitioInputValidationParams {
  numero_sitio: number | string;
  nombre_sitio: string;
  direccion_sitio: string;
  id_certificado: string;
  currentSitioId?: string;
  existingSites?: ReadonlyArray<{
    id: string;
    id_certificado: string;
    numero_sitio: number;
    deleted_at?: string | null;
  }>;
}

export interface SitioInputValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    numero_sitio: number;
    nombre_sitio: string;
    direccion_sitio: string;
  };
}

export interface SitioArchiveGuardResult {
  allowed: boolean;
  reason?: string;
}

export const INITIAL_TURNO_CATALOG: TurnoCatalogItem[] = [
  {
    id: '70000000-0000-0000-0000-000000000001',
    hora_entrada: '07:00:00',
    hora_salida: '15:00:00',
    descripcion: 'Turno Matutino Operativo',
  },
  {
    id: '70000000-0000-0000-0000-000000000002',
    hora_entrada: '15:00:00',
    hora_salida: '23:00:00',
    descripcion: 'Turno Vespertino / Nocturno',
  },
  {
    id: '70000000-0000-0000-0000-000000000003',
    hora_entrada: '08:00:00',
    hora_salida: '17:00:00',
    descripcion: 'Turno Administrativo y Técnico',
  },
  {
    id: '70000000-0000-0000-0000-000000000004',
    hora_entrada: '06:00:00',
    hora_salida: '14:00:00',
    descripcion: 'Turno Rotativo 1 (Mañana)',
  },
  {
    id: '70000000-0000-0000-0000-000000000005',
    hora_entrada: '00:00:00',
    hora_salida: '08:00:00',
    descripcion: 'Turno Madrugada / Continuo',
  },
];

/**
 * Formats a database TIME string (`HH:MM:SS`) as concise `HH:MM`.
 */
export function formatShiftTime(rawTime: string | null | undefined): string {
  if (!rawTime) return '—';
  const match = /^(\d{1,2}):(\d{2})/.exec(rawTime.trim());
  if (!match) return rawTime;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function parseMinutesSinceMidnight(rawTime: string | null | undefined): number | null {
  if (!rawTime) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(rawTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Computes human-readable duration label for a shift, supporting overnight wraparound.
 */
export function computeShiftDurationLabel(
  horaEntrada: string | null | undefined,
  horaSalida: string | null | undefined
): string {
  const startMin = parseMinutesSinceMidnight(horaEntrada);
  const endMin = parseMinutesSinceMidnight(horaSalida);
  if (startMin === null || endMin === null) {
    return '—';
  }
  let diff = endMin - startMin;
  if (diff <= 0) {
    diff += 24 * 60;
  }
  const wholeHours = Math.floor(diff / 60);
  const remMinutes = diff % 60;
  if (remMinutes === 0) {
    return `${wholeHours} h`;
  }
  return `${wholeHours} h ${remMinutes} min`;
}

/**
 * Validates `sitio` create/edit payloads:
 * - `numero_sitio` must be an integer >= 0 (0 = Sede Principal HQ)
 * - `numero_sitio` must be unique within the same certificate among active sites
 * - `nombre_sitio` and `direccion_sitio` must be non-empty
 */
export function validateSitioInput(params: SitioInputValidationParams): SitioInputValidationResult {
  const rawNum =
    typeof params.numero_sitio === 'string' ? params.numero_sitio.trim() : params.numero_sitio;
  const parsedNum = Number(rawNum);

  if (
    rawNum === '' ||
    rawNum === null ||
    rawNum === undefined ||
    Number.isNaN(parsedNum) ||
    !Number.isInteger(parsedNum) ||
    parsedNum < 0
  ) {
    return {
      valid: false,
      error: 'El número de sitio debe ser un entero mayor o igual a 0 (0 corresponde a Sede Principal HQ).',
    };
  }

  const nombreSitio = (params.nombre_sitio || '').trim();
  if (nombreSitio.length < 2) {
    return {
      valid: false,
      error: 'El nombre de la sede es obligatorio (mínimo 2 caracteres).',
    };
  }

  const direccionSitio = (params.direccion_sitio || '').trim();
  if (direccionSitio.length < 5) {
    return {
      valid: false,
      error: 'La dirección física del sitio es obligatoria (mínimo 5 caracteres).',
    };
  }

  if (params.existingSites && params.existingSites.length > 0) {
    const duplicate = params.existingSites.some(
      (s) =>
        !s.deleted_at &&
        s.id !== params.currentSitioId &&
        s.id_certificado === params.id_certificado &&
        s.numero_sitio === parsedNum
    );
    if (duplicate) {
      return {
        valid: false,
        error: `Ya existe un sitio activo con el número ${parsedNum} dentro de este certificado.`,
      };
    }
  }

  return {
    valid: true,
    normalized: {
      numero_sitio: parsedNum,
      nombre_sitio: nombreSitio,
      direccion_sitio: direccionSitio,
    },
  };
}

/**
 * Governance rule (`get_archive_dependency_summary` + IAF MD 1):
 * - Blocks archiving `Sitio 0` (Sede Principal HQ) while active secondary sites (`numero_sitio > 0`) exist.
 * - Blocks archiving any site (including `Sitio 0`) while associated audits (`sitios_por_auditoria`) exist.
 */
export function canArchiveSitio(params: {
  site: Pick<SitioDetailEntity, 'id' | 'id_certificado' | 'numero_sitio'>;
  siblingSites: ReadonlyArray<{
    id: string;
    id_certificado: string;
    numero_sitio: number;
    deleted_at?: string | null;
  }>;
  associatedAuditsCount: number;
}): SitioArchiveGuardResult {
  const { site, siblingSites, associatedAuditsCount } = params;

  if (site.numero_sitio === 0) {
    const activeSecondaryCount = siblingSites.filter(
      (s) =>
        s.id !== site.id &&
        s.id_certificado === site.id_certificado &&
        !s.deleted_at &&
        s.numero_sitio > 0
    ).length;

    if (activeSecondaryCount > 0) {
      return {
        allowed: false,
        reason: `No se puede archivar la Sede Principal (Sitio 0) mientras existan ${activeSecondaryCount} sede(s) secundaria(s) activa(s) en este certificado.`,
      };
    }
  }

  if (associatedAuditsCount > 0) {
    return {
      allowed: false,
      reason: `No se puede archivar este sitio porque está vinculado a ${associatedAuditsCount} auditoría(s) registrada(s).`,
    };
  }

  return { allowed: true };
}

/**
 * Resolves a complete `SitioDetailEntity` by ID from reactive certificates,
 * audit schedules, and shift catalog entries.
 */
export function resolveSitioDetailById(params: {
  sitioId: string;
  certificates: ReadonlyArray<CertificadoDetailEntity>;
  programacionAudits: ReadonlyArray<ProgramacionAuditEntity>;
  shiftCatalog?: ReadonlyArray<TurnoCatalogItem>;
  archivedSiteIds?: ReadonlySet<string>;
}): SitioDetailEntity | null {
  const {
    sitioId,
    certificates,
    programacionAudits,
    shiftCatalog = INITIAL_TURNO_CATALOG,
    archivedSiteIds,
  } = params;

  if (!sitioId || archivedSiteIds?.has(sitioId)) {
    return null;
  }

  for (const cert of certificates) {
    const matchedSite = cert.sitios.find((s) => s.id === sitioId);
    if (!matchedSite) continue;

    // Resolve operational shift assignments for this site
    const assignments: SitioTurnoAssignment[] = [];
    const addedTurnoIds = new Set<string>();

    const linkedLabels = matchedSite.turnos_vinculados || [];
    for (const label of linkedLabels) {
      const cleanLabel = label.trim().toLowerCase();
      const fromCertShift = cert.turnos.find(
        (t) =>
          t.descripcion.trim().toLowerCase() === cleanLabel ||
          t.id === label
      );
      const fromCatalog = shiftCatalog.find(
        (t) =>
          t.descripcion.trim().toLowerCase() === cleanLabel ||
          t.id === label
      );
      const resolved = fromCertShift || fromCatalog;
      if (resolved && !addedTurnoIds.has(resolved.id)) {
        addedTurnoIds.add(resolved.id);
        assignments.push({
          id: `${matchedSite.id}::${resolved.id}`,
          id_sitio: matchedSite.id,
          id_turno: resolved.id,
          hora_entrada: resolved.hora_entrada,
          hora_salida: resolved.hora_salida,
          descripcion: resolved.descripcion,
          durationHoursLabel: computeShiftDurationLabel(
            resolved.hora_entrada,
            resolved.hora_salida
          ),
        });
      }
    }

    // Fallback: also include certificate shifts mentioning site name
    for (const certShift of cert.turnos) {
      if (addedTurnoIds.has(certShift.id)) continue;
      const matchesSiteName = (certShift.sitios_vinculados || []).some(
        (name) => name.trim().toLowerCase() === matchedSite.nombre_sitio.trim().toLowerCase()
      );
      if (matchesSiteName) {
        addedTurnoIds.add(certShift.id);
        assignments.push({
          id: `${matchedSite.id}::${certShift.id}`,
          id_sitio: matchedSite.id,
          id_turno: certShift.id,
          hora_entrada: certShift.hora_entrada,
          hora_salida: certShift.hora_salida,
          descripcion: certShift.descripcion,
          durationHoursLabel: computeShiftDurationLabel(
            certShift.hora_entrada,
            certShift.hora_salida
          ),
        });
      }
    }

    // Resolve audits linked to this site from Programación and Certificate fallback
    const audits: SitioAuditoriaLink[] = [];
    const seenAuditIds = new Set<string>();

    for (const audit of programacionAudits) {
      if (audit.id_certificado !== cert.id) continue;
      const siteSampling = audit.sitiosMuestreo.find(
        (sm) =>
          sm.id_sitio === matchedSite.id ||
          sm.numero_sitio === matchedSite.numero_sitio
      );
      if (siteSampling) {
        seenAuditIds.add(audit.id);
        audits.push({
          id: audit.id,
          codigo_auditoria: audit.codigo_auditoria,
          fecha_programacion: siteSampling.fecha_asignada || audit.fecha_inicio,
          tipo_auditoria: audit.tipo_auditoria,
          metodologia: audit.metodologia,
          estatus: audit.estatus,
          modalidad_evaluacion: siteSampling.modalidad_evaluacion,
        });
      }
    }

    for (const certAudit of cert.auditorias) {
      if (seenAuditIds.has(certAudit.id)) continue;
      const includedByName =
        !certAudit.sitios_alcance ||
        certAudit.sitios_alcance.length === 0 ||
        certAudit.sitios_alcance.some(
          (name) => name.trim().toLowerCase() === matchedSite.nombre_sitio.trim().toLowerCase()
        );
      if (includedByName) {
        seenAuditIds.add(certAudit.id);
        audits.push({
          id: certAudit.id,
          codigo_auditoria: certAudit.codigo_auditoria,
          fecha_programacion: certAudit.fecha_programacion,
          tipo_auditoria: certAudit.tipo_auditoria,
          metodologia: certAudit.metodologia,
          estatus: certAudit.estatus,
        });
      }
    }

    return {
      id: matchedSite.id,
      id_certificado: cert.id,
      numero_certificado: cert.numero_certificado,
      multisitio: cert.multisitio,
      certificado_estatus: cert.estatus,
      norma_codigo: cert.norma_codigo,
      id_organizacion: cert.id_organizacion,
      organizacion_nombre: cert.organizacion_nombre,
      organizacion_rif: cert.organizacion_rif,
      numero_sitio: matchedSite.numero_sitio,
      nombre_sitio: matchedSite.nombre_sitio,
      direccion_sitio: matchedSite.direccion_sitio,
      tipo_sitio: matchedSite.tipo_sitio,
      personal_count: matchedSite.personal_count,
      actividades: matchedSite.actividades,
      deleted_at: null,
      turnos: assignments,
      auditorias: audits,
    };
  }

  return null;
}
