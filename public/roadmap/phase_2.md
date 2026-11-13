# Phase 2: Global Navigation Restructuring, Minimalist Dashboard, Zero Extra Cards & User Profile (`Perfil`)

## 1. Objectives & Architectural Rationale

The current shell duplicates navigation across multiple layers: the sticky top header (`src/views/header.ts`), bulky inline domain banners (`certificacionView.ts`, `auditoriasView.ts`, `extraView.ts`), and an embedded `"Explorador Operativo de Certificados"` inside `dashboardView.ts`. Meanwhile, Block 2 (`Certificación`) still exposes legacy `Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, and `Turnos` top-level items, Block 3 (`Extra`) omits **`Acreditación`** while exposing `Requisitos LTREE` and `Todos los Catálogos`, and there is no dedicated **`Perfil`** route for self-service user profile management.

Phase 2 delivers a focused, distraction-free application shell:
1. **Three-Block Header Restructuring** using singular block/section names and adding **`Acreditación`** under `Extra`.
2. **Elimination of All Extra Exploration Cards & Inline Sub-Nav Banners** across `Auditoría`, `Certificación`, and `Extra`.
3. **Minimalist Home Dashboard** stripped of role/status badge clutter and the embedded certificate explorer, replaced by lightweight operational KPIs.
4. **Dedicated `Perfil` View** accessible from the header user menu with RBAC-enforced self-update controls.

---

## 2. Current State Gap Analysis

| File | Current Implementation | Target State in Phase 2 |
| :--- | :--- | :--- |
| `src/lib/healthCheck.ts` | `ActiveRoute` includes `'drilldown'` and lacks `'profile'`. `getVisibleDomainMenus()` names Block 1 `"Auditorías"`; includes `drilldown`, `sites`, `processes`, `shifts` in Block 2; includes `requirements`, `catalogs` in Block 3 and lacks `accreditations` (`Acreditación`). | `ActiveRoute` adds `'profile'` and removes `'drilldown'`. Block 1 is **`"Auditoría"`** (`Programación`, `Calendario`, `Resultado`). Block 2 **`"Certificación"`** has strictly `Organización`, `Certificado`, `Auditor`. Block 3 **`"Extra"`** has `Norma`, `Sector IAF`, `Acreditación`, `Estatus`, `Tipo`, `Metodología`. |
| `src/views/header.ts` | User menu mixes `"Mi Perfil / Panel"` pointing to `data-nav="dashboard"` only inside `showStaffApprovals`, leaving `AUDITOR` and `CLIENT` without a profile link and conflating dashboard with profile. | Add an explicit **`Mi Perfil`** (`data-nav="profile"`, `data-nav-reset="true"`) item in the account dropdown for **all** authenticated users, clearly separated from `"Inicio / Panel"` and admin-only `"Panel Aprobaciones"` / `"Estado DB"`. |
| `src/views/dashboardView.ts` | Lines 173–194 render `roleMeta` + `statusMeta` pill badges; lines 87–165 render `"Explorador Operativo de Certificados"` + `renderSearchControls` + certificate grid/list. | Remove role/status pill badges and remove the entire `"Explorador Operativo de Certificados"` section. Render a clean, calm welcome header + minimalist RBAC-scoped high-level KPI cards (e.g., Organizaciones, Certificados Vigentes, Auditorías Programadas, Acreditaciones Activas, Hallazgos Abiertos). |
| `src/views/certificacionView.ts` | Lines 390–438 render `"Estructura Operativa y Certificación"` banner card, `"← Volver al Dashboard"` button, and inline sub-tabs (`organizations`, `certificates`, `auditors`, `drilldown`, `sites`, `processes`, `shifts`). | Strip the banner card, inline sub-tabs, and `"Volver al Dashboard"` button. Render the active subsection view (`Organización`, `Certificado`, or `Auditor`) directly inside `<main>`. |
| `src/views/auditoriasView.ts` | Lines 114–153 render `"BLOQUE 1 · AUDITORÍAS"` badge, `"Ciclo Operativo..."` title, and inline `role="tablist"` sub-tabs. | Strip the `"BLOQUE 1 · AUDITORÍAS"` header and inline tablist; render `Programación`, `Calendario`, or `Resultado` directly inside `<main>`. |
| `src/views/extraView.ts` | Lines 453–484 render inline sub-navigation bar (`nav[aria-label="Navegación del Dominio Extra"]`) plus `requirements` and `catalogs` views. | Strip the inline sub-nav bar and remove `requirements` / `catalogs` tabs; route directly to `Norma`, `Sector IAF`, `Acreditación`, `Estatus`, `Tipo`, or `Metodología`. |

---

## 3. Technical & UX Specifications

### 3.1 Final Top-Header Navigation Contract (`src/lib/healthCheck.ts`)

```ts
export type DomainRoute = 'auditorias' | 'certificacion' | 'extra';
export type ActiveRoute = 'dashboard' | 'profile' | 'approvals' | 'database' | DomainRoute;
```

1. **Block 1 — `Auditoría`** (`id: 'auditorias'`, label `'Auditoría'`):
   - Visible to: `ADMIN`, `WORKER`, `AUDITOR`, `CLIENT` (approved).
   - Sections:
     - `scheduling` → **`Programación`**
     - `calendar` → **`Calendario`**
     - `findings` → **`Resultado`**
2. **Block 2 — `Certificación`** (`id: 'certificacion'`, label `'Certificación'`):
   - Visible to: `ADMIN`, `WORKER`, `CLIENT` (approved); optionally read-scoped for `AUDITOR` only when navigating into assigned records via breadcrumbs, or visible as approved operational scope.
   - Sections (strictly 3):
     - `organizations` → **`Organización`**
     - `certificates` → **`Certificado`**
     - `auditors` → **`Auditor`**
3. **Block 3 — `Extra`** (`id: 'extra'`, label `'Extra'`):
   - Visible to: all `APPROVED` roles.
   - Sections (strictly 6):
     - `standards` → **`Norma`**
     - `iaf` → **`Sector IAF`**
     - `accreditations` → **`Acreditación`** *(NEW)*
     - `estatus` → **`Estatus`**
     - `tipos` → **`Tipo`**
     - `metodologias` → **`Metodología`**

Every header domain button and dropdown menu item retains `data-nav-reset="true"` so only global header clicks reset the breadcrumb trail to domain root.

### 3.2 User Account Dropdown & `Perfil` View (`src/views/profileView.ts`)

1. **Account Dropdown Structure (`src/views/header.ts`):**
   - Identity summary block (role/status icon + name + email + role subtitle).
   - **`👤 Mi Perfil`** (`data-nav="profile"`, `data-nav-reset="true"`) — visible to **all** authenticated users (including `PENDING`, `CLIENT`, `AUDITOR`, `WORKER`, `ADMIN`).
   - Staff/Admin links (when `profile.status === 'APPROVED'`):
     - **`✅ Panel Aprobaciones`** (with pending count indicator) for `ADMIN` / `WORKER` (`canViewApprovals`).
     - **`🩺 Estado DB`** for `ADMIN` only.
   - **`🚪 Cerrar Sesión`** (`#signOutBtn`).
