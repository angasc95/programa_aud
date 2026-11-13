# Phase 2.2: Minimalist Home Dashboard & Self-Service User Profile (`Perfil`)

> **Parent Phase:** Phase 2 — Shell Navigation & Minimalist Workspace  
> **Depends On:** [`phase_1.2.md`](./phase_1.2.md) (`profiles_update_self` RLS + RBAC trigger), [`phase_2.1.md`](./phase_2.1.md) (`ActiveRoute` `'profile'` & header dropdown)  
> **Unlocks:** [`phase_3.md`](./phase_3.md) (Contextual Breadcrumbs), [`phase_5.2.md`](./phase_5.2.md) (Profile Governance Tests)

---

## 1. Objectives & Scope

The current home view (`src/views/dashboardView.ts`, 231 lines) clutters the workspace with `roleMeta` / `statusMeta` pill badges (lines 173–194) and an embedded `"Explorador Operativo de Certificados"` directory with search controls (lines 87–165) that duplicates `Certificación > Certificado`. Furthermore, users have no dedicated **`Perfil`** page to inspect their account or cautiously update their display name (`nombre`).

**Phase 2.2** delivers two focused UI/UX modules:
1. **Minimalist Home Dashboard (`src/views/dashboardView.ts`):** Strip role/status pill badges and remove the embedded certificate explorer + `searchControls` coupling, replacing them with calm, RBAC-scoped operational summary metrics.
2. **Dedicated Self-Service `Perfil` View (`src/views/profileView.ts` + pure validation helpers):** Allow any authenticated user to view account metadata and safely update `profiles.nombre` (and optional password change) while locking `role` and `status` as immutable governance fields for non-admins.

---

## 2. Current State Gap Analysis

| File | Current Implementation | Target State in Phase 2.2 |
| :--- | :--- | :--- |
| `src/views/dashboardView.ts` | Renders `roleMeta` + `statusMeta` pill badges in the welcome card and embeds `"Explorador Operativo de Certificados"` via `renderSearchControls()`. | Clean welcome header (`Bienvenido, ${nombre}` + email subtitle, **zero** role/status badges) + minimalist 3-to-5 metric KPI grid scoped by RBAC. Zero certificate table/explorer embedded. |
| `src/main.ts` | `state.exploration` / `renderSearchControls` coupled to `dashboardView.ts`; no `#profile` state or `updateOwnProfile` mutation handler. | Decouple `dashboardView.ts` from `searchControls` explorer; add `profileForm` state (`nombreInput`, `saving`, `feedbackMessage`, `errorMessage`, optional password reset trigger) and Supabase `profiles.update({ nombre })` handler. |
| `src/views/profileView.ts` *(New)* | Does not exist. | Dedicated **`Mi Perfil`** view displaying account identity, editable `nombre` form, locked `role`/`status` governance indicators, and role-contextual read-only summary (`CLIENT` organizations / `AUDITOR` competence link). |

---

## 3. Technical & UX Specifications

### 3.1 Minimalist Home Dashboard (`src/views/dashboardView.ts`)

- **Welcome Section:** Clean typography (`<h1>Bienvenido, ${escapeHtml(profile.nombre)}</h1>` and subtle email subtitle). **Zero** `ADMIN` / `WORKER` / `AUDITOR` / `CLIENT` / `APPROVED` pill badges (role/status iconography already lives in the top-right header menu).
- **Pending / Rejected State:** Retain clear, calm informational banner explaining account status without operational metrics.
- **Minimalist Operational Summary Metrics (Approved Users, RBAC-Scoped):**
  - Lightweight 1-row grid of clean metric tiles using `tabular-nums`, crisp slate borders, and concise Spanish labels (no heavy dark gradient banners or inline navigation cards):
    1. `Organizaciones Activas` (`ADMIN`, `WORKER`, `CLIENT` authorized count)
    2. `Certificados Vigentes` (active count via `countActiveCertificates`, scoped by role)
    3. `Auditorías Programadas` (upcoming/planned audits scoped by role)
    4. `Acreditaciones Activas` (`acreditacion_norma_iaf` active count)
    5. `Hallazgos Abiertos` (open NCs scoped to visible audits)
  - Note: Metrics serve as calm situational awareness—**never** duplicate the top header navigation cards or embed full search directories.

### 3.2 Self-Service `Perfil` View (`src/views/profileView.ts` & `src/lib/healthCheck.ts`)

1. **Account Summary Card:**
   - Displays authenticated email (`user.email`), account creation date (`created_at` formatted in Spanish locale), and minimalist role/status indicator with read-only governance note:
     - `Rol asignado`: e.g., `WORKER (Personal Operativo)` — *"Gestionado exclusivamente por un Administrador en Panel Aprobaciones."*
     - `Estado de cuenta`: e.g., `APPROVED (Aprobado)`.
2. **Cautious Self-Update Form (`profiles.nombre`):**
   - Pure helper `buildSelfProfileUpdatePayload(rawNombre: string)`:
     - Trims whitespace, validates `length >= 2 && length <= 150`, rejects empty/whitespace-only values or raw UUID strings (`containsRawUuid`), and returns strictly `{ nombre }`—**never** including `role` or `status`.
   - Submit handler in `src/main.ts`:
     - Calls `supabase.from('profiles').update(payload).eq('id', state.user.id).select().single()`.
     - Updates `state.profile` immediately on success, shows crisp inline confirmation feedback, and handles RLS/trigger rejections cleanly via `translateDatabaseError()`.
3. **Optional Password Update Section:**
   - Collapsible or secondary card allowing authenticated users to set a new password (`>= 8` chars + confirmation match) via `supabase.auth.updateUser({ password })` without exposing secrets or session tokens.
4. **Role-Contextual Read-Only Panel:**
   - **`CLIENT`:** Lists linked organizations from `client_organization_access` (`APPROVED` / `PENDING`) so the client clearly knows which organizations their account covers.
   - **`AUDITOR`:** Displays matching technical competence summary (`norma` / `sector_iaf` count) if matched by profile name/identity.

---

## 4. Implementation Checklist

- [ ] Refactor `src/views/dashboardView.ts` to remove `roleMeta`/`statusMeta` pill badges and the entire `"Explorador Operativo de Certificados"` section.
- [ ] Add lightweight RBAC-scoped summary metric computation in `src/views/dashboardView.ts` / `src/main.ts` (`Organizaciones Activas`, `Certificados Vigentes`, `Auditorías Programadas`, `Acreditaciones Activas`, `Hallazgos Abiertos`).
- [ ] Add `buildSelfProfileUpdatePayload()` pure validation helper in `src/lib/healthCheck.ts` (or `src/lib/profileGovernance.ts`).
- [ ] Create `src/views/profileView.ts` with identity summary, locked governance fields, editable `nombre` form, optional password update, and role-contextual read-only panel.
- [ ] Wire `#profile` rendering and `updateOwnProfile` / `updateOwnPassword` event handlers in `src/main.ts`.

---

## 5. Acceptance Criteria

1. Home Dashboard (`#dashboard`) renders zero role/status pill badges and zero `"Explorador Operativo de Certificados"` controls, while displaying accurate RBAC-scoped summary metrics.
2. Any authenticated user (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`, `PENDING`) can open `Mi Perfil` (`#profile`), update their `nombre`, persist it to `public.profiles`, and see the updated name reflected in the top header immediately.
3. Non-admin users see `role` and `status` strictly as read-only governance metadata with zero editable controls or client-side mutation payload fields for `role`/`status`.
4. Zero raw UUIDs appear anywhere in `dashboardView.ts` or `profileView.ts`.
