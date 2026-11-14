# Step 3.1: `Certificado` Multipage Child Tabs as Interactive List Views

> **Previous:** [`step_2.2.md`](./step_2.2.md) (`Certificado` Detail View — Single Card, Parents & Direct Data)  
> **Next:** [`step_3.2.md`](./step_3.2.md) (Sub-Entity Detail Views Audit & Wiring)  
> **Primary Files:** `src/views/certificadoView.ts`, `src/views/detailTemplate.ts`, `src/lib/multisiteSampling.ts`, `src/main.ts`

---

## 1. Objective

Upgrade Row 4 (Multipage Children) inside the `Certificado` Detail View single big card so that:
1. It exposes the exact 5 child tabs: **`"Sitio"`**, **`"Proceso"`**, **`"Turno"`**, **`"No Aplicables"`**, and **`"Auditoría"`**.
2. Every multipage tab renders through the **List View** engine built in `step_1.md` — providing sortable columns, click-and-drag resizable columns, zero horizontal scrollbars, and **full-row click navigation** (zero conflicting inner buttons).

---

## 2. Detailed Implementation Tasks

### 2.1 Standardize Child Tab Definitions (`src/lib/multisiteSampling.ts`, `src/views/certificadoView.ts`, `src/main.ts`)
Currently, `CertificadoChildTab` defines 6 tabs (`sitios`, `procesos`, `turnos`, `no_aplicables`, `cobertura`, `auditorias`) with plural tab labels (`Sitios`, `Procesos`, `Turnos`, `Auditorías`).

Update the tab configuration to match the model specification:
- Tab 1: `{ id: 'sitios', label: 'Sitio', symbol: '📍', count: cert.sitios.length }`
- Tab 2: `{ id: 'procesos', label: 'Proceso', symbol: '⚙️', count: cert.procesos.length }`
- Tab 3: `{ id: 'turnos', label: 'Turno', symbol: '⏱️', count: cert.turnos.length }`
- Tab 4: `{ id: 'no_aplicables', label: 'No Aplicables', symbol: '🚫', count: cert.noAplicables.length }`
- Tab 5: `{ id: 'auditorias', label: 'Auditoría', symbol: '📋', count: cert.auditorias.length }`

*(Remove or migrate the redundant `'cobertura'` tab from `CertificadoChildTab` and `main.ts` tab guards so only the 5 canonical child tabs render inside `Certificado` Detail View; update any breadcrumb tab restoration fallback cleanly to `'sitios'`.)*

### 2.2 Integrate Row 4 Seamlessly Inside the Single Detail Card (`src/views/detailTemplate.ts`)
- Ensure `childTabsHtml` renders as **Row 4** inside the same single big card (`border-t border-slate-200`), rather than as a detached `<section>` card below.
- Style the tab strip cleanly (`px-5 pt-3 border-b border-slate-200 bg-slate-50/60`) and wrap tab body content with clean padding (`p-5`).

### 2.3 Upgrade Each of the 5 Child Tabs to Full List-View Behavior (`src/views/certificadoView.ts`, `src/main.ts`)
Replace the static HTML `<table>` blocks in `renderSitiosChildTab`, `renderProcesosChildTab`, `renderTurnosChildTab`, `renderNoAplicablesChildTab`, and `renderAuditoriasChildTab` with calls to `renderListViewTable()` (from `step_1.md`), adding child-tab sort state (`childSortState: Record<CertificadoChildTab, SortState>`) and column width state (`tableColumnWidths['cert-tab-...']`) in `src/main.ts`:

1. **`"Sitio"` Tab (`tableId: 'cert-tab-sitios'`):**
   - Preserve mandatory **Site 0 first** default ordering (`sortSitesWithPrincipalFirst`) when `sortState.direction === 'none'`, and support sorting by `numero_sitio`, `nombre_sitio`, `tipo_sitio`, `direccion_sitio`, `personal_count`, `turnos_vinculados`.
   - Keep `★ Sede Central / Principal` badge for `numero_sitio === 0`.
   - **Remove inner `<button data-action="select-sitio">`**, placing `data-action="select-sitio-preview" data-sitio-id="..." data-cert-id="..."` on `<tr>` so clicking anywhere on the row opens **`Sitio` Detail View**.
2. **`"Proceso"` Tab (`tableId: 'cert-tab-procesos'`):**
   - Sortable & resizable columns: `Proceso`, `Tipo`, `Responsable`, `Cláusulas Normativas Cubiertas`.
   - **Remove inner `<button data-action="select-proceso">`**, placing `data-action="select-proceso-preview" data-proceso-id="..." data-cert-id="..."` on `<tr>` so clicking anywhere on the row opens **`Proceso` Detail View**.
3. **`"Turno"` Tab (`tableId: 'cert-tab-turnos'`):**
   - Sortable & resizable columns: `Turno Operativo`, `Horario`, `Personal`, `Sedes Vinculadas`.
   - **Remove inner `<button data-action="select-turno">`**, placing `data-action="select-turno-preview" data-turno-id="..." data-cert-id="..."` on `<tr>` so clicking anywhere on the row opens **`Turno` Detail View**.
4. **`"No Aplicables"` Tab (`tableId: 'cert-tab-no_aplicables'`):**
   - Sortable & resizable columns: `Cláusula`, `Requisito Excluido`, `Justificación Técnica Obligatoria (ISO 4.3)`.
   - Add full-row click attributes (`data-action="select-no-aplicable"` / `data-requisito-id` / `data-norma-id` / `data-codigo`) on `<tr>` (wired in `step_3.2.md`).
5. **`"Auditoría"` Tab (`tableId: 'cert-tab-auditorias'`):**
   - Sortable & resizable columns: `Código Auditoría`, `Modalidad`, `Metodología`, `Fecha Programada`, `Auditor Líder`, `Estatus`.
   - **Remove inner `<button data-action="select-prog-audit-by-code">`** and move `data-action="select-prog-audit-by-code" data-audit-id="..." data-audit-code="..."` onto `<tr>` so clicking anywhere on the row opens **`Auditoría` (`Programación`) Detail View**.

---

## 3. Acceptance Criteria

- [ ] Row 4 of `Certificado` Detail View sits inside the single big card and displays the 5 tabs: `"Sitio"`, `"Proceso"`, `"Turno"`, `"No Aplicables"`, `"Auditoría"`.
- [ ] Every child tab supports column sorting (`▲▼` / `▲` / `▼`), click-and-drag column resizing, and renders with **zero horizontal scrollbars**.
- [ ] No cell inside any child tab contains an independently clickable `<button>`; clicking **anywhere** on any row triggers detail navigation for that row's record.
- [ ] Site 0 (`Sede Central / Principal`) continues rendering first by default in the `"Sitio"` tab.
