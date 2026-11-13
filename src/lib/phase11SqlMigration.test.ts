import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const QUERIES_DIR = path.resolve(process.cwd(), 'public', 'supabase', 'queries');

function readSql(fileName: string): string {
  return fs.readFileSync(path.join(QUERIES_DIR, fileName), 'utf8');
}

function extractTableBlock(sql: string, tableName: string): string {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `CREATE TABLE IF NOT EXISTS (?:public\\.)?${escaped}\\s*\\(([\\s\\S]*?)\\n\\);`,
    'i'
  );
  const match = sql.match(pattern);
  assert.ok(match, `Missing CREATE TABLE block for ${tableName}`);
  return match[1];
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

const CORE_TABLES = [
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
  'organizacion',
  'certificado',
  'sitio',
  'proceso',
  'turno',
  'auditoria',
  'hallazgo',
] as const;

const OPERATIONAL_CHILD_TABLES = [
  'requisitos_no_aplicables_certificado',
  'turnos_por_sitio',
  'comentarios_por_auditoria',
  'sitios_por_auditoria',
  'turnos_sitio_auditoria',
  'procesos_sitio_auditoria',
] as const;

test('Phase 1.1: all 17 core tables and 6 operational child tables declare soft-delete columns in 01_creacion.sql', () => {
  const sql01 = readSql('01_creacion.sql');

  for (const table of CORE_TABLES) {
    const block = extractTableBlock(sql01, table);
    assert.match(block, /\bdeleted_at\s+TIMESTAMPTZ\s+DEFAULT\s+NULL/i, `${table} missing deleted_at`);
    assert.match(
      block,
      /\bdeleted_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON DELETE SET NULL/i,
      `${table} missing deleted_by`
    );
    assert.match(block, /\bdelete_reason\s+TEXT/i, `${table} missing delete_reason`);
  }

  for (const table of OPERATIONAL_CHILD_TABLES) {
    const block = extractTableBlock(sql01, table);
    assert.match(block, /\bdeleted_at\s+TIMESTAMPTZ\s+DEFAULT\s+NULL/i, `${table} missing deleted_at`);
    assert.match(
      block,
      /\bdeleted_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON DELETE SET NULL/i,
      `${table} missing deleted_by`
    );
  }

  const clientAccessBlock = extractTableBlock(sql01, 'client_organization_access');
  assert.match(clientAccessBlock, /\bdeleted_at\s+TIMESTAMPTZ\s+DEFAULT\s+NULL/i);
  assert.match(
    clientAccessBlock,
    /\bdeleted_by\s+UUID\s+REFERENCES\s+auth\.users\(id\)\s+ON DELETE SET NULL/i
  );
});

