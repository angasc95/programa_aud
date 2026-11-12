import test from 'node:test';
import assert from 'node:assert/strict';
import { assertZeroUuidExposure } from './zeroUuid';
import { renderHeader } from '../views/header';
import { renderDashboardView } from '../views/dashboardView';
import { renderApprovalsView } from '../views/approvalsView';
import { renderDrillDownView } from '../views/drillDownView';
import { renderOrganizacionView } from '../views/organizacionView';
import { renderCertificadoView } from '../views/certificadoView';
import { renderAuditorView } from '../views/auditorView';
import { renderProgramacionView } from '../views/programacionView';
import { renderCalendarioView } from '../views/calendarioView';
import { renderResultadoView } from '../views/resultadoView';
import { renderExtraView } from '../views/extraView';
import { renderAuditLogModal } from '../views/auditLogModal';
import { renderDetailPageTemplate } from '../views/detailTemplate';
import { renderBreadcrumbBar } from '../views/breadcrumbView';
import { pushBreadcrumb, resetBreadcrumbToDomain } from './breadcrumb';
import { SAMPLE_CERTIFICATE_RECORDS } from './searchControls';
import { INITIAL_ORGANIZACIONES } from './activeCertificates';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_AUDITORES_DETAILED } from './competencyMatrix';
import { INITIAL_PROGRAMACION_AUDITS, INITIAL_PHASE5_FINDINGS } from './auditExecution';
import {
  INITIAL_NORMAS,
  INITIAL_REQUISITOS_LTREE,
  INITIAL_SECTORES_IAF,
} from './extraDomain';
import type { UserProfile } from './healthCheck';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const WORKER_PROFILE: UserProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  nombre: 'Personal Técnico Certificación',
  role: 'WORKER',
  status: 'APPROVED',
};

const CERT_SUMMARIES = SAMPLE_CERTIFICATE_RECORDS.map((c) => ({
  id: c.id,
  numero_certificado: c.numero_certificado,
  id_organizacion: c.organizacion_id,
  organizacion_id: c.organizacion_id,
  organizacion_nombre: c.organizacion_nombre,
  norma: c.norma,
  esquema: c.esquema,
  estatus: c.estatus,
  sector_iaf: c.sector_iaf,
  multisitio: c.multisitio,
  sitios_count: c.sitios_count,
  fecha_emision: c.fecha_emision,
  fecha_vencimiento: c.fecha_vencimiento,
  cobertura_porcentaje: c.cobertura_porcentaje,
}));

function assertClean(label: string, html: string): void {
  const check = assertZeroUuidExposure(html);
  assert.equal(
    check.compliant,
    true,
    `${label} exposed raw UUID(s): ${check.exposedUuids.join(', ')}`
  );
}

test('Phase 6.2 Zero-UUID audit across Header, Dashboard, Approvals, and Audit Log Modal', () => {
  assertClean(
    'Header',
    renderHeader({
      profile: ADMIN_PROFILE,
      email: 'admin@fondonorma.test',
      isAdmin: true,
      canViewApprovals: true,
      activeRoute: 'dashboard',
      activeSubSection: null,
      pendingCount: 2,
      openMenu: 'certificacion',
    })
  );

  assertClean(
    'Dashboard',
    renderDashboardView(ADMIN_PROFILE, 'admin@fondonorma.test', 'dashboard', null, {
      filters: {
        query: '',
        selectedStatus: 'ALL',
        selectedStandard: 'ALL',
        viewMode: 'grid',
      },
      filteredRecords: SAMPLE_CERTIFICATE_RECORDS,
      allRecords: SAMPLE_CERTIFICATE_RECORDS,
      availableStatuses: ['ACTIVO', 'EN AUDITORÍA'],
      availableStandards: ['ISO 9001:2015', 'ISO 14001:2015'],
      loading: false,
    })
  );

  assertClean(
    'Approvals',
    renderApprovalsView({
      profiles: [ADMIN_PROFILE, WORKER_PROFILE],
      filter: 'ALL',
      loading: false,
      updatingId: null,
      errorMessage: null,
      successMessage: null,
      currentAdminId: ADMIN_PROFILE.id,
    })
  );

  assertClean(
    'AuditLogModal',
    renderAuditLogModal({
      isOpen: true,
      entityName: 'Iberometal Componentes S.A.',
      tableName: 'organizacion',
      recordId: INITIAL_ORGANIZACIONES[0].id,
      loading: false,
      entries: [
        {
          id: 1,
          table_name: 'organizacion',
          record_id: INITIAL_ORGANIZACIONES[0].id,
          operation: 'UPDATE',
          performed_by: ADMIN_PROFILE.id,
          performed_at: '2026-11-12T10:00:00Z',
          old_data: {
            nombre: 'Iberometal S.A.',
            id_sector_iaf: 'Sector IAF 17',
          },
          new_data: {
            nombre: 'Iberometal Componentes S.A.',
            id_sector_iaf: 'Sector IAF 17',
            referencia_extra: '99999999-9999-9999-9999-999999999999',
          },
        },
      ],
    })
  );
});

