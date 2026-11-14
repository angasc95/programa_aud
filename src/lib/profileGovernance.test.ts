import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSelfProfileUpdatePayload,
  canModifyProfileRole,
  canModifyProfileStatus,
  getProfileGovernanceMeta,
  validatePasswordChangeInput,
  type UserProfile,
} from './healthCheck';
import { renderProfileView, type ProfileFormState } from '../views/profileView';
import { assertZeroUuidExposure } from './zeroUuid';

const SAMPLE_PROFILES: UserProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Administrador Principal',
    role: 'ADMIN',
    status: 'APPROVED',
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Personal Técnico',
    role: 'WORKER',
    status: 'APPROVED',
    created_at: '2026-02-15T10:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nombre: 'Auditor Evaluador',
    role: 'AUDITOR',
    status: 'PENDING',
    created_at: '2026-03-20T11:00:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    nombre: 'Representante Cliente',
    role: 'CLIENT',
    status: 'REJECTED',
    created_at: '2026-04-05T12:00:00Z',
  },
];

function createFormState(nombreInput: string): ProfileFormState {
  return {
    nombreInput,
    savingProfile: false,
    profileFeedback: null,
    profileError: null,
    passwordSectionOpen: false,
    newPasswordInput: '',
    confirmPasswordInput: '',
    savingPassword: false,
    passwordFeedback: null,
    passwordError: null,
  };
}

test('Fase 5.2 ProfileGovernance: buildSelfProfileUpdatePayload emits strictly { nombre } and prevents role/status escalation', () => {
  const res = buildSelfProfileUpdatePayload('  Dra. Valeria Quiroz  ');
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.deepEqual(res.payload, { nombre: 'Dra. Valeria Quiroz' });
    assert.deepEqual(Object.keys(res.payload), ['nombre']);
    assert.equal('role' in res.payload, false);
    assert.equal('status' in res.payload, false);
  }
});

test('Fase 5.2 ProfileGovernance: buildSelfProfileUpdatePayload rejects empty, whitespace, too-short, >150 char, and UUID strings', () => {
  const empty = buildSelfProfileUpdatePayload('');
  assert.equal(empty.ok, false);

  const spaces = buildSelfProfileUpdatePayload('    \t\n  ');
  assert.equal(spaces.ok, false);

  const oneChar = buildSelfProfileUpdatePayload('X');
  assert.equal(oneChar.ok, false);

  const over150 = buildSelfProfileUpdatePayload('A'.repeat(151));
  assert.equal(over150.ok, false);

  const uuidLeak = buildSelfProfileUpdatePayload('Usuario 11111111-1111-1111-1111-111111111111');
  assert.equal(uuidLeak.ok, false);
});

test('Fase 5.2 ProfileGovernance: self-modification guards and read-only governance metadata prevent escalation', () => {
  assert.equal(canModifyProfileStatus('1111', '1111'), false);
  assert.equal(canModifyProfileRole('1111', '1111', 'APPROVED'), false);
  assert.equal(canModifyProfileRole('2222', '1111', 'PENDING'), false);
  assert.equal(canModifyProfileRole('2222', '1111', 'REJECTED'), false);

  for (const profile of SAMPLE_PROFILES) {
    const meta = getProfileGovernanceMeta(profile);
    assert.ok(meta.roleLabel.includes(profile.role));
    assert.ok(meta.statusLabel.includes(profile.status));
    assert.ok(meta.governanceNote.includes('Panel Aprobaciones'));

    const html = renderProfileView({
      profile,
      userEmail: `${profile.role.toLowerCase()}@fondonorma.test`,
      formState: createFormState(profile.nombre),
    });
    // Ensure role and status cannot be mutated via form inputs or selects
    assert.equal(/name=["'](role|status)["']/i.test(html), false);
    assert.equal(/<select[^>]+(role|status)/i.test(html), false);
    assert.ok(html.includes('id="profileNombreInput"'));
    assert.ok(html.includes(meta.roleLabel));
    assert.ok(html.includes(meta.statusLabel));
    assert.equal(assertZeroUuidExposure(html).compliant, true);
  }

  assert.equal(validatePasswordChangeInput('1234567', '1234567').ok, false);
  assert.equal(validatePasswordChangeInput('SecurePass1!', 'Different2!').ok, false);
  assert.equal(validatePasswordChangeInput('SecurePass1!', 'SecurePass1!').ok, true);
});
