# Phase 5: Safe Deletion UX, Automated Test Suite (`node:test`) & End-to-End Verification

## 1. Objectives & Architectural Rationale

Every UI restructuring, navigation contract, and database soft-delete safeguard introduced across Phases 1–4.2 must be hardened against regressions before release. Existing tests (`src/lib/activeCertificates.test.ts`, `src/lib/multisiteSampling.test.ts`, `src/lib/breadcrumb.test.ts`, `src/lib/accessControl.test.ts`, `src/lib/healthCheck.test.ts`, `src/lib/phase62UiIntegrity.test.ts`) currently assert legacy behaviors—such as `"ZONA 1: METADATOS RELACIONALES"` headings, `"Auditorías"` plural header labels, and `drilldown` routes—that are intentionally retired by this upgrade.

Phase 5 completes the upgrade by:
1. Delivering safe **Archive (Soft-Delete) & Restore UX** wired to Phase 1 PostgreSQL triggers and `public.audit_log`.
2. Updating and expanding the **`node:test` unit & component test suite** to lock in every new invariant.
3. Executing full TypeScript compilation, production bundle verification, and live **Playwright headless Chromium** inspection across desktop and mobile viewports.

---

## 2. Current State Gap Analysis

| Area | Current State | Target State in Phase 5 |
| :--- | :--- | :--- |
| Delete / Archive Flows in `src/main.ts` | No unified soft-delete confirmation modal with dependency summary; relies on raw Supabase `delete()` or omits safe archival UI on several entities (`Sitio`, `Proceso`, `Turno`, `Acreditación`, `Organización`, `Certificado`). | Unified `Archivar Registro` modal displaying active child dependency counts from `get_archive_dependency_summary()`, blocking unsafe parent archival, and performing `UPDATE ... SET deleted_at = NOW()` with `audit_log` refresh. Admin-only `"Mostrar Archivados"` / `"Restaurar"` toggle in Multi Views. |
| Existing `node:test` Assertions | `activeCertificates.test.ts` (lines 334–336) and `multisiteSampling.test.ts` (lines 301–304) assert `"ZONA 1:"`, `"ZONA 3:"`, `"ZONA 4:"`; `breadcrumb.test.ts` and `healthCheck.test.ts` assert old `"Auditorías"` / `drilldown` / `requirements` / `catalogs` menus. | Refactor assertions to match the new 3-Block Header, Minimalist Dashboard, 3-Zone Detail Views (Zero `"ZONA "` strings), and new Detail Views. |
| Missing New Test Coverage | No automated tests for reactive Multi View facet intersection counts, `Perfil` RBAC locks, or composite breadcrumb loop prevention across `Certificado -> Sector IAF -> Certificado`. | Add comprehensive `node:test` suites covering reactive facets, composite breadcrumb loop truncation, `Acreditación` / `Sitio` / `Proceso` / `Turno` Detail Views, and `Perfil` self-update rules. |

---

## 3. Technical & Verification Specifications

### 3.1 Safe Archive (Soft-Delete) & Restore UX (`src/views/archiveModalView.ts` & `src/main.ts`)

