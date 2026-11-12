# Phase 1: Database Architecture & Schema Modernization

## 1. Executive Summary & Phase Scope

Phase 1 establishes the structural, relational, and data-integrity foundation required for the major upgrade of `programa_aud`. In accordance with **ISO/IEC 17021-1:2015** (Conformity assessment — Requirements for bodies providing audit and certification of management systems), this phase modernizes the PostgreSQL database schema deployed via Supabase (`public/supabase/queries/`), expanding normative standards, accreditation relationships, technical sub-sectors, site conventions, and non-applicability justifications.

All modifications in this phase maintain strict backward compatibility while establishing clean foreign-key relationships, database-level integrity constraints, and immutable audit logging.

---

## 2. Architectural Blueprints & Data Model Upgrades

### 2.1 IAF Technical Sub-Sectors (`subsector_iaf`)
To satisfy ISO 17021-1 auditor competency and accreditation scoping requirements, the IAF sector hierarchy is upgraded to support sub-sector classifications (e.g., `17.1`, `17.2` for manufacture of basic metals and fabricated metal products):

- **Table Specification:** `public.subsector_iaf`
  - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `id_sector_iaf UUID NOT NULL REFERENCES public.sector_iaf(id) ON DELETE RESTRICT`
  - `codigo VARCHAR(10) NOT NULL` (e.g., `'17.1'`, `'17.2'`, `'28.1'`)
  - `descripcion TEXT NOT NULL`
  - `categoria_riesgo VARCHAR(20) DEFAULT 'MEDIO'` (`'ALTO'`, `'MEDIO'`, `'BAJO'`)
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `CONSTRAINT unique_subsector_codigo UNIQUE(codigo)`

### 2.2 Standards Expansion (`norma`)
The `norma` table is expanded to separate the formal normative code, descriptive title, and publication/validity lifecycle status:

- **Field Upgrades:**
  - `codigo VARCHAR(50) NOT NULL` (e.g., `'ISO 9001:2015'`, `'ISO 14001:2015'`, `'ISO 45001:2018'`, `'ISO 27001:2022'`)
  - `titulo VARCHAR(255) NOT NULL` (e.g., `'Sistemas de Gestión de la Calidad — Requisitos'`)
  - `estatus VARCHAR(50) NOT NULL DEFAULT 'Vigente'` (`'Vigente'`, `'En Revisión'`, `'Obsoleta'`)
  - `fecha_publicacion DATE`
  - Backward compatibility: maintain `norma VARCHAR(100)` populated or generated via `codigo` to prevent breaking existing views.

### 2.3 Accreditation Schema (`organismo_acreditacion` & `acreditacion_norma_iaf`)
Certification bodies operate under official accreditation granted by national or international accreditation bodies (e.g., ENAC, UKAS, ANAB, DAkkS). Phase 1 introduces the accreditation entities:

- **Table Specification:** `public.organismo_acreditacion`
  - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `codigo VARCHAR(20) NOT NULL UNIQUE` (e.g., `'ENAC'`, `'UKAS'`, `'ANAB'`)
  - `nombre VARCHAR(255) NOT NULL`
  - `pais VARCHAR(100) NOT NULL`
  - `sitio_web VARCHAR(255)`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`

- **Table Specification:** `public.acreditacion_norma_iaf`
  - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `id_organismo UUID NOT NULL REFERENCES public.organismo_acreditacion(id) ON DELETE CASCADE`
  - `id_norma UUID NOT NULL REFERENCES public.norma(id) ON DELETE CASCADE`
  - `id_sector_iaf UUID REFERENCES public.sector_iaf(id) ON DELETE SET NULL`
  - `id_subsector_iaf UUID REFERENCES public.subsector_iaf(id) ON DELETE SET NULL`
  - `numero_acreditacion VARCHAR(100) NOT NULL` (e.g., `'01/C-SC001'`)
  - `fecha_concesion DATE NOT NULL`
  - `fecha_vencimiento DATE`
  - `estatus VARCHAR(30) DEFAULT 'Activa'`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`

### 2.4 Non-Applicability Justification (`requisitos_no_aplicables_certificado`)
Under ISO 9001:2015 clause 4.3 and ISO 17021-1, any requirement determined as non-applicable within a client organization's scope must be explicitly justified by the client and validated by the audit team:

