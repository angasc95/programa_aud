# Step Final: Verification, Automated Tests & Sign-Off Checklist

> **Previous:** [`step_3.2.md`](./step_3.2.md) (Sub-Entity Detail Views Audit & Wiring)  
> **Reference:** [`summary.md`](./summary.md)

---

## 1. Objective

Validate every Multi View, Detail View, List-View interaction, unit test, production build, and responsive viewport requirement for **`Certificado`** (and sub-entities `Sitio`, `Proceso`, `Turno`, `No Aplicables`, `Auditoría`) before adopting this implementation as the model template for other entities.

---

## 2. Automated Test Updates (`src/lib/*.test.ts`)

Review and update existing `node:test` suites affected by the layout and tab updates (and add targeted unit assertions for the new behaviors):
1. **`src/lib/universalTemplate.test.ts` & `src/lib/phase412MultiView.test.ts`:**
   - Update assertions expecting `"Filtros"`, `"Tarjetas"`, or `"Tabla"` strings to verify icon-only buttons (`aria-label`, `title`, `data-action="toggle-sidebar"`, `data-view-mode="grid" | "list"`).
   - Verify single-card container structure and `Mostrando X de Y` counter.
   - Add unit tests for column width normalization/clamping during drag-resize calculations (sum remains `100%`, minimum column width enforced).
2. **`src/lib/phase421DetailTemplate.test.ts` & `src/lib/detailViewsPhase42.test.ts`:**
   - Verify single-card Detail View structure (`←`, `✏️`, `🕒` icon-only top action bar order & tooltips `"Volver"`, `"Editar"`, `"Historial de Cambios"`, zero `"ZONA"` strings).
   - Verify `Certificado` Detail View includes **all 4 clickable parent links**: `id_organizacion`, `id_norma`, `id_sector_iaf`, and `id_estatus`.
   - Verify `Certificado` Detail View displays the 5 child tabs: `"Sitio"`, `"Proceso"`, `"Turno"`, `"No Aplicables"`, `"Auditoría"`.
3. **`src/lib/multisiteSampling.test.ts` & `src/lib/phase62UiIntegrity.test.ts`:**
   - Confirm `"Acciones"` column and inner cell buttons (`view-org-from-cert`) are absent from `Certificado` Multi View List Mode, and full-row `data-action="select-cert"` is present on `<tr>`.
   - Confirm Site 0 priority and full-row click hooks on child tabs.

---

## 3. Build, Lint & Test Execution Gate

Run all static, unit, and bundle checks with zero errors or warnings:

```bash
npx tsc --noEmit
npx tsx --test src/lib/*.test.ts
npm run lint
npm run build
```

---

## 4. Browser & Visual Verification Checklist (`http://localhost:3000`)

Inspect the live rendered app across desktop (`1920x1080`, `1280x800`), tablet (`768x1024`), and mobile (`375x812`) viewports:

### 4.1 `Certificado` Multi View
- [ ] **Container & Breadcrumb:** Breadcrumb (`Inicio > Certificación > Certificado`) sits strictly *outside* at the top; content sits inside **one single big card**.
- [ ] **Top Main Row (3 sub-rows):**
  - [ ] Title on sub-row 1.
  - [ ] Subtitle on sub-row 2.
  - [ ] Sub-row 3 has 4 clean columns: `[1]` Filter hamburger icon only (no `"Filtros"` text), `[2]` Flexible search input, `[3]` `Mostrando X de Y certificados registrados`, `[4]` Icon-only Grid/List switcher (no `"Tarjetas"` / `"Tabla"` text) styled consistently with the filter button.
- [ ] **Bottom Main Row (2 sub-columns):**
  - [ ] Clicking `☰` toggles the Filters column hidden/visible.
  - [ ] Data display container dynamically expands when filters are hidden and shrinks when visible.
- [ ] **List View Behavior:**
  - [ ] `"Acciones"` column is completely removed.
  - [ ] Clicking anywhere in a row opens that Certificate's Detail View; no inner elements hijack clicks.
  - [ ] Dragging any column header border resizes columns smoothly.
  - [ ] **Zero horizontal scrollbars** (`document.documentElement.scrollWidth <= window.innerWidth` and table container `scrollWidth <= clientWidth`).

### 4.2 `Certificado` Detail View
- [ ] **Container & Breadcrumb:** Breadcrumb sits strictly *outside* at the top; entire Detail View renders inside **one single big card**.
- [ ] **Row 1 (Top Main Row — 3 sub-rows, card background):**
  - [ ] Sub-row 1 Left: `<--` Back button (`title="Volver"`).
  - [ ] Sub-row 1 Right: Edit icon (`✏️`, no text, `title="Editar"`) positioned **immediately to the left** of Clock icon (`🕒`, no text, `title="Historial de Cambios"`).
  - [ ] Sub-row 2: Title.
  - [ ] Sub-row 3: Subtitle.
- [ ] **Row 2 (Parent Data) & Divider:**
  - [ ] Zero `"ZONA"` labels anywhere.
  - [ ] Clickable links for `id_organizacion`, `id_norma`, `id_sector_iaf`, and `id_estatus` each open their respective Detail View.
  - [ ] Clean `<hr>` separates Parent Data from Direct Record Data.
- [ ] **Row 3 (Direct Data):**
  - [ ] Zero `"ZONA"` labels; `numero_certificado`, `alcance`, `multisitio` (and supporting attributes) display clearly and edit cleanly for `ADMIN`/`WORKER`.
- [ ] **Row 4 (Multipage Children):**
  - [ ] Tabs rendered: `"Sitio"`, `"Proceso"`, `"Turno"`, `"No Aplicables"`, `"Auditoría"`.
  - [ ] Every tab behaves as a List View: sortable headers, drag-resizable columns, zero horizontal scrollbars, and full-row click navigation.

### 4.3 Sub-Entity Drill-Downs (`Sitio`, `Proceso`, `Turno`, `No Aplicables`, `Auditoría`)
- [ ] Clicking a row in `"Sitio"` opens `Sitio` Detail View (matching single-card layout, `←` returns to `Certificado`).
- [ ] Clicking a row in `"Proceso"` opens `Proceso` Detail View.
- [ ] Clicking a row in `"Turno"` opens `Turno` Detail View.
- [ ] Clicking a row in `"No Aplicables"` opens the corresponding excluded Requirement inside `Norma` Detail View (`Requisitos` tab).
- [ ] Clicking a row in `"Auditoría"` opens `Auditoría` (`Programación`) Detail View.
- [ ] Zero console errors, zero uncaught exceptions, and zero broken links across the entire navigation graph.
