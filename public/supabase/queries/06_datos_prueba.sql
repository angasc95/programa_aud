-- ============================================================================
-- FILE 6: 06_DATOS_PRUEBA.SQL (Semillero Idempotente y Solicitudes Aprobadas)
-- ============================================================================

-- 1. Estatus Operativos Estandarizados (8 Valores Canónicos Title-Case)
INSERT INTO public.estatus (id, estatus) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Activo'),
    ('a0000000-0000-0000-0000-000000000002', 'Estudio'),
    ('a0000000-0000-0000-0000-000000000003', 'Suspendido'),
    ('a0000000-0000-0000-0000-000000000004', 'Cancelado'),
    ('a0000000-0000-0000-0000-000000000005', 'Planificado'),
    ('a0000000-0000-0000-0000-000000000006', 'En Ejecución'),
    ('a0000000-0000-0000-0000-000000000007', 'En Espera'),
    ('a0000000-0000-0000-0000-000000000008', 'Inactivo')
ON CONFLICT (estatus) DO UPDATE SET updated_at = NOW();

-- 2. Modalidades de Auditoría Estandarizadas (9 Modalidades Canónicas Title-Case)
INSERT INTO public.tipo_auditoria (id, tipo) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Etapa 1'),
    ('b0000000-0000-0000-0000-000000000002', 'Etapa 2'),
    ('b0000000-0000-0000-0000-000000000003', 'Seguimiento 1'),
    ('b0000000-0000-0000-0000-000000000004', 'Seguimiento 2'),
    ('b0000000-0000-0000-0000-000000000005', 'Renovación'),
    ('b0000000-0000-0000-0000-000000000006', 'Diagnóstico'),
    ('b0000000-0000-0000-0000-000000000007', 'Extraordinaria'),
    ('b0000000-0000-0000-0000-000000000008', 'Especial'),
    ('b0000000-0000-0000-0000-000000000009', 'Otro')
ON CONFLICT (tipo) DO UPDATE SET updated_at = NOW();

-- 3. Metodologías de Auditoría Estandarizadas (3 Métodos Canónicos Title-Case)
INSERT INTO public.metodologia_auditoria (id, metodologia) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Presencial'),
    ('c0000000-0000-0000-0000-000000000002', 'Remota'),
    ('c0000000-0000-0000-0000-000000000003', 'Mixta')
ON CONFLICT (metodologia) DO UPDATE SET updated_at = NOW();

-- 4. Sectores IAF Principales
INSERT INTO public.sector_iaf (id, sector) VALUES
    ('d0000000-0000-0000-0000-000000000014', 14),
    ('d0000000-0000-0000-0000-000000000017', 17),
    ('d0000000-0000-0000-0000-000000000028', 28),
    ('d0000000-0000-0000-0000-000000000033', 33),
    ('d0000000-0000-0000-0000-000000000035', 35)
ON CONFLICT (sector) DO UPDATE SET updated_at = NOW();

-- 5. Sub-Sectores IAF Jerárquicos con Categoría de Riesgo (Fase 1)
INSERT INTO public.subsector_iaf (id, id_sector_iaf, codigo, descripcion, categoria_riesgo) VALUES
    ('da000000-0000-0000-0000-000000000171', 'd0000000-0000-0000-0000-000000000017', '17.1', 'Fabricación de metales básicos, fundición y siderurgia', 'ALTO'),
    ('da000000-0000-0000-0000-000000000172', 'd0000000-0000-0000-0000-000000000017', '17.2', 'Fabricación de productos metálicos elaborados, troquelado y conformado', 'MEDIO'),
    ('da000000-0000-0000-0000-000000000281', 'd0000000-0000-0000-0000-000000000028', '28.1', 'Construcción de edificios y obras de ingeniería civil', 'MEDIO'),
    ('da000000-0000-0000-0000-000000000331', 'd0000000-0000-0000-0000-000000000033', '33.1', 'Servicios de tecnologías de información y desarrollo de software', 'BAJO')
