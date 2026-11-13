-- ============================================================================
-- FILE 3: 03_INDICES_OPTIMIZACION.SQL (Índices B-tree, GiST y Parciales Soft-Delete)
-- ============================================================================

-- Limpieza idempotente de restricciones UNIQUE globales heredadas (si existen en instancias previas)
DO $$
BEGIN
    ALTER TABLE public.norma DROP CONSTRAINT IF EXISTS norma_codigo_key;
    ALTER TABLE public.requisito DROP CONSTRAINT IF EXISTS unique_norma_requisito_codigo;
    ALTER TABLE public.sector_iaf DROP CONSTRAINT IF EXISTS sector_iaf_sector_key;
    ALTER TABLE public.subsector_iaf DROP CONSTRAINT IF EXISTS unique_subsector_codigo;
    ALTER TABLE public.organismo_acreditacion DROP CONSTRAINT IF EXISTS organismo_acreditacion_codigo_key;
    ALTER TABLE public.estatus DROP CONSTRAINT IF EXISTS estatus_estatus_key;
    ALTER TABLE public.tipo_auditoria DROP CONSTRAINT IF EXISTS tipo_auditoria_tipo_key;
    ALTER TABLE public.metodologia_auditoria DROP CONSTRAINT IF EXISTS metodologia_auditoria_metodologia_key;
    ALTER TABLE public.certificado DROP CONSTRAINT IF EXISTS certificado_numero_certificado_key;
    ALTER TABLE public.sitio DROP CONSTRAINT IF EXISTS unique_sitio_certificado;
    ALTER TABLE public.proceso DROP CONSTRAINT IF EXISTS unique_proceso_certificado;
    ALTER TABLE public.requisitos_no_aplicables_certificado DROP CONSTRAINT IF EXISTS unique_cert_requisito_no_aplicable;
    ALTER TABLE public.turno DROP CONSTRAINT IF EXISTS unique_horario_turno;
    ALTER TABLE public.turnos_por_sitio DROP CONSTRAINT IF EXISTS unique_sitio_turno;
    ALTER TABLE public.sitios_por_auditoria DROP CONSTRAINT IF EXISTS unique_auditoria_sitio;
END $$;

-- Índices Únicos Parciales (WHERE deleted_at IS NULL) para llaves de negocio mutables
CREATE UNIQUE INDEX IF NOT EXISTS uq_norma_codigo_active ON public.norma (codigo) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_requisito_norma_codigo_active ON public.requisito (id_norma, codigo) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sector_iaf_numero_active ON public.sector_iaf (sector) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_subsector_codigo_active ON public.subsector_iaf (codigo) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_organismo_codigo_active ON public.organismo_acreditacion (codigo) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_estatus_nombre_active ON public.estatus (estatus) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tipo_auditoria_nombre_active ON public.tipo_auditoria (tipo) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_metodologia_nombre_active ON public.metodologia_auditoria (metodologia) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_certificado_numero_active ON public.certificado (numero_certificado) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sitio_cert_numero_active ON public.sitio (id_certificado, numero_sitio) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_proceso_cert_nombre_active ON public.proceso (id_certificado, nombre_proceso) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_req_no_aplicable_cert_req_active ON public.requisitos_no_aplicables_certificado (id_certificado, id_requisito) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_turno_horario_active ON public.turno (hora_entrada, hora_salida) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_turnos_por_sitio_active ON public.turnos_por_sitio (id_sitio, id_turno) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sitios_por_auditoria_active ON public.sitios_por_auditoria (id_auditoria, id_sitio) WHERE deleted_at IS NULL;

-- Jerarquía LTREE y Requisitos
CREATE INDEX IF NOT EXISTS idx_requisito_ruta_gist ON public.requisito USING GIST (ruta_materializada) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requisito_padre ON public.requisito (id_requisito_padre) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requisito_norma_padre ON public.requisito (id_norma, id_requisito_padre) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requisito_norma_codigo ON public.requisito (id_norma, codigo) WHERE deleted_at IS NULL;

