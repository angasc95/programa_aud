# Phase 1.1: Soft-Delete Schema, Retention Triggers, Dependency Guard & Partial Indexes

> **Parent Phase:** Phase 1 — Database Soft-Delete & Governance Foundation  
> **Depends On:** Foundational SQL Schema (`00_delete_tables.sql`, `01_creacion.sql`)  
> **Unlocks:** [`phase_1.2.md`](./phase_1.2.md) (RLS Write Hardening & Profile Self-Update)

---

## 1. Objectives & Scope

Currently, `public/supabase/queries/01_creacion.sql` relies on `ON DELETE CASCADE` and `ON DELETE RESTRICT` without soft-delete retention columns, and `public/supabase/queries/03_indices_optimizacion.sql` enforces global `UNIQUE` constraints on business keys. Physical `DELETE` statements on leaf tables (`sitio`, `proceso`, `hallazgo`, `acreditacion_norma_iaf`, `requisitos_no_aplicables_certificado`) or cascading parents permanently erase records and break historical entity references inside `public.audit_log`.

**Phase 1.1** focuses exclusively on the **structural PostgreSQL schema, triggers, dependency RPCs, LTREE coverage queries, and partial indexes** across `01_creacion.sql`, `02_cobertura_normativa.sql`, and `03_indices_optimizacion.sql`:
1. Add universal soft-delete retention columns (`deleted_at`, `deleted_by`, `delete_reason`) across all domain, operational, and catalog tables.
2. Implement database-level hard-delete prevention (`fn_prevent_hard_delete()`) and automatic archival metadata synchronization (`fn_sync_soft_delete_metadata()`).
3. Implement a `BEFORE UPDATE` profile RBAC lock trigger (`fn_protect_profile_rbac_fields()`) in `01_creacion.sql` to prepare for safe self-service `Perfil` updates in Phase 1.2 / 2.2.
4. Provide read-only dependency inspection (`get_archive_dependency_summary`) and guarded archival support so parent records cannot silently orphan active children.
5. Synchronize `02_cobertura_normativa.sql` and `03_indices_optimizacion.sql` so archived records never distort ISO 17021-1 compliance scores or block business-key reuse.

---

## 2. Exact Table Inventory & Retention Policy (`31` Public Tables)

Every table in `public` is explicitly classified below to eliminate ambiguity during DDL migration:

1. **17 Core & Catalog Entity Tables (Strict Soft-Delete + `BEFORE DELETE` Block Trigger):**
   - **Domain 1 (10 tables):** `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`
   - **Domain 2 (5 tables):** `organizacion`, `certificado`, `sitio`, `proceso`, `turno`
   - **Domain 3 (2 tables):** `auditoria`, `hallazgo`
   - *Columns added:* `deleted_at TIMESTAMPTZ DEFAULT NULL`, `deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`, `delete_reason TEXT`.
   - *Triggers:* `trg_prevent_hard_delete_<table_name>` (`BEFORE DELETE`), `trg_sync_soft_delete_<table_name>` (`BEFORE UPDATE`), and `audit_<table_name>_trigger` (`AFTER INSERT OR UPDATE OR DELETE`).

