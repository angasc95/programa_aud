# Phase 1.2: Granular RLS Write Hardening, Archive Visibility & Profile Self-Update Governance

> **Parent Phase:** Phase 1 — Database Soft-Delete & Governance Foundation  
> **Depends On:** [`phase_1.1.md`](./phase_1.1.md) (Soft-Delete Columns, Partial Indexes & `fn_protect_profile_rbac_fields()`)  
> **Unlocks:** [`phase_2.1.md`](./phase_2.1.md), [`phase_2.2.md`](./phase_2.2.md) (Perfil View), [`phase_5.1.md`](./phase_5.1.md) (Safe Archive & Admin Restore UX)

---

## 1. Objectives & Scope

Currently, `public/supabase/queries/04_rls.sql` grants broad `FOR ALL TO authenticated` policies across operational and catalog tables—which implicitly authorizes physical `DELETE` operations—and defines `profiles_update_admin_only`, which blocks authenticated users from editing their own display name (`nombre`) in the upcoming **`Perfil`** view.

**Phase 1.2** hardens the **Row Level Security (RLS) layer, DCL permissions, and seed validation** (`04_rls.sql`, `05_usuarios.sql`, `06_datos_prueba.sql`) on top of Phase 1.1's schema:
1. Replace every `FOR ALL` RLS policy on soft-deleted primary, operational, and catalog tables with explicit **`FOR INSERT`** and **`FOR UPDATE`** policies (zero `FOR DELETE` policies).
2. Enforce `deleted_at IS NULL` visibility filters on standard `SELECT` policies while allowing `ADMIN` (`is_approved_admin()`) to inspect archived records for audit review and restoration.
3. Enable safe self-service profile updates (`profiles_update_self`) paired with `fn_protect_profile_rbac_fields()` so `role` and `status` cannot be escalated by non-admins.
4. Validate end-to-end SQL execution via `POST /api/reset-db` (`00_delete_tables.sql` through `06_datos_prueba.sql`).

---

## 2. Current State Gap Analysis (`04_rls.sql`)

| Area | Current Behavior in `04_rls.sql` | Target State in Phase 1.2 |
| :--- | :--- | :--- |
| **Catalog & Competence Write Policies** (lines 166–206) | 14 policies use `FOR ALL TO authenticated` (`catalog_*_write_worker`), implicitly granting `DELETE`. | Primary/catalog tables (`norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `turno`) split into explicit `FOR INSERT` and `FOR UPDATE` policies. Pure M:N link tables (`norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`) retain explicit `FOR INSERT` + `FOR DELETE` for competency detachment. |
| **Operational Domain Write Policies** (lines 229–416) | `organizacion_write_worker`, `certificado_write_worker`, `sitio_write_worker`, `proceso_write_worker`, `auditoria_write_worker`, `hallazgo_write_auditor_or_worker`, etc. all use `FOR ALL`. | Replace with explicit `FOR INSERT` and `FOR UPDATE` policies. Only pure M:N link tables (`requisitos_por_proceso`, `equipo_auditor`) retain `FOR DELETE` for link unassignment. |
| **Read Visibility (`SELECT`)** | `SELECT` policies return all rows regardless of `deleted_at`. | Standard operational `SELECT` policies include `deleted_at IS NULL` for `WORKER`, `AUDITOR`, `CLIENT`, and `anon`, while `public.is_approved_admin()` may inspect both active and archived (`deleted_at IS NOT NULL`) rows. |
| **Helper Functions (`is_auditor_for_*`, `has_client_org_access`)** | Join across `certificado`, `auditoria`, `organizacion` without checking `deleted_at IS NULL`. | Add `AND c.deleted_at IS NULL` / `AND a.deleted_at IS NULL` inside `SECURITY DEFINER` RLS helper functions so archived chains never leak stale access. |
| **`public.profiles` Updates** (lines 212–213) | Only `profiles_update_admin_only` exists (`is_approved_admin()`). | Keep `profiles_update_admin_only` AND add `profiles_update_self` (`USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`), enforced alongside the `BEFORE UPDATE` trigger `trg_protect_profile_rbac_fields` from Phase 1.1. |

---

## 3. Technical Specifications

### 3.1 Granular Write Policy Pattern (`FOR INSERT` + `FOR UPDATE`, Zero `FOR DELETE`)

For every soft-deleted table (e.g., `organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`):

```sql
-- Example: public.certificado
CREATE POLICY "certificado_select" ON public.certificado
    FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.has_client_org_access(id_organizacion)
                OR public.is_auditor_for_cert(id)
            )
        )
    );

