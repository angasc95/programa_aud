import test from 'node:test';
import assert from 'node:assert/strict';
import {
  truncateBreadcrumbLabel,
  resetBreadcrumbToDomain,
  pushBreadcrumb,
  popToBreadcrumb,
  containsRawUuid,
  MAX_BREADCRUMB_CHAR_LENGTH,
  type BreadcrumbSegment,
} from './breadcrumb';

test('truncateBreadcrumbLabel preserves labels <= 24 characters', () => {
  const shortLabel = 'Planta Central';
  assert.equal(shortLabel.length <= MAX_BREADCRUMB_CHAR_LENGTH, true);
  const result = truncateBreadcrumbLabel(shortLabel);
  assert.equal(result.display, 'Planta Central');
  assert.equal(result.truncated, false);
});

test('truncateBreadcrumbLabel truncates labels > 24 characters with ellipsis', () => {
  const longLabel = 'CyberCloud Solutions Sociedad Limitada Internacional';
  assert.equal(longLabel.length > 24, true);
  const result = truncateBreadcrumbLabel(longLabel, 24);
  assert.equal(result.truncated, true);
  assert.equal(result.display.endsWith('…'), true);
  assert.equal(result.display.length <= 24, true);
  assert.equal(result.display, 'CyberCloud Solutions So…');
});

test('resetBreadcrumbToDomain establishes clean roots for the 3 operational domains', () => {
  // Block 1: Auditorías
  const auditTrail = resetBreadcrumbToDomain('auditorias', 'scheduling');
  assert.equal(auditTrail.length, 2);
  assert.equal(auditTrail[0].label, 'Auditorías');
  assert.equal(auditTrail[1].label, 'Programación');

  // Block 2: Certificación
  const certTrail = resetBreadcrumbToDomain('certificacion', 'organizations');
  assert.equal(certTrail.length, 2);
  assert.equal(certTrail[0].label, 'Certificación');
  assert.equal(certTrail[1].label, 'Organizaciones');

  // Block 3: Extra
  const extraTrail = resetBreadcrumbToDomain('extra', 'standards');
  assert.equal(extraTrail.length, 2);
  assert.equal(extraTrail[0].label, 'Extra');
  assert.equal(extraTrail[1].label, 'Normas ISO');
});

test('Top Header Reset Rule clears nested child segments instantly', () => {
  const nestedTrail: BreadcrumbSegment[] = [
    { id: 'domain-certificacion', label: 'Certificación', route: 'certificacion' },
    { id: 'org-1', label: 'CyberCloud S.L.', route: 'drilldown', entityId: 'org-1' },
    { id: 'cert-1', label: 'FN-QMS-2024-001', route: 'drilldown', entityId: 'cert-1' },
    { id: 'site-1', label: 'Sede Central (Sitio 0)', route: 'drilldown', entityId: 'site-1' },
  ];
  assert.equal(nestedTrail.length, 4);

  // Top header click resets immediately to target domain root
  const resetTrail = resetBreadcrumbToDomain('certificacion', 'organizations');
  assert.equal(resetTrail.length, 2);
  assert.equal(resetTrail[0].id, 'domain-certificacion');
  assert.equal(resetTrail[1].id, 'subview-certificacion-organizations');
});

test('pushBreadcrumb appends new hierarchy segment or backtracks if already present', () => {
  const root = resetBreadcrumbToDomain('certificacion', 'organizations');

  const seg1: BreadcrumbSegment = {
    id: 'org-cybercloud',
    label: 'CyberCloud Solutions S.L.',
    route: 'drilldown',
    entityId: 'org-123',
    tooltip: 'CyberCloud Solutions S.L. — RIF J-40819234-5',
  };
  const step1 = pushBreadcrumb(root, seg1);
  assert.equal(step1.length, 3);
  assert.equal(step1[2].label, 'CyberCloud Solutions S.L.');

  const seg2: BreadcrumbSegment = {
    id: 'cert-qms',
    label: 'FN-QMS-2024-001',
    route: 'drilldown',
    entityId: 'cert-456',
  };
  const step2 = pushBreadcrumb(step1, seg2);
  assert.equal(step2.length, 4);

  // Idempotent push to ancestor backtracks cleanly
  const backtracked = pushBreadcrumb(step2, seg1);
  assert.equal(backtracked.length, 3);
  assert.equal(backtracked[2].id, 'org-cybercloud');
});

test('popToBreadcrumb correctly truncates ancestry to selected target segment', () => {
  const fullTrail: BreadcrumbSegment[] = [
    { id: 'root', label: 'Certificación', route: 'certificacion' },
    { id: 'org', label: 'Iberometal S.A.', route: 'drilldown' },
    { id: 'cert', label: 'FN-EMS-2024-002', route: 'drilldown' },
    { id: 'site', label: 'Sede Principal (Sitio 0)', route: 'drilldown' },
    { id: 'findings', label: 'Hallazgo NC-01', route: 'drilldown' },
  ];

  const poppedToOrg = popToBreadcrumb(fullTrail, 'org');
  assert.equal(poppedToOrg.length, 2);
  assert.equal(poppedToOrg[1].id, 'org');

  const poppedToCert = popToBreadcrumb(fullTrail, 'cert');
  assert.equal(poppedToCert.length, 3);
  assert.equal(poppedToCert[2].id, 'cert');

  // Popping to unknown ID leaves trail intact
  const poppedUnknown = popToBreadcrumb(fullTrail, 'non-existent');
  assert.equal(poppedUnknown.length, 5);
});

test('containsRawUuid detects exposed UUIDs to enforce Zero-UUID mandate', () => {
  assert.equal(containsRawUuid('30000000-0000-0000-0000-000000000001'), true);
  assert.equal(containsRawUuid('Detalle de Organización 40000000-0000-0000-0000-000000000002'), true);
  assert.equal(containsRawUuid('CyberCloud Solutions S.L.'), false);
  assert.equal(containsRawUuid('FN-QMS-2024-001 (ISO 9001:2015)'), false);
  assert.equal(containsRawUuid('Sede Central (Sitio 0)'), false);
});
