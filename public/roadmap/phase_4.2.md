# Phase 4.2: Standardized Three-Zone Detail View & Missing Entity Detail Views (`Acreditación`, `Sitio`, `Proceso`, `Turno`)

## 1. Objectives & Architectural Rationale

Currently, Detail Views across `programa_aud` suffer from structural inconsistencies and incomplete entity coverage:
- **Artificial zone scaffolding:** `organizacionView.ts` (lines 752, 801), `auditorView.ts` (lines 643, 693, 846), `certificadoView.ts` (lines 728, 828, 996), and `detailTemplate.ts` (lines 285–298) render developer-facing section labels such as `ZONA 1: METADATOS RELACIONALES...`, `ZONA 3: ATRIBUTOS DIRECTOS...`, and `ZONA 4: PESTAÑAS RELACIONALES ESPECIALIZADAS...`.
- **Missing Detail Views:** Clicking a `Sitio`, `Proceso`, or `Turno` inside `Certificado` tabs—or inspecting `Acreditación` (`acreditacion_norma_iaf`)—has no dedicated Detail View, forcing legacy workarounds through `drillDownView.ts` or inline nested editing blocks inside tabs.
- **Cluttered Children Tabs:** Some child tabs mix inline forms, grids, and secondary dashboards instead of presenting clean **list-only views** that link directly into each child's Detail View.

Phase 4.2 establishes a crisp, uniform **Three-Zone Detail View** standard across all existing Detail Views and delivers dedicated Detail Views for **`Acreditación`**, **`Sitio`**, **`Proceso`**, and **`Turno`**.

---

## 2. Current State Gap Analysis

| File / Entity | Current State | Target State in Phase 4.2 |
| :--- | :--- | :--- |
| `src/views/detailTemplate.ts` | Uses `"Zone 0 / Zone 1 / Zone 2 / Zone 3 / Zone 4"` comments, renders `"Atributos Directos del Registro"` hardcoded heading, and `parentInfo` links use legacy `data-drilldown-select-org`. | Clean **3-Zone Detail Template**: (1) **Parent Zone** (clickable parent links), (2) hairline horizontal divider (`border-t border-slate-200`), (3) **Record Zone** (header, direct editable attributes, changelog + archive triggers), (4) **Children Zone** (clean multipage tabs with list-only tables clicking through to child Detail Views). |
| `src/views/certificadoView.ts`, `organizacionView.ts`, `auditorView.ts`, `programacionView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts` | Contain literal `"ZONA 1:"`, `"ZONA 3:"`, `"ZONA 4:"` text headings and inconsistent inline nested UIs inside child tabs. | Strip every `"ZONA *"` heading; unify Parent → Divider → Record → Children Tabs structure; convert Children Zone tabs into **list-only views** linking to child Detail Views (`Organización` → `Certificado`; `Certificado` → `Sitio` / `Proceso`; `Sitio` → `Turno`; `Norma` → `Acreditación`). |
| `Acreditación` (`src/views/acreditacionView.ts`) | Missing Detail View. | Dedicated **Acreditación Detail View** (`Organismo`, `Norma`, `Sector IAF` in Parent Zone; accreditation fields in Record Zone; covered `Certificados` list in Children Zone). |
| `Sitio` (`src/views/sitioView.ts` *New*) | Only inline table rows inside `certificadoView.ts` + obsolete `certificacionView.ts` sub-tab. | Dedicated **Sitio Detail View** (`Certificado` & `Organización` in Parent Zone; `numero_sitio` with `Sitio 0` principal highlight, `nombre_sitio`, `direccion_sitio` in Record Zone; `Turnos Asignados` & `Auditorías` lists in Children Zone). |
| `Proceso` (`src/views/procesoView.ts` *New*) | Only inline list inside `certificadoView.ts` + obsolete `certificacionView.ts` sub-tab. | Dedicated **Proceso Detail View** (`Certificado` & `Organización` in Parent Zone; `nombre_proceso`, `tipo` in Record Zone; `Requisitos Normativos`, `Hallazgos`, & `Auditorías` lists in Children Zone). |
| `Turno` (`src/views/turnoView.ts` *New*) | Only inline shift schedules inside `certificacionView.ts` `shifts` sub-tab. | Dedicated **Turno Detail View** (contextual `Sitio` / `Certificado` in Parent Zone when navigated from a site; `hora_entrada`, `hora_salida`, duration in Record Zone; `Sedes con este Turno` & `Auditorías en este Turno` lists in Children Zone). |
| `src/views/drillDownView.ts` | Legacy standalone Explorer duplicated by real Detail Views. | Decommission `drillDownView.ts` route and file references once all parent/child Detail Views are live. |

