import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessRoute,
  getVisibleDomainMenus,
  type UserProfile,
} from './healthCheck';
import {
  canAccessSubview,
  normalizeDomainSubview,
} from './accessControl';
import { resetBreadcrumbToDomain } from './breadcrumb';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderHeader } from '../views/header';
import { renderAuditoriasView } from '../views/auditoriasView';
import { renderCertificacionView } from '../views/certificacionView';
import { renderExtraView } from '../views/extraView';
import {
  INITIAL_PROGRAMACION_AUDITS,
  INITIAL_PHASE5_FINDINGS,
} from './auditExecution';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import { SAMPLE_CERTIFICATE_RECORDS } from './searchControls';
import {
  INITIAL_NORMAS,
  INITIAL_REQUISITOS_LTREE,
  INITIAL_SECTORES_IAF,
} from './extraDomain';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Técnico Evaluador',
  role: 'AUDITOR',
  status: 'APPROVED',
};

const PENDING_PROFILE: UserProfile = {
  id: '55555555-5555-5555-5555-555555555555',
  nombre: 'Solicitante Pendiente',
  role: 'CLIENT',
  status: 'PENDING',
};

const REJECTED_PROFILE: UserProfile = {
  id: '66666666-6666-6666-6666-666666666666',
  nombre: 'Solicitante Rechazado',
  role: 'WORKER',
  status: 'REJECTED',
};

test('Phase 2.1: Top header domain menus enforce exact 3 singular blocks and items', () => {
  const menus = getVisibleDomainMenus(ADMIN_PROFILE);
  assert.equal(menus.length, 3);

  assert.equal(menus[0].id, 'auditorias');
  assert.equal(menus[0].label, 'Auditoría');
  assert.deepEqual(
    menus[0].items.map((i) => ({ id: i.id, label: i.label })),
    [
      { id: 'scheduling', label: 'Programación' },
      { id: 'calendar', label: 'Calendario' },
      { id: 'findings', label: 'Resultado' },
    ]
  );

  assert.equal(menus[1].id, 'certificacion');
  assert.equal(menus[1].label, 'Certificación');
  assert.deepEqual(
    menus[1].items.map((i) => ({ id: i.id, label: i.label })),
    [
      { id: 'organizations', label: 'Organización' },
      { id: 'certificates', label: 'Certificado' },
      { id: 'auditors', label: 'Auditor' },
    ]
  );

  assert.equal(menus[2].id, 'extra');
  assert.equal(menus[2].label, 'Extra');
  assert.deepEqual(
    menus[2].items.map((i) => ({ id: i.id, label: i.label })),
    [
      { id: 'standards', label: 'Norma' },
      { id: 'iaf', label: 'Sector IAF' },
      { id: 'accreditations', label: 'Acreditación' },
      { id: 'estatus', label: 'Estatus' },
      { id: 'tipos', label: 'Tipo' },
      { id: 'metodologias', label: 'Metodología' },
    ]
  );

  // Retired items strictly absent
  const allItemIds = menus.flatMap((m) => m.items.map((i) => i.id));
  for (const retired of ['drilldown', 'sites', 'processes', 'shifts', 'requirements', 'catalogs']) {
    assert.equal(allItemIds.includes(retired), false, `Retired item ${retired} must not exist`);
  }
});

test('Phase 2.1: profile route is accessible for all authenticated users and Mi Perfil renders in header', () => {
  for (const user of [ADMIN_PROFILE, AUDITOR_PROFILE, PENDING_PROFILE, REJECTED_PROFILE]) {
    assert.equal(canAccessRoute(user, 'profile'), true);
    assert.equal(canAccessSubview(user, 'profile'), true);

    const headerHtml = renderHeader({
      profile: user,
      email: 'user@fondonorma.test',
      isAdmin: user.role === 'ADMIN' && user.status === 'APPROVED',
      canViewApprovals: (user.role === 'ADMIN' || user.role === 'WORKER') && user.status === 'APPROVED',
      activeRoute: 'profile',
      activeSubSection: null,
      pendingCount: 0,
      openMenu: 'account',
    });
    assert.ok(headerHtml.includes('data-nav="profile"'));
    assert.ok(headerHtml.includes('Mi Perfil'));
    assert.equal(headerHtml.includes('Mi Perfil / Panel'), false);
    assert.equal(assertZeroUuidExposure(headerHtml).compliant, true);
  }

  assert.equal(canAccessRoute(null, 'profile'), false);
  const accTrail = resetBreadcrumbToDomain('extra', 'accreditations');
  assert.equal(accTrail[1].label, 'Acreditación');
});

