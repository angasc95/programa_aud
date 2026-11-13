-- ============================================================================
-- FILE 2: 02_COBERTURA_NORMATIVA.SQL (Motor de Cálculo LTREE y Competencias)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluar_cobertura_certificado(p_id_certificado UUID)
RETURNS TABLE (
    id_requisito UUID,
    codigo VARCHAR,
    ruta_materializada LTREE,
    estado_cobertura TEXT
) 
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    RETURN QUERY
    WITH CertNorma AS (
        SELECT c.id_norma
        FROM public.certificado c
        INNER JOIN public.norma n ON n.id = c.id_norma
        WHERE c.id = p_id_certificado
          AND c.deleted_at IS NULL
          AND n.deleted_at IS NULL
    ),
    RequisitosCubiertosDirectos AS (
        SELECT DISTINCT rpp.id_requisito AS id, req.ruta_materializada AS ruta
        FROM public.requisitos_por_proceso rpp
        INNER JOIN public.proceso p ON rpp.id_proceso = p.id
        INNER JOIN public.requisito req ON rpp.id_requisito = req.id
        WHERE p.id_certificado = p_id_certificado
          AND p.deleted_at IS NULL
          AND req.deleted_at IS NULL
    ),
    RequisitosNoAplicablesDirectos AS (
        SELECT DISTINCT rna.id_requisito AS id, req.ruta_materializada AS ruta
        FROM public.requisitos_no_aplicables_certificado rna
        INNER JOIN public.requisito req ON rna.id_requisito = req.id
        WHERE rna.id_certificado = p_id_certificado
          AND rna.deleted_at IS NULL
          AND req.deleted_at IS NULL
    ),
    AncestrosCubiertos AS (
        SELECT DISTINCT r_all.id
        FROM public.requisito r_all
        INNER JOIN CertNorma cn ON r_all.id_norma = cn.id_norma
        INNER JOIN RequisitosCubiertosDirectos rcd 
           ON (
               r_all.id = rcd.id
               OR (r_all.ruta_materializada IS NOT NULL AND rcd.ruta IS NOT NULL AND r_all.ruta_materializada @> rcd.ruta)
           )
        WHERE r_all.deleted_at IS NULL
    ),
    AncestrosNoAplicables AS (
        SELECT DISTINCT r_all.id
        FROM public.requisito r_all
        INNER JOIN CertNorma cn ON r_all.id_norma = cn.id_norma
        INNER JOIN RequisitosNoAplicablesDirectos rnad 
           ON (
               r_all.id = rnad.id
               OR (r_all.ruta_materializada IS NOT NULL AND rnad.ruta IS NOT NULL AND r_all.ruta_materializada @> rnad.ruta)
           )
        WHERE r_all.deleted_at IS NULL
    ),
    EstadoPriorizado AS (
        SELECT
            req.id,
            CASE
                WHEN EXISTS (SELECT 1 FROM AncestrosCubiertos ac WHERE ac.id = req.id) THEN 'CUBIERTO'
                WHEN EXISTS (SELECT 1 FROM AncestrosNoAplicables ana WHERE ana.id = req.id) THEN 'NO_APLICABLE'
                ELSE 'PENDIENTE'
            END AS estado
        FROM public.requisito req
        INNER JOIN CertNorma cn ON req.id_norma = cn.id_norma
        WHERE req.deleted_at IS NULL
    )
    SELECT 
        req.id AS id_requisito,
        req.codigo,
        req.ruta_materializada,
        ep.estado AS estado_cobertura
    FROM public.requisito req
    INNER JOIN EstadoPriorizado ep ON req.id = ep.id
    WHERE req.deleted_at IS NULL
    ORDER BY req.ruta_materializada ASC NULLS LAST, req.codigo ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.cobertura_normativa_certificado(p_id_certificado UUID)
RETURNS TABLE (
    id_requisito UUID,
    codigo VARCHAR,
    estado_cobertura TEXT
) 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT id_requisito, codigo, estado_cobertura 
    FROM public.evaluar_cobertura_certificado(p_id_certificado);
$$;

-- ============================================================================
-- Validación de Competencias Técnicas de Auditores (ISO/IEC 17021-1)
-- Verifica competencias activas por auditor, norma ISO, sector IAF y sub-sector IAF
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auditor_esta_calificado(
    p_id_auditor UUID,
    p_id_norma UUID,
    p_id_sector_iaf UUID,
    p_id_subsector_iaf UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.auditor a
        INNER JOIN public.norma_auditor na
            ON na.id_auditor = a.id
        INNER JOIN public.norma n
            ON n.id = na.id_norma
        INNER JOIN public.sector_iaf_auditor sa
            ON sa.id_auditor = a.id
        INNER JOIN public.sector_iaf s
            ON s.id = sa.id_sector_iaf
        LEFT JOIN public.subsector_iaf_auditor ssa
            ON ssa.id_auditor = a.id AND ssa.id_subsector_iaf = p_id_subsector_iaf
        LEFT JOIN public.subsector_iaf ss
            ON ss.id = ssa.id_subsector_iaf AND ss.deleted_at IS NULL
        WHERE a.id = p_id_auditor
          AND a.deleted_at IS NULL
          AND na.id_norma = p_id_norma
          AND n.deleted_at IS NULL
          AND sa.id_sector_iaf = p_id_sector_iaf
          AND s.deleted_at IS NULL
          AND (p_id_subsector_iaf IS NULL OR (ssa.id_subsector_iaf IS NOT NULL AND ss.id IS NOT NULL))
    );
$$;

CREATE OR REPLACE FUNCTION public.auditores_calificados_para_certificado(p_id_certificado UUID)
RETURNS TABLE (
    id_auditor UUID,
    nombre VARCHAR
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT a.id AS id_auditor, a.nombre
    FROM public.certificado c
    INNER JOIN public.norma n ON n.id = c.id_norma
    INNER JOIN public.sector_iaf s ON s.id = c.id_sector_iaf
    INNER JOIN public.norma_auditor na ON na.id_norma = c.id_norma
    INNER JOIN public.sector_iaf_auditor sa ON sa.id_sector_iaf = c.id_sector_iaf AND sa.id_auditor = na.id_auditor
    INNER JOIN public.auditor a ON a.id = na.id_auditor
    WHERE c.id = p_id_certificado
      AND c.deleted_at IS NULL
      AND n.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY a.nombre ASC;
$$;