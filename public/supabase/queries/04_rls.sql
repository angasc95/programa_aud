-- ============================================================================
-- FILE 4: 04_RLS.SQL (Políticas Row Level Security y Asignación DCL)
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

-- Funciones Auxiliares SECURITY DEFINER
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
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ea.id_auditoria = p_id_auditoria 
          AND ea.id_auditor = auth.uid()
          AND p.role IN ('ADMIN', 'AUDITOR')
          AND p.status = 'APPROVED'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_client_org_access(p_id_organizacion UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.client_organization_access coa
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE coa.id_usuario = auth.uid()
          AND coa.id_organizacion = p_id_organizacion
          AND coa.estado = 'APPROVED'
          AND p.role = 'CLIENT'
          AND p.status = 'APPROVED'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_worker() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_auditor(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_client_org_access(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auditor_esta_calificado(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auditores_calificados_para_certificado(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluar_cobertura_certificado(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cobertura_normativa_certificado(UUID) TO authenticated;

-- Activación RLS
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

-- Limpieza de políticas previas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Políticas de Catálogos y Competencias (Lectura Pública/Autenticada, Escritura Exclusiva por Admin)
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

CREATE POLICY "catalog_norma_insert_admin" ON public.norma FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_norma_update_admin" ON public.norma FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_norma_delete_admin" ON public.norma FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_requisito_insert_admin" ON public.requisito FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_requisito_update_admin" ON public.requisito FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_requisito_delete_admin" ON public.requisito FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_sector_iaf_insert_admin" ON public.sector_iaf FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_sector_iaf_update_admin" ON public.sector_iaf FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_sector_iaf_delete_admin" ON public.sector_iaf FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_estatus_insert_admin" ON public.estatus FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_estatus_update_admin" ON public.estatus FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_estatus_delete_admin" ON public.estatus FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_tipo_auditoria_insert_admin" ON public.tipo_auditoria FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_tipo_auditoria_update_admin" ON public.tipo_auditoria FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_tipo_auditoria_delete_admin" ON public.tipo_auditoria FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_metodologia_insert_admin" ON public.metodologia_auditoria FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_metodologia_update_admin" ON public.metodologia_auditoria FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_metodologia_delete_admin" ON public.metodologia_auditoria FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_auditor_insert_admin" ON public.auditor FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_auditor_update_admin" ON public.auditor FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_auditor_delete_admin" ON public.auditor FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_norma_auditor_insert_admin" ON public.norma_auditor FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_norma_auditor_update_admin" ON public.norma_auditor FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_norma_auditor_delete_admin" ON public.norma_auditor FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_sector_iaf_auditor_insert_admin" ON public.sector_iaf_auditor FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_sector_iaf_auditor_update_admin" ON public.sector_iaf_auditor FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_sector_iaf_auditor_delete_admin" ON public.sector_iaf_auditor FOR DELETE TO authenticated USING (public.is_approved_admin());

CREATE POLICY "catalog_turno_insert_admin" ON public.turno FOR INSERT TO authenticated WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_turno_update_admin" ON public.turno FOR UPDATE TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());
CREATE POLICY "catalog_turno_delete_admin" ON public.turno FOR DELETE TO authenticated USING (public.is_approved_admin());

-- Políticas para PROFILES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_approved_worker());

CREATE POLICY "profiles_update_admin_only" ON public.profiles FOR UPDATE TO authenticated
    USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());

-- Políticas para CLIENT_ORGANIZATION_ACCESS
CREATE POLICY "client_access_select" ON public.client_organization_access FOR SELECT TO authenticated
    USING (auth.uid() = id_usuario OR public.is_approved_worker());

CREATE POLICY "client_access_insert_self" ON public.client_organization_access FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "client_access_update_worker" ON public.client_organization_access FOR UPDATE TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para ORGANIZACION
CREATE POLICY "organizacion_select" ON public.organizacion FOR SELECT TO authenticated
    USING (public.is_approved_worker() OR public.has_client_org_access(id));

CREATE POLICY "organizacion_write_worker" ON public.organizacion FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para CERTIFICADO
CREATE POLICY "certificado_select" ON public.certificado FOR SELECT TO authenticated
    USING (public.is_approved_worker() OR public.has_client_org_access(id_organizacion));

CREATE POLICY "certificado_write_worker" ON public.certificado FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para SITIO
CREATE POLICY "sitio_select" ON public.sitio FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR 
        EXISTS (SELECT 1 FROM public.certificado c WHERE c.id = sitio.id_certificado AND public.has_client_org_access(c.id_organizacion))
    );

CREATE POLICY "sitio_write_worker" ON public.sitio FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para PROCESO
CREATE POLICY "proceso_select" ON public.proceso FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR 
        EXISTS (SELECT 1 FROM public.certificado c WHERE c.id = proceso.id_certificado AND public.has_client_org_access(c.id_organizacion))
    );

CREATE POLICY "proceso_write_worker" ON public.proceso FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para REQUISITOS_POR_PROCESO
CREATE POLICY "req_proceso_select" ON public.requisitos_por_proceso FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        EXISTS (
            SELECT 1 FROM public.proceso p
            JOIN public.certificado c ON c.id = p.id_certificado
            WHERE p.id = requisitos_por_proceso.id_proceso AND public.has_client_org_access(c.id_organizacion)
        )
    );

CREATE POLICY "req_proceso_write_worker" ON public.requisitos_por_proceso FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para REQUISITOS_NO_APLICABLES_CERTIFICADO
CREATE POLICY "req_no_aplicables_select" ON public.requisitos_no_aplicables_certificado FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        EXISTS (
            SELECT 1 FROM public.certificado c
            WHERE c.id = requisitos_no_aplicables_certificado.id_certificado AND public.has_client_org_access(c.id_organizacion)
        )
    );

