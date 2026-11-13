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

This master roadmap sequences these upgrades into **6 clean, incremental, non-breaking phases** (`Phase 1` through `Phase 5`, with `Phase 4` split into `4.1` and `4.2`).

---

## 2. Core Architectural & UX Standards

### 2.1 Formal View Taxonomy: Multi View vs. Detail View

Every operational entity in `programa_aud` adheres strictly to one of two standardized presentation templates:

| Dimension | **Multi View** (Plural / Directory) | **Detail View** (Singular / Record) |
| :--- | :--- | :--- |
| **Purpose** | Discover, filter, search, totalize, and compare collections of records | Inspect lineage, edit record attributes, audit changes, and drill into child lists |
| **Naming** | Plural domain/collection semantics in content headers (`Organizaciones`, `Certificados`, `Acreditaciones`, etc.); singular section labels in top-header dropdowns | Record business identifier (`FN-QMS-2024-001`, `Sitio 0 — Planta Principal`, `AUD-2024-001`) |
| **Layout** | Unified Header Card + **Collapsible Sidebar Filter Column** (hamburger toggle, category checkboxes, reactive counts) + **Search & Records Canvas** (single search bar, totalization counter, `[⊞ Tarjetas \| ☰ Tabla]` switcher) | **Three-Zone Vertical Architecture**: (1) Parent Zone → (divider line) → (2) Record Zone → (3) Children Zone (tabbed list-only relationships) |
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
- Render a calm, minimalist workspace landing view displaying RBAC-scoped high-level operational metrics (e.g., active client organizations, valid certificates, scheduled/in-progress audits, active accreditations, open findings).

---

### 2.4 Standardized Three-Zone Detail View

All Detail Views (`Organización`, `Certificado`, `Auditor`, `Programación`, `Norma`, `Sector IAF`, `Estatus`, `Tipo`, `Metodología`, plus new **`Acreditación`**, **`Sitio`**, **`Proceso`**, and **`Turno`**) strip artificial `"ZONA 1 / ZONA 3 / ZONA 4"` labels and follow a strict three-zone layout:

1. **Parent Zone (Top):** Clean interactive chips/links showing direct upstream parents or normative classifications (e.g., on `Certificado`: `Organización`, `Norma`, `Sector IAF`). Clicking any parent opens its Detail View while preserving the active breadcrumb trail.
2. **Visual Divider:** A single clean hairline horizontal rule (`border-t border-slate-200`) separating upstream lineage from the record itself.
3. **Record Zone (Middle):** Record header (symbol, human identifier, status indicator, top-right `🕒 Historial de Cambios` changelog drawer button, RBAC-gated Edit and Safe Archive actions) + structured direct attributes grid + editable fields where permitted.
4. **Children Zone / Multipage (Bottom):** Clean tabbed container where each tab renders a **list-only view** of child records. Clicking any child record navigates directly to that child's Detail View (`Certificado` → `Sitio` → `Turno`; `Certificado` → `Proceso`; `Norma` → `Acreditación` / `Requisito`; etc.).

---

### 2.5 Contextual Breadcrumb Engine & Loop Prevention

- **Visual Profile:** Compact, borderless single-row trail nestled immediately above the view header (no white bordered box wrapper, no multi-line `flex-wrap` wrapping). Long trails truncate cleanly via CSS ellipsis and middle-crumb collapsing.
- **Top-Header-Only Reset Rule:** Breadcrumb trails **only** reset to domain root when the user clicks a top-level header menu item (`[data-nav-reset="true"]`) or the brand logo.
- **Contextual Cross-Domain Lineage:** Navigating from any Detail View into a related parent, classification, or child entity appends to the current trail rather than switching domain roots (e.g., `Certificación > Certificado > FN-QMS-2024-001 > Sector 17`).
- **Loop Prevention:** Revisiting an entity already present in the trail (matched by composite `route + subview + entityType + entityId`) cleanly truncates the loop back to that ancestor node.

---

### 2.6 Soft-Delete Data Retention & Profile Governance

