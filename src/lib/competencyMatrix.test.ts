import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCredentialExpired,
  getCredentialValidityState,
  isAuditorQualifiedForScope,
  countDistinctAccreditedStandards,
  countDistinctQualifiedSectors,
  countDistinctQualifiedSubsectors,
  validateCredentialCode,
  getQualificationStatusVisual,
  getAuditRoleVisual,
  filterAuditors,
  INITIAL_AUDITORES_DETAILED,
  type CompetenciaAuditorEntity,
} from './competencyMatrix';

describe('Phase 4.3 - Credential Expiration & Validity Checks', () => {
  const referenceDate = '2025-01-01';

  it('correctly detects expired credentials against a reference date', () => {
    // Expired in 2024
    assert.equal(isCredentialExpired('2024-12-31', referenceDate), true);
    // Not expired (expires in 2026)
    assert.equal(isCredentialExpired('2026-06-30', referenceDate), false);
    // Boundary check (same date)
    assert.equal(isCredentialExpired('2025-01-01', referenceDate), false);
  });

  it('evaluates credential validity states: Vigente, Por Vencer, and Vencido', () => {
    // Expired
    assert.equal(getCredentialValidityState('2024-11-30', referenceDate), 'Vencido');

    // Within 90 days from 2025-01-01 (e.g. 2025-02-15 is ~45 days away)
    assert.equal(getCredentialValidityState('2025-02-15', referenceDate), 'Por Vencer');

    // More than 90 days away (e.g. 2026-01-01)
    assert.equal(getCredentialValidityState('2026-01-01', referenceDate), 'Vigente');
  });

  it('validates auditor credential registration code formatting', () => {
    assert.equal(validateCredentialCode('AUD-REG-2022-88').valid, true);
    assert.equal(validateCredentialCode('AUD-2024-01').valid, true);
    assert.equal(validateCredentialCode('IRCA-102938').valid, true);
    assert.equal(validateCredentialCode('').valid, false);
    assert.equal(validateCredentialCode('A').valid, false);
    assert.equal(validateCredentialCode('TOOLONG-'.repeat(10)).valid, false);
  });
});

describe('Phase 4.3 - Technical Competency Matching (ISO 17021-1 clause 7.2)', () => {
  const sampleCompetencies: CompetenciaAuditorEntity[] = [
    {
      id: 'c1',
      id_auditor: 'aud-1',
      id_norma: 'n-9001',
      norma_codigo: 'ISO 9001:2015',
      id_sector_iaf: 's-17',
      sector_iaf_numero: 17,
      sector_iaf_descripcion: 'Metales básicos y productos metálicos',
      id_subsector_iaf: 'ss-171',
      subsector_iaf_codigo: '17.1',
      subsector_iaf_descripcion: 'Fundición y siderurgia',
      rol_calificado: 'Auditor Líder',
      fecha_calificacion: '2021-01-01',
      fecha_vencimiento: '2027-12-31',
    },
    {
      id: 'c2',
      id_auditor: 'aud-1',
      id_norma: 'n-14001',
      norma_codigo: 'ISO 14001:2015',
      id_sector_iaf: 's-28',
      sector_iaf_numero: 28,
      sector_iaf_descripcion: 'Construcción e ingeniería civil',
      id_subsector_iaf: 'ss-281',
      subsector_iaf_codigo: '28.1',
      subsector_iaf_descripcion: 'Edificación y obra civil',
      rol_calificado: 'Auditor Equipo',
      fecha_calificacion: '2021-01-01',
      fecha_vencimiento: '2027-12-31',
    },
    {
      id: 'c3',
      id_auditor: 'aud-1',
      id_norma: 'n-45001',
      norma_codigo: 'ISO 45001:2018',
      id_sector_iaf: 's-14',
      sector_iaf_numero: 14,
      sector_iaf_descripcion: 'Productos químicos',
      rol_calificado: 'Experto Técnico',
      fecha_calificacion: '2020-01-01',
      fecha_vencimiento: '2023-12-31', // Expired
    },
  ];

  it('matches auditor qualification for standard and primary IAF sector', () => {
    const res = isAuditorQualifiedForScope(
      sampleCompetencies,
      'ISO 9001:2015',
      17,
      undefined,
      '2025-01-01'
    );
    assert.equal(res.qualified, true);
    assert.equal(res.matchedRole, 'Auditor Líder');
    assert.equal(res.isExpired, false);
  });

  it('matches auditor qualification for specific sub-sector (e.g. 17.1)', () => {
    const validSub = isAuditorQualifiedForScope(
      sampleCompetencies,
      'ISO 9001:2015',
      17,
      '17.1',
      '2025-01-01'
    );
    assert.equal(validSub.qualified, true);
    assert.equal(validSub.matchedRole, 'Auditor Líder');

    // Non-matched sub-sector 17.9
    const invalidSub = isAuditorQualifiedForScope(
      sampleCompetencies,
      'ISO 9001:2015',
      17,
      '17.9',
      '2025-01-01'
    );
    assert.equal(invalidSub.qualified, false);
  });

  it('flags expired competencies as unqualified with informative explanation', () => {
    const res = isAuditorQualifiedForScope(
      sampleCompetencies,
      'ISO 45001:2018',
      14,
      undefined,
      '2025-01-01'
    );
    assert.equal(res.qualified, false);
    assert.equal(res.isExpired, true);
    assert.ok(res.reason?.includes('Calificación vencida el 2023-12-31'));
  });

  it('returns unqualified when standard or sector does not match', () => {
    const wrongStd = isAuditorQualifiedForScope(
      sampleCompetencies,
      'ISO 27001',
      17,
      undefined,
      '2025-01-01'
    );
    assert.equal(wrongStd.qualified, false);

    const wrongSector = isAuditorQualifiedForScope(
      sampleCompetencies,
      'ISO 9001:2015',
      33,
      undefined,
      '2025-01-01'
    );
    assert.equal(wrongSector.qualified, false);
  });

  it('aggregates distinct accredited standards and IAF sectors', () => {
    assert.equal(countDistinctAccreditedStandards(sampleCompetencies), 3);
    assert.equal(countDistinctQualifiedSectors(sampleCompetencies), 3);
    assert.equal(countDistinctQualifiedSubsectors(sampleCompetencies), 2);
  });
});

