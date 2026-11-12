# Phase 4: Domain "Certificación" (Organizations, Certificates & Auditor Competencies)

## 1. Executive Summary & Phase Scope

Phase 4 implements the core certification engine under the **"Certificación"** domain (Block 2 in the global navigation). In accordance with **ISO/IEC 17021-1:2015**, this domain manages the primary operational entities of the certification body:
1. **`Organización`** (Client enterprises, tax identification, and active management system certificates).
2. **`Certificado`** (Conformity certificates, multisite structures, operational processes, work shifts, and justified non-applicable clauses).
3. **`Auditor`** (Auditor register and competency matrix across standards and IAF sectors/sub-sectors).

All views follow the Universal List/Grid View Template and Standardized Detail Page Architecture, with drill-down tracking in the persistent breadcrumb bar and zero exposure of raw UUIDs.

---

## 2. Architectural Blueprints & Entity Views

### 2.1 Organización Management (`src/views/organizacionView.ts`)

#### A. List / Directory View
- **Columns & Data Cards:**
  - **Organización:** Legal entity name (e.g., *CyberCloud Solutions S.L.*, *Iberometal Componentes S.A.*).
  - **RIF / NIF:** Tax identification number (e.g., `J-40192831-2`).
  - **Contacto Principal:** Primary contact person, email, and phone.
  - **Certificados Activos (Conteo):** Total count of active certificates held by the organization.
    - **Calculation Rule:** The active certificate count strictly **excludes** certificates whose status is `En Espera`, `Cancelado`, or `Inactivo`. Only certificates in operational statuses such as `Activo` or `Estudio` are included.
  - **Acciones:** Quick links to view organization detail or create a new certificate.
- **Filtering & Search:** Real-time multi-criteria search bar (Name, RIF, Contact); sidebar filtering by active certificate presence and sector.

#### B. Organization Detail Page & Child Tabs
- **Upper Attributes Card:** Full legal name, tax ID, registered headquarters address, primary contact info, and website.
- **Changelog Button (`🕒 Historial de Cambios`):** Displays mutations recorded in `public.audit_log` for this organization.
- **Tab 1: Certificados (`public.certificado`)**
  - High-density list of all certificates issued to or requested by this organization.
  - Human-readable columns: Certificate Code, Standard (`codigo`), Issue Date, Expiration Date, Multisite Count, and Status Badge.
  - Clicking any certificate navigates directly to the certificate detail page and appends the certificate code to the breadcrumb trail (`Organizaciones > CyberCloud Solutions S.L. > FN-EMS-2024-002`).

---

### 2.2 Certificado Management (`src/views/certificadoView.ts`)

#### A. List / Directory View (Clean Layout)
In accordance with user directives, the certificate list layout is decluttered:
- **Strict Exclusion:** The `"Cobertura Normativa"` column is **excluded** from the main certificate list view to eliminate visual clutter.
- **Standardized Columns:**
  - **Organización:** Human-readable client company name (clickable link).
  - **Código de Certificado:** Unique certification identifier (e.g., `FN-QMS-2024-001`, `FN-EMS-2024-002`).
  - **Norma:** Standard code (e.g., `ISO 9001:2015`, `ISO 14001:2015`).
  - **Sedes Multisitio (Conteo):** Count of branch sites covered under the certificate.
    - **Principal Site Exclusion Rule:** Site 0 (`numero_sitio = 0`) is the principal site and is excluded from this multisite count. A certificate with Site 0 and 2 branch sites displays `2 sedes multisitio`.
  - **Estatus:** Canonical status badge (`Activo`, `Estudio`, `Suspendido`, `Cancelado`).
  - **Vigencia:** Validity period (Issue Date to Expiration Date).

#### B. Certificate Detail Page & 5 Specialized Child Tabs
The certificate detail page features an upper attributes card (code, organization link, standard, scope statement, validity dates, status badge, and changelog button) and five specialized child tabs:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PESTAÑAS MULTI-PÁGINA DEL CERTIFICADO                                                  │
│ [ 🏢 Sitios (3) ] [ ⚙️ Procesos (6) ] [ ⏱️ Turnos (2) ] [ 🚫 No Aplicables (1) ] [ 📋 Auditorías (4) ]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Tab 1: Sitios (`public.sitio`)**
   - **Site 0 Principal Site Placement:** The principal headquarters (`numero_sitio = 0`) is **always displayed first** with a prominent visual badge (`★ Sede Central / Principal`).
   - Subsequent branch sites (`numero_sitio >= 1`) are listed below with their site number, name, physical address, personnel count, and operational activities.
