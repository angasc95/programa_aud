# Step 3.2: Sub-Entity Detail Views Audit & Wiring (`Sitio`, `Proceso`, `Turno`, `No Aplicables`, `Auditoría`)

> **Previous:** [`step_3.1.md`](./step_3.1.md) (`Certificado` Multipage Child Tabs as Interactive List Views)  
> **Next:** [`step_final.md`](./step_final.md) (Verification & Sign-Off Checklist)  
> **Primary Files:** `src/views/sitioView.ts`, `src/views/procesoView.ts`, `src/views/turnoView.ts`, `src/views/programacionView.ts`, `src/views/normaView.ts`, `src/main.ts`

---

## 1. Objective

Ensure that every child tab row in `Certificado` Detail View drills cleanly into a polished, compliant Detail View, specifically verifying **`Sitio`**, **`Proceso`**, and **`Turno`** alongside **`Auditoría`** and **`No Aplicables`**:
- `Sitio`, `Proceso`, `Turno`, and `Auditoría` already have dedicated Detail Views in `src/views/`; verify they inherit the new single-card `renderDetailPageTemplate` layout cleanly and eliminate any mismatched inner buttons.
- Wire clean, dead-click-free navigation for **`No Aplicables`** rows (`requisitos_no_aplicables_certificado`) and verify breadcrumb contextual lineage (`pushBreadcrumb` / `popToBreadcrumb` / loop prevention) across all sub-entity transitions.

---

## 2. Detailed Implementation Tasks

### 2.1 Audit & Align Existing Sub-Entity Detail Views (`sitioView.ts`, `procesoView.ts`, `turnoView.ts`)
Since `sitioView.ts`, `procesoView.ts`, and `turnoView.ts` all render via `renderDetailPageTemplate()` (`src/views/detailTemplate.ts`), the Step 2.2 single-card shell upgrade applies to all three automatically. Audit and refine each view for strict parity with the `Certificado` reference model:

1. **`Sitio` Detail View (`src/views/sitioView.ts`):**
   - Verify Row 1 Top Main Row shows `[←]` (tooltip `"Volver"`), `[✏️]` (`id="startEditSitioBtn"`, icon-only, tooltip `"Editar"`), and `[🕒]` (`tableName: 'sitio'`, icon-only, tooltip `"Historial de Cambios"`).
   - Verify Row 2 Parent Chips (`Organización`, `Certificado`) are clickable and push/backtrack cleanly without `"ZONA"` labels.
   - Verify Row 3 Direct Data (`numero_sitio`, `nombre_sitio`, `direccion_sitio`, `Site 0` HQ protection, inline edit form).
   - Verify Row 4 Child Tabs (`Turnos Operativos Asignados`, `Auditorías en este Sitio`) use the List-View full-row click pattern cleanly (`select-turno-preview`, `select-prog-audit` on `<tr>`).
2. **`Proceso` Detail View (`src/views/procesoView.ts`):**
   - Verify Row 1 Top Main Row (`[←]`, `[✏️]` `startEditProcesoBtn`, `[🕒]` `tableName: 'proceso'`).
   - Verify Row 2 Parent Chips (`Organización`, `Certificado`, `Norma`) and Row 3 Direct Data (`nombre_proceso`, `tipo`, `responsable`, LTREE clause mapping).
   - Verify Row 4 Child Tabs (`Requisitos`, `Hallazgos`, `Auditorías`) use full-row click navigation without conflicting inner buttons.
3. **`Turno` Detail View (`src/views/turnoView.ts`):**
   - Verify Row 1 Top Main Row (`[←]`, `[✏️]` `startEditTurnoBtn`, `[🕒]` `tableName: 'turno'`).
   - Verify Row 2 Parent Chips (`Sitio` / `Certificado` / `Organización` context) and Row 3 Direct Data (`descripcion`, `hora_entrada`, `hora_salida`, overnight duration calculation).
   - Verify Row 4 Child Tabs (`Sitios Vinculados`, `Auditorías en este Turno`) use full-row click navigation cleanly.

### 2.2 Wire `"No Aplicables"` Row Navigation (`src/views/certificadoView.ts`, `src/views/normaView.ts`, `src/main.ts`)
Codebase audit confirms `requisitos_no_aplicables_certificado` currently renders only inside `Certificado` Tab 4 (`renderNoAplicablesChildTab`) — there is no standalone `noAplicableView.ts` file yet, whereas `Norma` Detail View (`src/views/normaView.ts`) already supports inspecting individual clauses via `state.extraDomain.inspectingClauseId` on the `Requisitos` tab.

Implement dead-click-free navigation for `"No Aplicables"` rows in `src/main.ts`:
- Bind `[data-action="select-no-aplicable"]` on `<tr>`:
  - Resolve the parent `Norma` (`cert.id_norma` / `norma_codigo`) and matching `RequisitoLtree` (`item.id_requisito` or `item.requisito_codigo`).
  - Transition to **`Norma` Detail View** (`extra / standards`), set `state.extraDomain.selectedNormaId = matchedNormaId`, `state.extraDomain.activeNormaTab = 'requisitos'`, and `state.extraDomain.inspectingClauseId = matchedRequisitoId`.
  - Push a clean breadcrumb segment via `pushBreadcrumb()` (e.g., `Cláusula ${codigo}` or `normaLabel`) so clicking `Volver` or the breadcrumb segment returns smoothly to `Certificado` → `"No Aplicables"` tab (`tab: 'no_aplicables'`).
  - *(Optional future extension: if standalone editing/archiving of the exclusion justification text is needed later, add a dedicated `noAplicableView.ts` using `renderDetailPageTemplate`; for this roadmap, routing to the Requirement inspection inside `Norma` Detail View avoids unnecessary file bloat while fulfilling full-row navigation.)*

### 2.3 Verify `"Auditoría"` Row Navigation & Clean Up Legacy Handlers (`src/main.ts`)
- Confirm `[data-action="select-prog-audit-by-code"]` works directly from `<tr>` clicks in `Certificado` → `"Auditoría"` tab, pushing `{ route: 'auditorias', subview: 'scheduling', entityType: 'audit', entityId: matchedAudit.id }` onto `state.breadcrumbs` and syncing `tab: 'auditorias'` on the originating `Certificado` breadcrumb.
- Remove or simplify now-redundant click listeners (`view-org-from-cert` in `certificadoView.ts` Multi View, and `e.target.closest('button')` exclusions inside `select-sitio-preview` / `select-proceso-preview` / `select-turno-preview` where inner buttons were removed).

---

## 3. Acceptance Criteria

- [ ] `Sitio`, `Proceso`, `Turno`, and `Auditoría` Detail Views render in the unified single-card 3-zone structure (`[←] ... [✏️][🕒]`, clickable parents, `<hr>`, direct data, List-View child tabs).
- [ ] Clicking any row in `Certificado` → `"Sitio"`, `"Proceso"`, `"Turno"`, `"No Aplicables"`, or `"Auditoría"` navigates directly to the corresponding Detail View without dead clicks or inner-button conflicts.
- [ ] Clicking the Top-Row `←` Back button (`title="Volver"`) or any breadcrumb segment restores the exact previous `Certificado` record and active child tab (`popToBreadcrumb`).
- [ ] Circular navigation (e.g., `Certificado` → `Sitio` → `Certificado` or `Certificado` → `Norma` → `Certificado`) truncates breadcrumb loops cleanly without duplicates.
