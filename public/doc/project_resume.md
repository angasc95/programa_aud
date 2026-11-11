# Resumen Ejecutivo y Técnico: `programa_aud`

**Google AI Studio App:** [programa_aud](https://ai.studio/apps/f5f27961-b10a-4b29-a8c7-6153e393aa1f)  
**Repositorio GitHub:** [programa_aud](https://github.com/certificacionfn/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Proyecto Supabase:** `ufowtgmpaahyshdxlnlq` (`https://ufowtgmpaahyshdxlnlq.supabase.co`)

---

## 1. Visión General y Alcance Implementado

`programa_aud` es una plataforma integral para la **gestión, planificación, asignación técnica, trazabilidad normativa y control de hallazgos de programas y planes de auditoría de certificación**, diseñada bajo estándares internacionales:

- **ISO/IEC 17021-1:2015:** Integridad de subconjunto entre certificados, sedes, turnos y procesos; gestión de imparcialidad mediante bitácora forense inmutable y competencias técnicas obligatorias.
- **ISO 19011:2018:** Ciclo completo de planificación, equipos auditores, metodologías (`PRESENCIAL`, `REMOTA`, `HIBRIDA`), modalidades (`ETAPA_1`, `ETAPA_2`, `VIGILANCIA_1`, `VIGILANCIA_2`, `RECERTIFICACION`, `EXTRAORDINARIA`) y clasificación de hallazgos.
- **Clasificación IAF:** Matriz cruzada entre normas certificables y sectores productivos del *International Accreditation Forum*.

La plataforma se encuentra implementada de extremo a extremo (capas de Base de Datos PostgreSQL/Supabase, Servidor Express 5 y SPA TypeScript/Tailwind CSS v4) cubriendo autenticación y aprobación RBAC, exploración operativa multi-criterio en vivo, gestión de los tres dominios de negocio, navegación jerárquica profunda (*Drill-Down*), cálculo recursivo `LTREE` de cobertura ISO y reinicio automatizado de base de datos para pruebas.

---

## 2. Arquitectura General del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend SPA (src/main.ts + src/lib/* + src/views/*)                   │
│  • TypeScript strict + Vite + Tailwind CSS v4                           │
│  • Enrutamiento SPA (#/{route}/{subview}) sin recarga                   │
│  • @supabase/supabase-js (solo URL + Anon Key) + llamadas a /api/*      │
└──────────────────────────┬───────────────────────────┬──────────────────┘
                           │ REST / RPC / Auth JWT     │ HTTP (mismo origen)
                           ▼                           ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────┐
│  Supabase Cloud (PostgreSQL + GoTrue)   │ │  Express 5 (server.ts)      │
│  • GoTrue Auth v2 + Trigger perfiles    │ │  • Puerto 3000 (0.0.0.0)    │
│  • PostgREST protegido por DCL + RLS    │ │  • Dev: Vite middleware     │
│  • 27 tablas + 27 índices (GiST/B-tree) │ │  • Prod: dist/ + fallback   │
│  • Motor LTREE + audit_log inmutable    │ │  • GET /api/health          │
│  • Triggers de integridad ISO 17021-1   │ │  • POST /api/reset-db       │
└─────────────────────────────────────────┘ └──────────────┬──────────────┘
                                                           │ Management API / pg
                                                           ▼
                                              public/supabase/queries/00..06.sql
```

### Documentación Técnica Detallada (Modular)

Para profundizar en los detalles internos de cada capa sin sobrecargar este resumen, consulte los módulos especializados en [`public/doc/architecture/`](architecture/):

| Documento | Contenido Técnico Cubierto |
| :--- | :--- |
| [`database_architecture.md`](architecture/database_architecture.md) | Orden de scripts SQL (`00`–`06`), extensiones (`uuid-ossp`, `ltree`), tipos `ENUM`, trigger de autoprovisionamiento (`handle_new_user`), catálogo completo de las **27 tablas**, 3 triggers de integridad ISO/IEC 17021-1, `audit_log` inmutable, motor recursivo `LTREE` (`evaluar_cobertura_certificado`, `cobertura_normativa_certificado`), validación de competencias, 27 índices y semillero. |
| [`backend_api_security.md`](architecture/backend_api_security.md) | Arquitectura Express 5 (`server.ts`), endpoints `/api/health` y `/api/reset-db` (estrategia dual Supabase Management API + `pg.Client`), inyección segura de entorno (`vite.config.ts`), límite de credenciales y matriz completa de **DCL + RLS** con las 7 funciones `SECURITY DEFINER` sobre las 27 tablas. |
| [`frontend_architecture.md`](architecture/frontend_architecture.md) | Contenedor `AppState`, enrutamiento hash SPA, hidratación paralela desde Supabase con fallback curado, atajos de teclado (`/` y `Esc`), módulos de lógica pura (`healthCheck.ts`, `searchControls.ts`, `drillDown.ts`) y las **10 vistas** (`authView`, `header`, `dashboardView`, `searchControlsView`, `auditoriasView`, `certificacionView`, `extraView`, `drillDownView`, `approvalsView`, `databaseStatusView`). |
| [`testing_and_operations.md`](architecture/testing_and_operations.md) | Suites unitarias `node:test`, verificación `tsc --noEmit` y `vite build`, variables de entorno, 4 cuentas de prueba (`05_usuarios.sql`), orden de ejecución en Supabase y despliegue en Cloud Run (`npm run build && npm start`). |

---

## 3. Control de Acceso Basado en Roles (RBAC) y Flujos Clave

### 3.1 Máquina de Estados de Registro y Roles
- **Autoregistro (`Sign up`):** Los usuarios `CLIENT` quedan aprobados automáticamente (`APPROVED`); las solicitudes como `ADMIN`, `WORKER` o `AUDITOR` nacen en `PENDING` mediante `handle_new_user()` y requieren validación administrativa.
- **Matriz Operativa por Rol:**
  - **`ADMIN` (`🛡️`):** Control total del sistema, gestión de catálogos (`Dominio Extra`), aprobación/rechazo/revocación y cambio de rol de usuarios (`User Approvals`), diagnóstico en vivo (`Database Status`) y lectura de `audit_log`.
  - **`WORKER` (`⚙️`):** Gestión operativa completa de organizaciones, certificados, sedes, turnos, procesos, planificación de auditorías, equipos y hallazgos; lectura de catálogos y perfiles.
  - **`AUDITOR` (`📋`):** Acceso de lectura a organizaciones, certificados, sedes y procesos vinculados a sus auditorías asignadas (mediante `is_auditor_for_org`, `is_auditor_for_cert`, `is_assigned_auditor`), además de creación/cierre de hallazgos y comentarios en dichas auditorías.
  - **`CLIENT` (`🏢`):** Acceso de lectura acotado exclusivamente a organizaciones autorizadas con estado `APPROVED` en `client_organization_access`, sus certificados, auditorías y hallazgos.

### 3.2 Flujos Funcionales Principales
1. **Autenticación, Acceso Rápido y Reset DB (`authView.ts`):** Inicio de sesión estándar, registro con selector de rol, botones de **Quick test login** (`Admin`, `Worker`, `Auditor`, `Client`) y botón **Reset DB** con modal de confirmación que reconstruye y re-siembra Supabase en un clic mediante `POST /api/reset-db`.
2. **Navegación Global por Dominios (`header.ts`):** Cabecera fija con menús desplegables (*hover*, clic y teclado) sensibles al rol y estado: **Dominio Auditorías** (`Event Scheduling`, `Calendar Selection`, `Auditor Team`, `Audit Scope`, `Findings`), **Dominio Certificación** (`Certificates`, `Drill-Down Explorer`, `Organizations`, `Sites`, `Processes`, `Shifts`), **Dominio Extra** (`Standards`, `Requirements LTREE`, `IAF Sectors`, `Catalogs`) y menú derecho de cuenta.
3. **Exploración Operativa en Tiempo Real (`dashboardView.ts` + `searchControlsView.ts`):** Búsqueda multi-token normalizada por código de certificado, razón social, RIF y norma; filtros por estatus/norma; alternancia persistente **Cuadrícula / Lista** (`localStorage`); barras de cobertura ISO calculadas en vivo vía RPC `cobertura_normativa_certificado`.
4. **Planificación y Hallazgos (`auditoriasView.ts`):** Formulario inline **"Planificar Nueva Auditoría"** persistiendo en `auditoria`, `equipo_auditor` y `sitios_por_auditoria`, tablero de alcance tripartito (sitio/turno/proceso) y registro/cierre de hallazgos (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`).
5. **Explorador Relacional Drill-Down (`drillDownView.ts`):** Cascada guiada por *breadcrumbs*: Organización → Certificado → 4 pestañas de inspección (`Sedes y Turnos`, `Mapa de Procesos`, `Matriz Normativa (ltree)` y `Auditorías y Hallazgos`).
6. **Consola Administrativa (`approvalsView.ts` + `databaseStatusView.ts`):** Aprobación, revocación y cambio dinámico de rol sobre `public.profiles` (con protección contra auto-modificación), más verificador de salud de 5 puntos contra Supabase en vivo.

---

## 4. Estructura Actual del Proyecto

```text
├── .env                                     # Variables locales (no versionado)
├── .env.example                             # Plantilla de variables de entorno
├── .gitignore
├── README.md
├── bun.lock
├── index.html                               # Punto de entrada HTML5
├── metadata.json                            # Metadatos del proyecto AI Studio
├── package.json                             # Scripts (dev, build, start, lint) y dependencias
├── server.ts                                # Servidor Express 5 + Vite middleware + /api/reset-db
├── tsconfig.json                            # Configuración TypeScript (strict: true)
├── vite.config.ts                           # Configuración Vite + @tailwindcss/vite + define env
├── src/
│   ├── index.css                            # Tailwind CSS v4 y tipografías (Plus Jakarta / JetBrains)
│   ├── main.ts                              # Estado global, rutas SPA, hidratación Supabase y eventos
│   ├── lib/
│   │   ├── drillDown.ts                     # Lógica pura de modalidades, hallazgos, validación y RBAC
│   │   ├── drillDown.test.ts                # Suite de pruebas unitarias Fase 5
│   │   ├── healthCheck.ts                   # Guardias RBAC, menús, salud DB, reset y errores
│   │   ├── healthCheck.test.ts              # Suite de pruebas unitarias Fase 1 / RBAC
│   │   ├── html.ts                          # Escape HTML anti-XSS
│   │   ├── searchControls.ts                # Lógica pura de búsqueda, facetas y cobertura Subfase 4.2
│   │   ├── searchControls.test.ts           # Suite de pruebas unitarias Subfase 4.2
│   │   └── supabase.ts                      # Cliente @supabase/supabase-js
│   └── views/
│       ├── approvalsView.ts                 # Consola Admin de aprobaciones y cambio de rol
│       ├── auditoriasView.ts                # Dominio Auditorías (agenda, equipo, alcance, hallazgos)
│       ├── authView.ts                      # Log In, Sign up, Quick test login y Reset DB modal
│       ├── certificacionView.ts             # Dominio Certificación (certificados, orgs, sitios, procesos, turnos)
│       ├── dashboardView.ts                 # Dashboard principal + Explorador de Certificados
│       ├── databaseStatusView.ts            # Verificador de salud Supabase (5 comprobaciones)
│       ├── drillDownView.ts                 # Explorador jerárquico en cascada Org → Cert → Alcance
│       ├── extraView.ts                     # Dominio Extra (normas, requisitos LTREE, IAF, catálogos)
│       ├── header.ts                        # Cabecera global con dropdowns por dominio y cuenta
│       └── searchControlsView.ts            # Componentes reutilizables de búsqueda y vista Grid/List
└── public/
    ├── doc/
    │   ├── project_resume.md                # Resumen maestro de arquitectura (este documento)
    │   └── architecture/
    │       ├── backend_api_security.md      # Express 5, credenciales y doble capa DCL + RLS
    │       ├── database_architecture.md     # Esquema DDL, 27 tablas, triggers, LTREE e índices
    │       ├── frontend_architecture.md     # SPA, estado, rutas, módulos puros y 10 vistas
    │       └── testing_and_operations.md    # Pruebas node:test, env, cuentas y Cloud Run
    └── supabase/
        └── queries/
            ├── 00_delete_tables.sql         # Limpieza y reinicio del esquema public
            ├── 01_creacion.sql              # DDL, tipos ENUM, perfiles, triggers ISO y audit_log
            ├── 02_cobertura_normativa.sql   # Funciones LTREE de cobertura y competencias
            ├── 03_indices_optimizacion.sql  # 27 índices GiST y B-tree
            ├── 04_rls.sql                   # Privilegios DCL, 7 funciones helper y políticas RLS
            ├── 05_usuarios.sql              # 4 usuarios de prueba Auth + Profiles
            └── 06_datos_prueba.sql          # Semillero idempotente de los 3 dominios
```

---

## 5. Inicio Rápido y Despliegue

- **Desarrollo:** `npm run dev` (Express + Vite en `http://localhost:3000`).
- **Verificación:** `npm run lint` (`tsc --noEmit`), `npm run build` (`vite build`) y `node --import tsx --test src/lib/*.test.ts`.
- **Producción:** `npm run build && npm start` (`node server.ts` escuchando en `0.0.0.0:3000`).
- **Cuentas de prueba (`Password123*`):** `admin@fondonorma.test`, `worker@fondonorma.test`, `auditor@fondonorma.test`, `client@fondonorma.test`.
