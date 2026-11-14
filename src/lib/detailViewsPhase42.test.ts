import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import { assertZeroUuidExposure } from './zeroUuid';
import { INITIAL_ORGANIZACIONES, type CertificadoSummary } from './activeCertificates';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution';
import {
  INITIAL_NORMAS,
  INITIAL_ORGANISMOS,
  INITIAL_SECTORES_IAF,
  INITIAL_SUBSECTORES_IAF,
} from './extraDomain';
import { buildInitialAcreditacionEntities } from './acreditacionDomain';
import { canArchiveSitio, resolveSitioDetailById } from './sitioDomain';
import { getScopedNormaRequirements, resolveProcesoDetailById } from './procesoDomain';
import { computeShiftDurationLabel, isOvernightShift, resolveTurnoDetailById } from './turnoDomain';
import { renderAcreditacionView } from '../views/acreditacionView';
import { renderSitioView } from '../views/sitioView';
import { renderProcesoView } from '../views/procesoView';
import { renderTurnoView } from '../views/turnoView';
import { renderOrganizacionView } from '../views/organizacionView';
import { renderCertificadoView } from '../views/certificadoView';
import { renderAuditorView } from '../views/auditorView';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const FORBIDDEN_LEGACY_MARKERS = [
  'ZONA 1:',
  'ZONA 2:',
  'ZONA 3:',
  'ZONA 4:',
  'data-drilldown-select-org',
];

function assertThreeZoneCompliance(html: string, label: string, expectParentZone: boolean): void {
  for (const marker of FORBIDDEN_LEGACY_MARKERS) {
    assert.equal(html.includes(marker), false, `${label} must not contain legacy marker "${marker}"`);
  }
  assert.ok(html.includes('aria-label="Detalle del registro"'), `${label} missing Record Zone`);
  assert.ok(html.includes('role="tablist"'), `${label} missing Children Zone tablist`);
  assert.ok(html.includes('data-nav-back="true"'), `${label} missing Back action`);
  assert.ok(html.includes('data-action="open-changelog"'), `${label} missing Changelog trigger`);

  if (expectParentZone) {
    assert.ok(html.includes('aria-label="Contexto y relaciones superiores"'), `${label} missing Parent Zone`);
    assert.ok(html.includes('<hr class="border-t border-slate-200 my-4" />'), `${label} missing Parent/Record divider`);
    assert.ok(
      html.indexOf('aria-label="Contexto y relaciones superiores"') <
        html.indexOf('<hr class="border-t border-slate-200 my-4" />') &&
        html.indexOf('<hr class="border-t border-slate-200 my-4" />') <
          html.indexOf('aria-label="Detalle del registro"') &&
        html.indexOf('aria-label="Detalle del registro"') < html.indexOf('role="tablist"'),
      `${label} 3-Zone ordering violated`
    );
  }

  const zero = assertZeroUuidExposure(html);
  assert.equal(zero.compliant, true, `${label} exposed raw UUIDs: ${zero.exposedUuids.join(', ')}`);
}

test('Fase 5.2 Detail Views: Acreditación renders 3 zones with Organismo/Norma/Sector parent chips and covered certs', () => {
  const acreditaciones = buildInitialAcreditacionEntities(INITIAL_CERTIFICADOS_DETAILED);
  const target = acreditaciones[0];

  const html = renderAcreditacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAccreditationId: target.id,
      activeChildTab: 'certificados',
      query: '',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
    },
    acreditaciones,
    organismos: INITIAL_ORGANISMOS,
    normas: INITIAL_NORMAS,
    sectores: INITIAL_SECTORES_IAF,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    subsectores: INITIAL_SUBSECTORES_IAF,
  });

  assertThreeZoneCompliance(html, 'Acreditación Detail', true);
  assert.ok(html.includes(target.numero_acreditacion));
  assert.ok(html.includes(target.organismo_codigo));
  assert.ok(html.includes('Certificados Amparados'));
  assert.ok(html.includes('Sub-Sectores IAF del Alcance'));
  assert.ok(html.includes('data-parent-nav="true"'));
});

