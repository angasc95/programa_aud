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

export type MultiViewSelectionMap = Record<string, Set<string>>;

export interface MultiViewFacetOptionSpec {
  value: string;
  label: string;
}

export interface MultiViewFacetCategory<T> {
  id: string;
  label: string;
  options?: ReadonlyArray<string | MultiViewFacetOptionSpec>;
  extractValues: (record: T) => string | readonly string[] | null | undefined;
  matchesOption?: (record: T, optionValue: string) => boolean;
}

export interface MultiViewSearchOptions<T> {
  getSearchableText?: (record: T) => string;
  matchesQuery?: (record: T, normalizedQuery: string) => boolean;
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
 * Normalizes strings for accent-insensitive, case-insensitive Multi View search matching.
 */
export function normalizeMultiViewSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function collectRecordPrimitiveStrings(value: unknown, bucket: string[], depth = 0): void {
  if (depth > 3 || value === null || value === undefined) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    bucket.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecordPrimitiveStrings(item, bucket, depth + 1);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectRecordPrimitiveStrings(entry, bucket, depth + 1);
    }
  }
}

/**
 * Checks whether a single record matches the normalized Multi View search query.
 */
export function recordMatchesQuery<T>(
  record: T,
  query: string,
  searchOptions?: MultiViewSearchOptions<T>
): boolean {
  const normalizedQuery = normalizeMultiViewSearchText(query);
  if (!normalizedQuery) return true;

  if (searchOptions?.matchesQuery) {
    return searchOptions.matchesQuery(record, normalizedQuery);
  }

  if (searchOptions?.getSearchableText) {
    return normalizeMultiViewSearchText(searchOptions.getSearchableText(record)).includes(
      normalizedQuery
    );
  }

  const bucket: string[] = [];
  collectRecordPrimitiveStrings(record, bucket);
  return normalizeMultiViewSearchText(bucket.join(' ')).includes(normalizedQuery);
}

function recordMatchesSingleOption<T>(
  record: T,
  facet: MultiViewFacetCategory<T>,
  optionValue: string
): boolean {
  if (facet.matchesOption) {
    return facet.matchesOption(record, optionValue);
  }
  const raw = facet.extractValues(record);
  if (raw === null || raw === undefined) return false;
  if (Array.isArray(raw)) {
    return raw.includes(optionValue);
  }
  return raw === optionValue;
}

/**
 * Evaluates intra-group OR union for a single facet category F_k.
 * An empty or undefined selection set means ALL (no restriction).
 */
export function recordMatchesFacetCategory<T>(
  record: T,
  facet: MultiViewFacetCategory<T>,
  selectedValues: ReadonlySet<string> | undefined
): boolean {
  if (!selectedValues || selectedValues.size === 0) {
    return true;
  }
  for (const val of selectedValues) {
    if (recordMatchesSingleOption(record, facet, val)) {
      return true;
    }
  }
  return false;
}

/**
 * Filters records applying:
 * - Intra-category OR union within each facet category F_k
 * - Inter-category AND intersection across all categories + search query
 */
export function filterRecordsWithFacets<T>(
  allRecords: readonly T[],
  query: string,
  facets: readonly MultiViewFacetCategory<T>[],
  selections: MultiViewSelectionMap,
  searchOptions?: MultiViewSearchOptions<T>
): T[] {
  return allRecords.filter((record) => {
    if (!recordMatchesQuery(record, query, searchOptions)) {
      return false;
    }
    for (const facet of facets) {
      if (!recordMatchesFacetCategory(record, facet, selections[facet.id])) {
        return false;
      }
    }
    return true;
  });
}

function resolveFacetOptionSpecs<T>(
  allRecords: readonly T[],
  facet: MultiViewFacetCategory<T>
): MultiViewFacetOptionSpec[] {
  if (facet.options && facet.options.length > 0) {
    return facet.options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : { value: opt.value, label: opt.label }
    );
  }

  const seen = new Set<string>();
  const discovered: MultiViewFacetOptionSpec[] = [];
  for (const record of allRecords) {
    const raw = facet.extractValues(record);
    if (!raw) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const val of values) {
      if (typeof val === 'string' && val && !seen.has(val)) {
        seen.add(val);
        discovered.push({ value: val, label: val });
      }
    }
  }
  return discovered;
}

/**
 * Computes reactive cross-filtered facet counts using rest-out subsets S_{-k}.
 * For each category F_k, S_{-k} applies `query` AND active selections in all
 * OTHER categories F_j (j != k), so siblings within F_k do not zero each other out.
 * Options with 0 matches remain included in the returned FacetGroup[] for muted display.
 */
export function computeReactiveFacetCounts<T>(
  allRecords: readonly T[],
  query: string,
  facets: readonly MultiViewFacetCategory<T>[],
  selections: MultiViewSelectionMap,
  searchOptions?: MultiViewSearchOptions<T>
): FacetGroup[] {
  return facets.map((targetFacet, targetIdx) => {
    const otherFacets = facets.filter((_, idx) => idx !== targetIdx);
    const subsetMinusK = filterRecordsWithFacets(
      allRecords,
      query,
      otherFacets,
      selections,
      searchOptions
    );
    const optionSpecs = resolveFacetOptionSpecs(allRecords, targetFacet);
    const selectedSet = selections[targetFacet.id];

    const options: FacetOption[] = optionSpecs.map((spec) => {
      let count = 0;
      for (const record of subsetMinusK) {
        if (recordMatchesSingleOption(record, targetFacet, spec.value)) {
          count += 1;
        }
      }
      return {
        value: spec.value,
        label: spec.label,
        count,
        selected: Boolean(selectedSet?.has(spec.value)),
      };
    });

    return {
      id: targetFacet.id,
      label: targetFacet.label,
      options,
    };
  });
}

/**
 * Immutably toggles a facet option value inside a MultiViewSelectionMap.
 */
export function toggleFacetSelection(
  selections: MultiViewSelectionMap,
  groupId: string,
  value: string
): MultiViewSelectionMap {
  const next: MultiViewSelectionMap = {};
  for (const [key, set] of Object.entries(selections)) {
    next[key] = new Set(set);
  }
  const groupSet = next[groupId] ? new Set(next[groupId]) : new Set<string>();
  if (groupSet.has(value)) {
    groupSet.delete(value);
  } else {
    groupSet.add(value);
  }
  next[groupId] = groupSet;
  return next;
}

/**
 * Returns a fresh empty MultiViewSelectionMap.
 */
export function clearFacetSelections(
  facets?: ReadonlyArray<{ id: string }>
): MultiViewSelectionMap {
  const next: MultiViewSelectionMap = {};
  if (facets) {
    for (const facet of facets) {
      next[facet.id] = new Set<string>();
    }
  }
  return next;
}

/**
 * Counts the total number of checked facet options across all categories.
 */
export function countActiveFacetSelections(selections: MultiViewSelectionMap): number {
  let total = 0;
  for (const set of Object.values(selections)) {
    total += set.size;
  }
  return total;
}

/**
 * Formats the standardized Multi View totalizer label: "Mostrando X de Y [entidades]".
 */
export function formatMultiViewTotalizer(
  filteredCount: number,
  totalCount: number,
  entityLabel: string = 'registros'
): string {
  return `Mostrando ${filteredCount} de ${totalCount} ${entityLabel}`;
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
