```markdown
# Phase 4.3: Domain "Certificación" — Auditor Directory & Competency Matrix

## 1. Executive Summary & Sub-Phase Scope

Phase 4.3 implements the final operational module under the **"Certificación"** domain (Block 2 in the global navigation): **`Auditor` Directory & Competency Matrix** (`src/views/auditorView.ts`). Operating under **ISO/IEC 17021-1:2015** (clause 7.2 on competence of personnel and audit teams), this sub-phase establishes auditor credentialing, qualification tracking, and normative/technical scoping across ISO standards and IAF economic sectors/sub-sectors.

All views strictly adhere to the Universal List/Grid View Template, the Standardized 4-Zone Detail Page Architecture, persistent drill-down breadcrumb tracking, and the Zero-UUID Exposure Mandate established in Phase 2.

---

## 2. Architectural Blueprints & Entity Views

### 2.1 Auditor Directory & Competency Matrix Management (`src/views/auditorView.ts`)

#### A. List / Directory View (Universal Template)
- **Header & Controls:** Semantic title (`Auditores`), contextual subtitle, real-time debounced search (`/` shortcut to focus, `Esc` to clear), and presentation switcher (`⊞ Grid | ☰ List`) persisted in `localStorage`.
- **Sidebar Facets:** Fast single-click filters for auditor qualification status (`Calificado`, `En Entrenamiento`, `Observador`), accredited management system standards, and IAF technical sectors.
- **Columns & Data Cards:**
  - **Auditor:** Full name and professional title (e.g., *Ing. Roberto Silva*, *Dra. Ana Belén Torres*).
  - **Email & Teléfono:** Contact coordinates.
  - **Calificación:** Qualification status badge.
  - **Normas Acreditadas:** List of management system standards the auditor is certified to evaluate (e.g., `ISO 9001`, `ISO 14001`).
  - **Sectores IAF Calificados:** Count of IAF technical sectors and sub-sectors covered.
- **Interactive Navigation:** Clicking any auditor row or card pushes the auditor's name to the persistent breadcrumb trail (with 24-character ellipsis truncation and full-name tooltips) and transitions to the Detail View.

#### B. Auditor Detail Page & Competency Matrix (4-Zone Architecture)
Adheres to the Standardized 4-Zone Detail Page Architecture:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a Auditores                                   [🕒 Historial de Cambios]       │
│                                                                                        │
│ 📋 AUDITOR: Ing. Roberto Silva                                       [Badge: CALIFICADO]│
│ Auditor Líder Senior — Sistemas de Gestión de la Calidad y Ambiental                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 1: PARENT DATA SECTION (UPPER ZONE - RELATIONAL METADATA)                         │
│ ┌───────────────────────────────────────────┬────────────────────────────────────────┐ │
│ │ Instituto Certificador / Registro:        │ Categoría Profesional Principal:       │ │
│ │ Entidad Nacional de Acreditación (ENAC)   │ Auditor Líder / Evaluador Jefe         │ │
│ └───────────────────────────────────────────┴────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ──────────────────────── VISUAL SEPARATOR (CLEAN MINIMAL RULE) ─────────────────────── │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: DIRECT RECORD ATTRIBUTES SECTION (VIEW / EDIT STATE)                           │
│ • Código de Credencial: AUD-REG-2022-88                                                │
│ • Contacto: rsilva@programa-aud.com | +34 600 123 456                                  │
│ • Biografía / Resumen Profesional:                                                     │
│   "Ingeniero Industrial con más de 15 años de experiencia en auditorías de terceras    │
│   partes bajo ISO 9001, ISO 14001 y sectores metalmecánicos complejos."                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE)                                    │
│ [ 🛡️ Matriz de Competencias (4) ] [ 📋 Historial de Auditorías (12) ]                  │
│                                                                                        │
│ TAB 1: MATRIZ DE COMPETENCIAS (public.competencia_auditor)                             │
│ ┌─────────────────┬───────────────┬───────────────────┬────────────────┬─────────────┐ │
│ │ Norma           │ Sector IAF    │ Sub-Sector        │ Rol Calificado │ Vencimiento │ │
│ ├─────────────────┼───────────────┼───────────────────┼────────────────┼─────────────┤ │
│ │ ISO 9001:2015   │ Sector 17     │ 17.1 Metales Bás. │ Auditor Líder  │ 2027-12-31  │ │
│ │ ISO 14001:2015  │ Sector 29     │ 29.0 Eléctrico    │ Auditor Equipo │ 2026-06-30  │ │
│ └─────────────────┴───────────────┴───────────────────┴────────────────┴─────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘

```

