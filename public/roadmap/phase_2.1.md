# Phase 2.1: Three-Block Header Restructuring, Route Cleanup & Zero-Card Domain Dispatchers

> **Parent Phase:** Phase 2 — Shell Navigation & Minimalist Workspace  
> **Depends On:** [`phase_1.2.md`](./phase_1.2.md) (Completed DB Schema & RLS)  
> **Unlocks:** [`phase_2.2.md`](./phase_2.2.md) (Dashboard & Perfil), [`phase_3.md`](./phase_3.md) (Compact Breadcrumbs)

---

## 1. Objectives & Scope

The current application shell duplicates navigation across the sticky top header (`src/views/header.ts`), bulky inline domain banners (`auditoriasView.ts`, `certificacionView.ts`, `extraView.ts`), and legacy standalone sub-routes (`drilldown`, `sites`, `processes`, `shifts`, `requirements`, `catalogs`). Meanwhile, Block 1 is pluralized as `"Auditorías"`, and Block 3 (`Extra`) lacks **`Acreditación`**.

**Phase 2.1** restructures the **global navigation contract, header menus, URL hash routing, and thin domain dispatchers** across `healthCheck.ts`, `accessControl.ts`, `header.ts`, `auditoriasView.ts`, `certificacionView.ts`, `extraView.ts`, and `main.ts`:
1. Establish the canonical **3-Block Singular Navigation Contract** (`Auditoría`, `Certificación`, `Extra` including `Acreditación`).
2. Add `'profile'` to `ActiveRoute` and remove legacy standalone `'drilldown'`, `'sites'`, `'processes'`, `'shifts'`, `'requirements'`, and `'catalogs'` top-level navigation entries.
3. Strip all inline banner cards (`"BLOQUE 1 · AUDITORÍAS"`, `"Estructura Operativa y Certificación"`, `"Navegación del Dominio Extra"`), inline `tablist` bars, and `"← Volver al Dashboard"` buttons from domain views.

---

## 2. Current State Gap Analysis

| File | Current Implementation | Target State in Phase 2.1 |
| :--- | :--- | :--- |
| `src/lib/healthCheck.ts` | `ActiveRoute` includes `'drilldown'` and lacks `'profile'`. `getVisibleDomainMenus()` labels Block 1 `"Auditorías"`, puts 7 items in Block 2 (including `drilldown`, `sites`, `processes`, `shifts`), and omits `accreditations` in Block 3 (which still has `requirements`, `catalogs`). | `ActiveRoute = 'dashboard' \| 'profile' \| 'approvals' \| 'database' \| DomainRoute`. Block 1: **`"Auditoría"`** (`Programación`, `Calendario`, `Resultado`). Block 2: **`"Certificación"`** (`Organización`, `Certificado`, `Auditor`). Block 3: **`"Extra"`** (`Norma`, `Sector IAF`, `Acreditación`, `Estatus`, `Tipo`, `Metodología`). |
| `src/lib/accessControl.ts` | `canAccessRoute()` / subview checks still reference `'drilldown'` and legacy `certificacion` subviews. | Align route & subview permissions with the 3-Block contract; allow all authenticated users (including `PENDING`/`REJECTED`) to access `'profile'`. |
| `src/views/header.ts` | User menu mixes `"Mi Perfil / Panel"` inside `showStaffApprovals` pointing to `data-nav="dashboard"`. | Expose **`Mi Perfil`** (`data-nav="profile"`, `data-nav-reset="true"`) in the user dropdown for **all** authenticated users, cleanly separated from `Panel Aprobaciones` (Staff) and `Estado DB` (Admin). |
| `src/views/auditoriasView.ts` | Lines 114–153 render `"BLOQUE 1 · AUDITORÍAS"` badge, `"Ciclo Operativo..."` card, and inline `role="tablist"`. | Strip banner card and inline tablist; render `Programación`, `Calendario`, or `Resultado` directly inside `<main>`. |
| `src/views/certificacionView.ts` | Lines 390–438 render `"Estructura Operativa y Certificación"` banner card, `"← Volver al Dashboard"` button, and 7 inline sub-tabs. | Strip banner card, `"Volver al Dashboard"` button, and inline sub-tabs; dispatch directly to `Organización`, `Certificado`, or `Auditor`. *(Note: Keep placeholder/redirect guards for legacy hash URLs `#certificacion/sites` → `certificates` until Phase 4.2.3 removes `drillDownView.ts`.)* |
| `src/views/extraView.ts` | Lines 453–484 render `nav[aria-label="Navegación del Dominio Extra"]` + `requirements` & `catalogs` tabs. | Strip inline sub-nav bar and remove `requirements` / `catalogs` tabs; route directly to `Norma`, `Sector IAF`, `Acreditación` (initial shell placeholder wired in Phase 4.1.3), `Estatus`, `Tipo`, `Metodología`. |
| `src/main.ts` | Hash parser & nav handlers dispatch `drilldown`, `sites`, `processes`, `shifts`, `requirements`, `catalogs`. | Update `parseHashRoute()` / `syncHash()` / click handlers to support `#profile` and normalize obsolete subviews safely to valid domain defaults (`certificates` or `standards`). |

