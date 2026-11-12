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
Adheres to the Standardized 4-Zone Detail Page Architecture:
- **Header:** Organization Legal Name, Tax ID (RIF), Active Status Token, and top-right `🕒 Historial de Cambios` button.
- **Zone 1: Parent Data Section (Upper Zone):** Displays parent corporate group / holding association (if applicable) and primary economic sector.
- **Zone 2: Visual Separator:** Crisp horizontal divider.
- **Zone 3: Direct Record Attributes (Multi-Column View/Edit):**
  - Read-Only Mode: Full legal name, fiscal address, primary contact name, email, phone number, and tax registration date.
  - Edit Mode: Form inputs for company details with tax ID format validation.
- **Zone 4: Multipage / Child Tabs Section (Lower Zone):**
  - **Tab 1: Certificados (`public.certificado`):**
    - High-density list of all certificates issued to or requested by this organization.
    - Human-readable columns: Certificate Code, Standard (`codigo`), Issue Date, Expiration Date, Multisite Count, and Status Badge.
    - Clicking any certificate row seamlessly triggers drill-down navigation and updates the breadcrumb trail (`Organizaciones > CyberCloud Solutions S.L. > FN-EMS-2024-002`).

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

#### B. Certificate Detail Page (Comprehensive 4-Zone Architecture)
The certificate detail page serves as the canonical reference implementation of the Standardized Detail Page Architecture:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a la Lista de Certificados                    [🕒 Historial de Cambios (14)]  │
│                                                                                        │
│ 📜 CERTIFICADO: FN-QMS-2024-001                                      [Badge: ACTIVO]   │
│ Certificación de Sistemas de Gestión de la Calidad (ISO 9001:2015)                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 1: PARENT DATA SECTION (UPPER ZONE - MULTI-COLUMN RELATIONAL METADATA)            │
│ ┌───────────────────────────────┬───────────────────────────────┬────────────────────┐ │
│ │ Organización Titular:         │ Norma Aplicable:              │ Sector IAF:        │ │
│ │ 🏢 [Iberometal Componentes S.A.]│ 📘 [ISO 9001:2015]           │ 🏭 [Sector 17]     │ │
│ │ (Click abre detalle de Org)   │ (Click abre detalle de Norma) │ (Click abre Sector)│ │
│ ├───────────────────────────────┼───────────────────────────────┼────────────────────┤ │
│ │ Estatus del Certificado:      │ Organismo Acreditador:        │ Sub-Sector IAF:    │ │
│ │ 🏷️ [Activo]                  │ 🏛️ [ENAC (01/C-SC001)]        │ ⚙️ [17.1 Metales]   │ │
│ └───────────────────────────────┴───────────────────────────────┴────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ──────────────────────── VISUAL SEPARATOR (CLEAN MINIMAL RULE) ─────────────────────── │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: DIRECT RECORD ATTRIBUTES SECTION (MULTI-COLUMN VIEW / EDIT STATE)              │
│ [ Modo: Visualización | ✏️ Editar Atributos ]                                          │
│                                                                                        │
│ ┌──────────────────────────────┬──────────────────────────────┬──────────────────────┐ │
│ │ Número de Certificado:       │ Fecha de Emisión:            │ Fecha de Vencimiento:│ │
│ │ FN-QMS-2024-001 (Textbox)    │ 2024-03-15 (Datepicker)      │ 2027-03-14           │ │
│ ├──────────────────────────────┼──────────────────────────────┼──────────────────────┤ │
│ │ Esquema Multisitio:          │ Sedes Sucursales:            │ Turnos Totales:      │ │
│ │ Sí (Checkbox / Switch)       │ 2 sedes (Sitio 0 excluido)   │ 3 turnos rotativos   │ │
│ ├──────────────────────────────┴──────────────────────────────┴──────────────────────┤ │
│ │ Alcance de la Certificación (10 a 1000 caracteres):                                │ │
│ │ [ Textarea Multilínea con Contador Dinámico de Caracteres: (184 / 1000) ]           │ │
│ │ "Diseño, manufactura, estampado, fundición y comercialización de piezas metálicas y │ │
│ │ componentes troquelados para la industria automotriz y de línea blanca nacional."  │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE - RELATIONAL CHILD TABLES)          │
│ [ 🏢 Sitios (3) ] [ ⚙️ Procesos (4) ] [ ⏱️ Turnos (2) ] [ 🚫 No Aplicables (1) ] [ 📋 Auditorías (2) ]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

