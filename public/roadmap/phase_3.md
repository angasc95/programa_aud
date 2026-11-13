# Phase 3: Breadcrumb Navigation Engine, Loop Prevention & Contextual Cross-Entity Lineage

> **Depends On:** [`phase_2.1.md`](./phase_2.1.md) (Three-Block Header & Updated Route Labels)  
> **Unlocks:** [`phase_4.1.1.md`](./phase_4.1.1.md)–[`phase_4.2.3.md`](./phase_4.2.3.md) (Multi Views & Deep 3-Zone Drill-Downs)

---

## 1. Objectives & Architectural Rationale

The current breadcrumb bar (`src/views/breadcrumbView.ts`, 67 lines) and navigation handlers (`src/main.ts`) suffer from three structural UX flaws:
1. **Visual bloat & wrapping clutter:** `breadcrumbView.ts` wraps the trail inside a bordered white card (`bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-2xs`) with `flex-wrap` inside `<ol>`, causing tall vertical gaps and multi-row wrapping on deep paths or narrow viewports.
2. **Abrupt context resets on cross-entity links:** Handlers in `src/main.ts` (`view-org-from-cert` line 2674, `view-norma-from-cert` line 2697, `view-iaf-from-cert` line 2724, `open-org-from-audit` line 3188, `open-cert-from-audit` line 3259) erroneously call `resetBreadcrumbToDomain(...)` when opening a related parent, standard, or IAF sector from inside a Detail View—erasing the user's lineage and teleporting their breadcrumb root into a foreign domain.
3. **Incomplete loop & state restoration handling:** `pushBreadcrumb()` in `src/lib/breadcrumb.ts` matches solely on `s.id` or `s.entityId`, and `popToBreadcrumb()` does not always restore entity-specific sub-state (such as `selectedSitioId`, `selectedProcesoId`, `selectedTurnoId`, `selectedAcreditacionId`, or `activeChildTab`) when navigating across domains in a single trail.

**Phase 3** delivers a crisp, borderless, single-row contextual breadcrumb system where **only top-header clicks reset the trail** and **cross-entity drill-downs preserve full ancestry without loops**.

---

## 2. Current State Gap Analysis

| File | Current Implementation | Target State in Phase 3 |
| :--- | :--- | :--- |
| `src/views/breadcrumbView.ts` | Bordered `bg-white border rounded-xl px-4 py-2.5 shadow-2xs` card; `<ol class="flex flex-wrap ...">` wraps onto multiple rows; no intermediate ellipsis collapse for deep trails. | Borderless compact strip (`nav` directly above content header with tight `mb-2` spacing); single-row `flex-nowrap overflow-hidden whitespace-nowrap` with CSS truncation + middle-segment collapse (`…`) for trails > 4 levels. |
| `src/lib/breadcrumb.ts` | `pushBreadcrumb()` checks `s.id === segment.id \|\| (segment.entityId && s.entityId === segment.entityId)` without `entityType` scoping; domain labels use `'Auditorías'`; includes `'drilldown'`, `'sites'`, `'processes'`, `'shifts'`, `'requirements'`, `'catalogs'`. | Introduce `entityType` on `BreadcrumbSegment` (`'org' \| 'cert' \| 'sitio' \| 'proceso' \| 'turno' \| 'auditor' \| 'audit' \| 'norma' \| 'sector_iaf' \| 'accreditation' \| ...`), composite loop detection `(route + subview + entityType + entityId)`, and `collapseBreadcrumbForDisplay()` helper. |
| `src/main.ts` | Cross-entity links (`view-org-from-cert`, `view-norma-from-cert`, `view-iaf-from-cert`, `open-org-from-audit`, `open-cert-from-audit`) call `resetBreadcrumbToDomain(...)`, breaking context. Also `<main>` uses `py-8 space-y-6` adding extra whitespace beneath the breadcrumb bar. | Convert all cross-entity `resetBreadcrumbToDomain(...)` calls to `pushBreadcrumb(state.breadcrumbs, ...)`; preserve `resetBreadcrumbToDomain(...)` **exclusively** on top global header links (`data-nav-reset="true"`), hash-level root jumps, and session init/logout; tighten `<main>` top padding (`pt-3 pb-8`). |

