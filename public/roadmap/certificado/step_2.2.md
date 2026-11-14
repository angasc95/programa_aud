# Step 2.2: `Certificado` Detail View — Single-Card Structure, Top Bar, Parents & Direct Data

> **Previous:** [`step_2.1.md`](./step_2.1.md) (`Certificado` Multi View Refinement)  
> **Next:** [`step_3.1.md`](./step_3.1.md) (`Certificado` Multipage Child Tabs as Interactive List Views)  
> **Primary Files:** `src/views/detailTemplate.ts`, `src/views/certificadoView.ts`, `src/lib/multisiteSampling.ts`, `src/main.ts`

---

## 1. Objective

Transform `renderDetailPageTemplate` (`src/views/detailTemplate.ts`) and `renderCertificadoDetailPage` (`src/views/certificadoView.ts`) into a unified **single-card Detail View** with:
1. Breadcrumb bar strictly *outside* at the top.
2. Row 1 (Top Main Row) featuring the 3 sub-rows (`←` Back + `✏️` Edit + `🕒` Clock icon-only top bar, Title, Subtitle) on the same card background.
3. Row 2 (Parent Data) containing **all** clickable parent relationships — adding **`id_estatus`** alongside `id_organizacion`, `id_norma`, and `id_sector_iaf` — with zero `"ZONA"` labels.
4. Hairline `<hr>` divider + Row 3 (Direct Record Data) displaying `numero_certificado`, `alcance`, `multisitio`, and supporting fields cleanly without `"ZONA"` labels.

---

## 2. Detailed Implementation Tasks

### 2.1 Refactor Detail Shell into a Single Big Card (`src/views/detailTemplate.ts`)
Currently, `renderDetailPageTemplate()` places the Back & Changelog bar *outside* the card and renders Child Tabs in a *second* `<section>` card below.

Refactor `renderDetailPageTemplate()` so the **entire Detail View lives inside one big card** (`<div class="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">`):
- **Breadcrumb Bar:** Remains strictly *outside* above the card (rendered in `src/main.ts`).
- **Row 1 — Top Main Row (3 sub-rows, matching `bg-white` card background, padded `p-5 sm:p-6 border-b border-slate-200`):**
  1. **Sub-row 1 (Icon Action Bar):**
     - **Left:** Icon-only Back button (`<--` / `←` SVG), `data-nav-back="true"`, `title="Volver"`, `aria-label="Volver"`. Remove long text like `"Volver a Certificados"` from the visible button label.
     - **Right:**
       - `extraActionButtonsHtml` (if any secondary modal triggers exist).
       - **Edit icon button** (`✏️` / crisp pencil SVG, **no text** `"Editar"`), `title="Editar"`, `aria-label="Editar"`, positioned **immediately to the left** of the Clock icon button. *(When `isEditing` is active, show a compact cancel/exit icon or indicator; keep `Archivar` cleanly accessible without crowding Sub-row 1 — e.g. subtle icon button or inside the edit panel / secondary action slot for `ADMIN`/`WORKER`).*
       - **Clock icon button** (`🕒` / crisp clock SVG, **no text** `"Historial de Cambios"`), `data-action="open-changelog"`, `title="Historial de Cambios"`, `aria-label="Historial de Cambios"`.
  2. **Sub-row 2 — Title:** `<h1 class="text-xl sm:text-2xl font-bold text-slate-900">` (alongside optional `eyebrowCode` and `statusBadge` pill).
  3. **Sub-row 3 — Subtitle:** Compact subtitle text below the title (`text-xs text-slate-500`).

> **Note:** Update `DetailPageTemplateProps` in `src/views/detailTemplate.ts` with clean structured slots (e.g. `editActionButton?: { id: string; visible: boolean; isEditing?: boolean; cancelId?: string }` or standardized `topRightActionsHtml`) so all Detail Views (`Certificado`, `Sitio`, `Proceso`, `Turno`, etc.) share the exact `[←] ... [✏️] [🕒]` Top Main Row order automatically.

