# Context & Directives: Sub-Phase 4.3 Implementation (`programa_aud`)

We are working on the main application orchestration and reactive state management for **`programa_aud`**, a compliance and audit management platform aligned with ISO/IEC 17021-1:2015 and ISO 19011:2018.
Our roadmap breaks Phase 4 (`public/doc/roadmap/phase_4.md`) into sequential sub-phases. Having completed Sub-Phase 4.1 (Global Header & Navigation Dropdowns) and Sub-Phase 4.2 (Search Controls & View Switcher Components), **this session is exclusively focused on Sub-Phase 4.3: SPA Routing & Workspace Orchestration (`src/main.ts`).**

---

## 1. Core Objective for Sub-Phase 4.3

Wire up the client-side reactive state container, route listener, domain switching orchestration, and dynamic workspace container rendering in `src/main.ts` without triggering full HTML document reloads.

---

## 2. Technical Deliverables & Focus Areas

### A. Reactive Application State Management

* Maintain central client state in `src/main.ts`:
* Active session & user profile (`auth.users` + `public.profiles`).
* Active route / operational domain tab (`auditorias`, `certificacion`, `extra`, `approvals`, `database_status`, `dashboard`).
* Search query string and status/scheme filter criteria.
* View presentation mode (`grid` vs. `list`).

### B. Dynamic Workspace Orchestration

* Mount the persistent global header (`src/views/header.ts`) at the top of the layout.
* Render domain-specific view containers inside `#app` dynamically based on state:
1. **Dominio Auditorías:** Audit schedules, calendars, and evaluator teams.
2. **Dominio Certificación:** Client organizations, certificates, multi-site locations, processes, and shifts.
3. **Dominio Extra:** Reference catalogs (ISO standards, `ltree` requirements, IAF sectors, statuses).
4. **Admin Views:** User approvals panel (`src/views/approvalsView.ts`) and Live DB health checker (`src/views/databaseStatusView.ts`).
* Mount search controls & view switcher components (`Sub-Phase 4.2`) seamlessly above data-driven domain views.

### C. Session & Event Handling

* Subscribe to Supabase Auth state changes (`onAuthStateChange`) to handle log-in, log-out, and token refreshes cleanly.
* Connect global event listeners for navigation actions (header menu selections, search filter updates, and grid/list view toggling).

---

## 3. Expected Output

* Provide the clean, production-ready TypeScript code for `src/main.ts`.
* Ensure strict TypeScript typing (`strict: true`), smooth DOM re-renders without layout jumps, and seamless integration with existing view modules and Supabase client helpers (`src/lib/supabase.ts`).