# Backend Express, Seguridad RLS y Límites de Credenciales (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Describe el servidor Node/Express (`server.ts`), la inyección de variables en Vite (`vite.config.ts`), los servicios administrados de Supabase y el modelo completo de seguridad **DCL + RLS** (`04_rls.sql`).

---

## 1. Servidor Express 5 (`server.ts`)

`server.ts` actúa como punto de entrada único tanto en desarrollo (`tsx server.ts`) como en producción (`node server.ts`), escuchando en `0.0.0.0:3000` (o `process.env.PORT`).

### 1.1 Carga de Entorno y Resolución de Proyecto
- Carga `.env` mediante `dotenv.config({ override: true })`.
- Normaliza `VITE_SUPABASE_URL` (con fallback automático al proyecto `https://ufowtgmpaahyshdxlnlq.supabase.co` si la variable contiene un placeholder de plantilla) y extrae el identificador `projectRef`.

### 1.2 Rutas de API (`/api/*`)
- **`GET /api/health`:** Retorna `200 OK` con `{ ok: true }` para comprobaciones de salud del contenedor (Cloud Run / Preview).
- **`POST /api/reset-db`:** Reinicia de forma automatizada toda la base de datos ejecutando en orden lexicográfico estricto (`00` → `06`) los archivos `.sql` contenidos en `public/supabase/queries/`:
  - **Estrategia Dual de Ejecución:**
    1. Si existe `VITE_SUPABASE_TOKEN`, invoca la **Supabase Management API** (`POST https://api.supabase.com/v1/projects/{projectRef}/database/query`) con autenticación `Bearer` para cada archivo SQL.
    2. En ausencia de token API, establece una conexión PostgreSQL directa con `pg.Client` (`db.{projectRef}.supabase.co:5432`, usuario `postgres`, SSL habilitado) usando `VITE_SUPABASE_DATABASE_KEY`.
  - **Respuesta:** Devuelve `executedFiles` (lista con nombre y `durationMs` por archivo) y `totalDurationMs`, o un error HTTP `500` descriptivo indicando exactamente en qué script falló la ejecución.

### 1.3 Modo Desarrollo vs. Modo Producción
- **Desarrollo:** Monta Vite en `middlewareMode: true` con `hmr: false` (`createViteServer` importado dinámicamente).
- **Producción (`NODE_ENV === 'production'` o `npm_lifecycle_event === 'start'`):** Sirve los assets compilados desde `dist/` con `express.static` y provee un *fallback* SPA compatible con **Express 5** (`app.use` para peticiones `GET`/`HEAD` fuera de `/api/*` devolviendo `dist/index.html`, evitando patrones wildcard incompatibles en Express 5).

---

## 2. Inyección de Configuración y Límite de Credenciales

