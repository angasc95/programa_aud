# Step 2.1: `Certificado` Multi View Refinement

> **Previous:** [`step_1.md`](./step_1.md) (Shared Multi-View Shell & List-View Engine)  
> **Next:** [`step_2.2.md`](./step_2.2.md) (`Certificado` Detail View — Single Card, Parents & Direct Data)  
> **Primary Files:** `src/views/certificadoView.ts`, `src/main.ts`

---

## 1. Objective

Apply the Step 1 single-card shell and List-View engine to **`Certificado` Multi View** (`renderCertificadoDirectory` in `src/views/certificadoView.ts`) so that the directory strictly matches the clean reference model:
- Zero `"Acciones"` column.
- Full-row click navigation (`<tr>`) with zero independently clickable inner elements.
- Drag-resizable columns with zero horizontal scrollbars.

---

## 2. Detailed Implementation Tasks

### 2.1 Remove the `"Acciones"` Column (`src/views/certificadoView.ts`)
In `renderCertificadoDirectory()` (`src/views/certificadoView.ts`, lines 362–465):
- Remove the 7th column definition `{ id: 'acciones', header: 'Acciones', ... }` completely.
- Retain the 6 domain data columns with calibrated initial `defaultWidthPct` percentages (summing to `100%`) and minimum widths (`minWidthPx`):
  1. `organizacion` (`Organización`) — e.g. `28%`, `minWidthPx: 150`
  2. `numero_certificado` (`Código de Certificado`) — e.g. `18%`, `minWidthPx: 120`
  3. `norma` (`Norma`) — e.g. `16%`, `minWidthPx: 100`
  4. `sedes` (`Sedes Multisitio`) — e.g. `14%`, `minWidthPx: 95`
  5. `estatus` (`Estatus`) — e.g. `11%`, `minWidthPx: 85`
  6. `vigencia` (`Vigencia`) — e.g. `13%`, `minWidthPx: 100`

### 2.2 Remove Inner Clickable Controls & Wire Full-Row Click (`src/views/certificadoView.ts`, `src/main.ts`)
Currently, `renderCertificadoDirectory()` embeds two separate clickable buttons inside table cells:
- `<button data-action="view-org-from-cert" data-org-id="...">` inside the `Organización` cell (lines 368–376).
- `<button data-action="select-cert" data-cert-id="...">` inside the `Código de Certificado` cell (lines 384–391).

Refactor both cells and the row attribute builder:
1. Replace the `<button>` in `organizacion` with static non-interactive markup (`<div class="min-w-0">`) showing truncated organization name (`truncate`) + monospace RIF.
2. Replace the `<button>` in `numero_certificado` with a styled non-interactive badge (`<span class="inline-block max-w-full truncate font-mono ...">`).
3. Pass `tableId: 'certificados-main'`, `columnWidths`, and `getRowAttrs` into `renderUniversalTemplate()`:
   ```ts
   getRowAttrs: (cert) =>
     `data-action="select-cert" data-cert-id="${escapeHtml(cert.id)}" title="Abrir detalle de ${escapeHtml(cert.numero_certificado)}"`
   ```
4. Verify in `src/main.ts` that the `[data-action="select-cert"]` click listener works cleanly when placed directly on `<tr>` (as well as on Grid View cards) and supports `Enter` key activation for accessibility.
5. Ensure no `<button>`, `<a>`, or `<input>` exists inside any `<td>` of the `Certificado` list table.

### 2.3 Prevent Horizontal Overflow & Verify Dynamic Width Expansion
- Ensure every `renderCell` in `certificadoView.ts` uses `truncate` / `min-w-0` rather than unbreakable `whitespace-nowrap` on wide strings (`organizacion_nombre`, `esquema`, `branchText`).
- Confirm that in `renderCertificadoDirectory()`:
  - When the left Filters column is **visible**, the 6-column table fits cleanly with zero horizontal scrollbar (`scrollWidth <= clientWidth`).
  - When the user clicks the `☰` hamburger icon to **hide** the Filters column, the table smoothly expands across the full width of the single big card and column widths scale proportionally.
- Confirm Grid View (`renderCard`) continues rendering cleanly and responds to sidebar expand/collapse via `getUniversalCardGridClass(isSidebarOpen)`.

---

## 3. Acceptance Criteria

- [ ] `Certificado` Multi View renders inside a single big card with the breadcrumb bar strictly outside at the top.
- [ ] Top bar shows icon-only `☰` filter button, flexible search bar, `Mostrando X de Y certificados registrados`, and icon-only `[⊞ | ☰]` view switcher.
- [ ] `"Acciones"` column is completely absent from the List View table.
- [ ] Clicking **anywhere** on a table row opens that Certificate's Detail View; clicking `Organización` text does **not** hijack navigation to Organization Detail View.
- [ ] Every column can be resized by dragging its header border, and **no horizontal scrollbar** appears in List View across desktop and tablet viewports.
