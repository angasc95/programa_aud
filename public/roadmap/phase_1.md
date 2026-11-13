# Phase 1: Database Soft-Delete Retention Strategy, Audit Integrity & Profile RBAC Hardening

## 1. Objectives & Architectural Rationale

Currently, `public/supabase/queries/01_creacion.sql` uses `ON DELETE CASCADE` and `ON DELETE RESTRICT` without soft-delete retention columns, and `public/supabase/queries/04_rls.sql` grants broad `FOR ALL` write policies to `ADMIN`/`WORKER` (`is_approved_worker()`). While `RESTRICT` blocks accidental deletion when children exist, leaf tables (`sitio`, `proceso`, `hallazgo`, `comentarios_por_auditoria`, `requisitos_no_aplicables_certificado`, `acreditacion_norma_iaf`) and parent cascades can still execute destructive physical `DELETE` operations, breaking foreign-key traceability or leaving orphan entity references inside `public.audit_log`.

Additionally, `public.profiles` currently permits updates **only** via `profiles_update_admin_only` (`is_approved_admin()`), blocking authenticated users from updating their own safe profile metadata (`nombre`) in the upcoming **`Perfil`** view.

Phase 1 establishes:
1. **Universal Soft-Delete Retention (`deleted_at`, `deleted_by`)** across all domain, operational, and catalog tables.
2. **Database-level Hard-Delete Prohibition** (`BEFORE DELETE` trigger) protecting `public.audit_log` continuity and child dependency integrity.
3. **Partial Unique Indexes & Coverage Function Updates** (`02_cobertura_normativa.sql`, `03_indices_optimizacion.sql`) so archived records never block new creations or distort ISO 17021-1 compliance calculations.
4. **Granular RLS & Profile Self-Update Guard (`04_rls.sql`)** eliminating `FOR DELETE` exposure while safely enabling self-service profile editing without role/status escalation.

---

## 2. Current State Gap Analysis

| File | Current Behavior | Gap to Resolve |
| :--- | :--- | :--- |
| `public/supabase/queries/01_creacion.sql` | 31 tables lack `deleted_at` / `deleted_by`; several FKs use `ON DELETE CASCADE`; unique constraints (`norma.codigo`, `organizacion`, `certificado.numero_certificado`, `sitio`, `proceso`, `turno`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `subsector_iaf`, `organismo_acreditacion`) are global | Add soft-delete columns; attach `prevent_hard_delete` trigger on core/catalog tables; ensure `audit_trigger_func()` records `SOFT_DELETE` / `RESTORE` transitions cleanly in `new_data` / `old_data` |
| `public/supabase/queries/02_cobertura_normativa.sql` | Coverage calculations (`evaluar_cobertura_certificado`, `cobertura_normativa_certificado`) aggregate `proceso`, `requisitos_por_proceso`, `requisitos_no_aplicables_certificado`, `requisito` without filtering `deleted_at IS NULL` | Filter `WHERE deleted_at IS NULL` in all coverage queries and recursive CTEs so archived processes/exclusions do not skew compliance scores |
| `public/supabase/queries/03_indices_optimizacion.sql` | Indexes span all rows regardless of archival state; global `UNIQUE` constraints prevent reusing codes of archived records | Replace global unique constraints on business keys with partial unique indexes (`WHERE deleted_at IS NULL`) and add `idx_*_active` partial indexes |
| `public/supabase/queries/04_rls.sql` | Uses `FOR ALL TO authenticated` policies (which implicitly grant `DELETE`); `profiles` has only `profiles_update_admin_only` | Replace `FOR ALL` with explicit `FOR INSERT` + `FOR UPDATE` policies; enforce `deleted_at IS NULL` in standard `SELECT` policies (or Admin-scoped archive view); add `profiles_update_self` paired with a `BEFORE UPDATE` role/status lock trigger |

---

## 3. Technical Specifications

### 3.1 Soft-Delete Schema Columns (`01_creacion.sql`)

Add `deleted_at TIMESTAMPTZ DEFAULT NULL` and `deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL` (plus optional `delete_reason TEXT` where regulatory justification is helpful) to all 17 primary & catalog entity tables:

- **Domain 1 (Catalogs, Standards & Competence):**
  - `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`