2. **Tab 2: Procesos (`public.proceso`)**
   - Operational and management processes defined within the certified management system.
   - Child process detail expands to display the specific normative clauses (`requisito`) mapped to each process.
3. **Tab 3: Turnos (`public.turno`)**
   - Operational shifts, working hours, active employee counts, and shift descriptions per site.
4. **Tab 4: No Aplicables (`public.requisitos_no_aplicables_certificado`)**
   - Excluded normative clauses per ISO 9001 clause 4.3.
   - **Mandatory Justification Text:** Displays the requirement code, title, and the required `justificacion` text explaining why the organization cannot apply this clause to its operations.
5. **Tab 5: Auditorías (`public.auditoria`)**
   - Chronological history and scheduled future audits linked to this certificate.
   - Columns: Audit Code, Modality (`tipo_auditoria`), Execution Method (`metodologia`), Dates, Lead Auditor, and Outcome Status.

---

### 2.3 Auditor Directory & Competency Matrix (`src/views/auditorView.ts`)

#### A. List / Directory View
- **Columns & Data Cards:**
  - **Auditor:** Full name and professional title.
  - **Email & Teléfono:** Contact coordinates.
  - **Calificación:** Qualification status (`Calificado`, `En Entrenamiento`, `Observador`).
  - **Normas Acreditadas:** List of management system standards the auditor is certified to evaluate.
  - **Sectores IAF Calificados:** Count of IAF sectors and sub-sectors covered.

#### B. Auditor Detail Page & Competency Matrix
- **Upper Attributes:** Personal details, auditor code, accreditation registrations, and changelog button.
- **Tab 1: Matriz de Competencias Normativas y de Sector (`competencia_auditor`)**
  - Matrix interface linking the auditor to:
    - Normas evaluadas (e.g., ISO 9001, ISO 14001, ISO 45001).
    - Sectores IAF y Sub-Sectores calificados (e.g., Sector 17, Sub-Sector 17.1).
    - Rol de Auditor calificado (`Auditor Líder`, `Auditor Especialista`, `Experto Técnico`).
    - Fecha de Calificación y Vencimiento de Credencial.
- **Tab 2: Historial de Auditorías Realizadas**
  - List of past audits led or participated in, with client name, certificate code, and evaluation dates.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 4.1:** `Organización` list view updated with active certificate calculation (excluding `En Espera`, `Cancelado`, `Inactivo`) and detail view with `Certificados` tab.
- [ ] **Milestone 4.2:** `Certificado` list view updated (strictly excluding `"Cobertura Normativa"` column and excluding Site 0 from multisite count).
- [ ] **Milestone 4.3:** `Certificado` detail view implemented with the 5 specialized child tabs: `Sitios` (Site 0 first), `Procesos`, `Turnos`, `No Aplicables` (with justification text), and `Auditorías`.
- [ ] **Milestone 4.4:** `Auditor` directory and detail view implemented with the ISO standard and IAF sub-sector competency matrix.
- [ ] **Milestone 4.5:** Complete breadcrumb drill-down integration: navigating from Organization -> Certificate -> Site/Audit correctly appends and truncates segments.
- [ ] **Milestone 4.6:** Unit tests created in `src/lib/` validating the active certificate filter logic and multisite calculation.

---

## 4. Acceptance Criteria & Quality Gates

1. **Active Certificate Count Accuracy:** Any certificate with status `En Espera`, `Cancelado`, or `Inactivo` is strictly excluded from an organization's active count.
2. **Principal Site Determinism:** In the `Sitios` tab, the site with `numero_sitio = 0` is consistently rendered at the top of the table/grid with a prominent primary badge.
3. **Non-Applicability Justification:** Every excluded requirement rendered in the `No Aplicables` tab includes non-empty audit justification text.
4. **Clean Certificate Layout:** The main certificate list view displays no "Cobertura Normativa" column, maximizing column width for operational fields.
5. **Zero UUID Exposure:** All parent organizations, standards, and auditor references render human-readable names with interactive links.
