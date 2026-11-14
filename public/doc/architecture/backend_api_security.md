# Backend Express, Seguridad RLS y Límites de Credenciales (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Describe el servidor Node/Express (`server.ts`), la resolución de variables en Vite (`vite.config.ts`), los servicios administrados de Supabase y el modelo completo de seguridad **DCL + RLS + Soft-Delete** (`04_rls.sql`) en sincronía con las guardias RBAC del frontend (`src/lib/accessControl.ts` y `src/lib/archiveGovernance.ts`).

---

## 1. Servidor Express 5 (`server.ts`)

`server.ts` actúa como punto de entrada único tanto en desarrollo (`tsx server.ts`) como en producción (`node server.ts`), sirviendo la SPA y los endpoints `/api/*` en el mismo origen.

### 1.1 Carga de Entorno y Resolución de Puerto/Host
- Carga variables en cascada sin sobrescribir configuraciones explícitas hasta llegar a `.env`:
  1. `supabase.config.json` (solo claves no presentes aún en `process.env`).
  2. `supabase.env`.
  3. `.env` mediante `dotenv.config({ override: true })`.
- Normaliza `VITE_SUPABASE_URL` (con respaldo a `https://ufowtgmpaahyshdxlnlq.supabase.co` si contiene un placeholder de plantilla) y extrae el `projectRef` desde el subdominio.
- **`resolvePort()` / `resolveHost()`:** Acepta `--port` y `--host` por CLI (por defecto `0.0.0.0`). En desarrollo fuerza el puerto `3000`; en ejecución de producción (`npm start` con `NODE_ENV=production`) respeta `process.env.PORT` con fallback a `3000`.

### 1.2 Rutas de API (`/api/*`)
- **`GET /api/health`:** Retorna `200 OK` con `{ ok: true }` para comprobaciones de salud y disponibilidad del contenedor.
- **`POST /api/reset-db`:** Reinicia de forma automatizada toda la base de datos ejecutando en orden lexicográfico estricto (`00` → `06`) todos los archivos `.sql` contenidos en `public/supabase/queries/`:
  - **Estrategia Dual de Ejecución (`runAllQueriesInOrder()`):**
    1. **Supabase Management API (prioritaria):** Si existe `VITE_SUPABASE_TOKEN`, invoca `POST https://api.supabase.com/v1/projects/{projectRef}/database/query` con cabecera `Authorization: Bearer <token>` para cada archivo `.sql`.
    2. **Conexión PostgreSQL directa (`pg.Client`):** En ausencia de token API, utiliza `VITE_SUPABASE_DATABASE_KEY` conectando a `db.{projectRef}.supabase.co:5432` (usuario `postgres`, base `postgres`, `ssl: { rejectUnauthorized: false }`).
  - **Respuesta:** Devuelve `{ ok: true, executedFiles: [{ file, durationMs }], totalDurationMs }`, o un error HTTP `500` descriptivo indicando el archivo SQL que falló.

### 1.3 Modo Desarrollo vs. Modo Producción
- **Desarrollo:** Cuando no se ejecuta bajo `npm start` ni `NODE_ENV === 'production'`, importa dinámicamente `createServer` de `vite` y monta `vite.middlewares` con `middlewareMode: true` y `hmr: false`.
- **Producción:** Sirve los assets compilados desde `dist/` con `express.static` y provee un *fallback* SPA compatible con **Express 5** (`app.use` para peticiones `GET`/`HEAD` cuya ruta no comience por `/api/`, enviando `dist/index.html`).

---

## 2. Inyección de Configuración y Límite de Credenciales

