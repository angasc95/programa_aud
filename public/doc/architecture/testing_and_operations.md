# Pruebas, Operación y Despliegue (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Detalla la suite de verificación automatizada (**16 archivos / 155 pruebas en `node:test`**), verificación estricta de tipos, compilación optimizada con Vite (`manualChunks`), pruebas responsivas en navegador y operación en producción.

---

## 1. Suite de Pruebas Unitarias (`node:test` + `tsx`)

Todas las reglas de negocio, validaciones ISO/IEC 17021-1 e ISO 19011, políticas RBAC en frontend, sanitización Zero-UUID y plantillas de vistas se verifican mediante **16 suites automatizadas (`src/lib/*.test.ts`)** ejecutadas con el corredor nativo `node:test` vía `tsx` (**155 pruebas distribuidas en 22 sub-suites, 100% aprobadas**):

| Archivo de Pruebas | Módulo(s) Evaluado(s) | Cobertura Principal |
| :--- | :--- | :--- |
| `src/lib/accessControl.test.ts` | `accessControl.ts`, vistas de auditoría y certificación | Matrices RBAC (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`), aislamiento por auditorías asignadas, mutación de hallazgos y acceso a `audit_log`. |
| `src/lib/activeCertificates.test.ts` | `activeCertificates.ts`, `organizacionView.ts` | Conteo de certificados activos por organización y globalmente, exclusión estricta de `En Espera`, `Cancelado`, `Inactivo` y `Suspendido`, y validación de RIF/NIF. |
| `src/lib/auditDomain.test.ts` | `auditDomain.ts` | Reglas de negocio base del dominio Auditorías, estados operativos y metadatos iniciales. |
| `src/lib/auditExecution.test.ts` | `auditExecution.ts`, `resultadoView.ts`, `calendarioView.ts` | Motor de recomendación ISO/IEC 17021-1 Cláusula 9.5/9.6 (bloqueo por `NC_MAYOR` abierta o `NC_MENOR` sin plan de acción), firma electrónica, flujo CAPA y detección de solapamiento de auditores. |
| `src/lib/auditLog.test.ts` | `auditLog.ts` | Resolución legible de actores (`resolveAuditActorDisplay`), formateo local de fechas, cálculo de diferencias `JSONB` y cumplimiento Zero-UUID. |
| `src/lib/auditPhase5Views.test.ts` | `programacionView.ts`, `calendarioView.ts`, `resultadoView.ts`, `auditoriasView.ts` | Integración de vistas de Fase 5, controles clave de programación/calendario/Kanban y aislamiento por rol en el renderizado. |
| `src/lib/breadcrumb.test.ts` | `breadcrumb.ts`, `breadcrumbView.ts`, `header.ts` | Transiciones de pila de *breadcrumbs*, retroceso idempotente por `entityId`, truncamiento exacto a 24 caracteres con elipsis (`…`) y presencia de `data-nav-reset="true"` en la cabecera global. |
| `src/lib/competencyMatrix.test.ts` | `competencyMatrix.ts` | Emparejamiento técnico (`norma` + `sector_iaf` + `subsector_iaf`), evaluación de vigencia de credenciales (`Vigente`, `Por Vencer`, `Vencido`) y coerción segura de identificadores. |
| `src/lib/drillDown.test.ts` | `drillDown.ts` | Modalidades ISO, estadísticas/filtros de hallazgos, validación de planificación de auditorías y elegibilidad de emisión. |
| `src/lib/extraDomain.test.ts` | `extraDomain.ts`, vistas de Dominio Extra | Catálogos maestros (`norma`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`), acreditaciones Norma-IAF, sub-sectores e integración de vistas Extra. |
| `src/lib/healthCheck.test.ts` | `healthCheck.ts` | Guardias RBAC de rutas y administración, menús en 3 bloques por rol/estado, protección contra auto-revocación de administradores, métricas de salud DB y traducción de errores. |
| `src/lib/multisiteSampling.test.ts` | `multisiteSampling.ts`, `certificadoView.ts` | Ordenamiento multisitio con **Sitio 0** principal al inicio, conteo de sucursales (`numero_sitio > 0`), validación de `alcance` (10–1000 chars), justificación de no aplicabilidad (`>= 5` chars) y regla de listado limpio. |
| `src/lib/phase62UiIntegrity.test.ts` | Vistas transversales (Fases 4–6.2) | Verificación integral de UI, ausencia de texto roto y cumplimiento **Zero-UUID** en Header, Dashboard, Approvals, Modal Audit Log, Certificación, Auditorías y Extra. |
| `src/lib/searchControls.test.ts` | `searchControls.ts` | Normalización Unicode sin acentos, búsqueda multi-token (código, empresa, RIF, norma), filtros combinados, extracción de facetas y cobertura visual. |
| `src/lib/universalTemplate.test.ts` | `universalTemplate.ts` | Ciclos de ordenamiento (`none → asc → desc → none`), ordenamiento numérico/locale español, conteos de facetas y construcción de opciones. |
| `src/lib/zeroUuid.test.ts` | `zeroUuid.ts` | Detección de UUIDs expuestos en texto visible HTML, atributos `title`/`aria-label`/`placeholder` e `<input>` visibles, ignorando atributos internos `data-*`. |

### Comandos de Verificación

