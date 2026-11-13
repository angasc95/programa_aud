import test from 'node:test';
import assert from 'node:assert/strict';
import {
  truncateBreadcrumbLabel,
  resetBreadcrumbToDomain,
  pushBreadcrumb,
  popToBreadcrumb,
  popToParentBreadcrumb,
  collapseBreadcrumbForDisplay,
  containsRawUuid,
  MAX_BREADCRUMB_CHAR_LENGTH,
  type BreadcrumbSegment,
} from './breadcrumb';
import { renderBreadcrumbBar } from '../views/breadcrumbView';
import { renderHeader } from '../views/header';

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
  // Block 1: Auditoría
  const auditTrail = resetBreadcrumbToDomain('auditorias', 'scheduling');
  assert.equal(auditTrail.length, 2);
  assert.equal(auditTrail[0].label, 'Auditoría');
  assert.equal(auditTrail[1].label, 'Programación');

  // Block 2: Certificación
  const certTrail = resetBreadcrumbToDomain('certificacion', 'organizations');
  assert.equal(certTrail.length, 2);
  assert.equal(certTrail[0].label, 'Certificación');
  assert.equal(certTrail[1].label, 'Organización');

  // Block 3: Extra
  const extraTrail = resetBreadcrumbToDomain('extra', 'standards');
  assert.equal(extraTrail.length, 2);
  assert.equal(extraTrail[0].label, 'Extra');
  assert.equal(extraTrail[1].label, 'Norma');
});

