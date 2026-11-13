-- ============================================================================
-- FILE 1: 01_CREACION.SQL (Fase 1: Infraestructura Base, Auth, Audit Log + DDL)
-- ============================================================================

-- 1. Extensiones PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- 2. Tipos Enumerados (aislados en esquema public)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'user_status'
    ) THEN
        CREATE TYPE public.user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'user_role'
    ) THEN
        CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WORKER', 'AUDITOR', 'CLIENT');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'tipo_hallazgo'
    ) THEN
        CREATE TYPE public.tipo_hallazgo AS ENUM ('NC_MAYOR', 'NC_MENOR', 'OBSERVACION', 'OPORTUNIDAD_MEJORA');
    END IF;
END $$;

-- 3. Perfiles de Usuario y Máquina de Estados (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    role public.user_role NOT NULL DEFAULT 'CLIENT',
    status public.user_status NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disparador de Autoregisto en auth.users:
--   * CLIENT -> APPROVED automático
--   * ADMIN / WORKER / AUDITOR -> PENDING obligatorio (aprobación administrativa)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_raw_role TEXT;
    v_role public.user_role;
    v_status public.user_status;
    v_nombre VARCHAR(150);
BEGIN
    v_raw_role := UPPER(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''));

    BEGIN
        v_role := COALESCE(v_raw_role::public.user_role, 'CLIENT');
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_role := 'CLIENT';
    END;

    IF v_role = 'CLIENT' THEN
        v_status := 'APPROVED';
    ELSE
        v_status := 'PENDING';
    END IF;

    v_nombre := LEFT(
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''),
            NEW.email,
            'Usuario'
        ),
        150
    );

    INSERT INTO public.profiles (id, nombre, role, status)
    VALUES (NEW.id, v_nombre, v_role, v_status)
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dominio 1: Catálogos Base, Normas, Acreditación y Competencias
CREATE TABLE IF NOT EXISTS norma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    esquema VARCHAR(50) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    estatus VARCHAR(50) NOT NULL DEFAULT 'Vigente' CHECK (estatus IN ('Vigente', 'En Revisión', 'Obsoleta')),
    fecha_publicacion DATE,
    norma VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE OR REPLACE FUNCTION public.fn_norma_sync_codigo_titulo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.codigo IS NULL OR TRIM(NEW.codigo) = '' THEN
        NEW.codigo := COALESCE(NULLIF(NEW.norma, ''), 'NORMA-DEF');
    END IF;
    IF NEW.norma IS NULL OR TRIM(NEW.norma) = '' THEN
        NEW.norma := NEW.codigo;
    END IF;
    IF NEW.titulo IS NULL OR TRIM(NEW.titulo) = '' THEN
        NEW.titulo := NEW.norma;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_norma_sync_codigo_titulo ON public.norma;
CREATE TRIGGER trg_norma_sync_codigo_titulo
    BEFORE INSERT OR UPDATE ON public.norma
    FOR EACH ROW EXECUTE FUNCTION public.fn_norma_sync_codigo_titulo();

