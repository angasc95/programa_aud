# Backend Express, Seguridad RLS y Límites de Credenciales (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Describe el servidor Node/Express (`server.ts`), la resolución de variables en Vite (`vite.config.ts`), los servicios administrados de Supabase y el modelo completo de seguridad **DCL + RLS** (`04_rls.sql`) en sincronía con las guardias RBAC del frontend (`src/lib/accessControl.ts`).

---

## 1. Servidor Express 5 (`server.ts`)

`server.ts` actúa como punto de entrada único tanto en desarrollo (`tsx server.ts`) como en producción (`node server.ts`), sirviendo el frontend SPA y los endpoints `/api/*` en un mismo origen.

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
  - **Respuesta:** Devuelve `{ ok: true, executedFiles: [{ file, durationMs }], totalDurationMs }`, o un error HTTP `500` descriptivo indicando exactamente en qué archivo SQL falló la ejecución.

### 1.3 Modo Desarrollo vs. Modo Producción
- **Desarrollo:** Cuando no se ejecuta bajo `npm start` ni `NODE_ENV === 'production'`, importa dinámicamente `createServer` de `vite` y monta `vite.middlewares` con `middlewareMode: true` y `hmr: false`.
- **Producción:** Sirve los assets compilados desde `dist/` con `express.static` y provee un *fallback* SPA compatible con **Express 5** (`app.use` para peticiones `GET`/`HEAD` cuya ruta no comience por `/api/`, enviando `dist/index.html`).

---

## 2. Inyección de Configuración y Límite de Credenciales