##### Zone 1: Parent Data Section (Upper Zone)
- Displays direct foreign-key parent relationships:
  - `id_organizacion` -> Rendered as friendly linked name `🏢 Iberometal Componentes S.A.`.
  - `id_norma` -> Rendered as friendly linked name `📘 ISO 9001:2015`.
  - `id_estatus` -> Rendered as friendly linked badge `🏷️ Activo`.
  - `id_sector_iaf` -> Rendered as friendly linked name `🏭 Sector 17 - Metales`.
  - `id_subsector_iaf` -> Rendered as friendly linked name `⚙️ 17.1 Metales Básicos`.
- **Breadcrumb Activation:** Clicking any parent link activates the breadcrumb bar and navigates directly to that parent entity's detail view without page reload.

##### Zone 2: Visual Separator
- Minimal, elegant horizontal dividing rule separating parent metadata from direct attributes.

##### Zone 3: Direct Record Attributes (Multi-Column View/Edit Mode)
- **Direct Attributes Displayed:**
  - `numero_certificado` (VARCHAR 50).
  - `multisitio` (Boolean).
  - `fecha_emision` & `fecha_vencimiento` (Dates).
  - **`alcance` (VARCHAR 1000, 10 to 1000 characters):**
    - **Read-Only Mode:** Renders as a structured narrative text block with subtle typographic styling, quotation marks, and character count footnote.
    - **Edit Mode:** Renders as an expanding `<textarea>` equipped with a real-time character counter (`[184 / 1000]`), min-length warning if `< 10` chars, and max-length blocking at `1000` chars.

##### Zone 4: Multipage / Child Tabs Section (Lower Zone)
Organizes the five relational child entities into dedicated tabs with high-density, clickable list rows:

1. **Tab 1: Sitios (`public.sitio`)**
   - **Site 0 Principal Site Placement:** Headquarters (`numero_sitio = 0`) is **always positioned first** with a prominent visual badge (`★ Sede Principal / Central`).
   - Subsequent branch sites (`numero_sitio >= 1`) are listed below with their site number, name, address, personnel count, and operational activities.
   - Clickable rows navigate to the `Sitio` detail page (which itself follows the 4-zone pattern, displaying Parent Certificate and Organization in Zone 1, direct site attributes in Zone 2, and child work shifts in Zone 3).

2. **Tab 2: Procesos (`public.proceso`)**
   - Operational and management processes defined within the certified scope.
   - **Process Categorization (`tipo`):** Every process row prominently displays its mandatory `tipo` tag:
     - `Estratégico` (Strategic / Governance badge - e.g., *Dirección y Planificación Estratégica*, *Auditoría Interna*).
     - `Medular` (Core / Operational badge - e.g., *Troquelado y Fundición*, *Mecanizado CNC*, *Ensamble Final*).
     - `De Apoyo` (Support badge - e.g., *Mantenimiento Electromecánico*, *Gestión de Compras*, *TI*).
     - `Otro` (Other / Transversal badge).
   - In edit mode, `tipo` is modified via a clean `<select>` containing the 4 canonical options.
   - Child process rows expand to display the specific ISO clause requirements (`requisito`) mapped to each process.

3. **Tab 3: Turnos (`public.turno`)**
   - Operational shifts, working hours, active employee counts, and shift descriptions per site.

4. **Tab 4: No Aplicables (`public.requisitos_no_aplicables_certificado`)**
   - Excluded normative clauses per ISO 9001 clause 4.3.
   - **Mandatory Justification Text:** Displays requirement code, title, and the required `justificacion` text explaining why the organization cannot apply this clause to its operations.

5. **Tab 5: Auditorías (`public.auditoria`)**
   - Chronological history and scheduled future audits linked to this certificate.
   - Columns: Audit Code, Modality (`tipo_auditoria`), Execution Method (`metodologia`), Dates, Lead Auditor, and Outcome Status.

---

### 2.3 Auditor Directory & Competency Matrix (`src/views/auditorView.ts`)

#### A. List & Grid Views
- Adheres to the Repeatable View Architecture Pattern with standard list and card grid modes.
- Displays full name, professional title, qualification status, accredited standards, and covered IAF sectors/sub-sectors.

