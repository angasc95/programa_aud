# Certificado Domain Roadmap: Reference Model for Multi & Detail Views

> **Domain:** `Certificación` → `Certificado` (`public.certificado` + children `sitio`, `proceso`, `turno`, `requisitos_no_aplicables_certificado`, `auditoria`)  
> **Goal:** Establish `Certificado` (and its sub-entities) as the polished reference model for all Multi Views and Detail Views across `programa_aud`.  
> **Scope:** UI architecture refactoring, List-View interaction upgrades, Detail-View single-card consolidation, parent/child link completeness, and sub-entity drill-down verification.

---

## 1. Executive Summary & Objective

The `Certificado` module currently implements the core functional domain logic (ISO/IEC 17021-1:2015 multisite sampling, Site 0 priority, scope validation, audit trail, and soft-delete governance), but its layout shell and table interactions retain split-card containers, redundant text labels, conflicting inner row buttons, non-resizable overflowing tables, and a missing parent link (`id_estatus`).

This roadmap breaks down the refinement of **`Certificado`** into **6 focused, sequential steps** plus a **final verification gate** so that `Certificado` becomes the canonical UX/UI blueprint for the rest of the application.

---

## 2. Current State vs. Target State (Gap Analysis)

| Area | Current State in Codebase | Target State (Reference Model) | Step |
| :--- | :--- | :--- | :---: |
| **Multi View Shell** (`universalTemplate.ts`) | Two stacked containers (`<header>` card + flex row of `<aside>` card & `<section>` card). | **Single big card** over page background; breadcrumb strictly *outside* at the top. | `step_1` |
| **Multi View Controls** (`universalTemplate.ts`) | `"Filtros"` text next to `☰`; `"Tarjetas"` / `"Tabla"` text inside view switcher. | Top Main Row (3 sub-rows: Title / Subtitle / 4 columns). Filter button = hamburger icon **only**; View switcher = icons **only** (`⊞` / `☰`) styled consistently with filter button; flexible search bar + `Mostrando X de Y ...`. | `step_1` |
| **Multi View Body** (`universalTemplate.ts`) | `<aside>` + `<section>` as separate cards. | Bottom Main Row (2 sub-columns inside the single card): toggleable Filters column + Data Display column that expands/shrinks dynamically. | `step_1` |
| **List View Engine** (`universalTemplate.ts` + child tabs) | Uses `overflow-x-auto` tables with fixed column HTML, no drag-to-resize, and mixed `<button>` links inside cells. | Click-and-drag **resizable columns**, **zero horizontal scrollbars** (`table-fixed` + responsive truncation), sortable headers, and **full-row click** (`<tr>`) with no inner clickable controls. | `step_1` |
| **Certificado Multi View** (`certificadoView.ts`) | 7 columns including `Acciones`; clickable buttons inside `Organización` (`view-org-from-cert`) and `Código` (`select-cert`). | **Remove `Acciones` column** completely (6 columns). Remove inner clickable elements; clicking **anywhere** on a row opens the Certificate Detail View. | `step_2.1` |
| **Detail View Shell** (`detailTemplate.ts`) | Top Back/Changelog bar sits *outside* the card; Record Title sits inside the middle zone; Children Tabs sit in a *second* card below. | **Single big card** over background; breadcrumb strictly *outside* at top. **Row 1** (3 sub-rows, matching card bg): `[1]` Back (`←`, tooltip `"Volver"`) on left + Edit icon (no text, tooltip `"Editar"`) immediately left of Clock icon (no text, tooltip `"Historial de Cambios"`) on right; `[2]` Title; `[3]` Subtitle. | `step_2.2` |
| **Certificado Parent Zone** (`certificadoView.ts`) | Clickable chips for `id_organizacion`, `id_norma`, `id_sector_iaf`. **`id_estatus` is missing** from `parents`. | Clean Parent Data row (no `"ZONA"` labels) with clickable links for **`id_organizacion`**, **`id_norma`**, **`id_sector_iaf`**, and **`id_estatus`**, separated from Direct Data by a hairline `<hr>`. | `step_2.2` |
| **Certificado Direct Data** (`certificadoView.ts`) | Renders `numero_certificado`, `alcance`, `multisitio`, dates, accreditation, subsector. | Clean Direct Data zone (no `"ZONA"` labels) highlighting `numero_certificado`, `alcance`, `multisitio`, and supporting metadata with inline edit support. | `step_2.2` |
| **Certificado Child Tabs** (`certificadoView.ts`) | 6 tabs (`Sitios`, `Procesos`, `Turnos`, `No Aplicables`, `Cobertura Normativa`, `Auditorías`). Plain HTML tables without sorting/resize; mixed inner buttons & non-clickable rows. | **5 List-View tabs**: **`"Sitio"`**, **`"Proceso"`**, **`"Turno"`**, **`"No Aplicables"`**, **`"Auditoría"`**. Every tab has sorting, drag-resizable columns, zero horizontal scrollbars, and full-row click navigation. | `step_3.1` |
| **Sub-Entity Detail Views** (`sitioView.ts`, `procesoView.ts`, `turnoView.ts`) | `Sitio`, `Proceso`, `Turno`, and `Auditoría` Detail Views already exist (`src/views/*View.ts`); `No Aplicables` has no dedicated detail view yet. | Audit & align `Sitio`, `Proceso`, and `Turno` with the single-card Detail Template, clean up duplicate cell buttons, and ensure `"No Aplicables"` & `"Auditoría"` rows navigate cleanly. | `step_3.2` |

