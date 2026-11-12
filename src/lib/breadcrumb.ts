import type { ActiveRoute, DomainRoute } from './healthCheck';

export interface BreadcrumbSegment {
  id: string;
  label: string;
  route: ActiveRoute;
  subview?: string | null;
  entityId?: string | null;
  tab?: string | null;
  tooltip?: string;
}

export const MAX_BREADCRUMB_CHAR_LENGTH = 24;

/**
 * Truncates breadcrumb segment labels exceeding 24 characters.
 * Returns truncated string with ellipsis and a flag indicating if truncation happened.
 */
export function truncateBreadcrumbLabel(
  label: string,
  maxLength: number = MAX_BREADCRUMB_CHAR_LENGTH
): { display: string; truncated: boolean } {
  if (!label || label.length <= maxLength) {
    return { display: label || '', truncated: false };
  }
  return {
    display: `${label.slice(0, maxLength - 1).trimEnd()}…`,
    truncated: true,
  };
}

/**
 * Resolves a human-friendly domain label.
 */
export function getDomainLabel(domain: DomainRoute): string {
  switch (domain) {
    case 'auditorias':
      return 'Auditorías';
    case 'certificacion':
      return 'Certificación';
    case 'extra':
      return 'Extra';
  }
}

/**
 * Resolves human-friendly subview labels for domains.
 */
export function getSubviewLabel(domain: DomainRoute, subview?: string | null): string {
  if (!subview) return getDomainLabel(domain);

  const subviewMap: Record<string, string> = {
    // Auditorías
    scheduling: 'Programación',
    calendar: 'Calendario',
    findings: 'Resultado',
    team: 'Equipo Auditor',
    scope: 'Alcance de Auditoría',

    // Certificación
    organizations: 'Organizaciones',
    certificates: 'Certificados',
    auditors: 'Auditores',
    drilldown: 'Drill-Down',
    sites: 'Sedes Multisitio',
    processes: 'Procesos',
    shifts: 'Turnos',

    // Extra
    standards: 'Normas ISO',
    iaf: 'Sectores IAF',
    estatus: 'Estatus',
    tipos: 'Tipos de Auditoría',
    metodologias: 'Metodologías',
    catalogs: 'Catálogos',
    requirements: 'Requisitos LTREE',
  };

  return subviewMap[subview] || subview;
}

/**
 * Creates the initial root breadcrumb for a given domain or route.
 * Always adheres to the Top Header Reset Rule.
 */
export function resetBreadcrumbToDomain(
  route: ActiveRoute,
  subview?: string | null
): BreadcrumbSegment[] {
  if (route === 'dashboard') {
    return [
      {
        id: 'dashboard',
        label: 'Inicio',
        route: 'dashboard',
        tooltip: 'Panel Principal de Certificación',
      },
    ];
  }

  if (route === 'approvals') {
    return [
      {
        id: 'approvals',
        label: 'Aprobaciones',
        route: 'approvals',
        tooltip: 'Gestión y aprobación de cuentas de usuario',
      },
    ];
  }

  if (route === 'database') {
    return [
      {
        id: 'database',
        label: 'Estado DB',
        route: 'database',
        tooltip: 'Salud y conectividad de base de datos Supabase',
      },
    ];
  }

  if (route === 'drilldown') {
    return [
      {
        id: 'certificacion',
        label: 'Certificación',
        route: 'certificacion',
        subview: 'organizations',
        tooltip: 'Dominio Certificación',
      },
      {
        id: 'drilldown-root',
        label: 'Drill-Down',
        route: 'drilldown',
        tooltip: 'Navegación jerárquica en profundidad',
      },
    ];
  }

  const domain = route as DomainRoute;
  const domainLabel = getDomainLabel(domain);

  if (!subview) {
    return [
      {
        id: `domain-${domain}`,
        label: domainLabel,
        route: domain,
        subview: null,
        tooltip: `Dominio ${domainLabel}`,
      },
    ];
  }

  const subLabel = getSubviewLabel(domain, subview);
  return [
    {
      id: `domain-${domain}`,
      label: domainLabel,
      route: domain,
      subview: null,
      tooltip: `Dominio ${domainLabel}`,
    },
    {
      id: `subview-${domain}-${subview}`,
      label: subLabel,
      route: domain,
      subview,
      tooltip: `${domainLabel} > ${subLabel}`,
    },
  ];
}

/**
 * Pushes a new segment onto the breadcrumb trail.
 * If the segment ID or entityId is already present in the trail, it automatically
 * backtracks to that position (idempotent backtracking).
 */
export function pushBreadcrumb(
  trail: BreadcrumbSegment[],
  segment: BreadcrumbSegment
): BreadcrumbSegment[] {
  const existingIdx = trail.findIndex(
    (s) => s.id === segment.id || (segment.entityId && s.entityId === segment.entityId)
  );

  if (existingIdx >= 0) {
    // Backtrack to existing segment and update label/metadata
    const updated = [...trail.slice(0, existingIdx + 1)];
    updated[existingIdx] = { ...updated[existingIdx], ...segment };
    return updated;
  }

  return [...trail, segment];
}

/**
 * Backtracks the trail up to and including the segment with the specified ID.
 */
export function popToBreadcrumb(
  trail: BreadcrumbSegment[],
  segmentId: string
): BreadcrumbSegment[] {
  const targetIdx = trail.findIndex((s) => s.id === segmentId);
  if (targetIdx === -1) {
    return trail;
  }
  return trail.slice(0, targetIdx + 1);
}

/**
 * Validates that no raw UUIDs (e.g. 8-4-4-4-12 hex) are exposed as breadcrumb labels.
 */
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export function containsRawUuid(text: string): boolean {
  return UUID_REGEX.test(text);
}
