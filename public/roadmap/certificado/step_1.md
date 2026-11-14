# Step 1: Shared Multi-View Shell & Resizable List-View Engine

> **Previous:** [`summary.md`](./summary.md)  
> **Next:** [`step_2.1.md`](./step_2.1.md) (`Certificado` Multi View Refinement)  
> **Primary Files:** `src/lib/universalTemplate.ts`, `src/views/universalTemplate.ts`, `src/main.ts`

---

## 1. Objective

Upgrade the shared Multi-View container (`renderUniversalTemplate`) and establish a reusable List-View rendering/interaction engine so that:
1. Any Multi View renders inside a **single big card** over the page background (with the breadcrumb bar strictly *outside* at the top).
2. Toolbar controls are clean and **icon-only** where specified (no `"Filtros"`, `"Tarjetas"`, or `"Tabla"` strings).
3. List View tables (both in Multi View and later in Detail View child tabs) support **click-and-drag column resizing**, **zero horizontal scrollbars**, **sorting**, and **full-row click navigation** with no inner clickable controls.

---

## 2. Detailed Implementation Tasks

### 2.1 Single-Card Multi View Container (`src/views/universalTemplate.ts`)
Currently, `renderUniversalTemplate()` outputs a `<header>` card followed by a separate flex wrapper containing `<aside>` and `<section>` cards.

Refactor `renderUniversalTemplate()` into **one outer card container** (`bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden`):
- **Breadcrumb Bar Placement:** Keep `renderBreadcrumbBar()` strictly *outside* the card in `src/main.ts` (`<div class="${APP_SHELL_CONTAINER_CLASS} pt-3 pb-0">`). Verify no duplicate breadcrumb renders inside `universalTemplate.ts`.
- **Top Main Row (3 sub-rows inside the upper card section, separated from the bottom row by `border-b border-slate-200`):**
  1. **Sub-row 1 — Title:** `<h1>` title on the left (with optional `actionsHtml` CTA like `+ Nuevo Certificado` on the right).
  2. **Sub-row 2 — Subtitle:** Compact descriptive subtitle directly below the title.
  3. **Sub-row 3 — 4-Column Control Bar:**
     - **Col 1 (Filter Toggle Button):** Hamburger icon **only** (`☰` or crisp SVG), `aria-expanded`, `aria-label="Filtros"`, `title="Mostrar/Ocultar filtros"`. Remove the text string `<span>Filtros</span>`. Optionally retain a compact numeric dot/badge when facets are active, without text words.
     - **Col 2 (Dynamic Search Bar):** Flexible width (`flex-1 min-w-0`) `<input type="text" data-universal-search="true" ... />` with single inline clear button (`✕`).
     - **Col 3 (Totalizer Counter):** `Mostrando <strong>X</strong> de <strong>Y</strong> [entidades]` (plus optional `Mostrar Archivados` toggle for `ADMIN`).
     - **Col 4 (View Switcher):** Icon-only segmented toggle (`[ ⊞ | ☰ ]`) with **zero text strings** (`<span>Tarjetas</span>` and `<span>Tabla</span>` removed), using `title="Vista en Tarjetas"` / `title="Vista en Tabla"`, `aria-label`, and `aria-pressed`. Style button height, border radius, padding, and active contrast consistently with the Col 1 Filter hamburger button.

### 2.2 Bottom Main Row: Collapsible Filters + Dynamic Data Width (`src/views/universalTemplate.ts`)
Inside the same outer card below the Top Main Row divider:
- Render a 2-column responsive flex/grid row (`flex flex-col lg:flex-row items-stretch`):
  - **Column 1 (Filters Panel):** `<aside id="multiViewFacetSidebar">` rendered as an integrated left pane (`lg:w-64 xl:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 p-4`) when `isSidebarOpen === true`, and `hidden` when `isSidebarOpen === false`. *(Remove the `"Filtros"` heading text or keep only clean facet group legends + `"Limpiar filtros"` when active.)*
  - **Column 2 (Data Display Container):** `<section class="flex-1 min-w-0 w-full p-4 sm:p-5">` that automatically expands to 100% of the card width when Column 1 is hidden and shrinks proportionally when Column 1 is visible.

