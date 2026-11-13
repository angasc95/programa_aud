# Phase 5.1: Safe Archive (`Soft-Delete`) Confirmation Modal, Admin Restore UX & Client Mutation Audit

> **Parent Phase:** Phase 5 — Governance Hardening, Test Regression & Release Verification  
> **Depends On:** [`phase_1.2.md`](./phase_1.2.md) (RLS & Dependency RPC), [`phase_4.1.3.md`](./phase_4.1.3.md), [`phase_4.2.3.md`](./phase_4.2.3.md) (All Multi Views & Detail Views Live)  
> **Unlocks:** [`phase_5.2.md`](./phase_5.2.md) (Automated Test Suite & Playwright E2E Release Gate)

---

## 1. Objectives & Scope

With PostgreSQL soft-delete triggers and RLS policies in place (Phases 1.1–1.2) and all Multi Views / Detail Views standardized (Phases 4.1–4.2), the frontend needs a cohesive, dependency-aware **Archive (`Soft-Delete`) & Admin Restore** user experience across every entity without any raw `.delete()` mutations on protected tables.

**Phase 5.1** delivers the safe archival & restoration layer:
1. Audit `src/` to guarantee **zero** Supabase `.delete()` mutations against the 23 soft-deleted primary, operational, and catalog tables.
2. Build `src/views/archiveModalView.ts` (plus `src/lib/archiveGovernance.ts` pure helper) wired to `get_archive_dependency_summary(table, recordId)` to display active child dependencies before allowing archival.
3. Wire `🗄️ Archivar` triggers across every Detail View's Record Zone (`ADMIN`/`WORKER`), automatically executing `UPDATE ... SET deleted_at = NOW()` + `delete_reason`, popping back via `popToParentBreadcrumb()`, and refreshing `public.audit_log`.
4. Add an **Admin-only** `"Mostrar Archivados"` filter toggle and `"Restaurar"` (`SET deleted_at = NULL`) action inside Multi Views while keeping archived records strictly hidden from `WORKER`, `AUDITOR`, and `CLIENT`.

---

## 2. Technical Specifications

### 2.1 Zero Hard-Delete Client Mutation Audit

- Inspect every `supabase.from(...)` call in `src/main.ts` and `src/lib/*`:
  - **Prohibited on primary/catalog/operational tables:** `.delete()` is strictly forbidden on `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `requisitos_no_aplicables_certificado`, `turnos_por_sitio`, `comentarios_por_auditoria`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria`.
  - **Permitted solely on pure M:N link tables:** `norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`, `requisitos_por_proceso`, `equipo_auditor` when detaching an assignment link.
  - All active hydration queries in `loadDomainData()` / `loadLiveCertificates()` explicitly filter `.is('deleted_at', null)` unless `ADMIN` has enabled `"Mostrar Archivados"`.

### 2.2 Dependency-Aware Archive Modal (`src/views/archiveModalView.ts`)

1. **Trigger:** Clicking `🗄️ Archivar` in any Detail View Record Zone (`ADMIN` or `WORKER`).
2. **Pre-Flight Dependency Check:**
   - Calls `supabase.rpc('get_archive_dependency_summary', { p_table, p_record_id })`.
   - **When `can_archive === false`** (e.g., `Organización` still has 2 active `Certificados`, or `Sitio 0` still has active secondary sites / audits):
     - Renders a clear warning summary listing each blocking child collection and count (`"2 Certificados activos"`, `"3 Auditorías vinculadas"`), disables the confirm button, and guides the operator to handle child records first.
   - **When `can_archive === true`:**
     - Displays an optional `"Motivo de archivo / retención"` text input (`maxlength="300"`).
     - Clicking `"Confirmar Archivo"` executes:
       ```ts
       supabase.from(table).update({
         deleted_at: new Date().toISOString(),
         delete_reason: reason || null,
       }).eq('id', recordId);
       ```
     - Pops the current Detail View segment cleanly via `popToParentBreadcrumb()`, removes/updates the entity in `AppState`, and displays confirmation toast.

### 2.3 Admin-Only Archive Inspection & Restoration

- In `universalTemplate.ts` and `main.ts`:
  - Render `"Mostrar Archivados"` checkbox toggle strictly when `isApprovedAdmin(state.profile)` is `true`.
  - Archived rows render with muted slate styling, an `"Archivado"` indicator (with formatted archival date & actor resolved without UUIDs), and an explicit `"Restaurar"` button (`ADMIN` only) executing `UPDATE ... SET deleted_at = NULL`.

---

## 3. Implementation Checklist

- [ ] Audit `src/` for `.delete()` calls and ensure all active hydration queries include `.is('deleted_at', null)` filtering.
- [ ] Create `src/lib/archiveGovernance.ts` (pure dependency formatting & payload helpers) and `src/views/archiveModalView.ts`.
- [ ] Wire `🗄️ Archivar` buttons across all 13 entity Detail Views (`Organización`, `Certificado`, `Auditor`, `Programación`, `Norma`, `Sector IAF`, `Acreditación`, `Sitio`, `Proceso`, `Turno`, `Estatus`, `Tipo`, `Metodología`) to the confirmation modal in `src/main.ts`.
- [ ] Add Admin-only `"Mostrar Archivados"` toggle and `"Restaurar"` flow in `universalTemplate.ts` and `src/main.ts`.

---

## 4. Acceptance Criteria

1. Zero `.delete()` calls exist in `src/` targeting any soft-deleted primary, operational, or catalog table.
2. Attempting to archive an `Organización` with active `Certificados` (or `Sitio 0` with active branches) displays exact dependency counts in the modal and blocks unsafe archival cleanly.
3. Archiving an unblocked record sets `deleted_at`, hides it immediately from operational views, records the transition in `public.audit_log`, and returns the user to the parent view without broken breadcrumbs.
4. `ADMIN` users can toggle `"Mostrar Archivados"` to inspect archived items and restore them (`deleted_at = NULL`), while `WORKER`, `AUDITOR`, and `CLIENT` never see archived records.
