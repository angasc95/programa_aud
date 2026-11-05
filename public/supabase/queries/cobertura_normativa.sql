-- ============================================================================
-- FILE 2: COBERTURA_NORMATIVA.SQL
-- ============================================================================
-- MOTOR DE CÁLCULO DE COBERTURA NORMATIVA CON LTREE (RPC)

-- Función Avanzada de Evaluación Central (evaluar_cobertura_certificado)
-- Calcula la cobertura directa e heredada aprovechando el operador ltree (@>)
CREATE OR REPLACE FUNCTION public.evaluar_cobertura_certificado(p_id_certificado UUID)
RETURNS TABLE (
    id_requisito UUID,
    codigo VARCHAR,
    ruta_materializada LTREE,
    estado_cobertura TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH RequisitosCubiertosDirectos AS (
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
        INNER JOIN RequisitosCubiertosDirectos rcd 
           ON (r_all.ruta_materializada @> rcd.ruta OR r_all.id = rcd.id)
    ),
    AncestrosNoAplicables AS (
        SELECT DISTINCT r_all.id
        FROM public.requisito r_all
        INNER JOIN RequisitosNoAplicablesDirectos rnad 
           ON (r_all.ruta_materializada @> rnad.ruta OR r_all.id = rnad.id)
    ),
    EstadoUnificado AS (
        SELECT ac.id, 'CUBIERTO' AS estado FROM AncestrosCubiertos ac
        UNION
        SELECT ana.id, 'NO_APLICABLE' AS estado FROM AncestrosNoAplicables ana
    )
    SELECT 
        req.id AS id_requisito,
        req.codigo,
        req.ruta_materializada,
        COALESCE(eu.estado, 'PENDIENTE') AS estado_cobertura
    FROM public.requisito req
    INNER JOIN public.certificado cert ON cert.id_norma = req.id_norma
    LEFT JOIN EstadoUnificado eu ON req.id = eu.id
    WHERE cert.id = p_id_certificado;
END;
$$;

-- Wrapper API SQL (cobertura_normativa_certificado)
-- Llama al motor de evaluación para exponer los datos de cobertura del certificado
CREATE OR REPLACE FUNCTION public.cobertura_normativa_certificado(p_id_certificado UUID)
RETURNS TABLE (
    id_requisito UUID,
    codigo VARCHAR,
    estado_cobertura TEXT
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id_requisito, codigo, estado_cobertura 
    FROM public.evaluar_cobertura_certificado(p_id_certificado);
$$;