---

## 3. Target Layout Architecture

### 3.1 Multi View (`certificado` directory)

```text
[ Breadcrumb Bar: Inicio > Certificación > Certificado ]   <-- Strictly OUTSIDE the card
┌──────────────────────────────────────────────────────────────────────────────┐
│ SINGLE BIG CARD (bg-white border border-slate-200 rounded-2xl shadow-xs)    │
│                                                                              │
│ TOP MAIN ROW (3 sub-rows)                                                    │
│  1. Title (+ optional "+ Nuevo Certificado" staff CTA)                       │
│  2. Subtitle                                                                 │
│  3. [ ☰ ]  [ 🔍 Search bar (flex-1) ]  Mostrando X de Y...   [ ⊞ | ☰ ]      │
│ ──────────────────────────────────────────────────────────────────────────── │
│ BOTTOM MAIN ROW (2 sub-columns)                                              │
│  ┌─────────────┐ ┌────────────────────────────────────────────────────────┐ │
│  │ Filters     │ │ Data Display Container (expands to 100% when hidden)   │ │
│  │ (toggleable │ │  • Grid Mode: Responsive cards                          │ │
│  │  via ☰)     │ │  • List Mode: Resizable cols, NO horizontal scrollbar, │ │
│  │             │ │               NO "Acciones", click anywhere on row      │ │
│  └─────────────┘ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Detail View (`certificado` & sub-entities)

```text
[ Breadcrumb Bar: Inicio > Certificación > Certificado > FN-QMS-2024-001 ]  <-- Strictly OUTSIDE
┌──────────────────────────────────────────────────────────────────────────────┐
│ SINGLE BIG CARD (bg-white border border-slate-200 rounded-2xl shadow-xs)    │
│                                                                              │
│ ROW 1: TOP MAIN ROW (3 sub-rows, matching card background)                   │
│  1. [ ← ] (tooltip: "Volver")                    [ ✏️ ] [ 🕒 ] (icon-only)   │
│  2. Title (e.g. FN-QMS-2024-001 + status pill)                               │
│  3. Subtitle (e.g. Sistemas de Gestión de la Calidad · SGC)                  │
│ ──────────────────────────────────────────────────────────────────────────── │
│ ROW 2: PARENT DATA (no "ZONA" labels — all parent IDs clickable)             │
│  [🏢 Organización →]  [📘 Norma →]  [🏭 Sector IAF →]  [🏷️ Estatus →]       │
│ ──────────────────────────────────── <hr> ────────────────────────────────── │
│ ROW 3: DIRECT RECORD DATA (no "ZONA" labels)                                 │
│  numero_certificado | multisitio | fecha_emision | fecha_vencimiento | ...   │
│  alcance (full-width block)                                                  │
│ ──────────────────────────────────────────────────────────────────────────── │
│ ROW 4: MULTIPAGE CHILDREN (List Views)                                       │
│  Tabs: [ Sitio ] [ Proceso ] [ Turno ] [ No Aplicables ] [ Auditoría ]       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Resizable columns · Sortable headers · No horiz scroll · Full-row click │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Roadmap Execution Sequence

1. **[`step_1.md`](./step_1.md) — Shared Multi-View & List-View Shell Foundation**  
   Refactor `universalTemplate.ts` into a single big card with icon-only controls (`☰` and `⊞`/`☰`), dynamic filter/content width, and a reusable drag-resizable, full-row-clickable, zero-horizontal-scroll List View engine.
2. **[`step_2.1.md`](./step_2.1.md) — Certificado Multi View Refinement**  
   Remove `"Acciones"`, remove inner cell buttons (`view-org-from-cert`, inner `select-cert`), enable full-row click navigation, and tune column proportions for zero horizontal overflow.
3. **[`step_2.2.md`](./step_2.2.md) — Certificado Detail View: Single-Card Shell, Top Bar, Parents & Direct Data**  
   Consolidate `detailTemplate.ts` into a single big card, implement the 3-sub-row Top Main Row (`←`, `✏️`, `🕒` icon order & tooltips), remove `"ZONA"` labels, and add `id_estatus` alongside `id_organizacion`, `id_norma`, and `id_sector_iaf` as clickable parent chips.
4. **[`step_3.1.md`](./step_3.1.md) — Certificado Multipage Child Tabs as List Views**  
   Standardize the 5 tabs (`"Sitio"`, `"Proceso"`, `"Turno"`, `"No Aplicables"`, `"Auditoría"`), attach the sortable/resizable List View engine to each tab, and convert every child row to full-row click navigation.
5. **[`step_3.2.md`](./step_3.2.md) — Sub-Entity Detail Views Audit & Wiring (`Sitio`, `Proceso`, `Turno`, `No Aplicables`, `Auditoría`)**  
   Align existing `sitioView.ts`, `procesoView.ts`, and `turnoView.ts` with the updated single-card Detail Template, verify breadcrumb lineage, and ensure `"No Aplicables"` and `"Auditoría"` rows resolve to clean detail targets.
6. **[`step_final.md`](./step_final.md) — Verification, Regression Tests & Sign-Off Checklist**  
   Update `node:test` suites, run `tsc --noEmit` + `npm run build`, and verify responsive layout and interactions in Playwright across 375px–1920px viewports.
