# Phase 4.1.2: Multi View Standardization Rollout Across Existing Operational & Catalog Directories

> **Parent Phase:** Phase 4.1 — Universal Multi View Architecture  
> **Depends On:** [`phase_4.1.1.md`](./phase_4.1.1.md) (Universal Multi View Engine & Reactive Counts)  
> **Unlocks:** [`phase_4.2.1.md`](./phase_4.2.1.md) (3-Zone Detail View Refactor)

---

## 1. Objectives & Scope

Currently, 9 existing plural directories (`organizacionView.ts` [1,202L], `certificadoView.ts` [1,492L], `auditorView.ts` [1,096L], `programacionView.ts` [1,398L], `normaView.ts` [1,075L], `sectorIafView.ts` [842L], `estatusView.ts` [466L], `tipoAuditoriaView.ts` [447L], `metodologiaAuditoriaView.ts` [428L]) implement bespoke headers, static single-select sidebar buttons, and inconsistent counters.

**Phase 4.1.2** migrates all **9 existing plural directories** onto the Phase 4.1.1 Universal Multi View shell in two clean, verifiable batches—wiring multi-select checkbox state and reactive facet counts in `src/main.ts` without altering Detail View internals (which are addressed in Phase 4.2.1).

---

## 2. Migration Batches & Facet Specifications

### Batch A — Operational Directories (`Certificación` & `Auditoría`)

1. **`Organizaciones` (`src/views/organizacionView.ts`):**
   - *Plural Header:* `Organizaciones Clientes` + `+ Nueva Organización` (`ADMIN`/`WORKER`).
   - *Checkbox Facets:* `Vigencia de Certificados` (`Con Certificados Activos`, `Sin Certificados Activos`) and `Sector IAF`.
   - *Search Fields:* `nombre`, `rif`, `direccion_fiscal`.
   - *Totalizer:* `"Mostrando X de Y organizaciones clientes"`.

2. **`Certificados` (`src/views/certificadoView.ts`):**
   - *Plural Header:* `Certificados de Conformidad` + `+ Nuevo Certificado`.
   - *Checkbox Facets:* `Estatus`, `Norma ISO`, `Sector IAF`, `Modalidad` (`Multisitio`, `Sede Única`).
   - *Search Fields:* `numero_certificado`, `organizacion_nombre`, `norma_codigo`, `alcance`.
   - *Totalizer:* `"Mostrando X de Y certificados registrados"`.

3. **`Auditores` (`src/views/auditorView.ts`):**
   - *Plural Header:* `Equipo de Auditores` + `+ Nuevo Auditor`.
   - *Checkbox Facets:* `Norma ISO Calificada`, `Sector IAF`, `Vigencia de Credenciales` (`Vigente`, `Por Vencer`, `Vencido`).
   - *Search Fields:* `nombre`, normas/sectores calificados.
   - *Totalizer:* `"Mostrando X de Y auditores registrados"`.

4. **`Programación` (`src/views/programacionView.ts`):**
   - *Plural Header:* `Programación de Auditorías` + `+ Programar Auditoría`.
   - *Checkbox Facets:* `Tipo de Auditoría`, `Metodología`, `Norma ISO`, `Estado de Equipo` (`Con Auditor Líder`, `Pendiente de Equipo`).
   - *Search Fields:* código/certificado, organización, tipo, metodología, auditores.
   - *Totalizer:* `"Mostrando X de Y auditorías programadas"`.

*(Note: `Calendario` (`calendarioView.ts`) and `Resultado` (`resultadoView.ts`) remain specialized stage views inside `Auditoría`, aligned to the same header grammar, `"Mostrando X de Y ..."` counter, and `type="text"` search inputs.)*

### Batch B — Master Catalog Directories (`Extra`)

5. **`Normas` (`src/views/normaView.ts`):**
   - *Checkbox Facets:* `Esquema`, `Estatus` (`Vigente`, `En Revisión`, `Obsoleta`).
   - *Totalizer:* `"Mostrando X de Y normas certificables"`.
6. **`Sectores IAF` (`src/views/sectorIafView.ts`):**
   - *Checkbox Facets:* `Nivel de Riesgo Sub-Sector` (`ALTO`, `MEDIO`, `BAJO`), `Con Auditores Calificados`.
   - *Totalizer:* `"Mostrando X de Y sectores IAF"`.
7. **`Estatus` (`src/views/estatusView.ts`):**
   - *Checkbox Facets:* `Uso Operativo` (`En Certificados`, `Sin Uso`).
   - *Totalizer:* `"Mostrando X de Y estatus operativos"`.
8. **`Tipos de Auditoría` (`src/views/tipoAuditoriaView.ts`):**
   - *Checkbox Facets:* `Categoría de Ciclo` (`Inicial`, `Seguimiento`, `Renovación`, `Especial`).
   - *Totalizer:* `"Mostrando X de Y tipos de auditoría"`.
9. **`Metodologías` (`src/views/metodologiaAuditoriaView.ts`):**
   - *Checkbox Facets:* `Modalidad` (`Presencial`, `Remota`, `Mixta`).
   - *Totalizer:* `"Mostrando X de Y metodologías"`.

---

## 3. State & Event Wiring (`src/main.ts`)

- Standardize domain Multi View state slices (`facetSelections: Record<string, Set<string>>`, `isSidebarOpen: boolean`, `viewMode: 'cards' | 'table'`, `sortColumn`, `sortDirection`, `searchQuery`).
- Wire shared `data-toggle-sidebar`, `data-facet-checkbox`, `data-clear-filters`, `data-clear-search`, `data-view-mode`, and `data-sort-col` delegated handlers cleanly so all 9 directories share deterministic DOM behavior and cursor/focus preservation.

---

## 4. Implementation Checklist

- [ ] Migrate Batch A (`organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `programacionView.ts`) to the unified Multi View shell with collapsible checkbox facets and reactive counts.
- [ ] Migrate Batch B (`normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts`) to the unified Multi View shell with collapsible checkbox facets and reactive counts.
- [ ] Align `calendarioView.ts` and `resultadoView.ts` headers and search controls (`type="text"` + single `✕`).
- [ ] Update Multi View state structures and delegated event handlers in `src/main.ts` to support multi-select `Set<string>` facets and `isSidebarOpen` across all 9 directories.

---

## 5. Acceptance Criteria

1. Every one of the 9 existing plural directories renders a single unified header/controls bar, `"Mostrando X de Y ..."` counter, `[⊞ Tarjetas | ☰ Tabla]` switcher, and collapsible `☰ Filtros` sidebar.
2. Checking multiple checkboxes within a category applies `OR` logic, checking across categories applies `AND` logic, and sibling/cross-category facet counts recalculate immediately via `computeReactiveFacetCounts()`.
3. Collapsing the filter sidebar expands both `⊞ Tarjetas` and `☰ Tabla` to 100% container width cleanly on `1440px` and `375px` viewports.
