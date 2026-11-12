# Arquitectura del Frontend SPA (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Describe la aplicación **Single-Page Application (SPA)** en TypeScript estricto modular sin dependencias de framework en vistas, compilada con Vite (`manualChunks` por dominio) y estilizada con Tailwind CSS v4.

---

## 1. Orquestación de Estado y Enrutamiento (`src/main.ts`)

### 1.1 Contenedor de Estado (`AppState`)
`src/main.ts` centraliza el estado reactivo tipado en `AppState` y re-renderiza declarativamente el DOM mediante funciones puras de vista:
- **Sesión e Identidad:** `booting`, `user`, `profile`, `activeRoute`, `activeSubSection`, `openMenu`.
- **Navegación Jerárquica:** `breadcrumbs` (`BreadcrumbItem[]` gestionado mediante `breadcrumb.ts` y `breadcrumbView.ts`) con reseteo automático al pulsar botones de navegación principal marcados con `data-nav-reset="true"`.
- **Autenticación y Reset DB:** `auth` (`mode`: `'login' | 'signup'`, `isResetModalOpen`, `resetLoading`, mensajes de resultado/error).
- **Administración:** `approvals` (perfiles, filtros `PENDING`/`APPROVED`/`REJECTED`/`ALL`, `updatingId`) y `dbCheck` (5 comprobaciones en vivo).
- **Exploración de Certificados:** `exploration` (`records`, `query`, `selectedStatus`, `selectedStandard`, `viewMode` persistido en `localStorage`).
- **Dominios Auditorías, Certificación y Extra:** Estado de programación, calendario (`month`/`quarter`/`gantt`), tablero de hallazgos/resultados (`list`/`kanban`), motor de recomendación ISO/IEC 17021-1, detalle multisitio de certificados (5 pestañas), matriz de competencias de auditores, catálogos universales y modal de bitácora forense (`auditLogModal.ts`).

### 1.2 Enrutamiento SPA sin Recarga
- **Rutas soportadas (`ActiveRoute`):** `'dashboard'`, `'approvals'`, `'database'`, `'auditorias'`, `'certificacion'`, `'extra'`, `'drilldown'`.
- Sincroniza `window.location.hash` (`#/{route}` o `#/{route}/{subview}`) y escucha `hashchange` / `popstate` evitando recargas de página.
- La guardia `canAccessRoute(profile, route, subSection)` bloquea cualquier ruta operativa si el usuario no está `APPROVED`, restringe `database` y edición de aprobaciones a `ADMIN`, restringe `shifts` en Certificación a personal interno (`ADMIN`/`WORKER`), y limita `extra` a `ADMIN`/`WORKER`/`AUDITOR`.

### 1.3 Hidratación en Vivo y Seguridad en Cliente
- Al autenticar un usuario `APPROVED`, `main.ts` ejecuta en paralelo `loadLiveCertificates()` (con RPC `cobertura_normativa_certificado`) y `loadDomainData()` (consultas Supabase filtradas por RLS con respaldo coherente en memoria para continuidad operativa).
- Todas las vistas sanean dinámicamente texto interpolado mediante `escapeHtml()` (`src/lib/html.ts`) y garantizan la regla **Zero-UUID** en texto visible, tooltips y atributos accesibles.
- Atajos de teclado: `/` enfoca el buscador activo y `Escape` cierra modales, menús desplegables o limpia búsquedas.

---

## 2. Módulos de Lógica Pura y Utilidades (`src/lib/`)

La lógica de dominio está desacoplada del DOM en **16 módulos** probados unitariamente con `node:test`:

| Módulo | Responsabilidades Principales |
| :--- | :--- |
| `supabase.ts` | Cliente singleton `@supabase/supabase-js` usando únicamente URL pública y Anon Key. |
| `html.ts` | Escape HTML anti-XSS (`escapeHtml`). |
| `healthCheck.ts` | Guardias RBAC (`evaluateAdminAccess`, `canAccessRoute`, `canModifyProfileStatus`, `canModifyProfileRole`), menús por rol, métricas de salud DB y traducción de errores. |
| `accessControl.ts` | Aislamiento por rol para auditorías, hallazgos, certificados, organizaciones y permisos de acceso a `audit_log` (`canMutateAuditExecution`, `canViewAuditLogForEntity`). |
| `searchControls.ts` | Normalización Unicode sin acentos, búsqueda multi-token (código, empresa, RIF, norma), filtros combinados, facetas y barras de cobertura ISO. |
| `activeCertificates.ts` | Conteo preciso de certificados activos por organización y globalmente excluyendo estatus inactivos/cancelados/suspendidos/en espera. |
| `multisiteSampling.ts` | Muestreo multisitio con ordenamiento prioritario de Sede 0 principal (`sortSitesWithPrincipalFirst`), conteo de sucursales y validación de justificaciones de no aplicabilidad (`validateJustificacionNoAplicable`). |
| `competencyMatrix.ts` | Emparejamiento de competencias técnicas de auditores contra norma ISO y sector IAF (`isAuditorQualifiedForScope`) considerando vigencias. |
| `auditDomain.ts` | Tipos base y lógica del dominio de auditorías. |
| `auditExecution.ts` | Programación, detección de solapamiento de auditores en calendario, ciclo de vida CAPA de hallazgos y motor de recomendación ISO/IEC 17021-1 Cláusula 9.5/9.6 (`evaluateIso17021Recommendation`). |
| `drillDown.ts` | Lógica del explorador jerárquico en cascada, modalidades ISO y validadores de hallazgos/planificación. |
| `extraDomain.ts` | Catálogos maestros (`norma`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`) y acreditaciones Norma-IAF. |
| `breadcrumb.ts` | Gestión de pila de *breadcrumbs*, retroceso jerárquico y truncamiento a 24 caracteres (`truncateBreadcrumbLabel`). |
| `universalTemplate.ts` | Ordenamiento determinista multi-columna (`cycleSortDirection`, `sortItems`) y cálculo de facetas (`calculateFacetCounts`, `buildFacetOptions`). |
| `auditLog.ts` | Resolución de identidad de actores sin UUIDs (`resolveAuditActorDisplay`) y formateo de snapshots `JSONB`. |
| `zeroUuid.ts` | Análisis y verificación estática de cumplimiento Zero-UUID en HTML renderizado. |

---

## 3. Catálogo de Vistas Modulares (`src/views/` — 25 módulos)

| Grupo | Vistas | Funcionalidad Implementada |
| :--- | :--- | :--- |
| **Shell, Navegación y Autenticación** | `authView.ts`, `header.ts`, `breadcrumbView.ts`, `dashboardView.ts`, `searchControlsView.ts`, `universalTemplate.ts`, `detailTemplate.ts`, `auditLogModal.ts` | Login/Sign up/Quick Login + Reset DB; cabecera sticky con menús por dominio y `data-nav-reset="true"`; barra de *breadcrumbs*; dashboard con explorador de certificados; plantillas reutilizables de tabla/facetas y detalle; modal forense `audit_log`. |
| **Consola Administrativa** | `approvalsView.ts`, `databaseStatusView.ts` | Aprobación, rechazo y cambio de rol en vivo (`ADMIN`), más panel diagnóstico de 5 comprobaciones contra Supabase. |
| **Dominio Auditorías** | `auditoriasView.ts`, `programacionView.ts`, `calendarioView.ts`, `resultadoView.ts` | Ciclo operativo completo: programación con muestreo multisitio y equipos competentes; calendario Mensual/Trimestral/Gantt con detección de conflictos; tablero de hallazgos Tabla/Kanban, gestión CAPA y motor de recomendación ISO/IEC 17021-1. |
| **Dominio Certificación y Drill-Down** | `certificacionView.ts`, `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `drillDownView.ts` | Organizaciones con conteo de activos; ficha detallada de certificado (5 pestañas: Sitios con Sede 0 primero, Procesos, Turnos, No Aplicables con validación y Auditorías); directorio y matriz de competencias de auditores; cascada *Drill-Down*. |
| **Dominio Extra (Catálogos)** | `extraView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts` | Gestión y consulta con plantilla universal ordenable/facetada para normas ISO, cláusulas `LTREE`, acreditaciones Norma-IAF, sectores IAF, estatus, tipos y metodologías. |
