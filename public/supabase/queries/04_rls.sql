-- ============================================================================
-- FILE 4: 04_RLS.SQL (Políticas Row Level Security Granulares y DCL - Fase 1.2)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- Defensa en profundidad (Fase 1.2): revocar DELETE físico en tablas protegidas por soft-delete / inmutabilidad
DO $$
DECLARE
    v_tbl TEXT;
    v_non_deletable_tables TEXT[] := ARRAY[
        'norma', 'requisito', 'sector_iaf', 'subsector_iaf',
        'organismo_acreditacion', 'acreditacion_norma_iaf',
        'estatus', 'tipo_auditoria', 'metodologia_auditoria', 'auditor',
        'organizacion', 'certificado', 'sitio', 'proceso', 'turno',
        'auditoria', 'hallazgo',
        'requisitos_no_aplicables_certificado', 'turnos_por_sitio',
        'comentarios_por_auditoria', 'sitios_por_auditoria',
        'turnos_sitio_auditoria', 'procesos_sitio_auditoria',
        'profiles', 'client_organization_access', 'audit_log'
    ];
BEGIN
    FOREACH v_tbl IN ARRAY v_non_deletable_tables LOOP
        EXECUTE format('REVOKE DELETE ON public.%I FROM anon, authenticated', v_tbl);
    END LOOP;
END $$;

-- Funciones Auxiliares SECURITY DEFINER (con aislamiento estricto de registros archivados)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'APPROVED';
$$;

CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_worker()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'WORKER') AND status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_auditor(p_id_auditoria UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.equipo_auditor ea
        JOIN public.auditoria a ON a.id = ea.id_auditoria
        JOIN public.certificado c ON c.id = a.id_certificado
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ea.id_auditoria = p_id_auditoria
          AND ea.id_auditor = auth.uid()
          AND a.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND p.role IN ('ADMIN', 'AUDITOR')
          AND p.status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_client_org_access(p_id_organizacion UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.client_organization_access coa
        JOIN public.organizacion o ON o.id = coa.id_organizacion
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE coa.id_usuario = auth.uid()
          AND coa.id_organizacion = p_id_organizacion
          AND coa.estado = 'APPROVED'
          AND coa.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND p.role = 'CLIENT'
          AND p.status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_auditor_for_cert(p_id_certificado UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.auditoria a
        JOIN public.certificado c ON c.id = a.id_certificado
        JOIN public.equipo_auditor ea ON ea.id_auditoria = a.id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE a.id_certificado = p_id_certificado
          AND a.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND ea.id_auditor = auth.uid()
          AND p.role IN ('ADMIN', 'AUDITOR')
          AND p.status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_auditor_for_org(p_id_organizacion UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organizacion o
        JOIN public.certificado c ON c.id_organizacion = o.id
        JOIN public.auditoria a ON a.id_certificado = c.id
        JOIN public.equipo_auditor ea ON ea.id_auditoria = a.id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE c.id_organizacion = p_id_organizacion
          AND o.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND a.deleted_at IS NULL
          AND ea.id_auditor = auth.uid()
          AND p.role IN ('ADMIN', 'AUDITOR')
          AND p.status = 'APPROVED'
    );
$$;

-- Verificación idempotente del trigger RBAC sobre public.profiles (después de declarar is_approved_admin)
DROP TRIGGER IF EXISTS trg_protect_profile_rbac_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_rbac_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_profile_rbac_fields();

-- Permisos de Ejecución (DCL)
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_worker() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_auditor(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_auditor_for_cert(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_auditor_for_org(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_client_org_access(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auditor_esta_calificado(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auditores_calificados_para_certificado(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluar_cobertura_certificado(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cobertura_normativa_certificado(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_archive_dependency_summary(TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_archive_dependency_summary(TEXT, UUID) TO authenticated;

-- RPC segura para archivo lógico por WORKER/ADMIN sin relajar políticas SELECT (evita bloqueo WCO de PG en UPDATE)
CREATE OR REPLACE FUNCTION public.archive_record(
    p_table TEXT,
    p_record_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
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
    v_updated_id UUID;
BEGIN
    IF NOT public.is_approved_worker() THEN
        RAISE EXCEPTION 'Acceso denegado: solo personal aprobado (ADMIN o WORKER) puede archivar registros.';
    END IF;

    IF p_table = ANY(v_core_tables) THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW(), deleted_by = COALESCE($2, deleted_by), delete_reason = COALESCE(NULLIF(TRIM($3), ''''), delete_reason) WHERE id = $1 AND deleted_at IS NULL RETURNING id',
            p_table
        ) USING p_record_id, auth.uid(), p_reason INTO v_updated_id;
    ELSIF p_table = ANY(v_child_tables) THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW(), deleted_by = COALESCE($2, deleted_by) WHERE id = $1 AND deleted_at IS NULL RETURNING id',
            p_table
        ) USING p_record_id, auth.uid() INTO v_updated_id;
    ELSE
        RAISE EXCEPTION 'Tabla no válida o no habilitada para archivo lógico: %', p_table;
    END IF;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró un registro activo con id % en public.%', p_record_id, p_table;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'table', p_table,
        'record_id', v_updated_id,
        'archived_by', auth.uid()
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_record(TEXT, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_record(TEXT, UUID, TEXT) TO authenticated;

-- Activación RLS en todas las tablas públicas (31 tablas)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_organization_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hallazgo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.norma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_iaf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsector_iaf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organismo_acreditacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acreditacion_norma_iaf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estatus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodologia_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norma_auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_iaf_auditor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsector_iaf_auditor ENABLE ROW LEVEL SECURITY;
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

-- Limpieza total e idempotente de políticas previas
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- 1. Catálogos Base y Turnos (SELECT activo p/ anon+auth, ADMIN ve archivados;
--    INSERT/UPDATE granulares para ADMIN/WORKER; SIN FOR DELETE)
-- ============================================================================

-- NORMA
CREATE POLICY "catalog_norma_select" ON public.norma
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_norma_insert_worker" ON public.norma
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_norma_update_worker" ON public.norma
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- REQUISITO
CREATE POLICY "catalog_requisito_select" ON public.requisito
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_requisito_insert_worker" ON public.requisito
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_requisito_update_worker" ON public.requisito
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- SECTOR_IAF
CREATE POLICY "catalog_sector_iaf_select" ON public.sector_iaf
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_sector_iaf_insert_worker" ON public.sector_iaf
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_sector_iaf_update_worker" ON public.sector_iaf
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- SUBSECTOR_IAF
CREATE POLICY "catalog_subsector_iaf_select" ON public.subsector_iaf
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_subsector_iaf_insert_worker" ON public.subsector_iaf
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_subsector_iaf_update_worker" ON public.subsector_iaf
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- ORGANISMO_ACREDITACION
CREATE POLICY "catalog_organismo_acreditacion_select" ON public.organismo_acreditacion
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_organismo_insert_worker" ON public.organismo_acreditacion
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_organismo_update_worker" ON public.organismo_acreditacion
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- ACREDITACION_NORMA_IAF
CREATE POLICY "catalog_acreditacion_norma_iaf_select" ON public.acreditacion_norma_iaf
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_acreditacion_insert_worker" ON public.acreditacion_norma_iaf
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_acreditacion_update_worker" ON public.acreditacion_norma_iaf
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- ESTATUS
CREATE POLICY "catalog_estatus_select" ON public.estatus
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_estatus_insert_worker" ON public.estatus
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_estatus_update_worker" ON public.estatus
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- TIPO_AUDITORIA
CREATE POLICY "catalog_tipo_auditoria_select" ON public.tipo_auditoria
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_tipo_auditoria_insert_worker" ON public.tipo_auditoria
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_tipo_auditoria_update_worker" ON public.tipo_auditoria
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- METODOLOGIA_AUDITORIA
CREATE POLICY "catalog_metodologia_select" ON public.metodologia_auditoria
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_metodologia_insert_worker" ON public.metodologia_auditoria
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_metodologia_update_worker" ON public.metodologia_auditoria
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- AUDITOR
CREATE POLICY "catalog_auditor_select" ON public.auditor
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_auditor_insert_worker" ON public.auditor
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_auditor_update_worker" ON public.auditor
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- TURNO
CREATE POLICY "catalog_turno_select" ON public.turno
    FOR SELECT USING (deleted_at IS NULL OR public.is_approved_admin());
CREATE POLICY "catalog_turno_insert_worker" ON public.turno
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "catalog_turno_update_worker" ON public.turno
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- ============================================================================
-- 2. Tablas de Unión Puras M:N de Competencias (INSERT + DELETE controlado)
-- ============================================================================

-- NORMA_AUDITOR
CREATE POLICY "catalog_norma_auditor_select" ON public.norma_auditor
    FOR SELECT USING (
        public.is_approved_admin()
        OR EXISTS (SELECT 1 FROM public.auditor a WHERE a.id = norma_auditor.id_auditor AND a.deleted_at IS NULL)
    );
CREATE POLICY "catalog_norma_auditor_insert_worker" ON public.norma_auditor
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker());
CREATE POLICY "catalog_norma_auditor_delete_worker" ON public.norma_auditor
    FOR DELETE TO authenticated USING (public.is_approved_worker());

-- SECTOR_IAF_AUDITOR
CREATE POLICY "catalog_sector_iaf_auditor_select" ON public.sector_iaf_auditor
    FOR SELECT USING (
        public.is_approved_admin()
        OR EXISTS (SELECT 1 FROM public.auditor a WHERE a.id = sector_iaf_auditor.id_auditor AND a.deleted_at IS NULL)
    );
CREATE POLICY "catalog_sector_iaf_auditor_insert_worker" ON public.sector_iaf_auditor
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker());
CREATE POLICY "catalog_sector_iaf_auditor_delete_worker" ON public.sector_iaf_auditor
    FOR DELETE TO authenticated USING (public.is_approved_worker());

-- SUBSECTOR_IAF_AUDITOR
CREATE POLICY "catalog_subsector_iaf_auditor_select" ON public.subsector_iaf_auditor
    FOR SELECT USING (
        public.is_approved_admin()
        OR EXISTS (SELECT 1 FROM public.auditor a WHERE a.id = subsector_iaf_auditor.id_auditor AND a.deleted_at IS NULL)
    );
CREATE POLICY "catalog_subsector_iaf_auditor_insert_worker" ON public.subsector_iaf_auditor
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker());
CREATE POLICY "catalog_subsector_iaf_auditor_delete_worker" ON public.subsector_iaf_auditor
    FOR DELETE TO authenticated USING (public.is_approved_worker());

-- ============================================================================
-- 3. Gobernanza de Perfiles, Acceso Cliente y Audit Log
-- ============================================================================

-- PROFILES (Admin + Auto-servicio seguro protegido por trg_protect_profile_rbac_fields)
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_approved_worker());

CREATE POLICY "profiles_update_admin_only" ON public.profiles FOR UPDATE TO authenticated
    USING (public.is_approved_admin())
    WITH CHECK (public.is_approved_admin());

CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- CLIENT_ORGANIZATION_ACCESS
CREATE POLICY "client_access_select" ON public.client_organization_access FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (deleted_at IS NULL AND (auth.uid() = id_usuario OR public.is_approved_worker()))
    );

CREATE POLICY "client_access_insert_self" ON public.client_organization_access FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (
            (auth.uid() = id_usuario AND estado = 'PENDING')
            OR public.is_approved_worker()
        )
    );

CREATE POLICY "client_access_update_worker" ON public.client_organization_access FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- ============================================================================
-- 4. Dominio Operativo: Organizaciones, Certificados, Sitios, Procesos
--    (SELECT oculta deleted_at IS NOT NULL salvo ADMIN; INSERT/UPDATE granulares; SIN FOR DELETE)
-- ============================================================================

-- ORGANIZACION
CREATE POLICY "organizacion_select" ON public.organizacion FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.has_client_org_access(id)
                OR public.is_auditor_for_org(id)
            )
        )
    );
CREATE POLICY "organizacion_insert_worker" ON public.organizacion
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "organizacion_update_worker" ON public.organizacion
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- CERTIFICADO
CREATE POLICY "certificado_select" ON public.certificado FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.has_client_org_access(id_organizacion)
                OR public.is_auditor_for_cert(id)
            )
        )
    );
CREATE POLICY "certificado_insert_worker" ON public.certificado
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "certificado_update_worker" ON public.certificado
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- SITIO
CREATE POLICY "sitio_select" ON public.sitio FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR EXISTS (
                    SELECT 1 FROM public.certificado c
                    WHERE c.id = sitio.id_certificado
                      AND c.deleted_at IS NULL
                      AND (public.has_client_org_access(c.id_organizacion) OR public.is_auditor_for_cert(c.id))
                )
            )
        )
    );
CREATE POLICY "sitio_insert_worker" ON public.sitio
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "sitio_update_worker" ON public.sitio
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- PROCESO
CREATE POLICY "proceso_select" ON public.proceso FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR EXISTS (
                    SELECT 1 FROM public.certificado c
                    WHERE c.id = proceso.id_certificado
                      AND c.deleted_at IS NULL
                      AND (public.has_client_org_access(c.id_organizacion) OR public.is_auditor_for_cert(c.id))
                )
            )
        )
    );
CREATE POLICY "proceso_insert_worker" ON public.proceso
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "proceso_update_worker" ON public.proceso
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- REQUISITOS_POR_PROCESO (M:N pura — retiene INSERT + DELETE para mapeo de cláusulas)
CREATE POLICY "req_proceso_select" ON public.requisitos_por_proceso FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR EXISTS (
            SELECT 1 FROM public.proceso p
            JOIN public.certificado c ON c.id = p.id_certificado
            WHERE p.id = requisitos_por_proceso.id_proceso
              AND p.deleted_at IS NULL
              AND c.deleted_at IS NULL
              AND (
                  public.is_approved_worker()
                  OR public.has_client_org_access(c.id_organizacion)
                  OR public.is_auditor_for_cert(c.id)
              )
        )
    );
CREATE POLICY "req_proceso_insert_worker" ON public.requisitos_por_proceso
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker());
CREATE POLICY "req_proceso_delete_worker" ON public.requisitos_por_proceso
    FOR DELETE TO authenticated USING (public.is_approved_worker());

-- REQUISITOS_NO_APLICABLES_CERTIFICADO
CREATE POLICY "req_no_aplicables_select" ON public.requisitos_no_aplicables_certificado FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR EXISTS (
                    SELECT 1 FROM public.certificado c
                    WHERE c.id = requisitos_no_aplicables_certificado.id_certificado
                      AND c.deleted_at IS NULL
                      AND (public.has_client_org_access(c.id_organizacion) OR public.is_auditor_for_cert(c.id))
                )
            )
        )
    );
CREATE POLICY "req_no_aplicables_insert_worker" ON public.requisitos_no_aplicables_certificado
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "req_no_aplicables_update_worker" ON public.requisitos_no_aplicables_certificado
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- TURNOS_POR_SITIO
CREATE POLICY "turnos_sitio_select" ON public.turnos_por_sitio FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR EXISTS (
                    SELECT 1 FROM public.sitio s
                    JOIN public.certificado c ON c.id = s.id_certificado
                    WHERE s.id = turnos_por_sitio.id_sitio
                      AND s.deleted_at IS NULL
                      AND c.deleted_at IS NULL
                      AND (public.has_client_org_access(c.id_organizacion) OR public.is_auditor_for_cert(c.id))
                )
            )
        )
    );
CREATE POLICY "turnos_sitio_insert_worker" ON public.turnos_por_sitio
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "turnos_sitio_update_worker" ON public.turnos_por_sitio
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- ============================================================================
-- 5. Planificación y Ejecución de Auditorías
-- ============================================================================

-- AUDITORIA
CREATE POLICY "auditoria_select" ON public.auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.is_assigned_auditor(id)
                OR EXISTS (
                    SELECT 1 FROM public.certificado c
                    WHERE c.id = auditoria.id_certificado
                      AND c.deleted_at IS NULL
                      AND public.has_client_org_access(c.id_organizacion)
                )
            )
        )
    );
CREATE POLICY "auditoria_insert_worker" ON public.auditoria
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "auditoria_update_worker" ON public.auditoria
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- EQUIPO_AUDITOR (M:N pura — retiene INSERT, UPDATE rol y DELETE para desasignación de auditores)
CREATE POLICY "equipo_auditor_select" ON public.equipo_auditor FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR EXISTS (
            SELECT 1 FROM public.auditoria a
            JOIN public.certificado c ON c.id = a.id_certificado
            WHERE a.id = equipo_auditor.id_auditoria
              AND a.deleted_at IS NULL
              AND c.deleted_at IS NULL
              AND (public.is_approved_worker() OR public.is_assigned_auditor(equipo_auditor.id_auditoria))
        )
    );
CREATE POLICY "equipo_auditor_insert_worker" ON public.equipo_auditor
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker());
CREATE POLICY "equipo_auditor_update_worker" ON public.equipo_auditor
    FOR UPDATE TO authenticated USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());
CREATE POLICY "equipo_auditor_delete_worker" ON public.equipo_auditor
    FOR DELETE TO authenticated USING (public.is_approved_worker());

-- HALLAZGO (Auditor asignado puede insertar/actualizar hallazgos activos, pero NO archivarlos)
CREATE POLICY "hallazgo_select" ON public.hallazgo FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.is_assigned_auditor(id_auditoria)
                OR EXISTS (
                    SELECT 1 FROM public.auditoria a
                    JOIN public.certificado c ON a.id_certificado = c.id
                    WHERE a.id = hallazgo.id_auditoria
                      AND a.deleted_at IS NULL
                      AND c.deleted_at IS NULL
                      AND public.has_client_org_access(c.id_organizacion)
                )
            )
        )
    );
CREATE POLICY "hallazgo_insert_auditor_or_worker" ON public.hallazgo
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
    );
CREATE POLICY "hallazgo_update_auditor_or_worker" ON public.hallazgo
    FOR UPDATE TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
        )
    )
    WITH CHECK (
        (
            deleted_at IS NULL
            AND (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
        )
        OR (
            deleted_at IS NOT NULL
            AND public.is_approved_worker()
            AND (public.is_approved_admin() OR deleted_by = auth.uid())
        )
    );

-- SITIOS_POR_AUDITORIA
CREATE POLICY "sitios_por_auditoria_select" ON public.sitios_por_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.is_assigned_auditor(id_auditoria)
                OR EXISTS (
                    SELECT 1 FROM public.auditoria a
                    JOIN public.certificado c ON a.id_certificado = c.id
                    WHERE a.id = sitios_por_auditoria.id_auditoria
                      AND a.deleted_at IS NULL
                      AND c.deleted_at IS NULL
                      AND public.has_client_org_access(c.id_organizacion)
                )
            )
        )
    );
CREATE POLICY "sitios_por_auditoria_insert_worker" ON public.sitios_por_auditoria
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "sitios_por_auditoria_update_worker" ON public.sitios_por_auditoria
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- TURNOS_SITIO_AUDITORIA
CREATE POLICY "turnos_sitio_auditoria_select" ON public.turnos_sitio_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR EXISTS (
                    SELECT 1 FROM public.sitios_por_auditoria sa
                    WHERE sa.id = turnos_sitio_auditoria.id_sitios_por_auditoria
                      AND sa.deleted_at IS NULL
                      AND (
                          public.is_assigned_auditor(sa.id_auditoria)
                          OR EXISTS (
                              SELECT 1 FROM public.auditoria a
                              JOIN public.certificado c ON a.id_certificado = c.id
                              WHERE a.id = sa.id_auditoria
                                AND a.deleted_at IS NULL
                                AND c.deleted_at IS NULL
                                AND public.has_client_org_access(c.id_organizacion)
                          )
                      )
                )
            )
        )
    );
CREATE POLICY "turnos_sitio_auditoria_insert_worker" ON public.turnos_sitio_auditoria
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "turnos_sitio_auditoria_update_worker" ON public.turnos_sitio_auditoria
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- PROCESOS_SITIO_AUDITORIA
CREATE POLICY "procesos_sitio_auditoria_select" ON public.procesos_sitio_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR EXISTS (
                    SELECT 1 FROM public.sitios_por_auditoria sa
                    WHERE sa.id = procesos_sitio_auditoria.id_sitios_por_auditoria
                      AND sa.deleted_at IS NULL
                      AND (
                          public.is_assigned_auditor(sa.id_auditoria)
                          OR EXISTS (
                              SELECT 1 FROM public.auditoria a
                              JOIN public.certificado c ON a.id_certificado = c.id
                              WHERE a.id = sa.id_auditoria
                                AND a.deleted_at IS NULL
                                AND c.deleted_at IS NULL
                                AND public.has_client_org_access(c.id_organizacion)
                          )
                      )
                )
            )
        )
    );
CREATE POLICY "procesos_sitio_auditoria_insert_worker" ON public.procesos_sitio_auditoria
    FOR INSERT TO authenticated WITH CHECK (public.is_approved_worker() AND deleted_at IS NULL);
CREATE POLICY "procesos_sitio_auditoria_update_worker" ON public.procesos_sitio_auditoria
    FOR UPDATE TO authenticated
    USING (public.is_approved_admin() OR (deleted_at IS NULL AND public.is_approved_worker()))
    WITH CHECK (public.is_approved_worker() AND (deleted_at IS NULL OR public.is_approved_admin() OR deleted_by = auth.uid()));

-- COMENTARIOS_POR_AUDITORIA (Auditor asignado puede insertar/editar comentarios activos, pero NO archivarlos)
CREATE POLICY "comentarios_auditoria_select" ON public.comentarios_por_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (
                public.is_approved_worker()
                OR public.is_assigned_auditor(id_auditoria)
                OR EXISTS (
                    SELECT 1 FROM public.auditoria a
                    JOIN public.certificado c ON a.id_certificado = c.id
                    WHERE a.id = comentarios_por_auditoria.id_auditoria
                      AND a.deleted_at IS NULL
                      AND c.deleted_at IS NULL
                      AND public.has_client_org_access(c.id_organizacion)
                )
            )
        )
    );
CREATE POLICY "comentarios_auditoria_insert_worker_or_auditor" ON public.comentarios_por_auditoria
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
    );
CREATE POLICY "comentarios_auditoria_update_worker_or_auditor" ON public.comentarios_por_auditoria
    FOR UPDATE TO authenticated
    USING (
        public.is_approved_admin()
        OR (
            deleted_at IS NULL
            AND (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
        )
    )
    WITH CHECK (
        (
            deleted_at IS NULL
            AND (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
        )
        OR (
            deleted_at IS NOT NULL
            AND public.is_approved_worker()
            AND (public.is_approved_admin() OR deleted_by = auth.uid())
        )
    );

-- ============================================================================
-- 6. AUDIT_LOG (Lectura forense inmutable para ADMIN, WORKER y AUDITOR asignado)
-- ============================================================================
CREATE POLICY "audit_log_select_authorized" ON public.audit_log FOR SELECT TO authenticated
    USING (
        public.is_approved_worker()
        OR (table_name = 'auditoria' AND public.is_assigned_auditor(record_id))
        OR (
            table_name = 'hallazgo'
            AND EXISTS (
                SELECT 1 FROM public.hallazgo h
                WHERE h.id = audit_log.record_id
                  AND h.deleted_at IS NULL
                  AND public.is_assigned_auditor(h.id_auditoria)
            )
        )
    );