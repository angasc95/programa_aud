import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cycleSortDirection,
  sortItems,
  calculateFacetCounts,
  buildFacetOptions,
  renderSortIndicator,
  filterRecordsWithFacets,
  computeReactiveFacetCounts,
  toggleFacetSelection,
  clearFacetSelections,
  countActiveFacetSelections,
  formatMultiViewTotalizer,
  resolveColumnWidthPercentages,
  resizeAdjacentColumns,
  type MultiViewFacetCategory,
  type MultiViewSelectionMap,
} from './universalTemplate';
import { renderListViewTable, renderUniversalTemplate } from '../views/universalTemplate';
import { renderSearchControls } from '../views/searchControlsView';
import { assertZeroUuidExposure } from './zeroUuid';

interface SampleItem {
  id: string;
  nombre: string;
  estatus: string;
  normas: string[];
  antiguedad: number;
}

const SAMPLE_DATA: SampleItem[] = [
  { id: '1', nombre: 'CyberCloud S.L.', estatus: 'ACTIVO', normas: ['ISO 9001', 'ISO 27001'], antiguedad: 3 },
  { id: '2', nombre: 'Iberometal S.A.', estatus: 'EN_PROCESO', normas: ['ISO 9001'], antiguedad: 5 },
  { id: '3', nombre: 'AgroAlimentos C.A.', estatus: 'ACTIVO', normas: ['ISO 14001'], antiguedad: 1 },
  { id: '4', nombre: 'Logística Andina C.A.', estatus: 'SUSPENDIDO', normas: ['ISO 9001', 'ISO 14001'], antiguedad: 2 },
];

const SAMPLE_FACETS: MultiViewFacetCategory<SampleItem>[] = [
  {
    id: 'estatus',
    label: 'Estatus',
    options: ['ACTIVO', 'EN_PROCESO', 'SUSPENDIDO', 'CANCELADO'],
    extractValues: (item) => item.estatus,
  },
  {
    id: 'normas',
    label: 'Norma ISO',
    options: ['ISO 9001', 'ISO 14001', 'ISO 27001'],
    extractValues: (item) => item.normas,
  },
];

test('cycleSortDirection advances in Excel-style loop: none -> asc -> desc -> none', () => {
  assert.equal(cycleSortDirection('none'), 'asc');
  assert.equal(cycleSortDirection('asc'), 'desc');
  assert.equal(cycleSortDirection('desc'), 'none');
});

test('sortItems sorts string columns alphabetically ascending and descending', () => {
  const asc = sortItems(SAMPLE_DATA, 'nombre', 'asc');
  assert.deepEqual(asc.map((i) => i.nombre), [
    'AgroAlimentos C.A.',
    'CyberCloud S.L.',
    'Iberometal S.A.',
    'Logística Andina C.A.',
  ]);

  const desc = sortItems(SAMPLE_DATA, 'nombre', 'desc');
  assert.deepEqual(desc.map((i) => i.nombre), [
    'Logística Andina C.A.',
    'Iberometal S.A.',
    'CyberCloud S.L.',
    'AgroAlimentos C.A.',
  ]);

  const none = sortItems(SAMPLE_DATA, 'nombre', 'none');
  assert.deepEqual(none.map((i) => i.id), ['1', '2', '3', '4']);
});

test('sortItems sorts numeric columns correctly', () => {
  const asc = sortItems(SAMPLE_DATA, 'antiguedad', 'asc');
  assert.deepEqual(asc.map((i) => i.antiguedad), [1, 2, 3, 5]);

  const desc = sortItems(SAMPLE_DATA, 'antiguedad', 'desc');
  assert.deepEqual(desc.map((i) => i.antiguedad), [5, 3, 2, 1]);
});

test('calculateFacetCounts aggregates occurrences accurately', () => {
  const counts = calculateFacetCounts(SAMPLE_DATA, (item) => item.estatus);
  assert.equal(counts['ACTIVO'], 2);
  assert.equal(counts['EN_PROCESO'], 1);
  assert.equal(counts['CANCELADO'], undefined);
});

