# Resumen Ejecutivo y Técnico: `programa_aud`

**Google AI Studio App:** [programa_aud](https://ai.studio/apps/f5f27961-b10a-4b29-a8c7-6153e393aa1f)  
**Repositorio GitHub:** [programa_aud](https://github.com/angasc95/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Proyecto Supabase:** `ufowtgmpaahyshdxlnlq` (`https://ufowtgmpaahyshdxlnlq.supabase.co`)

---

## 1. Visión General y Alcance Implementado

`programa_aud` es una plataforma integral para la **gestión, planificación, asignación técnica, trazabilidad normativa y control de hallazgos de programas y planes de auditoría de certificación**, diseñada bajo estándares internacionales:

- **ISO/IEC 17021-1:2015:** Integridad de subconjunto entre certificados, sedes, turnos y procesos; gestión de imparcialidad mediante bitácora forense inmutable (`audit_log` con resolución de identidad *Zero-UUID*); competencias técnicas obligatorias (`norma` + `sector_iaf`); y motor de decisión de certificación (Cláusulas 9.5/9.6) que bloquea aprobaciones ante No Conformidades Mayores abiertas o NC Menores sin plan de acción correctiva.
- **ISO 19011:2018:** Ciclo completo de planificación, equipos auditores, metodologías (`PRESENCIAL`, `REMOTA`, `HIBRIDA`), modalidades (`ETAPA_1`, `ETAPA_2`, `VIGILANCIA_1`, `VIGILANCIA_2`, `RECERTIFICACION`, `EXTRAORDINARIA`), muestreo multisitio (con Sede 0 principal obligatoria) y ciclo de vida CAPA de hallazgos.
- **Clasificación IAF:** Matriz cruzada entre normas certificables, acreditaciones y sectores productivos del *International Accreditation Forum*.

La plataforma está implementada y verificada de extremo a extremo (PostgreSQL/Supabase, Express 5, SPA TypeScript estricta sin evasiones `any`, suite unitaria `node:test` de 16 archivos, compilación Vite con *chunking* optimizado y verificación responsiva de `375px` a `1920px`).

---

## 2. Arquitectura General del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend SPA (src/main.ts + src/lib/* + src/views/*)                   │
│  • TypeScript strict (0 any) + Vite 6 (manualChunks) + Tailwind CSS v4  │
│  • Enrutamiento SPA (#/{route}/{subview}) + Breadcrumbs jerárquicos     │
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

| Documento | Contenido Técnico Cubierto |
| :--- | :--- |
| [`database_architecture.md`](architecture/database_architecture.md) | Orden de scripts SQL (`00`–`06`), extensiones (`uuid-ossp`, `ltree`), tipos `ENUM`, trigger de autoprovisionamiento (`handle_new_user`), catálogo de **27 tablas**, 3 triggers de integridad ISO/IEC 17021-1, `audit_log` inmutable, motor recursivo `LTREE`, validación de competencias y 27 índices. |
| [`backend_api_security.md`](architecture/backend_api_security.md) | Servidor Express 5 (`server.ts`), endpoints `/api/health` y `/api/reset-db` (Supabase Management API + `pg.Client`), inyección de entorno (`vite.config.ts`), aislamiento de secretos y matriz **DCL + RLS** con 7 funciones `SECURITY DEFINER`. |
| [`frontend_architecture.md`](architecture/frontend_architecture.md) | Estado `AppState`, enrutamiento hash SPA, breadcrumbs con regla de reseteo en cabecera, hidratación en vivo, atajos de teclado, **16 módulos en `src/lib/`** y **25 vistas modulares en `src/views/`**. |
| [`testing_and_operations.md`](architecture/testing_and_operations.md) | **16 suites unitarias `node:test`** vía `tsx`, verificación estricta `tsc --noEmit`, `vite build` con división en chunks, verificación responsiva `375px–1920px`, cuentas de prueba y despliegue en producción. |

---

## 3. Control de Acceso Basado en Roles (RBAC) y Flujos Clave

### 3.1 Máquina de Estados de Registro y Roles
- **Autoregistro (`Sign up`):** Los usuarios `CLIENT` quedan aprobados automáticamente (`APPROVED`); las solicitudes como `ADMIN`, `WORKER` o `AUDITOR` nacen en `PENDING` mediante `handle_new_user()` y requieren validación administrativa.
- **Matriz Operativa por Rol (`src/lib/accessControl.ts` + `04_rls.sql`):**
  - **`ADMIN` (`🛡️`):** Control total del sistema, gestión de catálogos (`Dominio Extra`), aprobación/rechazo/revocación y cambio de rol de usuarios (`User Approvals`), diagnóstico en vivo (`Database Status`) y auditoría forense (`audit_log`).
  - **`WORKER` (`⚙️`):** Gestión operativa completa de organizaciones, certificados, sedes, turnos, procesos, planificación de auditorías, equipos y hallazgos; consulta de aprobaciones y trazabilidad forense.
  - **`AUDITOR` (`📋`):** Acceso de lectura a organizaciones, certificados, sedes y procesos vinculados a sus auditorías asignadas; mutación de hallazgos y recomendación técnica únicamente en auditorías donde figura asignado (`canMutateAuditExecution`).
  - **`CLIENT` (`🏢`):** Acceso estrictamente de solo lectura a organizaciones autorizadas con estado `APPROVED` en `client_organization_access`, sus certificados, auditorías y hallazgos (sin acceso a `audit_log` ni mutaciones operativas).

### 3.2 Flujos Funcionales Implementados (Fases 1–6.3)
1. **Autenticación, Acceso Rápido y Reset DB (`authView.ts`):** Inicio de sesión, registro con selector de rol, **Quick test login** (`Admin`, `Worker`, `Auditor`, `Client`) y botón **Reset DB** conectado a `POST /api/reset-db`.
2. **Navegación Global por Dominios y Breadcrumbs (`header.ts` + `breadcrumbView.ts`):** Cabecera fija con menús desplegables accesibles y atributos `data-nav-reset="true"` que limpian la pila de *breadcrumbs* al cambiar de dominio, más truncamiento automático a 24 caracteres.
3. **Exploración Operativa de Certificados (`dashboardView.ts` + `searchControlsView.ts`):** Búsqueda multi-criterio en vivo (`/` para enfocar), filtros por estatus/norma, conmutación **Cuadrícula / Lista** y barras de cobertura ISO (`LTREE`).
4. **Dominio Auditorías (`auditoriasView.ts` + `programacionView.ts` + `calendarioView.ts` + `resultadoView.ts`):**
   - **Programación:** Planificación con muestreo multisitio (Sede 0 principal primero), asignación de auditores validada por matriz de competencias y vistas Cuadrícula/Lista.
   - **Calendario:** Vista Mensual, Trimestral y Línea de Tiempo/Gantt con detección automática de conflictos de disponibilidad de auditores.
   - **Resultado:** Tablero de hallazgos Tabla/Kanban, gestión del ciclo de vida CAPA y **Motor de Decisión ISO/IEC 17021-1 Cláusula 9.5/9.6**.
5. **Dominio Certificación (`certificacionView.ts` + `organizacionView.ts` + `certificadoView.ts` + `auditorView.ts` + `drillDownView.ts`):** Conteo preciso de certificados activos, detalle en 5 pestañas de certificado con validación de justificaciones de no aplicabilidad (`>= 5` caracteres), matriz de competencias de auditores y cascada jerárquica *Drill-Down*.
6. **Dominio Extra y Bitácora Forense (`extraView.ts` + `normaView.ts` + `sectorIafView.ts` + `estatusView.ts` + `tipoAuditoriaView.ts` + `metodologiaAuditoriaView.ts` + `auditLogModal.ts`):** Plantilla universal ordenable/facetada para catálogos ISO/IAF y modal forense inmutable con cumplimiento estricto **Zero-UUID**.

---

## 4. Estructura del Proyecto

```text
├── .env.example                             # Plantilla de variables de entorno
├── index.html                               # Punto de entrada HTML5
├── metadata.json                            # Metadatos del proyecto AI Studio
├── package.json                             # Scripts (dev, build, start, lint, test)
├── server.ts                                # Servidor Express 5 + Vite middleware + /api/*
├── tsconfig.json                            # Configuración TypeScript (strict: true)
├── vite.config.ts                           # Vite + @tailwindcss/vite + manualChunks
├── src/
│   ├── index.css                            # Tailwind CSS v4 y tipografías
│   ├── main.ts                              # Estado global, rutas SPA, hidratación Supabase y eventos
│   ├── lib/                                 # 16 módulos puros + 16 suites *.test.ts
│   └── views/                               # 25 módulos de vistas HTML declarativas
└── public/
    ├── doc/                                 # Documentación técnica y resumen del proyecto
    ├── roadmap/                             # Fases 1 a 6.3 y hoja de ruta maestra
    └── supabase/queries/                    # Scripts SQL 00_delete_tables.sql .. 06_datos_prueba.sql
```

---

## 5. Inicio Rápido y Despliegue

- **Desarrollo:** `npm run dev` (Express + Vite en `http://localhost:3000`).
- **Pruebas y Calidad:** `npm run lint` (`tsc --noEmit`), `npm test` (`tsx --test src/lib/*.test.ts`) y `npm run build` (`vite build`).
- **Producción:** `npm run build && npm start` (`node server.ts` en `0.0.0.0:3000`).
- **Cuentas de prueba (`Password123*`):** `admin@fondonorma.test`, `worker@fondonorma.test`, `auditor@fondonorma.test`, `client@fondonorma.test`.