---

## 3. Technical & UX Specifications

### 3.1 Standardized Three-Zone Detail View Contract

Every Detail View renders inside a clean vertical container (`space-y-4` or `space-y-5`) with **zero artificial zone labels** (`ZONA 1`, `ZONA 3`, `ZONA 4`, `Atributos Directos del Registro`, `Relación Padre-Hijo Verificada`):

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [ ← Volver ]                                   [ 🕒 Historial de Cambios ]│
├─────────────────────────────────────────────────────────────────────────┤
│ PARENT ZONE (Clickable Parent / Reference Lineage Cards)                │
│  [🏢 Organización: Alimentos El Sol]  [📘 ISO 9001:2015]  [🏭 Sector 17] │
├─────────────────────────────────────────────────────────────────────────┤  <-- Clean Line Divider
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

#### Zone Rules:
1. **Parent Zone:**
   - Displays concise clickable parent/classification chips or compact cards above the divider line.
   - Clicking any item invokes `pushBreadcrumb(state.breadcrumbs, ...)` (Phase 3 contextual lineage—never resets breadcrumbs!) and opens that parent's Detail View.
   - For root entities without upstream parents (e.g., `Estatus`, `Tipo`, `Metodología`, or `Organización` when viewed standalone—note `Organización` may still show its primary `Sector IAF` reference if applicable or render cleanly with an empty Parent Zone omitting the divider).
2. **Line Divider:**
   - A clean, subtle horizontal rule (`<hr class="border-t border-slate-200 my-4" />`) visually separating Parent Zone from Record Zone whenever Parent Zone is present.
3. **Record Zone:**
   - Top bar: human-readable title, optional status indicator, `🕒 Historial de Cambios` changelog drawer button, and RBAC-gated `Editar` / `Archivar` (soft-delete) controls.
   - Attribute grid: clean key-value cells with inline edit mode for authorized roles (`ADMIN`/`WORKER`). Zero raw UUIDs displayed.
4. **Children Zone (Multipage):**
   - Clean tab bar (`role="tablist"`) switching between related child entity collections.
   - **List-Only Discipline:** Each tab renders a clean, compact table (`<table>`) or clickable row list (no heavy nested Multi View facet sidebars or bulky card walls inside tabs). Clicking any child row opens that child's **Detail View** and pushes it onto the breadcrumb trail.
   - Authorized creation actions (e.g., `+ Agregar Sitio`, `+ Agregar Proceso`, `+ Asignar Turno`) open a focused inline form or modal right above the list without cluttering the read view.

---

### 3.2 Specifications for the Four New Detail Views

#### A. `Acreditación` Detail View (`src/views/acreditacionView.ts`)
- **Parent Zone:**
  - `Organismo de Acreditación`: e.g., `ENAC — Entidad Nacional de Acreditación (España)` (displays country & website link).
  - `Norma`: clickable link → opens **`Norma` Detail View**.
  - `Sector IAF`: clickable link → opens **`Sector IAF` Detail View** (or `"Todos los Sectores"` when `id_sector_iaf IS NULL`).
- **Record Zone:**
  - Editable/inspectable attributes: `numero_acreditacion`, `fecha_concesion`, `fecha_vencimiento`, `estatus` (`Activa`, `Suspendida`, `Vencida`), calculated days-to-expiration indicator.
  - `Editar` & `Archivar` (`ADMIN`/`WORKER`).
- **Children Zone (Multipage):**
  - Tab 1: **Certificados Amparados** — list-only table of active `certificado` records matching `(id_norma, id_sector_iaf)`; clicking a row navigates to **`Certificado` Detail View**.
  - Tab 2: **Sub-Sectores IAF del Alcance** — list-only table of `subsector_iaf` rows linked to `id_sector_iaf` with risk categories (`ALTO`, `MEDIO`, `BAJO`).

