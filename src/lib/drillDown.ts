export type FindingType =
  | 'NC_MAYOR'
  | 'NC_MENOR'
  | 'OBSERVACION'
  | 'OPORTUNIDAD_MEJORA';

export interface FindingRecord {
  id: string;
  id_auditoria: string;
  auditoria_tipo?: string;
  numero_certificado?: string;
  organizacion_nombre?: string;
  id_requisito: string;
  requisito_codigo: string;
  id_proceso: string;
  proceso_nombre: string;
  tipo: FindingType;
  descripcion: string;
  evidencia?: string | null;
  cerrado: boolean;
  created_at?: string;
}

export interface FindingStats {
  total: number;
  ncMayor: number;
  ncMenor: number;
  observaciones: number;
  oportunidadesMejora: number;
  abiertos: number;
  cerrados: number;
}

export interface FindingVisualMeta {
  label: string;
  symbol: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  description: string;
}

export interface DrillDownBreadcrumb {
  id: string;
  label: string;
  level: 'organizations' | 'organization' | 'certificate' | 'scope';
  active: boolean;
}

export function getFindingTypeMeta(type: FindingType | string): FindingVisualMeta {
  switch (type) {
    case 'NC_MAYOR':
      return {
        label: 'No Conformidad Mayor',
        symbol: '🚨',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        borderClass: 'border-l-4 border-l-rose-500',
        textClass: 'text-rose-800',
        description:
          'Incumplimiento total de un requisito normativo o ausencia de control que compromete la eficacia del sistema.',
      };
    case 'NC_MENOR':
      return {
        label: 'No Conformidad Menor',
        symbol: '⚠️',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        borderClass: 'border-l-4 border-l-amber-500',
        textClass: 'text-amber-800',
        description:
          'Incumplimiento puntual o aislado que no vulnera la integridad global del sistema de gestión evaluado.',
      };
    case 'OBSERVACION':
      return {
        label: 'Observación',
        symbol: '👁️',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        borderClass: 'border-l-4 border-l-blue-500',
        textClass: 'text-blue-800',
        description:
          'Situación que no constituye no conformidad pero requiere monitoreo para prevenir desviaciones futuras.',
      };
    case 'OPORTUNIDAD_MEJORA':
    default:
      return {
        label: 'Oportunidad de Mejora',
        symbol: '💡',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        borderClass: 'border-l-4 border-l-emerald-500',
        textClass: 'text-emerald-800',
        description:
          'Recomendación técnica orientada a optimizar el desempeño, robustez o madurez de los procesos evaluados.',
      };
  }
}

export function calculateFindingStats(findings: FindingRecord[]): FindingStats {
  const stats: FindingStats = {
    total: findings.length,
    ncMayor: 0,
    ncMenor: 0,
    observaciones: 0,
    oportunidadesMejora: 0,
    abiertos: 0,
    cerrados: 0,
  };

  for (const f of findings) {
    if (f.tipo === 'NC_MAYOR') stats.ncMayor += 1;
    else if (f.tipo === 'NC_MENOR') stats.ncMenor += 1;
    else if (f.tipo === 'OBSERVACION') stats.observaciones += 1;
    else if (f.tipo === 'OPORTUNIDAD_MEJORA') stats.oportunidadesMejora += 1;

    if (f.cerrado) stats.cerrados += 1;
    else stats.abiertos += 1;
  }

  return stats;
}

export function filterFindings(
  findings: FindingRecord[],
  filters: {
    type?: string;
    status?: 'all' | 'open' | 'closed';
    search?: string;
    auditId?: string;
  }
): FindingRecord[] {
  let result = findings;

  if (filters.auditId) {
    result = result.filter((f) => f.id_auditoria === filters.auditId);
  }

  if (filters.type && filters.type !== 'ALL') {
    result = result.filter((f) => f.tipo === filters.type);
  }

  if (filters.status && filters.status !== 'all') {
    const isClosed = filters.status === 'closed';
    result = result.filter((f) => f.cerrado === isClosed);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (f) =>
        f.descripcion.toLowerCase().includes(q) ||
        (f.evidencia && f.evidencia.toLowerCase().includes(q)) ||
        f.requisito_codigo.toLowerCase().includes(q) ||
        f.proceso_nombre.toLowerCase().includes(q) ||
        (f.numero_certificado && f.numero_certificado.toLowerCase().includes(q))
    );
  }

  return result;
}

