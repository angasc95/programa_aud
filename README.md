# Supabase Connection Tester

A clean, minimalist single-file web application to test, monitor, and query your Supabase instance using Tailwind CSS and the official `@supabase/supabase-js` client SDK.

## Configuration
- **Project URL:** `https://ufowtgmpaahyshdxlnlq.supabase.co`
- **Publishable Key:** `sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
- **Known Schema Tables:** `organizacion`, `auditoria`, `hallazgo`, `profiles`, `audit_log`, `certificado`, `norma`, `proceso`, `requisito`, `auditor`

## Features
- **Auto-Health Check:** Tests connection latency, PostgREST API status, GoTrue Auth status, and RPC engine on load.
- **LTREE RPC Engine Tester:** Directly executes and inspects `evaluar_cobertura_certificado()` and `cobertura_normativa_certificado()`.
- **Fetch & Verify Tables:** Scans and validates all schema entities against active RLS policies.
- **RBAC & RLS Context Validator:** Inspects behavior for anonymous vs. authenticated approved users (`is_approved_user()`, `is_approved_auditor()`, `is_approved_admin()`).
- **Interactive Query Tool:** Query table rows with limit controls and switch between Table view and formatted JSON view.
- **Activity Log:** Real-time chronological logging of all network requests, responses, status codes, and error details.