- **Domain 2 (Certification & Multisitio):**
  - `organizacion`, `certificado`, `sitio`, `proceso`, `requisitos_no_aplicables_certificado`, `turno`, `turnos_por_sitio`
- **Domain 3 (Audit Execution):**
  - `auditoria`, `comentarios_por_auditoria`, `hallazgo`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria`

*Note on Pure Junction Tables (`norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`, `requisitos_por_proceso`, `equipo_auditor`):*
- Junction tables without independent surrogate `id` columns either add `deleted_at TIMESTAMPTZ` (converted to soft-deactivation on `UPDATE` with `is_active` filtering) or retain controlled `DELETE` strictly on pure many-to-many link rows while all primary entities (`auditor`, `proceso`, `requisito`, `auditoria`) remain strictly soft-deleted. Document and enforce this distinction explicitly: **no primary entity or audit record may ever be physically deleted**.

### 3.2 Hard-Delete Prevention & Audit Integrity Triggers (`01_creacion.sql`)

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
```

1. Attach `BEFORE DELETE` trigger (`trg_prevent_hard_delete_<table_name>`) on all core & catalog tables (`organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `auditor`, `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`).
2. Add a `BEFORE UPDATE` helper trigger `fn_sync_soft_delete_metadata()` so whenever `OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`, `NEW.deleted_by` automatically defaults to `COALESCE(NEW.deleted_by, auth.uid())`, and when restored (`OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL`), `NEW.deleted_by := NULL`.
3. Ensure `audit_trigger_func()` remains attached to every primary table so archiving (`deleted_at` transitioning from `NULL` to `TIMESTAMPTZ`) and restoring (`TIMESTAMPTZ` back to `NULL`) are captured in `public.audit_log` with full `old_data` and `new_data` JSONB snapshots.

### 3.3 Dependency Guard Before Archiving (RPC / Trigger)

Archiving a parent record (`organizacion`, `certificado`, `norma`, `sector_iaf`, `sitio`, `auditoria`) must not silently orphan active children:
- Provide a read-only PostgreSQL RPC `public.get_archive_dependency_summary(p_table TEXT, p_record_id UUID) RETURNS JSONB` returning counts of active (`deleted_at IS NULL`) child records across direct foreign keys.
- Enforce a `BEFORE UPDATE` archival integrity check on `organizacion`, `certificado`, `norma`, `sector_iaf`, and `sitio` (when `NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL`) blocking archival if active (`deleted_at IS NULL`) dependent children remain, unless an explicit archival cascade RPC (`public.archive_entity_with_guard`) handles authorized leaf archival or informs the operator cleanly.

### 3.4 Partial Unique Indexes & Coverage Synchronization (`02` & `03`)

1. **`03_indices_optimizacion.sql`:**
   - Replace table-level `UNIQUE` constraints on mutable business keys (`norma.codigo`, `certificado.numero_certificado`, `subsector_iaf.codigo`, `organismo_acreditacion.codigo`, `estatus.estatus`, `tipo_auditoria.tipo`, `metodologia_auditoria.metodologia`, `sitio(id_certificado, numero_sitio)`, `proceso(id_certificado, nombre_proceso)`, `turno(hora_entrada, hora_salida)`) with partial unique indexes:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS uq_certificado_numero_active
       ON public.certificado (numero_certificado) WHERE deleted_at IS NULL;
     ```
   - Add covering partial indexes `(WHERE deleted_at IS NULL)` on high-frequency join keys (`certificado(id_organizacion)`, `sitio(id_certificado)`, `proceso(id_certificado)`, `auditoria(id_certificado)`, `hallazgo(id_auditoria)`, `acreditacion_norma_iaf(id_norma, id_sector_iaf)`).
2. **`02_cobertura_normativa.sql`:**
   - Update `evaluar_cobertura_certificado(UUID)` and `cobertura_normativa_certificado(UUID)` to add `AND deleted_at IS NULL` across `certificado`, `proceso`, `requisito`, and `requisitos_no_aplicables_certificado`.

### 3.5 Granular RLS Policies & Safe Profile Self-Update (`04_rls.sql`)

1. **Eliminate `FOR ALL` on Protected Entities:**
   - Replace all `FOR ALL` write policies on primary & catalog tables (`organizacion_write_worker`, `certificado_write_worker`, `sitio_write_worker`, `proceso_write_worker`, `auditoria_write_worker`, `hallazgo_*`, `catalog_*_write_worker`, etc.) with separate **`FOR INSERT`** and **`FOR UPDATE`** policies bound to `public.is_approved_worker()` (or `is_assigned_auditor` for `hallazgo`).
   - Do **not** define any `FOR DELETE` policy on soft-deleted primary/catalog tables.
2. **Active Visibility vs. Admin Archive Inspection:**
   - Standard operational `SELECT` policies include `deleted_at IS NULL` for non-admin roles (`WORKER`, `AUDITOR`, `CLIENT`, `anon`), while `public.is_approved_admin()` may inspect archived rows (`deleted_at IS NOT NULL`) exclusively for restoration/audit review.
3. **User Profile (`public.profiles`) Safe Self-Update:**
   - Keep `profiles_update_admin_only` for administrative approvals/role assignments (`ADMIN`).
   - Add `profiles_update_self`:
     ```sql
     CREATE POLICY "profiles_update_self" ON public.profiles
       FOR UPDATE TO authenticated
       USING (auth.uid() = id)
       WITH CHECK (auth.uid() = id);
     ```
   - Pair `profiles_update_self` with a **`BEFORE UPDATE` security trigger (`fn_protect_profile_rbac_fields()`)** in `01_creacion.sql`:
     - If `!public.is_approved_admin()`, any attempt where `NEW.role IS DISTINCT FROM OLD.role` or `NEW.status IS DISTINCT FROM OLD.status` raises an explicit authorization exception (`Violación RBAC: solo un administrador aprobado puede modificar role o status`).
     - Non-admin users can safely update `NEW.nombre` (and future non-privileged profile fields such as `telefono` or `cargo` if added) without any privilege escalation vector.
   - Ensure `public.profiles` also triggers `audit_trigger_func()` on `UPDATE` so profile edits are logged in `public.audit_log`.

---

## 4. Implementation Checklist

- [ ] Add `deleted_at` and `deleted_by` columns to all primary, operational, and catalog tables in `public/supabase/queries/01_creacion.sql`.
- [ ] Implement `fn_prevent_hard_delete()`, `fn_sync_soft_delete_metadata()`, and `fn_protect_profile_rbac_fields()` in `01_creacion.sql`.
- [ ] Attach `BEFORE DELETE` and `BEFORE UPDATE` triggers to all protected tables and `profiles`.
- [ ] Update `public/supabase/queries/02_cobertura_normativa.sql` functions to filter `deleted_at IS NULL`.
- [ ] Convert business-key unique constraints to partial unique indexes (`WHERE deleted_at IS NULL`) and add active-record indexes in `public/supabase/queries/03_indices_optimizacion.sql`.
- [ ] Replace `FOR ALL` RLS policies with explicit `FOR INSERT` + `FOR UPDATE` policies, add `deleted_at IS NULL` read guards, and add `profiles_update_self` in `public/supabase/queries/04_rls.sql`.
- [ ] Verify seed data in `public/supabase/queries/06_datos_prueba.sql` passes cleanly with `deleted_at IS NULL` defaults and triggers enabled.

---

## 5. Acceptance Criteria

1. Executing `DELETE FROM public.organizacion WHERE ...` or `DELETE FROM public.certificado WHERE ...` (even as `ADMIN`) fails cleanly at the PostgreSQL trigger layer with an explicit soft-delete retention error.
2. Archiving a record via `UPDATE ... SET deleted_at = NOW()` automatically populates `deleted_by = auth.uid()`, hides the record from non-admin `SELECT` queries, excludes it from ISO 17021-1 normative coverage calculations, and writes an immutable `UPDATE` entry in `public.audit_log`.
3. Creating a new `certificado` or `norma` with the same business code as an archived (`deleted_at IS NOT NULL`) record succeeds without unique-constraint collision.
4. An authenticated `WORKER`, `AUDITOR`, or `CLIENT` can `UPDATE` their own `profiles.nombre` via Supabase RLS, while attempting to modify `profiles.role` or `profiles.status` is rejected at both RLS and trigger layers.
