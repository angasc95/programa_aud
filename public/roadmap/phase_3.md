# Phase 3: Domain "Extra" (Standards, Accreditation & Reference Catalogs)

## 1. Executive Summary & Phase Scope

Phase 3 implements the foundational governance and catalog management interfaces under the **"Extra"** domain (Block 3 in the global navigation). These reference catalogs provide the normative taxonomy, accreditation structures, sector codes, and execution parameters governing all operational activities in `programa_aud` under **ISO/IEC 17021-1:2015**.

The domain consists of five core entities accessible from the top navigation dropdown:
1. **`Norma`** (Management system standards, accreditation relationships, and hierarchical clause trees).
2. **`Sector IAF`** (Economic and industrial technical sectors and sub-sectors).
3. **`Estatus`** (Operational statuses across entities).
4. **`Tipo`** (Audit modalities and stages).
5. **`Metodología`** (Audit execution formats).

Every catalog entity adheres to the Universal List/Grid View Template and Standardized Detail Page Architecture defined in Phase 2.

---

## 2. Architectural Blueprints & Entity Views

### 2.1 Norma Management (`src/views/normaView.ts`)

#### A. List / Directory View
- **Columns & Data Cards:**
  - **Código:** Canonical standard designation (e.g., `ISO 9001:2015`, `ISO 14001:2015`, `ISO 27001:2022`).
  - **Título:** Official standard title (e.g., `Sistemas de Gestión de la Calidad — Requisitos`).
  - **Estatus:** Current normative status badge (`Vigente`, `En Revisión`, `Obsoleta`).
  - **Acreditaciones:** Active accreditation bodies recognizing this standard (e.g., `ENAC`, `UKAS`).
  - **Total Cláusulas:** Count of registered requirements in the `ltree` hierarchy.
- **Filtering & Search:** Real-time search across code and title; sidebar facets for status and accreditation body.

#### B. Standard Detail Page & Child Tabs
Adheres to the Standardized Detail Page blueprint with two specialized multi-page child tabs:

1. **Tab 1: Acreditación (`acreditacion_norma_iaf`)**
   - Tabular display of accredited scopes for the standard:
     - Organismo de Acreditación (human-readable name, e.g., *Entidad Nacional de Acreditación - ENAC*).
     - Número de Acreditación (e.g., `01/C-SC001`).
     - Sectores y Sub-Sectores IAF amparados.
     - Período de Validez (Fecha Concesión y Fecha Vencimiento).
     - Estado de Acreditación (`Activa`, `En Renovación`, `Suspendida`).
   - Inline creation/edit modal for authorized administrators.

2. **Tab 2: Requisitos (`requisito`)**
   - Hierarchical interactive requirement tree powered by PostgreSQL `ltree`:
     - Cláusula / Código (e.g., `4`, `4.1`, `4.2`, `8.5.1`).
     - Título y Descripción del Requisito.
     - Nivel de Jerarquía y visual indenting.
     - Acciones de inspección y edición de cláusulas.

---

### 2.2 Sector IAF & Sub-Sectores (`src/views/sectorIafView.ts`)

#### A. List / Directory View
- **Columns & Data Cards:**
  - **Sector IAF:** Numeric sector code (e.g., `17`, `28`, `33`).
  - **Descripción:** Official IAF description (e.g., *Metales básicos y productos metálicos fabricados*).
  - **Sub-Sectores Registrados:** Count of technical sub-sectors defined under this sector.
  - **Auditores Calificados:** Count of qualified auditors in this technical sector.

#### B. Sector Detail Page & Child Tabs
- **Upper Attributes:** Sector number, official description, and technical classification notes.
- **Tab 1: Sub-Sector (`subsector_iaf`)**
  - High-density list of technical sub-sectors:
    - Código de Sub-Sector (e.g., `17.1`, `17.2`).
    - Descripción Técnica Detallada.
    - Categoría de Riesgo ISO (`ALTO`, `MEDIO`, `BAJO`).
    - Auditores Especialistas Asociados.

