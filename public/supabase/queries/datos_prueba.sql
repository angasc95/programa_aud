-- ============================================================================
-- FILE 6: DATOS_PRUEBA.SQL (Seed & Test Data for FONDONORMA Programa AUD)
-- ============================================================================
-- Propósito: Cargar datos de prueba consistentes y realistas para validar
-- catálogos, organizaciones, certificados, sitios, procesos, auditorías,
-- hallazgos y el funcionamiento del cálculo de cobertura normativa.
--
-- NOTA: Utiliza UUIDs deterministas e INSERT ... ON CONFLICT DO NOTHING
-- para permitir ejecuciones repetidas seguras en el SQL Editor de Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CATÁLOGOS BASE (DOMINIO 1)
-- ----------------------------------------------------------------------------

-- Estatus
INSERT INTO public.estatus (id, estatus) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ACTIVO'),
    ('a0000000-0000-0000-0000-000000000002', 'EN_PROCESO'),
    ('a0000000-0000-0000-0000-000000000003', 'SUSPENDIDO'),
    ('a0000000-0000-0000-0000-000000000004', 'CANCELADO'),
    ('a0000000-0000-0000-0000-000000000005', 'PLANIFICADA'),
    ('a0000000-0000-0000-0000-000000000006', 'EN_EJECUCION'),
    ('a0000000-0000-0000-0000-000000000007', 'CERRADA')
ON CONFLICT (estatus) DO UPDATE SET updated_at = NOW();

-- Tipos de Auditoría
INSERT INTO public.tipo_auditoria (id, tipo) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'ETAPA_1'),
    ('b0000000-0000-0000-0000-000000000002', 'ETAPA_2'),
    ('b0000000-0000-0000-0000-000000000003', 'VIGILANCIA_1'),
    ('b0000000-0000-0000-0000-000000000004', 'VIGILANCIA_2'),
    ('b0000000-0000-0000-0000-000000000005', 'RECERTIFICACION'),
    ('b0000000-0000-0000-0000-000000000006', 'EXTRAORDINARIA')
ON CONFLICT (tipo) DO UPDATE SET updated_at = NOW();

-- Metodologías de Auditoría
INSERT INTO public.metodologia_auditoria (id, metodologia) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'PRESENCIAL'),
    ('c0000000-0000-0000-0000-000000000002', 'REMOTA'),
    ('c0000000-0000-0000-0000-000000000003', 'HIBRIDA')
ON CONFLICT (metodologia) DO UPDATE SET updated_at = NOW();

-- Sectores IAF
INSERT INTO public.sector_iaf (id, sector) VALUES
    ('d0000000-0000-0000-0000-000000000014', 14), -- Caucho y plásticos
    ('d0000000-0000-0000-0000-000000000017', 17), -- Metales básicos y productos metálicos
    ('d0000000-0000-0000-0000-000000000028', 28), -- Construcción
    ('d0000000-0000-0000-0000-000000000033', 33), -- Tecnología de la información
    ('d0000000-0000-0000-0000-000000000035', 35)  -- Servicios a empresas
ON CONFLICT (sector) DO UPDATE SET updated_at = NOW();

-- Normas
INSERT INTO public.norma (id, esquema, norma) VALUES
    ('e0000000-0000-0000-0000-000000009001', 'SGC - Calidad', 'ISO 9001:2015'),
    ('e0000000-0000-0000-0000-000000014001', 'SGA - Gestión Ambiental', 'ISO 14001:2015'),
    ('e0000000-0000-0000-0000-000000045001', 'SST - Seguridad y Salud Laboral', 'ISO 45001:2018'),
    ('e0000000-0000-0000-0000-000000027001', 'SGSI - Seguridad de la Información', 'ISO/IEC 27001:2022')
ON CONFLICT (norma) DO UPDATE SET esquema = EXCLUDED.esquema, updated_at = NOW();