2. **6 Operational Child / Schedule / Exclusion Tables with UUID PK (Soft-Delete Enabled):**
   - `requisitos_no_aplicables_certificado`, `turnos_por_sitio`, `comentarios_por_auditoria`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria`.
   - *Columns added:* `deleted_at TIMESTAMPTZ DEFAULT NULL`, `deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`.
   - *Behavior:* Protected by `fn_prevent_hard_delete()` so schedule history and justified ISO 4.3 exclusions remain auditable.

3. **5 Pure Composite-PK Many-to-Many Junction Tables:**
   - `norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`, `requisitos_por_proceso`, `equipo_auditor`.
   - *Policy:* Retain controlled link detachment (`DELETE` on assignment join row only when unassigning a competency, clause mapping, or auditor role), while adding `deleted_at TIMESTAMPTZ DEFAULT NULL` optional soft-deactivation support if historical assignment freezing is needed. **Primary entities remain strictly non-deletable.**

4. **3 Governance & Access Tables:**
   - `public.profiles`: Governed by `auth.users(id) ON DELETE CASCADE` and `fn_protect_profile_rbac_fields()`; audited via `audit_profiles_trigger`.
   - `public.client_organization_access`: Governed by `estado` (`PENDING` / `APPROVED` / `REJECTED`) + `deleted_at TIMESTAMPTZ DEFAULT NULL`.
   - `public.audit_log`: Strictly immutable (`trg_audit_log_immutable` blocks `UPDATE` and `DELETE`).

---

## 3. Technical Specifications

### 3.1 Hard-Delete Prevention & Metadata Sync Triggers (`01_creacion.sql`)

```sql
CREATE OR REPLACE FUNCTION public.fn_prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operación bloqueada: la tabla public.% utiliza retención lógica (soft-delete). Actualice deleted_at en lugar de ejecutar DELETE.', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_soft_delete_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        NEW.deleted_by := COALESCE(NEW.deleted_by, auth.uid());
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        NEW.deleted_by := NULL;
        NEW.delete_reason := NULL;
    END IF;
    RETURN NEW;
END;
$$;
```

- Ensure `audit_trigger_func()` is attached to all 17 core/catalog tables (including `requisito`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor` in addition to the existing 13 audited tables) and `profiles`, so archiving (`deleted_at` `NULL → TIMESTAMPTZ`) and restoring (`TIMESTAMPTZ → NULL`) emit complete `old_data` / `new_data` JSONB entries in `public.audit_log`.

### 3.2 Profile RBAC Guard Trigger (`01_creacion.sql`)

```sql
CREATE OR REPLACE FUNCTION public.fn_protect_profile_rbac_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_approved_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Violación RBAC: solo un administrador aprobado puede modificar role o status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
```

*(Note: Ensure `is_approved_admin()` is declared before attaching the trigger, or create the trigger in `01_creacion.sql` / bind cleanly after helper function creation in `04_rls.sql` so lexical SQL execution order `01 → 04` never fails on missing function definitions.)*

### 3.3 Active-Child Dependency Summary & Archival Guard (`01_creacion.sql` / `02_cobertura_normativa.sql`)

- **Read-Only Dependency RPC:** `public.get_archive_dependency_summary(p_table TEXT, p_record_id UUID) RETURNS JSONB`
  - Inspects active (`deleted_at IS NULL`) dependent children across direct foreign keys (e.g., `organizacion` → active `certificado`; `certificado` → active `sitio`, `proceso`, `auditoria`; `sitio` → active `sitios_por_auditoria`, `turnos_por_sitio`; `norma` → active `certificado`, `requisito`, `acreditacion_norma_iaf`; `sector_iaf` → active `subsector_iaf`, `certificado`, `acreditacion_norma_iaf`).
  - Returns `{ "can_archive": boolean, "total_active_dependencies": int, "dependencies": [{ "table": text, "label": text, "count": int }] }`.
- **Parent Archival Guard Trigger:** `BEFORE UPDATE` check on `organizacion`, `certificado`, `norma`, `sector_iaf`, `sitio`, and `auditoria` when transitioning `OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`: blocks archival with a descriptive exception if active child records remain (plus enforces that `sitio` with `numero_sitio = 0` cannot be archived while secondary active sites `numero_sitio > 0` exist on the same `certificado`).

### 3.4 LTREE Coverage & Competence Functions (`02_cobertura_normativa.sql`)

