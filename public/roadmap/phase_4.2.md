```markdown
# Phase 4.2: Domain "Certificación" — Certificado Management, Clean List Layout & 5 Child Tabs

## 1. Executive Summary & Sub-Phase Scope

Phase 4.2 implements the core certificate engine under the **"Certificación"** domain (Block 2 in the global navigation): **`Certificado` Management** (`src/views/certificadoView.ts`). Operating under **ISO/IEC 17021-1:2015** (clause 8.2.2) and ISO 9001:2015, this sub-phase establishes the decluttered certificate directory, multisite scoping rules, and the standardized detail page equipped with five specialized child relational tabs.

All components adhere strictly to the Universal List/Grid View Template, the Standardized 4-Zone Detail Page Architecture, persistent breadcrumb drill-down tracking, and the Zero-UUID Exposure Mandate.

---

## 2. Architectural Blueprints & Entity Views

### 2.1 Certificado Management (`src/views/certificadoView.ts`)

#### A. List / Directory View (Decluttered Clean Layout)
In accordance with platform requirements, the certificate list layout is optimized for high-density operational clarity:
- **Strict Exclusion Rule:** The `"Cobertura Normativa"` column is **strictly excluded** from the main certificate list view to eliminate visual clutter and maximize horizontal screen space.
- **Header & Controls:** Semantic title (`Certificados`), contextual subtitle, real-time debounced search (`/` shortcut to focus, `Esc` to clear), and presentation switcher (`⊞ Grid | ☰ List`).
- **Sidebar Facets:** Fast single-click filters for normative standards (e.g., ISO 9001, ISO 14001), operational statuses (`Activo`, `Estudio`, `Suspendido`, `Cancelado`), and IAF sectors.
- **Standardized Table Columns:**
  - **Organización:** Human-readable client company name rendered as a clickable link.
  - **Código de Certificado:** Unique certification identifier (e.g., `FN-QMS-2024-001`, `FN-EMS-2024-002`).
  - **Norma:** Standard code and edition year (e.g., `ISO 9001:2015`).
  - **Sedes Multisitio (Conteo):** Count of branch sites covered under the certificate.
    - **Principal Site Exclusion Rule:** Site 0 (`numero_sitio = 0`) represents the principal headquarters and is explicitly excluded from this multisite branch count. For example, a certificate covering Site 0 and 2 branch locations displays `2 sedes multisitio`.
  - **Estatus:** Canonical status badge (`Activo`, `Estudio`, `Suspendido`, `Cancelado`).
  - **Vigencia:** Formatted validity period (Issue Date to Expiration Date).

#### B. Certificate Detail Page & 5 Specialized Child Tabs (4-Zone Architecture)
The certificate detail page adheres strictly to the 4-zone layout blueprint, featuring parent metadata, visual separation, direct record attributes (including the 10-1000 character `alcance` textarea), and five specialized multi-page child tabs:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a Certificados                                [🕒 Historial de Cambios]       │
│                                                                                        │
│ 📜 CERTIFICADO: FN-QMS-2024-001                                      [Badge: ACTIVO]   │
│ Certificación de Sistemas de Gestión de la Calidad (ISO 9001:2015)                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 1: PARENT DATA SECTION (UPPER ZONE - RELATIONAL METADATA)                         │
│ ┌───────────────────────────────┬───────────────────────────────┬────────────────────┐ │
│ │ Organización Titular:         │ Norma Aplicable:              │ Sector IAF:        │ │
│ │ 🏢 [Iberometal Componentes S.A.]│ 📘 [ISO 9001:2015]           │ 🏭 [Sector 17]     │ │
│ ├───────────────────────────────┼───────────────────────────────┼────────────────────┤ │
│ │ Estatus del Certificado:      │ Organismo Acreditador:        │ Sub-Sector IAF:    │ │
│ │ 🏷️ [Activo]                  │ 🏛️ [ENAC (01/C-SC001)]        │ ⚙️ [17.1 Metales]   │ │
│ └───────────────────────────────┴───────────────────────────────┴────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ──────────────────────── VISUAL SEPARATOR (CLEAN MINIMAL RULE) ─────────────────────── │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: DIRECT RECORD ATTRIBUTES SECTION (VIEW / EDIT STATE)                           │
│ • Número de Certificado: FN-QMS-2024-001                                               │
│ • Fechas: Emisión 2024-03-15 | Vencimiento 2027-03-14                                  │
│ • Alcance de la Certificación (10 a 1000 caracteres):                                  │
│   [ Textarea con Contador Dinámico: (184 / 1000) ]                                     │
│   "Diseño, manufactura, estampado, fundición y comercialización de piezas metálicas..." │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 3: MULTIPAGE / CHILD TABS SECTION (LOWER ZONE)                                    │
│ [ 🏢 Sitios (3) ] [ ⚙️ Procesos (4) ] [ ⏱️ Turnos (2) ] [ 🚫 No Aplicables (1) ] [ 📋 Auditorías (2) ]│
│                                                                                        │
│ TAB 1: SITIOS (public.sitio)                                                           │
│ ┌────────┬───────────────────────┬───────────────────────────────┬───────────────────┐ │
│ │ No.    │ Nombre de la Sede     │ Dirección Física              │ Tipo de Sede      │ │
│ ├────────┼───────────────────────┼───────────────────────────────┼───────────────────┤ │
│ │ 0      │ Sede Principal HQ     │ Av. Industrial 100, Valencia  │ ★ Principal (HQ)  │ │
│ │ 1      │ Planta Ensamblaje     │ Zona Industrial Norte, Lote 4 │ Sucursal Operativa│ │
│ └────────┴───────────────────────┴───────────────────────────────┴───────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘

```