test('Fase 5.2 Detail Views: Sitio highlights Sede 0 HQ and protects against archiving while branches exist', () => {
  const certMultisite = INITIAL_CERTIFICADOS_DETAILED.find(
    (c) => c.sitios.some((s) => s.numero_sitio === 0) && c.sitios.some((s) => s.numero_sitio > 0)
  )!;
  const sitio0 = resolveSitioDetailById({
    sitioId: certMultisite.sitios.find((s) => s.numero_sitio === 0)!.id,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
  })!;

  const siblingSites = certMultisite.sitios.map((s) => ({
    id: s.id,
    id_certificado: certMultisite.id,
    numero_sitio: s.numero_sitio,
  }));

  const guard0 = canArchiveSitio({
    site: sitio0,
    siblingSites,
    associatedAuditsCount: sitio0.auditorias.length,
  });
  assert.equal(guard0.allowed, false);

  const sitio0Html = renderSitioView({
    profile: ADMIN_PROFILE,
    state: {
      selectedSitioId: sitio0.id,
      activeChildTab: 'turnos',
      isEditingAttributes: false,
    },
    sitio: sitio0,
    siblingSites,
  });

  assertThreeZoneCompliance(sitio0Html, 'Sitio 0 Detail', true);
  assert.ok(sitio0Html.includes('Sede Principal (Sitio 0)'));
  assert.ok(sitio0Html.includes('Sitio 0'));
  assert.ok(sitio0Html.includes('Turnos Operativos Asignados'));
  assert.ok(sitio0Html.includes('Auditorías en este Sitio'));

  // Verify secondary site resolves cleanly without Sede 0 HQ badge
  const sitioBranch = resolveSitioDetailById({
    sitioId: certMultisite.sitios.find((s) => s.numero_sitio > 0)!.id,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
  })!;
  const branchHtml = renderSitioView({
    profile: ADMIN_PROFILE,
    state: {
      selectedSitioId: sitioBranch.id,
      activeChildTab: 'auditorias',
      isEditingAttributes: false,
    },
    sitio: sitioBranch,
    siblingSites,
  });
  assertThreeZoneCompliance(branchHtml, 'Sitio Secundario Detail', true);
  assert.equal(branchHtml.includes('Sede Principal (Sitio 0)'), false);
});

test('Fase 5.2 Detail Views: Proceso maps scoped LTREE clauses, findings, and audits in 3 zones', () => {
  const cert = INITIAL_CERTIFICADOS_DETAILED[0];
  const proc = resolveProcesoDetailById({
    procesoId: cert.procesos[0].id,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    phase5Findings: INITIAL_PHASE5_FINDINGS,
  })!;

  const scopedClauses = getScopedNormaRequirements({
    id_norma: proc.id_norma,
    norma_codigo: proc.norma_codigo,
  });
  assert.ok(scopedClauses.length >= 1);
  assert.ok(scopedClauses.every((c) => c.norma_codigo === proc.norma_codigo));
  assert.ok(proc.requisitos.length >= 1);

  const html = renderProcesoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedProcesoId: proc.id,
      activeChildTab: 'requisitos',
      isEditingAttributes: false,
    },
    proceso: proc,
  });

  assertThreeZoneCompliance(html, 'Proceso Detail', true);
  assert.ok(html.includes(proc.nombre_proceso));
  assert.ok(html.includes('Cobertura LTREE'));
  assert.ok(html.includes('Requisitos Normativos Vinculados'));
  assert.ok(html.includes('Hallazgos Asociados'));
  assert.ok(html.includes('Auditorías Programadas'));
  assert.ok(html.includes(proc.requisitos[0].codigo));
});

