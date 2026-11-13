/**
 * Phase 4.2.3: Proceso Domain Module (`proceso` + `requisitos_por_proceso` + `hallazgo` + `procesos_sitio_auditoria`)
 * Aligned with ISO/IEC 17021-1:2015, ISO 19011:2018, LTREE requirement hierarchy, and Zero-UUID presentation.
 */

import type { Phase5FindingEntity, ProgramacionAuditEntity } from './auditExecution';
import {
  INITIAL_REQUISITOS_LTREE,
  type RequisitoLtree,
} from './extraDomain';
import type {
  CertificadoDetailEntity,
  ProcesoTipo,
} from './multisiteSampling';
import { formatShiftTime } from './sitioDomain';

export const VALID_PROCESO_TIPOS: readonly ProcesoTipo[] = [
  'Estratégico',
  'Medular',
  'De Apoyo',
  'Otro',
] as const;

export interface ProcesoRequisitoLink {
  id_requisito: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ruta_materializada: string;
  nivel: number;
  id_norma: string;
  norma_codigo: string;
}

export interface ProcesoHallazgoLink {
  id: string;
  codigo_hallazgo: string;
  id_auditoria: string;
  codigo_auditoria: string;
  tipo: Phase5FindingEntity['tipo'];
  estado_ciclo: Phase5FindingEntity['estado_ciclo'];
  requisito_codigo: string;
  descripcion: string;
  cerrado: boolean;
}

export interface ProcesoAuditoriaLink {
  id_auditoria: string;
  codigo_auditoria: string;
  tipo_auditoria: string;
  metodologia: string;
  fecha_programacion: string;
  estatus: string;
  id_sitio: string | null;
  numero_sitio: number | null;
  nombre_sitio: string;
  id_turno: string | null;
  turno_label: string;
  hora_entrada?: string;
  hora_salida?: string;
}

export interface ProcesoDetailEntity {
  id: string;
  id_certificado: string;
  numero_certificado: string;
  certificado_estatus: string;
  id_norma: string;
  norma_codigo: string;
  norma_titulo: string;
  id_organizacion: string;
  organizacion_nombre: string;
  organizacion_rif: string;
  nombre_proceso: string;
  tipo: ProcesoTipo;
  responsable?: string;
  deleted_at: string | null;
  requisitos: ProcesoRequisitoLink[];
  hallazgos: ProcesoHallazgoLink[];
  auditorias: ProcesoAuditoriaLink[];
}

export interface ProcesoInputValidationParams {
  nombre_proceso: string;
  tipo: string;
  responsable?: string;
  id_certificado: string;
  currentProcesoId?: string;
  existingProcesses?: ReadonlyArray<{
    id: string;
    id_certificado: string;
    nombre_proceso: string;
    deleted_at?: string | null;
  }>;
}

export interface ProcesoInputValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    nombre_proceso: string;
    tipo: ProcesoTipo;
    responsable?: string;
  };
}

export interface ProcesoArchiveGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Supplemental LTREE requirements for standards seeded in `INITIAL_NORMAS` beyond ISO 9001:2015,
 * ensuring every certificate's Norma has valid LTREE clauses without mutating `INITIAL_REQUISITOS_LTREE`.
 */
