# Pruebas, Operación y Despliegue (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Resume la estrategia de verificación automatizada (`node:test`), scripts de compilación, variables de entorno, cuentas de prueba y despliegue en producción.

---

## 1. Suite de Pruebas Unitarias (`node:test` + `tsx`)

Las pruebas unitarias validan la lógica pura desacoplada del DOM en `src/lib/` sin necesidad de dependencias externas de testing ni navegador:

| Archivo de Pruebas | Módulo Evaluado | Cobertura Principal |
| :--- | :--- | :--- |
| `src/lib/healthCheck.test.ts` | `src/lib/healthCheck.ts` | Guardias RBAC (`evaluateAdminAccess`, `canAccessRoute`), visibilidad de menús por rol/estado (`getVisibleDomainMenus`), protección contra auto-revocación o cambio de rol propio (`canModifyProfileStatus`, `canModifyProfileRole`, `shouldUpdateProfileRole`), resúmenes de Reset DB, métricas de salud y traducción de errores. |
| `src/lib/searchControls.test.ts` | `src/lib/searchControls.ts` | Normalización de acentos (`normalizeSearchToken`), búsqueda multi-token sobre código, empresa, RIF (con/sin guiones) y norma (`matchesSearchCriteria`), filtros combinados de estatus/norma (`filterCertificateRecords`), extracción de facetas únicas y helpers visuales de cobertura. |
| `src/lib/drillDown.test.ts` | `src/lib/drillDown.ts` | Metadatos de modalidades de auditoría y tipos de hallazgo, estadísticas (`calculateFindingStats`), filtros combinados, validación de creación de hallazgos y planificación de auditorías, verificación de competencias de auditor (`isAuditorQualifiedForAudit`), regla de elegibilidad de emisión de certificados y contratos de inmutabilidad/RBAC. |

### Ejecución de Pruebas y Verificación Estática
```bash
# Ejecutar todas las pruebas unitarias
node --import tsx --test src/lib/healthCheck.test.ts src/lib/searchControls.test.ts src/lib/drillDown.test.ts

# Verificación estricta de tipos TypeScript (tsc --noEmit)
npm run lint

# Compilación de producción con Vite (genera dist/)
npm run build
```

> Nota: `tsconfig.json` utiliza `"strict": true`, `"noEmit": true` y excluye `src/**/*.test.ts` de la verificación de compilación del cliente.

---

## 2. Variables de Entorno (`.env` / `.env.example`)

| Variable | Uso | Visibilidad |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Endpoint del proyecto Supabase (`https://ufowtgmpaahyshdxlnlq.supabase.co`). | Cliente y Servidor |
| `VITE_SUPABASE_ANON_KEY` | Clave pública/anon para PostgREST, GoTrue Auth y RPC sujetos a RLS. | Cliente |
| `VITE_SUPABASE_DATABASE_KEY` | Contraseña PostgreSQL directa (`db.<ref>.supabase.co:5432`) para `POST /api/reset-db` vía `pg.Client`. | Solo Servidor (`server.ts`) |
| `VITE_SUPABASE_TOKEN` | Personal Access Token de Supabase Management API (método prioritario en `POST /api/reset-db`). | Solo Servidor (`server.ts`) |

---

## 3. Cuentas de Prueba (`05_usuarios.sql`)

Todas las cuentas de prueba comparten la contraseña **`Password123*`** y cuentan con botones de acceso directo (**Quick test login**) en `authView.ts`:

| Rol | Email | Estado Inicial | UUID Fijo | Alcance Principal |
| :--- | :--- | :---: | :--- | :--- |
| `ADMIN` | `admin@fondonorma.test` | `APPROVED` | `11111111-1111-1111-1111-111111111111` | Control total, aprobación/cambio de rol de usuarios, catálogos, Reset DB y `Database Status`. |
| `WORKER` | `worker@fondonorma.test` | `APPROVED` | `22222222-2222-2222-2222-222222222222` | Gestión operativa completa de organizaciones, certificados, sitios, procesos, turnos y planificación de auditorías. |
| `AUDITOR` | `auditor@fondonorma.test` | `APPROVED` | `33333333-3333-3333-3333-333333333333` | Lectura de alcance asignado, ejecución de auditorías asignadas y registro/cierre de hallazgos. |
| `CLIENT` | `client@fondonorma.test` | `APPROVED` | `44444444-4444-4444-4444-444444444444` | Lectura acotada exclusivamente a organizaciones con solicitud `APPROVED` en `client_organization_access`. |

---

## 4. Flujo de Ejecución y Despliegue en Producción (Cloud Run)

1. **Desarrollo local:**
   ```bash
   npm install
   npm run dev   # Ejecuta tsx server.ts en http://0.0.0.0:3000 con Vite middleware (hmr: false)
   ```
2. **Compilación y Arranque en Producción:**
   ```bash
   npm run build # Compila SPA en dist/ mediante vite build
   npm start     # Ejecuta node server.ts sirviendo dist/ y rutas /api/* en el puerto 3000
   ```
3. **Reinicio Limpio de Base de Datos:**
   - Desde la interfaz de acceso: botón **Reset DB** → modal de confirmación → `POST /api/reset-db`.
   - Desde Supabase SQL Editor: ejecutar secuencialmente `00_delete_tables.sql` hasta `06_datos_prueba.sql`.
