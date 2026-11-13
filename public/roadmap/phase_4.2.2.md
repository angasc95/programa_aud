# Phase 4.2.2: New `Acreditación` & `Sitio` Detail Views + `Certificado` / `Norma` Child Drill-Downs

> **Parent Phase:** Phase 4.2 — Three-Zone Detail View Architecture & Child Drill-Downs  
> **Depends On:** [`phase_4.1.3.md`](./phase_4.1.3.md) (`Acreditación` Multi View), [`phase_4.2.1.md`](./phase_4.2.1.md) (3-Zone Detail Template)  
> **Unlocks:** [`phase_4.2.3.md`](./phase_4.2.3.md) (`Turno` Detail View & Reciprocal `Sitio` Drill-Down)

---

## 1. Objectives & Scope

Following Phase 4.2.1's cleanup of existing Detail Views, two high-priority entities still lack dedicated 3-Zone Detail Views:
1. **`Acreditación` (`acreditacion_norma_iaf`):** Users can list accreditations in `Extra > Acreditación` (Phase 4.1.3), or see them inside `Norma` / `Sector IAF` tabs, but cannot inspect or edit an accreditation scope or drill into its covered certificates.
2. **`Sitio` (`sitio`):** Multisitio sites (`Sitio 0` principal HQ and branch sites `1..N`) currently live only as table rows inside `certificadoView.ts` or the legacy `certificacionView.ts` sub-tab, with no dedicated Detail View for editing site details, managing assigned shifts (`turnos_por_sitio`), or inspecting site audits.

**Phase 4.2.2** delivers the **`Acreditación` Detail View** and **`Sitio` Detail View** (`src/lib/sitioDomain.ts`, `src/views/sitioView.ts`) and wires contextual drill-down navigation from `Certificado`, `Norma`, and `Sector IAF`.

---

## 2. Technical & UX Specifications

### 2.1 `Acreditación` Detail View (`src/views/acreditacionView.ts`)

Follows the strict Phase 4.2.1 3-Zone layout:
- **Parent Zone:**
  - `Organismo de Acreditación`: e.g., `ENAC — Entidad Nacional de Acreditación (España)` with external website link (`rel="noopener noreferrer"`).
  - `Norma`: clickable link → pushes onto `state.breadcrumbs` and opens **`Norma` Detail View**.
  - `Sector IAF`: clickable link → opens **`Sector IAF` Detail View** (or non-clickable badge `"Todos los Sectores"` when `id_sector_iaf IS NULL`).
- **Hairline Divider** (`<hr class="border-t border-slate-200 my-4" />`).
- **Record Zone:**
  - Title (`numero_acreditacion`), `estatus` badge (`Activa`, `Suspendida`, `Vencida`), `🕒 Historial de Cambios` (`table_name = 'acreditacion_norma_iaf'`), `Editar` and `Archivar` (`ADMIN`/`WORKER`).
  - Editable fields: `numero_acreditacion`, `fecha_concesion`, `fecha_vencimiento`, `estatus`, plus calculated days-to-expiration indicator (`evaluateAccreditationExpiry()`).
- **Children Zone (Multipage, List-Only):**
  - Tab 1: **Certificados Amparados** — list-only table of active `certificado` records matching `(id_norma, id_sector_iaf)`. Clicking any row navigates to **`Certificado` Detail View** (with loop prevention via `pushBreadcrumb`).
  - Tab 2: **Sub-Sectores IAF del Alcance** — list-only table of `subsector_iaf` rows linked to `id_sector_iaf` showing risk badges (`ALTO`, `MEDIO`, `BAJO`).

### 2.2 `Sitio` Detail View (`src/lib/sitioDomain.ts` & `src/views/sitioView.ts`)

- **Pure Domain Module (`src/lib/sitioDomain.ts`):**
  - `SitioDetailEntity` joining `sitio` with `certificado` (`numero_certificado`, `multisitio`), `organizacion` (`nombre`, `rif`), assigned `turnos_por_sitio` + `turno`, and `sitios_por_auditoria` + `auditoria`.
  - Validation helpers: `validateSitioInput()` (`numero_sitio >= 0`, unique per certificate, non-empty `nombre_sitio` & `direccion_sitio`), `canArchiveSitio()` (guards against archiving `Sitio 0` principal HQ while active secondary sites `numero_sitio > 0` or active audits exist).
