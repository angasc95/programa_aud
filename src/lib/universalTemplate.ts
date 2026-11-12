export type SortDirection = 'asc' | 'desc' | 'none';

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface FacetGroup {
  id: string;
  label: string;
  options: FacetOption[];
}

export interface ColumnDefinition<T> {
  id: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  renderCell: (item: T) => string;
  getValue?: (item: T) => unknown;
}

/**
 * Cycles through sorting states: none -> asc -> desc -> none.
 */
export function cycleSortDirection(current: SortDirection): SortDirection {
  switch (current) {
    case 'none':
      return 'asc';
    case 'asc':
      return 'desc';
    case 'desc':
    default:
      return 'none';
  }
}

/**
 * Sorts an array of items deterministically based on column and direction.
 */
export function sortItems<T>(
  items: T[],
  column: string | null,
  direction: SortDirection,
  valueExtractor?: (item: T, column: string) => unknown
): T[] {
  if (!column || direction === 'none') {
    return [...items];
  }

  const multiplier = direction === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    let valA: unknown;
    let valB: unknown;

    if (valueExtractor) {
      valA = valueExtractor(a, column);
      valB = valueExtractor(b, column);
    } else {
      valA = (a as Record<string, unknown>)[column];
      valB = (b as Record<string, unknown>)[column];
    }

    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * multiplier;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    return strA.localeCompare(strB, 'es', { numeric: true }) * multiplier;
  });
}

/**
 * Computes counts for distinct facet values across items.
 */
export function calculateFacetCounts<T>(
  items: T[],
  valueExtractor: (item: T) => string | string[] | null | undefined
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const raw = valueExtractor(item);
    if (!raw) continue;

    if (Array.isArray(raw)) {
      for (const val of raw) {
        if (!val) continue;
        counts[val] = (counts[val] || 0) + 1;
      }
    } else {
      counts[raw] = (counts[raw] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Builds facet options sorted by count or alphabetical order.
 */
export function buildFacetOptions(
  allPossibleValues: string[],
  counts: Record<string, number>,
  selectedValue: string = 'ALL'
): FacetOption[] {
  return allPossibleValues.map((val) => ({
    value: val,
    label: val,
    count: counts[val] || 0,
    selected: selectedValue === val,
  }));
}

/**
 * Generates Excel-style column sort indicator icon / glyph.
 */
export function renderSortIndicator(direction: SortDirection): string {
  switch (direction) {
    case 'asc':
      return '▲';
    case 'desc':
      return '▼';
    case 'none':
    default:
      return '▲▼';
  }
}