- **Field Addition:**
  - `justificacion TEXT NOT NULL DEFAULT ''`
- Audit constraint: ensure that any certificate exclusion record contains a non-empty audit justification detailing why the clause cannot be applied to the certified operational processes.

### 2.5 Site 0 Convention for Principal Sites (`sitio`)
To standardize multisite certificate management across the application:
- **Principal Site Convention:** The central office / headquarters of the client organization is consistently assigned `numero_sitio = 0`.
- **Multisite Count Rule:** The count of multisite locations displayed on certificate records represents subsidiary or branch sites (`numero_sitio > 0`). The principal site (`numero_sitio = 0`) is listed first in all site grids/tables with a prominent visual identifier and is excluded from the secondary site count.

### 2.6 Table `proceso` Update: Process Categorization (`tipo`)
Under ISO 9001:2015, ISO 14001:2015, and ISO/IEC 17021-1, certification audits require clear categorization of operational processes according to their role in the client organization's management system. The `public.proceso` table is updated with a mandatory `tipo` classification:

- **Field Addition:**
  - `tipo VARCHAR(30) NOT NULL DEFAULT 'Medular'`
  - **Integrity Constraint:**
    ```sql
    CONSTRAINT check_proceso_tipo CHECK (tipo IN ('Estratégico', 'Medular', 'De Apoyo', 'Otro'))
    ```
- **Normative Categorization Definitions:**
  - **`Estratégico` (Strategic / Management):** Processes related to governance, leadership, strategic planning, policy definition, internal audit, and management review (ISO 9001 clauses 5 and 9).
  - **`Medular` (Core / Operational):** Core value-generating processes directly responsible for product or service design, manufacturing, operational delivery, and customer relationship (ISO 9001 clause 8).
  - **`De Apoyo` (Support):** Enabling processes that provide required infrastructure, resource allocation, human talent, information technology, purchasing, and equipment maintenance (ISO 9001 clause 7).
  - **`Otro` (Other):** Transversal or specialized processes not classified under standard categories.

### 2.7 Table `certificado` Update: Comprehensive Scope Statement (`alcance`)
In accordance with **ISO/IEC 17021-1:2015 clause 8.2.2**, certification documents must unambiguously describe the formal scope of certification for the certified client, clearly delineating the activities, products, services, and operational boundaries covered:

- **Field Addition:**
  - `alcance VARCHAR(1000) NOT NULL`
  - **Character Length Constraint (10 to 1000 Characters):**
    ```sql
    CONSTRAINT check_certificado_alcance_length CHECK (char_length(trim(alcance)) >= 10 AND char_length(trim(alcance)) <= 1000)
    ```
- **Audit & Regulatory Impact:**
  - Replaces vague or missing scope descriptions with a legally binding narrative scope statement (e.g., *"Diseño, manufactura, estampado, ensamble final y comercialización de piezas metálicas y componentes troquelados para la industria automotriz y de línea blanca.*").
  - Evaluated during audit planning (Etapa 1 and Etapa 2) to ensure that the audit team qualifications (IAF sectors/sub-sectors) match the full scope declared in `alcance`.

### 2.8 Standardization of Master Catalog Values
The catalog values stored in `public.estatus`, `public.tipo_auditoria`, and `public.metodologia_auditoria` are standardized to clean, canonical title-case records:

1. **`estatus` (8 Canonical Values):**
   - `Activo`
   - `Estudio`
   - `Suspendido`
   - `Cancelado`
   - `Planificado`
   - `En Ejecución`
   - `En Espera`
   - `Inactivo`

2. **`tipo_auditoria` (9 Canonical Modalities):**
   - `Etapa 1`
   - `Etapa 2`
   - `Seguimiento 1`
   - `Seguimiento 2`
   - `Renovación`
   - `Diagnóstico`
   - `Extraordinaria`
   - `Especial`
   - `Otro`

3. **`metodologia_auditoria` (3 Canonical Methods):**
   - `Presencial`
   - `Remota`
   - `Mixta`

---

## 3. SQL Deployment Scripts Roadmap

The migration files located in `public/supabase/queries/` must be updated sequentially to guarantee deterministic execution via the SQL runner and `POST /api/reset-db`:

| Script | Upgrade Modifications |
| :--- | :--- |
| `01_creacion.sql` | Add `subsector_iaf`, `organismo_acreditacion`, and `acreditacion_norma_iaf`. Add `codigo`, `titulo`, and `estatus` to `norma`. Add `justificacion` to `requisitos_no_aplicables_certificado`. **Add `tipo` with `CHECK (tipo IN ('Estratégico', 'Medular', 'De Apoyo', 'Otro'))` to `proceso`. Add `alcance VARCHAR(1000)` with 10-1000 character check constraint to `certificado`.** Attach audit log triggers to new tables. |
| `02_cobertura_normativa.sql` | Update competency validation stored procedures to evaluate auditor qualifications against both primary IAF sectors and specific `subsector_iaf` classifications, and integrate process `tipo` into coverage calculations. |
| `03_indices_optimizacion.sql` | Add composite indexes: `idx_subsector_sector`, `idx_acreditacion_norma_org`, `idx_sitio_cert_numero` (`id_certificado`, `numero_sitio`), `idx_proceso_cert_tipo` (`id_certificado`, `tipo`), and `idx_audit_log_entity_lookup` (`target_table`, `record_id`). |
| `04_rls.sql` | Extend Row Level Security (RLS) policies: `organismo_acreditacion`, `subsector_iaf`, and `acreditacion_norma_iaf` readable by all authenticated users, writable exclusively by `ADMIN` and `WORKER`. Update helper functions. |
| `06_datos_prueba.sql` | Seed comprehensive sample records: 8 canonical statuses, 9 audit types, 3 methodologies, ISO standards with title and code, ENAC/UKAS accreditation entities, sub-sectors (`17.1`, `17.2`, `28.1`, `33.1`), **realistic certification scopes (`alcance`) between 10 and 1000 chars for all certificates**, **processes tagged with realistic `tipo` (`Estratégico`, `Medular`, `De Apoyo`, `Otro`)**, and sample certificates featuring Site 0 principal sites and justified clause exclusions. |

---

## 4. Key Implementation Milestones

- [ ] **Milestone 1.1:** DDL schema definitions written and verified for `subsector_iaf`, `organismo_acreditacion`, and `acreditacion_norma_iaf`.
- [ ] **Milestone 1.2:** Existing tables (`norma`, `requisitos_no_aplicables_certificado`, `sitio`, `proceso`, `certificado`) updated with required columns (`proceso.tipo`, `certificado.alcance`) and check constraints.
- [ ] **Milestone 1.3:** Audit log triggers (`audit_trigger_func`) attached to all new and updated entities to maintain complete forensic traceability.
- [ ] **Milestone 1.4:** Standardized catalog values (8 statuses, 9 audit types, 3 methodologies) synchronized across migration seeds.
- [ ] **Milestone 1.5:** RLS policies and `SECURITY DEFINER` procedures verified and validated against test accounts (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`).
- [ ] **Milestone 1.6:** Verification of clean execution via database reset endpoint (`POST /api/reset-db`) without errors.

---

## 5. Acceptance Criteria & Quality Gates

1. **Foreign Key Integrity:** All relationships between standards, accreditation bodies, and sub-sectors enforce strict relational integrity (`ON DELETE RESTRICT` or `CASCADE` where appropriate).
2. **Process Classification Constraint:** Any attempt to insert or update `proceso.tipo` with a value outside of `'Estratégico'`, `'Medular'`, `'De Apoyo'`, `'Otro'` is rejected by PostgreSQL check constraint `check_proceso_tipo`.
3. **Certificate Scope Length Constraint:** Any insert or update to `certificado.alcance` with fewer than 10 or more than 1000 characters is rejected by `check_certificado_alcance_length`.
4. **Audit Logging Coverage:** Every `INSERT`, `UPDATE`, and `DELETE` on `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `proceso`, and `certificado` writes an entry to `public.audit_log`.
5. **Principal Site Determinism:** Querying `sitio` with `ORDER BY numero_sitio ASC` consistently positions the principal site (`numero_sitio = 0`) at the first index.
6. **Zero Breaking Changes:** Existing application queries in `src/` continue to function through backward-compatible defaults and non-breaking column additions.
