-- ============================================================================
-- FILE 0: 00_DELETE_TABLES.SQL (Reinicio Seguro del Esquema Public)
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT ALL ON SCHEMA public TO public;