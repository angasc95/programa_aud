import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserProfile } from './healthCheck';
import { assertZeroUuidExposure } from './zeroUuid';
import { INITIAL_CERTIFICADOS_DETAILED } from './multisiteSampling';
import { INITIAL_PROGRAMACION_AUDITS } from './auditExecution';
import { INITIAL_TURNO_CATALOG } from './sitioDomain';
import {
  canArchiveTurno,
  computeShiftDurationLabel,
  formatTurnoTime,
  isOvernightShift,
  resolveTurnoDetailById,
  validateTurnoInput,
} from './turnoDomain';
import { renderTurnoView } from '../views/turnoView';

const ADMIN_PROFILE: UserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Administrador Principal',
  role: 'ADMIN',
  status: 'APPROVED',
};

const AUDITOR_PROFILE: UserProfile = {
  id: '33333333-3333-3333-3333-333333333333',
  nombre: 'Auditor Líder',
  role: 'AUDITOR',
  status: 'APPROVED',
};

const CLIENT_PROFILE: UserProfile = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Usuario Cliente',
  role: 'CLIENT',
  status: 'APPROVED',
};

test('Phase 4.2.3: computeShiftDurationLabel handles standard, fractional, midnight, and overnight shifts', () => {
  assert.equal(formatTurnoTime('07:00:00'), '07:00');
  assert.equal(computeShiftDurationLabel('07:00:00', '15:00:00'), '8h 00m');
  assert.equal(isOvernightShift('07:00:00', '15:00:00'), false);

  assert.equal(computeShiftDurationLabel('08:00:00', '16:30:00'), '8h 30m');
  assert.equal(computeShiftDurationLabel('00:00:00', '08:00:00'), '8h 00m');

  assert.equal(computeShiftDurationLabel('22:00:00', '06:00:00'), '8h 00m (nocturno)');
  assert.equal(isOvernightShift('22:00:00', '06:00:00'), true);

  assert.equal(computeShiftDurationLabel('23:30', '05:45'), '6h 15m (nocturno)');
  assert.equal(computeShiftDurationLabel('bad', '15:00'), '—');
});

test('Phase 4.2.3: validateTurnoInput rejects invalid or equal times and accepts overnight ranges', () => {
  assert.equal(
    validateTurnoInput({
      hora_entrada: '25:00',
      hora_salida: '06:00',
    }).valid,
    false
  );

  assert.equal(
    validateTurnoInput({
      hora_entrada: '08:00',
      hora_salida: '08:00',
    }).valid,
    false
  );

  const overnight = validateTurnoInput({
    hora_entrada: '22:00',
    hora_salida: '06:00',
    descripcion: 'Turno Nocturno Automatizado',
  });
  assert.equal(overnight.valid, true);
  assert.equal(overnight.normalized?.hora_entrada, '22:00:00');
  assert.equal(overnight.normalized?.hora_salida, '06:00:00');
  assert.equal(overnight.normalized?.durationLabel, '8h 00m (nocturno)');
});

test('Phase 4.2.3: canArchiveTurno enforces turnos_por_sitio dependency guard', () => {
  const blocked = canArchiveTurno({ assignedSitiosCount: 2 });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reason?.includes('sede'));

  const allowed = canArchiveTurno({ assignedSitiosCount: 0 });
  assert.equal(allowed.allowed, true);
});

test('Phase 4.2.3: resolveTurnoDetailById populates Parent Zone when originatingSitioId is present and omits cleanly when global', () => {
  const cert = INITIAL_CERTIFICADOS_DETAILED[0];
  const sitio0 = cert.sitios.find((s) => s.numero_sitio === 0) || cert.sitios[0];
  const turno1 = INITIAL_TURNO_CATALOG[0];

  // Contextual navigation from Sitio -> Turno
  const contextual = resolveTurnoDetailById({
    turnoId: turno1.id,
    originatingSitioId: sitio0.id,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    shiftCatalog: INITIAL_TURNO_CATALOG,
  });
  assert.ok(contextual);
  assert.ok(contextual.parentSitio);
  assert.equal(contextual.parentSitio.id_sitio, sitio0.id);
  assert.equal(contextual.parentSitio.id_certificado, cert.id);
  assert.ok(contextual.sitios.length > 0);
  assert.ok(contextual.auditorias.length > 0);

  const contextualHtml = renderTurnoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedTurnoId: contextual.id,
      originatingSitioId: sitio0.id,
      activeChildTab: 'sitios',
      isEditingAttributes: false,
    },
    turno: contextual,
  });
  assert.ok(contextualHtml.includes('aria-label="Contexto y relaciones superiores"'));
  assert.ok(contextualHtml.includes('<hr class="border-t border-slate-200 my-4" />'));
  assert.ok(contextualHtml.includes('data-parent-nav="true"'));
  assert.ok(contextualHtml.includes('data-action="select-sitio"'));
  assert.ok(contextualHtml.includes('data-action="select-cert"'));
  assert.equal(assertZeroUuidExposure(contextualHtml).compliant, true);

  // Global navigation from Certificado > Turnos (no originatingSitioId -> omit Parent Zone + <hr>)
  const overnightShiftId = '70000000-0000-0000-0000-000000000099';
  const globalShift = resolveTurnoDetailById({
    turnoId: overnightShiftId,
    originatingSitioId: null,
    certificates: INITIAL_CERTIFICADOS_DETAILED,
    programacionAudits: INITIAL_PROGRAMACION_AUDITS,
    shiftCatalog: [
      ...INITIAL_TURNO_CATALOG,
      {
        id: overnightShiftId,
        hora_entrada: '22:00:00',
        hora_salida: '06:00:00',
        descripcion: 'Turno Nocturno Planta',
      },
    ],
  });
  assert.ok(globalShift);
  assert.equal(globalShift.parentSitio, null);
  assert.equal(globalShift.isOvernight, true);
  assert.equal(globalShift.durationLabel, '8h 00m (nocturno)');

  const globalHtml = renderTurnoView({
    profile: ADMIN_PROFILE,
    state: {
      selectedTurnoId: globalShift.id,
      originatingSitioId: null,
      activeChildTab: 'auditorias',
      isEditingAttributes: false,
    },
    turno: globalShift,
  });
  assert.equal(globalHtml.includes('aria-label="Contexto y relaciones superiores"'), false);
  assert.equal(globalHtml.includes('<hr class="border-t border-slate-200 my-4" />'), false);
  assert.ok(globalHtml.includes('8h 00m (nocturno)'));
  assert.equal(assertZeroUuidExposure(globalHtml).compliant, true);

  // RBAC: Auditor & Client are strictly read-only
  for (const readOnlyProfile of [AUDITOR_PROFILE, CLIENT_PROFILE]) {
    const readOnlyHtml = renderTurnoView({
      profile: readOnlyProfile,
      state: {
        selectedTurnoId: contextual.id,
        originatingSitioId: sitio0.id,
        activeChildTab: 'sitios',
        isEditingAttributes: true,
      },
      turno: contextual,
    });
    assert.equal(readOnlyHtml.includes('id="startEditTurnoBtn"'), false);
    assert.equal(readOnlyHtml.includes('id="editTurnoForm"'), false);
    assert.equal(readOnlyHtml.includes('data-action="open-archive-turno"'), false);
    assert.equal(assertZeroUuidExposure(readOnlyHtml).compliant, true);
  }
});
