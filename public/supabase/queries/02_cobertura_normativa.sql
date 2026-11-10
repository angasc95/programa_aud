-- ============================================================================
-- FILE 2: 02_COBERTURA_NORMATIVA.SQL (Motor de Cálculo LTREE)
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
        WHERE c.id = p_id_certificado
    ),
    RequisitosCubiertosDirectos AS (
        SELECT DISTINCT rpp.id_requisito AS id, req.ruta_materializada AS ruta
        FROM public.requisitos_por_proceso rpp
        INNER JOIN public.proceso p ON rpp.id_proceso = p.id
        INNER JOIN public.requisito req ON rpp.id_requisito = req.id
        WHERE p.id_certificado = p_id_certificado
    ),
    RequisitosNoAplicablesDirectos AS (
        SELECT DISTINCT rna.id_requisito AS id, req.ruta_materializada AS ruta
        FROM public.requisitos_no_aplicables_certificado rna
        INNER JOIN public.requisito req ON rna.id_requisito = req.id
        WHERE rna.id_certificado = p_id_certificado
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
    )
    SELECT 
        req.id AS id_requisito,
        req.codigo,
        req.ruta_materializada,
        ep.estado AS estado_cobertura
    FROM public.requisito req
    INNER JOIN EstadoPriorizado ep ON req.id = ep.id
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
-- Validación de Competencias Técnicas de Auditores (Fase 2)
-- Verifica cruce compuesto entre auditor, norma ISO y sector IAF (< 10ms)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auditor_esta_calificado(
    p_id_auditor UUID,
    p_id_norma UUID,
    p_id_sector_iaf UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.norma_auditor na
        INNER JOIN public.sector_iaf_auditor sa
            ON sa.id_auditor = na.id_auditor
        WHERE na.id_auditor = p_id_auditor
          AND na.id_norma = p_id_norma
          AND sa.id_sector_iaf = p_id_sector_iaf
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
    INNER JOIN public.norma_auditor na ON na.id_norma = c.id_norma
    INNER JOIN public.sector_iaf_auditor sa ON sa.id_sector_iaf = c.id_sector_iaf AND sa.id_auditor = na.id_auditor
    INNER JOIN public.auditor a ON a.id = na.id_auditor
    WHERE c.id = p_id_certificado
    ORDER BY a.nombre ASC;
$$;