---

### 2.3 Estatus Catalog (`src/views/estatusView.ts`)

#### A. Canonical Entities
Presents the 8 standardized operational statuses:
1. `Activo` (Entity actively valid and operating).
2. `Estudio` (Application or documentation under technical review).
3. `Suspendido` (Temporarily suspended following non-compliances).
4. `Cancelado` (Formally revoked or cancelled).
5. `Planificado` (Scheduled for future audit execution).
6. `En Ejecución` (Audit actively taking place on site or remotely).
7. `En Espera` (Pending client submission or external response).
8. `Inactivo` (Archived or historically concluded).

#### B. Detail View & Usage Metrics
- Status code, description, visual color mapping tokens, and system-wide usage counts across certificates, organizations, and audit events.

---

### 2.4 Tipo de Auditoría Catalog (`src/views/tipoAuditoriaView.ts`)

#### A. Canonical Modalities
Presents the 9 standardized audit modalities aligned with ISO/IEC 17021-1 certification cycles:
1. `Etapa 1` (Documentary and readiness review).
2. `Etapa 2` (On-site implementation audit).
3. `Seguimiento 1` (First surveillance audit).
4. `Seguimiento 2` (Second surveillance audit).
5. `Renovación` (Recertification audit prior to triennial expiration).
6. `Diagnóstico` (Preliminary evaluation).
7. `Extraordinaria` (Short-notice audit due to major complaints or scope changes).
8. `Especial` (Extension or transfer audit).
9. `Otro` (Custom evaluation).

#### B. Detail View & Cycle Rules
- Modality title, lifecycle stage indicators, recommended audit duration formula, and standard reporting requirements.

---

### 2.5 Metodología de Auditoría Catalog (`src/views/metodologiaAuditoriaView.ts`)

#### A. Canonical Methods
Presents the 3 standardized execution methodologies:
1. `Presencial` (Audit team physically present at client facilities and sites).
2. `Remota` (Audit conducted entirely via Information and Communication Technology - ICT per IAF MD 4).
3. `Mixta` (Hybrid format combining on-site verification with remote documentary sampling).

#### B. Detail View & ICT Protocols
- Method title, ICT validation requirements, evidence sampling rules, and security/confidentiality protocols.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 3.1:** `Norma` list and detail views implemented with `Acreditación` and `Requisitos` (`ltree`) child tabs.
- [ ] **Milestone 3.2:** `Sector IAF` list and detail views implemented with `Sub-Sector` child tab and risk categories.
- [ ] **Milestone 3.3:** `Estatus` catalog view implemented displaying 8 canonical statuses with usage metrics.
- [ ] **Milestone 3.4:** `Tipo` catalog view implemented displaying 9 canonical audit cycle modalities.
- [ ] **Milestone 3.5:** `Metodología` catalog view implemented displaying 3 canonical execution methods.
- [ ] **Milestone 3.6:** History changelog modal (`🕒 Historial de Cambios`) fully integrated across all catalog detail pages.
- [ ] **Milestone 3.7:** Unit tests verified for catalog filtering, `ltree` requirement indentation, and sub-sector code formatting.

---

## 4. Acceptance Criteria & Quality Gates

1. **Child Tab Functionality:** Switching between `Acreditación` and `Requisitos` in the `Norma` detail view renders instantly without DOM flickering or full page reloads.
2. **Sub-Sector Scoping:** Sub-sectors (e.g., `17.1`, `17.2`) accurately link to their parent IAF sector with proper risk indicators.
3. **Traceability:** Updating catalog descriptions or accreditation validity writes corresponding records to `public.audit_log` visible via the detail changelog button.
4. **Zero UUID Exposure:** Every foreign relation (such as accreditation body or parent sector) is presented using human-readable names.
