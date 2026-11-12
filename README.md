# Programa de Auditoría (`programa_aud`) — Certificación FN

Plataforma integral de gestión, planificación, asignación de competencias técnicas, trazabilidad normativa (`LTREE`) y control de hallazgos para programas y planes de auditoría de certificación, diseñada conforme a **ISO/IEC 17021-1:2015** e **ISO 19011:2018**.

## Arquitectura y Stack Tecnológico

- **Frontend SPA:** TypeScript (`strict: true`), Vite 6, Tailwind CSS v4 (`@tailwindcss/vite`), enrutamiento SPA por hash (`#/{route}/{subview}`), diseño modular desacoplado (`src/lib/*` + `src/views/*`).
- **Backend / Servidor:** Express 5 (`server.ts`, puerto `3000`) sirviendo Vite middleware en desarrollo y assets optimizados (`dist/`) en producción, más `GET /api/health` y `POST /api/reset-db`.
- **Base de Datos y Seguridad:** Supabase Cloud (PostgreSQL + GoTrue Auth v2 + PostgREST) con **27 tablas**, motor recursivo `LTREE`, bitácora forense inmutable (`audit_log`), triggers ISO/IEC 17021-1 y doble capa **DCL + RLS** (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`).

## Dominios Operativos Principales

- **Explorador de Certificados y Drill-Down:** Búsqueda multi-criterio en vivo, cobertura normativa `LTREE`, vistas Cuadrícula/Lista y navegación jerárquica con *breadcrumbs* (`Organización → Certificado → Sitios/Procesos/Turnos/Exclusiones/Auditorías`).
- **Auditorías:** Programación de eventos con muestreo multisitio (Sede 0 principal prioritaria), Calendario operativo (Mensual/Trimestral/Gantt) con detección de conflictos de auditor, y Tablero de Resultados/Hallazgos (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`) con **Motor de Decisión ISO/IEC 17021-1 Cláusula 9.5/9.6**.
- **Certificación:** Organizaciones titulares (conteo de certificados activos), Certificados de conformidad (validación formal de justificaciones de no aplicabilidad) y Matriz de Competencias Técnicas de Auditores (`norma_auditor` + `sector_iaf_auditor`).
- **Catálogos Maestros (Extra) & Gobernanza:** Normas ISO, Cláusulas `LTREE`, Sectores IAF, Estatus, Tipos y Metodologías de Auditoría, Panel de Aprobaciones RBAC, Estado de Base de Datos y Modal Forense de Historial de Cambios (*Zero-UUID*).

## Comandos Principales

```bash
# Instalar dependencias
npm install

# Desarrollo (Express + Vite en http://localhost:3000)
npm run dev

# Verificación estricta de tipos TypeScript (tsc --noEmit)
npm run lint

# Suite completa de pruebas unitarias (node:test vía tsx, 16 suites)
npm test

# Compilación de producción optimizada en dist/
npm run build

# Arranque en producción (node server.ts en puerto 3000)
npm start
```

## Cuentas de Prueba (`05_usuarios.sql`)

Todas las cuentas de prueba utilizan la contraseña **`Password123*`** y están disponibles mediante acceso rápido (**Quick test login**) en la pantalla de inicio:

- **ADMIN:** `admin@fondonorma.test`
- **WORKER:** `worker@fondonorma.test`
- **AUDITOR:** `auditor@fondonorma.test`
- **CLIENT:** `client@fondonorma.test`

## Documentación Técnica Detallada

- [`public/doc/project_resume.md`](public/doc/project_resume.md) — Resumen ejecutivo y estructura completa del proyecto.
- [`public/doc/architecture/database_architecture.md`](public/doc/architecture/database_architecture.md) — Esquema PostgreSQL, 27 tablas, triggers ISO, `LTREE` e índices.
- [`public/doc/architecture/backend_api_security.md`](public/doc/architecture/backend_api_security.md) — Express 5, límites de credenciales y matriz DCL + RLS.
- [`public/doc/architecture/frontend_architecture.md`](public/doc/architecture/frontend_architecture.md) — Estado SPA, módulos puros de dominio y catálogo de vistas.
- [`public/doc/architecture/testing_and_operations.md`](public/doc/architecture/testing_and_operations.md) — Suite `node:test`, verificación estática, viewport responsiveness y despliegue.