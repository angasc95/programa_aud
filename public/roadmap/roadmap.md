# Master Implementation Roadmap: Major Platform Upgrade (`programa_aud`)

## Executive Summary & Upgrade Vision

`programa_aud` is a mission-critical platform designed for accredited certification bodies operating under **ISO/IEC 17021-1:2015** (Conformity assessment — Requirements for bodies providing audit and certification of management systems) and **ISO 19011:2018** (Guidelines for auditing management systems).

This master roadmap establishes the architectural blueprints, UX paradigms, and phased execution strategy for a comprehensive upgrade of the platform. The objective is to elevate `programa_aud` from a functional prototype into an enterprise-grade, highly structured, auditable certification management suite with:
1. **Universal UX Standardization:** Clean minimalist role/status iconography, a universal list/grid template with advanced column-level filtering and sidebar facets, persistent clickable breadcrumb navigation with truncation and top-level reset rules, and standardized detail pages featuring child table tabs and record-level changelog popups.
2. **Three-Block Domain Restructuring:** Restructuring the top navigation header and operational models into three clean blocks:
   - **Block 1: "Auditorías"** (`Programación`, `Calendario`, `Resultado`).
   - **Block 2: "Certificación"** (`Organización`, `Certificado`, `Auditor`).
   - **Block 3: "Extra"** (`Norma`, `Sector IAF`, `Estatus`, `Tipo`, `Metodología`).
3. **Deep Relational & Accreditation Hardening:** Accreditation entity schemas linking standards to accreditation bodies and IAF sub-sectors, site `numero_sitio = 0` principal site conventions, non-applicability audit justification notes, and human-readable relational linking across all entities with zero raw UUID exposure.

---

## High-Level Architectural Blueprint

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               GLOBAL APPLICATION HEADER                                │
│   [PA Icon] Programa de Auditoría                                                      │
│   ├── Block 1: Auditorías    [ Programación | Calendario | Resultado ]                 │
│   ├── Block 2: Certificación [ Organización | Certificado | Auditor ]                  │
│   ├── Block 3: Extra         [ Norma | Sector IAF | Estatus | Tipo | Metodología ]     │
│   └── User Block: [Role Icon / Status Icon] Username ▾ [ Profile | Admin | Logout ]    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Top Nav Click Resets Breadcrumb
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENT BREADCRUMB / DRILL-DOWN BAR                          │
│   Organizaciones > CyberCloud Solutions S.L. > FN-EMS-2024-002 > Planta Principal ...  │
│   (Interactive, Clickable Levels, Ellipsis Truncation, Dynamic Hierarchy Tracking)     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴────────────────────────┐
                    ▼                                                ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│     UNIVERSAL LIST/GRID TEMPLATE      │ │         STANDARDIZED DETAIL PAGE             │
│ ┌───────────┐ ┌─────────────────────┐ │ │ ┌──────────────────────────────────────────┐ │
│ │  SIDEBAR  │ │ Title & Subtitle    │ │ │ │ Header: Name, Badge, [Changelog Button]  │ │
│ │  FACETS   │ │ Search Bar & Mode ⊞ │ │ │ ├──────────────────────────────────────────┤ │
│ │           │ ├─────────────────────┤ │ │ │ Direct Record Attributes (Inline Edit)   │ │
│ │ • Status  │ │ Excel-Like Columns  │ │ │ ├──────────────────────────────────────────┤ │
│ │ • Sector  │ │ Sort, Filter, Tools │ │ │ │ Multi-Page Child Tabs (Related Tables)   │ │
│ │ • Schema  │ ├─────────────────────┤ │ │ │  [Tab 1] [Tab 2] [Tab 3] [Tab 4]        │ │
│ │ • Standard│ │ Cards OR Dense Grid │ │ │ │  • Human-readable clickable links        │ │
│ └───────────┘ └─────────────────────┘ │ │ └──────────────────────────────────────────┘ │
└───────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

---

## Core System Upgrades & Cross-Cutting Mandates

### 1. Minimalist User Badges & Status Icons
- **Approved Users:** Bulky colored labels (`"WORKER"`, `"APPROVED"`) are eliminated. In their place, a crisp, clean SVG/symbol icon sits directly to the left of the user's display name:
  - **Admin:** Security Shield icon (`🛡️` / minimalist shield badge).
  - **Worker:** Technical Operations Cog icon (`⚙️` / gear badge).
  - **Auditor:** Audit Clipboard/Checklist icon (`📋` / checklist badge).
  - **Client:** Enterprise Building icon (`🏢` / corporate building badge).
- **Unapproved Users:** Role icons are strictly suppressed. An unapproved account renders only the status indicator:
  - **Pending:** Amber hourglass/clock icon (`⏳` / pending state indicator).
  - **Rejected:** Rose restriction/denial icon (`❌` / rejected state indicator).

### 2. Universal List/Grid View Architecture
All primary record lists share a unified structural component layout:
- **Header Section:** Standardized semantic title (`h1`) and explanatory subtitle, accompanied by a universal real-time search input with shortcut indicators (`/` to focus, `Esc` to clear).
- **Presentation Toggle:** Dual-state switcher allowing instantaneous switching between **Relational Grid Cards** and **High-Density Data Table**, persisted in local storage.
- **Left-Hand Facet Sidebar:** Fast single-click filtering on primary attributes (operational statuses, normative schemes, IAF classifications, execution modes).
- **Excel-Style Data Table Capabilities:** Column headers equipped with multi-attribute sort triggers (ascending/descending/reset) and column-specific quick filter popovers.