test('Top Header Reset Rule clears nested child segments instantly', () => {
  const nestedTrail: BreadcrumbSegment[] = [
    { id: 'domain-certificacion', label: 'Certificación', route: 'certificacion' },
    { id: 'org-1', label: 'CyberCloud S.L.', route: 'certificacion', subview: 'organizations', entityId: 'org-1' },
    { id: 'cert-1', label: 'FN-QMS-2024-001', route: 'certificacion', subview: 'certificates', entityId: 'cert-1' },
    { id: 'site-1', label: 'Sede Central (Sitio 0)', route: 'certificacion', subview: 'certificates', entityId: 'site-1' },
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
    route: 'certificacion',
    subview: 'organizations',
    entityId: 'org-123',
    tooltip: 'CyberCloud Solutions S.L. — RIF J-40819234-5',
  };
  const step1 = pushBreadcrumb(root, seg1);
  assert.equal(step1.length, 3);
  assert.equal(step1[2].label, 'CyberCloud Solutions S.L.');

  const seg2: BreadcrumbSegment = {
    id: 'cert-qms',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
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
    { id: 'org', label: 'Iberometal S.A.', route: 'certificacion', subview: 'organizations' },
    { id: 'cert', label: 'FN-EMS-2024-002', route: 'certificacion', subview: 'certificates' },
    { id: 'site', label: 'Sede Principal (Sitio 0)', route: 'certificacion', subview: 'certificates' },
    { id: 'findings', label: 'Hallazgo NC-01', route: 'auditorias', subview: 'findings' },
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

test('renderBreadcrumbBar truncates labels > 24 chars with ellipsis and preserves full title tooltip', () => {
  const longOrgName = 'Petroquímica del Centro C.A.';
  assert.equal(longOrgName.length > MAX_BREADCRUMB_CHAR_LENGTH, true);

  let trail = resetBreadcrumbToDomain('certificacion', 'organizations');
  trail = pushBreadcrumb(trail, {
    id: 'org-petro',
    label: longOrgName,
    route: 'certificacion',
    subview: 'organizations',
    entityId: 'org-petro',
    tooltip: `Organización > ${longOrgName}`,
  });
  trail = pushBreadcrumb(trail, {
    id: 'cert-long',
    label: 'FN-QMS-2024-001-MULTISITIO-EXTENDIDO',
    route: 'certificacion',
    subview: 'certificates',
    entityId: 'cert-1',
    tooltip: 'Certificado > FN-QMS-2024-001-MULTISITIO-EXTENDIDO',
  });

  const html = renderBreadcrumbBar({ trail });
  assert.ok(html.includes('data-breadcrumb-id="domain-certificacion"'));
  assert.ok(html.includes('data-breadcrumb-id="subview-certificacion-organizations"'));
  assert.ok(html.includes('data-breadcrumb-id="org-petro"'));
  // Ancestor org truncated to 24 chars max with ellipsis, full name in title
  assert.ok(html.includes('Petroquímica del Centro…'));
  assert.ok(html.includes('title="Organización &gt; Petroquímica del Centro C.A."'));
  // Active leaf truncated with CSS truncate + 24-char truncation + full title
  assert.ok(html.includes('FN-QMS-2024-001-MULTISI…'));
  assert.ok(html.includes('title="Certificado &gt; FN-QMS-2024-001-MULTISITIO-EXTENDIDO"'));
  assert.ok(html.includes('aria-current="page"'));
  assert.ok(html.includes('truncate'));
  // Borderless, compact, single-row layout without card wrapper
  assert.equal(html.includes('bg-white border'), false);
  assert.equal(html.includes('flex-wrap'), false);
  assert.ok(html.includes('flex-nowrap'));
  assert.ok(html.includes('whitespace-nowrap'));
  assert.ok(html.includes('overflow-hidden'));

  // Single root segment collapses the breadcrumb bar
  assert.equal(renderBreadcrumbBar({ trail: resetBreadcrumbToDomain('dashboard') }), '');
});

test('renderHeader enforces Top-Header Reset Rule with data-nav-reset on all global nav triggers', () => {
  const html = renderHeader({
    profile: {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Admin FONDONORMA',
      role: 'ADMIN',
      status: 'APPROVED',
    },
    email: 'admin@fondonorma.test',
    isAdmin: true,
    canViewApprovals: true,
    activeRoute: 'certificacion',
    activeSubSection: 'organizations',
    pendingCount: 1,
    openMenu: null,
  });

  assert.ok(html.includes('data-nav="auditorias"'));
  assert.ok(html.includes('data-nav="certificacion"'));
  assert.ok(html.includes('data-nav="extra"'));
  assert.ok(html.includes('data-nav-reset="true"'));

  // Boundary truncation at exact 24 chars vs 25 chars and empty string
  const exact24 = '123456789012345678901234';
  assert.equal(exact24.length, 24);
  assert.deepEqual(truncateBreadcrumbLabel(exact24), { display: exact24, truncated: false });

  const exact25 = '1234567890123456789012345';
  const trunc25 = truncateBreadcrumbLabel(exact25);
  assert.equal(trunc25.truncated, true);
  assert.equal(trunc25.display.length, 24);
  assert.equal(trunc25.display.endsWith('…'), true);
  assert.deepEqual(truncateBreadcrumbLabel(''), { display: '', truncated: false });

  // Root domain resets across dashboard, profile, approvals, database, and domain-without-subview
  assert.equal(resetBreadcrumbToDomain('profile')[0].id, 'profile');
  assert.equal(resetBreadcrumbToDomain('profile')[0].label, 'Perfil');
  assert.equal(resetBreadcrumbToDomain('approvals')[0].id, 'approvals');
  assert.equal(resetBreadcrumbToDomain('database')[0].id, 'database');
  assert.equal(resetBreadcrumbToDomain('extra').length, 1);

  // Backtracking by matching entityId even when segment id differs
  const trail = resetBreadcrumbToDomain('certificacion', 'organizations');
  const withOrg = pushBreadcrumb(trail, {
    id: 'org-a',
    label: 'Org A',
    route: 'certificacion',
    entityId: 'same-entity',
  });
  const withCert = pushBreadcrumb(withOrg, {
    id: 'cert-b',
    label: 'Cert B',
    route: 'certificacion',
    entityId: 'other-entity',
  });
  const backByEntity = pushBreadcrumb(withCert, {
    id: 'org-a-updated',
    label: 'Org A Actualizada',
    route: 'certificacion',
    entityId: 'same-entity',
  });
  assert.equal(backByEntity.length, 3);
  assert.equal(backByEntity[2].label, 'Org A Actualizada');

  // Verify ALL domain dropdown menuitems carry data-nav-reset="true"
  const navResetCount = (html.match(/data-nav-reset="true"/g) || []).length;
  assert.ok(navResetCount >= 10, 'Every top-nav link and dropdown item must trigger breadcrumb reset');
});

test('Phase 3: collapseBreadcrumbForDisplay collapses trails > 4 levels into root + ellipsis + last two', () => {
  const deepTrail: BreadcrumbSegment[] = [
    { id: 'domain-certificacion', label: 'Certificación', route: 'certificacion' },
    { id: 'subview-certificacion-certificates', label: 'Certificado', route: 'certificacion', subview: 'certificates' },
    { id: 'cert-1', label: 'FN-QMS-2024-001', route: 'certificacion', subview: 'certificates', entityType: 'cert', entityId: '40000000-0000-0000-0000-000000000001' },
    { id: 'org-1', label: 'Iberometal S.A.', route: 'certificacion', subview: 'organizations', entityType: 'org', entityId: '30000000-0000-0000-0000-000000000001' },
    { id: 'sector-17', label: 'Sector 17', route: 'extra', subview: 'iaf', entityType: 'sector_iaf', entityId: 'd0000000-0000-0000-0000-000000000017' },
  ];

  // <= 4 stays expanded
  const fourItems = collapseBreadcrumbForDisplay(deepTrail.slice(0, 4));
  assert.equal(fourItems.length, 4);
  assert.equal(fourItems.every((i) => i.kind === 'segment'), true);

  // > 4 collapses middle segments [1..n-3] into ellipsis pointing to deepest hidden segment (n-3)
  const collapsed = collapseBreadcrumbForDisplay(deepTrail);
  assert.equal(collapsed.length, 4);
  assert.equal(collapsed[0].kind, 'segment');
  assert.equal(collapsed[1].kind, 'ellipsis');
  assert.equal(collapsed[2].kind, 'segment');
  assert.equal(collapsed[3].kind, 'segment');

  if (collapsed[1].kind === 'ellipsis') {
    assert.equal(collapsed[1].hiddenSegments.length, 2);
    assert.equal(collapsed[1].backtrackSegmentId, 'cert-1');
    assert.ok(collapsed[1].tooltip.includes('Certificado'));
    assert.ok(collapsed[1].tooltip.includes('FN-QMS-2024-001'));
    assert.equal(containsRawUuid(collapsed[1].tooltip), false);
  }

  const html = renderBreadcrumbBar({ trail: deepTrail });
  assert.ok(html.includes('data-breadcrumb-ellipsis="true"'));
  assert.ok(html.includes('data-breadcrumb-id="cert-1"'));
  assert.ok(html.includes('Iberometal S.A.'));
  assert.ok(html.includes('Sector 17'));
  assert.equal(containsRawUuid(html), false);
});

test('Phase 3: composite loop prevention avoids cross-entity collisions and truncates true cycles', () => {
  let trail = resetBreadcrumbToDomain('certificacion', 'certificates');

  // Visit Certificate FN-QMS-2024-001 -> Sector 17 -> re-visit FN-QMS-2024-001
  trail = pushBreadcrumb(trail, {
    id: 'cert-fn-1',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'cert',
    entityId: 'shared-id-1',
    tab: 'procesos',
  });
  trail = pushBreadcrumb(trail, {
    id: 'sector-17',
    label: 'Sector 17',
    route: 'extra',
    subview: 'iaf',
    entityType: 'sector_iaf',
    entityId: 'sec-17',
  });
  assert.equal(trail.length, 4);
  assert.equal(trail[0].label, 'Certificación');
  assert.equal(trail[3].label, 'Sector 17');

  // Same entityId ('shared-id-1') but different entityType ('sitio' vs 'cert') must NOT collide
  const withSite = pushBreadcrumb(trail, {
    id: 'sitio-1',
    label: 'Planta Valencia',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'sitio',
    entityId: 'shared-id-1',
  });
  assert.equal(withSite.length, 5);

  // Re-visiting the certificate truncates back cleanly to index 2 without duplicates
  const backtracked = pushBreadcrumb(withSite, {
    id: 'cert-fn-1-revisit',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'cert',
    entityId: 'shared-id-1',
    tab: 'sitios',
  });
  assert.equal(backtracked.length, 3);
  assert.equal(backtracked[2].entityType, 'cert');
  assert.equal(backtracked[2].tab, 'sitios');

  // Audit scheduling vs findings share audit entityId without colliding
  let auditTrail = resetBreadcrumbToDomain('auditorias', 'scheduling');
  auditTrail = pushBreadcrumb(auditTrail, {
    id: 'prog-audit-1',
    label: 'AUD-2024-001',
    route: 'auditorias',
    subview: 'scheduling',
    entityType: 'audit',
    entityId: 'audit-1',
    tab: 'equipo',
  });
  auditTrail = pushBreadcrumb(auditTrail, {
    id: 'resultados-1',
    label: 'Resultados · AUD-2024-001',
    route: 'auditorias',
    subview: 'findings',
    entityType: 'audit',
    entityId: 'audit-1',
  });
  assert.equal(auditTrail.length, 4);
});

test('Phase 3: popToParentBreadcrumb steps back one level and returns parent segment metadata', () => {
  let trail = resetBreadcrumbToDomain('certificacion', 'certificates');
  trail = pushBreadcrumb(trail, {
    id: 'cert-1',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'cert',
    entityId: '40000000-0000-0000-0000-000000000001',
    tab: 'auditorias',
  });
  trail = pushBreadcrumb(trail, {
    id: 'norma-9001',
    label: 'ISO 9001:2015',
    route: 'extra',
    subview: 'standards',
    entityType: 'norma',
    entityId: 'e0000000-0000-0000-0000-000000009001',
  });

  const step1 = popToParentBreadcrumb(trail);
  assert.equal(step1.trail.length, 3);
  assert.equal(step1.target?.id, 'cert-1');
  assert.equal(step1.target?.route, 'certificacion');
  assert.equal(step1.target?.entityType, 'cert');
  assert.equal(step1.target?.tab, 'auditorias');

  const step2 = popToParentBreadcrumb(step1.trail);
  assert.equal(step2.trail.length, 2);
  assert.equal(step2.target?.id, 'subview-certificacion-certificates');

  const rootOnly = resetBreadcrumbToDomain('dashboard');
  const noop = popToParentBreadcrumb(rootOnly);
  assert.equal(noop.trail.length, 1);
  assert.equal(noop.target?.id, 'dashboard');
});

test('Phase 4.2.2: composite breadcrumb truncates cycles cleanly for Certificado -> Acreditacion -> Certificado and Sitio -> Certificado -> Sitio', () => {
  let accredTrail = resetBreadcrumbToDomain('certificacion', 'certificates');
  accredTrail = pushBreadcrumb(accredTrail, {
    id: 'cert-fn-001',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'cert',
    entityId: '40000000-0000-0000-0000-000000000001',
    tab: 'cobertura',
  });
  accredTrail = pushBreadcrumb(accredTrail, {
    id: 'accred-enac-001',
    label: '01/C-SC001',
    route: 'extra',
    subview: 'accreditations',
    entityType: 'acreditacion',
    entityId: 'dc000000-0000-0000-0000-000000000001',
    tab: 'certificados',
  });
  assert.equal(accredTrail.length, 4);

  const loopedCert = pushBreadcrumb(accredTrail, {
    id: 'cert-fn-001-back',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'cert',
    entityId: '40000000-0000-0000-0000-000000000001',
    tab: 'sitios',
  });
  assert.equal(loopedCert.length, 3);
  assert.equal(loopedCert[2].entityType, 'cert');
  assert.equal(loopedCert[2].tab, 'sitios');

  let siteTrail = resetBreadcrumbToDomain('certificacion', 'certificates');
  siteTrail = pushBreadcrumb(siteTrail, {
    id: 'sitio-000',
    label: 'Sitio 0 · Sede Principal HQ',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'sitio',
    entityId: '50000000-0000-0000-0000-000000000001',
    tab: 'turnos',
  });
  siteTrail = pushBreadcrumb(siteTrail, {
    id: 'cert-001',
    label: 'FN-QMS-2024-001',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'cert',
    entityId: '40000000-0000-0000-0000-000000000001',
    tab: 'sitios',
  });
  assert.equal(siteTrail.length, 4);

  const loopedSitio = pushBreadcrumb(siteTrail, {
    id: 'sitio-000-back',
    label: 'Sitio 0 · Sede Principal HQ',
    route: 'certificacion',
    subview: 'certificates',
    entityType: 'sitio',
    entityId: '50000000-0000-0000-0000-000000000001',
    tab: 'auditorias',
  });
  assert.equal(loopedSitio.length, 3);
  assert.equal(loopedSitio[2].entityType, 'sitio');
  assert.equal(loopedSitio[2].tab, 'auditorias');
});