test('buildFacetOptions marks selected values and includes counts', () => {
  const counts = { ACTIVO: 2, EN_PROCESO: 1 };
  const options = buildFacetOptions(['ACTIVO', 'EN_PROCESO'], counts, 'ACTIVO');

  assert.equal(options.length, 2);
  assert.equal(options[0].value, 'ACTIVO');
  assert.equal(options[0].count, 2);
  assert.equal(options[0].selected, true);

  assert.equal(options[1].value, 'EN_PROCESO');
  assert.equal(options[1].count, 1);
  assert.equal(options[1].selected, false);
});

test('renderSortIndicator renders appropriate directional glyphs', () => {
  assert.equal(renderSortIndicator('asc'), '▲');
  assert.equal(renderSortIndicator('desc'), '▼');
  assert.equal(renderSortIndicator('none'), '▲▼');
});

test('Phase 4.1.1: filterRecordsWithFacets applies intra-category OR, inter-category AND, and accent-insensitive query', () => {
  // Empty selections -> all records
  assert.equal(filterRecordsWithFacets(SAMPLE_DATA, '', SAMPLE_FACETS, {}).length, 4);

  // Intra-category OR: ACTIVO or EN_PROCESO -> items 1, 2, 3
  const orSelections: MultiViewSelectionMap = {
    estatus: new Set(['ACTIVO', 'EN_PROCESO']),
  };
  const orFiltered = filterRecordsWithFacets(SAMPLE_DATA, '', SAMPLE_FACETS, orSelections);
  assert.deepEqual(orFiltered.map((r) => r.id), ['1', '2', '3']);

  // Inter-category AND: (ACTIVO || EN_PROCESO) AND ISO 14001 -> only item 3
  const andSelections: MultiViewSelectionMap = {
    estatus: new Set(['ACTIVO', 'EN_PROCESO']),
    normas: new Set(['ISO 14001']),
  };
  const andFiltered = filterRecordsWithFacets(SAMPLE_DATA, '', SAMPLE_FACETS, andSelections);
  assert.deepEqual(andFiltered.map((r) => r.id), ['3']);

  // Accent-insensitive search + facet intersection
  const queryFiltered = filterRecordsWithFacets(
    SAMPLE_DATA,
    'logistica',
    SAMPLE_FACETS,
    { normas: new Set(['ISO 14001']) },
    { getSearchableText: (item) => item.nombre }
  );
  assert.deepEqual(queryFiltered.map((r) => r.id), ['4']);
});

