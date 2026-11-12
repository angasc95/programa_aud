import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFieldDiffs,
  getActionVisualMeta,
  formatDiffValue,
} from './auditLog';

test('computeFieldDiffs identifies modified fields between old and new state', () => {
  const oldData = {
    nombre: 'Iberometal S.A.',
    alcance: 'Fabricación de piezas metálicas',
    estatus: 'PLANIFICADA',
  };
  const newData = {
    nombre: 'Iberometal S.A.',
    alcance: 'Fabricación y ensamblaje de componentes automotrices',
    estatus: 'ACTIVO',
  };

  const diffs = computeFieldDiffs(oldData, newData, 'UPDATE');
  assert.equal(diffs.length, 2);

  const alcanceDiff = diffs.find((d) => d.fieldName === 'alcance');
  assert.ok(alcanceDiff);
  assert.equal(alcanceDiff.oldValue, 'Fabricación de piezas metálicas');
  assert.equal(alcanceDiff.newValue, 'Fabricación y ensamblaje de componentes automotrices');

  const estatusDiff = diffs.find((d) => d.fieldName === 'estatus');
  assert.ok(estatusDiff);
  assert.equal(estatusDiff.oldValue, 'PLANIFICADA');
  assert.equal(estatusDiff.newValue, 'ACTIVO');
});

test('computeFieldDiffs handles INSERT and DELETE actions correctly', () => {
  const insertedData = { codigo: 'FN-QMS-2024-001', estatus: 'ACTIVO' };
  const insertDiffs = computeFieldDiffs(null, insertedData, 'INSERT');
  assert.equal(insertDiffs.length, 2);
  assert.equal(insertDiffs[0].oldValue, null);
  assert.equal(insertDiffs[0].newValue, 'FN-QMS-2024-001');

  const deletedData = { codigo: 'FN-QMS-2024-001' };
  const deleteDiffs = computeFieldDiffs(deletedData, null, 'DELETE');
  assert.equal(deleteDiffs.length, 1);
  assert.equal(deleteDiffs[0].oldValue, 'FN-QMS-2024-001');
  assert.equal(deleteDiffs[0].newValue, null);
});

test('getActionVisualMeta returns distinctive symbols and CSS classes for DML operations', () => {
  const insertMeta = getActionVisualMeta('INSERT');
  assert.equal(insertMeta.symbol, '➕');
  assert.match(insertMeta.badgeClass, /emerald/);

  const updateMeta = getActionVisualMeta('UPDATE');
  assert.equal(updateMeta.symbol, '✏️');
  assert.match(updateMeta.badgeClass, /sky/);

  const deleteMeta = getActionVisualMeta('DELETE');
  assert.equal(deleteMeta.symbol, '🗑️');
  assert.match(deleteMeta.badgeClass, /rose/);
});

test('formatDiffValue formats primitives, nulls, and JSON objects cleanly', () => {
  assert.equal(formatDiffValue(null), '—');
  assert.equal(formatDiffValue(undefined), '—');
  assert.equal(formatDiffValue(true), 'true');
  assert.equal(formatDiffValue(false), 'false');
  assert.equal(formatDiffValue(123), '123');
  assert.equal(formatDiffValue('Texto de prueba'), 'Texto de prueba');
  assert.equal(formatDiffValue({ a: 1 }), '{"a":1}');
});