test('Phase 1.1: mutable business-key tables remove global UNIQUE constraints from 01_creacion.sql and define partial unique indexes in 03_indices_optimizacion.sql', () => {
  const sql01 = readSql('01_creacion.sql');
  const sql03 = readSql('03_indices_optimizacion.sql');

  const tablesWithoutGlobalUnique = [
    'norma',
    'requisito',
    'sector_iaf',
    'subsector_iaf',
    'organismo_acreditacion',
    'estatus',
    'tipo_auditoria',
    'metodologia_auditoria',
    'certificado',
    'sitio',
    'proceso',
    'requisitos_no_aplicables_certificado',
    'turno',
    'turnos_por_sitio',
    'sitios_por_auditoria',
  ];

  for (const table of tablesWithoutGlobalUnique) {
    const block = extractTableBlock(sql01, table);
    assert.doesNotMatch(
      block,
      /\bUNIQUE\b/i,
      `${table} should not retain a global UNIQUE constraint in 01_creacion.sql`
    );
  }

  const expectedPartialUniqueIndexes = [
    'uq_norma_codigo_active ON public.norma (codigo) WHERE deleted_at IS NULL',
    'uq_requisito_norma_codigo_active ON public.requisito (id_norma, codigo) WHERE deleted_at IS NULL',
    'uq_sector_iaf_numero_active ON public.sector_iaf (sector) WHERE deleted_at IS NULL',
    'uq_subsector_codigo_active ON public.subsector_iaf (codigo) WHERE deleted_at IS NULL',
    'uq_organismo_codigo_active ON public.organismo_acreditacion (codigo) WHERE deleted_at IS NULL',
    'uq_estatus_nombre_active ON public.estatus (estatus) WHERE deleted_at IS NULL',
    'uq_tipo_auditoria_nombre_active ON public.tipo_auditoria (tipo) WHERE deleted_at IS NULL',
    'uq_metodologia_nombre_active ON public.metodologia_auditoria (metodologia) WHERE deleted_at IS NULL',
    'uq_certificado_numero_active ON public.certificado (numero_certificado) WHERE deleted_at IS NULL',
    'uq_sitio_cert_numero_active ON public.sitio (id_certificado, numero_sitio) WHERE deleted_at IS NULL',
    'uq_proceso_cert_nombre_active ON public.proceso (id_certificado, nombre_proceso) WHERE deleted_at IS NULL',
    'uq_req_no_aplicable_cert_req_active ON public.requisitos_no_aplicables_certificado (id_certificado, id_requisito) WHERE deleted_at IS NULL',
    'uq_turno_horario_active ON public.turno (hora_entrada, hora_salida) WHERE deleted_at IS NULL',
    'uq_turnos_por_sitio_active ON public.turnos_por_sitio (id_sitio, id_turno) WHERE deleted_at IS NULL',
    'uq_sitios_por_auditoria_active ON public.sitios_por_auditoria (id_auditoria, id_sitio) WHERE deleted_at IS NULL',
  ];

  for (const idxDef of expectedPartialUniqueIndexes) {
    assert.ok(
      sql03.includes(`CREATE UNIQUE INDEX IF NOT EXISTS ${idxDef};`),
      `Missing partial unique index: ${idxDef}`
    );
  }
});

test('Phase 1.1: retention, RBAC guard, dependency summary RPC, and archival triggers are properly implemented in 01_creacion.sql', () => {
  const sql01 = readSql('01_creacion.sql');

  const preventFn = extractFunctionBlock(sql01, 'fn_prevent_hard_delete');
  assert.match(preventFn, /Operación bloqueada: la tabla public\.% utiliza retención lógica/i);

  const syncFn = extractFunctionBlock(sql01, 'fn_sync_soft_delete_metadata');
  assert.match(syncFn, /NEW\.deleted_by\s*:=\s*COALESCE\(NEW\.deleted_by,\s*auth\.uid\(\)\)/i);
  assert.match(syncFn, /NEW\.delete_reason\s*:=\s*NULL/i);
  assert.doesNotMatch(syncFn, /jsonb_populate_record/i);

  const syncChildFn = extractFunctionBlock(sql01, 'fn_sync_soft_delete_child_metadata');
  assert.match(syncChildFn, /NEW\.deleted_by\s*:=\s*COALESCE\(NEW\.deleted_by,\s*auth\.uid\(\)\)/i);
  assert.doesNotMatch(syncChildFn, /delete_reason/i);

  const rbacFn = extractFunctionBlock(sql01, 'fn_protect_profile_rbac_fields');
  assert.match(rbacFn, /session_user IN \('postgres', 'supabase_admin', 'service_role'\)/i);
  assert.doesNotMatch(rbacFn, /\bcurrent_user\b/i);
  assert.match(rbacFn, /NOT public\.is_approved_admin\(\)/i);
  assert.match(rbacFn, /NEW\.role IS DISTINCT FROM OLD\.role OR NEW\.status IS DISTINCT FROM OLD\.status/i);

  const summaryFn = extractFunctionBlock(sql01, 'get_archive_dependency_summary');
  for (const parentCase of [
    'organizacion',
    'certificado',
    'sitio',
    'proceso',
    'turno',
    'auditoria',
    'norma',
    'requisito',
    'sector_iaf',
    'organismo_acreditacion',
    'estatus',
    'tipo_auditoria',
    'metodologia_auditoria',
  ]) {
    assert.ok(summaryFn.includes(`WHEN '${parentCase}' THEN`), `Missing dependency case for ${parentCase}`);
  }
  assert.match(summaryFn, /v_sitio_numero = 0[\s\S]*numero_sitio > 0[\s\S]*deleted_at IS NULL/i);

  // Confirm all 17 core tables + profiles + 6 child tables are wired to audit_trigger_func()
  const auditedTables = [...CORE_TABLES, ...OPERATIONAL_CHILD_TABLES, 'profiles', 'client_organization_access'];
  for (const table of auditedTables) {
    const hasExplicitTrigger = new RegExp(`ON public\\.${table}\\s+FOR EACH ROW EXECUTE FUNCTION public\\.audit_trigger_func`, 'i').test(sql01);
    const hasLoopTrigger = sql01.includes(`'${table}'`) && sql01.includes(`CREATE TRIGGER audit_%I_trigger`);
    assert.ok(hasExplicitTrigger || hasLoopTrigger, `Missing audit_trigger_func() wiring for ${table}`);
  }
});