---

## 3. Technical & UX Specifications

### 3.1 Compact, Borderless Visual Design (`src/views/breadcrumbView.ts`)

- **Container:** Remove `bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-2xs`. Render a lightweight inline bar aligned to `max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-0`:
  ```html
  <nav aria-label="Navegación jerárquica" class="w-full py-1">
    <ol class="flex flex-nowrap items-center gap-1.5 text-xs text-slate-500 overflow-hidden whitespace-nowrap">
      ...
    </ol>
  </nav>
  ```
- **Single-Row Overflow & Middle Ellipsis (`collapseBreadcrumbForDisplay`):**
  - Never wrap onto a second line (`flex-nowrap`).
  - Each ancestor segment uses `truncate max-w-[140px] sm:max-w-[200px]` with full label in `title="..."`.
  - When `trail.length > 4`, collapse intermediate crumbs between index `0` (Domain/Section root) and the last two segments into a single compact `…` indicator (with tooltip listing hidden ancestors and click-to-backtrack to the immediate parent of the collapsed range) so the root, immediate parent, and active page remain cleanly visible on a single line across `375px` mobile and `1440px` desktop viewports.
- **Tighter Canvas Coupling:** Reduce excessive vertical spacing between `<nav aria-label="Navegación jerárquica">` and the first content card (`mb-2` / `space-y-3` instead of stacking `py-8` + card gap).

### 3.2 Top-Header-Only Reset Rule

1. **Reset (`resetBreadcrumbToDomain`) Allowed ONLY On:**
   - Top global header domain buttons (`data-nav="..." data-nav-reset="true"`).
   - Top global header dropdown items (`data-nav="..." data-subview="..." data-nav-reset="true"`).
   - Brand logo (`PA Programa de Auditoría`, `data-nav="dashboard" data-nav-reset="true"`).
   - Account dropdown route triggers (`Mi Perfil`, `Panel Aprobaciones`, `Estado DB`, `data-nav-reset="true"`).
   - Initial boot / hash root navigation / sign-out reset.
2. **Reset Strictly Forbidden On:**
   - Clicking a parent/reference link inside a Detail View's **Parent Zone** (e.g., `Certificado` → `Organización`, `Certificado` → `Norma`, `Certificado` → `Sector IAF`, `Programación` → `Organización`, `Programación` → `Certificado`, `Sitio` → `Certificado`).
   - Clicking a child link inside a Detail View's **Children Zone** (`Certificado` → `Sitio` → `Turno`; `Organización` → `Certificado`; `Norma` → `Acreditación`).
   - Clicking any in-page `"← Volver"` action (which executes `popToParentBreadcrumb()` rather than resetting to domain root).

### 3.3 Contextual Lineage & Loop Prevention (`src/lib/breadcrumb.ts`)

1. **Extended `BreadcrumbSegment` Contract:**
   ```ts
   export type BreadcrumbEntityType =
     | 'org'
     | 'cert'
     | 'sitio'
     | 'proceso'
     | 'turno'
     | 'auditor'
     | 'audit'
     | 'norma'
     | 'sector_iaf'
     | 'accreditation'
     | 'estatus'
     | 'tipo'
     | 'metodologia';

   export interface BreadcrumbSegment {
     id: string;
     label: string;
     route: ActiveRoute;
     subview?: string | null;
     entityType?: BreadcrumbEntityType | null;
     entityId?: string | null;
     tab?: string | null;
     tooltip?: string;
   }
   ```
