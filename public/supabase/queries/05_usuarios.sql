-- ============================================================================
-- FILE 5: 05_USUARIOS.SQL (SCRIPT DE USUARIOS DE PRUEBA: SUPABASE AUTH + PROFILES RBAC REDISEÑADO)
-- ============================================================================

DELETE FROM auth.users WHERE email IN (
    'admin@fondonorma.test', 
    'worker@fondonorma.test', 
    'auditor@fondonorma.test', 
    'client@fondonorma.test'
);

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
(
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'admin@fondonorma.test', crypt('Password123*', gen_salt('bf')),
    NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"nombre": "Administrador Principal", "role": "ADMIN"}', NOW(), NOW()
),
(
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'worker@fondonorma.test', crypt('Password123*', gen_salt('bf')),
    NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"nombre": "Gestor Operativo", "role": "WORKER"}', NOW(), NOW()
),
(
    '00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'auditor@fondonorma.test', crypt('Password123*', gen_salt('bf')),
    NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"nombre": "Auditor Técnico", "role": "AUDITOR"}', NOW(), NOW()
),
(
    '00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
    'authenticated', 'authenticated', 'client@fondonorma.test', crypt('Password123*', gen_salt('bf')),
    NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"nombre": "Cliente Empresa Iberometal", "role": "CLIENT"}', NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, updated_at = NOW();

INSERT INTO public.profiles (id, nombre, role, status, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Administrador Principal', 'ADMIN', 'APPROVED', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'Gestor Operativo', 'WORKER', 'APPROVED', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Auditor Técnico', 'AUDITOR', 'APPROVED', NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444', 'Cliente Empresa Iberometal', 'CLIENT', 'APPROVED', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, updated_at = NOW();