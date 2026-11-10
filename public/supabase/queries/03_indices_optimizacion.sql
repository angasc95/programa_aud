-- ============================================================================
-- FILE 3: 03_INDICES_OPTIMIZACION.SQL (Índices B-tree, GiST y Solicitudes)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_requisito_ruta_gist ON public.requisito USING GIST (ruta_materializada);
CREATE INDEX IF NOT EXISTS idx_requisito_padre ON public.requisito (id_requisito_padre);
CREATE INDEX IF NOT EXISTS idx_requisito_norma_padre ON public.requisito (id_norma, id_requisito_padre);
CREATE INDEX IF NOT EXISTS idx_requisito_norma_codigo ON public.requisito (id_norma, codigo);

CREATE INDEX IF NOT EXISTS idx_organizacion_nombre ON public.organizacion (nombre);
CREATE INDEX IF NOT EXISTS idx_organizacion_rif ON public.organizacion (rif) WHERE rif IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_org_access_lookup ON public.client_organization_access (id_usuario, id_organizacion, estado);

CREATE INDEX IF NOT EXISTS idx_certificado_numero ON public.certificado (numero_certificado);
CREATE INDEX IF NOT EXISTS idx_certificado_organizacion ON public.certificado (id_organizacion);
CREATE INDEX IF NOT EXISTS idx_certificado_norma_iaf ON public.certificado (id_norma, id_sector_iaf);

CREATE INDEX IF NOT EXISTS idx_auditor_nombre ON public.auditor (nombre);
CREATE INDEX IF NOT EXISTS idx_norma_auditor_compuesta ON public.norma_auditor (id_auditor, id_norma);
CREATE INDEX IF NOT EXISTS idx_norma_auditor_norma_lookup ON public.norma_auditor (id_norma, id_auditor);
CREATE INDEX IF NOT EXISTS idx_sector_iaf_auditor_compuesta ON public.sector_iaf_auditor (id_auditor, id_sector_iaf);
CREATE INDEX IF NOT EXISTS idx_sector_iaf_auditor_sector_lookup ON public.sector_iaf_auditor (id_sector_iaf, id_auditor);

CREATE INDEX IF NOT EXISTS idx_sitio_certificado ON public.sitio (id_certificado, numero_sitio);
CREATE INDEX IF NOT EXISTS idx_proceso_certificado ON public.proceso (id_certificado);
CREATE INDEX IF NOT EXISTS idx_turnos_por_sitio_lookup ON public.turnos_por_sitio (id_sitio, id_turno);
CREATE INDEX IF NOT EXISTS idx_req_proceso_lookup ON public.requisitos_por_proceso (id_proceso, id_requisito);
CREATE INDEX IF NOT EXISTS idx_req_no_aplicables_certificado ON public.requisitos_no_aplicables_certificado (id_certificado, id_requisito);

CREATE INDEX IF NOT EXISTS idx_equipo_auditor_lookup ON public.equipo_auditor (id_auditoria, id_auditor);
CREATE INDEX IF NOT EXISTS idx_sitios_auditoria_compuesto ON public.sitios_por_auditoria (id_auditoria, id_sitio);
CREATE INDEX IF NOT EXISTS idx_proc_sitio_aud_compuesto ON public.procesos_sitio_auditoria (id_sitios_por_auditoria, id_proceso, id_turnos_sitio_auditoria);
CREATE INDEX IF NOT EXISTS idx_procesos_sitio_auditoria_compuesto ON public.procesos_sitio_auditoria (id_sitios_por_auditoria, id_proceso);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria (fecha_programacion);
CREATE INDEX IF NOT EXISTS idx_hallazgo_auditoria ON public.hallazgo (id_auditoria, tipo);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log (table_name, record_id);