CREATE POLICY "certificado_insert_worker" ON public.certificado
    FOR INSERT TO authenticated
    WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);

CREATE POLICY "certificado_update_worker" ON public.certificado
    FOR UPDATE TO authenticated
    USING (public.is_approved_worker())
    WITH CHECK (
        public.is_approved_worker()
        AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid())
    );
```

- **Note on Catalog `SELECT` Policies:** Catalog tables (`norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `turno`) currently allow `anon` + `authenticated` reads. Update their `SELECT` policies to `(deleted_at IS NULL OR public.is_approved_admin())` so unauthenticated/non-admin callers only see active catalog entries.
- **Note on `hallazgo` & `comentarios_por_auditoria`:** Allow `is_approved_worker() OR is_assigned_auditor(id_auditoria)` for `INSERT`/`UPDATE`, while restricting archival (`deleted_at IS NOT NULL`) to `is_approved_worker()` (preventing an external auditor from hiding logged findings).

### 3.2 `public.profiles` Self-Update Policy & Trigger Binding

1. Attach `trg_protect_profile_rbac_fields` (`BEFORE UPDATE ON public.profiles`) after `public.is_approved_admin()` is defined so lexical script order `01` → `04` executes cleanly on fresh database resets.
2. Add self-update RLS policy:
   ```sql
   CREATE POLICY "profiles_update_self" ON public.profiles
       FOR UPDATE TO authenticated
       USING (auth.uid() = id)
       WITH CHECK (auth.uid() = id);
   ```
3. Grant `EXECUTE` on `public.get_archive_dependency_summary(TEXT, UUID)` to `authenticated`.
4. Ensure `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;` is paired with RLS enforcement and `REVOKE DELETE` on primary/catalog tables from `anon, authenticated` as defense-in-depth alongside `fn_prevent_hard_delete()`.

### 3.3 Seed & Reset Pipeline Verification (`05_usuarios.sql`, `06_datos_prueba.sql`)

- Confirm `06_datos_prueba.sql` inserts cleanly with `deleted_at = NULL` defaults and triggers active.
- Ensure `06_datos_prueba.sql` includes representative `organismo_acreditacion` and `acreditacion_norma_iaf` rows so the new `Acreditación` views (Phases 4.1.3 & 4.2.2) have rich live seed data immediately after reset.

---

## 4. Implementation Checklist

- [ ] Update `is_assigned_auditor`, `is_auditor_for_cert`, `is_auditor_for_org`, and `has_client_org_access` in `04_rls.sql` to filter `deleted_at IS NULL`.
- [ ] Replace all `FOR ALL` policies on primary, operational, and catalog tables in `04_rls.sql` with explicit `FOR INSERT` + `FOR UPDATE` policies (retaining `FOR DELETE` solely on pure M:N link tables).
- [ ] Update all `SELECT` policies in `04_rls.sql` to hide `deleted_at IS NOT NULL` from non-admin roles while preserving Admin inspection for restoration.
- [ ] Add `profiles_update_self` policy and verify `trg_protect_profile_rbac_fields` binding in `04_rls.sql`.
- [ ] Grant `EXECUTE` on `get_archive_dependency_summary` and test full ordered execution (`00` → `06`) via `/api/reset-db` or PostgreSQL runner.

---

## 5. Acceptance Criteria

1. Executing the full SQL script chain (`00_delete_tables.sql` through `06_datos_prueba.sql`) completes with zero errors or dependency ordering issues.
2. Non-admin users (`WORKER`, `AUDITOR`, `CLIENT`) never receive rows with `deleted_at IS NOT NULL` in any `SELECT` query, whereas `ADMIN` can query archived records for restoration.
3. No `FOR DELETE` RLS policy exists on any of the 23 soft-deleted tables.
4. An authenticated `WORKER`, `AUDITOR`, `CLIENT`, or `PENDING` user can `UPDATE` their own `profiles.nombre` via Supabase RLS, while attempting to change `profiles.role` or `profiles.status` is rejected with `Violación RBAC`.