-- Requisitos para ISO 9001:2015 (Estructura Jerárquica con LTREE)
-- Padre: Clausula 4
INSERT INTO public.requisito (id, id_norma, id_requisito_padre, codigo, ruta_materializada) VALUES
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000009001', NULL, '4', '4'::ltree),
    ('f0000000-0000-0000-0000-000000000041', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000004', '4.1', '4.4_1'::ltree),
    ('f0000000-0000-0000-0000-000000000042', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000004', '4.2', '4.4_2'::ltree),
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000009001', NULL, '5', '5'::ltree),
    ('f0000000-0000-0000-0000-000000000051', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000005', '5.1', '5.5_1'::ltree),
    ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000009001', NULL, '6', '6'::ltree),
    ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000009001', NULL, '7', '7'::ltree),
    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000009001', NULL, '8', '8'::ltree),
    ('f0000000-0000-0000-0000-000000000081', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000008', '8.1', '8.8_1'::ltree),
    ('f0000000-0000-0000-0000-000000000085', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000008', '8.5', '8.8_5'::ltree),
    ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000009001', NULL, '9', '9'::ltree),
    ('f0000000-0000-0000-0000-000000000092', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000009', '9.2', '9.9_2'::ltree),
    ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000009001', NULL, '10', '10'::ltree)
ON CONFLICT (id) DO NOTHING;

-- Auditores Calificados
INSERT INTO public.auditor (id, nombre) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Ing. Carlos Mendoza (Auditor Líder)'),
    ('10000000-0000-0000-0000-000000000002', 'Dra. Elena Rivas (Auditor Especialista)'),
    ('10000000-0000-0000-0000-000000000003', 'Lic. Marcos Valera (Auditor Técnico)')
ON CONFLICT (id) DO NOTHING;

-- Competencias del Auditor (Normas y Sectores IAF)
INSERT INTO public.norma_auditor (id_auditor, id_norma) VALUES
    ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000009001'),
    ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000014001'),
    ('10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000027001'),
    ('10000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000009001')
ON CONFLICT DO NOTHING;

INSERT INTO public.sector_iaf_auditor (id_auditor, id_sector_iaf) VALUES
    ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000017'),
    ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000028'),
    ('10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000033'),
    ('10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000017')
ON CONFLICT DO NOTHING;

-- Turnos de Trabajo
INSERT INTO public.turno (id, hora_entrada, hora_salida) VALUES
    ('20000000-0000-0000-0000-000000000001', '07:00:00', '15:00:00'),
    ('20000000-0000-0000-0000-000000000002', '15:00:00', '23:00:00'),
    ('20000000-0000-0000-0000-000000000003', '23:00:00', '07:00:00')
ON CONFLICT (hora_entrada, hora_salida) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. DOMINIO 2: ORGANIZACIONES, CERTIFICADOS, SITIOS Y PROCESOS
-- ----------------------------------------------------------------------------

-- Organizaciones Clientes
INSERT INTO public.organizacion (id, nombre, rif, direccion_fiscal) VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        'Iberometal Componentes S.A.',
        'J-30492817-0',
        'Zona Industrial Carabobo, Parcela 42, Valencia, Estado Carabobo, Venezuela'
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'CyberCloud Solutions S.L.',
        'J-40819234-5',
        'Torre Empresarial David, Piso 14, Chacao, Caracas, Miranda, Venezuela'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'AgroIndustrias del Centro C.A.',
        'J-29837461-2',
        'Av. Intercomunal Maracay-Turmero, Km 4, Aragua, Venezuela'
    )
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    rif = EXCLUDED.rif,
    direccion_fiscal = EXCLUDED.direccion_fiscal,
    updated_at = NOW();

-- Certificados de Sistema de Gestión
INSERT INTO public.certificado (
    id, id_norma, id_estatus, id_sector_iaf, id_organizacion, numero_certificado, multisitio
) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000009001', -- ISO 9001:2015
        'a0000000-0000-0000-0000-000000000001', -- ACTIVO
        'd0000000-0000-0000-0000-000000000017', -- Sector 17
        '30000000-0000-0000-0000-000000000001', -- Iberometal Componentes S.A.
        'FN-QMS-2024-001',
        TRUE
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000027001', -- ISO/IEC 27001:2022
        'a0000000-0000-0000-0000-000000000001', -- ACTIVO
        'd0000000-0000-0000-0000-000000000033', -- Sector 33
        '30000000-0000-0000-0000-000000000002', -- CyberCloud Solutions S.L.
        'FN-ISMS-2024-002',
        FALSE
    )
ON CONFLICT (numero_certificado) DO NOTHING;

-- Sitios Físicos de Operación
INSERT INTO public.sitio (id, id_certificado, numero_sitio, nombre_sitio, direccion_sitio) VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        1,
        'Planta Principal y Laminación Valencia',
        'Zona Industrial Carabobo, Parcela 42, Valencia'
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000001',
        2,
        'Centro de Distribución y Embarque Puerto Cabello',
        'Sector Muelle 3, Galpón B-12, Puerto Cabello'
    ),
    (
        '50000000-0000-0000-0000-000000000003',
        '40000000-0000-0000-0000-000000000002',
        1,
        'Oficina Central & Security Operations Center (SOC)',
        'Torre Empresarial David, Piso 14, Chacao, Caracas'
    )
ON CONFLICT (id_certificado, numero_sitio) DO NOTHING;

-- Procesos del Sistema de Gestión
INSERT INTO public.proceso (id, id_certificado, nombre_proceso) VALUES
    ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Liderazgo, Estrategia y Planificación'),
    ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Fundición, Laminación y Troquelado Metálico'),
    ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Aseguramiento de Calidad y Metrología'),
    ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 'Gestión de Ciberseguridad y Monitoreo SOC')
ON CONFLICT (id) DO NOTHING;

-- Mapeo de Requisitos por Proceso (Alimentación para Cobertura Normativa)
INSERT INTO public.requisitos_por_proceso (id_proceso, id_requisito) VALUES
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004'),
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000041'),
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000042'),
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005'),
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000051'),
    ('60000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000008'),
    ('60000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000081'),
    ('60000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000085'),
    ('60000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000009'),
    ('60000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000092'),
    ('60000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- Turnos por Sitio
INSERT INTO public.turnos_por_sitio (id, id_sitio, id_turno) VALUES
    ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
    ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
ON CONFLICT (id_sitio, id_turno) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. DOMINIO 3: AUDITORÍAS, EQUIPO AUDITOR Y HALLAZGOS
-- ----------------------------------------------------------------------------

-- Auditoría Planificada
INSERT INTO public.auditoria (
    id, id_certificado, id_tipo_auditoria, id_metodologia, fecha_programacion
) VALUES
    (
        '80000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001', -- Certificado Iberometal
        'b0000000-0000-0000-0000-000000000005', -- RECERTIFICACION
        'c0000000-0000-0000-0000-000000000001', -- PRESENCIAL
        CURRENT_DATE + INTERVAL '15 days'
    ),
    (
        '80000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000002', -- Certificado CyberCloud
        'b0000000-0000-0000-0000-000000000002', -- ETAPA_2
        'c0000000-0000-0000-0000-000000000002', -- REMOTA
        CURRENT_DATE + INTERVAL '30 days'
    )
ON CONFLICT (id) DO NOTHING;

-- Asignación de Equipo Auditor
INSERT INTO public.equipo_auditor (id_auditoria, id_auditor, rol_auditor) VALUES
    ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'AUDITOR_LIDER'),
    ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'AUDITOR_EQUIPO'),
    ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'AUDITOR_LIDER')
