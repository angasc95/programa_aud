CREATE OR REPLACE FUNCTION cobertura_normativa_certificado(p_id_certificado UUID)
RETURNS TABLE (
    id_requisito UUID,
    codigo VARCHAR(30),
    estado_cobertura TEXT
) 
LANGUAGE sql
STABLE
AS $$
WITH RECURSIVE RequisitosDirectosProcesos AS (  
    SELECT DISTINCT rpp.id_requisito AS id  
    FROM requisitos_por_proceso rpp  
    INNER JOIN proceso p ON rpp.id_proceso = p.id  
    WHERE p.id_certificado = p_id_certificado  
),  
JerarquiaRequisitosCubiertos AS (  
    SELECT r.id, r.id_requisito_padre, r.id_norma  
    FROM requisito r  
    INNER JOIN RequisitosDirectosProcesos rdp ON r.id = rdp.id  
      
    UNION ALL  
      
    SELECT child.id, child.id_requisito_padre, child.id_norma  
    FROM requisito child  
    INNER JOIN JerarquiaRequisitosCubiertos parent ON child.id_requisito_padre = parent.id  
),  
RequisitosDirectosNoAplicables AS (  
    SELECT DISTINCT rna.id_requisito AS id  
    FROM requisitos_no_aplicables_certificado rna  
    WHERE rna.id_certificado = p_id_certificado  
),  
JerarquiaRequisitosNoAplicables AS (  
    SELECT r.id, r.id_requisito_padre, r.id_norma  
    FROM requisito r  
    INNER JOIN RequisitosDirectosNoAplicables rdna ON r.id = rdna.id  
      
    UNION ALL  
      
    SELECT child.id, child.id_requisito_padre, child.id_norma  
    FROM requisito child  
    INNER JOIN JerarquiaRequisitosNoAplicables parent ON child.id_requisito_padre = parent.id  
),  
UniversoEvaluado AS (  
    SELECT id, 'CUBIERTO' AS origen FROM JerarquiaRequisitosCubiertos  
    UNION  
    SELECT id, 'NO_APLICABLE' AS origen FROM JerarquiaRequisitosNoAplicables  
)  
SELECT    
    req.id AS id_requisito,  
    req.codigo,  
    COALESCE(ue.origen, 'PENDIENTE') AS estado_cobertura  
FROM requisito req  
INNER JOIN certificado cert ON cert.id_norma = req.id_norma  
LEFT JOIN UniversoEvaluado ue ON req.id = ue.id  
WHERE cert.id = p_id_certificado;
$$;