### 3. Persistent Drill-Down & Breadcrumb Trail
- Located permanently above the active content canvas.
- Renders hierarchical ancestry: `Organización > [Nombre Organización] > [Certificado] > [Sede / Proceso / Auditoría]`.
- Every segment is fully interactive: clicking any ancestor segment navigates directly back to that level without full document reload.
- Long organization or certificate names are elegantly constrained using CSS ellipsis (`...`) and tooltips to preserve compact horizontal space across viewports.
- **Top Header Reset Rule:** Clicking any link in the top global navigation header (`Auditorías`, `Certificación`, `Extra`) instantly resets the breadcrumb trail to the root of the targeted domain.

### 4. Standardized Detail Pages & Multi-Page Child Relational Tabs
- **Direct Attributes Card:** Upper zone displays core entity fields with inline/modal edit controls for authorized roles (`ADMIN`, `WORKER`, and assigned `AUDITOR`).
- **Audit Trail & Changelog Button:** A dedicated history trigger (`🕒 Historial de Cambios`) in the top-right corner opens a modal inspect panel displaying all chronological entries from `public.audit_log` matching the entity ID and table name (`old_data` vs. `new_data` diffs, timestamp, and actor).
- **Child Tables via `multipage` Tabs:** Lower zone organizes all foreign-key child relations into tabbed views.
- **Strict No-UUID Exposure Mandate:** Raw database UUIDs (`40000000-0000-...`) are strictly forbidden in UI presentation. All relational references must resolve to human-readable names (e.g., *CyberCloud Solutions S.L.* instead of `id_organizacion`). Clicking any related record name seamlessly navigates to that entity's detail page and appends a segment to the breadcrumb trail.

---

## Phased Implementation Structure

To maintain zero technical debt, ensure flawless database integrity, and allow clean incremental verification, the upgrade is partitioned into **6 strategic phases**:

```text
Phase 1: Database Architecture & Schema Modernization
   │     • Sub-sectors in IAF (hierarchical codes e.g. 17.1, 17.2)
   │     • Standards expansion: code, title, status & Accreditation schema
   │     • Non-applicability justification text in certificate exclusions
   │     • Site 0 convention for Principal Sites & Catalog standardizations
   ▼
Phase 2: Global UI/UX Shell, Universal Templates & Navigation Engine
   │     • Minimalist role & status iconography in header & accounts
   │     • Persistent interactive breadcrumb bar with ellipsis & reset rules
   │     • Universal list/grid template (search, sidebar facets, Excel sorting)
   │     • Standardized detail page layout & record changelog modal engine
   ▼
Phase 3: Domain "Extra" — Master Catalogs & Accreditation Management
   │     • Norma: list & detail with [Acreditación] and [Requisitos] child tabs
   │     • Sector IAF: list & detail with [Sub-Sector] child tab
   │     • Estatus: 8 standardized statuses list & detail views
   │     • Tipo: 9 audit modalities list & detail views
   │     • Metodología: 3 execution methods list & detail views
   ▼
Phase 4: Domain "Certificación" — Organizations, Certificates & Competencies
   │     • Organización: list with active cert count, detail with [Certificados] tab
   │     • Certificado: list (clean layout) & detail with 5 tabs:
   │       [Sitios (Site 0 first)], [Procesos], [Turnos], [No Aplicables], [Auditorías]
   │     • Auditor: directory & detail with ISO standard + IAF sub-sector matrix
   ▼
Phase 5: Domain "Auditorías" — Planning, Calendar & Field Outcomes
   │     • Programación: audit event planning, modalities, scope & team
   │     • Calendario: interactive chronological timeline & execution schedule
   │     • Resultado: field execution, findings lifecycle (NC Mayor/Menor, Obs, OM)
   │       & ISO 17021-1 certification issuance readiness evaluation
   ▼
Phase 6: System Integration, Audit Trail Hardening & Final Verification
         • End-to-end breadcrumb & changelog verification across all transitions
         • Strict RLS audit boundary enforcement (Admin, Worker, Auditor, Client)
         • Node:test automated test suite expansion & build verification
         • Final operational handover & documentation synchronization
```

---

## Sequential Phase File Index

Detailed architectural blueprints, data contracts, component specifications, and milestone acceptance criteria are documented in dedicated phase files:

1. [`public/roadmap/phase_1.md`](phase_1.md): **Database Architecture & Schema Modernization**
2. [`public/roadmap/phase_2.md`](phase_2.md): **Global UI/UX Shell, Universal Templates & Navigation Engine**
3. [`public/roadmap/phase_3.md`](phase_3.md): **Domain "Extra" (Standards, Accreditation & Reference Catalogs)**
4. [`public/roadmap/phase_4.md`](phase_4.md): **Domain "Certificación" (Organizations, Certificates & Auditor Competencies)**
5. [`public/roadmap/phase_5.md`](phase_5.md): **Domain "Auditorías" (Event Scheduling, Operational Calendar & Results)**
6. [`public/roadmap/phase_6.md`](phase_6.md): **System Integration, Audit Trail Hardening & Acceptance Verification**

---

## Success Criteria & Quality Metrics
- **TypeScript Strictness:** Strict typing (`strict: true`) with zero `any` leaks.
- **Zero Raw IDs:** Human-readable labels across 100% of the UI.
- **Traceability Guarantee:** Every entity modification triggers an immutable `public.audit_log` entry verifiable via the detail page History button.
- **Responsive & Accessible:** Tailwind CSS v4 styling, ARIA compliance, full keyboard navigation (`/` and `Esc`), and zero horizontal layout breakage on mobile devices.
