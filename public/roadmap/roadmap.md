# Master Implementation Roadmap — UI/UX Redesign, Contextual Navigation & Soft-Delete Governance

## 1. Executive Vision & Strategic Context

`programa_aud` is an ISO/IEC 17021-1:2015 and ISO 19011:2018 conformity assessment and audit management platform built on TypeScript, Vite, Tailwind CSS v4, Express, and Supabase PostgreSQL. With the foundational schema, three-domain structure, audit scheduling/calendar/results engine, and forensic `public.audit_log` already operational, the platform now requires a cohesive **second-generation architectural and UX modernization**.

Current pain points identified across the codebase include:
- **Inconsistent view taxonomy & layout drift:** Plural directories (`Organización`, `Certificado`, `Auditor`, `Norma`, `Sector IAF`, etc.) vary in header styling, search controls (including a double `"X"` clear button artifact from pairing `<input type="search">` with custom clear buttons), static unreactive facet counts, and non-collapsible sidebars.
- **Navigation clutter & extra exploration cards:** Inline banner cards (`"Estructura Operativa y Certificación"`, `"BLOQUE 1 · AUDITORÍAS"`, `"Navegación del Dominio Extra"`, `"Explorador Operativo de Certificados"`, `"Volver al Dashboard"`) duplicate the top global header and crowd the workspace.
- **Obsolete/fragmented subsections & missing entity views:** Block 2 (`Certificación`) exposes standalone sub-sections (`Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, `Turnos`) instead of hierarchical child drill-down; Block 3 (`Extra`) exposes `Requisitos LTREE` and `Todos los Catálogos` while missing **`Acreditación`** (`acreditacion_norma_iaf`); and **`Acreditación`**, **`Sitio`**, **`Proceso`**, and **`Turno`** lack dedicated Detail Views.
- **Artificial Detail View scaffolding:** Detail pages display raw technical headings (`ZONA 1: METADATOS RELACIONALES...`, `ZONA 3: ATRIBUTOS DIRECTOS...`, `ZONA 4: PESTAÑAS RELACIONALES...`) instead of a clean visual hierarchy.
- **Abrupt breadcrumb resets & wrap clutter:** Cross-entity links (e.g., `Certificado` → `Norma` or `Sector IAF`) abruptly wipe domain context instead of extending contextual lineage; `flex-wrap` + bordered card containers waste vertical space; and revisits lack composite entity-aware loop truncation.
- **Hard-delete exposure & missing self-service Profile (`Perfil`):** Relational/catalog tables use `FOR ALL` RLS policies with cascading/restrictive hard deletes that threaten historical audit traceability, and users lack a dedicated **`Perfil`** management view.

To eliminate execution bottlenecks and keep every deliverable focused and independently verifiable, this master roadmap sequences the upgrade into **13 granular, non-breaking execution units** across Phases `1` through `5`:
- **Phase 1** → `1.1` (Schema, Triggers, Dependency Guard & Partial Indexes) + `1.2` (Granular RLS & Profile Self-Update)
- **Phase 2** → `2.1` (3-Block Header & Zero-Card Domain Dispatchers) + `2.2` (Minimalist Dashboard & `Perfil` View)
- **Phase 3** → `3` (Compact Borderless Breadcrumbs, Loop Prevention & Contextual Lineage)
- **Phase 4.1** → `4.1.1` (Multi View Engine & Double-`"X"` Fix) + `4.1.2` (9-Directory Rollout) + `4.1.3` (`Acreditación` Multi View)
- **Phase 4.2** → `4.2.1` (3-Zone Detail Template & 9-View Refactor) + `4.2.2` (`Acreditación` & `Sitio` Details) + `4.2.3` (`Proceso` & `Turno` Details + `drillDownView` Retirement)
- **Phase 5** → `5.1` (Safe Archive Modal & Admin Restore UX) + `5.2` (`node:test` Regression Suite & Playwright E2E Release Gate)

---

## 2. Core Architectural & UX Standards

### 2.1 Formal View Taxonomy: Multi View vs. Detail View

Every operational entity in `programa_aud` adheres strictly to one of two standardized presentation templates:

| Dimension | **Multi View** (Plural / Directory) | **Detail View** (Singular / Record) |
| :--- | :--- | :--- |
| **Purpose** | Discover, filter, search, totalize, and compare collections of records | Inspect lineage, edit record attributes, audit changes, and drill into child lists |
| **Naming** | Plural domain/collection semantics in content headers (`Organizaciones`, `Certificados`, `Acreditaciones`, etc.); singular section labels in top-header dropdowns | Record business identifier (`FN-QMS-2024-001`, `Sitio 0 — Planta Principal`, `AUD-2024-001`) |
| **Layout** | Unified Header Card + **Collapsible Sidebar Filter Column** (hamburger toggle, category checkboxes, reactive counts) + **Search & Records Canvas** (single `type="text"` search bar, totalization counter, `[⊞ Tarjetas \| ☰ Tabla]` switcher) | **Three-Zone Vertical Architecture**: (1) Parent Zone → (hairline divider) → (2) Record Zone → (3) Children Zone (tabbed list-only relationships) |
| **Primary Navigation** | Accessed from Top Header Domain Menus or breadcrumb backtracking | Accessed by clicking any record row/card in a Multi View, Parent Zone, or Children Zone tab |

---

### 2.2 Three-Block Global Header & Zero-Card Navigation

All workspace navigation lives exclusively in the sticky top header (`src/views/header.ts`, `src/lib/healthCheck.ts`) and the user account dropdown. All inline "extra exploration cards", secondary tab banners, and `"Volver al Dashboard"` buttons are eliminated.

```text
[ PA Programa de Auditoría ]   [ 📅 Auditoría ▾ ]  [ 🏛️ Certificación ▾ ]  [ 📚 Extra ▾ ]        [ 👤 User Menu ▾ ]
                                   │                   │                     │                        │
                                   ├─ Programación     ├─ Organización       ├─ Norma                 ├─ Mi Perfil (Perfil)
                                   ├─ Calendario       ├─ Certificado        ├─ Sector IAF            ├─ Panel Aprobaciones (Staff)
                                   └─ Resultado        └─ Auditor            ├─ Acreditación (NEW)    ├─ Estado DB (Admin)
                                                                             ├─ Estatus               └─ Cerrar Sesión
                                                                             ├─ Tipo
                                                                             └─ Metodología
```

**Removed from Top Navigation:**
- From Block 2 (`Certificación`): `Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, `Turnos` (accessed naturally via `Organización` → `Certificado` → `Sitio` / `Proceso` → `Turno` Detail Views).
- From Block 3 (`Extra`): `Requisitos LTREE` (integrated into `Norma` and `Proceso` Detail Views) and `Todos los Catálogos` (redundant overview card).

---

### 2.3 Minimalist Home Dashboard (`dashboardView.ts`)

- Remove redundant role (`ADMIN` / `WORKER` / `AUDITOR` / `CLIENT`) and approval (`APPROVED`) pill badges from the welcome header (identity/role iconography already resides in the top-right user menu).
- Remove the `"Explorador Operativo de Certificados"` embedded directory from the dashboard (`Certificate` exploration belongs in `Certificación > Certificado`).
- Render a calm, minimalist workspace landing view displaying RBAC-scoped high-level operational metrics (active client organizations, valid certificates, scheduled audits, active accreditations, open findings).

---

### 2.4 Standardized Three-Zone Detail View

All Detail Views (`Organización`, `Certificado`, `Auditor`, `Programación`, `Norma`, `Sector IAF`, `Estatus`, `Tipo`, `Metodología`, plus new **`Acreditación`**, **`Sitio`**, **`Proceso`**, and **`Turno`**) strip artificial `"ZONA 1 / ZONA 3 / ZONA 4"` labels and follow a strict three-zone layout:

1. **Parent Zone (Top):** Clean interactive chips/links showing direct upstream parents or normative classifications (e.g., on `Certificado`: `Organización`, `Norma`, `Sector IAF`). Clicking any parent opens its Detail View while preserving the active breadcrumb trail.
2. **Visual Divider:** A single clean hairline horizontal rule (`border-t border-slate-200`) separating upstream lineage from the record itself.
3. **Record Zone (Middle):** Record header (symbol, human identifier, status indicator, top-right `🕒 Historial de Cambios` changelog drawer button, RBAC-gated Edit and Safe Archive actions) + structured direct attributes grid + editable fields where permitted.
4. **Children Zone / Multipage (Bottom):** Clean tabbed container where each tab renders a **list-only view** of child records. Clicking any child record navigates directly to that child's Detail View (`Certificado` → `Sitio` → `Turno`; `Certificado` → `Proceso`; `Norma` → `Acreditación` / `Requisito`; etc.).

---

### 2.5 Contextual Breadcrumb Engine & Loop Prevention

- **Visual Profile:** Compact, borderless single-row trail nestled immediately above the view header (no white bordered box wrapper, no multi-line `flex-wrap` wrapping). Long trails truncate cleanly via CSS ellipsis and middle-crumb collapsing (`collapseBreadcrumbForDisplay()`).
- **Top-Header-Only Reset Rule:** Breadcrumb trails **only** reset to domain root when the user clicks a top-level header menu item (`[data-nav-reset="true"]`) or the brand logo.
- **Contextual Cross-Domain Lineage:** Navigating from any Detail View into a related parent, classification, or child entity appends to the current trail rather than switching domain roots (e.g., `Certificación > Certificado > FN-QMS-2024-001 > Sector 17`).
- **Loop Prevention:** Revisiting an entity already present in the trail (matched by composite `route + subview + entityType + entityId`) cleanly truncates the loop back to that ancestor node.

---

### 2.6 Soft-Delete Data Retention & Profile Governance

- **No Hard Deletes:** All 23 soft-deleted primary, operational, and catalog tables (`organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `auditor`, `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, plus operational child tables) never execute physical `DELETE` statements. Archiving sets `deleted_at = NOW()` and `deleted_by = auth.uid()`, preserving foreign-key integrity and `public.audit_log` forensic history.
- **Profile (`Perfil`) RBAC:** Authenticated users can view and cautiously update their own display profile metadata (`nombre`) via the **`Perfil`** view, while PostgreSQL triggers (`fn_protect_profile_rbac_fields()`) and RLS (`profiles_update_self`) strictly block self-escalation of `role` or `status`.

---

## 3. Phased Execution Index & Dependency Graph

```text
  [ Phase 1.1: Soft-Delete Schema, Triggers, Dependency RPC & Partial Indexes ]
                                       │
                                       ▼
  [ Phase 1.2: Granular RLS Write Hardening, Archive Visibility & Profile RBAC ]
                                       │
                                       ▼
  [ Phase 2.1: Three-Block Header, Route Cleanup & Zero-Card Domain Dispatchers ]
                                       │
                                       ▼
  [ Phase 2.2: Minimalist Home Dashboard & Self-Service User Profile (Perfil)  ]
                                       │
                                       ▼
  [ Phase 3: Compact Borderless Breadcrumbs, Loop Prevention & Cross Lineage   ]
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
  [ Phase 4.1.1: Universal Multi View        ]  (After 4.1.1 -> 4.1.2 unlocks 4.2.1)
  [ Engine, Reactive Facets & No Double-"X"  ]
                 │
        ┌────────┴────────┐
        ▼                 ▼
  [ Phase 4.1.2:  ] [ Phase 4.1.3:        ]
  [ 9-Dir Rollout ] [ Acreditación Multi  ]
        │                 │
        ▼                 │
  [ Phase 4.2.1:  ]       │
  [ 3-Zone Detail ]       │
  [ & 9-View Fix  ]       │
        └────────┬────────┘
                 ▼
  [ Phase 4.2.2: Acreditación & Sitio Detail Views + Child Drill-Down Wiring   ]
                 │
                 ▼
  [ Phase 4.2.3: Proceso & Turno Detail Views + drillDownView Decommissioning  ]
                 │
                 ▼
  [ Phase 5.1: Safe Archive Confirmation Modal, Admin Restore & Client Audit   ]
                 │
                 ▼
  [ Phase 5.2: node:test Regression Overhaul, New Suites & Playwright E2E Gate ]
```

| Sub-Phase | Document | Primary Focus | Key Affected Modules |
| :--- | :--- | :--- | :--- |
| **Phase 1.1** | [`phase_1.1.md`](./phase_1.1.md) | Soft-delete columns (`23` tables), `fn_prevent_hard_delete`, `fn_sync_soft_delete_metadata`, `fn_protect_profile_rbac_fields`, `get_archive_dependency_summary`, LTREE `deleted_at IS NULL`, partial unique indexes | `public/supabase/queries/01_creacion.sql`, `02_cobertura_normativa.sql`, `03_indices_optimizacion.sql` |
| **Phase 1.2** | [`phase_1.2.md`](./phase_1.2.md) | Replace `FOR ALL` RLS with explicit `FOR INSERT`/`FOR UPDATE`, `deleted_at IS NULL` read isolation, Admin archive visibility, `profiles_update_self`, reset pipeline test | `public/supabase/queries/04_rls.sql`, `06_datos_prueba.sql` |
| **Phase 2.1** | [`phase_2.1.md`](./phase_2.1.md) | 3-block singular header (`Auditoría`, `Certificación`, `Extra` + `Acreditación`), retire legacy sub-routes, strip inline banner cards/tabs/`Volver al Dashboard` | `src/lib/healthCheck.ts`, `src/lib/accessControl.ts`, `src/views/header.ts`, `src/views/auditoriasView.ts`, `src/views/certificacionView.ts`, `src/views/extraView.ts`, `src/main.ts` |
| **Phase 2.2** | [`phase_2.2.md`](./phase_2.2.md) | Strip dashboard badges & embedded certificate explorer, render minimalist RBAC KPIs, create self-service `Perfil` view & validation | `src/views/dashboardView.ts`, `src/views/profileView.ts` *(new)*, `src/lib/healthCheck.ts`, `src/main.ts` |
| **Phase 3** | [`phase_3.md`](./phase_3.md) | Borderless single-row breadcrumbs, `collapseBreadcrumbForDisplay()`, composite `entityType + entityId` loop prevention, top-header-only resets | `src/lib/breadcrumb.ts`, `src/views/breadcrumbView.ts`, `src/main.ts` |
| **Phase 4.1.1** | [`phase_4.1.1.md`](./phase_4.1.1.md) | `computeReactiveFacetCounts()`, collapsible hamburger sidebar (`isSidebarOpen`), category checkboxes, global `type="search"` → `type="text"` double-`"X"` fix | `src/lib/universalTemplate.ts`, `src/views/universalTemplate.ts`, `src/views/searchControlsView.ts`, 8 view files |
| **Phase 4.1.2** | [`phase_4.1.2.md`](./phase_4.1.2.md) | Roll out unified Multi View shell & reactive checkbox facets across 9 existing directories (Batch A: Certificación/Auditoría; Batch B: Extra catalogs) + `main.ts` state | `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `programacionView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts`, `src/main.ts` |
| **Phase 4.1.3** | [`phase_4.1.3.md`](./phase_4.1.3.md) | New `Acreditación` domain (`acreditacion_norma_iaf` + `organismo_acreditacion`), Multi View directory, Supabase hydration & creation modal | `src/lib/acreditacionDomain.ts` *(new)*, `src/views/acreditacionView.ts` *(new)*, `src/views/extraView.ts`, `src/main.ts` |
| **Phase 4.2.1** | [`phase_4.2.1.md`](./phase_4.2.1.md) | Standardize 3-Zone Detail template (Parent → Divider → Record → List-Only Children), strip all `"ZONA *"` labels across 9 existing Detail Views | `src/views/detailTemplate.ts`, `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `programacionView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts` |
| **Phase 4.2.2** | [`phase_4.2.2.md`](./phase_4.2.2.md) | `Acreditación` Detail View, new `Sitio` domain & Detail View (`Sitio 0` principal guard), wire `Certificado > Sitios`, `Norma`, `Sector IAF` child clicks | `src/views/acreditacionView.ts`, `src/lib/sitioDomain.ts` *(new)*, `src/views/sitioView.ts` *(new)*, `src/main.ts` |
| **Phase 4.2.3** | [`phase_4.2.3.md`](./phase_4.2.3.md) | New `Proceso` (LTREE clause mapping) & `Turno` (overnight duration, reciprocal `Sitio` links) Detail Views, move shared `FindingRecord` types to `auditDomain.ts`, retire `drillDownView.ts` | `src/lib/procesoDomain.ts` *(new)*, `src/views/procesoView.ts` *(new)*, `src/lib/turnoDomain.ts` *(new)*, `src/views/turnoView.ts` *(new)*, `src/lib/auditDomain.ts`, retire `src/views/drillDownView.ts` |
| **Phase 5.1** | [`phase_5.1.md`](./phase_5.1.md) | Dependency-aware `Archivar Registro` modal (`get_archive_dependency_summary`), Admin `"Mostrar Archivados"` / `"Restaurar"`, zero `.delete()` client audit | `src/lib/archiveGovernance.ts` *(new)*, `src/views/archiveModalView.ts` *(new)*, `src/views/universalTemplate.ts`, `src/main.ts` |
| **Phase 5.2** | [`phase_5.2.md`](./phase_5.2.md) | Refactor existing `node:test` suites, add 4 new test modules (`multiViewFacets`, `detailViewsPhase42`, `profileGovernance`, `archiveGovernance`), `tsc`/`lint`/`build` + Playwright E2E gate (`1440px` & `375px`) | `src/lib/*.test.ts`, Playwright verification suite |

---

## 4. Cross-Cutting Non-Negotiable Guardrails

1. **Zero Raw UUID Exposure:** Never display raw 36-character UUIDs in breadcrumbs, Multi View summaries, Parent Zones, or error toasts; always resolve human-readable codes/names (`numero_certificado`, `nombre`, `codigo`, `hora_entrada - hora_salida`), careful with long strings.
2. **RBAC Continuity:** Every route, action button, archive trigger, and self-service profile edit must enforce server-side PostgreSQL RLS parity with client-side guards (`src/lib/accessControl.ts`).
3. **Spanish UI / ISO Standards Alignment:** All rendered UI labels, counters (`"Mostrando X de Y ..."`), validation messages, and tooltips remain in formal Spanish aligned with ISO/IEC 17021-1:2015 and ISO 19011:2018.
4. **No Native `type="search"` Double `"X"`:** All search inputs across Multi Views use `type="text"` with a single explicit clear button (`✕`) and `/` keyboard shortcut.