export function validateFindingInput(data: {
  id_auditoria: string;
  id_requisito: string;
  id_proceso: string;
  tipo: string;
  descripcion: string;
}): { valid: boolean; error?: string } {
  if (!data.id_auditoria || data.id_auditoria.trim() === '') {
    return { valid: false, error: 'Debe seleccionar una auditoría de campo.' };
  }
  if (!data.id_requisito || data.id_requisito.trim() === '') {
    return { valid: false, error: 'Debe vincular el hallazgo a un requisito normativo.' };
  }
  if (!data.id_proceso || data.id_proceso.trim() === '') {
    return { valid: false, error: 'Debe asociar el hallazgo a un proceso auditado.' };
  }
  const validTypes: FindingType[] = ['NC_MAYOR', 'NC_MENOR', 'OBSERVACION', 'OPORTUNIDAD_MEJORA'];
  if (!validTypes.includes(data.tipo as FindingType)) {
    return { valid: false, error: 'Tipo de hallazgo inválido según ISO 19011:2018.' };
  }
  if (!data.descripcion || data.descripcion.trim().length < 5) {
    return { valid: false, error: 'La descripción del hallazgo debe contener al menos 5 caracteres.' };
  }

  return { valid: true };
}

export function validateAuditPlanningInput(data: {
  id_certificado: string;
  id_tipo_auditoria: string;
  id_metodologia: string;
  fecha_programacion: string;
}): { valid: boolean; error?: string } {
  if (!data.id_certificado || data.id_certificado.trim() === '') {
    return { valid: false, error: 'Debe seleccionar un certificado válido para la auditoría.' };
  }
  if (!data.id_tipo_auditoria || data.id_tipo_auditoria.trim() === '') {
    return { valid: false, error: 'Debe especificar la modalidad / tipo de auditoría (Etapa 1, 2, Vigilancia, etc.).' };
  }
  if (!data.id_metodologia || data.id_metodologia.trim() === '') {
    return { valid: false, error: 'Debe seleccionar una metodología (Presencial, Remota o Híbrida).' };
  }
  if (!data.fecha_programacion || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha_programacion)) {
    return { valid: false, error: 'La fecha programada debe tener un formato válido (AAAA-MM-DD).' };
  }

  return { valid: true };
}

export function isAuditorQualifiedForAudit(
  auditorStandards: string[],
  auditorIafSectors: number[],
  requiredStandard: string,
  requiredIafSector?: number
): { qualified: boolean; reason: string } {
  const normQualified = auditorStandards.some((norm) =>
    norm.toLowerCase().includes(requiredStandard.toLowerCase().split(':')[0])
  );

  if (!normQualified) {
    return {
      qualified: false,
      reason: `El auditor no posee acreditación vigente en la norma ${requiredStandard}.`,
    };
  }

  if (requiredIafSector !== undefined && !auditorIafSectors.includes(requiredIafSector)) {
    return {
      qualified: false,
      reason: `El auditor no está calificado en el sector IAF ${requiredIafSector}.`,
    };
  }

  return {
    qualified: true,
    reason: `Auditor calificado con competencias validadas en ${requiredStandard}${
      requiredIafSector ? ` y sector IAF ${requiredIafSector}` : ''
    }.`,
  };
}

export const INITIAL_FINDINGS: FindingRecord[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'RECERTIFICACION',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    tipo: 'NC_MENOR',
    descripcion: 'Descalibración en pie de rey en la línea 2 de fundición.',
    evidencia: 'Registro fotográfico de instrumento CAL-09 sin etiqueta de calibración vigente.',
    cerrado: false,
    created_at: '2024-11-20T10:30:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'RECERTIFICACION',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000041',
    requisito_codigo: '4.1',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    tipo: 'OBSERVACION',
    descripcion: 'La matriz FODA de contexto estratégico no incluye el impacto del nuevo marco tributario.',
    evidencia: 'Revisión documental del expediente PE-01 versión 3.',
    cerrado: true,
    created_at: '2024-11-20T14:15:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    id_auditoria: '80000000-0000-0000-0000-000000000001',
    auditoria_tipo: 'RECERTIFICACION',
    numero_certificado: 'FN-QMS-2024-001',
    organizacion_nombre: 'Iberometal Componentes S.A.',
    id_requisito: 'f0000000-0000-0000-0000-000000000085',
    requisito_codigo: '8.5',
    id_proceso: '60000000-0000-0000-0000-000000000001',
    proceso_nombre: 'Troquelado y Fundición',
    tipo: 'OPORTUNIDAD_MEJORA',
    descripcion: 'Se recomienda digitalizar las órdenes de trabajo manuales para trazabilidad en tiempo real.',
    evidencia: 'Entrevista con supervisor de planta durante el turno matutino.',
    cerrado: false,
    created_at: '2024-11-20T16:00:00Z',
  },
];