-- Organizaciones y Acceso Cliente
CREATE INDEX IF NOT EXISTS idx_organizacion_nombre ON public.organizacion (nombre) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organizacion_rif ON public.organizacion (rif) WHERE rif IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organizacion_active ON public.organizacion (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_org_access_lookup ON public.client_organization_access (id_usuario, id_organizacion, estado) WHERE deleted_at IS NULL;

-- Certificados
CREATE INDEX IF NOT EXISTS idx_certificado_numero ON public.certificado (numero_certificado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_certificado_organizacion ON public.certificado (id_organizacion) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_certificado_norma_iaf ON public.certificado (id_norma, id_sector_iaf) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_certificado_active ON public.certificado (id, id_estatus) WHERE deleted_at IS NULL;

-- Competencias de Auditores
CREATE INDEX IF NOT EXISTS idx_auditor_nombre ON public.auditor (nombre) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_norma_auditor_compuesta ON public.norma_auditor (id_auditor, id_norma);
CREATE INDEX IF NOT EXISTS idx_norma_auditor_norma_lookup ON public.norma_auditor (id_norma, id_auditor);
CREATE INDEX IF NOT EXISTS idx_sector_iaf_auditor_compuesta ON public.sector_iaf_auditor (id_auditor, id_sector_iaf);
CREATE INDEX IF NOT EXISTS idx_sector_iaf_auditor_sector_lookup ON public.sector_iaf_auditor (id_sector_iaf, id_auditor);

-- Sub-Sectores IAF y Acreditaciones (Fase 1)
CREATE INDEX IF NOT EXISTS idx_subsector_sector ON public.subsector_iaf (id_sector_iaf, codigo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subsector_codigo ON public.subsector_iaf (codigo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subsector_auditor ON public.subsector_iaf_auditor (id_auditor, id_subsector_iaf);
CREATE INDEX IF NOT EXISTS idx_acreditacion_norma_org ON public.acreditacion_norma_iaf (id_organismo, id_norma, id_sector_iaf) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_acreditacion_norma_iaf_active ON public.acreditacion_norma_iaf (id_norma, id_sector_iaf) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organismo_codigo ON public.organismo_acreditacion (codigo) WHERE deleted_at IS NULL;

-- Sitios (Site 0 first), Procesos y Requisitos
CREATE INDEX IF NOT EXISTS idx_sitio_cert_numero ON public.sitio (id_certificado, numero_sitio) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proceso_cert_tipo ON public.proceso (id_certificado, tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proceso_certificado ON public.proceso (id_certificado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_turnos_por_sitio_lookup ON public.turnos_por_sitio (id_sitio, id_turno) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_req_proceso_lookup ON public.requisitos_por_proceso (id_proceso, id_requisito);
CREATE INDEX IF NOT EXISTS idx_req_no_aplicables_certificado ON public.requisitos_no_aplicables_certificado (id_certificado, id_requisito) WHERE deleted_at IS NULL;

-- Auditorías y Evaluaciones de Campo
CREATE INDEX IF NOT EXISTS idx_equipo_auditor_lookup ON public.equipo_auditor (id_auditoria, id_auditor);
CREATE INDEX IF NOT EXISTS idx_sitios_auditoria_compuesto ON public.sitios_por_auditoria (id_auditoria, id_sitio) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proc_sitio_aud_compuesto ON public.procesos_sitio_auditoria (id_sitios_por_auditoria, id_proceso, id_turnos_sitio_auditoria) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_procesos_sitio_auditoria_compuesto ON public.procesos_sitio_auditoria (id_sitios_por_auditoria, id_proceso) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria (fecha_programacion) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auditoria_certificado_active ON public.auditoria (id_certificado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hallazgo_auditoria ON public.hallazgo (id_auditoria, tipo) WHERE deleted_at IS NULL;

-- Índice Forense de Trazabilidad Inmutable
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_lookup ON public.audit_log (table_name, record_id);