1. **Zero Hard-Delete Client Calls:** Audit `src/` to guarantee **zero** `.delete()` calls on primary/catalog Supabase tables (`organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `auditor`, `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`). Only pure junction assignments (`norma_auditor`, `requisitos_por_proceso`, etc.) may detach link rows where appropriate.
2. **Dependency-Aware Archive Confirmation Dialog:**
   - Triggered from any Detail View Record Zone (`🗄️ Archivar`) by `ADMIN` or `WORKER`.
   - Calls `get_archive_dependency_summary(table, recordId)`:
     - If active children exist (e.g., an `Organización` has 2 active `Certificados`, or `Sitio 0` has active secondary sites/audits), renders a clear warning listing the active dependencies and disables archival until children are handled.
     - If safe to archive, allows entering an optional archival reason and executes `UPDATE <table> SET deleted_at = NOW() WHERE id = <recordId>`, pops back to the parent/Multi View via `popToBreadcrumb()`, and logs the event into `public.audit_log`.
3. **Admin-Only Archive Inspection & Restoration:**
   - `ADMIN` users have an optional `"Mostrar Archivados"` filter toggle inside Multi Views to inspect archived records (`deleted_at IS NOT NULL`) with a muted archival state and execute `"Restaurar"` (`SET deleted_at = NULL`).
   - Archived records are **completely invisible** in standard active views for `WORKER`, `AUDITOR`, and `CLIENT`.

### 3.2 Automated `node:test` Regression Suite

1. **Update Existing Suites (`src/lib/*.test.ts`):**
   - `src/lib/healthCheck.test.ts` & `src/lib/accessControl.test.ts`:
     - Verify `getVisibleDomainMenus()` returns strictly `Auditoría`, `Certificación` (3 items), and `Extra` (6 items including `Acreditación`).
     - Verify `drilldown`, `sites`, `processes`, `shifts`, `requirements`, `catalogs` are absent from top-level menus.
     - Verify `'profile'` route access for all authenticated users (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`, `PENDING`).
   - `src/lib/breadcrumb.test.ts`:
     - Test cross-domain contextual lineage preservation (`Certificación > Certificado > FN-QMS-2024-001 > Sector 17`).
     - Test composite loop truncation (`Certificado A -> Sector 17 -> Certificado A` truncates cleanly back to `Certificado A`).
     - Test non-collision between distinct `entityType` values (`'sitio'` vs. `'cert'`).
     - Test `containsRawUuid()` returns `false` across all generated segment labels.
   - `src/lib/activeCertificates.test.ts`, `src/lib/multisiteSampling.test.ts`, `src/lib/phase62UiIntegrity.test.ts`:
     - Replace legacy `"ZONA "` assertions with assertions verifying absence of `"ZONA "` headings, presence of Parent Zone + hairline divider + Record Zone + list-only Children Zone, and absence of double-X (`type="search"`).

2. **New Test Modules:**
   - `src/lib/multiViewFacets.test.ts`:
     - Tests `computeReactiveFacetCounts()` with multi-select category checkboxes (`OR` within category, `AND` across categories + search query).
     - Verifies sidebar collapse state and `Acreditación` directory filtering/sorting (`ENAC`, `UKAS`, `ANAB`, Norma, Sector IAF).
   - `src/lib/detailViewsPhase42.test.ts`:
     - Tests clean 3-Zone HTML output for `Acreditación`, `Sitio`, `Proceso`, `Turno`, `Organización`, `Certificado`, and `Auditor`.
     - Verifies `Sitio 0` principal indicator, `Turno` overnight duration computation, `Proceso` clause mapping display, Zero `"ZONA "` headings, and Zero raw UUID leaks.
   - `src/lib/profileGovernance.test.ts`:
     - Tests `Perfil` self-update payload builder ensuring `role` and `status` are never included in non-admin update payloads and whitespace-only names are rejected.

### 3.3 Build, Lint & Playwright Browser Verification Protocol

1. **Static & Unit Checks:**
   - `npx tsc --noEmit` — 0 TypeScript errors.
   - `npm run lint` — 0 ESLint / syntax issues.
   - `npm test` — 100% pass rate across all `node:test` suites.
   - `npm run build` — clean production Vite bundle (`dist/`).
2. **Playwright Headless Chromium E2E Verification (`http://localhost:3000`):**
   - **Desktop (`1440×900`) & Mobile (`375×812`):**
     - **Login & Minimalist Dashboard:** Verify zero role/status badges and zero `"Explorador Operativo de Certificados"`; confirm clean general metrics render and zero horizontal overflow occurs.
     - **Header & Zero Extra Cards:** Inspect `Auditoría`, `Certificación`, and `Extra` dropdowns; verify zero extra banner cards or inline sub-tabs exist inside any domain view.
     - **Multi View Interactions:** Toggle hamburger sidebar collapse/expand, check multiple facet checkboxes, confirm reactive facet counts update immediately, verify `"Mostrando X de Y ..."` totalization, and verify single `"X"` clear button inside search inputs.
     - **Deep Contextual Drill-Down & Loop Prevention:** Traverse `Certificación > Organización > [Org] > [Certificado] > [Sitio 0] > [Turno]`, then navigate `Certificado -> Sector 17 -> Certificado` and confirm single-row borderless breadcrumb updates without resets, wraps, or duplicate loops.
     - **New Views & Profile:** Open `Extra > Acreditación` (Multi View → Detail View), `Sitio`, `Proceso`, `Turno`, and `User Menu > Mi Perfil`; verify clean rendering and zero uncaught console/network errors.

---

## 4. Implementation Checklist

- [ ] Audit `src/` and remove any remaining `.delete()` calls on primary/catalog tables; wire soft-delete archival (`deleted_at = NOW()`) and dependency check modal.
- [ ] Add Admin-only `"Mostrar Archivados"` toggle and `"Restaurar"` action in Multi Views.
- [ ] Update existing `node:test` files (`healthCheck.test.ts`, `accessControl.test.ts`, `breadcrumb.test.ts`, `activeCertificates.test.ts`, `multisiteSampling.test.ts`, `phase62UiIntegrity.test.ts`) to enforce Phase 2–4.2 contracts.
- [ ] Author new unit test suites: `multiViewFacets.test.ts`, `detailViewsPhase42.test.ts`, and `profileGovernance.test.ts`.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` until 100% green.
- [ ] Execute Playwright visual + interactive verification at `1440px` and `375px` across all upgraded flows and resolve any visual or console defects.

---

## 5. Acceptance Criteria

1. Zero `.delete()` mutations exist in `src/` against soft-deleted primary or catalog tables; archiving updates `deleted_at` and records an immutable audit trail entry in `public.audit_log`.
2. `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` all pass with zero warnings/errors.
3. Live Playwright inspection confirms:
   - Single-row borderless breadcrumbs with contextual cross-domain lineage and loop truncation.
   - Zero extra exploration cards or inline sub-nav banners across `Auditoría`, `Certificación`, and `Extra`.
   - Zero double `"X"` clear buttons in any search bar.
   - Collapsible sidebar facets with live reactive intersection counts in every Multi View.
   - Clean 3-Zone Detail Views (no `"ZONA *"` labels) for all existing entities plus `Acreditación`, `Sitio`, `Proceso`, and `Turno`.
   - Functional `Mi Perfil` self-service view with RBAC role/status lock.
