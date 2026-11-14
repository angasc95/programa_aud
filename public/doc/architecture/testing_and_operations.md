# Pruebas, Operación y Despliegue (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Detalla la suite de verificación automatizada (**30 archivos / 236 pruebas unitarias en 23 suites de `node:test`**), verificación estricta de tipos (`strict: true`, `0 any`), compilación optimizada con Vite (`manualChunks`), verificación en navegador real Chromium (`375px` a `1920px`) y operación en producción.

---

## 1. Suite de Pruebas Unitarias (`node:test` + `tsx`)

Todas las reglas de negocio ISO/IEC 17021-1 e ISO 19011, esquemas SQL de retención lógica, políticas RBAC, sanitización Zero-UUID, navegación contextual, plantillas Multi View y Detail View en 3 Zonas se verifican mediante **30 archivos de pruebas (`src/lib/*.test.ts`)** ejecutados con el corredor nativo `node:test` vía `tsx` (**236 pruebas distribuidas en 23 suites, 100% aprobadas, 0 fallos, 0 omitidas**):

### 1.1 Suites de Dominio, Seguridad y Gobernanza

| Archivo de Pruebas | Módulo(s) Evaluado(s) | Cobertura Principal |
| :--- | :--- | :--- |
| `src/lib/accessControl.test.ts` | `accessControl.ts`, vistas operativas | Matrices RBAC (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`), visibilidad de bloques, acceso a ruta `'profile'`, permisos de archivo/restauración, mutación de hallazgos y acceso a `audit_log`. |
| `src/lib/archiveGovernance.test.ts` | `archiveGovernance.ts`, `sitioDomain.ts`, `procesoDomain.ts`, `turnoDomain.ts`, escaneo estático `src/` | Formateo de `get_archive_dependency_summary`, cálculo local de dependencias, sanitización de motivos (máx. 300 chars), reglas de protección de `Sitio 0` (`canArchiveSitio`) y escaneo estático confirmando **0 llamadas `.delete()`** sobre las 23 tablas `PROTECTED_SOFT_DELETE_TABLES`. |
| `src/lib/profileGovernance.test.ts` | `healthCheck.ts`, `profileView.ts` | Validación de `buildSelfProfileUpdatePayload()` devolviendo estrictamente `{ nombre }` sin `role`/`status`, rechazo de entradas vacías/inválidas/UUIDs, bloqueo en `canModifyProfileStatus`/`canModifyProfileRole` y renderizado solo-lectura de `Mi Perfil` sin fugas UUID. |
| `src/lib/activeCertificates.test.ts` | `activeCertificates.ts`, `organizacionView.ts` | Conteo estricto de certificados activos por organización y globalmente, validación RIF/NIF, plantilla Multi View (`type="text"`, único `data-clear-search`, `"Mostrando"`), Detail View en 3 Zonas y cumplimiento Zero-UUID. |
| `src/lib/auditDomain.test.ts` | `auditDomain.ts` | Reglas base del dominio Auditoría, estados operativos y metadatos iniciales. |
| `src/lib/auditExecution.test.ts` | `auditExecution.ts`, `resultadoView.ts`, `calendarioView.ts` | Motor de recomendación ISO/IEC 17021-1 Cláusula 9.5/9.6 (bloqueo por `NC_MAYOR` abierta o `NC_MENOR` sin plan de acción), firma electrónica, flujo CAPA y detección de solapamiento de auditores. |
| `src/lib/auditLog.test.ts` | `auditLog.ts` | Resolución legible de actores (`resolveAuditActorDisplay`), formateo local de fechas, cálculo de diferencias `JSONB` y cumplimiento Zero-UUID. |
| `src/lib/auditPhase5Views.test.ts` | `programacionView.ts`, `calendarioView.ts`, `resultadoView.ts`, `auditoriasView.ts` | Integración de vistas del dominio Auditoría, controles de programación/calendario/Kanban y aislamiento por rol. |
| `src/lib/breadcrumb.test.ts` | `breadcrumb.ts`, `breadcrumbView.ts`, `header.ts` | Etiquetas singulares, linaje contextual cross-domain (`Certificado → Norma → Certificado`), prevención de bucles con claves compuestas, truncamiento a 24 caracteres (`…`), colapso intermedio y `data-nav-reset="true"` + ruta `'profile'` en cabecera. |
| `src/lib/competencyMatrix.test.ts` | `competencyMatrix.ts` | Emparejamiento técnico (`norma` + `sector_iaf` + `subsector_iaf`), vigencia de credenciales (`Vigente`, `Por Vencer`, `Vencido`) y coerción segura de identificadores. |
| `src/lib/detailViewsPhase42.test.ts` | `detailTemplate.ts`, `acreditacionView.ts`, `sitioView.ts`, `procesoView.ts`, `turnoView.ts`, `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts` | Verificación integral de Fichas de Detalle en 3 Zonas (ausencia de rótulos `ZONA 1/3/4`), resaltado y guardia de `Sitio 0`, cobertura `LTREE` en `Proceso`, jornadas nocturnas en `Turno`, alcance de `Acreditación` y cumplimiento Zero-UUID. |
| `src/lib/drillDown.test.ts` | Lógica transversal heredada de hallazgos y auditorías | Modalidades ISO, estadísticas/filtros de hallazgos, validación de planificación de auditorías y elegibilidad de emisión. |
| `src/lib/extraDomain.test.ts` | `extraDomain.ts`, vistas de Dominio Extra | Catálogos maestros (`norma`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`), acreditaciones Norma-IAF, sub-sectores e integración de vistas Extra. |
| `src/lib/healthCheck.test.ts` | `healthCheck.ts` | Guardias RBAC de rutas (`'profile'` incluida), exactamente 3 bloques singulares en cabecera (`Auditoría`, `Certificación`, `Extra`), exclusión de menús retirados, salud DB y traducción de errores. |
| `src/lib/multisiteSampling.test.ts` | `multisiteSampling.ts`, `certificadoView.ts` | Ordenamiento multisitio con **Sitio 0** al inicio, conteo de sucursales (`numero_sitio > 0`), validación de `alcance` (10–1000 chars), justificación de exclusiones (`>= 5` chars), controles `type="text"` y ficha en 3 Zonas. |
| `src/lib/multiViewFacets.test.ts` | `universalTemplate.ts` (`lib` + `views`) | Conteos reactivos por intersección *rest-out* ($S_{-k}$) con casillas múltiples, filtrado OR intra-categoría / AND inter-categoría, totalizador `"Mostrando X de Y"` y renderizado en `Organizaciones`, `Certificados`, `Auditores`, `Acreditaciones`, `Normas` y `Programación`. |
| `src/lib/searchControls.test.ts` | `searchControls.ts` | Normalización Unicode sin acentos, búsqueda multi-token, filtros combinados y extracción de facetas. |
| `src/lib/universalTemplate.test.ts` | `universalTemplate.ts` (`lib` + `views`) | Ordenamiento determinista (`none → asc → desc → none`), locale español, controles `type="text"` con único botón de limpieza (`✕`) y barra lateral colapsable (`data-toggle-sidebar`). |
| `src/lib/zeroUuid.test.ts` | `zeroUuid.ts` | Detección de UUIDs expuestos en HTML visible, `title`/`aria-label`/`placeholder` e `<input>` visibles, ignorando `data-*`. |
| `src/lib/acreditacionDomain.test.ts`, `sitioDomain.test.ts`, `procesoDomain.test.ts`, `turnoDomain.test.ts` | Módulos de dominio de Fase 4.2 | Validaciones, cálculos de vigencia, protección de Sitio 0, vinculación `LTREE` de cláusulas y cálculo de duración de turnos con cruce de medianoche (`8h 00m (nocturno)`). |