#### B. `Sitio` Detail View (`src/views/sitioView.ts` & `src/lib/sitioDomain.ts`)
- **Parent Zone:**
  - `Organización`: clickable link → **`Organización` Detail View**.
  - `Certificado`: clickable link → **`Certificado` Detail View**.
- **Record Zone:**
  - Title & Principal Badge: Displays `Sitio ${numero_sitio} — ${nombre_sitio}` (explicitly labeling `numero_sitio === 0` as `Sede Principal`).
  - Editable attributes (`ADMIN`/`WORKER`): `numero_sitio` (integer `>= 0`), `nombre_sitio`, `direccion_sitio`.
  - Safe Archive action (`deleted_at = NOW()`, blocked if `numero_sitio === 0` while active secondary sites or active audits depend on it).
- **Children Zone (Multipage):**
  - Tab 1: **Turnos Operativos Asignados** (`turnos_por_sitio` joined with `turno`) — list-only table (`Horario Entrada`, `Horario Salida`, `Duración`). Clicking any row navigates to **`Turno` Detail View**. Includes `+ Asignar Turno` control for `ADMIN`/`WORKER`.
  - Tab 2: **Auditorías en este Sitio** (`sitios_por_auditoria` joined with `auditoria`) — list-only table (`Código Auditoría`, `Tipo`, `Fecha`, `Estatus`). Clicking any row navigates to **`Programación / Auditoría` Detail View**.

#### C. `Proceso` Detail View (`src/views/procesoView.ts` & `src/lib/procesoDomain.ts`)
- **Parent Zone:**
  - `Organización`: clickable link → **`Organización` Detail View**.
  - `Certificado`: clickable link → **`Certificado` Detail View**.
- **Record Zone:**
  - Editable attributes (`ADMIN`/`WORKER`): `nombre_proceso`, `tipo` (`Estratégico`, `Medular`, `De Apoyo`, `Otro`), computed count of mapped ISO clauses.
  - Safe Archive action (`deleted_at = NOW()`).
- **Children Zone (Multipage):**
  - Tab 1: **Requisitos Normativos Vinculados** (`requisitos_por_proceso` joined with `requisito`) — list-only table showing clause code (`4.1`, `8.5.1`), LTREE path, and toggle/assign controls (`ADMIN`/`WORKER`) scoped to the parent certificate's `Norma`.
  - Tab 2: **Hallazgos Asociados** (`hallazgo`) — list-only table (`Tipo`, `Cláusula`, `Descripción`, `Estado Cerrado/Abierto`) linking to the parent **`Auditoría` Resultado/Detail View**.
  - Tab 3: **Auditorías Programadas** (`procesos_sitio_auditoria`) — list-only table showing which site, shift, and audit evaluate this process.

#### D. `Turno` Detail View (`src/views/turnoView.ts` & `src/lib/turnoDomain.ts`)
- **Parent Zone:**
  - Contextual `Sitio` + `Certificado` links when opened from a specific `Sitio` Detail View (preserving drill-down ancestry).
- **Record Zone:**
  - Editable attributes (`ADMIN`/`WORKER`): `hora_entrada` (`HH:MM`), `hora_salida` (`HH:MM`), computed shift duration (`8h 00m`, handles overnight shifts cleanly e.g. `22:00 → 06:00`).
  - Safe Archive action (`deleted_at = NOW()`).
- **Children Zone (Multipage):**
  - Tab 1: **Sedes Operativas con este Turno** (`turnos_por_sitio` joined with `sitio` and `certificado`) — list-only table showing `Sitio`, `Certificado`, and `Organización`. Clicking any row opens that **`Sitio` Detail View**.
  - Tab 2: **Auditorías en este Turno** (`turnos_sitio_auditoria` joined with `sitios_por_auditoria` and `auditoria`) — list-only table clicking through to **`Auditoría` Detail View**.

---

### 3.3 Refactoring Existing Detail Views to the 3-Zone Standard