```bash
# Ejecutar las 16 suites unitarias (155 pruebas en node:test)
npm test
# Equivalente directo:
npx tsx --test src/lib/*.test.ts

# Verificación estricta de tipos TypeScript (tsc --noEmit, strict: true, 0 any)
npm run lint

# Compilación optimizada de producción con Vite (genera dist/)
npm run build
```

---

## 2. Compilación Vite (`manualChunks`) y Verificación Responsiva

### 2.1 Estrategia de Segmentación de Bundles (`vite.config.ts`)
`vite.config.ts` define `build.rollupOptions.output.manualChunks` para dividir el bundle de producción en chunks enfocados por capa y dominio, manteniendo todos los archivos generados por debajo de `500 kB`:
- **`supabase`:** Cliente `@supabase/supabase-js`.
- **`domain-lib`:** Los 16 módulos de lógica pura de `src/lib/`.
- **`views-audit`:** Vistas del dominio Auditorías y bitácora (`auditoriasView`, `programacionView`, `calendarioView`, `resultadoView`, `auditLogModal`).
- **`views-domains`:** Vistas de los dominios Extra y Certificación (`extraView`, `normaView`, `sectorIafView`, `estatusView`, `tipoAuditoriaView`, `metodologiaAuditoriaView`, `certificacionView`, `certificadoView`, `organizacionView`, `auditorView`).
- **`views-shell`:** Shell principal, autenticación, header, breadcrumbs, dashboard y consolas administrativas.

### 2.2 Cobertura de Verificación Responsiva
Las pruebas de renderizado en navegador real (Chromium) validan ausencia de desbordamiento horizontal (`scrollWidth <= innerWidth`), correcta adaptación de menús, barras de facetas, tablas desplazables horizontalmente y modales en cuatro anchos de referencia:
- **`375px`** (Móvil vertical)
- **`768px`** (Tableta)
- **`1440px`** (Escritorio estándar)
- **`1920px`** (Full HD)

Cubriendo las pantallas de Autenticación, Dashboard/Explorador, Organizaciones, Detalle de Certificado (5 pestañas), Auditorías (`Programación`, `Calendario` Mensual/Trimestral/Gantt, `Resultado` Tabla/Kanban), Dominio Extra y Consola Administrativa (`Approvals` / `Database Status`).

---

## 3. Resolución de Entorno y Variables (`.env`, `supabase.env`, `supabase.config.json`)

Tanto `server.ts` como `vite.config.ts` cargan configuración opcional en cascada desde `supabase.config.json`, `supabase.env` y `.env` (`override: true`), garantizando el aislamiento de secretos:

| Variable | Uso | Visibilidad |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Endpoint del proyecto Supabase (`https://ufowtgmpaahyshdxlnlq.supabase.co`). | Cliente y Servidor |
| `VITE_SUPABASE_ANON_KEY` | Clave pública/anon para PostgREST, GoTrue Auth y RPC sujetos a RLS. | Cliente |
| `VITE_SUPABASE_DATABASE_KEY` | Contraseña PostgreSQL directa (`db.<ref>.supabase.co:5432`) para `POST /api/reset-db` vía `pg.Client`. | Solo Servidor (`server.ts`) |
| `VITE_SUPABASE_TOKEN` | Personal Access Token de Supabase Management API (método prioritario en `POST /api/reset-db`). | Solo Servidor (`server.ts`) |

---

## 4. Cuentas de Prueba (`05_usuarios.sql`)

Todas las cuentas de prueba comparten la contraseña **`Password123*`** y disponen de acceso directo (**Quick test login**) en `authView.ts`:

| Rol | Email | Estado Inicial | Alcance Principal |
| :--- | :--- | :---: | :--- |
| `ADMIN` | `admin@fondonorma.test` | `APPROVED` | Control total, aprobación/cambio de rol de usuarios, catálogos, Reset DB, `Database Status` y lectura global de `audit_log`. |
| `WORKER` | `worker@fondonorma.test` | `APPROVED` | Gestión operativa completa de organizaciones, certificados, sitios, procesos, turnos, catálogos y planificación de auditorías; lectura de usuarios y `audit_log`. |
| `AUDITOR` | `auditor@fondonorma.test` | `APPROVED` | Lectura de alcance asignado, ejecución de auditorías asignadas, matriz normativa, registro/cierre de hallazgos, firma de recomendación e historial de sus auditorías/hallazgos. |
| `CLIENT` | `client@fondonorma.test` | `APPROVED` | Lectura acotada exclusivamente a organizaciones con solicitud `APPROVED` en `client_organization_access`, sus certificados, auditorías y hallazgos. |

---

## 5. Flujo de Ejecución y Despliegue en Producción

1. **Desarrollo local:**
   ```bash
   npm install
   npm run dev   # Ejecuta tsx server.ts en http://0.0.0.0:3000 con Vite middleware (hmr: false)
   ```
2. **Compilación y Arranque en Producción:**
   ```bash
   npm run build # Compila SPA en dist/ mediante vite build (con manualChunks)
   npm start     # Ejecuta node server.ts sirviendo dist/ y rutas /api/* en el puerto 3000 (o process.env.PORT)
   ```
3. **Reinicio Limpio de Base de Datos:**
   - Desde la interfaz de acceso (`authView.ts`): botón **Reset DB** → modal de confirmación → `POST /api/reset-db` (ejecuta `00_delete_tables.sql` a `06_datos_prueba.sql`).
   - Desde Supabase SQL Editor: ejecutar secuencialmente `00_delete_tables.sql` hasta `06_datos_prueba.sql`.