test('Phase 6.2 Zero-UUID audit across Certificación domain (Organización, Certificado, Auditor, Drill-Down)', () => {
  const org = INITIAL_ORGANIZACIONES[0];
  const cert = INITIAL_CERTIFICADOS_DETAILED[0];
  const aud = INITIAL_AUDITORES_DETAILED[0];

  assertClean(
    'Organizacion Edit Form',
    renderOrganizacionView({
      profile: ADMIN_PROFILE,
      state: {
        selectedOrganizacionId: org.id,
        query: '',
        hasActiveCertificates: 'ALL',
        selectedSectorIaf: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isEditingAttributes: true,
        activeChildTab: 'certificados',
      },
      organizaciones: INITIAL_ORGANIZACIONES,
      certificados: CERT_SUMMARIES,
      loading: false,
    })
  );

  assertClean(
    'Certificado Edit Form',
    renderCertificadoView({
      profile: ADMIN_PROFILE,
      state: {
        selectedCertId: cert.id,
        activeChildTab: 'sitios',
        query: '',
        selectedStandard: 'ALL',
        selectedStatus: 'ALL',
        selectedSectorIaf: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isEditingAttributes: true,
      },
      certificates: INITIAL_CERTIFICADOS_DETAILED,
      loading: false,
    })
  );

  assertClean(
    'Auditor Edit Form',
    renderAuditorView({
      profile: ADMIN_PROFILE,
      state: {
        selectedAuditorId: aud.id,
        activeChildTab: 'competencias',
        query: '',
        selectedCalificacion: 'ALL',
        selectedStandard: 'ALL',
        selectedSectorIaf: 'ALL',
        viewMode: 'grid',
        sortColumn: null,
        sortDirection: 'none',
        isEditingAttributes: true,
      },
      auditors: INITIAL_AUDITORES_DETAILED,
      loading: false,
    })
  );

  assertClean(
    'DrillDown Findings + New Finding Form',
    renderDrillDownView(ADMIN_PROFILE, {
      selectedOrgId: org.id,
      selectedCertId: cert.id,
      activeTab: 'findings',
      organizations: INITIAL_ORGANIZACIONES.map((o) => ({
        id: o.id,
        nombre: o.nombre,
        rif: o.rif,
        direccion_fiscal: o.direccion_fiscal,
        certificados_count: 1,
      })),
      certificates: SAMPLE_CERTIFICATE_RECORDS,
      sites: [],
      processes: [
        {
          id: '60000000-0000-0000-0000-000000000001',
          nombre_proceso: 'Troquelado y Fundición',
          numero_certificado: cert.numero_certificado,
          clausulas_cubiertas: ['8.5'],
        },
      ],
      shifts: [],
      standards: INITIAL_NORMAS,
      requirements: INITIAL_REQUISITOS_LTREE.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        ruta_materializada: r.ruta_materializada,
        norma: r.norma_codigo,
      })),
      audits: INITIAL_PROGRAMACION_AUDITS.map((a) => ({
        id: a.id,
        numero_certificado: a.numero_certificado,
        organizacion_nombre: a.organizacion_nombre,
        tipo_auditoria: a.tipo_auditoria,
        metodologia: a.metodologia,
        fecha_programacion: a.fecha_inicio,
        estatus: a.estatus,
      })),
      auditors: [],
      findings: [],
      findingFilterType: 'ALL',
      findingFilterStatus: 'all',
      isLoggingFinding: true,
      loggingAuditId: INITIAL_PROGRAMACION_AUDITS[0].id,
      loading: false,
    })
  );
});

