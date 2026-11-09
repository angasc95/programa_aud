-- ============================================================================
-- FILE 0: 00_DELETE_TABLES.SQL
-- ============================================================================
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;