### 2.3 Reusable Resizable, Full-Row-Clickable List View Engine (`src/lib/universalTemplate.ts`, `src/views/universalTemplate.ts`, `src/main.ts`)
Extend `ColumnDefinition<T>` and `UniversalTemplateProps<T>` (and expose a reusable `renderListViewTable()` helper for Step 3.1 child tabs):
1. **Column Width Metadata & Resize State:**
   - Add optional `defaultWidthPct?: number` and `minWidthPx?: number` to `ColumnDefinition<T>`.
   - Add `tableId?: string` and `columnWidths?: Record<string, number>` (percentages summing to 100%, or clamped pixel widths auto-scaled to container width) to `UniversalTemplateProps<T>` / `renderListViewTable()`.
   - Store `state.tableColumnWidths: Record<string, Record<string, number>>` in `src/main.ts` (keyed by `tableId`, e.g. `'certificados-main'`, `'cert-tab-sitios'`, etc.).
2. **Zero Horizontal Scrollbars:**
   - Render `<table class="w-full table-fixed text-left text-xs border-collapse">` with a `<colgroup>` whose `<col>` widths strictly sum to `100%`.
   - Apply `min-w-0 overflow-hidden text-ellipsis whitespace-nowrap` (or controlled `line-clamp-2` on multi-line cells) on `<th>` and `<td>` cells so long text truncates cleanly with `title="..."` instead of triggering horizontal scrollbars.
   - Remove `overflow-x-auto` wrapper dependencies where desktop/tablet columns fit naturally inside `table-fixed`.
3. **Click-and-Drag Column Resizer (`src/main.ts`):**
   - Render a subtle vertical resizer handle (`<span data-resize-col="${col.id}" data-resize-table="${tableId}" class="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400/60 select-none" aria-hidden="true"></span>`) on every `<th>` except the last column.
   - Bind `pointerdown` / `pointermove` / `pointerup` in `src/main.ts`:
     - Adjust the dragged column and its adjacent right-hand column proportionally within the table's total width (`100%`) while respecting `minWidthPx` (e.g., `64px`), so dragging a column **never** causes the table to exceed container width or spawn a horizontal scrollbar.
     - Persist updated widths into `state.tableColumnWidths[tableId]` without stealing clicks from `sort-column` (`e.stopPropagation()` / drag threshold).
4. **Full-Row Click Navigation (`onRowClickAttrs`):**
   - Add `getRowAttrs?: (item: T) => string` (e.g., `data-action="select-cert" data-cert-id="..."`) on `UniversalTemplateProps<T>` and `renderListViewTable()`.
   - Apply `cursor-pointer hover:bg-indigo-50/40 transition-colors` to `<tr>` when `getRowAttrs` is provided, plus keyboard accessibility (`tabindex="0"` / `Enter` support).

---

## 3. Acceptance Criteria

- [ ] Multi View uses **one single outer card**; breadcrumb sits strictly outside above it.
- [ ] Top Main Row has 3 sub-rows: Title, Subtitle, and 4-column bar (`[☰]` icon-only, flexible search input, `Mostrando X de Y ...`, `[⊞ | ☰]` icon-only switcher).
- [ ] Zero occurrences of `"Filtros"` button label or `"Tarjetas"` / `"Tabla"` labels inside the Multi View control bar.
- [ ] Toggling `☰` hides/shows the left Filters column and smoothly expands/shrinks the Data Display column within the same card.
- [ ] List View columns resize smoothly via click-and-drag without creating any horizontal scrollbar.
- [ ] `renderListViewTable()` is exported as a clean, reusable helper ready for Detail View child tabs in `step_3.1.md`.