### 2.2 Row 2 — Parent Data & Clickable `id_estatus` (`src/views/certificadoView.ts`, `src/main.ts`)
Inside the main card body below Row 1:
- **Zero `"ZONA"` labels** anywhere in the markup or headings.
- Ensure all 4 parent foreign keys on `certificado` render as clickable `DetailParentChip` buttons (`data-parent-nav="true"`):
  1. **Organización (`id_organizacion`)** → `nav: 'certificacion'`, `subview: 'organizations'`, `entityType: 'org'`, `entityId: cert.id_organizacion`.
  2. **Norma (`id_norma`)** → `nav: 'extra'`, `subview: 'standards'`, `entityType: 'norma'`, `entityId: cert.id_norma`.
  3. **Sector IAF (`id_sector_iaf`)** → `nav: 'extra'`, `subview: 'iaf'`, `entityType: 'sector_iaf'`, `entityId: cert.id_sector_iaf`, `sectorNumber: cert.sector_iaf`.
  4. **Estatus (`id_estatus`) — NEW:**
     ```ts
     {
       label: 'Estatus',
       value: cert.estatus,
       symbol: '🏷️',
       navAction: {
         nav: 'extra',
         subview: 'estatus',
         entityType: 'estatus',
         entityId: cert.id_estatus || cert.estatus,
       },
     }
     ```
- Verify in `src/main.ts`:
  - `data-parent-nav="true"` already handles `parentType === 'estatus'` (around line 2435); confirm it resolves both UUID `id_estatus` and catalog fallback (`INITIAL_ESTATUS_CATALOG` / live `state.domainData.estatusList` if fetched from Supabase) and pushes the `Estatus` segment onto `state.breadcrumbs`.
  - Confirm Supabase hydration in `src/main.ts` populates `cert.id_estatus` accurately from `certificado.id_estatus` (falling back to catalog ID match by status label if needed).

### 2.3 Hairline Divider & Row 3 — Direct Record Data (`src/views/detailTemplate.ts`, `src/views/certificadoView.ts`)
- Place a clean hairline `<hr class="border-t border-slate-200 my-5" />` separating Parent Data (Row 2) from Direct Data (Row 3).
- In Row 3 (`certificadoView.ts` `customRecordBodyHtml`):
  - Keep **zero `"ZONA"` labels**.
  - Prominently present **`numero_certificado`**, **`multisitio`** (`Esquema Multisitio` / `Sede Única`), and **`alcance`** (full-width readable scope box with character count), alongside `fecha_emision`, `fecha_vencimiento`, `organismo_acreditador_codigo` / `numero_acreditacion`, and `subsector_iaf` risk badge.
  - Ensure clicking the Top-Row `✏️` Edit icon toggles the existing inline `editCertForm` cleanly (`alcance`, `fecha_emision`, `fecha_vencimiento`) with live validation (`validateAlcance`), and `Archivar` remains safely reachable for `ADMIN`/`WORKER` without breaking the Top Row spec.

---

## 3. Acceptance Criteria

- [ ] `Certificado` Detail View renders inside **one single big card** over the background; breadcrumb bar sits strictly outside at the top.
- [ ] Row 1 has 3 sub-rows on the card background: `[←]` (tooltip `"Volver"`) on left + `[✏️]` (no text, tooltip `"Editar"`) immediately left of `[🕒]` (no text, tooltip `"Historial de Cambios"`) on right; Title; Subtitle.
- [ ] Row 2 renders zero `"ZONA"` headings and displays clickable parent links for `id_organizacion`, `id_norma`, `id_sector_iaf`, and `id_estatus` (all navigating to their respective Detail Views).
- [ ] A clean `<hr>` separates Parent Data from Direct Record Data (`numero_certificado`, `alcance`, `multisitio`, dates, accreditation, subsector).