CREATE TABLE IF NOT EXISTS requisito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE CASCADE,
    id_requisito_padre UUID REFERENCES requisito(id) ON DELETE RESTRICT,
    codigo VARCHAR(30) NOT NULL,
    ruta_materializada LTREE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS sector_iaf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS subsector_iaf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sector_iaf UUID NOT NULL REFERENCES sector_iaf(id) ON DELETE RESTRICT,
    codigo VARCHAR(10) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria_riesgo VARCHAR(20) NOT NULL DEFAULT 'MEDIO' CHECK (categoria_riesgo IN ('ALTO', 'MEDIO', 'BAJO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS organismo_acreditacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    sitio_web VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS acreditacion_norma_iaf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_organismo UUID NOT NULL REFERENCES organismo_acreditacion(id) ON DELETE CASCADE,
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE CASCADE,
    id_sector_iaf UUID REFERENCES sector_iaf(id) ON DELETE SET NULL,
    numero_acreditacion VARCHAR(100) NOT NULL,
    fecha_concesion DATE NOT NULL,
    fecha_vencimiento DATE,
    estatus VARCHAR(30) NOT NULL DEFAULT 'Activa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS estatus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estatus VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS tipo_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS metodologia_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metodologia VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS auditor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS norma_auditor (
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE CASCADE,
    PRIMARY KEY (id_auditor, id_norma)
);

CREATE TABLE IF NOT EXISTS sector_iaf_auditor (
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    id_sector_iaf UUID NOT NULL REFERENCES sector_iaf(id) ON DELETE CASCADE,
    PRIMARY KEY (id_auditor, id_sector_iaf)
);

CREATE TABLE IF NOT EXISTS subsector_iaf_auditor (
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    id_subsector_iaf UUID NOT NULL REFERENCES subsector_iaf(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_auditor, id_subsector_iaf)
);

-- Dominio 2: Organizaciones, Certificados, Sitios, Procesos y Acceso Cliente
CREATE TABLE IF NOT EXISTS organizacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    rif VARCHAR(50),
    direccion_fiscal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS client_organization_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    id_organizacion UUID NOT NULL REFERENCES public.organizacion(id) ON DELETE CASCADE,
    estado public.user_status NOT NULL DEFAULT 'PENDING',
    aprobado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_respuesta TIMESTAMPTZ,
    motivo_rechazo TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_usuario_organizacion UNIQUE (id_usuario, id_organizacion)
);