2. **`Perfil` View (`src/views/profileView.ts`):**
   - Displays current authenticated account summary (`email`, `created_at`, minimalist role/status indicator without bulky badge stacks).
   - **Editable Section (Cautious Self-Update):**
     - `nombre` input (`maxlength="150"`, required, trimmed, sanitized) + explicit `"Guardar Cambios"` button with optimistic/confirmed save feedback.
     - Optional password change trigger (via standard Supabase `supabase.auth.updateUser({ password })` with current/confirm validation, if enabled) — never exposing raw secrets or role selectors.
   - **Locked Governance Fields (Read-Only for non-Admins):**
     - `role` (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`) and `status` (`APPROVED`, `PENDING`, `REJECTED`) are rendered strictly as read-only metadata with an informative tooltip explaining that role/status changes require an administrator in `Panel Aprobaciones`.
   - **Role-Contextual Summary (Read-Only):**
     - For `CLIENT`: displays linked `client_organization_access` organizations and approval state.
     - For `AUDITOR`: displays matching `auditor` competency summary (if linked by name/account).

### 3.3 Minimalist Home Dashboard (`src/views/dashboardView.ts`)

- **Greeting Card:** Clean `<h1>Bienvenido, ${nombre}</h1>` + authenticated email subtitle. **Zero** `roleMeta` or `statusMeta` pill badges.
- **High-Level Operational Summary Grid (RBAC-Scoped):**
  - Clean 3-to-5 minimalist metric tiles with tabular numerals (`tabular-nums`) and subtle borders (no heavy gradients or "exploration" cards):
    - `Organizaciones Activas` (visible to `ADMIN`, `WORKER`, `CLIENT` scoped)
    - `Certificados Vigentes` (visible to `ADMIN`, `WORKER`, `CLIENT` scoped)
    - `Auditorías Programadas` (visible to all approved roles, scoped)
    - `Acreditaciones Activas` (`acreditacion_norma_iaf` active count)
    - `Hallazgos Abiertos` (open NCs count, clickable or summary only)
  - For `PENDING` or `REJECTED` accounts: retain the clear informative status notice without operational metrics.
- **Removal of `searchControls` Coupling:** Remove dashboard-only `"Explorador Operativo de Certificados"` rendering from `dashboardView.ts` and `main.ts` (`state.searchControls` no longer drives a dashboard certificate explorer).

### 3.4 Zero Extra Exploration Cards Across Domain Views

- Ensure `auditoriasView.ts`, `certificacionView.ts`, and `extraView.ts` act strictly as **thin domain dispatchers** rendering the active view (`Programación`, `Calendario`, `Resultado`, `Organización`, `Certificado`, `Auditor`, `Norma`, `Sector IAF`, `Acreditación`, `Estatus`, `Tipo`, `Metodología`) directly below the compact breadcrumb strip (`Phase 3`), with zero intermediate navigation cards, zero duplicate banner headers, and zero `"Volver al Dashboard"` buttons.

---

## 4. Implementation Checklist

- [ ] Update `ActiveRoute`, `DomainMenuSpec`, and `getVisibleDomainMenus()` in `src/lib/healthCheck.ts` (singular `"Auditoría"`, 3 items in `Certificación`, 6 items including `"Acreditación"` in `Extra`, add `'profile'`, remove `'drilldown'`).
- [ ] Update `src/lib/accessControl.ts` and `src/lib/breadcrumb.ts` route/subview label maps to match the updated block & section names (`Auditoría`, `Acreditación`, `Perfil`).
- [ ] Update `src/views/header.ts` account dropdown to expose `Mi Perfil` (`data-nav="profile"`) for all authenticated users.
- [ ] Create `src/views/profileView.ts` and wire `updateOwnProfile` Supabase handler + validation in `src/main.ts` (blocking any client-side mutation of `role` or `status`).
- [ ] Refactor `src/views/dashboardView.ts` to remove role/status badges and the `"Explorador Operativo de Certificados"` section, replacing it with minimalist high-level summary metrics.
- [ ] Strip domain header banners, inline sub-tabs, and `"Volver al Dashboard"` buttons from `src/views/auditoriasView.ts`, `src/views/certificacionView.ts`, and `src/views/extraView.ts`.
- [ ] Update URL hash routing in `src/main.ts` to handle `#profile` and clean domain/subview defaults without `drilldown`, `sites`, `processes`, `shifts`, `requirements`, or `catalogs` top-level routes.

---

## 5. Acceptance Criteria

1. Top global navigation shows strictly **3 blocks**: `Auditoría` (`Programación`, `Calendario`, `Resultado`), `Certificación` (`Organización`, `Certificado`, `Auditor`), and `Extra` (`Norma`, `Sector IAF`, `Acreditación`, `Estatus`, `Tipo`, `Metodología`).
2. `Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, `Turnos`, `Requisitos LTREE`, and `Todos los Catálogos` no longer appear in the top header or inline banners.
3. No domain view (`Auditoría`, `Certificación`, `Extra`) renders an extra exploration banner card, inline sub-tab bar, or `"Volver al Dashboard"` button above its Multi View or Detail View.
4. The home dashboard (`dashboardView.ts`) displays zero role/status badges and zero `"Explorador Operativo de Certificados"` controls, showing clean minimalist general statistics instead.
5. Every authenticated user can open **`Mi Perfil`** from the user menu dropdown, edit and save `nombre`, and see `role`/`status` locked as read-only governance metadata.
