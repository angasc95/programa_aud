# Phase 4.1.1: Universal Multi View Engine, Reactive Facet Intersection & Double-`"X"` Elimination

> **Parent Phase:** Phase 4.1 — Universal Multi View Architecture  
> **Depends On:** [`phase_3.md`](./phase_3.md) (Compact Breadcrumbs & Tighter Canvas)  
> **Unlocks:** [`phase_4.1.2.md`](./phase_4.1.2.md) (Rollout Across 9 Existing Directories), [`phase_4.1.3.md`](./phase_4.1.3.md) (`Acreditación` Multi View)

---

## 1. Objectives & Scope

Plural directory views across `programa_aud` currently use inconsistent layouts, static non-reactive facet counts, permanently pinned sidebars (`lg:col-span-1`), and `<input type="search">` elements paired with custom clear buttons (`✕`) that cause Chromium/WebKit browsers to render **two overlapping `"X"` clear buttons**.

**Phase 4.1.1** builds the **core reusable Multi View engine and fixes the double-`"X"` bug codebase-wide** before rolling the template out to individual entity directories:
1. Implement multi-select category checkbox filtering and the **reactive cross-filtering count algorithm (`computeReactiveFacetCounts`)** in `src/lib/universalTemplate.ts`.
2. Upgrade `src/views/universalTemplate.ts` with the unified header/controls card, hamburger sidebar toggle (`☰ Filtros` / `isSidebarOpen`), single `type="text"` search bar, `"Mostrando X de Y ..."` counter, and `[⊞ Tarjetas | ☰ Tabla]` switcher.
3. Replace every `type="search"` input across the entire `src/` directory with `type="text"` paired with a single explicit clear button (`✕`).

---

## 2. Current State Gap Analysis

| File | Current Implementation | Target State in Phase 4.1.1 |
| :--- | :--- | :--- |
| `src/lib/universalTemplate.ts` (142L) | `calculateFacetCounts()` / `buildFacetOptions()` compute static totals for single-select buttons without cross-category intersection (`S_{-k}`). | Add `MultiViewFacetCategory`, `MultiViewSelectionMap = Record<string, Set<string>>`, `filterRecordsWithFacets()`, and `computeReactiveFacetCounts()` using cross-filtered subsets $S_{-k}$. |
| `src/views/universalTemplate.ts` (365L) | Non-collapsible `lg:col-span-1` sidebar with button lists; no unified hamburger toggle (`isSidebarOpen`); inconsistent counter labels. | Unified Multi View shell: (1) Header + Controls row (`☰ Filtros` toggle with active filter badge, single `type="text"` search + `/` shortcut + single `✕` clear, `"Mostrando X de Y [entidades]"`, `[⊞ Tarjetas \| ☰ Tabla]`), (2) Collapsible `<aside>` with accessible `<input type="checkbox">` facet groups and live reactive counts, (3) Full-width responsive data canvas when collapsed. |
| `searchControlsView.ts` (L47), `certificadoView.ts` (L341), `sectorIafView.ts` (L349), `estatusView.ts` (L305), `auditorView.ts` (L266), `normaView.ts` (L419), `metodologiaAuditoriaView.ts` (L264), `tipoAuditoriaView.ts` (L287) | Render `<input type="search">` alongside a custom `<button>✕</button>`, triggering native browser double-`"X"` artifacts. | Immediate hygiene pass replacing all `type="search"` attributes with `type="text"` across all 8 files (and verifying `calendarioView.ts` / `resultadoView.ts` search inputs). |

---

## 3. Technical Specifications

### 3.1 Unified Multi View Layout Grammar (`src/views/universalTemplate.ts`)

1. **Unified Header & Controls Card:**
   - **Header Row:** Plural title (e.g., `Organizaciones Clientes`, `Certificados de Conformidad`), concise 1-line subtitle, and RBAC-gated primary creation button (`+ Nueva ...`). Zero `"DOMINIO ... · FASE ..."` tags.
   - **Controls Row (`border-t border-slate-100`):**
     - **Hamburger Filter Toggle (`☰ Filtros`):** Toggles `isSidebarOpen` on both desktop (`lg+`) and mobile; displays a subtle active-count indicator when `> 0` facet checkboxes are selected.
     - **Single Unified Search Input:** `<input type="text" ...>` with left `🔍` icon, `/` keyboard hint when empty, and **a single** `✕` clear button when `query.length > 0`.
     - **Totalization Counter:** `"Mostrando X de Y [entidades]"` using `tabular-nums`.
     - **Presentation Switcher:** `[⊞ Tarjetas | ☰ Tabla]` preserving current sort column/direction.
2. **Collapsible Filter Sidebar (`<aside>`):**
   - `isSidebarOpen === true`: renders `lg:w-64 shrink-0` left column (collapsible drawer/panel on mobile) beside `flex-1 min-w-0` canvas.
   - `isSidebarOpen === false`: hidden (`hidden`), allowing `☰ Tabla` and `⊞ Tarjetas` to expand to **100% full width**.
   - Includes `"Limpiar filtros"` reset control whenever any checkbox or search query is active.

### 3.2 Reactive Intersection Engine (`src/lib/universalTemplate.ts`)

1. **Category Checkbox Semantics:**
   - **Within a category ($F_k$):** `OR` union (checking `Vigente` + `En Revisión` matches records matching either). Empty `Set` in $F_k$ means `ALL` (no restriction).
   - **Across categories + search query:** `AND` intersection.
2. **Cross-Filtering Reactive Count Algorithm (`computeReactiveFacetCounts`):**
   - Given `allRecords`, `query`, `facets[]`, and `activeSelections: Record<string, Set<string>>`:
   - For each facet category $F_k$ and option $v \in F_k$:
     - Compute subset $S_{-k}$ of `allRecords` matching `query` **AND** active selections in every *other* category $F_j$ ($j \neq k$).
     - Reactive count for $(F_k, v)$ = number of records in $S_{-k}$ satisfying $v$.
   - **Rationale:** Prevents checked siblings in the same category from zeroing each other out, while dynamically recalculating counts across all other categories as the user types or checks boxes. Options at `0` remain visible with muted `text-slate-400` styling so empty intersections are transparent.

---

## 4. Implementation Checklist

- [ ] Implement `filterRecordsWithFacets()` and `computeReactiveFacetCounts()` in `src/lib/universalTemplate.ts`.
- [ ] Upgrade `src/views/universalTemplate.ts` with unified header/controls bar, hamburger `isSidebarOpen` collapsible sidebar, `<input type="checkbox">` category groups, `type="text"` search input (single `✕`), `"Mostrando X de Y ..."` counter, and `[⊞ Tarjetas | ☰ Tabla]` switcher.
- [ ] Replace all `type="search"` inputs with `type="text"` across `searchControlsView.ts`, `certificadoView.ts`, `sectorIafView.ts`, `estatusView.ts`, `auditorView.ts`, `normaView.ts`, `metodologiaAuditoriaView.ts`, and `tipoAuditoriaView.ts`.
- [ ] Add sidebar open/close state and multi-select facet toggle handler scaffolding in `src/main.ts`.

---

## 5. Acceptance Criteria

1. Searching in **any** view across the entire application renders at most **one** clear button (`✕`); `grep 'type="search"' src/` returns **0 matches**.
2. `computeReactiveFacetCounts()` correctly preserves `OR` union within a category and `AND` intersection across categories and search queries.
3. `src/views/universalTemplate.ts` cleanly toggles between collapsed (`100%` canvas width) and expanded (`lg:w-64` sidebar + canvas) states on both desktop and mobile.