CREATE TABLE IF NOT EXISTS certificado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE RESTRICT,
    id_estatus UUID NOT NULL REFERENCES estatus(id) ON DELETE RESTRICT,
    id_sector_iaf UUID NOT NULL REFERENCES sector_iaf(id) ON DELETE RESTRICT,
    id_organizacion UUID NOT NULL REFERENCES organizacion(id) ON DELETE RESTRICT,
    numero_certificado VARCHAR(100) NOT NULL,
    alcance VARCHAR(1000) NOT NULL DEFAULT '',
    multisitio BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS sitio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    numero_sitio INTEGER NOT NULL CHECK (numero_sitio >= 0),
    nombre_sitio VARCHAR(150) NOT NULL,
    direccion_sitio TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS proceso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    nombre_proceso VARCHAR(150) NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'Medular' CONSTRAINT check_proceso_tipo CHECK (tipo IN ('Estratégico', 'Medular', 'De Apoyo', 'Otro')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS requisitos_por_proceso (
    id_proceso UUID NOT NULL REFERENCES proceso(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES requisito(id) ON DELETE CASCADE,
    PRIMARY KEY (id_proceso, id_requisito)
);

CREATE TABLE IF NOT EXISTS requisitos_no_aplicables_certificado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES requisito(id) ON DELETE CASCADE,
    justificacion TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS turno (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS turnos_por_sitio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitio UUID NOT NULL REFERENCES sitio(id) ON DELETE CASCADE,
    id_turno UUID NOT NULL REFERENCES turno(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Dominio 3: Planificación y Ejecución de Auditorías
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE RESTRICT,
    id_tipo_auditoria UUID NOT NULL REFERENCES tipo_auditoria(id) ON DELETE RESTRICT,
    id_metodologia UUID NOT NULL REFERENCES metodologia_auditoria(id) ON DELETE RESTRICT,
    fecha_programacion DATE NOT NULL,
    fecha_reprogramacion DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS comentarios_por_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS equipo_auditor (
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    rol_auditor VARCHAR(50) NOT NULL DEFAULT 'AUDITOR',
    PRIMARY KEY (id_auditoria, id_auditor)
);

CREATE TABLE IF NOT EXISTS sitios_por_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    id_sitio UUID NOT NULL REFERENCES sitio(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS turnos_sitio_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitios_por_auditoria UUID NOT NULL REFERENCES sitios_por_auditoria(id) ON DELETE CASCADE,
    id_turnos_por_sitio UUID NOT NULL REFERENCES turnos_por_sitio(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS procesos_sitio_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitios_por_auditoria UUID NOT NULL REFERENCES sitios_por_auditoria(id) ON DELETE CASCADE,
    id_proceso UUID NOT NULL REFERENCES proceso(id) ON DELETE RESTRICT,
    id_turnos_sitio_auditoria UUID NOT NULL REFERENCES turnos_sitio_auditoria(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hallazgo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_auditoria UUID NOT NULL REFERENCES public.auditoria(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES public.requisito(id) ON DELETE RESTRICT,
    id_proceso UUID NOT NULL REFERENCES public.proceso(id) ON DELETE RESTRICT,
    tipo public.tipo_hallazgo NOT NULL,
    descripcion TEXT NOT NULL,
    evidencia TEXT,
    cerrado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delete_reason TEXT
);

-- Triggers de Integridad Subconjunto ISO/IEC 17021-1
CREATE OR REPLACE FUNCTION public.fn_validar_sitio_auditoria_certificado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_cert_auditoria UUID;
    v_cert_sitio UUID;
BEGIN
    SELECT id_certificado INTO v_cert_auditoria FROM public.auditoria WHERE id = NEW.id_auditoria;
    SELECT id_certificado INTO v_cert_sitio FROM public.sitio WHERE id = NEW.id_sitio;

    IF v_cert_auditoria IS NULL OR v_cert_sitio IS NULL OR v_cert_auditoria IS DISTINCT FROM v_cert_sitio THEN
        RAISE EXCEPTION 'Violación de Integridad ISO/IEC 17021-1: El sitio % pertenece al certificado %, incoherente con el certificado % de la auditoría.',
            NEW.id_sitio, v_cert_sitio, v_cert_auditoria;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_sitio_auditoria_certificado ON public.sitios_por_auditoria;
CREATE TRIGGER trg_validar_sitio_auditoria_certificado
    BEFORE INSERT OR UPDATE ON public.sitios_por_auditoria
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_sitio_auditoria_certificado();

CREATE OR REPLACE FUNCTION public.fn_validar_turno_sitio_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_sitio_aud UUID;
    v_sitio_turno UUID;
BEGIN
    SELECT id_sitio INTO v_sitio_aud FROM public.sitios_por_auditoria WHERE id = NEW.id_sitios_por_auditoria;
    SELECT id_sitio INTO v_sitio_turno FROM public.turnos_por_sitio WHERE id = NEW.id_turnos_por_sitio;

    IF v_sitio_aud IS NULL OR v_sitio_turno IS NULL OR v_sitio_aud IS DISTINCT FROM v_sitio_turno THEN
        RAISE EXCEPTION 'Violación de Integridad ISO/IEC 17021-1: El turno por sitio % pertenece al sitio %, incoherente con el sitio % asignado a la auditoría.',
            NEW.id_turnos_por_sitio, v_sitio_turno, v_sitio_aud;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_turno_sitio_auditoria ON public.turnos_sitio_auditoria;
CREATE TRIGGER trg_validar_turno_sitio_auditoria
    BEFORE INSERT OR UPDATE ON public.turnos_sitio_auditoria
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_turno_sitio_auditoria();

CREATE OR REPLACE FUNCTION public.fn_validar_proceso_sitio_auditoria_certificado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_cert_auditoria UUID;
    v_cert_proceso UUID;
    v_sitio_aud_turno UUID;
BEGIN
    SELECT a.id_certificado INTO v_cert_auditoria
    FROM public.sitios_por_auditoria sa
    JOIN public.auditoria a ON sa.id_auditoria = a.id
    WHERE sa.id = NEW.id_sitios_por_auditoria;

    SELECT id_certificado INTO v_cert_proceso FROM public.proceso WHERE id = NEW.id_proceso;

    IF v_cert_auditoria IS NULL OR v_cert_proceso IS NULL OR v_cert_auditoria IS DISTINCT FROM v_cert_proceso THEN
        RAISE EXCEPTION 'Violación de Integridad ISO/IEC 17021-1: El proceso % pertenece al certificado %, incoherente con el certificado % de la auditoría.',
            NEW.id_proceso, v_cert_proceso, v_cert_auditoria;
    END IF;

    SELECT id_sitios_por_auditoria INTO v_sitio_aud_turno
    FROM public.turnos_sitio_auditoria
    WHERE id = NEW.id_turnos_sitio_auditoria;

    IF v_sitio_aud_turno IS DISTINCT FROM NEW.id_sitios_por_auditoria THEN
        RAISE EXCEPTION 'Violación de Integridad ISO/IEC 17021-1: El turno de auditoría % no corresponde al sitio de auditoría %.',
            NEW.id_turnos_sitio_auditoria, NEW.id_sitios_por_auditoria;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_proceso_sitio_auditoria_certificado ON public.procesos_sitio_auditoria;
CREATE TRIGGER trg_validar_proceso_sitio_auditoria_certificado
    BEFORE INSERT OR UPDATE ON public.procesos_sitio_auditoria
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_proceso_sitio_auditoria_certificado();

-- Sistema de Audit Log Inmutable
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantía de inmutabilidad en capa de datos (bloqueo de UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Violación de Inmutabilidad: no se permiten operaciones % sobre public.audit_log.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public.audit_log;
CREATE TRIGGER trg_audit_log_immutable
    BEFORE UPDATE OR DELETE ON public.audit_log
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    current_user_id UUID;
    target_record_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF (TG_OP = 'DELETE') THEN
        target_record_id := OLD.id;
        INSERT INTO public.audit_log (table_name, operation, record_id, old_data, performed_by)
        VALUES (TG_TABLE_NAME, TG_OP, target_record_id, to_jsonb(OLD), current_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        target_record_id := NEW.id;
        INSERT INTO public.audit_log (table_name, operation, record_id, old_data, new_data, performed_by)
        VALUES (TG_TABLE_NAME, TG_OP, target_record_id, to_jsonb(OLD), to_jsonb(NEW), current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        target_record_id := NEW.id;
        INSERT INTO public.audit_log (table_name, operation, record_id, new_data, performed_by)
        VALUES (TG_TABLE_NAME, TG_OP, target_record_id, to_jsonb(NEW), current_user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Triggers de Auditoría Inmutable para Entidades Principales y Secundarias
DROP TRIGGER IF EXISTS audit_organizacion_trigger ON public.organizacion;
CREATE TRIGGER audit_organizacion_trigger AFTER INSERT OR UPDATE OR DELETE ON public.organizacion FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_certificado_trigger ON public.certificado;
CREATE TRIGGER audit_certificado_trigger AFTER INSERT OR UPDATE OR DELETE ON public.certificado FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_sitio_trigger ON public.sitio;
CREATE TRIGGER audit_sitio_trigger AFTER INSERT OR UPDATE OR DELETE ON public.sitio FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_proceso_trigger ON public.proceso;
CREATE TRIGGER audit_proceso_trigger AFTER INSERT OR UPDATE OR DELETE ON public.proceso FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_turno_trigger ON public.turno;
CREATE TRIGGER audit_turno_trigger AFTER INSERT OR UPDATE OR DELETE ON public.turno FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_auditoria_trigger ON public.auditoria;
CREATE TRIGGER audit_auditoria_trigger AFTER INSERT OR UPDATE OR DELETE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_client_access_trigger ON public.client_organization_access;
CREATE TRIGGER audit_client_access_trigger AFTER INSERT OR UPDATE OR DELETE ON public.client_organization_access FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_subsector_iaf_trigger ON public.subsector_iaf;
CREATE TRIGGER audit_subsector_iaf_trigger AFTER INSERT OR UPDATE OR DELETE ON public.subsector_iaf FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_organismo_acreditacion_trigger ON public.organismo_acreditacion;
CREATE TRIGGER audit_organismo_acreditacion_trigger AFTER INSERT OR UPDATE OR DELETE ON public.organismo_acreditacion FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_acreditacion_norma_iaf_trigger ON public.acreditacion_norma_iaf;
CREATE TRIGGER audit_acreditacion_norma_iaf_trigger AFTER INSERT OR UPDATE OR DELETE ON public.acreditacion_norma_iaf FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_req_no_aplicables_trigger ON public.requisitos_no_aplicables_certificado;
CREATE TRIGGER audit_req_no_aplicables_trigger AFTER INSERT OR UPDATE OR DELETE ON public.requisitos_no_aplicables_certificado FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_norma_trigger ON public.norma;
CREATE TRIGGER audit_norma_trigger AFTER INSERT OR UPDATE OR DELETE ON public.norma FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_hallazgo_trigger ON public.hallazgo;
CREATE TRIGGER audit_hallazgo_trigger AFTER INSERT OR UPDATE OR DELETE ON public.hallazgo FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Actualización Automática de Timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizacion_modtime ON public.organizacion;
CREATE TRIGGER update_organizacion_modtime BEFORE UPDATE ON public.organizacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_norma_modtime ON public.norma;
CREATE TRIGGER update_norma_modtime BEFORE UPDATE ON public.norma FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_requisito_modtime ON public.requisito;
CREATE TRIGGER update_requisito_modtime BEFORE UPDATE ON public.requisito FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sector_iaf_modtime ON public.sector_iaf;
CREATE TRIGGER update_sector_iaf_modtime BEFORE UPDATE ON public.sector_iaf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subsector_iaf_modtime ON public.subsector_iaf;
CREATE TRIGGER update_subsector_iaf_modtime BEFORE UPDATE ON public.subsector_iaf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organismo_acreditacion_modtime ON public.organismo_acreditacion;
CREATE TRIGGER update_organismo_acreditacion_modtime BEFORE UPDATE ON public.organismo_acreditacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_acreditacion_norma_iaf_modtime ON public.acreditacion_norma_iaf;
CREATE TRIGGER update_acreditacion_norma_iaf_modtime BEFORE UPDATE ON public.acreditacion_norma_iaf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_requisitos_no_aplicables_modtime ON public.requisitos_no_aplicables_certificado;
CREATE TRIGGER update_requisitos_no_aplicables_modtime BEFORE UPDATE ON public.requisitos_no_aplicables_certificado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_estatus_modtime ON public.estatus;
CREATE TRIGGER update_estatus_modtime BEFORE UPDATE ON public.estatus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tipo_auditoria_modtime ON public.tipo_auditoria;
CREATE TRIGGER update_tipo_auditoria_modtime BEFORE UPDATE ON public.tipo_auditoria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_metodologia_auditoria_modtime ON public.metodologia_auditoria;
CREATE TRIGGER update_metodologia_auditoria_modtime BEFORE UPDATE ON public.metodologia_auditoria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auditor_modtime ON public.auditor;
CREATE TRIGGER update_auditor_modtime BEFORE UPDATE ON public.auditor FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_certificado_modtime ON public.certificado;
CREATE TRIGGER update_certificado_modtime BEFORE UPDATE ON public.certificado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sitio_modtime ON public.sitio;
CREATE TRIGGER update_sitio_modtime BEFORE UPDATE ON public.sitio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_proceso_modtime ON public.proceso;
CREATE TRIGGER update_proceso_modtime BEFORE UPDATE ON public.proceso FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_turno_modtime ON public.turno;
CREATE TRIGGER update_turno_modtime BEFORE UPDATE ON public.turno FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auditoria_modtime ON public.auditoria;
CREATE TRIGGER update_auditoria_modtime BEFORE UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hallazgo_modtime ON public.hallazgo;
CREATE TRIGGER update_hallazgo_modtime BEFORE UPDATE ON public.hallazgo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Fase 1.1: Columnas Soft-Delete Idempotentes (para migraciones en vivo)
-- ============================================================================
DO $$
DECLARE
    v_tbl TEXT;
    v_core_tables TEXT[] := ARRAY[
        'norma', 'requisito', 'sector_iaf', 'subsector_iaf',
        'organismo_acreditacion', 'acreditacion_norma_iaf',
        'estatus', 'tipo_auditoria', 'metodologia_auditoria', 'auditor',
        'organizacion', 'certificado', 'sitio', 'proceso', 'turno',
        'auditoria', 'hallazgo'
    ];
    v_child_tables TEXT[] := ARRAY[
        'requisitos_no_aplicables_certificado', 'turnos_por_sitio',
        'comentarios_por_auditoria', 'sitios_por_auditoria',
        'turnos_sitio_auditoria', 'procesos_sitio_auditoria',
        'client_organization_access'
    ];
BEGIN
    FOREACH v_tbl IN ARRAY v_core_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', v_tbl);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL', v_tbl);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS delete_reason TEXT', v_tbl);
    END LOOP;

    FOREACH v_tbl IN ARRAY v_child_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL', v_tbl);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL', v_tbl);
    END LOOP;
END $$;

-- ============================================================================
-- Fase 1.1: Prevención de Hard-Delete, Sincronización Soft-Delete & Audit Log
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operación bloqueada: la tabla public.% utiliza retención lógica (soft-delete). Actualice deleted_at en lugar de ejecutar DELETE.', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_soft_delete_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        NEW.deleted_by := COALESCE(NEW.deleted_by, auth.uid());
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        NEW.deleted_by := NULL;
        NEW.delete_reason := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_soft_delete_child_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        NEW.deleted_by := COALESCE(NEW.deleted_by, auth.uid());
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        NEW.deleted_by := NULL;
    END IF;
    RETURN NEW;
END;
$$;

-- Guardia RBAC para public.profiles (impide auto-escalamiento de role o status)
CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_protect_profile_rbac_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_jwt_role TEXT;
BEGIN
    v_jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '');

    -- Permite ejecución administrativa directa en migraciones/semilleros (postgres / service_role sin JWT de usuario)
    IF auth.uid() IS NULL AND (
        session_user IN ('postgres', 'supabase_admin', 'service_role')
        OR v_jwt_role = 'service_role'
    ) THEN
        RETURN NEW;
    END IF;

    IF NOT public.is_approved_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Violación RBAC: solo un administrador aprobado puede modificar role o status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_rbac_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_rbac_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_profile_rbac_fields();

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================================
-- Fase 1.1: RPC de Dependencias Activas y Guardia de Archival en Padres
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_archive_dependency_summary(p_table TEXT, p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deps JSONB := '[]'::jsonb;
    v_total INTEGER := 0;
    v_count INTEGER := 0;
    v_sitio_numero INTEGER;
    v_sitio_cert_id UUID;
BEGIN
    CASE p_table
        WHEN 'organizacion' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.certificado WHERE id_organizacion = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'certificado', 'label', 'Certificados activos', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'certificado' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.sitio WHERE id_certificado = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'sitio', 'label', 'Sitios operativos', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.proceso WHERE id_certificado = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'proceso', 'label', 'Procesos operativos', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.auditoria WHERE id_certificado = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'auditoria', 'label', 'Auditorías vinculadas', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.requisitos_no_aplicables_certificado WHERE id_certificado = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'requisitos_no_aplicables_certificado', 'label', 'Exclusiones normativas', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'sitio' THEN
            SELECT numero_sitio, id_certificado INTO v_sitio_numero, v_sitio_cert_id
            FROM public.sitio WHERE id = p_record_id;

            IF v_sitio_numero = 0 AND v_sitio_cert_id IS NOT NULL THEN
                SELECT COUNT(*)::INTEGER INTO v_count
                FROM public.sitio
                WHERE id_certificado = v_sitio_cert_id
                  AND id <> p_record_id
                  AND numero_sitio > 0
                  AND deleted_at IS NULL;
                IF v_count > 0 THEN
                    v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'sitio', 'label', 'Sedes secundarias dependientes de Sitio 0', 'count', v_count));
                    v_total := v_total + v_count;
                END IF;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.sitios_por_auditoria WHERE id_sitio = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'sitios_por_auditoria', 'label', 'Auditorías asignadas al sitio', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.turnos_por_sitio WHERE id_sitio = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'turnos_por_sitio', 'label', 'Turnos asignados al sitio', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'proceso' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.hallazgo WHERE id_proceso = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'hallazgo', 'label', 'Hallazgos vinculados al proceso', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.procesos_sitio_auditoria WHERE id_proceso = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'procesos_sitio_auditoria', 'label', 'Auditorías programadas para el proceso', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'turno' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.turnos_por_sitio WHERE id_turno = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'turnos_por_sitio', 'label', 'Sedes con este turno asignado', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'auditoria' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.hallazgo WHERE id_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'hallazgo', 'label', 'Hallazgos de la auditoría', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.sitios_por_auditoria WHERE id_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'sitios_por_auditoria', 'label', 'Sitios en el alcance de la auditoría', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.comentarios_por_auditoria WHERE id_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'comentarios_por_auditoria', 'label', 'Comentarios de seguimiento', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'norma' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.certificado WHERE id_norma = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'certificado', 'label', 'Certificados emitidos bajo la norma', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.requisito WHERE id_norma = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'requisito', 'label', 'Cláusulas de la norma', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.acreditacion_norma_iaf WHERE id_norma = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'acreditacion_norma_iaf', 'label', 'Acreditaciones vinculadas', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'requisito' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.requisito WHERE id_requisito_padre = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'requisito', 'label', 'Sub-cláusulas dependientes', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.hallazgo WHERE id_requisito = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'hallazgo', 'label', 'Hallazgos vinculados a la cláusula', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.requisitos_no_aplicables_certificado WHERE id_requisito = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'requisitos_no_aplicables_certificado', 'label', 'Exclusiones en certificados', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'sector_iaf' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.subsector_iaf WHERE id_sector_iaf = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'subsector_iaf', 'label', 'Sub-sectores IAF', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.certificado WHERE id_sector_iaf = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'certificado', 'label', 'Certificados en este sector', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.acreditacion_norma_iaf WHERE id_sector_iaf = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'acreditacion_norma_iaf', 'label', 'Acreditaciones en este sector', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'organismo_acreditacion' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.acreditacion_norma_iaf WHERE id_organismo = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'acreditacion_norma_iaf', 'label', 'Acreditaciones otorgadas', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'estatus' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.certificado WHERE id_estatus = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'certificado', 'label', 'Certificados con este estatus', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'tipo_auditoria' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.auditoria WHERE id_tipo_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'auditoria', 'label', 'Auditorías con este tipo', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'metodologia_auditoria' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.auditoria WHERE id_metodologia = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'auditoria', 'label', 'Auditorías con esta metodología', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'sitios_por_auditoria' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.turnos_sitio_auditoria WHERE id_sitios_por_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'turnos_sitio_auditoria', 'label', 'Turnos programados en el sitio de auditoría', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.procesos_sitio_auditoria WHERE id_sitios_por_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'procesos_sitio_auditoria', 'label', 'Procesos programados en el sitio de auditoría', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'turnos_por_sitio' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.turnos_sitio_auditoria WHERE id_turnos_por_sitio = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'turnos_sitio_auditoria', 'label', 'Auditorías programadas en este turno del sitio', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        WHEN 'turnos_sitio_auditoria' THEN
            SELECT COUNT(*)::INTEGER INTO v_count
            FROM public.procesos_sitio_auditoria WHERE id_turnos_sitio_auditoria = p_record_id AND deleted_at IS NULL;
            IF v_count > 0 THEN
                v_deps := v_deps || jsonb_build_array(jsonb_build_object('table', 'procesos_sitio_auditoria', 'label', 'Procesos vinculados a este turno de auditoría', 'count', v_count));
                v_total := v_total + v_count;
            END IF;

        ELSE
            NULL;
    END CASE;

    RETURN jsonb_build_object(
        'can_archive', v_total = 0,
        'total_active_dependencies', v_total,
        'dependencies', v_deps
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_archive_dependency_summary(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_guard_parent_archival()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_summary JSONB;
    v_total INTEGER;
    v_first_label TEXT;
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        v_summary := public.get_archive_dependency_summary(TG_TABLE_NAME, NEW.id);
        v_total := COALESCE((v_summary->>'total_active_dependencies')::INTEGER, 0);
        IF v_total > 0 THEN
            v_first_label := COALESCE(v_summary->'dependencies'->0->>'label', 'registros hijos activos');
            RAISE EXCEPTION 'Operación bloqueada: no se puede archivar el registro de public.% porque tiene % dependencia(s) activa(s) (ej. %). Archive o desvincule primero los registros dependientes.',
                TG_TABLE_NAME, v_total, v_first_label;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- Fase 1.1: Asociación Masiva de Triggers Soft-Delete, Guardia y Audit Log
-- ============================================================================
DO $$
DECLARE
    v_tbl TEXT;
    v_core_tables TEXT[] := ARRAY[
        'norma', 'requisito', 'sector_iaf', 'subsector_iaf',
        'organismo_acreditacion', 'acreditacion_norma_iaf',
        'estatus', 'tipo_auditoria', 'metodologia_auditoria', 'auditor',
        'organizacion', 'certificado', 'sitio', 'proceso', 'turno',
        'auditoria', 'hallazgo'
    ];
    v_child_tables TEXT[] := ARRAY[
        'requisitos_no_aplicables_certificado', 'turnos_por_sitio',
        'comentarios_por_auditoria', 'sitios_por_auditoria',
        'turnos_sitio_auditoria', 'procesos_sitio_auditoria'
    ];
    v_guarded_parents TEXT[] := ARRAY[
        'organizacion', 'certificado', 'norma', 'requisito',
        'sector_iaf', 'organismo_acreditacion', 'sitio', 'proceso',
        'turno', 'auditoria', 'estatus', 'tipo_auditoria',
        'metodologia_auditoria', 'sitios_por_auditoria',
        'turnos_por_sitio', 'turnos_sitio_auditoria'
    ];
    v_extra_audit_tables TEXT[] := ARRAY[
        'requisito', 'sector_iaf', 'estatus', 'tipo_auditoria',
        'metodologia_auditoria', 'auditor',
        'turnos_por_sitio', 'comentarios_por_auditoria',
        'sitios_por_auditoria', 'turnos_sitio_auditoria',
        'procesos_sitio_auditoria'
    ];
BEGIN
    FOREACH v_tbl IN ARRAY v_core_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_hard_delete_%I ON public.%I', v_tbl, v_tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_prevent_hard_delete_%I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_hard_delete()',
            v_tbl, v_tbl
        );

        EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_soft_delete_%I ON public.%I', v_tbl, v_tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_sync_soft_delete_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_sync_soft_delete_metadata()',
            v_tbl, v_tbl
        );
    END LOOP;

    FOREACH v_tbl IN ARRAY v_child_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_hard_delete_%I ON public.%I', v_tbl, v_tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_prevent_hard_delete_%I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_hard_delete()',
            v_tbl, v_tbl
        );

        EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_soft_delete_%I ON public.%I', v_tbl, v_tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_sync_soft_delete_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_sync_soft_delete_child_metadata()',
            v_tbl, v_tbl
        );
    END LOOP;

    DROP TRIGGER IF EXISTS trg_sync_soft_delete_client_organization_access ON public.client_organization_access;
    CREATE TRIGGER trg_sync_soft_delete_client_organization_access
        BEFORE UPDATE ON public.client_organization_access
        FOR EACH ROW EXECUTE FUNCTION public.fn_sync_soft_delete_child_metadata();

    FOREACH v_tbl IN ARRAY v_guarded_parents LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_archival_%I ON public.%I', v_tbl, v_tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_guard_archival_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_guard_parent_archival()',
            v_tbl, v_tbl
        );
    END LOOP;

    FOREACH v_tbl IN ARRAY v_extra_audit_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_trigger ON public.%I', v_tbl, v_tbl);
        EXECUTE format(
            'CREATE TRIGGER audit_%I_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()',
            v_tbl, v_tbl
        );
    END LOOP;
END $$;