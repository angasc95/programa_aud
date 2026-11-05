-- ============================================================================
-- FILE 3: INDICES_OPTIMIZACION.SQL
-- ============================================================================
-- Core Purpose: Boost query performance, support hierarchical filtering,
-- and speed up lookups across large audit datasets and relational mappings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HIERARCHICAL INDEXES (ltree & Parent-Child Relationships)
-- ----------------------------------------------------------------------------
-- Index for materialised ltree path querying in requirements
CREATE INDEX IF NOT EXISTS idx_requisito_ruta_gist 
    ON public.requisito USING GIST (ruta_materializada);

-- Index for requirement parent-child relationship navigation
CREATE INDEX IF NOT EXISTS idx_requisito_padre 
    ON public.requisito (id_requisito_padre);

-- Compound index for requirement filtering by standard and parent
CREATE INDEX IF NOT EXISTS idx_requisito_norma_padre 
    ON public.requisito (id_norma, id_requisito_padre);

-- ----------------------------------------------------------------------------
-- 2. LOOKUP & SEARCH INDEXES
-- ----------------------------------------------------------------------------
-- Organization search indexes (name and partial/conditional tax ID)
CREATE INDEX IF NOT EXISTS idx_organizacion_nombre 
    ON public.organizacion (nombre);

CREATE INDEX IF NOT EXISTS idx_organizacion_rif 
    ON public.organizacion (rif) WHERE rif IS NOT NULL;

-- Certificate lookups
CREATE INDEX IF NOT EXISTS idx_certificado_numero 
    ON public.certificado (numero_certificado);

CREATE INDEX IF NOT EXISTS idx_certificado_organizacion 
    ON public.certificado (id_organizacion);

CREATE INDEX IF NOT EXISTS idx_certificado_norma_iaf 
    ON public.certificado (id_norma, id_sector_iaf);

-- ----------------------------------------------------------------------------
-- 3. COMPOSITE FOREIGN KEY & RELATIONAL MAPPING INDEXES
-- ----------------------------------------------------------------------------
-- Auditor technical competency mappings
CREATE INDEX IF NOT EXISTS idx_norma_auditor_compuesta 
    ON public.norma_auditor (id_auditor, id_norma);

CREATE INDEX IF NOT EXISTS idx_sector_iaf_auditor_compuesta 
    ON public.sector_iaf_auditor (id_auditor, id_sector_iaf);

-- Requirement-Process junction lookups
CREATE INDEX IF NOT EXISTS idx_req_proceso_lookup 
    ON public.requisitos_por_proceso (id_proceso, id_requisito);

-- Audit team assignments lookup
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_lookup 
    ON public.equipo_auditor (id_auditoria, id_auditor);

-- Audit site & process breakdown composite indexes
CREATE INDEX IF NOT EXISTS idx_sitios_auditoria_compuesto 
    ON public.sitios_por_auditoria (id_auditoria, id_sitio);

CREATE INDEX IF NOT EXISTS idx_proc_sitio_aud_compuesto 
    ON public.procesos_sitio_auditoria (id_sitios_por_auditoria, id_proceso, id_turnos_sitio_auditoria);

CREATE INDEX IF NOT EXISTS idx_procesos_sitio_auditoria_compuesto 
    ON public.procesos_sitio_auditoria (id_sitios_por_auditoria, id_proceso);

-- Audit date execution tracking index
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha 
    ON public.auditoria (fecha_programacion);

-- Audit ISO findings filtering index
CREATE INDEX IF NOT EXISTS idx_hallazgo_auditoria 
    ON public.hallazgo (id_auditoria, tipo);

-- ----------------------------------------------------------------------------
-- 4. AUDIT LOGGING INDEX
-- ----------------------------------------------------------------------------
-- Rapid tracking of immutable audit log entries by table name and record ID
CREATE INDEX IF NOT EXISTS idx_audit_log_record 
    ON public.audit_log (table_name, record_id);