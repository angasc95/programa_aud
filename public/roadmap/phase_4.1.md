# Phase 4.1: Universal Multi View Architecture, Collapsible Facet Sidebar & Reactive Intersection Counts

## 1. Objectives & Architectural Rationale

Plural directory views across `programa_aud` currently suffer from fragmented layout patterns and subtle UX bugs:
- **Search bar duplication & double `"X"` artifact:** Multiple views (`certificadoView.ts:341`, `searchControlsView.ts:47`, `sectorIafView.ts:349`, `estatusView.ts:305`, `auditorView.ts:266`, `normaView.ts:419`, `metodologiaAuditoriaView.ts:264`, `tipoAuditoriaView.ts:287`) render `<input type="search">` alongside a custom `<button>✕</button>`, causing Chromium/WebKit browsers to render **two overlapping `"X"` clear buttons** inside the input.
- **Static facet counts:** Sidebars in `organizacionView.ts` (lines 205–235, 261–263), `certificadoView.ts`, `auditorView.ts`, and `programacionView.ts` compute facet totals over *all* records rather than dynamically reflecting active filter intersections, and use single-select button lists instead of structured **category checkbox groups**.
- **Fixed uncollapsible sidebar:** The filter sidebar permanently occupies 1 of 4 grid columns (`lg:col-span-1`), reducing horizontal space for wide data tables (`☰ Tabla`).
- **Missing `Acreditación` Multi View:** `acreditacion_norma_iaf` + `organismo_acreditacion` (added in database Phase 1) has no dedicated directory in `Extra`.

Phase 4.1 establishes one unified **Multi View** specification applied uniformly across all plural directories, plus the new **`Acreditación` Multi View**.

---

## 2. Current State Gap Analysis

