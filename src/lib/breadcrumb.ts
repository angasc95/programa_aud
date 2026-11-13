import type { ActiveRoute, DomainRoute } from './healthCheck';

export type BreadcrumbEntityType =
  | 'org'
  | 'cert'
  | 'sitio'
  | 'proceso'
  | 'turno'
  | 'auditor'
  | 'audit'
  | 'norma'
  | 'sector_iaf'
  | 'accreditation'
  | 'estatus'
  | 'tipo'
  | 'metodologia';

export interface BreadcrumbSegment {
  id: string;
  label: string;
  route: ActiveRoute;
  subview?: string | null;
  entityType?: BreadcrumbEntityType | null;
  entityId?: string | null;
  tab?: string | null;
  tooltip?: string;
}

export type CollapsedBreadcrumbItem =
  | { kind: 'segment'; segment: BreadcrumbSegment; index: number }
  | {
      kind: 'ellipsis';
      hiddenSegments: BreadcrumbSegment[];
      backtrackSegmentId: string;
      tooltip: string;
    };

export const MAX_BREADCRUMB_CHAR_LENGTH = 24;
export const MAX_VISIBLE_BREADCRUMBS = 4;

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
      return 'Auditoría';
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
    // Auditoría
    scheduling: 'Programación',
    calendar: 'Calendario',
    findings: 'Resultado',

    // Certificación
    organizations: 'Organización',
    certificates: 'Certificado',
    auditors: 'Auditor',

    // Extra
    standards: 'Norma',
    iaf: 'Sector IAF',
    accreditations: 'Acreditación',
    estatus: 'Estatus',
    tipos: 'Tipo',
    metodologias: 'Metodología',
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

  if (route === 'profile') {
    return [
      {
        id: 'profile',
        label: 'Perfil',
        route: 'profile',
        tooltip: 'Perfil de cuenta y preferencias del usuario',
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
 * Pushes a new segment onto the breadcrumb trail with composite loop prevention.
 * Two segments represent the same visited node if:
 * - `s.id === segment.id`, OR
 * - `segment.entityId != null && s.entityId === segment.entityId` within the same
 *   `(entityType ?? subview ?? route)` scope.
 * On match, truncates cleanly back to that ancestor and refreshes its metadata.
 */
export function pushBreadcrumb(
  trail: BreadcrumbSegment[],
  segment: BreadcrumbSegment
): BreadcrumbSegment[] {
  const existingIdx = trail.findIndex((s) => {
    if (s.id === segment.id) return true;
    if (segment.entityId != null && s.entityId === segment.entityId) {
      const sameEntityType = (s.entityType ?? null) === (segment.entityType ?? null);
      const sameViewScope = (s.subview ?? s.route) === (segment.subview ?? segment.route);
      return sameEntityType && sameViewScope;
    }
    return false;
  });

  if (existingIdx >= 0) {
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
 * Pops the current active leaf segment and returns the updated trail plus the
 * immediate parent target segment (used by in-page "← Volver" actions).
 */
export function popToParentBreadcrumb(trail: BreadcrumbSegment[]): {
  trail: BreadcrumbSegment[];
  target: BreadcrumbSegment | null;
} {
  if (!trail || trail.length === 0) {
    return { trail: [], target: null };
  }
  if (trail.length === 1) {
    return { trail, target: trail[0] };
  }
  const nextTrail = trail.slice(0, trail.length - 1);
  return {
    trail: nextTrail,
    target: nextTrail[nextTrail.length - 1] ?? null,
  };
}

/**
 * Collapses long breadcrumb trails (> 4 segments) into:
 * [root (index 0), ellipsis (hidden 1..n-3), penultimate (n-2), active leaf (n-1)].
 * Clicking the ellipsis backtracks to the deepest hidden ancestor (n-3).
 */
export function collapseBreadcrumbForDisplay(
  trail: BreadcrumbSegment[],
  maxVisible: number = MAX_VISIBLE_BREADCRUMBS
): CollapsedBreadcrumbItem[] {
  if (!trail || trail.length === 0) {
    return [];
  }
  if (trail.length <= maxVisible) {
    return trail.map((segment, index) => ({ kind: 'segment', segment, index }));
  }

  const hiddenSegments = trail.slice(1, trail.length - 2);
  const deepestHidden = hiddenSegments[hiddenSegments.length - 1];
  const tooltip = hiddenSegments
    .map((s) => s.tooltip || s.label)
    .filter(Boolean)
    .join(' › ');

  return [
    { kind: 'segment', segment: trail[0], index: 0 },
    {
      kind: 'ellipsis',
      hiddenSegments,
      backtrackSegmentId: deepestHidden.id,
      tooltip,
    },
    { kind: 'segment', segment: trail[trail.length - 2], index: trail.length - 2 },
    { kind: 'segment', segment: trail[trail.length - 1], index: trail.length - 1 },
  ];
}

/**
 * Validates that no raw UUIDs (e.g. 8-4-4-4-12 hex) are exposed as breadcrumb labels.
 */
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export function containsRawUuid(text: string): boolean {
  return UUID_REGEX.test(text);
}