export const SUPPLEMENTAL_NORMA_REQUISITOS_LTREE: RequisitoLtree[] = [
  {
    id: 'f1400100-0000-0000-0000-000000000041',
    id_norma: 'e0000000-0000-0000-0000-000000014001',
    norma_codigo: 'ISO 14001:2015',
    id_requisito_padre: null,
    codigo: '4.1',
    titulo: 'Comprensión de la organización y de su contexto ambiental',
    descripcion: 'Cuestiones externas e internas incluidas las condiciones ambientales.',
    ruta_materializada: '14001.4.4_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f1400100-0000-0000-0000-000000000061',
    id_norma: 'e0000000-0000-0000-0000-000000014001',
    norma_codigo: 'ISO 14001:2015',
    id_requisito_padre: null,
    codigo: '6.1',
    titulo: 'Acciones para abordar riesgos y oportunidades',
    descripcion: 'Aspectos ambientales significativos y requisitos legales aplicables.',
    ruta_materializada: '14001.6.6_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f1400100-0000-0000-0000-000000000081',
    id_norma: 'e0000000-0000-0000-0000-000000014001',
    norma_codigo: 'ISO 14001:2015',
    id_requisito_padre: null,
    codigo: '8.1',
    titulo: 'Planificación y control operacional ambiental',
    descripcion: 'Control de procesos contratados externamente y perspectiva del ciclo de vida.',
    ruta_materializada: '14001.8.8_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f4500100-0000-0000-0000-000000000061',
    id_norma: 'e0000000-0000-0000-0000-000000045001',
    norma_codigo: 'ISO 45001:2018',
    id_requisito_padre: null,
    codigo: '6.1',
    titulo: 'Acciones para determinar riesgos y oportunidades SST',
    descripcion: 'Identificación de peligros y evaluación de riesgos para la seguridad y salud.',
    ruta_materializada: '45001.6.6_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f4500100-0000-0000-0000-000000000081',
    id_norma: 'e0000000-0000-0000-0000-000000045001',
    norma_codigo: 'ISO 45001:2018',
    id_requisito_padre: null,
    codigo: '8.1',
    titulo: 'Control operacional y eliminación de peligros',
    descripcion: 'Jerarquía de controles y gestión del cambio en seguridad laboral.',
    ruta_materializada: '45001.8.8_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f4500100-0000-0000-0000-000000000082',
    id_norma: 'e0000000-0000-0000-0000-000000045001',
    norma_codigo: 'ISO 45001:2018',
    id_requisito_padre: null,
    codigo: '8.2',
    titulo: 'Preparación y respuesta ante emergencias',
    descripcion: 'Respuesta planificada a situaciones de emergencia industrial.',
    ruta_materializada: '45001.8.8_2',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f2700100-0000-0000-0000-000000000612',
    id_norma: 'e0000000-0000-0000-0000-000000027001',
    norma_codigo: 'ISO/IEC 27001:2022',
    id_requisito_padre: null,
    codigo: '6.1.2',
    titulo: 'Apreciación de riesgos de seguridad de la información',
    descripcion: 'Metodología de identificación, análisis y criterios de aceptación de riesgos.',
    ruta_materializada: '27001.6.6_1.6_1_2',
    nivel: 3,
    es_padre: false,
  },
  {
    id: 'f2700100-0000-0000-0000-000000000082',
    id_norma: 'e0000000-0000-0000-0000-000000027001',
    norma_codigo: 'ISO/IEC 27001:2022',
    id_requisito_padre: null,
    codigo: '8.2',
    titulo: 'Evaluación del riesgo de seguridad de la información',
    descripcion: 'Reevaluación periódica y ante cambios significativos en el SGSI.',
    ruta_materializada: '27001.8.8_2',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f2700100-0000-0000-0000-000000000091',
    id_norma: 'e0000000-0000-0000-0000-000000027001',
    norma_codigo: 'ISO/IEC 27001:2022',
    id_requisito_padre: null,
    codigo: '9.1',
    titulo: 'Seguimiento, medición, análisis y evaluación',
    descripcion: 'Evaluación del desempeño de la seguridad de la información y eficacia del SGSI.',
    ruta_materializada: '27001.9.9_1',
    nivel: 2,
    es_padre: false,
  },
];

export function getAllSeededNormaRequirements(): RequisitoLtree[] {
  return [...INITIAL_REQUISITOS_LTREE, ...SUPPLEMENTAL_NORMA_REQUISITOS_LTREE];
}

/**
 * Returns LTREE requirements scoped strictly to the parent certificate's Norma.
 */
export function getScopedNormaRequirements(params: {
  id_norma?: string;
  norma_codigo: string;
  requirementsCatalog?: ReadonlyArray<RequisitoLtree>;
}): RequisitoLtree[] {
  const { id_norma, norma_codigo, requirementsCatalog = getAllSeededNormaRequirements() } = params;
  const cleanNorma = (norma_codigo || '').trim().toLowerCase();
  const seenIds = new Set<string>();
  const matched: RequisitoLtree[] = [];

  for (const req of requirementsCatalog) {
    const matchesNormaId = Boolean(id_norma && req.id_norma === id_norma);
    const matchesNormaCode =
      Boolean(cleanNorma) && req.norma_codigo.trim().toLowerCase() === cleanNorma;
    if ((matchesNormaId || matchesNormaCode) && !seenIds.has(req.id)) {
      seenIds.add(req.id);
      matched.push(req);
    }
  }

  return matched.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
}

