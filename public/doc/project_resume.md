# Resumen del Proyecto: `programa_aud`

** Google AI Studio Public Link:** [programa_aud](https://ai.studio/apps/f5f27961-b10a-4b29-a8c7-6153e393aa1f)
**Repositorio GitHub:** [programa_aud](https://github.com/certificacionfn/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Base de Datos Supabase:**
- **Project URL:** `https://ufowtgmpaahyshdxlnlq.supabase.co`
- **Publishable Key:** `sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
- **Variables de Entorno:** Configuradas en `.env` y documentadas en `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_DATABASE_KEY`, `VITE_SUPABASE_TOKEN`)

---

## 1. Visión General del Proyecto

`programa_aud` es una plataforma orientada a la **gestión, planificación, asignación y seguimiento técnico de programas y planes de auditoría de certificación de sistemas de gestión**, alineada con estándares internacionales:

- **ISO 19011:2018:** Directrices para la auditoría de los sistemas de gestión.
- **ISO/IEC 17021-1:2015:** Requisitos para los organismos que realizan auditoría y certificación de sistemas de gestión.
- **Clasificación de Sectores IAF (International Accreditation Forum):** Asignación de competencias técnicas por sector productivo.

En su estado actual, la aplicación implementa el núcleo de **autenticación, registro con flujo de aprobación administrativa, control de acceso basado en roles (RBAC)** y un **verificador simplificado de estado de base de datos exclusivo para administradores**, conectado en vivo a la arquitectura relacional en Supabase.

---

## 2. Arquitectura de Almacenamiento y Base de Datos (Storage / Database)

La capa de persistencia opera sobre **PostgreSQL administrado en Supabase**, organizada mediante una secuencia numerada de scripts en `public/supabase/queries/` (`00_delete_tables.sql` a `06_datos_prueba.sql`).

### 2.1 Extensiones y Tipos Enumerados (`01_creacion.sql`)
- `uuid-ossp`: Generación de identificadores únicos universales (UUID v4).
- `ltree`: Rutas jerárquicas materializadas para cláusulas y requisitos normativos (e.g., `4`, `4.4_1`, `8.8_5`).
- **Tipos Enumerados (`ENUM`):**
  - `public.user_status`: `'PENDING'`, `'APPROVED'`, `'REJECTED'`.
  - `public.user_role`: `'ADMIN'`, `'WORKER'`, `'AUDITOR'`, `'CLIENT'`.
  - `public.tipo_hallazgo`: `'NC_MAYOR'`, `'NC_MENOR'`, `'OBSERVACION'`, `'OPORTUNIDAD_MEJORA'`.

### 2.2 Modelo de Datos por Dominios (`01_creacion.sql`)

#### Perfiles y Autoregistro
- `public.profiles`: Extensión de `auth.users(id)` con `nombre`, `role` (`user_role`, por defecto `'CLIENT'`) y `status` (`user_status`, por defecto `'APPROVED'`).
- `public.handle_new_user()`: Trigger `AFTER INSERT ON auth.users` que asigna estado `'APPROVED'` si el rol solicitado es `'CLIENT'`, o `'PENDING'` para `'ADMIN'`, `'WORKER'` y `'AUDITOR'`, quedando pendiente de aprobación administrativa.

#### Dominio 1: Catálogos Base y Competencias de Auditores
- `norma`: Esquemas y normas certificables (`ISO 9001:2015`, `ISO 14001:2015`, `ISO 45001:2018`, `ISO/IEC 27001:2022`).
- `requisito`: Estructura jerárquica de cláusulas vinculadas recursivamente (`id_requisito_padre`) con `ruta_materializada` (`LTREE`).
- `sector_iaf`: Sectores de acreditación IAF.
- `estatus`: Estados operativos (`ACTIVO`, `EN_PROCESO`, `SUSPENDIDO`, `CANCELADO`, `PLANIFICADA`, `EN_EJECUCION`, `CERRADA`).
- `tipo_auditoria`: Modalidades de ciclo (`ETAPA_1`, `ETAPA_2`, `VIGILANCIA_1`, `VIGILANCIA_2`, `RECERTIFICACION`, `EXTRAORDINARIA`).
- `metodologia_auditoria`: Modalidades de ejecución (`PRESENCIAL`, `REMOTA`, `HIBRIDA`).
- `auditor`, `norma_auditor`, `sector_iaf_auditor`: Registro de auditores y su matriz de competencia técnica.

#### Dominio 2: Organizaciones, Certificados, Sitios, Procesos y Acceso de Clientes
- `organizacion`: Entidades clientes titulares (`id`, `nombre`, `rif`, `direccion_fiscal`).
- `client_organization_access`: Solicitudes y aprobaciones de acceso que vinculan usuarios `CLIENT` (`id_usuario`) con organizaciones específicas (`id_organizacion`), registrando `estado`, `aprobado_por`, `fecha_solicitud`, `fecha_respuesta` y `motivo_rechazo`.
- `certificado`: Certificados emitidos vinculados a norma, estatus, sector IAF y organización (`id_organizacion`).
- `sitio`: Sedes o plantas físicas amparadas bajo cada certificado (`unique_sitio_certificado`).
- `proceso`, `requisitos_por_proceso`, `requisitos_no_aplicables_certificado`: Mapa de procesos auditables y trazabilidad de requisitos aplicables y exclusiones.
- `turno`, `turnos_por_sitio`: Horarios operativos por sede.

#### Dominio 3: Planificación, Ejecución y Hallazgos de Auditorías
- `auditoria`: Eventos de auditoría programados por certificado, tipo y metodología.
- `comentarios_por_auditoria`: Notas de seguimiento técnico.
- `equipo_auditor`: Auditores asignados a cada auditoría y su rol (`rol_auditor`).
- `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria`: Planificación detallada por sede, turno y proceso.
- `hallazgo`: Registro de hallazgos ISO (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`), requisito, proceso, evidencia y cierre (`cerrado`).

#### Triggers de Integridad ISO/IEC 17021-1, Audit Log y Timestamps
- **Integridad de Subconjunto:** `fn_validar_sitio_auditoria_certificado()` y `fn_validar_proceso_sitio_auditoria_certificado()` aseguran que los sitios y procesos planificados en una auditoría pertenezcan al mismo certificado de dicha auditoría.
- **Audit Log Inmutable (`public.audit_log`):** Captura `INSERT`, `UPDATE` y `DELETE` mediante `audit_trigger_func()` sobre `organizacion`, `certificado`, `auditoria` y `client_organization_access`.
- **Timestamps:** `update_updated_at_column()` actualiza `updated_at` automáticamente en modificaciones.

---

### 2.3 Motor de Cobertura Normativa LTREE (`02_cobertura_normativa.sql`)

```sql
public.evaluar_cobertura_certificado(p_id_certificado UUID)
RETURNS TABLE (id_requisito UUID, codigo VARCHAR, ruta_materializada LTREE, estado_cobertura TEXT)

public.cobertura_normativa_certificado(p_id_certificado UUID)
RETURNS TABLE (id_requisito UUID, codigo VARCHAR, estado_cobertura TEXT)
```
- Propaga cobertura hacia cláusulas padre mediante el operador `@>` de `ltree`, clasificando cada requisito como `CUBIERTO`, `NO_APLICABLE` o `PENDIENTE`.
- Ejecuta con `SECURITY DEFINER SET search_path = public, pg_temp`.

---

### 2.4 Índices de Optimización (`03_indices_optimizacion.sql`)

Incluye índices GiST sobre `requisito(ruta_materializada)` (`idx_requisito_ruta_gist`) e índices B-tree para búsquedas frecuentes en `organizacion`, `client_organization_access` (`idx_client_org_access_lookup`), `certificado`, `norma_auditor`, `sector_iaf_auditor`, `requisitos_por_proceso`, `equipo_auditor`, `sitios_por_auditoria`, `procesos_sitio_auditoria`, `auditoria`, `hallazgo` y `audit_log`.

---

### 2.5 Seguridad y Permisos: Doble Capa DCL + RLS (`04_rls.sql`)

1. **Privilegios Base PostgreSQL (DCL):** Asigna `USAGE` sobre `public` y `GRANT` sobre tablas, secuencias y rutinas para los roles `authenticated` y `anon` (incluyendo `ALTER DEFAULT PRIVILEGES`), evitando bloqueos `42501` antes de evaluar RLS.
2. **Funciones Auxiliares `SECURITY DEFINER`:**
   - `get_auth_user_role()`: Rol activo del usuario aprobado.
   - `is_approved_admin()`: Valida `role = 'ADMIN'` y `status = 'APPROVED'`.
   - `is_approved_worker()`: Valida `role IN ('ADMIN', 'WORKER')` y `status = 'APPROVED'`.
   - `is_assigned_auditor(p_id_auditoria)`: Valida que el usuario (`ADMIN` o `AUDITOR` aprobado) forme parte de `equipo_auditor`.
   - `has_client_org_access(p_id_organizacion)`: Valida que un usuario `CLIENT` aprobado tenga solicitud `APPROVED` en `client_organization_access` para esa organización.
3. **Políticas Granulares RLS:**
   - **Catálogos base:** Lectura pública (`SELECT USING (true)`), escritura exclusiva para `ADMIN`.
   - **`profiles`:** Lectura del perfil propio o para `ADMIN`/`WORKER` aprobados; actualización exclusiva por `ADMIN` aprobado (`profiles_update_admin_only`).
   - **`client_organization_access`:** Lectura del usuario solicitante o `ADMIN`/`WORKER`; creación por el propio usuario; aprobación/actualización por `ADMIN`/`WORKER`.
   - **Entidades de negocio (`organizacion`, `certificado`, `sitio`, `proceso`, `auditoria`, `hallazgo`):** Acceso completo de lectura y escritura para `ADMIN`/`WORKER`; lectura/registro contextual para `AUDITOR` asignado; lectura acotada por organización aprobada para `CLIENT`.
   - **`audit_log`:** Lectura exclusiva para `ADMIN` aprobado.

---

### 2.6 Usuarios y Datos de Prueba (`05_usuarios.sql` y `06_datos_prueba.sql`)

- **`05_usuarios.sql`:** Limpia registros previos (incluyendo cuentas heredadas como `user@fondonorma.test`) y crea 4 usuarios confirmados en `auth.users` y `public.profiles` con contraseña `Password123*` y cadenas vacías (`''`) en campos de token requeridos por Supabase GoTrue:
  1. `admin@fondonorma.test` (`ADMIN`, `APPROVED`, UID: `11111111-1111-1111-1111-111111111111`)
  2. `worker@fondonorma.test` (`WORKER`, `APPROVED`, UID: `22222222-2222-2222-2222-222222222222`)
  3. `auditor@fondonorma.test` (`AUDITOR`, `APPROVED`, UID: `33333333-3333-3333-3333-333333333333`)
  4. `client@fondonorma.test` (`CLIENT`, `APPROVED`, UID: `44444444-4444-4444-4444-444444444444`)
- **`06_datos_prueba.sql`:** Carga idempotente de catálogos, cláusulas ISO 9001 (`ltree`), organizaciones (`Iberometal Componentes S.A.`, `CyberCloud Solutions S.L.`), acceso cliente aprobado, certificado `FN-QMS-2024-001`, sitio `Planta Valencia`, proceso `Troquelado y Fundición`, auditoría, equipo auditor y hallazgo de ejemplo.

---

## 3. Arquitectura del Backend

La lógica de backend combina los servicios administrados de Supabase con un servidor Express ligero (`server.ts`):
- **Servidor Express (`server.ts`):** Sirve la aplicación Vite en desarrollo (`tsx server.ts`) y los compilados estáticos en producción (`node server.ts`), exponiendo rutas `/api/*`.
- **Reinicio Automático de Base de Datos (`POST /api/reset-db`):** Lee y ejecuta en orden alfabético todos los archivos `.sql` de `public/supabase/queries/` (`00_delete_tables.sql` a `06_datos_prueba.sql`) usando las credenciales privadas de `.env` (`VITE_SUPABASE_TOKEN` vía Supabase Management API o `VITE_SUPABASE_DATABASE_KEY` vía PostgreSQL directo).
- **PostgREST API (`/rest/v1/`):** Exposición RESTful automática protegida por DCL + RLS.
- **GoTrue Auth v2 (`/auth/v1/`):** Autenticación por email/contraseña, sesiones JWT persistentes y registro con metadatos (`nombre`, `role`).
- **RPC (`/rest/v1/rpc/cobertura_normativa_certificado`):** Cálculo jerárquico de cobertura normativa sobre PostgreSQL.
- **Uso seguro de credenciales en cliente:** El frontend consume únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Las credenciales administrativas (`VITE_SUPABASE_DATABASE_KEY`, `VITE_SUPABASE_TOKEN`) permanecen estrictamente en el servidor (`server.ts`).

---

## 4. Arquitectura del Frontend

El frontend está construido como una aplicación **TypeScript + Vite** modular, ligera y minimalista:

### 4.1 Tecnologías Utilizadas
- **Vite + TypeScript (`strict: true`):** Compilación y verificación estática de tipos.
- **Tailwind CSS v4 (`@tailwindcss/vite` + `src/index.css`):** Estilos compilados localmente sin depender de CDN externo para CSS.
- **Supabase JS SDK (`@supabase/supabase-js`):** Cliente tipado instalado como dependencia local (`src/lib/supabase.ts`).
- **Tipografía:** `Plus Jakarta Sans` para interfaz y `JetBrains Mono` con numerales tabulares (`tabular-nums`) para métricas y tiempos de respuesta.
- **Pruebas Unitarias (`node:test` + `tsx`):** Suite automatizada en `src/lib/healthCheck.test.ts` sobre la lógica pura de permisos, filtros, resumen de salud y traducción de errores.

### 4.2 Vistas y Flujos de la Aplicación
1. **Pantalla de Acceso (`src/views/authView.ts`):**
   - Pestañas **Log In** y **Sign up**.
   - Formulario estándar de inicio de sesión y botones de **Quick test login** para los 4 usuarios de prueba (`Admin`, `Worker`, `Auditor`, `Client`).
   - Botón **Reset DB** al pie del panel de inicio de sesión con modal de confirmación (*popup*) que dispara `POST /api/reset-db` para reconstruir esquema y datos de prueba en un clic.
   - Formulario de registro (**Sign up**) con selección de tipo de cuenta (`CLIENT`, `AUDITOR`, `WORKER`, `ADMIN`) y mensajes claros de confirmación/aprobación.
2. **Cabecera con Menú Desplegable al Hover (`src/views/header.ts`):**
   - Muestra el nombre completo del usuario, rol y estado actual (`APPROVED`, `PENDING`, `REJECTED`).
   - A la derecha incorpora un menú desplegable que se abre al pasar el cursor (*hover*, además de soporte táctil/teclado):
     - **Todos los usuarios:** Opción **Log out**.
     - **Solo administradores aprobados (`ADMIN`):** Opciones **Dashboard**, **User Approvals** (con contador de solicitudes pendientes) y **Database Status**.
3. **Dashboard Minimalista (`src/views/dashboardView.ts`):**
   - Área inicial limpia y común para todas las cuentas, mostrando bienvenida, tipo de cuenta y estado de aprobación.
4. **Aprobación de Usuarios y Gestión de Roles — Solo Admin (`src/views/approvalsView.ts`):**
   - Lista los registros de `public.profiles` con filtros por estado (`Pending`, `Approved`, `Rejected`, `All`).
   - Permite a los administradores aprobar, rechazar o revocar cuentas directamente en la base de datos, además de **cambiar el rol (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`) de los usuarios aprobados**, impidiendo que un administrador modifique o revoque su propia sesión activa.
5. **Estado de Base de Datos — Solo Admin (`src/views/databaseStatusView.ts`):**
   - Panel simplificado sin jerga técnica que ejecuta 5 comprobaciones en vivo:
     1. *Connection & Login Service* (`/auth/v1/health`).
     2. *Administrator Permissions* (`profiles`).
     3. *Core Business Records* (`organizacion`, `certificado`, `auditoria`, `hallazgo`).
     4. *Standards & Coverage Engine* (RPC `cobertura_normativa_certificado` sobre un certificado real).
     5. *Change History & Client Access* (`audit_log` y `client_organization_access`).

---

## 5. Estructura de Archivos del Proyecto

```text
├── .env                                     # Credenciales Supabase locales
├── .env.example                             # Plantilla de variables de entorno
├── .gitignore
├── README.md
├── index.html                               # Punto de entrada HTML5
├── metadata.json                            # Metadatos del proyecto
├── package.json                             # Scripts (dev, build, start, lint) y dependencias
├── server.ts                                # Servidor Express + Vite middleware + /api/reset-db
├── tsconfig.json                            # Configuración de TypeScript
├── vite.config.ts                           # Vite + plugin @tailwindcss/vite
├── src/
│   ├── index.css                            # Importación de Tailwind CSS v4 y fuentes
│   ├── main.ts                              # Orquestación de estado, sesión, rutas y vistas
│   ├── lib/
│   │   ├── healthCheck.ts                   # Lógica pura RBAC, filtros, salud DB y errores
│   │   ├── healthCheck.test.ts              # Pruebas unitarias (node:test)
│   │   ├── html.ts                          # Utilidad de escape HTML
│   │   └── supabase.ts                      # Cliente @supabase/supabase-js desde import.meta.env
│   └── views/
│       ├── approvalsView.ts                 # Vista Admin de aprobación de registros
│       ├── authView.ts                      # Vista Log In / Sign up + Quick test login
│       ├── dashboardView.ts                 # Dashboard minimalista para todos los usuarios
│       ├── databaseStatusView.ts            # Verificador simple de estado DB para Admin
│       └── header.ts                        # Cabecera con info de usuario y dropdown hover
└── public/
    ├── doc/
    │   └── project_resume.md                # Documento maestro de arquitectura y estado
    └── supabase/
        └── queries/
            ├── 00_delete_tables.sql         # Limpieza y reinicio del esquema public
            ├── 01_creacion.sql              # DDL, tipos, perfiles, integridad ISO y audit log
            ├── 02_cobertura_normativa.sql   # Funciones LTREE de cobertura normativa
            ├── 03_indices_optimizacion.sql  # Índices B-tree y GiST
            ├── 04_rls.sql                   # Privilegios DCL y políticas RBAC RLS
            ├── 05_usuarios.sql              # Usuarios de prueba Auth + Profiles
            └── 06_datos_prueba.sql          # Semillero idempotente de organizaciones y auditorías
```

---

## 6. Sincronización y Orden de Ejecución en Supabase

- **Repositorio Remoto Oficial:** `https://github.com/certificacionfn/programa_aud`
- **Proyecto Supabase Vinculado:** `ufowtgmpaahyshdxlnlq`
- **Orden de ejecución en Supabase SQL Editor:**
  1. `00_delete_tables.sql` *(solo para reinicio completo)*
  2. `01_creacion.sql`
  3. `02_cobertura_normativa.sql`
  4. `03_indices_optimizacion.sql`
  5. `04_rls.sql`
  6. `05_usuarios.sql`
  7. `06_datos_prueba.sql`
