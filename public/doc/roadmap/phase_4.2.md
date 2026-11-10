# Context & Directives: Sub-Phase 4.2 Implementation (`programa_aud`)

We are working on the frontend architecture and interactive exploration controls for **`programa_aud`**, a compliance and audit management platform aligned with ISO/IEC 17021-1:2015 and ISO 19011:2018.
Our roadmap breaks Phase 4 (`public/doc/roadmap/phase_4.md`) into bite-sized sequential sub-phases. Having completed Sub-Phase 4.1 (Global Header & Navigation Dropdowns), **this session is exclusively focused on Sub-Phase 4.2: Search Controls & View Switcher Components.**

---

## 1. Core Objective for Sub-Phase 4.2

Design, construct, and integrate the reusable data exploration controls component for real-time multi-criteria search filtering and instant view mode toggling (Grid vs. List) across operational domain records.

---

## 2. Technical Deliverables & Focus Areas

### A. Multi-Criteria Real-Time Search Bar

* Build a responsive, real-time search input component with debounce/instant client-side filtering capabilities.
* Support simultaneous multi-attribute filtering across core certification entity fields:
* **Certificate Code / Number** (e.g., `FN-QMS-2024-001`)
* **Company / Organization Name** (e.g., `Iberometal Componentes S.A.`)
* **Tax ID / RIF** (e.g., `J-12345678-9`)
* Include clear input actions (search icon indicator, dynamic match count badge, and a one-click reset/clear button).

### B. Presentation Switcher Toggle (Grid vs. List)

* Implement a dual-state presentation toggle component allowing users to switch dynamically without full page reloads:
* **Grid View (Relational Cards):** High-level visual cards summarizing certificate status, covered sites count, and normative compliance progress.
* **List View (Compact Table):** High-density tabular layout optimized for rapid comparative analysis and bulk record evaluation.
* Maintain state persistence for the active presentation mode across workspace refreshes and domain tab switches.

### C. Domain Filter & Status Facets (Optional Controls)

* Include secondary dropdown selectors for fast operational status filtering (e.g., `ACTIVO`, `EN_PROCESO`, `SUSPENDIDO`) and standard/scheme filtering (e.g., `ISO 9001:2015`, `ISO 14001:2015`).

---

## 3. Expected Output

* Provide the clean, production-ready TypeScript component code for the search and view control components (e.g., `src/views/searchControlsView.ts` or `src/components/searchControls.ts`).
* Ensure strict TypeScript typing (`strict: true`), accessible UI controls, smooth state callbacks, and styling alignment with Tailwind CSS v4 and the existing Vite setup.