| File | Current Implementation | Target State in Phase 4.1 |
| :--- | :--- | :--- |
| `src/views/universalTemplate.ts` & `src/lib/universalTemplate.ts` | Static single-select facet buttons; non-collapsible sidebar; used inconsistently (many views like `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `programacionView.ts` re-implement custom sidebars/headers). | Unified **Multi View** shell with: (1) Single header/controls card, (2) **Collapsible sidebar filter column** with hamburger toggle (`☰ Filtros`), (3) **Category checkbox groups** with **intelligent reactive counts**, (4) Single `type="text"` search bar, (5) Standardized `"Mostrando X de Y ..."` totalization counter, (6) `[⊞ Tarjetas \| ☰ Tabla]` switcher. |
| `src/views/certificadoView.ts`, `sectorIafView.ts`, `estatusView.ts`, `auditorView.ts`, `normaView.ts`, `metodologiaAuditoriaView.ts`, `tipoAuditoriaView.ts`, `searchControlsView.ts` | Use `type="search"` paired with custom clear button `✕` (double `"X"` artifact). `auditorView.ts` / `programacionView.ts` / `organizacionView.ts` compute non-reactive facet counts. | Replace every `type="search"` with `type="text"`; adopt shared Multi View header + collapsible checkbox facet sidebar + reactive count engine across all 10 plural directories. |
| `src/views/acreditacionView.ts` *(New)* & `src/lib/acreditacionDomain.ts` *(New)* | No Multi View exists for `acreditacion_norma_iaf` / `organismo_acreditacion`. | Full Multi View for **Acreditaciones** (`Extra > Acreditación`), joined with `organismo_acreditacion`, `norma`, and `sector_iaf`. |

---

## 3. Technical & UX Specifications

### 3.1 Unified Multi View Structure

Every Multi View (`Organizaciones`, `Certificados`, `Auditores`, `Programación`, `Normas`, `Sectores IAF`, `Acreditaciones`, `Estatus`, `Tipos`, `Metodologías`) shares one clean layout grammar:

1. **Unified Header & Controls Card:**
   - Top row: Plural title (e.g., `Organizaciones Clientes`, `Certificados de Conformidad`, `Acreditaciones Vigentes`), concise 1-line subtitle, and RBAC-gated primary creation button (e.g., `+ Nueva Organización`, `+ Nueva Acreditación`). Zero redundant domain banners or `"DOMINIO ... · FASE ..."` tags.
   - Controls row (separated by `border-t border-slate-100`):
     - **Filter Sidebar Toggle Button (Hamburger):** `☰ Filtros` button (with active-filter count badge when filters are applied) that toggles `isSidebarOpen` on both desktop and mobile.
     - **Single Unified Search Input:** `<input type="text" ...>` with left `🔍` icon, right `/` shortcut hint when empty, and **a single** `✕` clear button when `query.length > 0`. Never `type="search"`.
     - **Totalization Counter:** Consistent inline counter formatted as `"Mostrando X de Y [entidades]"` (e.g., `"Mostrando 1 de 4 organizaciones clientes"`, `"Mostrando 6 de 6 certificados registrados"`, `"Mostrando 4 de 4 acreditaciones"`).
     - **Presentation Switcher:** `[⊞ Tarjetas | ☰ Tabla]` toggle preserving sort state.
2. **Collapsible Filter Sidebar (`aside`):**
   - When `isSidebarOpen === true`: renders as a clean left column (`lg:w-64 shrink-0`, collapsible drawer/panel on mobile) alongside the `flex-1 min-w-0` data canvas.
   - When `isSidebarOpen === false`: completely hidden (`hidden`) so the data canvas expands to **100% full width**—especially valuable in `☰ Tabla` mode.
   - Includes `"Limpiar filtros"` reset link when any checkbox or search query is active.

### 3.2 Category Checkbox Groups & Reactive Intersection Engine (`src/lib/universalTemplate.ts`)

1. **Multi-Select Category Checkbox Model:**
   - Replace mutually exclusive button lists with standard accessible checkboxes (`<input type="checkbox" ...>`) grouped by facet category (e.g., for `Certificados`: *Estatus*, *Norma ISO*, *Sector IAF*, *Modalidad Multisitio*; for `Organizaciones`: *Vigencia de Certificados*, *Sector IAF*).
   - Semantics:
     - **Within a category:** `OR` union (checking `Activa` and `En Revisión` matches records that are either). Empty selection in a category means `ALL` (no constraint on that category).
     - **Across categories + search query:** `AND` intersection.

2. **Intelligent Reactive Count Algorithm (`computeReactiveFacetCounts`):**
   - Given `allRecords`, `query`, `facets[]`, and `activeSelections: Record<string, Set<string>>`:
   - For each facet category $F_k$ and each option value $v \in F_k$:
     - Compute the subset $S_{-k}$ of `allRecords` matching `query` **AND** all active selections in every *other* category $F_j$ ($j \neq k$).
     - The reactive count displayed next to option $(F_k, v)$ is the count of records in $S_{-k}$ that satisfy option $v$.
   - **Why cross-filtering ($S_{-k}$)?** It prevents checked siblings inside the same category from zeroing each other out, while dynamically shrinking counts across *all other* categories and search queries in real time (e.g., typing `"Alimentos"` or checking `Sector 17` immediately updates `Con Certificados Activos` and `Norma` counts to reflect only matching candidates).
   - Options whose reactive count drops to `0` remain visible (unless configured otherwise) with muted `text-slate-400` styling and `0` count so users clearly understand why an intersection is empty.

### 3.3 New `Acreditación` Multi View (`src/views/acreditacionView.ts`)

- **Data Model (`AcreditacionDetailEntity` in `src/lib/acreditacionDomain.ts`):**
  - Joins `acreditacion_norma_iaf` (`id`, `numero_acreditacion`, `fecha_concesion`, `fecha_vencimiento`, `estatus`, `deleted_at`) with:
    - `organismo_acreditacion` (`id_organismo`, `organismo_codigo` e.g. `ENAC`, `UKAS`, `ANAB`, `organismo_nombre`, `organismo_pais`, `organismo_sitio_web`)
    - `norma` (`id_norma`, `norma_codigo`, `norma_titulo`)
    - `sector_iaf` (`id_sector_iaf`, `sector_numero`, `sector_descripcion`)
  - Includes computed count of active `certificado` records sharing `(id_norma, id_sector_iaf)` for operational impact visibility.
- **Collapsible Facet Categories:**
  1. `Organismo de Acreditación` (`ENAC`, `UKAS`, `ANAB`, etc.)
  2. `Norma ISO` (`ISO 9001`, `ISO 14001`, `ISO 45001`, etc.)
  3. `Sector IAF`
  4. `Estatus` (`Activa`, `Suspendida`, `Vencida`)
- **Search Fields:** `numero_acreditacion`, `organismo_codigo`, `organismo_nombre`, `norma_codigo`, `sector_descripcion`.
- **Tarjetas & Tabla Columns:** Accreditation Number, Body (`ENAC — España`), Norm (`ISO 9001:2015`), IAF Sector (`Sector 17` or `General`), Grant Date, Expiry Date, Status badge, Active Certificates count. Clicking any card or row opens the **`Acreditación` Detail View** (Phase 4.2).

### 3.4 Multi View Rollout Across All 10 Directories

Standardize the following views onto the unified Multi View architecture:
1. `Organizaciones` (`src/views/organizacionView.ts`)
2. `Certificados` (`src/views/certificadoView.ts`)
3. `Auditores` (`src/views/auditorView.ts`)
4. `Programación` (`src/views/programacionView.ts`)
5. `Normas` (`src/views/normaView.ts`)
6. `Sectores IAF` (`src/views/sectorIafView.ts`)
7. `Acreditaciones` (`src/views/acreditacionView.ts` — *New*)
8. `Estatus` (`src/views/estatusView.ts`)
9. `Tipos de Auditoría` (`src/views/tipoAuditoriaView.ts`)
10. `Metodologías` (`src/views/metodologiaAuditoriaView.ts`)

*(Note: `Calendario` and `Resultado` remain specialized operational stage views inside `Auditoría` with clean header consistency and `type="text"` search inputs without double `"X"` artifacts.)*

---

## 4. Implementation Checklist

- [ ] Implement `computeReactiveFacetCounts()` and multi-select `Record<string, Set<string>>` filtering in `src/lib/universalTemplate.ts`.
- [ ] Upgrade `src/views/universalTemplate.ts` with the unified header/controls bar, hamburger sidebar collapse toggle (`isSidebarOpen`), category checkbox groups with reactive counts, `type="text"` search input (single `✕` button), and `"Mostrando X de Y ..."` counter.
- [ ] Replace all `type="search"` inputs with `type="text"` across `certificadoView.ts`, `searchControlsView.ts`, `sectorIafView.ts`, `estatusView.ts`, `auditorView.ts`, `normaView.ts`, `metodologiaAuditoriaView.ts`, and `tipoAuditoriaView.ts`.
- [ ] Migrate `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `programacionView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, and `metodologiaAuditoriaView.ts` to the unified Multi View layout with collapsible checkbox facets and reactive counts.
- [ ] Create `src/lib/acreditacionDomain.ts` and `src/views/acreditacionView.ts` (Multi View + Supabase query/fetch/create wiring in `src/main.ts`).

---

## 5. Acceptance Criteria

1. Searching in **any** Multi View displays at most **one** clear button (`✕`), never the browser native double `"X"` artifact.
2. Every Multi View has a single unified header/controls bar, a `"Mostrando X de Y ..."` totalization counter, and a `[⊞ Tarjetas | ☰ Tabla]` switcher.
3. Clicking the hamburger toggle (`☰ Filtros`) smoothly collapses and expands the sidebar facet column; when collapsed, the record grid/table uses full container width.
4. Checking a facet checkbox or typing a search term dynamically recalculates counts across all other facet categories (`computeReactiveFacetCounts`).
5. Navigating to `Extra > Acreditación` renders the full **Acreditaciones** Multi View backed by `acreditacion_norma_iaf` and `organismo_acreditacion`.