##### The Five Specialized Child Tabs (Zone 3 Lower Section):

1. **Tab 1: Sitios (`public.sitio`)**
* **Site 0 Principal Site Placement:** The principal headquarters (`numero_sitio = 0`) is **always rendered first** in the table/grid with a prominent primary badge (`★ Sede Central / Principal`).
* Subsequent branch locations (`numero_sitio >= 1`) are listed below with their site number, physical address, personnel count, and operational activities.

2. **Tab 2: Procesos (`public.proceso`)**
* Operational and management processes defined within the certified management system.
* Each process row prominently displays its mandatory `tipo` classification badge (`Estratégico`, `Medular`, `De Apoyo`, `Otro`).
* Expanding a process row reveals the specific normative clauses (`requisito`) mapped to it.

3. **Tab 3: Turnos (`public.turno`)**
* Operational working shifts, shift schedules, active employee counts, and shift descriptions per site.

4. **Tab 4: No Aplicables (`public.requisitos_no_aplicables_certificado`)**
* Excluded normative clauses per ISO 9001 clause 4.3.
* **Mandatory Justification Text:** Displays requirement codes, titles, and the required `justificacion` narrative text explaining why the organization cannot apply the clause.

5. **Tab 5: Auditorías (`public.auditoria`)**
* Chronological history and scheduled future audit events linked to the certificate.
* Columns: Audit Code, Modality (`tipo_auditoria`), Execution Method (`metodologia`), Dates, Lead Auditor, and Outcome Status.

---

## 3. Pure Business Logic & Unit Testing (`src/lib/multisiteSampling.ts`)

* Decouple the multisite count logic and Site 0 sorting algorithm into a pure helper module (`src/lib/multisiteSampling.ts`).
* Create unit tests in `src/lib/multisiteSampling.test.ts` executed via `node:test` (`npx tsx --test src/lib/multisiteSampling.test.ts`) verifying that:
* Site 0 (`numero_sitio = 0`) is always positioned at index 0 in sorted site arrays.
* Multisite branch counts correctly sum records where `numero_sitio > 0` while excluding headquarters (`numero_sitio = 0`).

---

## 4. Key Implementation Milestones

* [ ] **Milestone 4.2.1:** Pure helper functions for multisite branch counting and Site 0 sorting implemented and verified with unit tests in `src/lib/multisiteSampling.test.ts`.
* [ ] **Milestone 4.2.2:** `Certificado` list view implemented in `src/views/certificadoView.ts` with strict exclusion of the `"Cobertura Normativa"` column and correct multisite counts.
* [ ] **Milestone 4.2.3:** `Certificado` detail page implemented following the 4-zone blueprint, featuring the `alcance` textarea with 10-1000 character counter feedback.
* [ ] **Milestone 4.2.4:** The five specialized child tabs (`Sitios` with Site 0 first, `Procesos` with `tipo` badges, `Turnos`, `No Aplicables` with justification text, and `Auditorías`) fully integrated.

---

## 5. Acceptance Criteria & Quality Gates

1. **Clean List Layout:** The main certificate list view displays no `"Cobertura Normativa"` column, maximizing horizontal usability for operational data.
2. **Principal Site Determinism:** In the `Sitios` tab, the site with `numero_sitio = 0` is consistently rendered at the top of the table with the `★ Sede Central / Principal` badge.
3. **Multisite Count Accuracy:** Branch site counts accurately reflect subsidiary locations while excluding headquarters (`numero_sitio = 0`).
4. **Non-Applicability Justification:** Every excluded requirement rendered in the `No Aplicables` tab includes non-empty `justificacion` narrative text.
5. **Process Classification Tags:** Every process rendered in the `Procesos` tab displays its valid `tipo` tag (`Estratégico`, `Medular`, `De Apoyo`, `Otro`).
6. **Zero UUID Exposure:** Zero raw UUIDs are exposed across certificate lists, parent metadata, direct attributes, or child tables.

```

```