# Phase 2: Global UI/UX Shell, Universal Templates & Navigation Engine

## 1. Executive Summary & Phase Scope

Phase 2 engineers the core presentation framework, navigation systems, and reusable UI blueprints for `programa_aud`. This phase addresses the top structural usability requirements:
1. Modernizing user identity indicators with clean, minimalist role and status iconography.
2. Restructuring the persistent application header into three distinct operational domains.
3. Establishing an interactive, persistent drill-down breadcrumb trail with automated reset rules.
4. Implementing a universal list/grid view template with sidebar facets and Excel-style column sorting.
5. Standardizing the entity detail page architecture with child tabs and an integrated changelog modal.

---

## 2. Architectural Blueprints & UX Components

### 2.1 Minimalist Role & Status Iconography
Bulky colored badges (such as textual `"WORKER"` or `"APPROVED"` badges) are eliminated to maintain a sleek, professional interface:
- **Approved Users:** A clean, minimalist icon is rendered directly to the left of the user's display name, visually conveying their functional role:
  - **Admin:** Security Shield icon (`🛡️` / minimalist shield glyph) with subtle primary accenting.
  - **Worker:** Technical Operations Cog icon (`⚙️` / precision gear glyph).
  - **Auditor:** Audit Checklist/Clipboard icon (`📋` / inspection clipboard glyph).
  - **Client:** Enterprise Building icon (`🏢` / corporate building glyph).
- **Unapproved Users:** Role icons are strictly suppressed to prevent role ambiguity. Only an unequivocal status icon is displayed:
  - **Pending Approval:** Amber hourglass/clock icon (`⏳`) with tooltip indicating pending administrator review.
  - **Rejected:** Rose cross/restriction icon (`❌`) with tooltip indicating access rejection.

```text
┌────────────────────────────────────────────────────────┐
│ APPROVED USER:   [🛡️] Carlos Mendoza (Administrador)  │
│ PENDING USER:    [⏳] Laura Gómez (Pendiente)          │
│ REJECTED USER:   [❌] Juan Pérez (Rechazado)           │
└────────────────────────────────────────────────────────┘
```

### 2.2 Global Navigation Header Restructuring (Three Operational Blocks)
The main navigation header in `src/views/header.ts` is re-architected into three coherent operational domains reflecting ISO/IEC 17021-1 certification lifecycles:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [PA] Programa de Auditoría                                                             │
│                                                                                        │
│ ├── BLOCK 1: Auditorías    [ Programación | Calendario | Resultado ]                   │
│ ├── BLOCK 2: Certificación [ Organización | Certificado | Auditor ]                    │
│ └── BLOCK 3: Extra         [ Norma | Sector IAF | Estatus | Tipo | Metodología ]       │
│                                                                                        │
│ [🛡️] Admin User ▾ [ Mi Perfil | Panel Aprobaciones | Estado DB | Cerrar Sesión ]       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Top Header Reset Rule:** Clicking any link in the top navigation header instantly resets the breadcrumb trail to the root of that target domain, clearing any nested drill-down state.

### 2.3 Persistent Drill-Down & Breadcrumb Trail Engine
A persistent breadcrumb component is mounted above the primary card canvas:
- **Hierarchical Ancestry Display:** Tracks navigation depth from parent entities down to granular operational artifacts:
  - Example: `Organizaciones > CyberCloud Solutions S.L. > FN-EMS-2024-002 > Sede Central (Sitio 0)`
- **Interactive Backtracking:** Every intermediate ancestor segment is a clickable button. Clicking an ancestor immediately navigates the workspace back to that exact entity level without a full page reload.
- **Ellipsis Truncation (`...`):** To preserve horizontal balance and prevent wrapping on smaller screens, segments exceeding 24 characters are truncated using CSS text ellipsis with HTML `title` tooltips displaying the full entity name.
- **State Integration:** The breadcrumb state is managed through the central application state container (`AppState`) and synchronized with browser history where applicable.

### 2.4 Repeatable View Architecture Pattern (List, Grid, Detail)
To ensure absolute architectural consistency across all application modules and operational phases, every business entity conforms to a standardized tripartite view pattern:

#### A. Standard List View (High-Density Tabular Mode)
- **Use Case:** High-throughput administrative work, scanning large registries, comparing operational statuses, and conducting batch data audits.
- **Structural Blueprint:**
  - **Header Zone:** Standardized semantic title (`h1`), contextual subtitle, search input with clear trigger (`✕`) and keyboard focus (`/`), and layout switcher (`⊞ Grid | ☰ List`).
  - **Facet Sidebar (Left Pane):** Filter counts for active statuses, norms, sectors, and audit modalities.
  - **Data Table Canvas (Right Pane):**
    - High-density table with sticky headers.
    - Multi-attribute sortable column headers with visual state indicators (▲ ascending, ▼ descending, neutral).
    - Column-specific popovers for quick filtering and text matching.
    - Formatted data cells with clean text truncation and HTML `title` tooltips.
    - Interactive row selection: clicking anywhere on a row or its primary identifier adds the record to the persistent breadcrumb trail and navigates to the **Detail View**.

