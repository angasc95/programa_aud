import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractVisibleTextFromHtml,
  findExposedUuidsInHtml,
  assertZeroUuidExposure,
} from './zeroUuid';

test('extractVisibleTextFromHtml strips HTML tags and retains user visible text', () => {
  const html = `
    <div class="card" data-id="30000000-0000-0000-0000-000000000001">
      <h3 class="title">CyberCloud Solutions S.L.</h3>
      <p>Certificado: FN-QMS-2024-001</p>
    </div>
  `;
  const visible = extractVisibleTextFromHtml(html);
  assert.equal(visible.includes('CyberCloud Solutions S.L.'), true);
  assert.equal(visible.includes('data-id'), false);
  // data-id was in an attribute, not visible text
  assert.equal(visible.includes('30000000'), false);
});

test('findExposedUuidsInHtml flags raw UUIDs rendered in visible text', () => {
  const nonCompliantHtml = `
    <div>
      <span>Organización: 30000000-0000-0000-0000-000000000001</span>
    </div>
  `;
  const exposed = findExposedUuidsInHtml(nonCompliantHtml);
  assert.equal(exposed.length, 1);
  assert.equal(exposed[0], '30000000-0000-0000-0000-000000000001');

  const check = assertZeroUuidExposure(nonCompliantHtml);
  assert.equal(check.compliant, false);
  assert.equal(check.exposedUuids.length, 1);
});

test('assertZeroUuidExposure confirms compliance when only friendly names are rendered', () => {
  const compliantHtml = `
    <div data-record-id="40000000-0000-0000-0000-000000000001">
      <h1>CyberCloud Solutions S.L.</h1>
      <span>Certificado FN-EMS-2024-002</span>
      <span>Sede Central (Sitio 0)</span>
      <button data-id="40000000-0000-0000-0000-000000000001">Ver Detalle</button>
    </div>
  `;
  const check = assertZeroUuidExposure(compliantHtml);
  assert.equal(check.compliant, true);
  assert.equal(check.exposedUuids.length, 0);
});