- **`vite.config.ts`:** Resuelve `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (priorizando variables reales del entorno frente a valores placeholder) y los expone al cliente mediante `define` en `import.meta.env`.
- **`src/lib/supabase.ts`:** Inicializa el cliente `@supabase/supabase-js` con `persistSession: true`, `autoRefreshToken: true` y `detectSessionInUrl: true`, empleando exclusivamente la URL pública y la clave anon/publicable.
- **Aislamiento de Secretos:** Las credenciales privilegiadas (`VITE_SUPABASE_TOKEN` y `VITE_SUPABASE_DATABASE_KEY`) jamás se exponen al bundle de Vite ni al navegador; viven únicamente en `server.ts`.

---

## 3. Servicios Administrados de Supabase

- **GoTrue Auth v2 (`/auth/v1/`):** Autenticación con email/contraseña, emisión/refresco de JWT y registro de cuentas con `user_metadata` (`nombre`, `role`). En inserciones SQL directas (`05_usuarios.sql`), los campos de token de `auth.users` (`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`, etc.) deben inicializarse como cadenas vacías `''` (no `NULL`) para evitar errores de escaneo de GoTrue durante el login.
- **PostgREST (`/rest/v1/`):** Exposición REST automática de todas las tablas del esquema `public`, gobernada por DCL y RLS.
- **PostgreSQL RPC (`/rest/v1/rpc/`):** Ejecución remota de funciones `SECURITY DEFINER`, en particular `cobertura_normativa_certificado`.

---

## 4. Seguridad en Base de Datos: Doble Capa DCL + RLS (`04_rls.sql`)

### 4.1 Capa 1: Privilegios Base PostgreSQL (DCL)
Antes de evaluar políticas RLS, PostgreSQL valida privilegios de tabla/esquema. `04_rls.sql` otorga:
- `USAGE ON SCHEMA public TO anon, authenticated`.
- `GRANT ALL ON ALL TABLES / SEQUENCES / ROUTINES` a `authenticated`.
- `GRANT SELECT ON ALL TABLES` y `USAGE/EXECUTE` a `anon`.
- `ALTER DEFAULT PRIVILEGES` equivalentes para futuros objetos en `public`.

### 4.2 Funciones Auxiliares `SECURITY DEFINER` (7 funciones)
Todas configuradas con `STABLE SECURITY DEFINER SET search_path = public, pg_temp` para evitar recursión infinita en RLS y bloqueo de `search_path`:

| Función | Lógica de Validación |
| :--- | :--- |
| `get_auth_user_role()` | Retorna el `role` de `public.profiles` para `auth.uid()` únicamente si `status = 'APPROVED'`. |
| `is_approved_admin()` | `TRUE` si el usuario autenticado tiene `role = 'ADMIN'` y `status = 'APPROVED'`. |
| `is_approved_worker()` | `TRUE` si el usuario autenticado tiene `role IN ('ADMIN', 'WORKER')` y `status = 'APPROVED'`. |
| `is_assigned_auditor(p_id_auditoria)` | `TRUE` si un `ADMIN` o `AUDITOR` aprobado figura en `equipo_auditor` para esa auditoría. |
| `has_client_org_access(p_id_organizacion)` | `TRUE` si un `CLIENT` aprobado tiene vínculo `estado = 'APPROVED'` en `client_organization_access` para dicha organización. |
| `is_auditor_for_cert(p_id_certificado)` | `TRUE` si el `ADMIN`/`AUDITOR` aprobado está asignado en `equipo_auditor` a alguna auditoría de ese certificado. |
| `is_auditor_for_org(p_id_organizacion)` | `TRUE` si el `ADMIN`/`AUDITOR` aprobado participa en alguna auditoría vinculada a un certificado de esa organización. |

### 4.3 Matriz de Políticas RLS (27 tablas protegidas)

RLS está habilitado (`ENABLE ROW LEVEL SECURITY`) en la totalidad de las **27 tablas** del esquema `public`:

| Grupo de Tablas | `ADMIN` (Aprobado) | `WORKER` (Aprobado) | `AUDITOR` (Aprobado) | `CLIENT` (Aprobado) |
| :--- | :--- | :--- | :--- | :--- |
| **Catálogos y Competencias** (`norma`, `requisito`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `norma_auditor`, `sector_iaf_auditor`, `turno`) | Lectura y escritura total (`INSERT`/`UPDATE`/`DELETE`) | Lectura global (`SELECT USING (true)`) | Lectura global | Lectura global |
| **`profiles`** | Lectura total + `UPDATE` exclusivo (`profiles_update_admin_only`) | Lectura total (`is_approved_worker()`) | Solo perfil propio (`auth.uid() = id`) | Solo perfil propio (`auth.uid() = id`) |
| **`client_organization_access`** | Lectura y actualización total | Lectura y actualización total | Solo registros propios | Lectura propia + `INSERT` auto-solicitado |
| **`organizacion`, `certificado`, `sitio`, `proceso`, `requisitos_por_proceso`, `requisitos_no_aplicables_certificado`, `turnos_por_sitio`** | Lectura y escritura total | Lectura y escritura total | `SELECT` acotado por `is_auditor_for_org` / `is_auditor_for_cert` | `SELECT` acotado por `has_client_org_access` |
| **`auditoria`, `equipo_auditor`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria`** | Lectura y escritura total | Lectura y escritura total | `SELECT` en auditorías asignadas (`is_assigned_auditor`) | `SELECT` en auditorías de sus organizaciones aprobadas (sin acceso a `equipo_auditor`) |
| **`hallazgo`, `comentarios_por_auditoria`** | Lectura y escritura total | Lectura y escritura total | Lectura y escritura (`ALL`) en auditorías donde está asignado | `SELECT` en auditorías de sus organizaciones aprobadas |
| **`audit_log`** | Solo `SELECT` (`audit_log_select_admin`); bloqueado `UPDATE`/`DELETE` por trigger | Sin acceso | Sin acceso | Sin acceso |
