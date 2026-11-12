import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFieldDiffs,
  getActionVisualMeta,
  formatDiffValue,
  resolveAuditActorDisplay,
  formatAuditTimestampLocal,
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

test('resolveAuditActorDisplay resolves display name and email without exposing raw UUIDs', () => {
  const fromDirectory = resolveAuditActorDisplay(
    { performed_by: '99999999-9999-9999-9999-999999999999' },
    { '99999999-9999-9999-9999-999999999999': { nombre: 'Laura Gómez', email: 'lgomez@fondonorma.test' } }
  );
  assert.equal(fromDirectory.displayName, 'Laura Gómez');
  assert.equal(fromDirectory.email, 'lgomez@fondonorma.test');
  assert.equal(fromDirectory.formatted, 'Laura Gómez (lgomez@fondonorma.test)');

  const fromSeeded = resolveAuditActorDisplay({
    performed_by: '33333333-3333-3333-3333-333333333333',
  });
  assert.equal(fromSeeded.displayName, 'Auditor Técnico Evaluador');
  assert.equal(fromSeeded.email, 'auditor@fondonorma.test');

  const unknownUuid = resolveAuditActorDisplay({
    performed_by: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  });
  assert.equal(unknownUuid.displayName, 'Usuario del Sistema');
  assert.equal(unknownUuid.formatted.includes('aaaaaaaa-'), false);

  const systemActor = resolveAuditActorDisplay({});
  assert.equal(systemActor.displayName, 'Sistema de Certificación');
});

test('formatAuditTimestampLocal formats ISO dates into local readable date and time', () => {
  const formatted = formatAuditTimestampLocal('2026-11-12T15:30:45.000Z');
  assert.match(formatted, /\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}/);
  assert.equal(formatAuditTimestampLocal(null), 'Sin fecha registrada');
});