### 1.2 Suites Estructurales de Fases (SQL, RLS, Shell y UI)

| Archivo de Pruebas | Propósito |
| :--- | :--- |
| `src/lib/phase11SqlMigration.test.ts` | Valida columnas `deleted_at`/`deleted_by`/`delete_reason`, triggers de soft-delete/prevención de hard-delete, `get_archive_dependency_summary` e índices únicos parciales en `01`–`06.sql`. |
| `src/lib/phase12RlsHardening.test.ts` | Verifica `REVOKE DELETE` en 26 tablas, `archive_record`, `fn_protect_profile_rbac_fields` y ausencia de `FOR DELETE` en tablas protegidas dentro de `04_rls.sql`. |
| `src/lib/phase21NavigationShell.test.ts` | Verifica la estructura de 3 bloques en `header.ts`, retiro de sub-secciones obsoletas y `data-nav-reset="true"`. |
| `src/lib/phase22DashboardProfile.test.ts` | Verifica dashboard minimalista sin explorador duplicado/píldoras de rol y vista `Mi Perfil`. |
| `src/lib/phase412MultiView.test.ts` | Verifica controles Multi View (`type="text"`, único botón `✕`, barra lateral colapsable y facetas) en vistas de dominio. |
| `src/lib/phase421DetailTemplate.test.ts` | Verifica contrato estructural de `renderDetailPageTemplate` en 3 Zonas y compatibilidad de `parents`. |
| `src/lib/phase62UiIntegrity.test.ts` | Auditoría transversal de integridad UI y cumplimiento **Zero-UUID** en Header, Dashboard, Approvals, Modal Audit Log, Certificación (`Sitio`, `Proceso`, `Turno`), Auditoría y Extra (`Acreditación`, modal de archivo seguro). |