#### B. Auditor Detail Page (4-Zone Architecture)
- **Header:** Full Name, Auditor Code, Qualification Badge, and top-right `🕒 Historial de Cambios` button.
- **Zone 1: Parent Data Section:** Primary accreditation body or certifying institute registration.
- **Zone 2: Visual Separator:** Clean dividing rule.
- **Zone 3: Direct Record Attributes (View/Edit):** Contact coordinates, registration dates, active status, CV summary.
- **Zone 4: Multipage Child Tabs:**
  - **Tab 1: Matriz de Competencias Normativas y de Sector (`competencia_auditor`):** Standards (ISO 9001, 14001, etc.), IAF sectors and sub-sectors (17.1, 28.1), qualified role (`Auditor Líder`, `Especialista`), and credential validity.
  - **Tab 2: Historial de Auditorías Realizadas:** Past and scheduled audits with client organization links and dates.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 4.1:** `Organización` list view updated with active certificate calculation (excluding `En Espera`, `Cancelado`, `Inactivo`) and 4-zone detail view with `Certificados` tab.
- [ ] **Milestone 4.2:** `Certificado` list view updated (strictly excluding `"Cobertura Normativa"` column and excluding Site 0 from multisite count).
- [ ] **Milestone 4.3:** `Certificado` detail view implemented following the canonical 4-Zone blueprint:
  - Zone 1: Parent Data with friendly links to Organization, Standard, Status, and IAF Sector.
  - Zone 2: Visual separator.
  - Zone 3: Direct attributes including `alcance` textarea with real-time character counter (10 to 1000 chars) and read/edit states.
  - Zone 4: Five specialized child tabs: `Sitios` (Site 0 first), `Procesos` (with `tipo` classification), `Turnos`, `No Aplicables` (with justification text), and `Auditorías`.
- [ ] **Milestone 4.4:** `Proceso` management updated with mandatory `tipo` field (`Estratégico`, `Medular`, `De Apoyo`, `Otro`) across all views and modals.
- [ ] **Milestone 4.5:** `Auditor` directory and 4-zone detail view implemented with the ISO standard and IAF sub-sector competency matrix.
- [ ] **Milestone 4.6:** Complete breadcrumb drill-down integration: navigating from Organization -> Certificate -> Site/Process/Audit correctly appends and truncates segments.
- [ ] **Milestone 4.7:** Unit tests created in `src/lib/` validating `proceso.tipo` options, `certificado.alcance` character length (10-1000), active certificate counting, and multisite calculation.

---

## 4. Acceptance Criteria & Quality Gates

1. **Active Certificate Count Accuracy:** Any certificate with status `En Espera`, `Cancelado`, or `Inactivo` is strictly excluded from an organization's active count.
2. **Process Classification Enforcement:** Every rendered process displays its valid `tipo` (`Estratégico`, `Medular`, `De Apoyo`, `Otro`). Edit mode permits selection exclusively from these 4 canonical options.
3. **Certificate Scope Length Gate:** The `alcance` field enforces a minimum length of 10 characters and a maximum of 1000 characters with live visual counter feedback.
4. **4-Zone Detail Page Consistency:** All entity detail pages (`Organización`, `Certificado`, `Sitio`, `Auditor`) strictly implement the 4 vertical zones: Parent Data -> Visual Separator -> Direct Attributes (View/Edit) -> Multipage Child Tabs.
5. **Principal Site Determinism:** In the `Sitios` tab, the site with `numero_sitio = 0` is consistently rendered at the top of the table/grid with a prominent primary badge.
6. **Non-Applicability Justification:** Every excluded requirement rendered in the `No Aplicables` tab includes non-empty audit justification text.
7. **Clean Certificate Layout:** The main certificate list view displays no "Cobertura Normativa" column, maximizing column width for operational fields.
8. **Zero UUID Exposure:** All parent organizations, standards, and auditor references render human-readable names with interactive links.

---

## 4. Acceptance Criteria & Quality Gates

1. **Active Certificate Count Accuracy:** Any certificate with status `En Espera`, `Cancelado`, or `Inactivo` is strictly excluded from an organization's active count.
2. **Principal Site Determinism:** In the `Sitios` tab, the site with `numero_sitio = 0` is consistently rendered at the top of the table/grid with a prominent primary badge.
3. **Non-Applicability Justification:** Every excluded requirement rendered in the `No Aplicables` tab includes non-empty audit justification text.
4. **Clean Certificate Layout:** The main certificate list view displays no "Cobertura Normativa" column, maximizing column width for operational fields.
5. **Zero UUID Exposure:** All parent organizations, standards, and auditor references render human-readable names with interactive links.
