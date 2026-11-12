```markdown
# Phase 4.1: Domain "Certificación" — Organización Management & Active Certificate Metrics

## 1. Executive Summary & Sub-Phase Scope

Phase 4.1 implements the first operational module under the **"Certificación"** domain (Block 2 in the global navigation): **`Organización` Management** (`src/views/organizacionView.ts`). In accordance with **ISO/IEC 17021-1:2015**, this sub-phase establishes client enterprise directories, tax identification tracking, active certificate aggregation rules, and standardized detail pages with child certificate tables.

All views strictly conform to the Universal List/Grid View Template, the Standardized 4-Zone Detail Page Architecture, persistent drill-down breadcrumb tracking, and the Zero-UUID Exposure Mandate established in Phase 2.

---

## 2. Architectural Blueprints & Entity Views

### 2.1 Organización Management (`src/views/organizacionView.ts`)

#### A. List / Directory View (Universal Template)
- **Header & Controls:** Semantic title (`Organizaciones`), contextual subtitle, real-time multi-criteria search input (`/` shortcut to focus, `Esc` to clear), and layout toggle (`⊞ Grid | ☰ List`) persisted in `localStorage`.
- **Sidebar Facets:** Quick single-click filtering by active certificate presence and primary economic/IAF sector.
- **Columns & Data Cards:**
  - **Organización:** Legal entity name (e.g., *CyberCloud Solutions S.L.*, *Iberometal Componentes S.A.*).
  - **RIF / NIF:** Tax identification number (e.g., `J-40192831-2`).
  - **Contacto Principal:** Primary contact person, email, and phone.
  - **Certificados Activos (Conteo):** Total count of active certificates held by the organization.
    - **Calculation Rule:** The active certificate count strictly **excludes** certificates whose status is `En Espera`, `Cancelado`, or `Inactivo`. Only certificates in operational statuses such as `Activo` or `Estudio` are included.
  - **Acciones:** Quick links to view organization detail or create a new certificate.
- **Interactive Navigation:** Clicking any organization row or card pushes the organization name to the persistent breadcrumb trail (with 24-character ellipsis truncation and full-name tooltips) and transitions to the Detail View.

#### B. Organization Detail Page & Child Tabs (4-Zone Architecture)
Adheres to the Standardized 4-Zone Detail Page Architecture:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a Organizaciones                              [🕒 Historial de Cambios]       │
│                                                                                        │
│ 🏢 ORGANIZACIÓN: CyberCloud Solutions S.L.                             [Badge: ACTIVO] │
│ RIF: J-40192831-2 · Sector Principal: 33 - Tecnología de la Información                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 1: PARENT DATA SECTION (UPPER ZONE - RELATIONAL METADATA)                         │
│ ┌───────────────────────────────────────────┬────────────────────────────────────────┐ │
│ │ Grupo Corporativo / Holding:              │ Sector Económico Principal:            │ │
│ │ Independiente                             │ 💻 [Sector 33 - TI] (Click abre Sector)│ │
│ └───────────────────────────────────────────┴────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ──────────────────────── VISUAL SEPARATOR (CLEAN MINIMAL RULE) ─────────────────────── │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: DIRECT RECORD ATTRIBUTES SECTION (MULTI-COLUMN VIEW / EDIT STATE)              │
│ [ Modo: Visualización | ✏️ Editar Atributos ]                                          │
│                                                                                        │
│ ┌──────────────────────────────┬──────────────────────────────┬──────────────────────┐ │
│ │ Razón Social:                │ RIF / NIF:                   │ Sitio Web:           │ │
│ │ CyberCloud Solutions S.L.    │ J-40192831-2                 │ www.cybercloud.es    │ │
│ ├──────────────────────────────┼──────────────────────────────┼──────────────────────┤ │
│ │ Contacto Principal:          │ Correo Electrónico:          │ Teléfono:            │ │
│ │ Ing. Elena Martínez          │ emartinez@cybercloud.es      │ +34 912 345 678      │ │
│ ├──────────────────────────────┴──────────────────────────────┴──────────────────────┤ │
│ │ Dirección Fiscal Sede Principal:                                                     │ │
│ │ Parque Empresarial Cristalia, Edificio 4B, Madrid                                    │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE)                                    │
│ [ 📜 Certificados (2) ]                                                                │
│                                                                                        │
│ ┌─────────────────┬───────────────┬───────────────┬───────────────┬──────────────────┐ │
│ │ Código          │ Norma         │ Vigencia      │ Sedes Multi.  │ Estatus          │ │
│ ├─────────────────┼───────────────┼───────────────┼───────────────┼──────────────────┤ │
│ │ FN-EMS-2024-002 │ ISO 14001:15  │ 2024 - 2027   │ 2 sedes       │ [Activo]         │ │
│ │ FN-ISMS-2024-09 │ ISO 27001:22  │ 2024 - 2027   │ 0 sedes       │ [Estudio]        │ │
│ └─────────────────┴───────────────┴───────────────┴───────────────┴──────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘

```