- **3-Zone Detail Layout (`src/views/sitioView.ts`):**
  - **Parent Zone:**
    - `Organización`: clickable chip → **`Organización` Detail View**.
    - `Certificado`: clickable chip → **`Certificado` Detail View**.
  - **Hairline Divider.**
  - **Record Zone:**
    - Title: `Sitio ${numero_sitio} — ${nombre_sitio}` with explicit **`Sede Principal (Sitio 0)`** indicator when `numero_sitio === 0`.
    - `🕒 Historial de Cambios` (`table_name = 'sitio'`), `Editar` (`ADMIN`/`WORKER`), and `Archivar` (guarded).
    - Editable attributes: `numero_sitio` (integer `>= 0`), `nombre_sitio`, `direccion_sitio`.
  - **Children Zone (Multipage, List-Only):**
    - Tab 1: **Turnos Operativos Asignados** (`turnos_por_sitio` joined with `turno`) — list-only table (`Horario Entrada`, `Horario Salida`, `Duración`). Includes `+ Asignar Turno` selector/action for `ADMIN`/`WORKER`. *(Row click → `Turno` Detail View wired in Phase 4.2.3.)*
    - Tab 2: **Auditorías en este Sitio** (`sitios_por_auditoria` joined with `auditoria`) — list-only table (`Fecha`, `Tipo`, `Metodología`, `Estado`). Clicking any row navigates to **`Programación / Auditoría` Detail View**.

### 2.3 Parent/Child Navigation Wiring (`src/main.ts`)

- Add `selectedAcreditacionId` and `selectedSitioId` (plus `sitioChildTab`) to `AppState` and `popToBreadcrumb()` restoration.
- Wire row clicks inside:
  - `Extra > Acreditación` Multi View → `Acreditación` Detail View.
  - `Norma` (`Acreditaciones` tab) & `Sector IAF` (`Acreditaciones` tab) → `Acreditación` Detail View.
  - `Certificado` (`Sitios` tab) & `Programación` (`Sitios Asignados` tab) → `Sitio` Detail View.

---

## 3. Implementation Checklist

- [ ] Implement `Acreditación` 3-Zone Detail View and edit/archive handlers in `src/views/acreditacionView.ts` and `src/main.ts`.
- [ ] Create `src/lib/sitioDomain.ts` with `SitioDetailEntity`, `validateSitioInput()`, and `canArchiveSitio()` (`Sitio 0` protection).
- [ ] Create `src/views/sitioView.ts` implementing the 3-Zone `Sitio` Detail View (`Turnos Operativos Asignados` + `Auditorías en este Sitio` tabs + `+ Asignar Turno`).
- [ ] Wire `selectedAcreditacionId` and `selectedSitioId` state, `popToBreadcrumb()` restoration, and child row clicks from `Certificado`, `Norma`, `Sector IAF`, and `Programación` in `src/main.ts`.

---

## 4. Acceptance Criteria

1. Clicking any accreditation in `Extra > Acreditación`, `Norma`, or `Sector IAF` opens **`Acreditación` Detail View** with clickable `Norma`, `Sector IAF`, and `Certificados Amparados` drill-down.
2. Clicking any site in `Certificado > Sitios` opens **`Sitio` Detail View** (`Certificación > Certificado > FN-QMS-2024-001 > Sitio 0`), clearly flagging `Sitio 0` as `Sede Principal`.
3. `ADMIN`/`WORKER` can edit site attributes and assign/unassign shifts (`turnos_por_sitio`), while `Sitio 0` cannot be archived if active secondary sites depend on it.
4. Navigating `Certificado -> Acreditación -> Certificado` or `Sitio -> Certificado -> Sitio` triggers clean loop truncation without duplicate breadcrumbs.