test('Phase 2.1: normalizeDomainSubview redirects retired subviews safely', () => {
  assert.equal(normalizeDomainSubview('certificacion', 'sites'), 'certificates');
  assert.equal(normalizeDomainSubview('certificacion', 'processes'), 'certificates');
  assert.equal(normalizeDomainSubview('certificacion', 'shifts'), 'certificates');
  assert.equal(normalizeDomainSubview('certificacion', 'drilldown'), 'certificates');
  assert.equal(normalizeDomainSubview('extra', 'requirements'), 'standards');
  assert.equal(normalizeDomainSubview('extra', 'catalogs'), 'standards');
  assert.equal(normalizeDomainSubview('extra', 'accreditations'), 'accreditations');
  assert.equal(normalizeDomainSubview('auditorias', 'team'), 'scheduling');
});

test('Phase 2.1: Domain dispatchers emit zero wrapper banner cards, tablists, or Volver al Dashboard buttons', () => {
  const auditoriasHtml = renderAuditoriasView(ADMIN_PROFILE, {
    activeSubSection: 'scheduling',
    programacionState: {
      selectedAuditId: null,
      activeChildTab: 'equipo',
      query: '',
      selectedTipo: 'ALL',
      selectedMetodologia: 'ALL',
      selectedEstatus: 'ALL',
      selectedAuditorLider: 'ALL',
      viewMode: 'grid',
      sortColumn: null,
      sortDirection: 'none',
      isPlanningModalOpen: false,
      isEditingAttributes: false,
      isAddingTeamMember: false,
    },
    calendarioState: {
      displayMode: 'month',
      referenceYear: 2024,
      referenceMonth: 11,
      filterAuditorId: 'ALL',
      filterStandard: 'ALL',
      filterMethodology: 'ALL',
      drawerAuditId: null,
    },
    resultadoState: {
      selectedAuditId: 'ALL',
      activeAuditIdForDecision: INITIAL_PROGRAMACION_AUDITS[0].id,
      displayMode: 'list',
      filterType: 'ALL',
      filterLifecycle: 'ALL',
      searchQuery: '',
      isLoggingFinding: false,
      inspectingFindingId: null,
    },
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    phase5Findings: INITIAL_PHASE5_FINDINGS,
    allAuditorsDetailed: INITIAL_AUDITORES_DETAILED,
    certificates: SAMPLE_CERTIFICATE_RECORDS,
    processes: [],
    requirements: [],
    standards: [{ norma: 'ISO 9001:2015' }],
    loading: false,
  });

  assert.equal(auditoriasHtml.includes('BLOQUE 1 · AUDITORÍAS'), false);
  assert.equal(auditoriasHtml.includes('Ciclo Operativo de Auditorías'), false);
  assert.equal(auditoriasHtml.includes('role="tablist"'), false);

  const certificacionHtml = renderCertificacionView(ADMIN_PROFILE, {
    activeSubSection: 'certificates',
    filters: {
      query: '',
      selectedStatus: 'ALL',
      selectedStandard: 'ALL',
      viewMode: 'grid',
    },
    filteredCertificates: SAMPLE_CERTIFICATE_RECORDS,
    allCertificates: SAMPLE_CERTIFICATE_RECORDS,
    availableStatuses: ['ACTIVO'],
    availableStandards: ['ISO 9001:2015'],
    organizations: [],
    sites: [],
    processes: [],
    shifts: [],
    loading: false,
  });

  assert.equal(certificacionHtml.includes('Estructura Operativa y Certificación'), false);
  assert.equal(certificacionHtml.includes('Volver al Dashboard'), false);
  assert.equal(certificacionHtml.includes('DOMINIO CERTIFICACIÓN · ISO/IEC 17021-1:2015'), false);
  assert.equal(certificacionHtml.includes('Sedes Multisitio'), false);
  assert.equal(certificacionHtml.includes('Mapa de Procesos'), false);
  assert.equal(certificacionHtml.includes('Turnos Productivos'), false);

  const extraAccHtml = renderExtraView(ADMIN_PROFILE, {
    activeSubSection: 'accreditations',
    standards: INITIAL_NORMAS,
    requirements: INITIAL_REQUISITOS_LTREE.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      ruta_materializada: r.ruta_materializada,
      norma: r.norma_codigo,
    })),
    iafSectors: INITIAL_SECTORES_IAF,
    catalogs: [],
    loading: false,
  });

  assert.equal(extraAccHtml.includes('Navegación del Dominio Extra'), false);
  assert.equal(extraAccHtml.includes('Requisitos LTREE'), false);
  assert.equal(extraAccHtml.includes('Todos los Catálogos'), false);
  assert.ok(extraAccHtml.includes('Acreditaciones Vigentes'));
  assert.ok(extraAccHtml.includes('data-mv-domain="acreditaciones"'));
  assert.equal(assertZeroUuidExposure(extraAccHtml).compliant, true);
});