/**
 * Validates `proceso` attributes against schema constraints (`01_creacion.sql`):
 * - `nombre_proceso`: non-empty, 2..150 chars
 * - `tipo`: strictly in ('Estratégico', 'Medular', 'De Apoyo', 'Otro')
 * - uniqueness within active processes of the same certificate
 */
export function validateProcesoInput(
  params: ProcesoInputValidationParams
): ProcesoInputValidationResult {
  const nombreProceso = (params.nombre_proceso || '').trim();
  if (nombreProceso.length < 2) {
    return {
      valid: false,
      error: 'El nombre del proceso es obligatorio (mínimo 2 caracteres).',
    };
  }
  if (nombreProceso.length > 150) {
    return {
      valid: false,
      error: 'El nombre del proceso no puede superar los 150 caracteres.',
    };
  }

  const tipoRaw = (params.tipo || '').trim();
  if (!VALID_PROCESO_TIPOS.includes(tipoRaw as ProcesoTipo)) {
    return {
      valid: false,
      error:
        'La clasificación del proceso debe ser Estratégico, Medular, De Apoyo u Otro.',
    };
  }

  if (params.existingProcesses && params.existingProcesses.length > 0) {
    const normalizedName = nombreProceso.toLowerCase();
    const duplicate = params.existingProcesses.some(
      (p) =>
        !p.deleted_at &&
        p.id !== params.currentProcesoId &&
        p.id_certificado === params.id_certificado &&
        p.nombre_proceso.trim().toLowerCase() === normalizedName
    );
    if (duplicate) {
      return {
        valid: false,
        error: `Ya existe un proceso activo llamado "${nombreProceso}" en este certificado.`,
      };
    }
  }

  const responsable = params.responsable?.trim() || undefined;

  return {
    valid: true,
    normalized: {
      nombre_proceso: nombreProceso,
      tipo: tipoRaw as ProcesoTipo,
      responsable,
    },
  };
}

/**
 * Governance guard matching `get_archive_dependency_summary('proceso', ...)`:
 * Blocks archiving a process while active `hallazgo` or `procesos_sitio_auditoria` records exist.
 */
export function canArchiveProceso(params: {
  associatedHallazgosCount: number;
  associatedAuditoriasCount: number;
}): ProcesoArchiveGuardResult {
  if (params.associatedHallazgosCount > 0) {
    return {
      allowed: false,
      reason: `No se puede archivar este proceso porque tiene ${params.associatedHallazgosCount} hallazgo(s) activo(s) vinculado(s).`,
    };
  }
  if (params.associatedAuditoriasCount > 0) {
    return {
      allowed: false,
      reason: `No se puede archivar este proceso porque está vinculado a ${params.associatedAuditoriasCount} auditoría(s) programada(s).`,
    };
  }
  return { allowed: true };
}

/**
 * Resolves a full `ProcesoDetailEntity` joining `proceso`, `certificado`, `organizacion`,
 * `requisitos_por_proceso` + `requisito` (LTREE), `hallazgo`, and `procesos_sitio_auditoria`.
 */