test('Phase 4.1.1: computeReactiveFacetCounts computes rest-out S_{-k} counts without zeroing siblings', () => {
  // Select estatus = ACTIVO (items 1 and 3)
  const sel1: MultiViewSelectionMap = {
    estatus: new Set(['ACTIVO']),
  };
  const groups1 = computeReactiveFacetCounts(SAMPLE_DATA, '', SAMPLE_FACETS, sel1);
  const estatusGroup1 = groups1.find((g) => g.id === 'estatus')!;
  const normasGroup1 = groups1.find((g) => g.id === 'normas')!;

  // Sibling options in 'estatus' keep full S_{-estatus} counts (not zeroed by ACTIVO selection)
  assert.equal(estatusGroup1.options.find((o) => o.value === 'ACTIVO')?.count, 2);
  assert.equal(estatusGroup1.options.find((o) => o.value === 'ACTIVO')?.selected, true);
  assert.equal(estatusGroup1.options.find((o) => o.value === 'EN_PROCESO')?.count, 1);
  assert.equal(estatusGroup1.options.find((o) => o.value === 'SUSPENDIDO')?.count, 1);
  assert.equal(estatusGroup1.options.find((o) => o.value === 'CANCELADO')?.count, 0);

  // Cross-category 'normas' reflects S_{-normas} = {item 1, item 3}
  assert.equal(normasGroup1.options.find((o) => o.value === 'ISO 9001')?.count, 1);
  assert.equal(normasGroup1.options.find((o) => o.value === 'ISO 14001')?.count, 1);
  assert.equal(normasGroup1.options.find((o) => o.value === 'ISO 27001')?.count, 1);

  // Now check BOTH estatus=ACTIVO and normas=ISO 27001
  const sel2: MultiViewSelectionMap = {
    estatus: new Set(['ACTIVO']),
    normas: new Set(['ISO 27001']),
  };
  const groups2 = computeReactiveFacetCounts(SAMPLE_DATA, '', SAMPLE_FACETS, sel2);
  const estatusGroup2 = groups2.find((g) => g.id === 'estatus')!;
  // Only item 1 has ISO 27001, and it is ACTIVO -> EN_PROCESO/SUSPENDIDO drop to 0 in S_{-estatus}
  assert.equal(estatusGroup2.options.find((o) => o.value === 'ACTIVO')?.count, 1);
  assert.equal(estatusGroup2.options.find((o) => o.value === 'EN_PROCESO')?.count, 0);
  assert.equal(estatusGroup2.options.find((o) => o.value === 'SUSPENDIDO')?.count, 0);

  // Also test search query intersection: query = "Agro"
  const groups3 = computeReactiveFacetCounts(SAMPLE_DATA, 'Agro', SAMPLE_FACETS, {});
  assert.equal(groups3[0].options.find((o) => o.value === 'ACTIVO')?.count, 1);
  assert.equal(groups3[0].options.find((o) => o.value === 'EN_PROCESO')?.count, 0);
  assert.equal(groups3[1].options.find((o) => o.value === 'ISO 14001')?.count, 1);
  assert.equal(groups3[1].options.find((o) => o.value === 'ISO 9001')?.count, 0);
});

test('Phase 4.1.1: selection map helpers toggle, clear, count, and format totalizer', () => {
  let sel: MultiViewSelectionMap = {};
  sel = toggleFacetSelection(sel, 'estatus', 'ACTIVO');
  sel = toggleFacetSelection(sel, 'estatus', 'EN_PROCESO');
  sel = toggleFacetSelection(sel, 'normas', 'ISO 9001');
  assert.equal(countActiveFacetSelections(sel), 3);

  sel = toggleFacetSelection(sel, 'estatus', 'ACTIVO');
  assert.equal(countActiveFacetSelections(sel), 2);
  assert.equal(sel['estatus']?.has('ACTIVO'), false);
  assert.equal(sel['estatus']?.has('EN_PROCESO'), true);

  const cleared = clearFacetSelections(SAMPLE_FACETS);
  assert.equal(countActiveFacetSelections(cleared), 0);
  assert.equal(formatMultiViewTotalizer(2, 4, 'organizaciones'), 'Mostrando 2 de 4 organizaciones');
});

