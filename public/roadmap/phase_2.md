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

### 2.4 Universal List/Grid View Template
To guarantee visual and behavioral consistency across all system directories, a standard list/grid layout component is established:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Titulo de la Sección                                                                   │
│ Breve descripción contextual o alcance normativo                                       │
│                                                                                        │
│ [ 🔍 Buscar por código, nombre, RIF... (Presione '/' para enfocar) ]   [⊞ Grid | ☰ List]│
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ SIDEBAR FACETAS   │ CONTENIDO DE DATOS                                                 │
│                   │                                                                    │
│ • Estatus         │ EN MODO TABLA (LIST VIEW):                                         │
│   [ ] Activo (12) │ ┌──────────────────┬──────────────┬─────────────┬────────────────┐ │
│   [ ] Estudio (4) │ │ Nombre/Código ▲▼ │ Esquema ▲▼   │ Estado ▲▼   │ Acciones       │ │
│ • Esquema / Norma │ ├──────────────────┼──────────────┼─────────────┼────────────────┤ │
│   [ ] ISO 9001    │ │ CyberCloud S.L.  │ ISO 9001:15  │ Activo      │ [Ver Detalle]  │ │
│   [ ] ISO 27001   │ └──────────────────┴──────────────┴─────────────┴────────────────┘ │
│ • Sector IAF      │                                                                    │
│   [ ] 17 - Metales│ EN MODO TARJETA (GRID VIEW):                                       │
│   [ ] 28 - Constru│ ┌───────────────────────┐  ┌───────────────────────┐               │
│                   │ │ CyberCloud Solutions  │  │ Iberometal Comp. S.A. │               │
│ [Limpiar Filtros] │ │ RIF: J-40192831-2     │  │ RIF: J-30918274-1     │               │
│                   │ └───────────────────────┘  └───────────────────────┘               │
└───────────────────┴────────────────────────────────────────────────────────────────────┘
```

- **Header Controls:** Semantic title, descriptive subtitle, and unified real-time search input with clear button (`✕`) and match counter badge.
- **Presentation Switcher:** Instant toggle between high-density tabular view and responsive relational cards, persisted in `localStorage`.
- **Left-Hand Facet Sidebar:** Collapsible filter pane for quick single-click filtering on statuses, standards, and sectors with match count badges.
- **Excel-Style Column Tools:** Table columns feature sort triggers (ascending, descending, neutral) and quick filter popovers.

### 2.5 Standardized Detail Page Architecture & Audit Trail Modal
Every system record detail page adheres to a standardized structural blueprint:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a la Lista                                    [🕒 Historial de Cambios]       │
│                                                                                        │
│ [Icono Entidad] NOMBRE DE LA ENTIDAD / CÓDIGO                         [Badge Estatus]  │
│ Subtítulo descriptivo o identificador fiscal / sector                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ATRIBUTOS DIRECTOS DEL REGISTRO                                                        │
│ ┌──────────────────────┬──────────────────────┬──────────────────────────────────────┐ │
│ │ Campo 1: Valor       │ Campo 2: Valor       │ Campo 3: Valor                       │ │
│ │ Campo 4: Valor       │ Campo 5: Valor       │ Campo 6: Valor                       │ │
│ └──────────────────────┴──────────────────────┴──────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PESTAÑAS MULTI-PÁGINA (RELACIONES HIJAS)                                              │
│ [ Pestaña 1 (Conteo) ]  [ Pestaña 2 (Conteo) ]  [ Pestaña 3 (Conteo) ]                 │
│                                                                                        │
│ • Listado interactivo de registros relacionados                                        │
│ • Enlaces humanos y legibles (CERO UUIDs expuestos en la interfaz)                    │
│ • Clic en un registro hijo navega a su detalle y añade segmento al breadcrumb          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Top-Right Changelog Trigger (`🕒 Historial de Cambios`):**
  - Always positioned at the top-right of the detail view.
  - Opens a dedicated modal overlay querying `public.audit_log` filtered by `table_name` and `record_id`.
  - Displays chronological audit entries: mutation action (`INSERT`, `UPDATE`, `DELETE`), actor username/email, formatted timestamp, and side-by-side JSON diffs of modified fields.
- **Strict No-UUID Policy:** No raw database UUIDs (e.g. `40000000-0000-...`) may ever be displayed in labels, tooltips, or table cells. All foreign references must resolve to human-readable names with clickable links.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 2.1:** Header component updated with the 3 operational blocks and minimalist role/status iconography.
- [ ] **Milestone 2.2:** Persistent breadcrumb bar component implemented with interactive navigation callbacks, text truncation, and top-nav reset logic.
- [ ] **Milestone 2.3:** Universal List/Grid View component created with search debouncing, sidebar facet filtering, and Excel-style column sorting.
- [ ] **Milestone 2.4:** Standardized Detail Page template built with upper attribute card and child relationship tab switcher.
- [ ] **Milestone 2.5:** Record-level changelog modal component implemented, connected to `public.audit_log` with diff visualization.
- [ ] **Milestone 2.6:** Unit tests created in `src/lib/` for breadcrumb state transformations, search filtering, and active facet evaluation.

---

## 4. Acceptance Criteria & Quality Gates

1. **Visual Clarity:** Bulky badges are completely replaced by minimalist SVG icons positioned to the left of the user's name.
2. **Navigation Determinism:** Clicking any ancestor breadcrumb segment restores previous view states cleanly without page reloads.
3. **Reset Invariance:** Clicking any primary header link resets the active breadcrumb trail to the root of that domain.
4. **Zero UUID Exposure:** Automated DOM inspection verifies that zero raw UUID strings are visible in rendered detail views and child tables.
5. **Audit Traceability:** The History modal accurately displays chronological mutation events from `public.audit_log` for the target record.
