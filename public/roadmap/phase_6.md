# Phase 6: System Integration, Audit Trail Hardening & Acceptance Verification

## 1. Executive Summary & Phase Scope

Phase 6 is the final stabilization, security hardening, and end-to-end verification phase for the `programa_aud` platform upgrade. This phase guarantees that all cross-cutting mandates established in the master roadmap (`roadmap.md`) and implemented through Phases 1 to 5 operate seamlessly under real-world conditions.

Key areas of focus include:
1. **Forensic Audit Trail Verification:** Comprehensive validation of the `public.audit_log` pipeline and the entity-level `🕒 Historial de Cambios` modal.
2. **Navigation & Breadcrumb Integrity:** Verification of drill-down hierarchies, text ellipsis truncation, and top-header reset rules across all views.
3. **Strict Zero-UUID Enforcement:** Comprehensive UI inspection guaranteeing that raw UUIDs are completely eliminated from user-facing presentations.
4. **Row Level Security (RLS) Isolation:** Rigorous boundary testing across the four user roles (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`) and pending/rejected account states.
5. **Automated Testing Suite Expansion:** Unit tests in `src/lib/*.test.ts` executed via the native Node.js test runner (`node:test`).
6. **Production Build & Documentation Handover:** Flawless compilation (`tsc --noEmit` and `npm run build`) and synchronization of architectural documentation.

---

## 2. Verification Modules & Quality Protocols

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: FINAL INTEGRATION & ACCEPTANCE MATRIX                                         │
│                                                                                        │
│ ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────────────────┐ │
│ │ 1. AUDIT TRAIL ENGINE  │  │ 2. ZERO-UUID AUDIT     │  │ 3. RLS SECURITY BOUNDARY  │ │
│ │ • Table Mutation Diffs │  │ • Human-Readable Links │  │ • Admin / Worker Privs    │ │
│ │ • Changelog Modal Test │  │ • Ellipsis Truncation  │  │ • Auditor & Client Scopes │ │
│ │ • Immutable Records    │  │ • Clean UI Labels      │  │ • Pending User Lockdown   │ │
│ └────────────────────────┘  └────────────────────────┘  └───────────────────────────┘ │
│                                                                                        │
│ ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────────────────┐ │
│ │ 4. BREADCRUMB RULES    │  │ 5. AUTOMATED UNIT TESTS│  │ 6. PRODUCTION BUILD       │ │
│ │ • Dynamic Hierarchy    │  │ • Node:test Pure Logic │  │ • TypeScript Strict Type  │ │
│ │ • Ancestor Navigation  │  │ • 100% Core Logic Cov  │  │ • Vite Bundle Generation  │ │
│ │ • Top-Nav Reset Rule   │  │ • Zero Flaky Tests     │  │ • Documentation Sync      │ │
│ └────────────────────────┘  └────────────────────────┘  └───────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Forensic Audit Trail Verification
- **Target:** Every primary operational table (`organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`, `norma`, `subsector_iaf`, `acreditacion_norma_iaf`).
- **Verification Protocol:**
  - Execute programmatic `INSERT`, `UPDATE`, and `DELETE` mutations.
  - Verify that triggers execute synchronously and record complete `old_data` and `new_data` JSONB snapshots in `public.audit_log`.
  - Open the `🕒 Historial de Cambios` modal on each detail page and confirm:
    - Actor display name and email are accurately resolved.
    - Timestamp is formatted in local readable time.
    - Field-level diff highlights modified attributes with clear old-vs-new visualization.

### 2.2 Strict Zero-UUID Enforcement Audit
- **Target:** All tables, cards, breadcrumbs, search results, tooltips, and modal forms across the three operational domains (`Auditorías`, `Certificación`, `Extra`).
- **Verification Protocol:**
  - Automated regex scan across rendered DOM tree searching for UUID v4 patterns (`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`).
  - Confirm that all relational foreign keys resolve to human-readable names:
    - `id_organizacion` -> Organization Name (e.g., *CyberCloud Solutions S.L.*).
    - `id_certificado` -> Certificate Code (e.g., *FN-QMS-2024-001*).
    - `id_norma` -> Standard Code (e.g., *ISO 9001:2015*).
    - `id_auditor_lider` -> Auditor Full Name (e.g., *Ing. Roberto Silva*).
    - `id_requisito` -> Requirement Clause Code (e.g., *8.5.1 Control de la producción*).

### 2.3 Breadcrumb Navigation & State Consistency
- **Verification Protocol:**
  - Test deep drill-down path:
    `Organizaciones > CyberCloud Solutions S.L. > FN-EMS-2024-002 > Sede Central (Sitio 0) > Procesos Operativos`
  - Click on intermediate breadcrumb segment (`CyberCloud Solutions S.L.`) and verify immediate backtracking to the organization detail view.
  - Verify text ellipsis truncation (`...`) on names longer than 24 characters, with tooltip displaying full text.
  - Click top header links (`Auditorías`, `Certificación`, `Extra`) and verify that the breadcrumb trail is immediately reset to the root of the targeted domain.

### 2.4 Row Level Security (RLS) & Access Isolation
- **Role Verification Scenarios:**
  - **`ADMIN`:** Full read/write access across all domains, catalogs, approvals panel, and database status view.
  - **`WORKER`:** Full operational read/write across organizations, certificates, and audits; read-only access to user management.
  - **`AUDITOR`:** Read access to assigned certificates and organizations; write access strictly restricted to audit findings, checklists, and recommendations for assigned audits.
  - **`CLIENT`:** Read-only access strictly restricted to the certificates, sites, processes, and audit results belonging to their own organization.
  - **`PENDING` / `REJECTED`:** Complete denial of operational access. Workspace renders a clean informational screen stating account status with role icon suppressed and status icon (`⏳` or `❌`) displayed.

### 2.5 Automated Testing Suite Expansion (`node:test`)
The pure business logic modules are decoupled and verified via automated test suites:

- **`src/lib/activeCertificates.test.ts`:**
  - Validates active certificate counting logic: verifies that statuses `En Espera`, `Cancelado`, and `Inactivo` are excluded from organization summaries.
- **`src/lib/multisiteSampling.test.ts`:**
  - Validates Site 0 principal site handling: verifies that `numero_sitio = 0` is excluded from the multisite branch count and rendered first in site listings.
- **`src/lib/nonApplicability.test.ts`:**
  - Validates requirement non-applicability validation: verifies that an empty or missing `justificacion` string fails validation.
- **`src/lib/competencyMatrix.test.ts`:**
  - Validates matching algorithms between auditor qualifications and standard/IAF sub-sector requirements.
- **`src/lib/recommendationEngine.test.ts`:**
  - Validates ISO/IEC 17021-1 issuance logic: confirms that an open `NC_MAYOR` blocks certification approval.
- **`src/lib/breadcrumb.test.ts`:**
  - Validates breadcrumb state transitions, truncation formatting, and top-nav reset triggers.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 6.1:** Forensic audit trail verified with `public.audit_log` triggers and `🕒 Historial de Cambios` modal testing.
- [ ] **Milestone 6.2:** Zero-UUID policy audit executed and verified across 100% of rendered views.
- [ ] **Milestone 6.3:** Breadcrumb navigation, truncation, and top-nav reset rules fully tested across view transitions.
- [ ] **Milestone 6.4:** RLS policies verified across all four user roles and unapproved account states.
- [ ] **Milestone 6.5:** Automated test suite expanded in `src/lib/` and executed via `node --test` with 100% passing tests.
- [ ] **Milestone 6.6:** Production build (`npm run build`) and TypeScript type-check (`tsc --noEmit`) verified with zero warnings or errors.
- [ ] **Milestone 6.7:** Technical documentation synchronized across `public/doc/architecture/` and `public/project_resume.md`.

---

## 4. Acceptance Criteria & Quality Gates

1. **Test Suite Execution:** All automated unit tests in `src/lib/*.test.ts` pass cleanly via `npm test` without flakes or skipped assertions.
2. **Type Safety:** `tsc --noEmit` compiles cleanly with strict type-checking and zero `any` evasions.
3. **Build Output:** `npm run build` produces optimized, production-ready static bundles in `dist/`.
4. **Zero Layout Regressions:** Viewports from 375px (mobile) to 1920px (desktop) render responsive layouts without horizontal scrollbars.
5. **Compliance Alignment:** The complete operational workflow strictly reflects the mandates of ISO/IEC 17021-1:2015 and ISO 19011:2018.