#### B. Standard Grid View (Responsive Relational Cards Mode)
- **Use Case:** Executive overviews, visual exploration, tablet/mobile touch viewports, and card scanning.
- **Structural Blueprint:**
  - Shares the exact same header zone and left-hand facet sidebar as the List View.
  - **Relational Card Anatomy:**
    - **Card Header:** Primary Entity Name / Code, Canonical Status Badge, and Type Indicator.
    - **Card Body:** Key relational parent metadata (e.g., Parent Organization, Standard, IAF Sector) rendered as human-readable tags.
    - **KPI Metrics Strip:** 2 to 3 high-value counters (e.g., Active Sites count, Total Clauses covered, Scheduled Audits).
    - **Card Action Footer:** Dedicated primary link (*"Ver Detalle / Gestionar"*) plus contextual secondary actions.
    - Entire card surface is clickable, seamlessly transitioning to the **Detail View**.

#### C. Standard Detail View (Structured Relational 4-Zone Layout)
- Specified in Section 2.5 below, establishing a strictly predictable 4-zone layout across all relational entities.

---

### 2.5 Standardized Detail Page Architecture & Audit Trail Modal

Detail pages across the platform follow a standardized, repeatable structure based on relational entities (e.g., referencing `organizacion`, `certificado`, `sitio`, `proceso`, `auditoria`). The architecture is partitioned into four distinct vertical zones:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a la Lista de Certificados                    [🕒 Historial de Cambios (14)]  │
│                                                                                        │
│ 📜 CERTIFICADO: FN-QMS-2024-001                                      [Badge: ACTIVO]   │
│ Certificación de Sistemas de Gestión de la Calidad (ISO 9001:2015)                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 1: PARENT DATA SECTION (UPPER ZONE - MULTI-COLUMN RELATIONAL METADATA)            │
│ ┌───────────────────────────────┬───────────────────────────────┬────────────────────┐ │
│ │ Organización Titular:         │ Norma Aplicable:              │ Sector IAF:        │ │
│ │ 🏢 [Iberometal Componentes S.A.]│ 📘 [ISO 9001:2015]           │ 🏭 [Sector 17]     │ │
│ │ (Click abre detalle de Org)   │ (Click abre detalle de Norma) │ (Click abre Sector)│ │
│ ├───────────────────────────────┼───────────────────────────────┼────────────────────┤ │
│ │ Estatus del Certificado:      │ Organismo Acreditador:        │ Sub-Sector IAF:    │ │
│ │ 🏷️ [Activo]                  │ 🏛️ [ENAC (01/C-SC001)]        │ ⚙️ [17.1 Metales]   │ │
│ └───────────────────────────────┴───────────────────────────────┴────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ──────────────────────── VISUAL SEPARATOR (CLEAN MINIMAL RULE) ─────────────────────── │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: DIRECT RECORD ATTRIBUTES SECTION (MULTI-COLUMN VIEW / EDIT STATE)              │
│ [ Modo: Visualización | ✏️ Editar Atributos ]                                          │
│                                                                                        │
│ ┌──────────────────────────────┬──────────────────────────────┬──────────────────────┐ │
│ │ Número de Certificado:       │ Fecha de Emisión:            │ Fecha de Vencimiento:│ │
│ │ FN-QMS-2024-001 (Textbox)    │ 2024-03-15 (Datepicker)      │ 2027-03-14           │ │
│ ├──────────────────────────────┼──────────────────────────────┼──────────────────────┤ │
│ │ Esquema Multisitio:          │ Sedes Sucursales:            │ Turnos Totales:      │ │
│ │ Sí (Checkbox / Switch)       │ 2 sedes (Sitio 0 excluido)   │ 3 turnos rotativos   │ │
│ ├──────────────────────────────┴──────────────────────────────┴──────────────────────┤ │
│ │ Alcance de la Certificación (10 a 1000 caracteres):                                │ │
│ │ [ Textarea Multilínea con Contador Dinámico de Caracteres: (184 / 1000) ]           │ │
│ │ "Diseño, manufactura, estampado, fundición y comercialización de piezas metálicas y │ │
│ │ componentes troquelados para la industria automotriz y de línea blanca nacional."  │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE - RELATIONAL CHILD TABLES)          │
│ [ 🏢 Sitios (3) ] [ ⚙️ Procesos (4) ] [ ⏱️ Turnos (2) ] [ 🚫 No Aplicables (1) ] [ 📋 Auditorías (2) ]│
│                                                                                        │
│ ┌────────┬───────────────────────┬───────────────────────────────┬───────────────────┐ │
│ │ No.    │ Nombre de la Sede     │ Dirección Física              │ Tipo de Sede      │ │
│ ├────────┼───────────────────────┼───────────────────────────────┼───────────────────┤ │
│ │ 0      │ Sede Principal HQ     │ Av. Industrial 100, Valencia  │ ★ Principal (HQ)  │ │
│ │ 1      │ Planta Ensamblaje     │ Zona Industrial Norte, Lote 4 │ Sucursal Operativa│ │
│ │ 2      │ Centro Distribución   │ Puerto Cabello, Galpón 12     │ Almacén / Logíst. │ │
│ └────────┴───────────────────────┴───────────────────────────────┴───────────────────┘ │
│ • Filas interactivas: Clic en 'Planta Ensamblaje' abre el detalle de Sitio y          │
│   actualiza el breadcrumb: Certificado > FN-QMS-2024-001 > Planta Ensamblaje (Sitio 1) │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Specifications of the Four Zones:

1. **Header & Forensic Audit Trail Action:**
   - Standardized entity identification banner including Entity Glyph, Canonical Name/Code, and Status Token.
   - **Changelog Modal Button (`🕒 Historial de Cambios`):** Dedicated top-right trigger that opens the `public.audit_log` modal. Queries mutation events filtered by target table and record ID, presenting an interactive timeline with actor attribution, timestamps, and JSON diffs (`old_data` vs. `new_data`).

2. **Parent Data Section (Upper Zone - Multi-Column Optional):**
   - Displays direct foreign-key parent entity references (e.g., `id_organizacion`, `id_norma`, `id_estatus`, `id_sector_iaf`).
   - **Zero Raw IDs Mandate:** Under no circumstance is a raw UUID displayed. Every parent reference resolves to human-readable names with contextual icons (e.g., `🏢 Iberometal Componentes S.A.` instead of `30000000-0000-...`).
   - **Breadcrumb Activation:** Every parent reference is an active navigational link. Clicking a parent immediately activates the drill-down breadcrumb bar, navigating directly to the parent entity's detail view.

3. **Visual Separator:**
   - A crisp, minimalist horizontal divider dividing parent metadata from the record's direct attributes.

4. **Direct Record Attributes Section (Multi-Column Optional):**
   - Displays fields belonging directly to the record in a responsive multi-column layout.
   - **Dynamic UI State Management:**
     - **Read-Only View Mode:** Formatted text display, status tokens, formatted currency/dates, and structured narrative containers.
     - **Edit Mode:** Authorized roles (`ADMIN`, `WORKER`, and assigned `AUDITOR`) can toggle inline editing:
       - Small textboxes for numeric codes, site numbers, and tax identification numbers.
       - Option selectors (`<select>`) for canonical statuses and categorical values.
       - Large multiline text areas (`<textarea>`) with live character counters for narrative fields such as certificate `alcance` (enforcing the 10 to 1000 character length constraint).

5. **Multipage / Child Tabs Section (Lower Zone):**
   - Foreign-key child relations (e.g., `sitio` linked via `id_certificado`, `proceso`, `turno`, `hallazgo`) are organized into tabbed multipage views.
   - Inside each tab, child records appear in a structured, high-density list view with explicitly defined operational columns.
   - Child rows are clickable: selecting a child record seamlessly triggers drill-down navigation and appends a child segment to the persistent breadcrumb trail.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 2.1:** Header component updated with the 3 operational blocks and minimalist role/status iconography.
- [ ] **Milestone 2.2:** Persistent breadcrumb bar component implemented with interactive navigation callbacks, text truncation, and top-nav reset logic.
- [ ] **Milestone 2.3:** Universal List/Grid View component created with search debouncing, sidebar facet filtering, and Excel-style column sorting adhering to the Repeatable View Pattern.
- [ ] **Milestone 2.4:** Standardized 4-zone Detail Page template built with Parent Data upper zone, visual separator, direct attributes with view/edit states (including textboxes, selectors, and textarea character counters), and multipage child relationship tabs.
- [ ] **Milestone 2.5:** Record-level changelog modal component implemented, connected to `public.audit_log` with diff visualization.
- [ ] **Milestone 2.6:** Unit tests created in `src/lib/` for breadcrumb state transformations, search filtering, and active facet evaluation.

---

## 4. Acceptance Criteria & Quality Gates

1. **Visual Clarity:** Bulky badges are completely replaced by minimalist SVG icons positioned to the left of the user's name.
2. **Navigation Determinism:** Clicking any ancestor breadcrumb segment restores previous view states cleanly without page reloads.
3. **Reset Invariance:** Clicking any primary header link resets the active breadcrumb trail to the root of that domain.
4. **Zero UUID Exposure:** Automated DOM inspection verifies that zero raw UUID strings are visible in rendered detail views and child tables.
5. **Audit Traceability:** The History modal accurately displays chronological mutation events from `public.audit_log` for the target record.