1. **Header & Forensic Audit Trail Action:**
* Displays Organization Legal Name, Tax ID (`RIF / NIF`), status badge, back navigation button, and top-right `🕒 Historial de Cambios` button querying `public.audit_log` for `organizacion` mutations (`old_data` vs. `new_data` diffs).

2. **Zone 1: Parent Data Section (Upper Zone):**
* Displays parent corporate group/holding metadata (if applicable) and primary economic sector with human-readable clickable links.

3. **Zone 2: Visual Separator:**
* Clean minimal dividing rule separating parent metadata from direct attributes.

4. **Zone 3: Direct Record Attributes (Multi-Column View/Edit Mode):**
* **Read-Only Mode:** Full legal name, tax ID, registered headquarters address, primary contact name, email, phone number, and website.
* **Edit Mode:** Inline/modal form inputs for authorized roles (`ADMIN`, `WORKER`) with tax ID format validation.

5. **Zone 4: Multipage / Child Tabs Section (Lower Zone):**
* **Tab 1: Certificados (`public.certificado`):**
* High-density list of all certificates issued to or requested by this organization.
* Human-readable columns: Certificate Code, Standard (`codigo`), Issue Date, Expiration Date, Multisite Count, and Status Badge.
* Clicking any certificate row navigates directly to the certificate detail page and appends the certificate code to the persistent breadcrumb trail (`Organizaciones > CyberCloud Solutions S.L. > FN-EMS-2024-002`).

---

## 3. Pure Business Logic & Unit Testing (`src/lib/activeCertificates.ts`)

* Decouple the active certificate calculation logic into a pure helper module (`src/lib/activeCertificates.ts`) so it can be shared across list cards, table rows, and summary KPIs.
* Create unit tests in `src/lib/activeCertificates.test.ts` executed via `node:test` (`npx tsx --test src/lib/activeCertificates.test.ts`) verifying that:
* Certificates with status `Activo` or `Estudio` are included in the active count.
* Certificates with status `En Espera`, `Cancelado`, or `Inactivo` are strictly excluded from the active count.

---

## 4. Key Implementation Milestones

* [ ] **Milestone 4.1.1:** Pure helper function for active certificate counting implemented and verified with unit tests in `src/lib/activeCertificates.test.ts`.
* [ ] **Milestone 4.1.2:** `Organización` list and grid views implemented in `src/views/organizacionView.ts` with real-time search, sidebar facets, Excel-style sorting, and active certificate counts.
* [ ] **Milestone 4.1.3:** `Organización` 4-zone detail page implemented with read/edit attribute states and `🕒 Historial de Cambios` modal integration.
* [ ] **Milestone 4.1.4:** `Certificados` child tab implemented with clickable human-readable links pushing certificate segments onto the breadcrumb trail.

---

## 5. Acceptance Criteria & Quality Gates

1. **Active Certificate Count Accuracy:** Any certificate with status `En Espera`, `Cancelado`, or `Inactivo` is strictly excluded from an organization's active count across list rows, grid cards, and KPIs.
2. **4-Zone Detail Page Compliance:** The organization detail view strictly renders the 4 vertical zones (Parent Data -> Visual Separator -> Direct Attributes -> Child Tabs).
3. **Breadcrumb Integration:** Navigating from the `Organización` list to an organization detail page, and subsequently clicking a child certificate, updates the breadcrumb trail (`Organizaciones > [Nombre] > [Código Certificado]`) with proper ellipsis truncation.
4. **Traceability:** Editing organization attributes triggers an immutable `public.audit_log` entry visible in the `🕒 Historial de Cambios` modal.
5. **Zero UUID Exposure:** Zero raw UUIDs are rendered anywhere in the organization list, grid cards, detail attributes, or child certificate table.

```

```