---

## 3. Technical Specifications

### 3.1 Final Top-Header Navigation Contract (`src/lib/healthCheck.ts`)

```ts
export type DomainRoute = 'auditorias' | 'certificacion' | 'extra';
export type ActiveRoute = 'dashboard' | 'profile' | 'approvals' | 'database' | DomainRoute;
```

1. **Block 1 — `Auditoría`** (`id: 'auditorias'`, label `'Auditoría'`):
   - Sections (3): `scheduling` (`Programación`), `calendar` (`Calendario`), `findings` (`Resultado`).
2. **Block 2 — `Certificación`** (`id: 'certificacion'`, label `'Certificación'`):
   - Sections (3): `organizations` (`Organización`), `certificates` (`Certificado`), `auditors` (`Auditor`).
   - Accessible to `ADMIN`, `WORKER`, `CLIENT` (approved) in top menu; `AUDITOR` remains read-scoped if navigating into an assigned record via contextual breadcrumbs.
3. **Block 3 — `Extra`** (`id: 'extra'`, label `'Extra'`):
   - Sections (6): `standards` (`Norma`), `iaf` (`Sector IAF`), `accreditations` (`Acreditación`), `estatus` (`Estatus`), `tipos` (`Tipo`), `metodologias` (`Metodología`).

Every header domain trigger, dropdown item, brand logo, and user-menu route link retains `data-nav-reset="true"`.

### 3.2 User Account Dropdown (`src/views/header.ts`)

- Identity summary header: role/status icon (`🛡️`, `⚙️`, `📋`, `🏢`, `⏳`, `❌`) + display name + email.
- **`👤 Mi Perfil`** (`data-nav="profile"`, `data-nav-reset="true"`) — visible to **all** authenticated users (`APPROVED`, `PENDING`, `REJECTED`).
- Conditional Staff/Admin links (`status === 'APPROVED'`):
  - **`✅ Panel Aprobaciones`** (`ADMIN` / `WORKER`, with pending count badge).
  - **`🩺 Estado DB`** (`ADMIN` only).
- **`🚪 Cerrar Sesión`** (`#signOutBtn`).

### 3.3 Thin Domain Dispatchers

- `auditoriasView.ts`, `certificacionView.ts`, and `extraView.ts` must emit **zero** wrapper banner cards, **zero** inline navigation pills/tabs, and **zero** `"Volver al Dashboard"` buttons—acting purely as clean route dispatchers under `<main>`.

---

## 4. Implementation Checklist

- [ ] Update `ActiveRoute`, `DomainMenuSpec`, and `getVisibleDomainMenus()` in `src/lib/healthCheck.ts`.
- [ ] Update route/subview guards in `src/lib/accessControl.ts` and label maps in `src/lib/breadcrumb.ts` (`Auditoría`, `Acreditación`, `Perfil`).
- [ ] Update account dropdown in `src/views/header.ts` to expose `Mi Perfil` for all authenticated users.
- [ ] Strip banner cards, inline sub-navs, and `"Volver al Dashboard"` buttons from `src/views/auditoriasView.ts`, `src/views/certificacionView.ts`, and `src/views/extraView.ts`.
- [ ] Update hash routing (`#profile`, fallback for retired subviews) and header click wiring in `src/main.ts`.

---

## 5. Acceptance Criteria

1. Top global header displays strictly **3 domain blocks**: `Auditoría` (3 items), `Certificación` (3 items), and `Extra` (6 items including `Acreditación`).
2. `Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, `Turnos`, `Requisitos LTREE`, and `Todos los Catálogos` are completely absent from the top header and inline banners.
3. Zero inline exploration cards, duplicate banner headers, or `"Volver al Dashboard"` buttons render in `Auditoría`, `Certificación`, or `Extra`.
4. Clicking `Mi Perfil` in the user dropdown routes cleanly to `#profile` for any authenticated user.