Update all existing Detail Views to remove `"ZONA *"` headers, normalize the Parent Zone + divider + Record Zone + list-only Children Zone structure, and wire child row clicks:
- `organizacionView.ts`: Parent Zone (primary Sector IAF classification if defined) → Divider → Record Zone → Children Tabs: `Certificados` (clicks → `Certificado` Detail) & `Auditorías` (clicks → `Auditoría` Detail).
- `certificadoView.ts`: Parent Zone (`Organización`, `Norma`, `Sector IAF`) → Divider → Record Zone (including ISO 8.2 editable scope) → Children Tabs: `Sitios` (clicks → **`Sitio` Detail**), `Procesos` (clicks → **`Proceso` Detail**), `No Aplicables` (ISO 4.3 exclusions list), `Cobertura Normativa`, `Auditorías` (clicks → `Auditoría` Detail).
- `auditorView.ts`: Clean Parent/Credential metadata → Divider → Record Zone → Children Tabs: `Competencias` (`Normas` / `Sectores IAF` clickable) & `Historial de Auditorías` (clicks → `Auditoría` Detail).
- `programacionView.ts` (Audit Detail): Parent Zone (`Organización`, `Certificado`, `Tipo`, `Metodología`) → Divider → Record Zone → Children Tabs: `Equipo Auditor` (clicks → `Auditor` Detail), `Sitios Asignados` (clicks → **`Sitio` Detail**), `Procesos y Turnos` (clicks → **`Proceso`/`Turno` Detail**), `Hallazgos` & `Comentarios`.
- `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts`: Strip any legacy scaffolding; render Parent Zone (where applicable) → Divider → Record Zone → Children Tabs (`Norma` → `Requisitos LTREE` + `Acreditaciones` + `Certificados`; `Sector IAF` → `Sub-Sectores` + `Acreditaciones` + `Certificados` + `Auditores`).

---

## 4. Implementation Checklist

- [ ] Refactor `src/views/detailTemplate.ts` to eliminate `"ZONA"` / `"Atributos Directos"` technical labels and render the clean Parent Zone → hairline divider → Record Zone → list-only Children Zone.
- [ ] Strip all `"ZONA 1:"`, `"ZONA 3:"`, `"ZONA 4:"` strings across `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, and `programacionView.ts`.
- [ ] Implement Detail View for **`Acreditación`** in `src/views/acreditacionView.ts` with parent links (`Norma`, `Sector IAF`) and child `Certificados` list.
- [ ] Create `src/lib/sitioDomain.ts` + `src/views/sitioView.ts` for **`Sitio` Detail View**, wiring `Certificado -> Sitios` row clicks and `Sitio -> Turnos` row clicks.
- [ ] Create `src/lib/procesoDomain.ts` + `src/views/procesoView.ts` for **`Proceso` Detail View**, wiring `Certificado -> Procesos` row clicks and LTREE clause mapping.
- [ ] Create `src/lib/turnoDomain.ts` + `src/views/turnoView.ts` for **`Turno` Detail View**, wiring `Sitio -> Turnos` row clicks and reciprocal `Turno -> Sitios` drill-down.
- [ ] Decommission `src/views/drillDownView.ts` and remove dead `drilldown` / `sites` / `processes` / `shifts` top-level dispatch code from `src/main.ts` and `src/views/certificacionView.ts`.

---

## 5. Acceptance Criteria

1. Searching the entire `src/` directory for `ZONA ` returns **0 matches** in rendered UI templates.
2. Every Detail View visibly follows the clean 3-Zone layout: clickable Parent Zone → subtle horizontal divider → editable/inspectable Record Zone → tabbed list-only Children Zone.
3. Clicking a `Sitio` inside a `Certificado` opens **`Sitio` Detail View** (`Certificación > Certificado > FN-QMS-2024-001 > Sitio 0`); clicking a `Turno` inside that `Sitio` opens **`Turno` Detail View** (`... > Sitio 0 > 07:00 - 15:00`).
4. Clicking a `Proceso` inside a `Certificado` opens **`Proceso` Detail View** with linked ISO requirements, findings, and audit assignments.
5. Clicking an `Acreditación` in `Extra > Acreditación` (or from `Norma` / `Sector IAF` Children Zone) opens **`Acreditación` Detail View** with clickable `Norma`, `Sector IAF`, and covered `Certificados`.
