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

-- Dominio 1: Catálogos Base y Competencias
CREATE TABLE IF NOT EXISTS norma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    esquema VARCHAR(50) NOT NULL,
    norma VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requisito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE CASCADE,
    id_requisito_padre UUID REFERENCES requisito(id) ON DELETE RESTRICT,
    codigo VARCHAR(30) NOT NULL,
    ruta_materializada LTREE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_norma_requisito_codigo UNIQUE (id_norma, codigo)
);

CREATE TABLE IF NOT EXISTS sector_iaf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estatus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estatus VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipo_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metodologia_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metodologia VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Dominio 2: Organizaciones, Certificados, Sitios, Procesos y Acceso Cliente
CREATE TABLE IF NOT EXISTS organizacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    rif VARCHAR(50),
    direccion_fiscal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    CONSTRAINT unique_usuario_organizacion UNIQUE (id_usuario, id_organizacion)
);

CREATE TABLE IF NOT EXISTS certificado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE RESTRICT,
    id_estatus UUID NOT NULL REFERENCES estatus(id) ON DELETE RESTRICT,
    id_sector_iaf UUID NOT NULL REFERENCES sector_iaf(id) ON DELETE RESTRICT,
    id_organizacion UUID NOT NULL REFERENCES organizacion(id) ON DELETE RESTRICT,
    numero_certificado VARCHAR(100) NOT NULL UNIQUE,
    multisitio BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sitio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    numero_sitio INTEGER NOT NULL,
    nombre_sitio VARCHAR(150) NOT NULL,
    direccion_sitio TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sitio_certificado UNIQUE (id_certificado, numero_sitio)
);

CREATE TABLE IF NOT EXISTS proceso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    nombre_proceso VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_proceso_certificado UNIQUE (id_certificado, nombre_proceso)
);

CREATE TABLE IF NOT EXISTS requisitos_por_proceso (
    id_proceso UUID NOT NULL REFERENCES proceso(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES requisito(id) ON DELETE CASCADE,
    PRIMARY KEY (id_proceso, id_requisito)
);

CREATE TABLE IF NOT EXISTS requisitos_no_aplicables_certificado (
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES requisito(id) ON DELETE CASCADE,
    PRIMARY KEY (id_certificado, id_requisito)
);

CREATE TABLE IF NOT EXISTS turno (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_horario_turno UNIQUE (hora_entrada, hora_salida)
);

CREATE TABLE IF NOT EXISTS turnos_por_sitio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitio UUID NOT NULL REFERENCES sitio(id) ON DELETE CASCADE,
    id_turno UUID NOT NULL REFERENCES turno(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sitio_turno UNIQUE (id_sitio, id_turno)
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentarios_por_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    CONSTRAINT unique_auditoria_sitio UNIQUE (id_auditoria, id_sitio)
);

CREATE TABLE IF NOT EXISTS turnos_sitio_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitios_por_auditoria UUID NOT NULL REFERENCES sitios_por_auditoria(id) ON DELETE CASCADE,
    id_turnos_por_sitio UUID NOT NULL REFERENCES turnos_por_sitio(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procesos_sitio_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitios_por_auditoria UUID NOT NULL REFERENCES sitios_por_auditoria(id) ON DELETE CASCADE,
    id_proceso UUID NOT NULL REFERENCES proceso(id) ON DELETE RESTRICT,
    id_turnos_sitio_auditoria UUID NOT NULL REFERENCES turnos_sitio_auditoria(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

DROP TRIGGER IF EXISTS audit_organizacion_trigger ON public.organizacion;
CREATE TRIGGER audit_organizacion_trigger AFTER INSERT OR UPDATE OR DELETE ON public.organizacion FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_certificado_trigger ON public.certificado;
CREATE TRIGGER audit_certificado_trigger AFTER INSERT OR UPDATE OR DELETE ON public.certificado FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_auditoria_trigger ON public.auditoria;
CREATE TRIGGER audit_auditoria_trigger AFTER INSERT OR UPDATE OR DELETE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_client_access_trigger ON public.client_organization_access;
CREATE TRIGGER audit_client_access_trigger AFTER INSERT OR UPDATE OR DELETE ON public.client_organization_access FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

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