### Comandos de Verificación

```bash
# Ejecutar los 30 archivos de prueba (236 pruebas en 23 suites de node:test)
npm test
# Equivalente directo:
npx tsx --test src/lib/*.test.ts

# Verificación estricta de tipos TypeScript (tsc --noEmit, strict: true, 0 any)
npm run lint

# Compilación optimizada de producción con Vite (genera dist/)
npm run build
```

---

## 2. Compilación Vite (`manualChunks`) y Verificación en Navegador Real

### 2.1 Estrategia de Segmentación de Bundles (`vite.config.ts`)
`vite.config.ts` define `build.rollupOptions.output.manualChunks` para dividir el bundle de producción en chunks enfocados por capa y dominio, manteniendo todos los chunks generados por debajo de `250 kB`:
- **`supabase`:** Cliente `@supabase/supabase-js`.
- **`domain-lib`:** Los 20 módulos de lógica pura de `src/lib/`.
- **`views-audit`:** Vistas del dominio Auditoría y bitácora (`auditoriasView`, `programacionView`, `calendarioView`, `resultadoView`, `auditLogModal`).
- **`views-domains`:** Vistas de los dominios Extra y Certificación (`extraView`, `normaView`, `sectorIafView`, `estatusView`, `tipoAuditoriaView`, `metodologiaAuditoriaView`, `certificacionView`, `certificadoView`, `organizacionView`, `auditorView`).
- **`views-shell`:** Shell principal, autenticación, header, breadcrumbs, dashboard, `Mi Perfil`, `archiveModalView`, vistas de sub-entidades (`acreditacionView`, `sitioView`, `procesoView`, `turnoView`) y consolas administrativas.

### 2.2 Verificación End-to-End en Chromium (Playwright)
Las pruebas en navegador real contra `http://localhost:3000` verifican en **`375×812` (móvil)** y **`1440×900` / `1920px` (escritorio)**:
- **Cero desbordamiento horizontal** (`scrollWidth <= innerWidth` en móvil y escritorio) y **cero errores de aplicación en consola**.
- **Cabecera en 3 bloques y Dashboard minimalista:** Sin tarjetas de exploración duplicadas ni píldoras redundantes.
- **`Mi Perfil`:** Actualización y restauración exitosa del campo `nombre` con bloqueo de `role` y `status`.
- **Multi View:** Barra lateral colapsable (`aria-expanded`), conteos reactivos, búsqueda `type="text"` con un único botón `✕` (`[data-clear-search="true"]`) y totalizador `Mostrando X de Y`.
- **Breadcrumbs y Detail Views en 3 Zonas:** Navegación profunda (`Certificación → … → Sitio 0 → Turno`) sin saltos de dominio, sin bucles y sin exposición de UUIDs.
- **Archivo Seguro, Restauración y Aislamiento de Roles:** Bloqueo por dependencias activas en Certificado, archivo y restauración limpia en Acreditación como `ADMIN`, y aislamiento verificado para `AUDITOR` (sin bloque `Certificación`), `WORKER` (sin `Estado DB` ni `"Mostrar Archivados"`) y `CLIENT` (sin `Panel Aprobaciones` ni `"Mostrar Archivados"`).

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
| `ADMIN` | `admin@fondonorma.test` | `APPROVED` | Control total, aprobación/cambio de rol de usuarios, catálogos, Reset DB, `Database Status`, `"Mostrar Archivados"`, `"Restaurar"` y lectura global de `audit_log`. |
| `WORKER` | `worker@fondonorma.test` | `APPROVED` | Gestión operativa completa de organizaciones, certificados, sitios, procesos, turnos, catálogos, planificación de auditorías y archivo seguro sin dependencias (`archive_record`); lectura de usuarios y `audit_log`. |
| `AUDITOR` | `auditor@fondonorma.test` | `APPROVED` | Bloques `Auditoría` y `Extra`; lectura de alcance asignado, ejecución de auditorías asignadas, matriz normativa, registro/cierre de hallazgos, firma de recomendación e historial de sus auditorías/hallazgos. |
| `CLIENT` | `client@fondonorma.test` | `APPROVED` | Lectura acotada exclusivamente a organizaciones con solicitud `APPROVED` en `client_organization_access`, sus certificados, sitios, procesos, auditorías y hallazgos. |

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
