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
│     UNIVERSAL LIST/GRID TEMPLATE      │ │    STANDARDIZED REPEATABLE DETAIL PAGE       │
│ ┌───────────┐ ┌─────────────────────┐ │ │ ┌──────────────────────────────────────────┐ │
│ │  SIDEBAR  │ │ Title & Subtitle    │ │ │ │ Header: Name, Badge, [🕒 Historial Modal] │ │
│ │  FACETS   │ │ Search Bar & Mode ⊞ │ │ │ ├──────────────────────────────────────────┤ │
│ │           │ ├─────────────────────┤ │ │ │ ZONE 1: PARENT DATA (FK Friendly Links)   │ │
│ │ • Status  │ │ Excel-Like Columns  │ │ │ │  Organización: [CyberCloud S.L.] (Click)  │ │
│ │ • Sector  │ │ Sort, Filter, Tools │ │ │ │  Norma: [ISO 9001:2015] · Estatus: [Activo]│ │
│ │ • Schema  │ ├─────────────────────┤ │ │ ├──────────────────────────────────────────┤ │
│ │ • Standard│ │ Cards OR Dense Grid │ │ │ │ ─── VISUAL SEPARATOR (Minimal Divider) ──│ │
│ │           │ │ (Click row/card     │ │ │ ├──────────────────────────────────────────┤ │
│ │           │ │  drills to Detail)  │ │ │ │ ZONE 2: DIRECT RECORD ATTRIBUTES          │ │
│ └───────────┘ └─────────────────────┘ │ │ │  • Multi-column read-only OR edit mode   │ │
│                                       │ │ │  • Option selectors, textboxes, textarea │ │
│                                       │ │ │    (e.g., 'alcance' 10-1000 characters)  │ │
│                                       │ │ ├──────────────────────────────────────────┤ │
│                                       │ │ │ ZONE 3: MULTIPAGE / CHILD TABS (Lower)   │ │
│                                       │ │ │  [🏢 Sitios] [⚙️ Procesos] [📋 Auditorías] │ │
│                                       │ │ │  • High-density child list views         │ │
│                                       │ │ │  • Clickable rows drill down in tree     │ │
│                                       │ │ └──────────────────────────────────────────┘ │
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

### 2. Repeatable View Architecture Pattern
To ensure absolute architectural consistency across all application modules and phases, every business entity conforms to a standardized tripartite view pattern:

1. **Standard List View (High-Density Tabular Mode):**
   - Ideal for data scanning, batch review, and rapid operational audits.
   - Excel-style sortable column headers with visual state indicators (▲ ascending, ▼ descending, neutral).
   - Column-level quick filter popovers and row action triggers.
   - Clean truncation of long strings with title tooltips.
   - Entire row or primary identifier is clickable, pushing the entity to the breadcrumb trail and transitioning to the Detail View.

2. **Standard Grid View (Responsive Relational Cards Mode):**
   - Optimized for executive overviews, card scanning, and mobile/tablet responsive viewports.
   - Standardized card anatomy: Entity Title, Status/Classification Badge, Core Meta Badges, direct KPI metrics (e.g., active certificates count, covered clauses, auditor qualifications).
   - Clickable card surface triggering seamless drill-down to the Detail View.

3. **Standard Detail View (Relational 4-Zone Structure):**
   - Detailed in Section 4 below, governing the structured representation of parent metadata, direct attributes with dynamic read/edit controls, and multipage child relationship tables.

### 3. Persistent Drill-Down & Breadcrumb Trail
- Located permanently above the active content canvas.
- Renders hierarchical ancestry: `Organización > [Nombre Organización] > [Certificado] > [Sede / Proceso / Auditoría]`.
- Every segment is fully interactive: clicking any ancestor segment navigates directly back to that level without full document reload.
- Long organization or certificate names are elegantly constrained using CSS ellipsis (`...`) and tooltips to preserve compact horizontal space across viewports.
- **Top Header Reset Rule:** Clicking any link in the top global navigation header (`Auditorías`, `Certificación`, `Extra`) instantly resets the breadcrumb trail to the root of the targeted domain.

### 4. Standardized Detail Pages & Multi-Page Child Relational Tabs
Every entity detail page across the platform follows an uncompromising, repeatable relational architecture:

1. **Header & Forensic Audit Trail Action:**
   - Semantic title, canonical status/classification badge, back button, and a dedicated top-right trigger: `🕒 Historial de Cambios`.
   - Opens a modal inspect panel displaying all chronological entries from `public.audit_log` matching the entity ID and table name (`old_data` vs. `new_data` diffs, timestamp, and actor).