2. **Loop Prevention Algorithm in `pushBreadcrumb(trail, segment)`:**
   - Normalize key matching:
     - Two segments represent the **same visited node** if:
       - `s.id === segment.id`, OR
       - `segment.entityId != null && s.entityId === segment.entityId && (s.entityType ?? s.subview) === (segment.entityType ?? segment.subview)`.
   - If `existingIdx >= 0`, truncate `trail.slice(0, existingIdx + 1)` and refresh `updated[existingIdx]` with the incoming metadata (`tab`, `label`, `tooltip`).
   - **Example Walkthrough:**
     - User navigates: `Certificación` → `Certificado` → `FN-QMS-2024-001` → `Sector 17` → clicks certificate `FN-QMS-2024-001` in `Sector 17`'s Children Zone.
     - Instead of creating `Certificación > Certificado > FN-QMS-2024-001 > Sector 17 > FN-QMS-2024-001`, `pushBreadcrumb()` detects `entityType: 'cert', entityId: <FN-QMS-2024-001>` at index `2` and cleanly backtracks to `Certificación > Certificado > FN-QMS-2024-001`.
   - **Cross-Entity Non-Collision:** A `Sitio` record and a `Certificado` record never collide even if fixture IDs share patterns because `entityType` differentiates `'sitio'` vs. `'cert'`.

3. **Full Context Restoration on `popToBreadcrumb()`:**
   - Clicking any breadcrumb segment restores `state.activeRoute`, `state.activeSubSection`, clears all deeper entity selection states, and restores the exact target entity ID (`selectedOrganizacionId`, `selectedCertId`, `selectedSitioId`, `selectedProcesoId`, `selectedTurnoId`, `selectedAuditorId`, `selectedAuditId`, `selectedNormaId`, `selectedSectorId`, `selectedAcreditacionId`, etc.) and `activeChildTab` recorded on that segment.
   - If the user jumped across domains (e.g., `Certificación > Certificado > FN-QMS-2024-001 > Sector 17`), clicking `FN-QMS-2024-001` in the trail immediately switches `activeRoute` back to `'certificacion'`, `activeSubSection` to `'certificates'`, and reopens `FN-QMS-2024-001` Detail View.

---

## 4. Implementation Checklist

- [ ] Redesign `src/views/breadcrumbView.ts` as a compact, borderless, single-row (`flex-nowrap`, ellipsis truncation, middle-collapse for deep trails) strip directly above page content.
- [ ] Update `src/lib/breadcrumb.ts` with `BreadcrumbEntityType`, composite loop-prevention matching, `collapseBreadcrumbForDisplay()`, and updated singular domain labels (`Auditoría`, `Certificación`, `Extra`, `Perfil`).
- [ ] Refactor cross-entity navigation handlers in `src/main.ts` (`view-org-from-cert`, `view-norma-from-cert`, `view-iaf-from-cert`, `open-org-from-audit`, `open-cert-from-audit`, plus `auditorias` sub-links) to invoke `pushBreadcrumb(state.breadcrumbs, ...)` instead of `resetBreadcrumbToDomain(...)`.
- [ ] Enhance the breadcrumb click handler in `src/main.ts` to restore complete target entity state (`entityType`, `entityId`, `tab`) across cross-domain lineages.
- [ ] Audit all in-page `"← Volver"` buttons inside Detail Views so they pop to parent breadcrumb instead of resetting to domain root.

---

## 5. Acceptance Criteria

1. Breadcrumb bar renders without an outer white bordered card, sits tightly above the main view header, and stays strictly on a single horizontal line across `375px`–`1920px` viewports.
2. Navigating `Certificación > Certificado > FN-QMS-2024-001` and clicking `Sector 17` or `ISO 9001:2015` produces `Certificación > Certificado > FN-QMS-2024-001 > Sector 17` (or `ISO 9001:2015`) without resetting the trail to `Extra`.
3. Clicking `FN-QMS-2024-001` inside `Sector 17`'s Children Zone (or clicking `FN-QMS-2024-001` in the breadcrumb trail) cleanly backtracks without creating duplicate breadcrumb loops.
4. Only clicking items in the top global header resets the breadcrumb trail to the selected domain root.
5. Zero raw 36-character UUIDs ever appear in any breadcrumb label (`containsRawUuid(label) === false`).