export function resolveProcesoDetailById(params: {
  procesoId: string;
  certificates: ReadonlyArray<CertificadoDetailEntity>;
  programacionAudits: ReadonlyArray<ProgramacionAuditEntity>;
  phase5Findings: ReadonlyArray<Phase5FindingEntity>;
  requirementsCatalog?: ReadonlyArray<RequisitoLtree>;
  archivedProcesoIds?: ReadonlySet<string>;
}): ProcesoDetailEntity | null {
  const {
    procesoId,
    certificates,
    programacionAudits,
    phase5Findings,
    requirementsCatalog = getAllSeededNormaRequirements(),
    archivedProcesoIds,
  } = params;

  if (!procesoId || archivedProcesoIds?.has(procesoId)) {
    return null;
  }

  for (const cert of certificates) {
    const matchedProc = cert.procesos.find((p) => p.id === procesoId);
    if (!matchedProc) continue;

    const scopedReqs = getScopedNormaRequirements({
      id_norma: cert.id_norma,
      norma_codigo: cert.norma_codigo,
      requirementsCatalog,
    });

    // 1. Resolve LTREE requirements linked to this process
    const requisitos: ProcesoRequisitoLink[] = [];
    const seenCodes = new Set<string>();

    const detailsList = matchedProc.requisitos_detalle || [];
    for (const det of detailsList) {
      const cleanCode = det.codigo.trim();
      if (seenCodes.has(cleanCode)) continue;
      seenCodes.add(cleanCode);
      const ltreeMatch = scopedReqs.find(
        (r) => r.codigo.trim().toLowerCase() === cleanCode.toLowerCase()
      );
      requisitos.push({
        id_requisito: ltreeMatch?.id || `req-${cert.id_norma}-${cleanCode}`,
        codigo: ltreeMatch?.codigo || cleanCode,
        titulo: ltreeMatch?.titulo || det.titulo,
        descripcion: ltreeMatch?.descripcion,
        ruta_materializada:
          ltreeMatch?.ruta_materializada || cleanCode.replace(/\./g, '_'),
        nivel: ltreeMatch?.nivel ?? cleanCode.split('.').length,
        id_norma: ltreeMatch?.id_norma || cert.id_norma,
        norma_codigo: ltreeMatch?.norma_codigo || cert.norma_codigo,
      });
    }

    for (const code of matchedProc.clausulas_cubiertas || []) {
      const cleanCode = code.trim();
      if (!cleanCode || seenCodes.has(cleanCode)) continue;
      seenCodes.add(cleanCode);
      const ltreeMatch = scopedReqs.find(
        (r) => r.codigo.trim().toLowerCase() === cleanCode.toLowerCase()
      );
      requisitos.push({
        id_requisito: ltreeMatch?.id || `req-${cert.id_norma}-${cleanCode}`,
        codigo: ltreeMatch?.codigo || cleanCode,
        titulo: ltreeMatch?.titulo || `Cláusula ${cleanCode} (${cert.norma_codigo})`,
        descripcion: ltreeMatch?.descripcion,
        ruta_materializada:
          ltreeMatch?.ruta_materializada || cleanCode.replace(/\./g, '_'),
        nivel: ltreeMatch?.nivel ?? cleanCode.split('.').length,
        id_norma: ltreeMatch?.id_norma || cert.id_norma,
        norma_codigo: ltreeMatch?.norma_codigo || cert.norma_codigo,
      });
    }

    // 2. Resolve associated findings (`hallazgo`)
    const cleanProcName = matchedProc.nombre_proceso.trim().toLowerCase();
    const auditCodeLookup = new Map(
      programacionAudits.map((a) => [a.id, a.codigo_auditoria])
    );

    const hallazgos: ProcesoHallazgoLink[] = phase5Findings
      .filter(
        (f) =>
          f.id_proceso === matchedProc.id ||
          (f.numero_certificado === cert.numero_certificado &&
            f.proceso_nombre.trim().toLowerCase() === cleanProcName)
      )
      .map((f) => ({
        id: f.id,
        codigo_hallazgo: f.codigo_hallazgo,
        id_auditoria: f.id_auditoria,
        codigo_auditoria:
          auditCodeLookup.get(f.id_auditoria) ||
          cert.auditorias.find((a) => a.id === f.id_auditoria)?.codigo_auditoria ||
          'AUD-REG',
        tipo: f.tipo,
        estado_ciclo: f.estado_ciclo,
        requisito_codigo: f.requisito_codigo,
        descripcion: f.descripcion,
        cerrado: Boolean(f.cerrado || f.estado_ciclo === 'Cerrado'),
      }));

    // 3. Resolve scheduled audits evaluating this process (`procesos_sitio_auditoria`)
    const auditorias: ProcesoAuditoriaLink[] = [];
    const seenRowKeys = new Set<string>();

    const primaryShift = cert.turnos[0] || null;

    for (const audit of programacionAudits) {
      if (audit.id_certificado !== cert.id) continue;
      const matchesMatrix = audit.matrizNormativa.some(
        (item) => item.proceso_nombre.trim().toLowerCase() === cleanProcName
      );
      const matchesFinding = hallazgos.some((h) => h.id_auditoria === audit.id);
      if (!matchesMatrix && !matchesFinding) continue;

      const sitesForAudit =
        audit.sitiosMuestreo.length > 0
          ? audit.sitiosMuestreo
          : cert.sitios.map((s) => ({
              id: s.id,
              id_sitio: s.id,
              numero_sitio: s.numero_sitio,
              nombre_sitio: s.nombre_sitio,
              fecha_asignada: audit.fecha_inicio,
            }));

      for (const sm of sitesForAudit) {
        const matchedSite =
          cert.sitios.find(
            (s) => s.id === sm.id_sitio || s.numero_sitio === sm.numero_sitio
          ) || null;
        const matchedShift =
          cert.turnos.find((t) =>
            t.sitios_vinculados.some(
              (name) =>
                name.trim().toLowerCase() ===
                (matchedSite?.nombre_sitio || sm.nombre_sitio).trim().toLowerCase()
            )
          ) || primaryShift;

        const rowKey = `${audit.id}::${matchedSite?.id || sm.id_sitio || sm.nombre_sitio}::${matchedShift?.id || 'none'}`;
        if (seenRowKeys.has(rowKey)) continue;
        seenRowKeys.add(rowKey);

        auditorias.push({
          id_auditoria: audit.id,
          codigo_auditoria: audit.codigo_auditoria,
          tipo_auditoria: audit.tipo_auditoria,
          metodologia: audit.metodologia,
          fecha_programacion: sm.fecha_asignada || audit.fecha_inicio,
          estatus: audit.estatus,
          id_sitio: matchedSite?.id || sm.id_sitio || null,
          numero_sitio: matchedSite?.numero_sitio ?? sm.numero_sitio ?? null,
          nombre_sitio: matchedSite?.nombre_sitio || sm.nombre_sitio,
          id_turno: matchedShift?.id || null,
          turno_label: matchedShift
            ? `${formatShiftTime(matchedShift.hora_entrada)} – ${formatShiftTime(matchedShift.hora_salida)} · ${matchedShift.descripcion}`
            : 'Horario Operativo Estándar',
          hora_entrada: matchedShift?.hora_entrada,
          hora_salida: matchedShift?.hora_salida,
        });
      }
    }

    for (const certAud of cert.auditorias) {
      const alreadyHasAudit = auditorias.some((a) => a.id_auditoria === certAud.id);
      if (alreadyHasAudit) continue;
      const targetSite =
        cert.sitios.find((s) =>
          (certAud.sitios_alcance || []).some(
            (name) => name.trim().toLowerCase() === s.nombre_sitio.trim().toLowerCase()
          )
        ) || cert.sitios[0] || null;
      const targetShift =
        cert.turnos.find((t) =>
          targetSite
            ? t.sitios_vinculados.some(
                (name) =>
                  name.trim().toLowerCase() === targetSite.nombre_sitio.trim().toLowerCase()
              )
            : false
        ) || primaryShift;

      auditorias.push({
        id_auditoria: certAud.id,
        codigo_auditoria: certAud.codigo_auditoria,
        tipo_auditoria: certAud.tipo_auditoria,
        metodologia: certAud.metodologia,
        fecha_programacion: certAud.fecha_programacion,
        estatus: certAud.estatus,
        id_sitio: targetSite?.id || null,
        numero_sitio: targetSite?.numero_sitio ?? null,
        nombre_sitio: targetSite?.nombre_sitio || 'Sede Principal',
        id_turno: targetShift?.id || null,
        turno_label: targetShift
          ? `${formatShiftTime(targetShift.hora_entrada)} – ${formatShiftTime(targetShift.hora_salida)} · ${targetShift.descripcion}`
          : 'Horario Operativo Estándar',
        hora_entrada: targetShift?.hora_entrada,
        hora_salida: targetShift?.hora_salida,
      });
    }

    return {
      id: matchedProc.id,
      id_certificado: cert.id,
      numero_certificado: cert.numero_certificado,
      certificado_estatus: cert.estatus,
      id_norma: cert.id_norma,
      norma_codigo: cert.norma_codigo,
      norma_titulo: cert.norma_titulo,
      id_organizacion: cert.id_organizacion,
      organizacion_nombre: cert.organizacion_nombre,
      organizacion_rif: cert.organizacion_rif,
      nombre_proceso: matchedProc.nombre_proceso,
      tipo: matchedProc.tipo,
      responsable: matchedProc.responsable,
      deleted_at: null,
      requisitos,
      hallazgos,
      auditorias,
    };
  }

  return null;
}