test('Phase 4.1.1: renderUniversalTemplate renders unified controls, single type="text" search, collapsible sidebar, and zero-count muted checkboxes', () => {
  const selections: MultiViewSelectionMap = { estatus: new Set(['ACTIVO']) };
  const facetGroups = computeReactiveFacetCounts(SAMPLE_DATA, '', SAMPLE_FACETS, selections);
  const filtered = filterRecordsWithFacets(SAMPLE_DATA, '', SAMPLE_FACETS, selections);

  const expandedHtml = renderUniversalTemplate({
    title: 'Organizaciones de Prueba',
    subtitle: 'Directorio unificado',
    entityLabel: 'organizaciones',
    searchQuery: 'Cyber',
    totalCount: SAMPLE_DATA.length,
    filteredCount: filtered.length,
    viewMode: 'grid',
    isSidebarOpen: true,
    facetGroups,
    items: filtered,
    columns: [
      {
        id: 'nombre',
        header: 'Nombre',
        sortable: true,
        renderCell: (item) => item.nombre,
      },
    ],
    renderCard: (item) => `<div>${item.nombre}</div>`,
  });

  // Eliminates native browser double-X clear button
  assert.equal(/type=["']search["']/.test(expandedHtml), false);
  assert.ok(expandedHtml.includes('type="text"'));
  // Single clear button when query is non-empty
  assert.equal((expandedHtml.match(/data-clear-search="true"/g) || []).length, 1);
  // Totalizer & tabular-nums
  assert.ok(expandedHtml.includes('Mostrando'));
  assert.ok(expandedHtml.includes('tabular-nums'));
  assert.ok(expandedHtml.includes('organizaciones'));
  // Hamburger toggle with active filter badge
  assert.ok(expandedHtml.includes('data-toggle-sidebar="true"'));
  assert.ok(expandedHtml.includes('aria-expanded="true"'));
  // Accessible checkboxes + muted zero-count option (CANCELADO = 0)
  assert.ok(expandedHtml.includes('type="checkbox"'));
  assert.ok(expandedHtml.includes('CANCELADO'));
  assert.ok(expandedHtml.includes('text-slate-400'));
  assert.ok(expandedHtml.includes('Limpiar filtros'));
  // Expanded sidebar width
  assert.ok(expandedHtml.includes('lg:w-64'));
  assert.equal(assertZeroUuidExposure(expandedHtml).compliant, true);

  // Collapsed sidebar hides aside and expands canvas to 100%
  const collapsedHtml = renderUniversalTemplate({
    title: 'Organizaciones de Prueba',
    searchQuery: '',
    totalCount: SAMPLE_DATA.length,
    filteredCount: SAMPLE_DATA.length,
    viewMode: 'list',
    isSidebarOpen: false,
    facetGroups,
    items: SAMPLE_DATA,
    columns: [
      {
        id: 'nombre',
        header: 'Nombre',
        sortable: true,
        renderCell: (item) => item.nombre,
      },
    ],
    renderCard: (item) => `<div>${item.nombre}</div>`,
  });

  assert.ok(collapsedHtml.includes('aria-expanded="false"'));
  assert.ok(collapsedHtml.includes('aria-hidden="true"'));
  assert.ok(collapsedHtml.includes('class="hidden"'));
  // Empty query shows '/' hint and 0 clear buttons
  assert.equal(collapsedHtml.includes('data-clear-search="true"'), false);
  assert.ok(collapsedHtml.includes('>'));

  // Step 1: Single outer card & icon-only controls (no Filtros/Tarjetas/Tabla text labels)
  assert.ok(expandedHtml.includes('rounded-2xl'));
  assert.ok(expandedHtml.includes('aria-label="Filtros"'));
  assert.ok(expandedHtml.includes('aria-label="Vista en Tarjetas"'));
  assert.ok(expandedHtml.includes('aria-label="Vista en Tabla"'));
  assert.equal(expandedHtml.includes('<span>Filtros</span>'), false);
  assert.equal(expandedHtml.includes('<span>Tarjetas</span>'), false);
  assert.equal(expandedHtml.includes('<span>Tabla</span>'), false);

  // Step 1: List View renders table-fixed + colgroup
  assert.ok(collapsedHtml.includes('table-fixed'));
  assert.ok(collapsedHtml.includes('<colgroup>'));
});

test('Phase 4.1.1: searchControlsView uses type="text" without native double-X', () => {
  const html = renderSearchControls({
    filters: { query: 'FN-QMS', selectedStatus: 'ALL', selectedStandard: 'ALL', viewMode: 'grid' },
    availableStatuses: ['ACTIVO'],
    availableStandards: ['ISO 9001:2015'],
    matchCount: 1,
    totalCount: 1,
  });
  assert.equal(/type=["']search["']/.test(html), false);
  assert.ok(html.includes('type="text"'));
  assert.equal((html.match(/data-action="clear-search"/g) || []).length, 1);
});

test('Step 1: resolveColumnWidthPercentages normalizes widths strictly to 100% and resizeAdjacentColumns enforces minWidthPx', () => {
  const cols = [
    { id: 'a', defaultWidthPct: 50, minWidthPx: 120 },
    { id: 'b', defaultWidthPct: 30, minWidthPx: 80 },
    { id: 'c', minWidthPx: 80 },
  ];
  const resolved = resolveColumnWidthPercentages(cols);
  const sum = Object.values(resolved).reduce((acc, v) => acc + v, 0);
  assert.ok(Math.abs(sum - 100) < 0.01, `Expected sum ~100, got ${sum}`);
  assert.equal(Math.round(resolved.a), 50);
  assert.equal(Math.round(resolved.b), 30);
  assert.equal(Math.round(resolved.c), 20);

  // Dragging 'a' right by +100px on a 1000px table grows 'a' by +10% and shrinks 'b' by -10%
  const resized = resizeAdjacentColumns({
    currentWidths: resolved,
    columnOrder: ['a', 'b', 'c'],
    leftColumnId: 'a',
    deltaPx: 100,
    tableWidthPx: 1000,
    minWidthsPx: { a: 120, b: 80, c: 80 },
  });
  assert.equal(Math.round(resized.a), 60);
  assert.equal(Math.round(resized.b), 20);
  assert.equal(Math.round(resized.c), 20);
  const resizedSum = Object.values(resized).reduce((acc, v) => acc + v, 0);
  assert.ok(Math.abs(resizedSum - 100) < 0.01);

  // Extreme drag cannot shrink right neighbor 'b' below its 80px (8%) minWidthPx
  const clamped = resizeAdjacentColumns({
    currentWidths: resolved,
    columnOrder: ['a', 'b', 'c'],
    leftColumnId: 'a',
    deltaPx: 500,
    tableWidthPx: 1000,
    minWidthsPx: { a: 120, b: 80, c: 80 },
  });
  assert.equal(Math.round(clamped.b), 8);
  assert.equal(Math.round(clamped.a), 72);
  assert.ok(Math.abs(Object.values(clamped).reduce((acc, v) => acc + v, 0) - 100) < 0.01);
});

test('Step 1: renderListViewTable renders colgroup, drag handles (except last col), and full-row clickable attributes', () => {
  const html = renderListViewTable({
    tableId: 'demo-table',
    items: SAMPLE_DATA.slice(0, 2),
    columns: [
      { id: 'nombre', header: 'Nombre', sortable: true, defaultWidthPct: 60, minWidthPx: 140, renderCell: (i) => i.nombre },
      { id: 'estatus', header: 'Estatus', sortable: true, defaultWidthPct: 40, minWidthPx: 90, renderCell: (i) => i.estatus },
    ],
    sortState: { column: 'nombre', direction: 'asc' },
    getRowAttrs: (item) => `data-action="select-demo" data-demo-id="${item.id}"`,
  });

  assert.ok(html.includes('data-resizable-table="demo-table"'));
  assert.ok(html.includes('table-fixed'));
  assert.ok(html.includes('<colgroup>'));
  assert.ok(html.includes('data-col-id="nombre"'));
  assert.ok(html.includes('style="width: 60.00%;"'));
  assert.ok(html.includes('style="width: 40.00%;"'));
  // Resize handle on first column only, NOT on last column
  assert.equal((html.match(/data-resize-col=/g) || []).length, 1);
  assert.ok(html.includes('data-resize-col="nombre"'));
  assert.equal(html.includes('data-resize-col="estatus"'), false);
  // Full-row clickable attributes + keyboard accessibility
  assert.ok(html.includes('data-action="select-demo" data-demo-id="1" tabindex="0"'));
  assert.ok(html.includes('cursor-pointer'));
  assert.equal(html.includes('overflow-x-auto'), false);
});
