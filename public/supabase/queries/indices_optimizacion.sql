-- Índices para optimización de consultas jerárquicas en requisitos
CREATE INDEX idx_requisito_padre ON requisito(id_requisito_padre);
CREATE INDEX idx_requisito_ruta_gist ON requisito USING GIST (ruta_materializada);

-- Índices de búsqueda y filtrado de certificados
CREATE INDEX idx_certificado_numero ON certificado(numero_certificado);
CREATE INDEX idx_certificado_norma_iaf ON certificado(id_norma, id_sector_iaf);

-- Índices para validación de competencias técnicas de auditores
CREATE INDEX idx_norma_auditor_compuesta ON norma_auditor(id_auditor, id_norma);
CREATE INDEX idx_sector_iaf_auditor_compuesta ON sector_iaf_auditor(id_auditor, id_sector_iaf);

-- Índices para reconstrucción del plan de auditoría por sitio
CREATE INDEX idx_procesos_sitio_auditoria_compuesto ON procesos_sitio_auditoria(id_sitios_por_auditoria, id_proceso);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha_programacion);