- **No Hard Deletes:** Core, relational, and catalog tables (`organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `auditor`, `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`) never execute physical `DELETE` statements. Archiving sets `deleted_at = NOW()` and `deleted_by = auth.uid()`, preserving foreign-key integrity and `public.audit_log` forensic history.
- **Profile (`Perfil`) RBAC:** Authenticated users can view and cautiously update their own display profile metadata (`nombre`) via the **`Perfil`** view, while PostgreSQL triggers and RLS strictly block self-escalation of `role` or `status`.

---

## 3. Phased Execution Index & Dependency Graph

```text
  [ Phase 1: DB Soft-Delete Retention, Audit Integrity & Profile RBAC ]
                                 │
                                 ▼
  [ Phase 2: Three-Block Header, Minimalist Dashboard, Zero Cards & Perfil ]
                                 │
                                 ▼
  [ Phase 3: Compact Breadcrumbs, Loop Prevention & Contextual Lineage ]
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
  [ Phase 4.1: Universal Multi View   ]   [ Phase 4.2: Standardized 3-Zone Detail View ]
  [ Collapsible Sidebar, Reactive     ]   [ & New Detail Views (Acreditación, Sitio,   ]
  [ Counts, Fix Double-X, Acreditación]   [ Proceso, Turno)                            ]
               └─────────────────┬─────────────────┘
                                 │
                                 ▼
  [ Phase 5: Safe Archive UX, node:test Regression Suite & E2E Verification ]
```

| Phase | Document | Primary Focus | Key Affected Modules |
| :--- | :--- | :--- | :--- |
| **Phase 1** | [`phase_1.md`](./phase_1.md) | Soft-delete schema columns, hard-delete prevention triggers, partial unique indexes, RLS write hardening, `profiles` self-update guard | `public/supabase/queries/01_creacion.sql`, `02_cobertura_normativa.sql`, `03_indices_optimizacion.sql`, `04_rls.sql` |
| **Phase 2** | [`phase_2.md`](./phase_2.md) | Three-block header (`Auditoría`, `Certificación`, `Extra` + `Acreditación`), removal of obsolete subsections & extra exploration cards, minimalist dashboard, `Perfil` view | `src/lib/healthCheck.ts`, `src/views/header.ts`, `src/views/dashboardView.ts`, `src/views/auditoriasView.ts`, `src/views/certificacionView.ts`, `src/views/extraView.ts`, `src/views/profileView.ts` (new), `src/main.ts` |
| **Phase 3** | [`phase_3.md`](./phase_3.md) | Borderless compact breadcrumb UI, single-row overflow ellipsis, composite-key loop prevention, contextual cross-entity navigation preservation | `src/lib/breadcrumb.ts`, `src/views/breadcrumbView.ts`, `src/main.ts` |
| **Phase 4.1** | [`phase_4.1.md`](./phase_4.1.md) | Universal Multi View template, collapsible hamburger facet sidebar, reactive intersection counts, single unified search bar (no double `"X"`), `Acreditación` Multi View | `src/lib/universalTemplate.ts`, `src/views/universalTemplate.ts`, `src/views/organizacionView.ts`, `src/views/certificadoView.ts`, `src/views/auditorView.ts`, `src/views/programacionView.ts`, `src/views/normaView.ts`, `src/views/sectorIafView.ts`, `src/views/estatusView.ts`, `src/views/tipoAuditoriaView.ts`, `src/views/metodologiaAuditoriaView.ts`, `src/views/acreditacionView.ts` (new) |
| **Phase 4.2** | [`phase_4.2.md`](./phase_4.2.md) | 3-zone Detail View refactor (strip `ZONA` headings, Parent→Divider→Record→Children), child list-only drill-downs, new Detail Views for `Acreditación`, `Sitio`, `Proceso`, `Turno` | `src/views/detailTemplate.ts`, `src/views/certificadoView.ts`, `src/views/organizacionView.ts`, `src/views/auditorView.ts`, `src/views/programacionView.ts`, `src/views/acreditacionView.ts`, `src/views/sitioView.ts` (new), `src/views/procesoView.ts` (new), `src/views/turnoView.ts` (new), decommission `src/views/drillDownView.ts` |
| **Phase 5** | [`phase_5.md`](./phase_5.md) | Archive/restore confirmation UX with dependency summary, expanded `node:test` suites, `tsc --noEmit`, `vite build`, Chromium responsive verification | `src/lib/*.test.ts`, `src/main.ts`, Playwright verification suite |

---

## 4. Cross-Cutting Non-Negotiable Guardrails

1. **Zero Raw UUID Exposure:** Never display raw 36-character UUIDs in breadcrumbs, Multi View summaries, Parent Zones, or error toasts; always resolve human-readable codes/names (`numero_certificado`, `nombre`, `codigo`, `hora_entrada - hora_salida`), careful with long strings.
2. **RBAC Continuity:** Every route, action button, archive trigger, and self-service profile edit must enforce server-side PostgreSQL RLS parity with client-side guards (`src/lib/accessControl.ts`).
3. **Spanish UI / ISO Standards Alignment:** All rendered UI labels, counters (`"Mostrando X de Y ..."`), validation messages, and tooltips remain in formal Spanish aligned with ISO/IEC 17021-1:2015 and ISO 19011:2018.
4. **No Native `type="search"` Double `"X"`:** All search inputs across Multi Views use `type="text"` with a single explicit clear button (`✕`) and `/` keyboard shortcut.
