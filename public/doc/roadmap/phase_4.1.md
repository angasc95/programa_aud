# Context & Directives: Sub-Phase 4.1 Implementation (`programa_aud`)

We are working on the frontend architecture and layout for **`programa_aud`**, a compliance and audit management platform aligned with ISO/IEC 17021-1:2015 and ISO 19011:2018.
Our roadmap organizes Phase 4 (`public/doc/roadmap/phase_4.md`) into bite-sized sequential sub-phases. Having successfully completed Phase 1 (Base Infrastructure & Audit Log), Phase 2 (Master Catalogs & Competencies), and Phase 3 (Certification Domain & ISO Coverage Engine), **this session is exclusively focused on Sub-Phase 4.1: The Global Header & Navigation Dropdowns (`src/views/header.ts`).**

---

## 1. Core Objective for Sub-Phase 4.1

Build the persistent top layout shell (`src/views/header.ts`), incorporating user identity/role display, status badges, and security-aware hover navigation dropdowns across all operational domains.

---

## 2. Technical Deliverables & Focus Areas

### A. Persistent Layout Shell & Brand Identity

* Construct the fixed top navigation bar displaying system branding and active user information.
* Display active user identity (`nombre`/email), assigned role (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`), and visual approval status badges (`APPROVED`, `PENDING`, `REJECTED`).

### B. Security-Aware Domain Navigation Dropdowns

* Group system capabilities into interactive hover dropdown menus (with full touch/keyboard accessibility):
1. **Dominio Auditorías:** Event scheduling, calendar selection, and evaluator team management.
2. **Dominio Certificación:** Client organization management, issued certificates, multi-site locations, process mapping, and work shift schedules.
3. **Dominio Extra:** Reference catalog management (standards, `ltree` requirements, IAF sectors, statuses, audit types, methodologies).

### C. Account & Administrative Controls Dropdown

* Right-aligned interactive hover menu providing:
* **All Users:** Profile summary and **Log Out** button.
* **Approved Administrators (`ADMIN`):** Privileged shortcuts to **Dashboard**, **User Approvals** (with pending request badge counter), and **Database Status**.

### D. Interaction & Accessibility Standards

* Ensure dropdowns open seamlessly on cursor hover, with fallback event handling for mobile touch taps and keyboard navigation.

---

## 3. Expected Output

* Provide the clean, production-ready TypeScript component code for `src/views/header.ts`.
* Ensure strict TypeScript typing (`strict: true`), HTML escaping, and styling alignment with Tailwind CSS v4 and the existing Supabase auth/RBAC helpers.