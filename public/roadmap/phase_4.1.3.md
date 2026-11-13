# Phase 4.1.3: New `Acreditación` Domain & Multi View (`acreditacion_norma_iaf` + `organismo_acreditacion`)

> **Parent Phase:** Phase 4.1 — Universal Multi View Architecture  
> **Depends On:** [`phase_1.2.md`](./phase_1.2.md) (Schema & RLS), [`phase_2.1.md`](./phase_2.1.md) (`Extra > Acreditación` menu route), [`phase_4.1.1.md`](./phase_4.1.1.md) (Multi View Engine)  
> **Unlocks:** [`phase_4.2.2.md`](./phase_4.2.2.md) (`Acreditación` Detail View)

---

## 1. Objectives & Scope

Database Phase 1 introduced `organismo_acreditacion` (`ENAC`, `UKAS`, `ANAB`) and `acreditacion_norma_iaf` (linking accreditation bodies to `norma` and optional `sector_iaf`), and Phase 2.1 added `Acreditación` to the `Extra` top-header menu. However, there is currently no dedicated domain module, Supabase hydration/creation workflow, or plural Multi View for managing accreditations.

**Phase 4.1.3** delivers the **`Acreditación` domain logic, Supabase data wiring, and full Multi View directory** (`Extra > Acreditación`):
1. Create `src/lib/acreditacionDomain.ts` with typed models, facet builders, sorting helpers, expiry status evaluation, and active-certificate impact calculation.
2. Create `src/views/acreditacionView.ts` implementing the Phase 4.1.1 Multi View specification (`⊞ Tarjetas | ☰ Tabla`, collapsible checkbox facets, reactive counts, single `type="text"` search).
3. Wire Supabase queries (`acreditacion_norma_iaf` joined with `organismo_acreditacion`, `norma`, `sector_iaf`) and RBAC-gated creation modal/form (`ADMIN`/`WORKER`) in `src/main.ts`.

---

## 2. Technical Specifications

### 2.1 Pure Domain Module (`src/lib/acreditacionDomain.ts`)

- **Data Model (`AcreditacionDetailEntity`):**
  - Core fields from `acreditacion_norma_iaf`: `id`, `numero_acreditacion`, `fecha_concesion`, `fecha_vencimiento`, `estatus` (`Activa`, `Suspendida`, `Vencida`), `deleted_at`.
  - Joined parent metadata (Zero-UUID compliant display):
    - `id_organismo`, `organismo_codigo` (`ENAC`, `UKAS`, `ANAB`), `organismo_nombre`, `organismo_pais`, `organismo_sitio_web`.
    - `id_norma`, `norma_codigo`, `norma_titulo`.
    - `id_sector_iaf` (nullable), `sector_numero` (or `null` → `"Todos los Sectores"`), `sector_descripcion`.
  - Operational impact metric: `activeCertificatesCount` computed by matching active `certificado` records sharing `(id_norma, id_sector_iaf)` (or all active certificates for `id_norma` when `id_sector_iaf IS NULL`).
- **Helpers:**
  - `evaluateAccreditationExpiry(fechaVencimiento, referenceDate)`: returns `{ state: 'Vigente' | 'Por Vencer' | 'Vencida' | 'Sin Vencimiento', daysRemaining: number | null }`.
  - `validateAccreditationInput(...)`: validates required `id_organismo`, `id_norma`, non-empty `numero_acreditacion`, `fecha_concesion`, and `fecha_vencimiento >= fecha_concesion`.

### 2.2 `Acreditación` Multi View (`src/views/acreditacionView.ts`)

- **Header:** `Acreditaciones Vigentes` + concise 1-line ISO/IEC 17011 / IAF scope subtitle + `+ Nueva Acreditación` (`ADMIN`/`WORKER`).
- **Collapsible Facet Categories (Reactive Counts):**
  1. `Organismo de Acreditación` (`ENAC`, `UKAS`, `ANAB`, ...)
  2. `Norma ISO` (`ISO 9001:2015`, `ISO 14001:2015`, ...)
  3. `Sector IAF` (including `"Todos los Sectores"`)
  4. `Estatus` (`Activa`, `Suspendida`, `Vencida`)
- **Search Fields:** `numero_acreditacion`, `organismo_codigo`, `organismo_nombre`, `norma_codigo`, `sector_descripcion`.
- **Totalizer:** `"Mostrando X de Y acreditaciones registradas"`.
- **`⊞ Tarjetas` & `☰ Tabla` Columns:**
  - Accreditation Number (`numero_acreditacion`)
  - Accreditation Body (`ENAC — España`)
  - Norm (`ISO 9001:2015`)
  - IAF Sector (`Sector 17` or `General`)
  - Grant Date (`fecha_concesion`)
  - Expiry Date (`fecha_vencimiento` + expiry indicator)
  - Status (`Activa` / `Suspendida` / `Vencida`)
  - Active Certificates Covered (`activeCertificatesCount`)
- Clicking any card or row navigates to `#extra/accreditations` Detail View (wired in Phase 4.2.2) and pushes onto `state.breadcrumbs`.

### 2.3 Supabase Hydration & Creation (`src/main.ts`)

- Extend `loadDomainData()` to fetch active `organismo_acreditacion` and `acreditacion_norma_iaf` rows (`deleted_at IS NULL`).
- Add `+ Nueva Acreditación` creation modal/handler (`ADMIN`/`WORKER` only) inserting into `public.acreditacion_norma_iaf` (and optionally creating/selecting an `organismo_acreditacion`).

---

## 3. Implementation Checklist

- [ ] Create `src/lib/acreditacionDomain.ts` with `AcreditacionDetailEntity`, validation, expiry evaluation, and certificate-impact calculation.
- [ ] Create `src/views/acreditacionView.ts` implementing the unified Multi View (`⊞ Tarjetas | ☰ Tabla`, collapsible checkbox facets, reactive counts, `"Mostrando X de Y acreditaciones registradas"`).
- [ ] Wire `organismo_acreditacion` + `acreditacion_norma_iaf` loading, creation modal (`ADMIN`/`WORKER`), facet filtering, and `#extra/accreditations` dispatch in `src/main.ts` and `src/views/extraView.ts`.

---

## 4. Acceptance Criteria

1. Navigating to `Extra > Acreditación` renders the full **Acreditaciones** Multi View backed by live `acreditacion_norma_iaf` and `organismo_acreditacion` records from Supabase.
2. Checking `ENAC` or `ISO 9001:2015` dynamically updates counts across `Sector IAF` and `Estatus`, and `"Mostrando X de Y acreditaciones registradas"` reflects the exact filtered set.
3. Authorized staff (`ADMIN`/`WORKER`) can create a new accreditation scope and see it appear immediately without raw UUIDs exposed anywhere in cards, tables, or dropdowns.