test('Fase 5.2 Detail Views: Turno computes overnight shift duration accurately and omits Parent Zone when standalone', () => {
  assert.equal(isOvernightShift('22:00:00', '06:00:00'), true);
  assert.equal(computeShiftDurationLabel('22:00:00', '06:00:00'), '8h 00m (nocturno)');
  assert.equal(isOvernightShift('07:00:00', '15:00:00'), false);
  assert.equal(computeShiftDurationLabel('07:00:00', '15:00:00'), '8h 00m');

  const overnightShift = resolveTurnoDetailById({
    turnoId: 'night-shift-1',
    originatingSitioId: INITIAL_CERTIFICADOS_DETAILED[0].sitios[0].id,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    shiftCatalog: [
      {
        id: 'night-shift-1',
        hora_entrada: '22:00:00',
        hora_salida: '06:00:00',
        descripcion: 'Turno Nocturno Continuo',
      },
    ],
  })!;

  assert.equal(overnightShift.isOvernight, true);
  assert.equal(overnightShift.durationLabel, '8h 00m (nocturno)');

  const withOriginHtml = renderTurnoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedTurnoId: overnightShift.id,
      originatingSitioId: INITIAL_CERTIFICADOS_DETAILED[0].sitios[0].id,
      activeChildTab: 'sitios',
      isEditingAttributes: false,
    },
    turno: overnightShift,
  });
  assertThreeZoneCompliance(withOriginHtml, 'Turno Detail (with parent Sitio)', true);
  assert.ok(withOriginHtml.includes('8h 00m (nocturno)'));
  assert.ok(withOriginHtml.includes('Nocturno'));

  // Standalone entry (no originatingSitioId) renders cleanly without Parent Zone
  const standaloneTurno = resolveTurnoDetailById({
    turnoId: INITIAL_CERTIFICADOS_DETAILED[0].turnos[0].id,
    originatingSitioId: null,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
  })!;
  const standaloneHtml = renderTurnoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedTurnoId: standaloneTurno.id,
      originatingSitioId: null,
      activeChildTab: 'sitios',
      isEditingAttributes: false,
    },
    turno: standaloneTurno,
  });
  assertThreeZoneCompliance(standaloneHtml, 'Turno Detail (standalone)', false);
  assert.equal(standaloneHtml.includes('aria-label="Contexto y relaciones superiores"'), false);
});

test('Fase 5.2 Detail Views: Organización, Certificado, and Auditor adhere to 3-Zone layout and Zero-UUID compliance', () => {
  const certSummaries: CertificadoSummary[] = INITIAL_CERTIFICADOS_DETAILED.map((c) => ({
    id: c.id,
    numero_certificado: c.numero_certificado,
    id_organizacion: c.id_organizacion,
    organizacion_id: c.id_organizacion,
    organizacion_nombre: c.organizacion_nombre,
    norma: c.norma_codigo,
    esquema: c.esquema,
    estatus: c.estatus,
    sector_iaf: c.sector_iaf,
    multisitio: c.multisitio,
    sitios_count: c.sitios.length,
    fecha_emision: c.fecha_emision,
    fecha_vencimiento: c.fecha_vencimiento,
    cobertura_porcentaje: 100,
  }));

  const orgHtml = renderOrganizacionView({
    profile: ADMIN_PROFILE,
    state: {
      selectedOrganizacionId: INITIAL_ORGANIZACIONES[0].id,
      query: '',
      hasActiveCertificates: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
      activeChildTab: 'certificados',
    },
    organizaciones: INITIAL_ORGANIZACIONES,
    certificados: certSummaries,
    auditorias: INITIAL_PROGRAMACION_AUDITS,
  });
  assertThreeZoneCompliance(orgHtml, 'Organización Detail', true);
  assert.ok(orgHtml.includes(INITIAL_ORGANIZACIONES[0].nombre));

  const certHtml = renderCertificadoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedCertId: INITIAL_CERTIFICADOS_DETAILED[0].id,
      activeChildTab: 'sitios',
      query: '',
      selectedStandard: 'ALL',
      selectedStatus: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
    },
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    organizaciones: INITIAL_ORGANIZACIONES,
  });
  assertThreeZoneCompliance(certHtml, 'Certificado Detail', true);
  assert.ok(certHtml.includes('Sede #0'));
  assert.ok(certHtml.includes('Sede Central / Principal'));
  assert.ok(certHtml.includes('/ 1000 caracteres'));

  const auditorHtml = renderAuditorView({
    profile: ADMIN_PROFILE,
    state: {
      selectedAuditorId: INITIAL_AUDITORES_DETAILED[0].id,
      activeChildTab: 'competencias',
      query: '',
      selectedCalificacion: 'ALL',
      selectedStandard: 'ALL',
      selectedSectorIaf: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isEditingAttributes: false,
    },
    auditors: INITIAL_AUDITORES_DETAILED,
  });
  assertThreeZoneCompliance(auditorHtml, 'Auditor Detail', true);
  assert.ok(auditorHtml.includes(INITIAL_AUDITORES_DETAILED[0].codigo_credencial));
});
