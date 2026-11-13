# Phase 4.2.1: Standardized 3-Zone Detail Template & Existing Entity Detail View Refactor

> **Parent Phase:** Phase 4.2 — Three-Zone Detail View Architecture & Child Drill-Downs  
> **Depends On:** [`phase_3.md`](./phase_3.md) (Contextual Breadcrumbs), [`phase_4.1.2.md`](./phase_4.1.2.md) (Standardized Multi Views)  
> **Unlocks:** [`phase_4.2.2.md`](./phase_4.2.2.md) (`Acreditación` & `Sitio` Detail Views), [`phase_4.2.3.md`](./phase_4.2.3.md) (`Proceso` & `Turno` Detail Views)

---

## 1. Objectives & Scope

Currently, Detail Views across `programa_aud` render developer-facing section labels (`"ZONA 1: METADATOS RELACIONALES..."`, `"ZONA 3: ATRIBUTOS DIRECTOS..."`, `"ZONA 4: PESTAÑAS RELACIONALES ESPECIALIZADAS..."`), hardcode `"Atributos Directos del Registro"` in `detailTemplate.ts`, use legacy `data-drilldown-select-org` attributes in parent chips, and mix bulky inline forms/sub-grids inside child tabs.

**Phase 4.2.1** establishes the clean, uniform **Three-Zone Detail View Standard** across `src/views/detailTemplate.ts` and refactors all **9 existing Detail Views** (`organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `programacionView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts`)—without yet adding the 4 new Detail Views (`Acreditación`, `Sitio`, `Proceso`, `Turno`), which follow cleanly in Phases 4.2.2 and 4.2.3.

---

## 2. Technical & UX Specifications

### 2.1 Standardized Three-Zone Detail View Contract (`src/views/detailTemplate.ts`)

Every Detail View renders inside a clean vertical container (`space-y-4` / `space-y-5`) with **zero** `"ZONA 1"`, `"ZONA 3"`, `"ZONA 4"`, `"Atributos Directos del Registro"`, or `"Relación Padre-Hijo Verificada"` technical labels:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [ ← Volver ]                                   [ 🕒 Historial de Cambios ]│
├─────────────────────────────────────────────────────────────────────────┤
│ PARENT ZONE (Clickable Parent / Reference Lineage Chips)                │
│  [🏢 Organización: Alimentos El Sol]  [📘 ISO 9001:2015]  [🏭 Sector 17] │
├─────────────────────────────────────────────────────────────────────────┤  <-- Hairline Divider
│ RECORD ZONE                                                             │
│  📜 FN-QMS-2024-001           [Vigente]   [✏️ Editar]  [🗄️ Archivar]     │
│  ┌──────────────────┬──────────────────┬──────────────────┐             │
│  │ N° Certificado   │ Modalidad        │ Cobertura ISO    │             │
│  └──────────────────┴──────────────────┴──────────────────┘             │
│  [ Alcance Declarado (Editable textarea / text) ]                       │
├─────────────────────────────────────────────────────────────────────────┤
│ CHILDREN ZONE (Multipage Tabbed List-Only Relationships)                │
│  [ 📍 Sitios (3) | ⚙️ Procesos (5) | 🚫 Exclusiones | 📅 Auditorías (2) ] │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Clean List-Only Table (Click any row -> Child Detail View)       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Strict Zone Rules:
1. **Parent Zone (Top):**
   - Renders concise clickable parent/classification chips (`button` / `a` with `data-parent-nav`) above the divider line.
   - Clicking any parent link executes `pushBreadcrumb(state.breadcrumbs, ...)` (never `resetBreadcrumbToDomain`) and opens that parent's Detail View.
   - Replaces legacy `data-drilldown-select-org` attributes in `detailTemplate.ts` with standardized contextual navigation attributes.
   - For standalone root catalogs without upstream parents (`Estatus`, `Tipo`, `Metodología`), omit the Parent Zone and divider cleanly rather than rendering an empty placeholder box.
2. **Hairline Divider:**
   - Single `<hr class="border-t border-slate-200 my-4" />` separating Parent Zone from Record Zone whenever Parent Zone is present.
3. **Record Zone (Middle):**
   - Header bar: human-readable business title, optional status indicator, `🕒 Historial de Cambios` changelog button (`data-action="open-changelog"`), and RBAC-gated `Editar` / `Archivar` triggers.
   - Structured key-value grid + inline edit form (`ADMIN`/`WORKER`), displaying **zero** raw UUIDs.
4. **Children Zone / Multipage (Bottom):**
   - Tab bar (`role="tablist"`) switching between child entity collections.
   - **List-Only Discipline:** Each tab renders a clean, compact `<table>` or clickable row list—never nested Multi View sidebars or bulky card walls. Creation triggers (`+ Agregar ...`) open a compact inline form or modal above the list.

### 2.2 Refactoring All 9 Existing Detail Views

- **`organizacionView.ts`:** Strip lines 752 & 801 `"ZONA 1/3"`; Parent Zone (primary Sector IAF if defined) → Divider → Record Zone (RIF, fiscal address, active certificate count) → Children Tabs (`Certificados` clickable → `Certificado` Detail, `Auditorías` clickable → `Programación/Auditoría` Detail).
- **`certificadoView.ts`:** Strip lines 728, 828, 996 `"ZONA 1/3/4"`; Parent Zone (`Organización`, `Norma`, `Sector IAF`) → Divider → Record Zone (including ISO 8.2 `alcance` editor `10–1000` chars) → Children Tabs (`Sitios` with `Sitio 0` first, `Procesos`, `No Aplicables` ISO 4.3, `Cobertura Normativa`, `Auditorías`). *(Row-click hooks for `Sitio` and `Proceso` prepared for Phases 4.2.2/4.2.3.)*
- **`auditorView.ts`:** Strip lines 643, 693, 846 `"ZONA 1/3/4"`; clean credential header → Divider → Record Zone → Children Tabs (`Competencias` with clickable `Norma` / `Sector IAF`, `Historial de Auditorías` clickable → `Auditoría` Detail).
- **`programacionView.ts`:** Parent Zone (`Organización`, `Certificado`, `Tipo`, `Metodología`) → Divider → Record Zone → Children Tabs (`Equipo Auditor` clickable → `Auditor` Detail, `Sitios Asignados`, `Procesos y Turnos`, `Hallazgos` & `Comentarios`).
- **`normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts`:** Strip any legacy scaffolding; render clean 3-Zone layout with clickable list-only Children Tabs (`Norma` → `Requisitos LTREE`, `Acreditaciones`, `Certificados`; `Sector IAF` → `Sub-Sectores`, `Acreditaciones`, `Certificados`, `Auditores`).

---

## 3. Implementation Checklist

- [ ] Refactor `src/views/detailTemplate.ts` to remove `"ZONA *"` / `"Atributos Directos"` / `"Relación Padre-Hijo"` text and legacy `data-drilldown-select-org` attributes.
- [ ] Strip all `"ZONA *"` headings and standardize Parent → Divider → Record → List-Only Children Tabs across `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, and `programacionView.ts`.
- [ ] Normalize `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, and `metodologiaAuditoriaView.ts` to the 3-Zone Detail View grammar and add clickable `Certificados` / `Auditorías` / `Auditores` row navigation.
- [ ] Ensure every `"← Volver"` action in `detailTemplate.ts` and `main.ts` invokes `popToParentBreadcrumb()`.

---

## 4. Acceptance Criteria

1. Searching the entire `src/` directory (excluding legacy `*.test.ts` pending Phase 5.2) for `ZONA ` returns **0 matches** in rendered UI templates.
2. Every existing Detail View follows the exact visual structure: Parent Zone (when applicable) → subtle horizontal divider → Record Zone → tabbed list-only Children Zone.
3. Clicking any parent link or child list row pushes onto `state.breadcrumbs` without resetting domain ancestry or exposing raw UUIDs.
