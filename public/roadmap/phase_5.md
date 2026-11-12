# Phase 5: Domain "Auditorías" (Event Scheduling, Operational Calendar & Results)

## 1. Executive Summary & Phase Scope

Phase 5 implements the operational field execution and governance workflows under the **"Auditorías"** domain (Block 1 in the global navigation). Operating under **ISO/IEC 17021-1:2015** (clauses 9.1 through 9.6) and **ISO 19011:2018**, this domain manages the three primary stages of the audit lifecycle:
1. **`Programación`** (Audit event planning, scope definition, team assignment, and multi-site sampling).
2. **`Calendario`** (Interactive chronological timeline, agenda visualization, and resource scheduling).
3. **`Resultado`** (Field findings management, corrective action tracking, and ISO 17021-1 certification issuance recommendations).

---

## 2. Architectural Blueprints & Operational Views

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DOMAIN 1: AUDITORÍAS (TRES BLOQUES OPERATIVOS)                                          │
│                                                                                        │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────────┐ │
│ │ 1. PROGRAMACIÓN      │  │ 2. CALENDARIO        │  │ 3. RESULTADO                   │ │
│ │ • Planificación      │  │ • Vista Cronológica  │  │ • Tablero de Hallazgos         │ │
│ │ • Equipo Auditor     │  │ • Agenda Mensual/Trim│  │ • NC Mayor / NC Menor / Obs / OM│ │
│ │ • Alcance y Muestreo │  │ • Filtro por Auditor │  │ • Recomendación de Emisión ISO │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Programación de Auditorías (`src/views/programacionView.ts`)

#### A. List & Grid Views (Repeatable View Architecture Pattern)
- **Standard List Mode:** High-density table displaying scheduled and planned audit events across client organizations and certificates:
  - Columns: `Código ▲▼`, `Organización ▲▼`, `Certificado ▲▼`, `Tipo de Auditoría ▲▼`, `Metodología ▲▼`, `Fechas Planificadas ▲▼`, `Auditor Líder ▲▼`, `Estatus ▲▼`, `Acciones`.
  - Excel-style sorting and column filter popovers.
  - Interactive row click appends audit record to breadcrumb and drills down to the Detail View.
- **Standard Grid Mode:** Responsive visual cards highlighting audit modality badge, client company, certificate code, lead auditor avatar, and execution date pill.
- **Sidebar Filtering:** Fast facets for audit type, methodology, status, and lead auditor.

#### B. Audit Planning Detail View (4-Zone Architecture)
Adheres strictly to the Standardized Detail Page Architecture:

1. **Header & Changelog:** Audit Code (e.g., `AUD-2024-001`), Modality Badge (`Etapa 2`), Status Badge (`Planificado`), and top-right `🕒 Historial de Cambios` modal button.
2. **Zone 1: Parent Data Section (Upper Zone):**
   - Clickable linked entities:
     - `Organización Titular:` 🏢 [CyberCloud Solutions S.L.]
     - `Certificado Amparado:` 📜 [FN-QMS-2024-001] (with scope tooltip: `alcance`)
     - `Norma Aplicable:` 📘 [ISO 9001:2015]
     - `Tipo de Auditoría:` 🏷️ [Etapa 2]
     - `Metodología:` 🌐 [Presencial]
3. **Zone 2: Visual Separator:** Clean minimal divider rule.
4. **Zone 3: Direct Record Attributes (Multi-Column View/Edit):**
   - Read-only & Edit modes: Start Date, End Date, Planned Auditor-Days, Lead Auditor Selector, Audit Language, and Evaluation Objectives.
5. **Zone 4: Multipage / Child Tabs Section (Lower Zone):**
   - **Tab 1: Equipo Evaluador (`equipo_auditor`):** Assigned auditors, evaluated competency scopes (IAF sectors/sub-sectors), and roles (`Auditor Líder`, `Auditor de Equipo`, `Experto Técnico`).
   - **Tab 2: Sedes y Muestreo (`alcance_auditoria_sitio`):** Multi-site sampling schedule (Site 0 principal site first, followed by sampled branch locations) with allocated visit dates.
   - **Tab 3: Procesos Auditables:** List of client operational processes evaluated, displaying their mandatory `tipo` tag (`Estratégico`, `Medular`, `De Apoyo`, `Otro`) and mapped clauses.
   - **Tab 4: Matriz de Verificación Normativa:** Interactive checklist of normative clauses (`requisito`) scheduled for verification.

---

### 2.2 Calendario Operativo de Auditorías (`src/views/calendarioView.ts`)