ON CONFLICT (id_auditoria, id_auditor) DO NOTHING;

-- Sitios por Auditoría
INSERT INTO public.sitios_por_auditoria (id, id_auditoria, id_sitio) VALUES
    ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
    ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002')
ON CONFLICT (id_auditoria, id_sitio) DO NOTHING;

-- Comentarios de Auditoría
INSERT INTO public.comentarios_por_auditoria (id_auditoria, comentario) VALUES
    ('80000000-0000-0000-0000-000000000001', 'Reunión de apertura programada a las 08:30 con la Dirección General.'),
    ('80000000-0000-0000-0000-000000000001', 'Confirmada disponibilidad del personal operativo en el turno 1 y 2.')
ON CONFLICT DO NOTHING;

-- Hallazgos de Prueba Registrados
INSERT INTO public.hallazgo (
    id, id_auditoria, id_requisito, id_proceso, tipo, descripcion, evidencia, cerrado
) VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000085', -- Requisito 8.5
        '60000000-0000-0000-0000-000000000002', -- Proceso Troquelado
        'NC_MENOR',
        'Se constató que dos calibradores pie de rey en la línea de troquelado tenían el sello de calibración vencido desde hace 15 días.',
        'Registro fotográfico de instrumentos CAL-09 y CAL-12 sin etiqueta de vigencia.',
        FALSE
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        '80000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000051', -- Requisito 5.1
        '60000000-0000-0000-0000-000000000001', -- Proceso Liderazgo
        'OPORTUNIDAD_MEJORA',
        'La política de calidad podría incorporar métricas de digitalización para mejorar el seguimiento de objetivos estratégicos.',
        'Acta de revisión por la dirección punto 4.',
        FALSE
    )
ON CONFLICT (id) DO NOTHING;