- **`vite.config.ts`:** Lee `supabase.config.json`, `supabase.env` y `.env`, resuelve `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ignorando placeholders de ejemplo) y los inyecta en tiempo de compilación mediante `define` (`import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`).
- **`src/lib/supabase.ts`:** Inicializa el cliente singleton `@supabase/supabase-js` con `persistSession: true`, `autoRefreshToken: true` y `detectSessionInUrl: true`, empleando exclusivamente la URL pública y la clave anon/publicable.
- **Aislamiento de Secretos:** Las credenciales privilegiadas (`VITE_SUPABASE_TOKEN` y `VITE_SUPABASE_DATABASE_KEY`) jamás se exponen al bundle de Vite ni al navegador; residen exclusivamente en `server.ts`.

---

## 3. Servicios Administrados de Supabase

- **GoTrue Auth v2 (`/auth/v1/`):** Autenticación con correo/contraseña, emisión/refresco automático de JWT y registro con `user_metadata` (`nombre`, `role`). En inserciones SQL directas (`05_usuarios.sql`), los campos de token de `auth.users` (`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`) se inicializan como `''` (cadena vacía, nunca `NULL`) para evitar errores de escaneo de GoTrue en el inicio de sesión.
- **PostgREST (`/rest/v1/`):** Exposición REST automática de las **31 tablas** del esquema `public`, gobernada conjuntamente por DCL y RLS.
- **PostgreSQL RPC (`/rest/v1/rpc/`):** Exposición controlada de rutinas `SECURITY DEFINER`, incluyendo `cobertura_normativa_certificado`, `evaluar_cobertura_certificado`, `auditor_esta_calificado` y `auditores_calificados_para_certificado`.

---

## 4. Seguridad en Base de Datos: Doble Capa DCL + RLS (`04_rls.sql`)

### 4.1 Capa 1: Privilegios Base PostgreSQL (DCL)
Antes de evaluar políticas RLS, PostgreSQL valida privilegios de esquema, tabla, secuencia y función. `04_rls.sql` configura:
- `GRANT USAGE ON SCHEMA public TO anon, authenticated`.
- `GRANT ALL ON ALL TABLES / SEQUENCES / ROUTINES IN SCHEMA public TO authenticated`.
- `GRANT SELECT ON ALL TABLES`, `GRANT USAGE, SELECT ON ALL SEQUENCES` y `GRANT EXECUTE ON ALL ROUTINES` a `anon`.
- `ALTER DEFAULT PRIVILEGES` equivalentes para futuros objetos creados en `public`.
- `GRANT EXECUTE` explícito sobre las 7 funciones auxiliares RLS (para `anon, authenticated`) y las 4 funciones normativas/de competencias de `02_cobertura_normativa.sql` (para `authenticated`).

### 4.2 Funciones Auxiliares `SECURITY DEFINER` (7 funciones)
Todas configuradas como `STABLE SECURITY DEFINER SET search_path = public, pg_temp` para evitar recursión infinita en políticas RLS y neutralizar ataques de `search_path`:

| Función | Lógica de Validación |
| :--- | :--- |
| `get_auth_user_role()` | Retorna el `role` de `public.profiles` para `auth.uid()` únicamente si `status = 'APPROVED'`. |
| `is_approved_admin()` | `TRUE` si el usuario autenticado tiene `role = 'ADMIN'` y `status = 'APPROVED'`. |
| `is_approved_worker()` | `TRUE` si el usuario autenticado tiene `role IN ('ADMIN', 'WORKER')` y `status = 'APPROVED'`. |
| `is_assigned_auditor(p_id_auditoria)` | `TRUE` si un `ADMIN` o `AUDITOR` aprobado figura en `equipo_auditor` para esa auditoría. |
| `has_client_org_access(p_id_organizacion)` | `TRUE` si un `CLIENT` aprobado posee vínculo `estado = 'APPROVED'` en `client_organization_access` para dicha organización. |
| `is_auditor_for_cert(p_id_certificado)` | `TRUE` si el `ADMIN`/`AUDITOR` aprobado está asignado en `equipo_auditor` a alguna auditoría de ese certificado. |
| `is_auditor_for_org(p_id_organizacion)` | `TRUE` si el `ADMIN`/`AUDITOR` aprobado participa en alguna auditoría vinculada a un certificado de esa organización. |

### 4.3 Matriz de Políticas RLS (31 tablas protegidas)

RLS está habilitado (`ENABLE ROW LEVEL SECURITY`) en la totalidad de las **31 tablas** del esquema `public`:

| Grupo de Tablas | `ADMIN` (Aprobado) | `WORKER` (Aprobado) | `AUDITOR` (Aprobado) | `CLIENT` (Aprobado) |
| :--- | :--- | :--- | :--- | :--- |
| **Catálogos, Acreditación y Competencias (14):** `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`, `turno` | `SELECT` global + escritura total (`FOR ALL` vía `is_approved_worker()`) | `SELECT` global + escritura total (`FOR ALL` vía `is_approved_worker()`) | Lectura global (`SELECT USING (true)`) | Lectura global (`SELECT USING (true)`) |
| **`profiles`** | Lectura total + `UPDATE` exclusivo (`profiles_update_admin_only`) | Lectura total (`is_approved_worker()`) | Solo perfil propio (`auth.uid() = id`) | Solo perfil propio (`auth.uid() = id`) |
| **`client_organization_access`** | Lectura y actualización total (`is_approved_worker()`) | Lectura y actualización total (`is_approved_worker()`) | Solo registros propios (`auth.uid() = id_usuario`) | Lectura propia + `INSERT` auto-solicitado (`WITH CHECK (auth.uid() = id_usuario)`) |
| **Organizaciones y Estructuras (7):** `organizacion`, `certificado`, `sitio`, `proceso`, `requisitos_por_proceso`, `requisitos_no_aplicables_certificado`, `turnos_por_sitio` | Lectura y escritura total | Lectura y escritura total | `SELECT` acotado por `is_auditor_for_org` / `is_auditor_for_cert` | `SELECT` acotado por `has_client_org_access` |
| **Planificación de Auditorías (5):** `auditoria`, `equipo_auditor`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria` | Lectura y escritura total | Lectura y escritura total | `SELECT` en auditorías asignadas (`is_assigned_auditor`) | `SELECT` en auditorías de sus organizaciones aprobadas (sin acceso a `equipo_auditor`) |
| **Ejecución y Hallazgos (2):** `hallazgo`, `comentarios_por_auditoria` | Lectura y escritura total | Lectura y escritura total | Lectura y escritura (`FOR ALL`) en auditorías donde está asignado (`is_assigned_auditor`) | `SELECT` en auditorías de sus organizaciones aprobadas |
| **`audit_log`** | Solo `SELECT` global (`is_approved_worker()`); `UPDATE`/`DELETE` bloqueados por trigger | Solo `SELECT` global (`is_approved_worker()`); `UPDATE`/`DELETE` bloqueados por trigger | `SELECT` limitado a filas de `auditoria` y `hallazgo` pertenecientes a sus auditorías asignadas | Sin acceso (`SELECT` denegado) |

> **Nota sobre usuarios `PENDING` y `REJECTED`:** Ninguna función `SECURITY DEFINER` concede privilegios si `profiles.status <> 'APPROVED'`. Adicionalmente, el frontend (`src/lib/accessControl.ts` y `src/lib/healthCheck.ts`) aplica el mismo aislamiento en interfaz: restringe edición de programación/equipos a `ADMIN`/`WORKER` (`canEditAuditScheduleOrTeam`), limita la mutación de hallazgos y dictámenes a `ADMIN`/`WORKER` o `AUDITOR` asignado (`canMutateAuditExecution`), y valida acceso a `audit_log` mediante `canViewAuditLogForEntity`.
