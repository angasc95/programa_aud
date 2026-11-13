# Phase 5.2: `node:test` Regression Overhaul, New Domain Test Suites & Playwright E2E Release Gate

> **Parent Phase:** Phase 5 — Governance Hardening, Test Regression & Release Verification  
> **Depends On:** [`phase_5.1.md`](./phase_5.1.md) (Safe Archive & Restore UX Complete)  
> **Final Gate:** Production Release Readiness

---

## 1. Objectives & Scope

Existing automated test suites in `src/lib/*.test.ts` currently assert legacy behaviors—such as `"ZONA 1: METADATOS RELACIONALES"` headings, `"Auditorías"` plural menu labels, `"Explorador Operativo de Certificados"`, and `renderDrillDownView`—that are intentionally retired across Phases 1.1–5.1. Additionally, new capabilities (reactive Multi View intersection counts, composite breadcrumb loop prevention, `Acreditación`/`Sitio`/`Proceso`/`Turno` Detail Views, `Perfil` RBAC payload locks, and safe archival guards) require dedicated regression tests and live headless Chromium verification.

**Phase 5.2** completes the final quality and release gate:
1. Update all impacted legacy `node:test` suites so 100% of assertions align with the new architectural contracts.
2. Author 4 focused new `node:test` modules covering every newly introduced subsystem.
3. Pass `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` with zero errors.
4. Execute full **Playwright headless Chromium** visual & interactive verification on `http://localhost:3000` at both `1440×900` (desktop) and `375×812` (mobile).

---

## 2. Automated Test Suite Refactoring & Expansion (`src/lib/*.test.ts`)

### 2.1 Existing Suites to Update