- **`vite.config.ts`:** Lee `supabase.config.json`, `supabase.env` y `.env`, resuelve `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ignorando placeholders de ejemplo) y los inyecta en tiempo de compilación mediante `define` (`import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`).
- **`src/lib/supabase.ts`:** Inicializa el cliente singleton `@supabase/supabase-js` con `persistSession: true`, `autoRefreshToken: true` y `detectSessionInUrl: true`, empleando exclusivamente la URL pública y la clave anon/publicable.
- **Aislamiento de Secretos:** Las credenciales privilegiadas (`VITE_SUPABASE_TOKEN` y `VITE_SUPABASE_DATABASE_KEY`) jamás se exponen al bundle de Vite ni al navegador; residen exclusivamente en `server.ts`.

---

## 3. Servicios Administrados de Supabase y RPCs Seguras

- **GoTrue Auth v2 (`/auth/v1/`):** Autenticación con correo/contraseña, actualización segura de contraseña propia (`supabase.auth.updateUser`), emisión/refresco automático de JWT y registro con `user_metadata` (`nombre`, `role`). En `05_usuarios.sql`, los campos de token de `auth.users` (`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`) se inicializan como `''` (nunca `NULL`).
- **PostgREST (`/rest/v1/`):** Exposición REST de las **31 tablas** del esquema `public`, gobernada conjuntamente por DCL, triggers de soft-delete y RLS.
- **PostgreSQL RPC (`/rest/v1/rpc/`):** Exposición controlada de rutinas `SECURITY DEFINER`:
  - `get_archive_dependency_summary(p_table TEXT, p_record_id UUID)`: Inspecciona dependencias activas (`deleted_at IS NULL`) antes de autorizar el archivo lógico (acceso revocado a `anon`, concedido solo a `authenticated`).
  - `archive_record(p_table TEXT, p_record_id UUID, p_reason TEXT DEFAULT NULL)`: Ejecuta el archivo lógico (`deleted_at = NOW()`, `deleted_by = auth.uid()`, `delete_reason`) validando `is_approved_worker()`. Permite a `WORKER` archivar registros sin relajar las políticas `SELECT` que ocultan filas archivadas y evitando rechazos de *With Check Option (WCO)* en PostgreSQL (acceso revocado a `anon`, concedido a `authenticated`).
  - `cobertura_normativa_certificado`, `evaluar_cobertura_certificado`, `auditor_esta_calificado` y `auditores_calificados_para_certificado` (concedidas a `authenticated`).

---

## 4. Seguridad en Base de Datos: Triple Barrera DCL + Triggers + RLS (`04_rls.sql`)

### 4.1 Capa 1: Privilegios Base PostgreSQL (DCL) y Revocación de `DELETE`
Antes de evaluar políticas RLS, PostgreSQL valida privilegios de esquema, tabla, secuencia y función:
- `GRANT USAGE ON SCHEMA public TO anon, authenticated`.
- `GRANT ALL ON ALL TABLES / SEQUENCES / ROUTINES IN SCHEMA public TO authenticated`.
- `GRANT SELECT ON ALL TABLES`, `GRANT USAGE, SELECT ON ALL SEQUENCES` y `GRANT EXECUTE ON ALL ROUTINES` a `anon`.
- **Defensa en Profundidad (`REVOKE DELETE`):** Se revoca explícitamente el privilegio `DELETE` para `anon` y `authenticated` en **26 tablas** (las 23 tablas protegidas por soft-delete + `profiles`, `client_organization_access` y `audit_log`), restringiendo la eliminación física únicamente a las **5 tablas de enlace M:N puras** (`norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`, `requisitos_por_proceso`, `equipo_auditor`).

### 4.2 Funciones Auxiliares `SECURITY DEFINER` (7 funciones)
Todas configuradas como `STABLE SECURITY DEFINER SET search_path = public, pg_temp` con filtrado estricto de registros no archivados (`deleted_at IS NULL`):

| Función | Lógica de Validación |
| :--- | :--- |
| `get_auth_user_role()` | Retorna el `role` de `public.profiles` para `auth.uid()` únicamente si `status = 'APPROVED'`. |
| `is_approved_admin()` | `TRUE` si el usuario autenticado tiene `role = 'ADMIN'` y `status = 'APPROVED'`. |
| `is_approved_worker()` | `TRUE` si el usuario autenticado tiene `role IN ('ADMIN', 'WORKER')` y `status = 'APPROVED'`. |
| `is_assigned_auditor(p_id_auditoria)` | `TRUE` si un `ADMIN` o `AUDITOR` aprobado figura en `equipo_auditor` para esa auditoría activa (`a.deleted_at IS NULL AND c.deleted_at IS NULL`). |
| `has_client_org_access(p_id_organizacion)` | `TRUE` si un `CLIENT` aprobado posee vínculo activo (`coa.deleted_at IS NULL AND o.deleted_at IS NULL`) con `estado = 'APPROVED'` en `client_organization_access`. |
| `is_auditor_for_cert(p_id_certificado)` | `TRUE` si el `ADMIN`/`AUDITOR` aprobado está asignado en `equipo_auditor` a alguna auditoría activa de ese certificado activo. |
| `is_auditor_for_org(p_id_organizacion)` | `TRUE` si el `ADMIN`/`AUDITOR` aprobado participa en alguna auditoría activa vinculada a un certificado y organización activos. |

### 4.3 Protección Anti-Escalamiento en `public.profiles`
- Políticas de `public.profiles`:
  - `profiles_select`: Lectura propia (`auth.uid() = id`) o global para personal aprobado (`is_approved_worker()`).
  - `profiles_update_admin_only`: Permite a un `ADMIN` aprobado modificar cualquier perfil (`role`, `status`, `nombre`).
  - `profiles_update_self`: Permite a cualquier usuario autenticado actualizar su propia fila (`auth.uid() = id`), incluyendo usuarios `PENDING` en `Mi Perfil`.
- **Bloqueo en Base de Datos (`trg_protect_profile_rbac_fields`):** Trigger `BEFORE UPDATE ON public.profiles` que aborta cualquier modificación de `role` o `status` si el usuario ejecutor no satisface `is_approved_admin()`. Complementariamente, el cliente usa `buildSelfProfileUpdatePayload()` (`{ nombre }` únicamente).

### 4.4 Matriz de Políticas RLS (**92 políticas** en **31 tablas protegidas**)

RLS está habilitado (`ENABLE ROW LEVEL SECURITY`) en todas las **31 tablas** de `public`. Ninguna tabla protegida por soft-delete posee política `FOR DELETE`:

| Grupo de Tablas | `ADMIN` (Aprobado) | `WORKER` (Aprobado) | `AUDITOR` (Aprobado) | `CLIENT` (Aprobado) |
| :--- | :--- | :--- | :--- | :--- |
| **Catálogos, Acreditación y Turnos (11 tablas soft-delete):** `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `turno` | `SELECT` global **incluyendo archivados** (`deleted_at IS NOT NULL`); `INSERT`/`UPDATE` + Restauración (`deleted_at = NULL`) | `SELECT` solo activos (`deleted_at IS NULL`); `INSERT`/`UPDATE` + Archivo vía RPC `archive_record` | Lectura solo activos (`deleted_at IS NULL`) | Lectura solo activos (`deleted_at IS NULL`) |
| **Matrices de Competencia M:N (3 tablas):** `norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor` | `SELECT` + `INSERT`/`DELETE` (`is_approved_worker()`) | `SELECT` + `INSERT`/`DELETE` (`is_approved_worker()`) | Lectura donde el auditor padre está activo | Lectura donde el auditor padre está activo |
| **`profiles`** | Lectura total + `UPDATE` total (incluyendo `role`/`status`) | Lectura total + auto-edición segura de `nombre` propio | Lectura y auto-edición segura de `nombre` propio (`trg_protect_profile_rbac_fields` bloquea `role`/`status`) | Lectura y auto-edición segura de `nombre` propio (`trg_protect_profile_rbac_fields` bloquea `role`/`status`) |
| **`client_organization_access`** | Lectura (incluyendo archivados) y actualización total | Lectura activos y actualización total | Solo registros activos propios (`auth.uid() = id_usuario`) | Lectura activos propios + `INSERT` auto-solicitado (`estado = 'PENDING'`) |
| **Organizaciones y Estructuras Operativas (7 tablas):** `organizacion`, `certificado`, `sitio`, `proceso`, `requisitos_no_aplicables_certificado`, `turnos_por_sitio` (soft-delete) + `requisitos_por_proceso` (M:N) | Lectura total (incluyendo archivados) + escritura y restauración | Lectura activos + `INSERT`/`UPDATE` y archivo vía `archive_record` | `SELECT` acotado a registros activos vía `is_auditor_for_org` / `is_auditor_for_cert` | `SELECT` acotado a registros activos vía `has_client_org_access` |
| **Planificación de Auditorías (5 tablas):** `auditoria`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria` (soft-delete) + `equipo_auditor` (M:N) | Lectura total (incluyendo archivados) + escritura y restauración | Lectura activos + escritura y archivo vía `archive_record` | `SELECT` en auditorías activas asignadas (`is_assigned_auditor`) | `SELECT` en auditorías activas de organizaciones aprobadas (sin acceso a `equipo_auditor`) |
| **Ejecución y Hallazgos (2 tablas):** `hallazgo`, `comentarios_por_auditoria` | Lectura total (incluyendo archivados) + escritura y restauración | Lectura activos + `INSERT`/`UPDATE` | Lectura y `INSERT`/`UPDATE` de filas activas en auditorías donde participa (`is_assigned_auditor`); sin acceso a restaurar | `SELECT` en auditorías activas de organizaciones aprobadas |
| **`audit_log`** | Solo `SELECT` global (`is_approved_worker()`); `UPDATE`/`DELETE` bloqueados por trigger y `REVOKE DELETE` | Solo `SELECT` global (`is_approved_worker()`); `UPDATE`/`DELETE` bloqueados por trigger y `REVOKE DELETE` | `SELECT` limitado a filas de `auditoria` y `hallazgo` activos pertenecientes a sus auditorías asignadas | Sin acceso (`SELECT` denegado) |

> **Consistencia Frontend–Backend:** Las reglas de `src/lib/accessControl.ts`, `src/lib/healthCheck.ts` y `src/lib/archiveGovernance.ts` replican este aislamiento en cliente: impiden que roles no `ADMIN` vean el conmutador `"Mostrar Archivados"` o el botón `"Restaurar"`, bloquean mutaciones desde `AUDITOR` fuera de `equipo_auditor` (`canMutateAuditExecution`), garantizan la ausencia de `.delete()` en tablas protegidas dentro de todo `src/` y restringen a `ADMIN`/`WORKER` la apertura del modal de archivo seguro (`canArchiveRecord`).