Update all 4 functions in `02_cobertura_normativa.sql` to ignore soft-deleted records (`deleted_at IS NULL`):
- `evaluar_cobertura_certificado(UUID)`: Filter `c.deleted_at IS NULL`, `p.deleted_at IS NULL`, `req.deleted_at IS NULL`, and `rna.deleted_at IS NULL`.
- `cobertura_normativa_certificado(UUID)`: Inherits filtered output cleanly.
- `auditor_esta_calificado(...)` & `auditores_calificados_para_certificado(UUID)`: Filter `c.deleted_at IS NULL` and `a.deleted_at IS NULL`.

### 3.5 Partial Unique Indexes & Active Query Indexes (`03_indices_optimizacion.sql`)

1. Convert table-level global `UNIQUE` constraints on mutable business keys in `01_creacion.sql` into **partial unique indexes (`WHERE deleted_at IS NULL`)** in `03_indices_optimizacion.sql`:
   - `uq_norma_codigo_active` (`norma(codigo)`)
   - `uq_sector_iaf_numero_active` (`sector_iaf(sector)`)
   - `uq_subsector_codigo_active` (`subsector_iaf(codigo)`)
   - `uq_organismo_codigo_active` (`organismo_acreditacion(codigo)`)
   - `uq_estatus_nombre_active` (`estatus(estatus)`)
   - `uq_tipo_auditoria_nombre_active` (`tipo_auditoria(tipo)`)
   - `uq_metodologia_nombre_active` (`metodologia_auditoria(metodologia)`)
   - `uq_certificado_numero_active` (`certificado(numero_certificado)`)
   - `uq_sitio_cert_numero_active` (`sitio(id_certificado, numero_sitio)`)
   - `uq_proceso_cert_nombre_active` (`proceso(id_certificado, nombre_proceso)`)
   - `uq_turno_horario_active` (`turno(hora_entrada, hora_salida)`)
   - `uq_requisito_norma_codigo_active` (`requisito(id_norma, codigo)`)
2. Add partial active-record lookup indexes (`WHERE deleted_at IS NULL`) on `organizacion`, `certificado`, `sitio`, `proceso`, `auditoria`, `hallazgo`, `acreditacion_norma_iaf`, and `auditor`.

---

## 4. Implementation Checklist

- [ ] Add `deleted_at`, `deleted_by`, and `delete_reason` columns to the 23 soft-deleted tables in `public/supabase/queries/01_creacion.sql`.
- [ ] Replace inline table-level `UNIQUE` constraints on mutable business keys in `01_creacion.sql` with partial unique indexes in `03_indices_optimizacion.sql`.
- [ ] Implement `fn_prevent_hard_delete()`, `fn_sync_soft_delete_metadata()`, `fn_protect_profile_rbac_fields()`, and `get_archive_dependency_summary()` + archival guard triggers.
- [ ] Attach `BEFORE DELETE`, `BEFORE UPDATE`, and `audit_trigger_func()` triggers across all protected entity tables.
- [ ] Add `AND deleted_at IS NULL` predicates to all CTEs and competence joins in `public/supabase/queries/02_cobertura_normativa.sql`.
- [ ] Define all partial unique indexes and active covering indexes in `public/supabase/queries/03_indices_optimizacion.sql`.

---

## 5. Acceptance Criteria

1. Executing `DELETE FROM public.organizacion WHERE ...` or `DELETE FROM public.certificado WHERE ...` raises `Operación bloqueada: la tabla public.<tabla> utiliza retención lógica (soft-delete)`.
2. Updating `deleted_at = NOW()` automatically populates `deleted_by = auth.uid()` and records an immutable `UPDATE` snapshot in `public.audit_log`; restoring (`deleted_at = NULL`) clears `deleted_by` and `delete_reason`.
3. Archiving a `certificado` or `norma` allows creating a new active record with the same `numero_certificado` or `codigo` without unique-constraint collisions.
4. `evaluar_cobertura_certificado()` excludes archived `proceso` and `requisitos_no_aplicables_certificado` rows from ISO 17021-1 coverage calculations.
5. `get_archive_dependency_summary()` accurately reports active child counts and parent archival triggers block unsafe parent soft-deletes.

