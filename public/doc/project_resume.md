# Resumen Ejecutivo y Técnico: `programa_aud`

**Google AI Studio App:** [programa_aud](https://ai.studio/apps/f5f27961-b0a4-4b29-a8c7-6153e393aa1f)  
**Repositorio GitHub:** [programa_aud](https://github.com/angasc95/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Proyecto Supabase:** `ufowtgmpaahyshdxlnlq` (`https://ufowtgmpaahyshdxlnlq.supabase.co`)

---

## 1. Visión General y Estado Final del Proyecto

`programa_aud` es una plataforma integral para la **gestión, planificación, asignación técnica, trazabilidad normativa, gobierno de retención lógica y control de hallazgos de programas y planes de auditoría de certificación**, diseñada e implementada bajo estándares internacionales:

- **ISO/IEC 17021-1:2015:** Integridad relacional de subconjunto entre certificados, sedes, turnos y procesos (validada mediante triggers en PostgreSQL); trazabilidad forense inmutable (`public.audit_log` con resolución legible de actores y regla **Zero-UUID**); competencias técnicas obligatorias (`norma` + `sector_iaf` + `subsector_iaf`); declaración narrativa de alcance (`certificado.alcance`, 10–1000 caracteres); exclusiones justificadas de cláusulas (`requisitos_no_aplicables_certificado`); y **Motor de Decisión de Certificación (Cláusulas 9.5/9.6)** que bloquea recomendaciones de aprobación ante No Conformidades Mayores abiertas o No Conformidades Menores sin plan de acción correctiva.
- **ISO 19011:2018 e IAF MD 1:2018:** Ciclo completo de planificación de auditorías, equipos evaluadores (`Auditor Líder`, `Auditor de Equipo`, `Experto Técnico`), metodologías (`Presencial`, `Remota`, `Mixta`), modalidades canónicas (`Etapa 1`, `Etapa 2`, `Seguimiento 1`, `Seguimiento 2`, `Renovación`, `Diagnóstico`, `Extraordinaria`, `Especial`, `Otro`), muestreo multisitio bajo la **Convención Sitio 0** (Sede Principal HQ siempre protegida en índice `0`) y ciclo de vida CAPA de hallazgos en 5 estados.
- **ISO/IEC 17011 y Clasificación IAF:** Matriz cruzada entre organismos acreditadores (`ENAC`, `UKAS`, `ANAB`), normas certificables, alcances de acreditación (`acreditacion_norma_iaf`), sectores IAF y sub-sectores jerárquicos con nivel de riesgo (`ALTO`, `MEDIO`, `BAJO`).

Las **Fases 1.1 a 5.2** de la hoja de ruta de modernización (`public/roadmap/`) se encuentran completamente ejecutadas y verificadas: base de datos PostgreSQL/Supabase (**31 tablas**, **52 índices** incluyendo **15 índices únicos parciales**, retención **Soft-Delete en 23 tablas protegidas**, **92 políticas RLS** + DCL), servidor Express 5 (`server.ts`), aplicación SPA TypeScript estricta (`strict: true`, `0 any`), **20 módulos en `src/lib/`**, **30 vistas en `src/views/`**, **30 archivos de pruebas unitarias (`236` pruebas aprobadas en `23` suites de `node:test`)**, compilación Vite con `manualChunks` y validación responsiva en navegador real Chromium (`375px` a `1920px`).

---

## 2. Arquitectura General del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend SPA (src/main.ts + 20 módulos src/lib/* + 30 vistas src/views/*)
│  • TypeScript strict (0 any) + Vite 6 (manualChunks) + Tailwind CSS v4  │
│  • Cabecera en 3 bloques (Auditoría | Certificación | Extra) + Mi Perfil│
│  • Dashboard minimalista RBAC (5 métricas) sin exploradores duplicados  │
│  • Breadcrumbs compactos (1 línea, elipsis y prevención de bucles)      │
│  • Multi View universal (facetas reactivas, búsqueda type="text")       │
│  • Detail View estandarizado en 3 Zonas + Archivo Seguro / Restauración │
│  • @supabase/supabase-js (URL + Anon Key) + peticiones HTTP a /api/*    │
└──────────────────────────┬───────────────────────────┬──────────────────┘
                           │ REST / RPC / Auth JWT     │ HTTP (mismo origen)
                           ▼                           ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────┐
│  Supabase Cloud (PostgreSQL + GoTrue)   │ │  Express 5 (server.ts)      │
│  • GoTrue Auth v2 + Trigger profiles    │ │  • Puerto 3000 (0.0.0.0)    │
│  • PostgREST protegido por DCL + RLS    │ │  • Dev: Vite middleware     │
│  • 31 tablas + 52 índices (15 uq_active)│ │  • Prod: dist/ + fallback   │
│  • Soft-Delete (23 tablas) + guardias   │ │  • GET /api/health          │
│  • Motor LTREE + audit_log inmutable    │ │  • POST /api/reset-db       │
│  • RPCs: get_archive_dependency_summary │ └──────────────┬──────────────┘
│          archive_record / cobertura     │                │ Management API / pg
└─────────────────────────────────────────┘                ▼
                                              public/supabase/queries/00..06.sql
```

### Mapa de Fases Implementadas (`public/roadmap/` — Fases 1.1 a 5.2)

| Fase | Alcance Ejecutado | Entregables Principales |
| :---: | :--- | :--- |
| **Fases 1.1–1.2** | Retención Soft-Delete y Endurecimiento RLS | Columnas `deleted_at`, `deleted_by`, `delete_reason`; triggers `fn_prevent_hard_delete` (23 tablas), `fn_sync_soft_delete_*` y `fn_guard_parent_archival`; RPCs `get_archive_dependency_summary` y `archive_record`; `REVOKE DELETE` en 26 tablas; 15 índices únicos parciales (`WHERE deleted_at IS NULL`); guardia `fn_protect_profile_rbac_fields` contra auto-escalamiento en `profiles`. |
| **Fases 2.1–2.2** | Shell Global en 3 Bloques, Dashboard Minimalista y `Mi Perfil` | Cabecera en 3 bloques singulares (`Auditoría`, `Certificación`, `Extra` con `Acreditación`); retiro de sub-vistas obsoletas (`Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, `Turnos`, `Requisitos LTREE`, `Todos los Catálogos`) y tarjetas duplicadas; Dashboard de 5 métricas acotadas por RBAC; nueva vista **`Mi Perfil`** (`profileView.ts`) con bloqueo estricto de `role` y `status`. |
| **Fase 3** | Motor de Breadcrumbs Compactos | Barra de una sola línea sin bordes contenedores (`flex-nowrap`), truncamiento a 24 caracteres (`…`) y colapso intermedio (`MAX_VISIBLE_BREADCRUMBS = 4`), regla estricta de reseteo en cabecera (`data-nav-reset="true"`), preservación de linaje contextual cross-domain y prevención de bucles con claves compuestas (`id` / `entityId + entityType + subview/route`). |
| **Fases 4.1–4.2** | Plantillas Universales Multi View y Detail View en 3 Zonas | **Multi View** (`universalTemplate`): barra lateral colapsable con botón hamburguesa, conteos reactivos por intersección ($S_{-k}$), buscador único `type="text"` con un solo botón `✕` (sin doble X nativa), totalizador `Mostrando X de Y` y conmutador `Tarjetas`/`Tabla`. **Detail View** (`detailTemplate`): arquitectura vertical limpia en 3 Zonas (`Parent Zone` → divisor → `Record Zone` → `Children Zone` en pestañas), eliminación de encabezados `ZONA 1/3/4` y retiro de `drillDownView`. Nuevos dominios/vistas **`Acreditación`**, **`Sitio`** (Sede 0 HQ), **`Proceso`** (`LTREE`) y **`Turno`** (jornadas nocturnas). |
| **Fases 5.1–5.2** | Archivo Seguro, Restauración Admin y Suite de Verificación | Modal de archivo seguro (`archiveModalView.ts`) con bloqueo por dependencias activas y motivo (máx. 300 chars); filtro `"Mostrar Archivados"` y acción `"Restaurar"` exclusivos para `ADMIN`; actualización integral de suites legacy + **4 nuevas suites de dominio** (**236 pruebas / 23 suites en `node:test`**), `tsc --noEmit` (`0 any`), compilación `vite build` y verificación responsiva Chromium (`375px`–`1440px`). |

---

## 3. Bloques Operativos, RBAC y Gobernanza

### 3.1 Tres Bloques Operativos en la Cabecera Global (`src/views/header.ts` + `src/lib/healthCheck.ts`)

1. **Bloque 1 — `Auditoría` (`📅`):**
   - `Programación` (`#auditorias/scheduling`): Planificación de eventos, selección de equipo competente, muestreo multisitio y matriz normativa.
   - `Calendario` (`#auditorias/calendar`): Vistas Mensual, Trimestral y Línea de Tiempo Gantt con alertas de solapamiento de auditores.
   - `Resultado` (`#auditorias/findings`): Tablero Tabla/Kanban de hallazgos (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`), flujo CAPA y firma del dictamen ISO/IEC 17021-1.
2. **Bloque 2 — `Certificación` (`🏛️`):**
   - `Organización` (`#certificacion/organizations`): Directorio de clientes titulares, validación de RIF/NIF, conteo estricto de certificados activos y acceso contextual a certificados.
   - `Certificado` (`#certificacion/certificates`): Listado limpio Multi View y ficha en 3 zonas con 6 pestañas de hijos (`Sitios` con Sitio 0 HQ primero, `Procesos`, `Turnos`, `No Aplicables`, `Cobertura Normativa`, `Auditorías`) que navegan directamente a los Detail Views de `Sitio`, `Proceso` y `Turno`.
   - `Auditor` (`#certificacion/auditors`): Directorio técnico, calificaciones, vigencias de credenciales e historial de auditorías.
3. **Bloque 3 — `Extra` (`📚`):**
   - `Norma` (`#extra/standards`), `Sector IAF` (`#extra/iaf`), `Acreditación` (`#extra/accreditations`), `Estatus` (`#extra/estatus`), `Tipo` (`#extra/tipos`) y `Metodología` (`#extra/metodologias`).
4. **Menú de Cuenta (esquina superior derecha):**
   - `Mi Perfil` (`#profile`): Disponible para todo usuario autenticado (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`, incluyendo cuentas `PENDING`/`REJECTED`) para editar exclusivamente su `nombre` y contraseña, manteniendo `role` y `status` en solo lectura.
   - `Panel Aprobaciones` (`#approvals`): Gestión para `ADMIN` y consulta de solo lectura para `WORKER`.
   - `Estado DB` (`#database`): Diagnóstico de conectividad en vivo exclusivo para `ADMIN`.

### 3.2 Matriz de Roles, Soft-Delete y Control de Acceso (`04_rls.sql` + `src/lib/accessControl.ts` + `src/lib/archiveGovernance.ts`)

- **Autoregistro (`Sign up`):** Los usuarios `CLIENT` nacen aprobados (`APPROVED`); las solicitudes como `ADMIN`, `WORKER` o `AUDITOR` quedan en `PENDING` mediante `handle_new_user()`. Los perfiles `PENDING` (`⏳`) o `REJECTED` (`❌`) suprimen el icono de rol y solo acceden a `dashboard` y `profile`.
- **`ADMIN` (`🛡️`):** Acceso total a los 3 bloques, `Panel Aprobaciones` (gestión de roles/estados), `Estado DB`, edición, archivo seguro (`🗄️ Archivar`), filtro `"Mostrar Archivados"`, acción `"Restaurar"` (`deleted_at = NULL`) y lectura global de `audit_log`.
- **`WORKER` (`⚙️`):** Acceso a los 3 bloques, gestión operativa completa, lectura de usuarios en `Panel Aprobaciones`, ejecución de archivo seguro vía `archive_record` cuando no existen dependencias activas (sin acceso a `"Mostrar Archivados"` ni `"Restaurar"`) y lectura de `audit_log`.
- **`AUDITOR` (`📋`):** Visibilidad acotada a bloques **`Auditoría`** y **`Extra`** (sin acceso al menú `Certificación`); lectura de organizaciones/certificados/sitios/procesos asociados a sus auditorías asignadas; mutación de matriz normativa, hallazgos y recomendación ISO 17021-1 únicamente en auditorías donde participa en `equipo_auditor` (`canMutateAuditExecution`), más consulta acotada de `audit_log`. Sin permisos de archivo.
- **`CLIENT` (`🏢`):** Acceso de solo lectura a los 3 bloques acotado a organizaciones aprobadas en `client_organization_access`, sus certificados, sitios, procesos, auditorías y hallazgos (sin acceso a `equipo_auditor`, `audit_log`, archivo seguro ni mutaciones).

---

## 4. Documentación Técnica Detallada

| Documento | Contenido Técnico Cubierto |
| :--- | :--- |
| [`database_architecture.md`](architecture/database_architecture.md) | Scripts SQL (`00`–`06`), extensiones (`uuid-ossp`, `ltree`), ENUMs, `handle_new_user`, catálogo de **31 tablas**, arquitectura **Soft-Delete (23 tablas protegidas)**, `get_archive_dependency_summary`, guardia `fn_protect_profile_rbac_fields`, triggers ISO 17021-1, `audit_log` inmutable (25 triggers de auditoría), 19 triggers `updated_at`, motor `LTREE` y **52 índices** (15 únicos parciales + 37 B-tree/GiST). |
| [`backend_api_security.md`](architecture/backend_api_security.md) | Servidor Express 5 (`server.ts`), endpoints `/api/health` y `/api/reset-db`, inyección de entorno (`vite.config.ts`), aislamiento de secretos, DCL (`REVOKE DELETE` en 26 tablas), 7 funciones `SECURITY DEFINER`, RPC `archive_record`, bloqueo anti-escalamiento en `profiles` y matriz de **92 políticas RLS** en las 31 tablas. |
| [`frontend_architecture.md`](architecture/frontend_architecture.md) | Estado `AppState` (`src/main.ts`), enrutamiento hash SPA, cabecera en 3 bloques, Dashboard minimalista, vista `Mi Perfil`, motor de breadcrumbs compactos, plantilla universal Multi View (facetas reactivas $S_{-k}$ y búsqueda `type="text"`), fichas de detalle en 3 Zonas (`Acreditación`, `Sitio`, `Proceso`, `Turno`), modal de archivo seguro + restauración e inventario de **20 módulos en `src/lib/`** y **30 vistas en `src/views/`**. |
| [`testing_and_operations.md`](architecture/testing_and_operations.md) | **30 archivos de pruebas (`236` pruebas en `23` suites `node:test`)**, verificación `tsc --noEmit` (`0 any`), compilación Vite con `manualChunks`, verificación responsiva Chromium (`375×812`, `1440×900`, `1920px`), cuentas de prueba y despliegue en producción. |

---

## 5. Estructura del Proyecto

```text
├── .env.example                             # Plantilla de variables de entorno
├── index.html                               # Punto de entrada HTML5
├── metadata.json                            # Metadatos del proyecto AI Studio
├── package.json                             # Scripts (dev, build, start, lint, test)
├── server.ts                                # Servidor Express 5 + Vite middleware + /api/*
├── supabase.config.json                     # Configuración base Supabase (URL + Anon Key)
├── tsconfig.json                            # Configuración TypeScript (strict: true)
├── vite.config.ts                           # Vite 6 + @tailwindcss/vite + manualChunks
├── src/
│   ├── index.css                            # Tailwind CSS v4 y tipografías
│   ├── main.ts                              # Estado global, rutas SPA, hidratación Supabase y eventos
│   ├── lib/                                 # 20 módulos de lógica pura + 30 archivos *.test.ts
│   └── views/                               # 30 módulos de vistas HTML declarativas
└── public/
    ├── doc/                                 # Documentación técnica sincronizada del proyecto
    ├── roadmap/                             # Especificaciones ejecutadas (Fases 1.1 a 5.2)
    └── supabase/queries/                    # Scripts SQL 00_delete_tables.sql .. 06_datos_prueba.sql
```

---

## 6. Inicio Rápido y Despliegue

- **Desarrollo:** `npm run dev` (Express 5 + Vite middleware en `http://0.0.0.0:3000`, `hmr: false`).
- **Pruebas y Calidad:** `npm run lint` (`tsc --noEmit`), `npm test` (`tsx --test src/lib/*.test.ts`) y `npm run build` (`vite build`).
- **Producción:** `npm run build && npm start` (`node server.ts` sirviendo `dist/` y `/api/*`).
- **Cuentas de prueba (`Password123*`):** `admin@fondonorma.test`, `worker@fondonorma.test`, `auditor@fondonorma.test`, `client@fondonorma.test`.