1. **`src/lib/healthCheck.test.ts` & `src/lib/accessControl.test.ts`:**
   - Assert `getVisibleDomainMenus()` returns strictly **3 blocks**: `Auditoría` (`Programación`, `Calendario`, `Resultado`), `Certificación` (`Organización`, `Certificado`, `Auditor`), and `Extra` (`Norma`, `Sector IAF`, `Acreditación`, `Estatus`, `Tipo`, `Metodología`).
   - Assert `drilldown`, `sites`, `processes`, `shifts`, `requirements`, and `catalogs` are absent from top-level menus.
   - Assert `'profile'` route access for all authenticated users (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`, `PENDING`, `REJECTED`).
2. **`src/lib/breadcrumb.test.ts`:**
   - Update singular domain labels (`Auditoría`, `Certificación`, `Extra`, `Perfil`) and remove `'drilldown'` root test (line 204).
   - Add tests for cross-domain contextual lineage (`Certificación > Certificado > FN-QMS-2024-001 > Sector 17`), composite loop truncation (`Certificado A -> Sector 17 -> Certificado A`), non-collision across `entityType` (`'sitio'` vs. `'cert'`), and `collapseBreadcrumbForDisplay()` (> 4 crumbs).
3. **`src/lib/activeCertificates.test.ts`, `src/lib/multisiteSampling.test.ts`, `src/lib/phase62UiIntegrity.test.ts`:**
   - Remove legacy `"ZONA 1:"`, `"ZONA 3:"`, `"ZONA 4:"` and `renderDrillDownView` assertions.
   - Assert **absence** of `"ZONA "` headings, **absence** of `type="search"`, **presence** of clean Parent Zone + hairline divider + Record Zone + tabbed list-only Children Zone, and **Zero-UUID** compliance across rendered HTML.
4. **`src/lib/universalTemplate.test.ts`, `src/lib/extraDomain.test.ts`, `src/lib/auditPhase5Views.test.ts`, `src/lib/drillDown.test.ts`:**
   - Align `universalTemplate.test.ts` with collapsible sidebar and `type="text"` single-clear search bar.
   - Verify `drillDown.test.ts` only tests active shared finding/audit helpers (or retire cleanly alongside `drillDown.ts` once shared types move to `auditDomain.ts`).

### 2.2 New `node:test` Modules to Author

1. **`src/lib/multiViewFacets.test.ts`:**
   - Tests `computeReactiveFacetCounts()` and `filterRecordsWithFacets()` with multi-select category checkboxes (`OR` within category, `AND` across categories + search query).
   - Verifies sidebar collapse rendering and `Acreditación` directory filtering/sorting (`ENAC`, `UKAS`, `ANAB`, Norma, Sector IAF).
2. **`src/lib/detailViewsPhase42.test.ts`:**
   - Tests clean 3-Zone HTML output for `Acreditación`, `Sitio`, `Proceso`, `Turno`, `Organización`, `Certificado`, and `Auditor`.
   - Verifies `Sitio 0` principal highlight, `Turno` overnight duration (`22:00 → 06:00`), `Proceso` clause mapping, zero `"ZONA "` headings, zero `type="search"`, and zero raw UUID leaks.
3. **`src/lib/profileGovernance.test.ts`:**
   - Tests `buildSelfProfileUpdatePayload()` ensuring `role` and `status` are never emitted in non-admin update payloads and whitespace-only or raw-UUID names are rejected.
4. **`src/lib/archiveGovernance.test.ts`:**
   - Tests dependency-summary formatting (`get_archive_dependency_summary` responses), `Sitio 0` archival guard rules, and verification that zero `.delete()` mutations target soft-deleted entity tables.

---

## 3. Static, Build & Live Playwright Verification Protocol

1. **Static & Unit Gate:**
   - `npx tsc --noEmit` — 0 TypeScript errors (`strict: true`, `0 any`).
   - `npm run lint` — 0 syntax/lint issues.
   - `npm test` — 100% pass rate across all `node:test` suites.
   - `npm run build` — clean production Vite bundle (`dist/`).
2. **Live Playwright Headless Chromium Verification (`http://localhost:3000`) at `1440×900` & `375×812`:**
   - **Minimalist Dashboard & `Mi Perfil`:** Confirm zero role/status pills and zero `"Explorador Operativo de Certificados"`; open `Mi Perfil`, edit `nombre`, reload, and verify persistence + read-only role/status lock.
   - **Header & Zero Extra Cards:** Inspect `Auditoría`, `Certificación`, and `Extra` dropdowns; verify zero extra banner cards or inline sub-tabs across every domain view.
   - **Multi View & Reactive Facets:** Toggle `☰ Filtros` sidebar collapse/expand, check multiple facet checkboxes, confirm live reactive counts and `"Mostrando X de Y ..."`, and verify single `"X"` clear button inside search inputs.
   - **Deep Contextual Drill-Down & Loop Prevention:** Traverse `Certificación > Organización > [Org] > [Certificado] > [Sitio 0] > [Turno]`, and `Certificado -> Sector 17 -> Certificado`; verify single-row borderless breadcrumb updates without resets, wraps, or duplicate loops.
   - **Archive Guard & Admin Restore:** Trigger `🗄️ Archivar` on a parent with children (confirm blocked with dependency counts) and on an unblocked leaf record (confirm soft-delete + `audit_log` entry + Admin `"Mostrar Archivados"` restore).
   - **Console & Layout Integrity:** Confirm zero uncaught console errors, zero 5xx network errors, and zero horizontal overflow (`scrollWidth <= innerWidth`) across both desktop and mobile viewports.

---

## 4. Implementation Checklist

- [ ] Update legacy assertions in `healthCheck.test.ts`, `accessControl.test.ts`, `breadcrumb.test.ts`, `activeCertificates.test.ts`, `multisiteSampling.test.ts`, `phase62UiIntegrity.test.ts`, `universalTemplate.test.ts`, and `drillDown.test.ts`.
- [ ] Author `multiViewFacets.test.ts`, `detailViewsPhase42.test.ts`, `profileGovernance.test.ts`, and `archiveGovernance.test.ts`.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` until 100% green.
- [ ] Execute Playwright visual + interactive verification at `1440×900` and `375×812` against the running server (`http://localhost:3000`) and resolve any discovered visual or runtime defects.

---

## 5. Acceptance Criteria

1. `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` all pass with exit code `0`.
2. Every unit and integration invariant across Phases 1.1–5.1 is locked down by automated `node:test` assertions.
3. Live Playwright Chromium verification confirms clean rendering, zero console/runtime errors, zero raw UUID exposure, zero double-`"X"` inputs, zero `"ZONA *"` labels, and full responsive integrity from `375px` to `1440px`.
