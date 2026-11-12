import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cycleSortDirection,
  sortItems,
  calculateFacetCounts,
  buildFacetOptions,
  renderSortIndicator,
  type SortDirection,
} from './universalTemplate';

interface SampleItem {
  id: string;
  nombre: string;
  estatus: string;
  antiguedad: number;
}

const SAMPLE_DATA: SampleItem[] = [
  { id: '1', nombre: 'CyberCloud S.L.', estatus: 'ACTIVO', antiguedad: 3 },
  { id: '2', nombre: 'Iberometal S.A.', estatus: 'EN_PROCESO', antiguedad: 5 },
  { id: '3', nombre: 'AgroAlimentos C.A.', estatus: 'ACTIVO', antiguedad: 1 },
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
  ]);

  const desc = sortItems(SAMPLE_DATA, 'nombre', 'desc');
  assert.deepEqual(desc.map((i) => i.nombre), [
    'Iberometal S.A.',
    'CyberCloud S.L.',
    'AgroAlimentos C.A.',
  ]);

  const none = sortItems(SAMPLE_DATA, 'nombre', 'none');
  assert.deepEqual(none.map((i) => i.id), ['1', '2', '3']);
});

test('sortItems sorts numeric columns correctly', () => {
  const asc = sortItems(SAMPLE_DATA, 'antiguedad', 'asc');
  assert.deepEqual(asc.map((i) => i.antiguedad), [1, 3, 5]);

  const desc = sortItems(SAMPLE_DATA, 'antiguedad', 'desc');
  assert.deepEqual(desc.map((i) => i.antiguedad), [5, 3, 1]);
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
