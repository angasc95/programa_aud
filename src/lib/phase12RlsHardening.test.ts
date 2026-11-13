import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const QUERIES_DIR = path.resolve(process.cwd(), 'public', 'supabase', 'queries');

function readSql(fileName: string): string {
  return fs.readFileSync(path.join(QUERIES_DIR, fileName), 'utf8');
}

function extractFunctionBlock(sql: string, fnName: string): string {
  const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${escaped}\\s*\\([\\s\\S]*?\\n\\$\\$;`,
    'i'
  );
  const match = sql.match(pattern);
  assert.ok(match, `Missing CREATE OR REPLACE FUNCTION block for ${fnName}`);
  return match[0];
}

interface ParsedPolicy {
  name: string;
  table: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  body: string;
}

function parsePolicies(sql: string): ParsedPolicy[] {
  const policies: ParsedPolicy[] = [];
  const regex =
    /CREATE POLICY "([^"]+)" ON public\.([a-z0-9_]+)[\s\S]*?\bFOR (SELECT|INSERT|UPDATE|DELETE|ALL)\b([\s\S]*?);/gi;
  for (const match of sql.matchAll(regex)) {
    policies.push({
      name: match[1],
      table: match[2],
      command: match[3].toUpperCase() as ParsedPolicy['command'],
      body: match[4],
    });
  }
  return policies;
}

const SOFT_DELETED_TABLES = [
  'norma',
  'requisito',
  'sector_iaf',
  'subsector_iaf',
  'organismo_acreditacion',
  'acreditacion_norma_iaf',
  'estatus',
  'tipo_auditoria',
  'metodologia_auditoria',
  'auditor',
  'turno',
  'organizacion',
  'certificado',
  'sitio',
  'proceso',
  'auditoria',
  'hallazgo',
  'requisitos_no_aplicables_certificado',
  'turnos_por_sitio',
  'comentarios_por_auditoria',
  'sitios_por_auditoria',
  'turnos_sitio_auditoria',
  'procesos_sitio_auditoria',
] as const;

const PURE_MN_TABLES = [
  'norma_auditor',
  'sector_iaf_auditor',
  'subsector_iaf_auditor',
  'requisitos_por_proceso',
  'equipo_auditor',
] as const;

const GOVERNANCE_TABLES = ['profiles', 'client_organization_access', 'audit_log'] as const;

test('Phase 1.2: 04_rls.sql contains zero FOR ALL policies and restricts FOR DELETE solely to the 5 pure M:N tables', () => {
  const sql04 = readSql('04_rls.sql');
  const policies = parsePolicies(sql04);

  const forAllPolicies = policies.filter((p) => p.command === 'ALL');
  assert.deepEqual(
    forAllPolicies,
    [],
    `Found forbidden FOR ALL policies: ${forAllPolicies.map((p) => p.name).join(', ')}`
  );

  const deletePolicies = policies.filter((p) => p.command === 'DELETE');
  assert.deepEqual(
    deletePolicies.map((p) => p.table).sort(),
    [...PURE_MN_TABLES].sort(),
    'Only the 5 pure M:N junction tables may define FOR DELETE policies'
  );

  for (const table of [...SOFT_DELETED_TABLES, ...GOVERNANCE_TABLES]) {
    assert.ok(
      sql04.includes(`'${table}'`) && sql04.includes('REVOKE DELETE ON public.%I FROM anon, authenticated'),
      `Missing REVOKE DELETE defense-in-depth DCL for ${table}`
    );
  }
});

test('Phase 1.2: all 23 soft-deleted tables define explicit SELECT (active/admin), INSERT, and UPDATE policies', () => {
  const sql04 = readSql('04_rls.sql');
  const policies = parsePolicies(sql04);

  for (const table of SOFT_DELETED_TABLES) {
    const tablePolicies = policies.filter((p) => p.table === table);
    const selectPolicy = tablePolicies.find((p) => p.command === 'SELECT');
    const insertPolicy = tablePolicies.find((p) => p.command === 'INSERT');
    const updatePolicy = tablePolicies.find((p) => p.command === 'UPDATE');

    assert.ok(selectPolicy, `Missing SELECT policy on ${table}`);
    assert.ok(insertPolicy, `Missing INSERT policy on ${table}`);
    assert.ok(updatePolicy, `Missing UPDATE policy on ${table}`);

    assert.match(selectPolicy.body, /deleted_at IS NULL/i, `${table} SELECT must filter deleted_at IS NULL`);
    assert.match(selectPolicy.body, /public\.is_approved_admin\(\)/i, `${table} SELECT must allow Admin audit visibility`);
    assert.match(insertPolicy.body, /deleted_at IS NULL/i, `${table} INSERT must forbid inserting pre-deleted rows`);
  }
});

test('Phase 1.2: SECURITY DEFINER helper functions exclude archived chains via deleted_at IS NULL', () => {
  const sql04 = readSql('04_rls.sql');

  const assignedFn = extractFunctionBlock(sql04, 'is_assigned_auditor');
  assert.match(assignedFn, /a\.deleted_at IS NULL/i);
  assert.match(assignedFn, /c\.deleted_at IS NULL/i);

  const clientOrgFn = extractFunctionBlock(sql04, 'has_client_org_access');
  assert.match(clientOrgFn, /coa\.deleted_at IS NULL/i);
  assert.match(clientOrgFn, /o\.deleted_at IS NULL/i);

  const auditorCertFn = extractFunctionBlock(sql04, 'is_auditor_for_cert');
  assert.match(auditorCertFn, /a\.deleted_at IS NULL/i);
  assert.match(auditorCertFn, /c\.deleted_at IS NULL/i);

  const auditorOrgFn = extractFunctionBlock(sql04, 'is_auditor_for_org');
  assert.match(auditorOrgFn, /o\.deleted_at IS NULL/i);
  assert.match(auditorOrgFn, /c\.deleted_at IS NULL/i);
  assert.match(auditorOrgFn, /a\.deleted_at IS NULL/i);
});

test('Phase 1.2: auditors cannot archive hallazgos or comentarios_por_auditoria via UPDATE', () => {
  const sql04 = readSql('04_rls.sql');
  const policies = parsePolicies(sql04);

  for (const table of ['hallazgo', 'comentarios_por_auditoria']) {
    const updatePolicy = policies.find((p) => p.table === table && p.command === 'UPDATE');
    assert.ok(updatePolicy, `Missing UPDATE policy for ${table}`);
    assert.match(
      updatePolicy.body,
      /deleted_at IS NOT NULL\s+AND public\.is_approved_worker\(\)/i,
      `${table} UPDATE must restrict archival (deleted_at IS NOT NULL) to is_approved_worker()`
    );
  }
});

test('Phase 1.2: profiles self-update governance, RBAC trigger binding, and dependency RPC execute grants are configured', () => {
  const sql04 = readSql('04_rls.sql');
  const policies = parsePolicies(sql04);

  const adminUpdate = policies.find((p) => p.name === 'profiles_update_admin_only' && p.table === 'profiles');
  const selfUpdate = policies.find((p) => p.name === 'profiles_update_self' && p.table === 'profiles');
  assert.ok(adminUpdate && adminUpdate.command === 'UPDATE', 'Missing profiles_update_admin_only UPDATE policy');
  assert.ok(selfUpdate && selfUpdate.command === 'UPDATE', 'Missing profiles_update_self UPDATE policy');
  assert.match(selfUpdate.body, /USING\s*\(auth\.uid\(\) = id\)/i);
  assert.match(selfUpdate.body, /WITH CHECK\s*\(auth\.uid\(\) = id\)/i);

  assert.match(
    sql04,
    /CREATE TRIGGER trg_protect_profile_rbac_fields\s+BEFORE UPDATE ON public\.profiles[\s\S]*?fn_protect_profile_rbac_fields\(\)/i
  );
  assert.ok(
    sql04.includes('GRANT EXECUTE ON FUNCTION public.get_archive_dependency_summary(TEXT, UUID) TO authenticated;')
  );
  assert.ok(
    sql04.includes('REVOKE EXECUTE ON FUNCTION public.get_archive_dependency_summary(TEXT, UUID) FROM anon;')
  );

  const archiveFn = extractFunctionBlock(sql04, 'archive_record');
  assert.match(archiveFn, /IF NOT public\.is_approved_worker\(\) THEN/i);
  assert.ok(
    sql04.includes('GRANT EXECUTE ON FUNCTION public.archive_record(TEXT, UUID, TEXT) TO authenticated;')
  );
  assert.ok(
    sql04.includes('REVOKE EXECUTE ON FUNCTION public.archive_record(TEXT, UUID, TEXT) FROM anon;')
  );
});

test('Phase 1.2: 06_datos_prueba.sql includes representative accreditation bodies and accreditations with clean deleted_at defaults', () => {
  const sql06 = readSql('06_datos_prueba.sql');
  assert.ok(sql06.includes("'ENAC'"));
  assert.ok(sql06.includes("'UKAS'"));
  assert.ok(sql06.includes("'ANAB'"));
  assert.ok(sql06.includes("'01/C-SC001'"));
  assert.ok(sql06.includes("'0044-EMS'"));
  assert.ok(sql06.includes("'ANAB-ISMS-089'"));
});
