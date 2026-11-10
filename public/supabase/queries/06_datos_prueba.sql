-- ============================================================================
-- FILE 6: 06_DATOS_PRUEBA.SQL (Semillero Idempotente y Solicitudes Aprobadas)
-- ============================================================================

INSERT INTO public.estatus (id, estatus) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ACTIVO'),
    ('a0000000-0000-0000-0000-000000000002', 'EN_PROCESO'),
    ('a0000000-0000-0000-0000-000000000003', 'SUSPENDIDO'),
    ('a0000000-0000-0000-0000-000000000004', 'CANCELADO'),
    ('a0000000-0000-0000-0000-000000000005', 'PLANIFICADA'),
    ('a0000000-0000-0000-0000-000000000006', 'EN_EJECUCION'),
    ('a0000000-0000-0000-0000-000000000007', 'CERRADA')
ON CONFLICT (estatus) DO UPDATE SET updated_at = NOW();

INSERT INTO public.tipo_auditoria (id, tipo) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'ETAPA_1'),
    ('b0000000-0000-0000-0000-000000000002', 'ETAPA_2'),
    ('b0000000-0000-0000-0000-000000000003', 'VIGILANCIA_1'),
    ('b0000000-0000-0000-0000-000000000004', 'VIGILANCIA_2'),
    ('b0000000-0000-0000-0000-000000000005', 'RECERTIFICACION'),
    ('b0000000-0000-0000-0000-000000000006', 'EXTRAORDINARIA')
ON CONFLICT (tipo) DO UPDATE SET updated_at = NOW();

INSERT INTO public.metodologia_auditoria (id, metodologia) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'PRESENCIAL'),
    ('c0000000-0000-0000-0000-000000000002', 'REMOTA'),
    ('c0000000-0000-0000-0000-000000000003', 'HIBRIDA')
ON CONFLICT (metodologia) DO UPDATE SET updated_at = NOW();

INSERT INTO public.sector_iaf (id, sector) VALUES
    ('d0000000-0000-0000-0000-000000000014', 14),
    ('d0000000-0000-0000-0000-000000000017', 17),
    ('d0000000-0000-0000-0000-000000000028', 28),
    ('d0000000-0000-0000-0000-000000000033', 33),
    ('d0000000-0000-0000-0000-000000000035', 35)
ON CONFLICT (sector) DO UPDATE SET updated_at = NOW();

INSERT INTO public.norma (id, esquema, norma) VALUES
    ('e0000000-0000-0000-0000-000000009001', 'SGC - Calidad', 'ISO 9001:2015'),
    ('e0000000-0000-0000-0000-000000014001', 'SGA - Gestión Ambiental', 'ISO 14001:2015'),
    ('e0000000-0000-0000-0000-000000045001', 'SST - Seguridad y Salud Laboral', 'ISO 45001:2018'),
    ('e0000000-0000-0000-0000-000000027001', 'SGSI - Seguridad de la Información', 'ISO/IEC 27001:2022')
ON CONFLICT (norma) DO UPDATE SET esquema = EXCLUDED.esquema, updated_at = NOW();

INSERT INTO public.requisito (id, id_norma, id_requisito_padre, codigo, ruta_materializada) VALUES
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000009001', NULL, '4', '4'::ltree),
    ('f0000000-0000-0000-0000-000000000041', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000004', '4.1', '4.4_1'::ltree),
    ('f0000000-0000-0000-0000-000000000042', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000004', '4.2', '4.4_2'::ltree),
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000009001', NULL, '5', '5'::ltree),
    ('f0000000-0000-0000-0000-000000000051', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000005', '5.1', '5.5_1'::ltree),
    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000009001', NULL, '8', '8'::ltree),
    ('f0000000-0000-0000-0000-000000000085', 'e0000000-0000-0000-0000-000000009001', 'f0000000-0000-0000-0000-000000000008', '8.5', '8.8_5'::ltree)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.auditor (id, nombre) VALUES
    ('33333333-3333-3333-3333-333333333333', 'Auditor Técnico (Usuario Registrado)'),
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

INSERT INTO public.organizacion (id, nombre, rif, direccion_fiscal) VALUES
    ('30000000-0000-0000-0000-000000000001', 'Iberometal Componentes S.A.', 'J-30492817-0', 'Zona Industrial Carabobo, Valencia'),
    ('30000000-0000-0000-0000-000000000002', 'CyberCloud Solutions S.L.', 'J-40819234-5', 'Torre David, Chacao, Caracas')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, updated_at = NOW();

-- Solicitud de Acceso Aprobada para el Usuario Cliente
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

INSERT INTO public.certificado (id, id_norma, id_estatus, id_sector_iaf, id_organizacion, numero_certificado, multisitio) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000009001',
        'a0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000017',
        '30000000-0000-0000-0000-000000000001',
        'FN-QMS-2024-001',
        TRUE
    )
ON CONFLICT (numero_certificado) DO NOTHING;

INSERT INTO public.sitio (id, id_certificado, numero_sitio, nombre_sitio, direccion_sitio) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'Planta Valencia', 'Zona Industrial Carabobo')
ON CONFLICT (id_certificado, numero_sitio) DO NOTHING;

INSERT INTO public.turno (id, hora_entrada, hora_salida) VALUES
    ('70000000-0000-0000-0000-000000000001', '07:00:00', '15:00:00'),
    ('70000000-0000-0000-0000-000000000002', '15:00:00', '23:00:00')
ON CONFLICT (hora_entrada, hora_salida) DO NOTHING;

INSERT INTO public.turnos_por_sitio (id, id_sitio, id_turno) VALUES
    ('71000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001'),
    ('71000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002')
ON CONFLICT (id_sitio, id_turno) DO NOTHING;

INSERT INTO public.proceso (id, id_certificado, nombre_proceso) VALUES
    ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Troquelado y Fundición')
ON CONFLICT (id) DO NOTHING;

-- Mapeo de requisitos cubiertos (propaga a cláusulas padre 4 y 8) y exclusión formal (5.1)
INSERT INTO public.requisitos_por_proceso (id_proceso, id_requisito) VALUES
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000041'),
    ('60000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000085')
ON CONFLICT (id_proceso, id_requisito) DO NOTHING;

INSERT INTO public.requisitos_no_aplicables_certificado (id_certificado, id_requisito) VALUES
    ('40000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000051')
ON CONFLICT (id_certificado, id_requisito) DO NOTHING;

INSERT INTO public.auditoria (id, id_certificado, id_tipo_auditoria, id_metodologia, fecha_programacion) VALUES
    (
        '80000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000001',
        CURRENT_DATE + INTERVAL '10 days'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipo_auditor (id_auditoria, id_auditor, rol_auditor) VALUES
    ('80000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'AUDITOR_LIDER')
ON CONFLICT (id_auditoria, id_auditor) DO NOTHING;

INSERT INTO public.sitios_por_auditoria (id, id_auditoria, id_sitio) VALUES
    ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001')
ON CONFLICT (id_auditoria, id_sitio) DO NOTHING;

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