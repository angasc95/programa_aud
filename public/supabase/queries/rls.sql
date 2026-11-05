-- ============================================================================
-- FILE 4: RLS.SQL (Row Level Security, Data Governance & DCL Privileges)
-- ============================================================================
-- Core Purpose: 
-- 1. Otorgar permisos base de PostgreSQL (GRANT DCL) a los roles de Supabase (anon y authenticated).
--    Sin estos GRANTs, PostgreSQL rechaza la petición con error 42501 antes de evaluar las políticas RLS.
-- 2. Activar Row Level Security (RLS) en todas las tablas sensibles y del catálogo.
-- 3. Definir funciones auxiliares de rol y estado (RBAC con SECURITY DEFINER).
-- 4. Establecer políticas granulares de lectura y mutación para ADMIN, AUDITOR y USER aprobados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. ASIGNACIÓN FUNDAMENTAL DE PRIVILEGIOS DE ESQUEMA Y TABLAS (DCL)
-- ----------------------------------------------------------------------------
-- Crucial: PostgREST se conecta usando los roles de base de datos 'anon' y 'authenticated'.
-- Se deben otorgar los privilegios sobre el esquema public:

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Privilegios completos para usuarios autenticados (el filtrado por fila lo hace RLS):
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- Privilegios de lectura pública para anon (restringido luego por RLS a catálogos públicos):
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon;

-- Configurar privilegios por defecto para cualquier tabla, secuencia o función futura:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. FUNCIONES AUXILIARES DE SEGURIDAD (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
-- Validadoras del rol y estado en profiles, ejecutadas con privilegios del creador
-- para evitar recursión infinita en las políticas RLS.

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'APPROVED';
$$;

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

CREATE OR REPLACE FUNCTION public.is_approved_auditor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ADMIN', 'AUDITOR') AND status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND status = 'APPROVED'
    );
$$;

-- Otorgar ejecución explícita de las funciones de seguridad a anon y authenticated
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_auditor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_user() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. ACTIVACIÓN GLOBAL DE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- Entidades de Negocio y Seguridad
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hallazgo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Entidades Operativas y de Catálogo
ALTER TABLE public.norma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_iaf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estatus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodologia_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norma_auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_iaf_auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitos_por_proceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitos_no_aplicables_certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos_por_sitio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_por_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipo_auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitios_por_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos_sitio_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procesos_sitio_auditoria ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. LIMPIEZA DE POLÍTICAS PREVIAS (Para idempotencia en el SQL Editor)
-- ----------------------------------------------------------------------------
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS RLS: CATÁLOGOS BASE (Lectura pública y para usuarios autenticados)
-- ----------------------------------------------------------------------------
-- Normas, requisitos y tablas maestras requeridas para navegación del sistema:

CREATE POLICY "catalog_norma_select" ON public.norma FOR SELECT USING (true);
CREATE POLICY "catalog_requisito_select" ON public.requisito FOR SELECT USING (true);
CREATE POLICY "catalog_sector_iaf_select" ON public.sector_iaf FOR SELECT USING (true);
CREATE POLICY "catalog_estatus_select" ON public.estatus FOR SELECT USING (true);
CREATE POLICY "catalog_tipo_auditoria_select" ON public.tipo_auditoria FOR SELECT USING (true);
CREATE POLICY "catalog_metodologia_select" ON public.metodologia_auditoria FOR SELECT USING (true);
CREATE POLICY "catalog_auditor_select" ON public.auditor FOR SELECT USING (true);
CREATE POLICY "catalog_norma_auditor_select" ON public.norma_auditor FOR SELECT USING (true);
CREATE POLICY "catalog_sector_iaf_auditor_select" ON public.sector_iaf_auditor FOR SELECT USING (true);
CREATE POLICY "catalog_turno_select" ON public.turno FOR SELECT USING (true);

-- Permisos de mutación en catálogos solo para ADMIN:
CREATE POLICY "catalog_norma_admin_write" ON public.norma FOR ALL TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_requisito_admin_write" ON public.requisito FOR ALL TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_sector_iaf_admin_write" ON public.sector_iaf FOR ALL TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_estatus_admin_write" ON public.estatus FOR ALL TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_auditor_admin_write" ON public.auditor FOR ALL TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS RLS: PERFILES DE USUARIO (`profiles`)
-- ----------------------------------------------------------------------------
-- Cualquier usuario autenticado puede leer su propio perfil; los ADMIN pueden ver y gestionar todos:

CREATE POLICY "profiles_select"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_approved_admin());

CREATE POLICY "profiles_update"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_approved_admin())
    WITH CHECK (public.is_approved_admin());

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS RLS: ENTIDADES DE NEGOCIO PRINCIPALES
-- ----------------------------------------------------------------------------
-- Lectura: Usuarios autenticados con estado 'APPROVED'
-- Escritura: Usuarios con rol 'ADMIN' o 'AUDITOR' aprobados

-- ORGANIZACION
CREATE POLICY "organizacion_select"
    ON public.organizacion FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "organizacion_write"
    ON public.organizacion FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- CERTIFICADO
CREATE POLICY "certificado_select"
    ON public.certificado FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "certificado_write"
    ON public.certificado FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- SITIO
CREATE POLICY "sitio_select"
    ON public.sitio FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "sitio_write"
    ON public.sitio FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- PROCESO
CREATE POLICY "proceso_select"
    ON public.proceso FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "proceso_write"
    ON public.proceso FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- REQUISITOS POR PROCESO Y NO APLICABLES
CREATE POLICY "requisitos_por_proceso_select"
    ON public.requisitos_por_proceso FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "requisitos_por_proceso_write"
    ON public.requisitos_por_proceso FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

CREATE POLICY "requisitos_no_aplicables_select"
    ON public.requisitos_no_aplicables_certificado FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "requisitos_no_aplicables_write"
    ON public.requisitos_no_aplicables_certificado FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- TURNOS POR SITIO
CREATE POLICY "turnos_por_sitio_select"
    ON public.turnos_por_sitio FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "turnos_por_sitio_write"
    ON public.turnos_por_sitio FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- AUDITORIA
CREATE POLICY "auditoria_select"
    ON public.auditoria FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "auditoria_write"
    ON public.auditoria FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- EQUIPO AUDITOR
CREATE POLICY "equipo_auditor_select"
    ON public.equipo_auditor FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "equipo_auditor_write"
    ON public.equipo_auditor FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- SITIOS, TURNOS Y PROCESOS DE AUDITORIA
CREATE POLICY "sitios_por_auditoria_select"
    ON public.sitios_por_auditoria FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "sitios_por_auditoria_write"
    ON public.sitios_por_auditoria FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

CREATE POLICY "turnos_sitio_auditoria_select"
    ON public.turnos_sitio_auditoria FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "turnos_sitio_auditoria_write"
    ON public.turnos_sitio_auditoria FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

CREATE POLICY "procesos_sitio_auditoria_select"
    ON public.procesos_sitio_auditoria FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "procesos_sitio_auditoria_write"
    ON public.procesos_sitio_auditoria FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- COMENTARIOS DE AUDITORIA
CREATE POLICY "comentarios_auditoria_select"
    ON public.comentarios_por_auditoria FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "comentarios_auditoria_write"
    ON public.comentarios_por_auditoria FOR ALL
    TO authenticated
    USING (public.is_approved_auditor())
    WITH CHECK (public.is_approved_auditor());

-- ----------------------------------------------------------------------------
-- 7. POLÍTICAS RLS: HALLAZGOS ISO (`hallazgo`)
-- ----------------------------------------------------------------------------
-- Lectura: Usuarios aprobados
-- Escritura: Administradores o auditores asignados a la auditoría en `equipo_auditor`

CREATE POLICY "hallazgo_select"
    ON public.hallazgo FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

CREATE POLICY "hallazgo_write"
    ON public.hallazgo FOR ALL
    TO authenticated
    USING (
        public.is_approved_admin() OR 
        EXISTS (
            SELECT 1 FROM public.equipo_auditor ea
            WHERE ea.id_auditoria = hallazgo.id_auditoria 
              AND ea.id_auditor = auth.uid()
              AND public.is_approved_auditor()
        )
    )
    WITH CHECK (
        public.is_approved_admin() OR 
        EXISTS (
            SELECT 1 FROM public.equipo_auditor ea
            WHERE ea.id_auditoria = hallazgo.id_auditoria 
              AND ea.id_auditor = auth.uid()
              AND public.is_approved_auditor()
        )
    );

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS RLS: AUDIT LOG FORENSE (`audit_log`)
-- ----------------------------------------------------------------------------
-- Lectura exclusiva para Administradores aprobados; inmutable por diseño

CREATE POLICY "audit_log_select_admin_only"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (public.is_approved_admin());