ON CONFLICT (codigo) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    categoria_riesgo = EXCLUDED.categoria_riesgo,
    updated_at = NOW();

-- 6. Organismos de Acreditación (Fase 1)
INSERT INTO public.organismo_acreditacion (id, codigo, nombre, pais, sitio_web) VALUES
    ('db000000-0000-0000-0000-000000000001', 'ENAC', 'Entidad Nacional de Acreditación', 'España', 'https://www.enac.es'),
    ('db000000-0000-0000-0000-000000000002', 'UKAS', 'United Kingdom Accreditation Service', 'Reino Unido', 'https://www.ukas.com'),
    ('db000000-0000-0000-0000-000000000003', 'ANAB', 'ANSI National Accreditation Board', 'Estados Unidos', 'https://anab.ansi.org')
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    pais = EXCLUDED.pais,
    sitio_web = EXCLUDED.sitio_web,
    updated_at = NOW();

-- 7. Normas Certificables Expandidas (Código, Título, Estatus, Fecha)
INSERT INTO public.norma (id, esquema, codigo, titulo, estatus, fecha_publicacion, norma) VALUES
    ('e0000000-0000-0000-0000-000000009001', 'SGC - Calidad', 'ISO 9001:2015', 'Sistemas de Gestión de la Calidad — Requisitos', 'Vigente', '2015-09-15', 'ISO 9001:2015'),
    ('e0000000-0000-0000-0000-000000014001', 'SGA - Gestión Ambiental', 'ISO 14001:2015', 'Sistemas de Gestión Ambiental — Requisitos con orientación para su uso', 'Vigente', '2015-09-15', 'ISO 14001:2015'),
    ('e0000000-0000-0000-0000-000000045001', 'SST - Seguridad y Salud Laboral', 'ISO 45001:2018', 'Sistemas de Gestión de la Seguridad y Salud en el Trabajo — Requisitos', 'Vigente', '2018-03-12', 'ISO 45001:2018'),
    ('e0000000-0000-0000-0000-000000027001', 'SGSI - Seguridad de la Información', 'ISO/IEC 27001:2022', 'Seguridad de la información, ciberseguridad y protección de la privacidad — Sistemas de gestión', 'Vigente', '2022-10-25', 'ISO/IEC 27001:2022')
ON CONFLICT (codigo) DO UPDATE SET
    esquema = EXCLUDED.esquema,
    titulo = EXCLUDED.titulo,
    estatus = EXCLUDED.estatus,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    norma = EXCLUDED.norma,
    updated_at = NOW();

-- 8. Acreditaciones Otorgadas a Normas y Sectores IAF (Fase 1)
INSERT INTO public.acreditacion_norma_iaf (id, id_organismo, id_norma, id_sector_iaf, numero_acreditacion, fecha_concesion, fecha_vencimiento, estatus) VALUES
    ('dc000000-0000-0000-0000-000000000001', 'db000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000009001', 'd0000000-0000-0000-0000-000000000017', '01/C-SC001', '2020-01-15', '2028-01-14', 'Activa'),
    ('dc000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000014001', 'd0000000-0000-0000-0000-000000000017', '0044-EMS', '2021-06-01', '2027-05-31', 'Activa')
ON CONFLICT (id) DO NOTHING;

