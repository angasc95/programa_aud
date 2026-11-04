# Supabase Connection Tester

A clean, minimalist single-file web application to test, monitor, and query your Supabase instance using Tailwind CSS and the official `@supabase/supabase-js` client SDK.

## Configuration
- **Project URL:** `https://ufowtgmpaahyshdxlnlq.supabase.co`
- **Publishable Key:** `sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
- **Known Schema Tables:** `auditoria`, `auditor`, `norma`, `proceso`, `certificado`

## Features
- **Auto-Health Check:** Tests connection latency, PostgREST API status, and GoTrue Auth status immediately upon page load.
- **Fetch & Verify Tables:** Discovers and validates accessible tables in your schema.
- **Interactive Query Tool:** Query table rows with limit controls and switch between Table view and formatted JSON view.
- **Activity Log:** Real-time chronological logging of all network requests, responses, status codes, and error details.