#### A. Interactive Chronological Agenda
- **Dual Presentation:**
  - **Monthly / Quarterly Grid View:** Calendar cells indicating scheduled audits, color-coded by modality (`Etapa 1`, `Etapa 2`, `Seguimiento`, etc.) and execution methodology.
  - **Timeline / Gantt View:** Horizontal timeline displaying overlapping auditor schedules to detect resource conflicts and optimize auditor travel.
- **Filtering Controls:**
  - Filter by assigned Lead Auditor or team member.
  - Filter by Standard (`ISO 9001`, `ISO 14001`, `ISO 27001`).
  - Filter by Execution Methodology (`Presencial`, `Remota`, `Mixta`).
- **Quick-Access Event Drawer:**
  - Clicking any calendar entry opens an interactive slide-over drawer displaying:
    - Organization name and primary site location address.
    - Assigned audit team and contact coordinates.
    - Modality and planned audit schedule.
    - Direct button: *"Ir al Detalle de Programación"* or *"Ver Resultados y Hallazgos"*.

---

### 2.3 Resultado y Gestión de Hallazgos (`src/views/resultadoView.ts`)

#### A. Findings Management Board (`public.hallazgo`)
Field evaluators record audit findings categorized into the four formal ISO classifications:

1. **`NC_MAYOR` (No Conformidad Mayor):**
   - Absence or total breakdown of a system requirement, or a situation that raises significant doubt regarding the capability of the management system to achieve expected outcomes.
   - **Critical Rule:** Prevents certificate issuance or renewal until formally closed.
2. **`NC_MENOR` (No Conformidad Menor):**
   - Single failure or isolated lapse in compliance that does not compromise overall system effectiveness.
3. **`OBSERVACION` (Observación):**
   - Operational condition that may become a non-conformity if not addressed.
4. **`OPORTUNIDAD_MEJORA` (Oportunidad de Mejora):**
   - Constructive recommendation to enhance efficiency or system maturity.

#### B. Finding Lifecycle Workflow & Corrective Actions
- **Tabular & Kanban Views:** Findings grouped by status (`Abierto`, `Causa Raíz Analizada`, `Plan de Acción Enviado`, `Verificado`, `Cerrado`).
- **Data Attributes:**
  - Finding Code & Severity Badge.
  - Normative Clause (`requisito`) violated.
  - Process & Site where the finding was identified.
  - Description of the Objective Evidence (`evidencia_objetiva`).
  - Client Corrective Action Plan & Auditor Verification Comments.
  - Due Date & Formal Closure Date.

#### C. ISO/IEC 17021-1 Certification Recommendation Engine
- Evaluates the total findings profile of the audit event:
  - If **any** `NC_MAYOR` remains open -> **Recomendación: DENEGADA / CONDICIONADA** (Certificate cannot be issued or renewed until an extraordinary verification or documentary evidence closes the major non-conformity).
  - If only `NC_MENOR` or `OBSERVACION` exist with approved action plans -> **Recomendación: APROBADA** (Recommended for issuance, continuation, or renewal).
- Formally logs the recommendation to `public.auditoria` with the lead auditor's electronic signature and timestamp.

---

## 3. Key Implementation Milestones

- [ ] **Milestone 5.1:** Header Block 1 restructured to provide direct navigation to `Programación`, `Calendario`, and `Resultado`.
- [ ] **Milestone 5.2:** `Programación` list and detail views implemented with team assignment and site sampling child tabs.
- [ ] **Milestone 5.3:** `Calendario` chronological view implemented with month/timeline modes, multi-criteria filtering, and event drawer.
- [ ] **Milestone 5.4:** `Resultado` view implemented with findings board supporting `NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, and `OPORTUNIDAD_MEJORA`.
- [ ] **Milestone 5.5:** Corrective action tracking workflow and ISO 17021-1 certification recommendation engine implemented.
- [ ] **Milestone 5.6:** Unit tests created in `src/lib/` validating finding classification rules and recommendation algorithms.

---

## 4. Acceptance Criteria & Quality Gates

1. **Four-Tier Finding Support:** All four ISO finding classifications are fully supported with distinct visual severity tokens.
2. **Issuance Gate Invariance:** The certification recommendation engine strictly rejects or blocks approval if an open `NC_MAYOR` exists without verified closure.
3. **Calendar Interactivity:** Selecting any calendar item displays event details and provides one-click navigation to the audit record.
4. **Audit Trail Completeness:** All finding registrations, severity modifications, and closure reviews generate immutable records in `public.audit_log`.
5. **Zero UUID Exposure:** All findings reference human-readable requirement codes, process names, and auditor identities.