test('Phase 6.2 Zero-UUID audit across Auditorías domain modals (Programación, Calendario, Resultado)', () => {
  const audit = INITIAL_PROGRAMACION_AUDITS[0];
  const finding = INITIAL_PHASE5_FINDINGS[0];

  assertClean(
    'Programacion New Audit Planning Modal',
    renderProgramacionView({
      profile: ADMIN_PROFILE,
      state: {
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
        isPlanningModalOpen: true,
        isEditingAttributes: false,
        isAddingTeamMember: false,
      },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      certificates: SAMPLE_CERTIFICATE_RECORDS,
      loading: false,
    })
  );

  assertClean(
    'Programacion Detail Edit Form + Team Modal',
    renderProgramacionView({
      profile: ADMIN_PROFILE,
      state: {
        selectedAuditId: audit.id,
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
        isEditingAttributes: true,
        isAddingTeamMember: true,
      },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      certificates: SAMPLE_CERTIFICATE_RECORDS,
      loading: false,
    })
  );

  assertClean(
    'Calendario + Slide-Over Drawer',
    renderCalendarioView({
      profile: ADMIN_PROFILE,
      state: {
        displayMode: 'month',
        referenceYear: 2024,
        referenceMonth: 11,
        filterAuditorId: 'ALL',
        filterStandard: 'ALL',
        filterMethodology: 'ALL',
        drawerAuditId: audit.id,
      },
      audits: INITIAL_PROGRAMACION_AUDITS,
      auditors: INITIAL_AUDITORES_DETAILED,
      standards: INITIAL_NORMAS.map((n) => ({ norma: n.norma })),
    })
  );

  assertClean(
    'Resultado + New Finding + Finding Lifecycle Modal',
    renderResultadoView({
      profile: ADMIN_PROFILE,
      state: {
        selectedAuditId: 'ALL',
        activeAuditIdForDecision: audit.id,
        displayMode: 'list',
        filterType: 'ALL',
        filterLifecycle: 'ALL',
        searchQuery: '',
        isLoggingFinding: true,
        inspectingFindingId: finding.id,
      },
      audits: INITIAL_PROGRAMACION_AUDITS,
      findings: INITIAL_PHASE5_FINDINGS,
      processes: [{ id: '60000000-0000-0000-0000-000000000001', nombre_proceso: 'Troquelado y Fundición' }],
      requirements: INITIAL_REQUISITOS_LTREE.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        norma: r.norma_codigo,
      })),
    })
  );
});

test('Phase 6.2 Zero-UUID audit across Extra domain modals and DetailTemplate', () => {
  assertClean(
    'Extra Norma Accreditation Modal',
    renderExtraView(ADMIN_PROFILE, {
      activeSubSection: 'standards',
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
      normaState: {
        selectedNormaId: INITIAL_NORMAS[0].id,
        isAddAccreditationModalOpen: true,
      },
    })
  );

  assertClean(
    'Extra Sector IAF Subsector Modal',
    renderExtraView(ADMIN_PROFILE, {
      activeSubSection: 'iaf',
      standards: INITIAL_NORMAS,
      requirements: [],
      iafSectors: INITIAL_SECTORES_IAF,
      catalogs: [],
      loading: false,
      iafState: {
        selectedSectorId: INITIAL_SECTORES_IAF[0].id,
        isAddSubsectorModalOpen: true,
      },
    })
  );

  assertClean(
    'DetailTemplate',
    renderDetailPageTemplate({
      entityType: 'Certificado',
      entitySymbol: '📜',
      title: 'FN-QMS-2024-001',
      backButton: { label: 'Volver', nav: 'certificacion', subview: 'certificates' },
      parentInfo: {
        parentLabel: 'Organización',
        parentName: 'Iberometal Componentes S.A.',
        navAction: {
          nav: 'drilldown',
          entityId: INITIAL_ORGANIZACIONES[0].id,
        },
      },
      tableName: 'certificado',
      recordId: INITIAL_CERTIFICADOS_DETAILED[0].id,
      attributes: [{ label: 'Norma', value: 'ISO 9001:2015' }],
    })
  );

  const trail = pushBreadcrumb(resetBreadcrumbToDomain('certificacion', 'organizations'), {
    id: `org-${INITIAL_ORGANIZACIONES[0].id}`,
    label: INITIAL_ORGANIZACIONES[0].nombre,
    route: 'certificacion',
    subview: 'organizations',
    entityId: INITIAL_ORGANIZACIONES[0].id,
    tooltip: `Organización > ${INITIAL_ORGANIZACIONES[0].nombre}`,
  });
  const breadcrumbHtml = renderBreadcrumbBar({ trail });
  assertClean('BreadcrumbBar', breadcrumbHtml);
  assert.ok(breadcrumbHtml.includes('Iberometal Componentes…'));
  assert.ok(breadcrumbHtml.includes('Iberometal Componentes S.A.'));
});