describe('Phase 4.3 - Auditor Directory Filtering & Visual Helpers', () => {
  it('filters auditors by full name, credential, or email', () => {
    const byName = filterAuditors(INITIAL_AUDITORES_DETAILED, { query: 'Roberto' });
    assert.equal(byName.length, 1);
    assert.equal(byName[0].nombre, 'Ing. Roberto Silva');

    const byCode = filterAuditors(INITIAL_AUDITORES_DETAILED, { query: '2023-14' });
    assert.equal(byCode.length, 1);
    assert.equal(byCode[0].nombre, 'Dra. Ana Belén Torres');

    const byEmail = filterAuditors(INITIAL_AUDITORES_DETAILED, { query: 'cmendoza@' });
    assert.equal(byEmail.length, 1);
    assert.equal(byEmail[0].nombre, 'Ing. Carlos Mendoza');
  });

  it('filters auditors by qualification status facet', () => {
    const calificados = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      selectedCalificacion: 'Calificado',
    });
    assert.equal(calificados.length, 4);
    assert.ok(calificados.every((a) => a.calificacion === 'Calificado'));

    const training = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      selectedCalificacion: 'En Entrenamiento',
    });
    assert.equal(training.length, 1);
    assert.equal(training[0].nombre, 'Lic. Javier Morales');

    const observador = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      selectedCalificacion: 'Observador',
    });
    assert.equal(observador.length, 1);
    assert.equal(observador[0].nombre, 'Ing. Patricia Salcedo');
  });

  it('filters auditors by accredited standard facet', () => {
    const iso27001 = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      selectedStandard: 'ISO/IEC 27001',
    });
    assert.equal(iso27001.length, 1);
    assert.equal(iso27001[0].nombre, 'Ing. Roberto Silva');
  });

  it('filters auditors by IAF technical sector facet', () => {
    const sector14 = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      selectedSectorIaf: '14',
    });
    assert.equal(sector14.length, 2);
    assert.ok(sector14.some((a) => a.nombre === 'Dra. Ana Belén Torres'));
    assert.ok(sector14.some((a) => a.nombre === 'Ing. Patricia Salcedo'));
  });

  it('sorts auditors alphabetically ascending and descending', () => {
    const asc = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      sortColumn: 'nombre',
      sortDirection: 'asc',
    });
    assert.equal(asc[0].nombre, 'Auditor Técnico Evaluador');

    const desc = filterAuditors(INITIAL_AUDITORES_DETAILED, {
      sortColumn: 'nombre',
      sortDirection: 'desc',
    });
    assert.equal(desc[0].nombre, 'Lic. Javier Morales');
  });

  it('provides visual metadata for qualification statuses and audit roles', () => {
    const calificadoVisual = getQualificationStatusVisual('Calificado');
    assert.equal(calificadoVisual.label, 'CALIFICADO');
    assert.ok(calificadoVisual.badgeClass.includes('emerald'));

    const trainingVisual = getQualificationStatusVisual('En Entrenamiento');
    assert.equal(trainingVisual.label, 'EN ENTRENAMIENTO');
    assert.ok(trainingVisual.badgeClass.includes('amber'));

    const leadRole = getAuditRoleVisual('Auditor Líder');
    assert.equal(leadRole.label, 'Auditor Líder');
    assert.ok(leadRole.badgeClass.includes('indigo'));
  });
});