test('Phase 1.1: 02_cobertura_normativa.sql excludes archived records in all 4 LTREE and competence functions', () => {
  const sql02 = readSql('02_cobertura_normativa.sql');

  const evaluarFn = extractFunctionBlock(sql02, 'evaluar_cobertura_certificado');
  assert.match(evaluarFn, /c\.deleted_at IS NULL/i);
  assert.match(evaluarFn, /n\.deleted_at IS NULL/i);
  assert.match(evaluarFn, /p\.deleted_at IS NULL/i);
  assert.match(evaluarFn, /req\.deleted_at IS NULL/i);
  assert.match(evaluarFn, /rna\.deleted_at IS NULL/i);
  assert.match(evaluarFn, /r_all\.deleted_at IS NULL/i);

  const calificadoFn = extractFunctionBlock(sql02, 'auditor_esta_calificado');
  assert.match(calificadoFn, /a\.deleted_at IS NULL/i);
  assert.match(calificadoFn, /n\.deleted_at IS NULL/i);
  assert.match(calificadoFn, /s\.deleted_at IS NULL/i);
  assert.match(calificadoFn, /ss\.deleted_at IS NULL/i);

  const calificadosCertFn = extractFunctionBlock(sql02, 'auditores_calificados_para_certificado');
  assert.match(calificadosCertFn, /c\.deleted_at IS NULL/i);
  assert.match(calificadosCertFn, /n\.deleted_at IS NULL/i);
  assert.match(calificadosCertFn, /s\.deleted_at IS NULL/i);
  assert.match(calificadosCertFn, /a\.deleted_at IS NULL/i);
});

test('Phase 1.1: 06_datos_prueba.sql matches partial unique indexes with WHERE deleted_at IS NULL', () => {
  const sql06 = readSql('06_datos_prueba.sql');

  const expectedConflictPredicates = [
    'ON CONFLICT (estatus) WHERE deleted_at IS NULL',
    'ON CONFLICT (tipo) WHERE deleted_at IS NULL',
    'ON CONFLICT (metodologia) WHERE deleted_at IS NULL',
    'ON CONFLICT (sector) WHERE deleted_at IS NULL',
    'ON CONFLICT (codigo) WHERE deleted_at IS NULL',
    'ON CONFLICT (numero_certificado) WHERE deleted_at IS NULL',
    'ON CONFLICT (id_certificado, numero_sitio) WHERE deleted_at IS NULL',
    'ON CONFLICT (hora_entrada, hora_salida) WHERE deleted_at IS NULL',
    'ON CONFLICT (id_sitio, id_turno) WHERE deleted_at IS NULL',
    'ON CONFLICT (id_certificado, nombre_proceso) WHERE deleted_at IS NULL',
    'ON CONFLICT (id_certificado, id_requisito) WHERE deleted_at IS NULL',
    'ON CONFLICT (id_auditoria, id_sitio) WHERE deleted_at IS NULL',
  ];

  for (const clause of expectedConflictPredicates) {
    assert.ok(sql06.includes(clause), `Missing partial ON CONFLICT predicate in 06_datos_prueba.sql: ${clause}`);
  }
});
