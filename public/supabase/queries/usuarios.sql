-- ============================================================================
-- SCRIPT DE LIMPIEZA Y CREACIÓN DE USUARIOS DE PRUEBA (SUPABASE AUTH + PROFILES)
-- ============================================================================
-- Core Purpose: Limpiar registros anteriores de prueba y poblar usuarios 
-- con roles ADMIN, AUDITOR y USER aprobados para testear la API y RLS.
-- ============================================================================

-- 1. Limpieza total de los usuarios de prueba previos en auth.users
-- (Al estar vinculados con ON DELETE CASCADE, esto limpiará profiles y audit_log automáticamente)
DELETE FROM auth.users WHERE email IN (
    'admin@fondonorma.test', 
    'auditor@fondonorma.test', 
    'user@fondonorma.test'
);

-- 2. Inserción de usuarios en Supabase Auth (`auth.users`) con UUIDs fijos e idempotentes
-- Contraseña por defecto para los tres usuarios: Password123*
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES
(
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@fondonorma.test',
    crypt('Password123*', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Administrador Principal"}',
    NOW(),
    NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'auditor@fondonorma.test',
    crypt('Password123*', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Auditor Senior"}',
    NOW(),
    NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'user@fondonorma.test',
    crypt('Password123*', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Usuario General"}',
    NOW(),
    NOW(),
    '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- 3. Configuración y asignación explícita en `public.profiles` 
-- Garantiza que tengan estado 'APPROVED' y sus roles correspondientes (`ADMIN`, `AUDITOR`, `USER`)
INSERT INTO public.profiles (id, nombre, role, status, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Administrador Principal', 'ADMIN', 'APPROVED', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'Auditor Senior', 'AUDITOR', 'APPROVED', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Usuario General', 'USER', 'APPROVED', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();