-- 9. Requisitos Clave Jerárquicos con LTREE
INSERT INTO public.requisito (id, id_norma, id_requisito_padre, codigo, ruta_materializada) VALUES
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000009001', NULL, '4', '4'::ltree),
    ('f0000000-0000-0000-0000-000000000041', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000004', '4.1', '4.4_1'::ltree),
    ('f0000000-0000-0000-0000-000000000042', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000004', '4.2', '4.4_2'::ltree),
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000009001', NULL, '5', '5'::ltree),
    ('f0000000-0000-0000-0000-000000000051', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000005', '5.1', '5.5_1'::ltree),
    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000009001', NULL, '8', '8'::ltree),
    ('f0000000-0000-0000-0000-000000000085', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000008', '8.5', '8.8_5'::ltree)
ON CONFLICT (id) DO NOTHING;

-- 10. Auditores y Matriz de Competencias Normativas y de Sub-Sectores
INSERT INTO public.auditor (id, nombre) VALUES
    ('33333333-3333-3333-3333-333333333333', 'Auditor Técnico Evaluador'),
    ('10000000-0000-0000-0000-000000000001', 'Ing. Carlos Mendoza (Auditor Líder)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.norma_auditor (id_auditor, id_norma) VALUES
    ('33333333-3333-3333-3333-333333333333', 'e0000000-0000-0000-0000-000000009001'),
    ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000009001'),
    ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000014001')
ON CONFLICT (id_auditor, id_norma) DO NOTHING;

INSERT INTO public.sector_iaf_auditor (id_auditor, id_sector_iaf) VALUES
    ('33333333-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000017'),
    ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000017'),
    ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000028')
ON CONFLICT (id_auditor, id_sector_iaf) DO NOTHING;

INSERT INTO public.subsector_iaf_auditor (id_auditor, id_subsector_iaf) VALUES
    ('10000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000171'),
    ('10000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000172'),
    ('33333333-3333-3333-3333-333333333333', 'da000000-0000-0000-0000-000000000172')
ON CONFLICT (id_auditor, id_subsector_iaf) DO NOTHING;

-- 11. Organizaciones Clientes
INSERT INTO public.organizacion (id, nombre, rif, direccion_fiscal) VALUES
    ('30000000-0000-0000-0000-000000000001', 'Iberometal Componentes S.A.', 'J-30492817-0', 'Zona Industrial Carabobo, Valencia, Edo. Carabobo'),
    ('30000000-0000-0000-0000-000000000002', 'CyberCloud Solutions S.L.', 'J-40819234-5', 'Torre David, Piso 14, Chacao, Caracas')
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rif = EXCLUDED.rif,
    direccion_fiscal = EXCLUDED.direccion_fiscal,
    updated_at = NOW();

-- 12. Solicitud de Acceso Aprobada para Usuario Cliente
INSERT INTO public.client_organization_access (id, id_usuario, id_organizacion, estado, aprobado_por, fecha_respuesta) VALUES
    (
        'c1000000-0000-0000-0000-000000000001',
        '44444444-4444-4444-4444-444444444444', -- Client user
        '30000000-0000-0000-0000-000000000001', -- Iberometal
        'APPROVED',
        '22222222-2222-2222-2222-222222222222', -- Approved by Worker
        NOW()
    )
ON CONFLICT (id_usuario, id_organizacion) DO UPDATE SET estado = 'APPROVED', fecha_respuesta = NOW();

-- 13. Certificados con Declaración Narrativa de Alcance (Fase 1)
INSERT INTO public.certificado (id, id_norma, id_estatus, id_sector_iaf, id_organizacion, numero_certificado, alcance, multisitio) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000009001',
        'a0000000-0000-0000-0000-000000000001', -- Activo
        'd0000000-0000-0000-0000-000000000017', -- Sector 17
        '30000000-0000-0000-0000-000000000001', -- Iberometal
        'FN-QMS-2024-001',
        'Diseño, manufactura, estampado, fundición y comercialización de piezas metálicas y componentes troquelados para la industria automotriz y de línea blanca nacional.',
        TRUE
    )
ON CONFLICT (numero_certificado) DO UPDATE SET
    alcance = EXCLUDED.alcance,
    multisitio = EXCLUDED.multisitio,
    updated_at = NOW();

-- 14. Sitios Físicos con Convención Sitio 0 (Sede Principal)
INSERT INTO public.sitio (id, id_certificado, numero_sitio, nombre_sitio, direccion_sitio) VALUES
    ('50000000-0000-0000-0000-000000000000', '40000000-0000-0000-0000-000000000001', 0, 'Sede Principal HQ', 'Av. Industrial 100, Valencia, Edo. Carabobo'),
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'Planta Valencia', 'Zona Industrial Carabobo, Galpón 4-B, Valencia')
ON CONFLICT (id_certificado, numero_sitio) DO UPDATE SET
    nombre_sitio = EXCLUDED.nombre_sitio,
    direccion_sitio = EXCLUDED.direccion_sitio,
    updated_at = NOW();

-- 15. Turnos y Asignación por Sitio
INSERT INTO public.turno (id, hora_entrada, hora_salida) VALUES
    ('70000000-0000-0000-0000-000000000001', '07:00:00', '15:00:00'),
    ('70000000-0000-0000-0000-000000000002', '15:00:00', '23:00:00')
ON CONFLICT (hora_entrada, hora_salida) DO NOTHING;

INSERT INTO public.turnos_por_sitio (id, id_sitio, id_turno) VALUES
    ('71000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001'),
    ('71000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002')
ON CONFLICT (id_sitio, id_turno) DO NOTHING;

-- 16. Procesos Operativos con Categorización 'tipo' (Fase 1)
INSERT INTO public.proceso (id, id_certificado, nombre_proceso, tipo) VALUES
    ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Troquelado y Fundición', 'Medular'),
    ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Dirección Estratégica y Calidad', 'Estratégico'),
    ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Mantenimiento y Logística', 'De Apoyo')
ON CONFLICT (id_certificado, nombre_proceso) DO UPDATE SET
    tipo = EXCLUDED.tipo,
    updated_at = NOW();

-- 17. Mapeo de Requisitos por Proceso
INSERT INTO public.requisitos_por_proceso (id_proceso, id_requisito) VALUES
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000041'),
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000085')
ON CONFLICT (id_proceso, id_requisito) DO NOTHING;

-- 18. Requisitos No Aplicables con Justificación Obligatoria (Fase 1)
INSERT INTO public.requisitos_no_aplicables_certificado (id, id_certificado, id_requisito, justificacion) VALUES
    (
        'ea000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000051',
        'La organización no realiza diseño ni desarrollo de nuevos productos; la fabricación y estampado se ejecutan estrictamente bajo planos de ingeniería y especificaciones provistas por los clientes (exclusión justificada según ISO 9001 cláusula 4.3).'
    )
ON CONFLICT (id_certificado, id_requisito) DO UPDATE SET
    justificacion = EXCLUDED.justificacion,
    updated_at = NOW();

-- 19. Auditorías Planificadas (Modalidad y Método Estandarizados)
INSERT INTO public.auditoria (id, id_certificado, id_tipo_auditoria, id_metodologia, fecha_programacion) VALUES
    (
        '80000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000005', -- Renovación
        'c0000000-0000-0000-0000-000000000001', -- Presencial
        CURRENT_DATE + INTERVAL '10 days'
    )
ON CONFLICT (id) DO NOTHING;

-- 20. Equipo Evaluador Asignado
INSERT INTO public.equipo_auditor (id_auditoria, id_auditor, rol_auditor) VALUES
    ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'AUDITOR_LIDER')
ON CONFLICT (id_auditoria, id_auditor) DO NOTHING;

-- 21. Sitios en Alcance de la Auditoría
INSERT INTO public.sitios_por_auditoria (id, id_auditoria, id_sitio) VALUES
    ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001')
ON CONFLICT (id_auditoria, id_sitio) DO NOTHING;

-- 22. Hallazgos de Campo
INSERT INTO public.hallazgo (id, id_auditoria, id_requisito, id_proceso, tipo, descripcion, evidencia, cerrado) VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000085',
        '60000000-0000-0000-0000-000000000001',
        'NC_MENOR',
        'Descalibración en pie de rey en la línea 2 de fundición.',
        'Registro fotográfico de instrumento CAL-09 sin verificación.',
        FALSE
    )
ON CONFLICT (id) DO NOTHING;