CREATE POLICY "req_no_aplicables_write_worker" ON public.requisitos_no_aplicables_certificado FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para TURNOS_POR_SITIO
CREATE POLICY "turnos_sitio_select" ON public.turnos_por_sitio FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        EXISTS (
            SELECT 1 FROM public.sitio s
            JOIN public.certificado c ON c.id = s.id_certificado
            WHERE s.id = turnos_por_sitio.id_sitio AND public.has_client_org_access(c.id_organizacion)
        )
    );

CREATE POLICY "turnos_sitio_write_worker" ON public.turnos_por_sitio FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para AUDITORIA
CREATE POLICY "auditoria_select" ON public.auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR 
        public.is_assigned_auditor(id) OR
        EXISTS (SELECT 1 FROM public.certificado c WHERE c.id = auditoria.id_certificado AND public.has_client_org_access(c.id_organizacion))
    );

CREATE POLICY "auditoria_write_worker" ON public.auditoria FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para EQUIPO_AUDITOR
CREATE POLICY "equipo_auditor_select" ON public.equipo_auditor FOR SELECT TO authenticated
    USING (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria));

CREATE POLICY "equipo_auditor_write_worker" ON public.equipo_auditor FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para HALLAZGO
CREATE POLICY "hallazgo_select" ON public.hallazgo FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR 
        public.is_assigned_auditor(id_auditoria) OR
        EXISTS (
            SELECT 1 FROM public.auditoria a 
            JOIN public.certificado c ON a.id_certificado = c.id 
            WHERE a.id = hallazgo.id_auditoria AND public.has_client_org_access(c.id_organizacion)
        )
    );

CREATE POLICY "hallazgo_write_auditor_or_worker" ON public.hallazgo FOR ALL TO authenticated
    USING (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
    WITH CHECK (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria));

-- Políticas para SITIOS_POR_AUDITORIA
CREATE POLICY "sitios_por_auditoria_select" ON public.sitios_por_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        public.is_assigned_auditor(id_auditoria) OR
        EXISTS (
            SELECT 1 FROM public.auditoria a
            JOIN public.certificado c ON a.id_certificado = c.id
            WHERE a.id = sitios_por_auditoria.id_auditoria AND public.has_client_org_access(c.id_organizacion)
        )
    );

CREATE POLICY "sitios_por_auditoria_write_worker" ON public.sitios_por_auditoria FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para TURNOS_SITIO_AUDITORIA
CREATE POLICY "turnos_sitio_auditoria_select" ON public.turnos_sitio_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        EXISTS (
            SELECT 1 FROM public.sitios_por_auditoria sa
            WHERE sa.id = turnos_sitio_auditoria.id_sitios_por_auditoria
              AND (
                  public.is_assigned_auditor(sa.id_auditoria) OR
                  EXISTS (
                      SELECT 1 FROM public.auditoria a
                      JOIN public.certificado c ON a.id_certificado = c.id
                      WHERE a.id = sa.id_auditoria AND public.has_client_org_access(c.id_organizacion)
                  )
              )
        )
    );

CREATE POLICY "turnos_sitio_auditoria_write_worker" ON public.turnos_sitio_auditoria FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para PROCESOS_SITIO_AUDITORIA
CREATE POLICY "procesos_sitio_auditoria_select" ON public.procesos_sitio_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        EXISTS (
            SELECT 1 FROM public.sitios_por_auditoria sa
            WHERE sa.id = procesos_sitio_auditoria.id_sitios_por_auditoria
              AND (
                  public.is_assigned_auditor(sa.id_auditoria) OR
                  EXISTS (
                      SELECT 1 FROM public.auditoria a
                      JOIN public.certificado c ON a.id_certificado = c.id
                      WHERE a.id = sa.id_auditoria AND public.has_client_org_access(c.id_organizacion)
                  )
              )
        )
    );

CREATE POLICY "procesos_sitio_auditoria_write_worker" ON public.procesos_sitio_auditoria FOR ALL TO authenticated
    USING (public.is_approved_worker()) WITH CHECK (public.is_approved_worker());

-- Políticas para COMENTARIOS_POR_AUDITORIA
CREATE POLICY "comentarios_auditoria_select" ON public.comentarios_por_auditoria FOR SELECT TO authenticated
    USING (
        public.is_approved_worker() OR
        public.is_assigned_auditor(id_auditoria) OR
        EXISTS (
            SELECT 1 FROM public.auditoria a
            JOIN public.certificado c ON a.id_certificado = c.id
            WHERE a.id = comentarios_por_auditoria.id_auditoria AND public.has_client_org_access(c.id_organizacion)
        )
    );

CREATE POLICY "comentarios_auditoria_write_worker_or_auditor" ON public.comentarios_por_auditoria FOR ALL TO authenticated
    USING (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria))
    WITH CHECK (public.is_approved_worker() OR public.is_assigned_auditor(id_auditoria));

-- Políticas para AUDIT_LOG
CREATE POLICY "audit_log_select_admin" ON public.audit_log FOR SELECT TO authenticated
    USING (public.is_approved_admin());