1. **Header & Forensic Audit Trail Action:**
* Displays Auditor Full Name, professional title, qualification badge, back navigation button, and top-right `🕒 Historial de Cambios` button querying `public.audit_log` for `auditor` and `competencia_auditor` mutations.

2. **Zone 1: Parent Data Section (Upper Zone):**
* Displays parent accreditation body or certifying institute registration and professional category with human-readable links.

3. **Zone 2: Visual Separator:**
* Clean minimal dividing rule separating parent metadata from direct attributes.

4. **Zone 3: Direct Record Attributes (Multi-Column View/Edit Mode):**
* **Read-Only Mode:** Personal details, auditor credential code, email, phone, and professional summary biography.
* **Edit Mode:** Inline/modal form inputs for authorized administrators (`ADMIN`) to update qualifications and contact info.

5. **Zone 4: Multipage / Child Tabs Section (Lower Zone):**
* **Tab 1: Matriz de Competencias Normativas y de Sector (`public.competencia_auditor`):**
* Interactive matrix interface linking the auditor to specific ISO standards (`Norma`), IAF economic sectors (`Sector IAF`), specific technical sub-sectors (e.g., `17.1`), qualified audit roles (`Auditor Líder`, `Especialista`, `Experto Técnico`), and credential validity dates.
* Includes modal tools for administrators to assign new standard/sub-sector qualifications following ISO 17021-1 evaluation protocols.
* **Tab 2: Historial de Auditorías Realizadas (`public.auditoria`):**
* Record of past and active evaluations led or participated in by the auditor, displaying client organization names, certificate codes, audit modalities, and execution dates.

---

## 3. Pure Business Logic & Unit Testing (`src/lib/competencyMatrix.ts`)

* Decouple the competency matching algorithms into a pure helper module (`src/lib/competencyMatrix.ts`).
* Create unit tests in `src/lib/competencyMatrix.test.ts` executed via `node:test` (`npx tsx --test src/lib/competencyMatrix.test.ts`) verifying that:
* Auditor qualifications correctly evaluate matches against primary IAF sectors and specific `subsector_iaf` classifications (e.g., `17.1`).
* Credential expiration checks accurately flag expired auditor scopes.

---

## 4. Key Implementation Milestones

* [x] **Milestone 4.3.1:** Pure helper functions for competency matching and scope validation implemented and verified with unit tests in `src/lib/competencyMatrix.test.ts`.
* [x] **Milestone 4.3.2:** `Auditor` directory list and grid views implemented in `src/views/auditorView.ts` with real-time search, qualification status facets, and accredited scheme counts.
* [x] **Milestone 4.3.3:** `Auditor` 4-zone detail view implemented with read/edit attribute states and `🕒 Historial de Cambios` modal integration.
* [x] **Milestone 4.3.4:** Child tabs (`Matriz de Competencias` with standard/sub-sector linkages and `Historial de Auditorías`) fully integrated with zero raw UUID exposure.

---

## 5. Acceptance Criteria & Quality Gates

1. **Competency Matrix Accuracy:** The competency table accurately displays normative standards, IAF sectors, sub-sector codes (e.g., `17.1`), and qualified audit roles for each auditor.
2. **4-Zone Detail Page Compliance:** The auditor detail view strictly renders the 4 vertical zones (Parent Data -> Visual Separator -> Direct Attributes -> Child Tabs).
3. **Breadcrumb Integration:** Navigating from the `Auditores` directory to an auditor detail page updates the breadcrumb trail (`Auditores > [Nombre Auditor]`) with proper ellipsis truncation.
4. **Audit Traceability:** Updating auditor qualifications or profile attributes triggers an immutable `public.audit_log` entry visible in the `🕒 Historial de Cambios` modal.
5. **Zero UUID Exposure:** Zero raw UUIDs are exposed across auditor directories, parent metadata, competency matrices, or audit history tables.

```

```