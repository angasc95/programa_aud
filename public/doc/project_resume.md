# Resumen Ejecutivo y Técnico: `programa_aud`

**Google AI Studio App:** [programa_aud](https://ai.studio/apps/f5f27961-b0a4-4b29-a8c7-6153e393aa1f)  
**Repositorio GitHub:** [programa_aud](https://github.com/angasc95/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Proyecto Supabase:** `ufowtgmpaahyshdxlnlq` (`https://ufowtgmpaahyshdxlnlq.supabase.co`)

---

## 1. Visión General y Estado Final del Proyecto

`programa_aud` es una plataforma integral para la **gestión, planificación, asignación técnica, trazabilidad normativa y control de hallazgos de programas y planes de auditoría de certificación**, diseñada e implementada bajo estándares internacionales:

- **ISO/IEC 17021-1:2015:** Integridad relacional de subconjunto entre certificados, sedes, turnos y procesos (validada mediante triggers en PostgreSQL); gestión de imparcialidad mediante bitácora forense inmutable (`public.audit_log` con resolución legible de actores y regla **Zero-UUID**); competencias técnicas obligatorias (`norma` + `sector_iaf` + `subsector_iaf`); validación de alcance narrativo (`certificado.alcance`, 10–1000 caracteres); exclusiones justificadas de cláusulas (ISO 9001 Cláusula 4.3); y **Motor de Decisión de Certificación (Cláusulas 9.5/9.6)** que bloquea recomendaciones de aprobación ante No Conformidades Mayores abiertas o No Conformidades Menores sin plan de acción correctiva.
- **ISO 19011:2018 e IAF MD 1:2018:** Ciclo completo de planificación de auditorías, equipos evaluadores (`Auditor Líder`, `Auditor de Equipo`, `Experto Técnico`), metodologías (`Presencial`, `Remota`, `Mixta`), modalidades canónicas (`Etapa 1`, `Etapa 2`, `Seguimiento 1`, `Seguimiento 2`, `Renovación`, `Diagnóstico`, `Extraordinaria`, `Especial`, `Otro`), muestreo multisitio bajo la **Convención Sitio 0** (Sede Principal HQ siempre en índice 0) y ciclo de vida CAPA de hallazgos en 5 estados.
- **Clasificación IAF y Acreditación:** Matriz cruzada entre normas certificables, organismos de acreditación (`ENAC`, `UKAS`, `ANAB`), sectores productivos IAF y sub-sectores jerárquicos con nivel de riesgo (`ALTO`, `MEDIO`, `BAJO`).

Las **Fases 1 a 6.3** de la hoja de ruta maestra (`public/roadmap/`) se encuentran completamente ejecutadas y verificadas: base de datos PostgreSQL/Supabase (**31 tablas**, **33 índices**, motor `LTREE`, DCL + RLS), servidor Express 5 (`server.ts`), aplicación SPA TypeScript estricta (`0 any`), **16 suites automatizadas (`155` pruebas en `node:test`)**, compilación Vite segmentada con `manualChunks` y validación responsiva de `375px` a `1920px`.

---

## 2. Arquitectura General del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend SPA (src/main.ts + src/lib/* + src/views/*)                   │
│  • TypeScript strict (0 any) + Vite 6 (manualChunks) + Tailwind CSS v4  │
│  • Cabecera en 3 bloques (Auditorías | Certificación | Extra)           │
│  • Enrutamiento SPA (#/{route}/{subview}) + Breadcrumbs jerárquicos     │
│  • Plantilla Universal List/Grid + Fichas de Detalle en 4 Zonas         │
│  • @supabase/supabase-js (URL + Anon Key) + llamadas HTTP a /api/*      │
└──────────────────────────┬───────────────────────────┬──────────────────┘
                           │ REST / RPC / Auth JWT     │ HTTP (mismo origen)
                           ▼                           ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────┐
│  Supabase Cloud (PostgreSQL + GoTrue)   │ │  Express 5 (server.ts)      │
│  • GoTrue Auth v2 + Trigger perfiles    │ │  • Puerto 3000 (0.0.0.0)    │
│  • PostgREST protegido por DCL + RLS    │ │  • Dev: Vite middleware     │
│  • 31 tablas + 33 índices (GiST/B-tree) │ │  • Prod: dist/ + fallback   │
│  • Motor LTREE + audit_log inmutable    │ │  • GET /api/health          │
│  • Triggers de integridad ISO 17021-1   │ │  • POST /api/reset-db       │
└─────────────────────────────────────────┘ └──────────────┬──────────────┘
                                                           │ Management API / pg
                                                           ▼
                                              public/supabase/queries/00..06.sql
```

### Mapa de Fases Implementadas (Fases 1–6.3)

| Fase | Alcance Ejecutado | Entregables Principales |
| :---: | :--- | :--- |
| **Fase 1** | Base de Datos y Esquema Normativo | Sub-sectores IAF con riesgo (`subsector_iaf`), expansión de `norma`, esquemas de acreditación (`organismo_acreditacion`, `acreditacion_norma_iaf`), `certificado.alcance` (1000 chars), `proceso.tipo` (`Estratégico`/`Medular`/`De Apoyo`/`Otro`), Convención Sitio 0, justificaciones en `requisitos_no_aplicables_certificado` y catálogos canónicos. |
| **Fase 2** | Shell Global UI/UX y Navegación | Iconografía minimalista de rol/estado (`🛡️`, `⚙️`, `📋`, `🏢`, `⏳`, `❌`), cabecera en 3 bloques con `data-nav-reset="true"`, motor de breadcrumbs con truncamiento a 24 caracteres, plantilla universal List/Grid con facetas y ordenamiento tipo Excel, fichas de detalle en 4 zonas y modal forense `🕒 Historial de Cambios`. |
| **Fase 3** | Dominio **Extra** (Catálogos Maestros) | Gestión y consulta de `Norma` (pestañas Acreditación y Requisitos `LTREE`), `Sector IAF` (pestañas Sub-Sectores y Auditores), `Estatus`, `Tipo` y `Metodología`. |
| **Fases 4.1–4.3** | Dominio **Certificación** | `Organización` con conteo exacto de certificados activos; `Certificado` con tabla limpia y ficha en 5 pestañas (`Sitios` con Sitio 0 primero, `Procesos`, `Turnos`, `No Aplicables` con validación `>= 5` chars, `Auditorías`); `Auditor` con matriz de competencias ISO/IAF y control de vigencias (`Vigente`, `Por Vencer`, `Vencido`). |
| **Fase 5** | Dominio **Auditorías** | `Programación` (ficha con `Equipo Evaluador`, `Sedes y Muestreo`, `Matriz de Verificación Normativa`), `Calendario` (Mensual, Trimestral, Timeline Gantt y detector de conflictos) y `Resultado` (tablero Tabla/Kanban de hallazgos, ciclo CAPA y motor de recomendación ISO/IEC 17021-1 Cláusulas 9.5/9.6). |
| **Fases 6.1–6.3** | Integración, Seguridad y Cierre | Integridad transversal de breadcrumbs e historial forense, cumplimiento estricto **Zero-UUID**, endurecimiento RBAC/RLS (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`), **16 suites `node:test`** (`155` pruebas), `tsc --noEmit`, `vite build` y sincronización documental. |

---

## 3. Bloques Operativos, RBAC y Trazabilidad

### 3.1 Tres Bloques Operativos en la Cabecera Global (`src/views/header.ts`)

1. **Bloque 1 — `Auditorías`:**
   - `Programación` (`#auditorias/scheduling`): Planificación de eventos, selección de equipo competente, muestreo multisitio y matriz normativa.
   - `Calendario` (`#auditorias/calendar`): Vistas Mensual, Trimestral y Línea de Tiempo Gantt con alertas de solapamiento de auditores.
   - `Resultado` (`#auditorias/findings`): Tablero Tabla/Kanban de hallazgos (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`), gestión CAPA y firma del dictamen ISO/IEC 17021-1.
2. **Bloque 2 — `Certificación`:**
   - `Organización` (`#certificacion/organizations`): Directorio de clientes titulares, validación de RIF/NIF, conteo estricto de certificados activos y pestaña de certificados asociados.
   - `Certificado` (`#certificacion/certificates`): Listado limpio sin ruido visual y ficha en 5 pestañas relacionales.
   - `Auditor` (`#certificacion/auditors`): Directorio técnico, calificaciones, vigencias de credenciales e historial de auditorías.
   - Secciones operativas complementarias: `Drill-Down` jerárquico, `Sedes Multisitio`, `Mapa de Procesos` y `Turnos` (exclusivo para personal interno `ADMIN`/`WORKER`).
3. **Bloque 3 — `Extra`:**
   - `Norma` (`#extra/standards`), `Sector IAF` (`#extra/iaf`), `Estatus` (`#extra/estatus`), `Tipo` (`#extra/tipos`), `Metodología` (`#extra/metodologias`), más `Requisitos LTREE` (`#extra/requirements`) y visor consolidado `Todos los Catálogos` (`#extra/catalogs`).

### 3.2 Matriz de Roles y Control de Acceso (`04_rls.sql` + `src/lib/accessControl.ts`)

- **Autoregistro (`Sign up`):** Los usuarios `CLIENT` se crean aprobados (`APPROVED`); las solicitudes como `ADMIN`, `WORKER` o `AUDITOR` nacen en `PENDING` mediante `handle_new_user()`. Los usuarios no aprobados (`PENDING ⏳` o `REJECTED ❌`) ven su icono de rol suprimido y no pueden acceder a rutas operativas.
- **`ADMIN` (`🛡️`):** Control administrativo total, gestión de aprobaciones y roles (`approvals`), panel diagnóstico en vivo (`database`), edición de catálogos, planificación, hallazgos y lectura global de `audit_log`.
- **`WORKER` (`⚙️`):** Gestión operativa completa de organizaciones, certificados, sedes, turnos, procesos, catálogos, planificación de auditorías y hallazgos; consulta de aprobaciones en modo solo lectura y acceso a `audit_log`.
- **`AUDITOR` (`📋`):** Lectura acotada a organizaciones, certificados, sedes y procesos vinculados a sus auditorías asignadas; mutación de matriz normativa, hallazgos y recomendación ISO 17021-1 únicamente en auditorías donde participa en `equipo_auditor` (`canMutateAuditExecution`), más consulta de `audit_log` de sus auditorías y hallazgos asignados.
- **`CLIENT` (`🏢`):** Acceso estrictamente de solo lectura a organizaciones aprobadas en `client_organization_access`, sus certificados, auditorías y hallazgos (sin acceso a `equipo_auditor`, `audit_log` ni mutaciones).

---

## 4. Documentación Técnica Detallada

| Documento | Contenido Técnico Cubierto |
| :--- | :--- |
| [`database_architecture.md`](architecture/database_architecture.md) | Orden de scripts SQL (`00`–`06`), extensiones (`uuid-ossp`, `ltree`), tipos `ENUM`, trigger `handle_new_user`, catálogo completo de **31 tablas**, triggers de integridad ISO/IEC 17021-1, `audit_log` inmutable (13 triggers), 19 triggers `updated_at`, motor recursivo `LTREE` y **33 índices**. |
| [`backend_api_security.md`](architecture/backend_api_security.md) | Servidor Express 5 (`server.ts`), endpoints `/api/health` y `/api/reset-db` (estrategia dual Supabase Management API / `pg.Client`), inyección de configuración (`vite.config.ts`), aislamiento de secretos y matriz **DCL + RLS** en las **31 tablas** con 7 funciones `SECURITY DEFINER`. |
| [`frontend_architecture.md`](architecture/frontend_architecture.md) | Estado `AppState` (`src/main.ts`), enrutamiento hash SPA, breadcrumbs con `data-nav-reset="true"`, plantilla universal List/Grid, fichas en 4 zonas, modal `audit_log` Zero-UUID, inventario de **16 módulos en `src/lib/`** y **25 vistas en `src/views/`**. |
| [`testing_and_operations.md`](architecture/testing_and_operations.md) | **16 suites unitarias (`155` pruebas en `node:test`)**, verificación estricta `tsc --noEmit` (`0 any`), compilación Vite con `manualChunks`, verificación responsiva `375px–1920px`, cuentas de prueba y despliegue en producción. |

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
│   ├── lib/                                 # 16 módulos de lógica pura + 16 suites *.test.ts
│   └── views/                               # 25 módulos de vistas HTML declarativas
└── public/
    ├── doc/                                 # Documentación técnica y resumen del proyecto
    ├── roadmap/                             # Especificaciones ejecutadas (Fases 1 a 6.3)
    └── supabase/queries/                    # Scripts SQL 00_delete_tables.sql .. 06_datos_prueba.sql
```

---

## 6. Inicio Rápido y Despliegue

- **Desarrollo:** `npm run dev` (Express 5 + Vite middleware en `http://0.0.0.0:3000`, `hmr: false`).
- **Pruebas y Calidad:** `npm run lint` (`tsc --noEmit`), `npm test` (`tsx --test src/lib/*.test.ts`) y `npm run build` (`vite build`).
- **Producción:** `npm run build && npm start` (`node server.ts` sirviendo `dist/` y `/api/*`).
- **Cuentas de prueba (`Password123*`):** `admin@fondonorma.test`, `worker@fondonorma.test`, `auditor@fondonorma.test`, `client@fondonorma.test`.