2. **Parent Data Section (Upper Zone - Multi-Column Optional):**
   - Displays all direct foreign-key parent entity references (e.g., for a certificate: `id_organizacion`, `id_estatus`, `id_norma`, `id_sector_iaf`).
   - **Zero Raw IDs Mandate:** Foreign references must never render raw UUIDs (`40000000-0000-...`). They are displayed as friendly, readable linked entity names (e.g., *CyberCloud Solutions S.L.*, *ISO 9001:2015*, *Activo*, *Sector 17 - Metales*).
   - **Breadcrumb Activation:** Clicking any parent link activates the breadcrumb bar and navigates directly to that parent entity's detail view.

3. **Visual Separator:**
   - A clean, minimal divider dividing parent metadata from the record's direct attributes.

4. **Direct Record Attributes Section (Multi-Column Optional):**
   - Displays fields belonging directly to the record in a clean multi-column layout showing field label and value.
   - **Dynamic UI States:**
     - **Read-Only View Mode:** Clean typographic presentation with formatted dates, status tokens, and text containers.
     - **Edit Mode:** Interactive inputs appropriate to data types:
       - Small textboxes for numeric codes, site numbers, and tax IDs.
       - Option selectors (`<select>`) for canonical statuses and categorical values.
       - Large multiline text areas with live character counters for narrative fields such as certificate `alcance` (10 to 1000 characters).

5. **Multipage / Child Tabs Section (Lower Zone):**
   - Organizes all foreign-key child relations (such as `sitio` linked via `id_certificado`, `proceso`, `turno`, `hallazgo`) into tabbed multipage views.
   - Inside each tab, child records appear in a structured list view with defined columns.
   - Child rows are clickable, seamlessly triggering drill-down navigation and appending a child segment to the persistent breadcrumb trail.

---

## Phased Implementation Structure

To maintain zero technical debt, ensure flawless database integrity, and allow clean incremental verification, the upgrade is partitioned into **6 strategic phases**:

```text
Phase 1: Database Architecture & Schema Modernization
   │     • Sub-sectors in IAF (hierarchical codes e.g. 17.1, 17.2)
   │     • Standards expansion: code, title, status & Accreditation schema
   │     • Table 'proceso' update: add 'tipo' ('Estratégico', 'Medular', 'De Apoyo', 'Otro')
   │     • Table 'certificado' update: add 'alcance' string (10 to 1000 characters)
   │     • Non-applicability justification text in certificate exclusions
   │     • Site 0 convention for Principal Sites & Catalog standardizations
   ▼
Phase 2: Global UI/UX Shell, Universal Templates & Navigation Engine
   │     • Minimalist role & status iconography in header & accounts
   │     • Persistent interactive breadcrumb bar with ellipsis & reset rules
   │     • Repeatable View Architecture Pattern (Standard List, Grid, Detail)
   │     • Standardized Detail Page Blueprint (Parent Data Zone, Separator,
   │       Direct Attributes [View/Edit], Multipage Child Tabs & Changelog Modal)
   ▼
Phase 3: Domain "Extra" — Master Catalogs & Accreditation Management
   │     • Norma: list, grid & detail with [Acreditación] and [Requisitos] child tabs
   │     • Sector IAF: list, grid & detail with [Sub-Sector] child tab
   │     • Estatus: 8 standardized statuses list & detail views
   │     • Tipo: 9 audit modalities list & detail views
   │     • Metodología: 3 execution methods list & detail views
   ▼
Phase 4: Domain "Certificación" — Organizations, Certificates & Competencies
   │     • Organización: list with active cert count, detail with [Certificados] tab
   │     • Certificado: list & standardized detail (Parent metadata zone,
   │       direct attributes with 'alcance' textarea [10-1000 chars], and 5 child tabs:
   │       [Sitios (Site 0 first)], [Procesos (with 'tipo')], [Turnos], [No Aplicables], [Auditorías])
   │     • Proceso: integration of 'tipo' (Estratégico, Medular, De Apoyo, Otro)
   │     • Auditor: directory & detail with ISO standard + IAF sub-sector matrix
   ▼
Phase 5: Domain "Auditorías" — Planning, Calendar & Field Outcomes
   │     • Programación: audit event planning, modalities, scope & team
   │     • Calendario: interactive chronological timeline & execution schedule
   │     • Resultado: field execution, findings lifecycle (NC Mayor/Menor, Obs, OM)
   │       connected to process types and ISO 17021-1 certification readiness
   ▼
Phase 6: System Integration, Audit Trail Hardening & Final Verification
         • End-to-end breadcrumb & changelog verification across all transitions
         • Validation of 'proceso.tipo' and 'certificado.alcance' constraints
         • Verification of 4-zone detail page and repeatable view pattern
         • Strict RLS audit boundary enforcement (Admin, Worker, Auditor, Client)
         • Node:test automated test suite expansion & build verification
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
