# Arquitectura del Frontend SPA (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Describe la aplicación **Single-Page Application (SPA)** en TypeScript modular sin frameworks externos en runtime de vistas, compilada con Vite y estilizada con Tailwind CSS v4.

---

## 1. Orquestación de Estado y Enrutamiento (`src/main.ts`)

### 1.1 Contenedor de Estado (`AppState`)
`src/main.ts` centraliza el estado reactivo de la aplicación en un objeto `AppState` tipado y re-renderiza el DOM declarativamente mediante funciones puras de vista:
- **Sesión e Identidad:** `booting`, `user`, `profile`, `activeRoute`, `activeSubSection`, `openMenu`.
- **Autenticación y Reset DB:** `auth` (`mode`: `'login' | 'signup'`, `isResetModalOpen`, `resetLoading`, mensajes de resultado/error).
- **Administración:** `approvals` (perfiles, filtro `PENDING`/`APPROVED`/`REJECTED`/`ALL`, `updatingId`) y `dbCheck` (5 comprobaciones en vivo).
- **Exploración de Certificados (Subfase 4.2):** `exploration` (`records`, `query`, `selectedStatus`, `selectedStandard`, `viewMode` persistido en `localStorage`).
- **Datos Operativos de Dominio (Subfase 4.3 + Fase 5):** `domainData` (`audits`, `auditors`, `organizations`, `sites`, `processes`, `shifts`, `standards`, `requirements`, `iafSectors`, `catalogs`, `findings`, `loading`).
- **Navegación Profunda / Drill-Down (Fase 5):** `drilldown` (`selectedOrgId`, `selectedCertId`, `activeTab`, filtros de hallazgos, formulario inline de hallazgos, `orgSearchQuery`) y `auditPlanning` (`isModalOpen`), además de `selectedScopeAuditId`.

### 1.2 Enrutamiento SPA sin Recarga
- **Rutas soportadas (`ActiveRoute`):** `'dashboard'`, `'approvals'`, `'database'`, `'auditorias'`, `'certificacion'`, `'extra'`, `'drilldown'`.
- Sincroniza `window.location.hash` (`#/{route}` o `#/{route}/{subview}`) y escucha `hashchange` / `popstate` preservando sesiones y evitando recargas de página (`404` en hosting estático).
- La guardia `canAccessRoute(profile, route, subSection)` bloquea cualquier ruta operativa si el usuario no está `APPROVED`, restringe `approvals`/`database` a `ADMIN`, restringe `shifts` en Certificación a personal interno (`ADMIN`/`WORKER`), y limita `extra` a `ADMIN`/`WORKER`/`AUDITOR`.

### 1.3 Hidratación en Vivo con Fallback Curado
- Al autenticar un usuario `APPROVED`, `main.ts` ejecuta en paralelo:
  1. `loadLiveCertificates()`: Consulta `certificado` con joins de `norma`, `estatus`, `sector_iaf`, `organizacion` y `sitio(id)`, e invoca en paralelo la RPC `cobertura_normativa_certificado(p_id_certificado)` para calcular porcentaje y desglose (`covered`, `nonApplicable`, `pending`, `total`) por certificado.
  2. `loadDomainData()`: Lanza 13 consultas paralelas a Supabase (`auditoria`, `auditor`, `organizacion`, `sitio`, `proceso`, `turno`, `norma`, `requisito`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `hallazgo` + relaciones de equipo y procesos/requisitos). Si algún conjunto está vacío o restringido por permisos, conserva respaldo coherente en memoria para mantener continuidad visual.

### 1.4 Experiencia de Teclado y Preservación de Foco
- Atajo `/` (fuera de inputs) enfoca automáticamente el buscador contextual (`#certificateSearchInput` o `#drilldownOrgSearch`).
- Tecla `Escape` cierra el modal de Reset DB, cierra menús desplegables de la cabecera o limpia la búsqueda activa.
- Al filtrar texto en vivo (`input`), `main.ts` re-renderiza preservando la posición exacta de selección (`selectionStart` / `selectionEnd`) del input activo.

---

## 2. Módulos de Lógica Pura y Utilidades (`src/lib/`)

La lógica de negocio se mantiene desacoplada del DOM para permitir pruebas unitarias rápidas con `node:test`:

| Módulo | Responsabilidades Principales |
| :--- | :--- |
| `src/lib/supabase.ts` | Cliente singleton `@supabase/supabase-js` y exportación segura de `SUPABASE_URL` / `SUPABASE_ANON_KEY`. |
| `src/lib/html.ts` | Utilidad `escapeHtml()` para saneamiento estricto contra XSS en plantillas HTML. |
| `src/lib/healthCheck.ts` | Definición de roles/estados visuales con símbolos y tooltips (`getRoleVisualMeta`, `getStatusVisualMeta`), construcción de menús por rol (`getVisibleDomainMenus`), guardias RBAC (`evaluateAdminAccess`, `canAccessRoute`, `canModifyProfileStatus`, `canModifyProfileRole`, `shouldUpdateProfileRole`), formateo de resumen de Reset DB, cálculo de resumen de salud DB (`summarizeHealthChecks`), `TEST_ACCOUNTS` y traducción de errores técnicos a mensajes claros (`translateDatabaseError`). |
| `src/lib/searchControls.ts` | Lógica de Subfase 4.2: normalización Unicode sin acentos (`normalizeSearchToken`), búsqueda multi-token sobre código de certificado, organización, RIF (con o sin guiones) y norma (`matchesSearchCriteria`), filtrado combinado por estatus/norma (`filterCertificateRecords`), extracción de facetas (`extractUniqueStatuses`, `extractUniqueStandards`), persistencia en `localStorage` de `viewMode` (`grid`/`list`), helpers visuales de barras de cobertura ISO y dataset fallback (`SAMPLE_CERTIFICATE_RECORDS`). |
| `src/lib/drillDown.ts` | Lógica de Fase 5: metadatos visuales de modalidades ISO (`getAuditModalityMeta` para `ETAPA_1`..`EXTRAORDINARIA`), clasificación de hallazgos (`getFindingTypeMeta` para `NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`), estadísticas (`calculateFindingStats`), filtros combinados (`filterFindings`), validadores de formulario (`validateFindingInput`, `validateAuditPlanningInput`), validador de competencia auditora (`isAuditorQualifiedForAudit`), evaluación de elegibilidad de emisión (`evaluateCertificateIssuanceReadiness`), reglas de inmutabilidad/RBAC (`verifyAuditLogImmutabilityRule`, `verifyRoleDataBoundary`) y `INITIAL_FINDINGS`. |

---

## 3. Catálogo de Vistas y Flujos de Interfaz (`src/views/`)

| Vista | Ruta / Sub-vistas | Funcionalidad Implementada |
| :--- | :--- | :--- |
| `authView.ts` | Login / Sign up | Pestañas **Log In** y **Sign up**, inicio rápido de prueba (**Quick test login**) para `Admin`, `Worker`, `Auditor` y `Client`, selector de rol al registrarse, y botón **Reset DB** al pie con modal de confirmación (`#resetDbBackdrop`) conectado a `POST /api/reset-db`. |
| `header.ts` | Cabecera Global Persistente (Subfase 4.1) | Barra sticky con identidad **Programa de Auditoría (`PA`)**, menús desplegables accesibles por hover, clic y teclado (*touch/keyboard*) para **Dominio Auditorías** (5 sub-vistas), **Dominio Certificación** (6 sub-vistas) y **Dominio Extra** (4 sub-vistas) filtrados por rol/estado, más menú derecho de cuenta con badges simbólicos de rol (`🛡️`, `⚙️`, `📋`, `🏢`) y estado (`✓`, `⏳`, `❌`), acceso admin (`Dashboard`, `User Approvals` con contador pendiente, `Database Status`) y `Log out`. |
| `dashboardView.ts` | `dashboard` | Tarjeta de bienvenida con rol/estado actual. Para usuarios `APPROVED`, incrusta el **Explorador Operativo de Certificados** con 4 KPIs (total, activos, multisitio, cobertura promedio) y la barra de búsqueda/vista en tiempo real. |
| `searchControlsView.ts` | Subfase 4.2 (reutilizable) | Barra de búsqueda multi-criterio (`/` para enfocar), facetas desplegables por **Estatus** y **Norma ISO**, conmutador **Cuadrícula / Lista**, badge de coincidencias, tarjetas relacionales (`renderCertificateGrid`), tabla compacta (`renderCertificateList`) y estado vacío con reset de filtros. |
| `auditoriasView.ts` | `auditorias` (`scheduling`, `calendar`, `team`, `scope`, `findings`) | Subfase 4.3 + Fase 5: Programación de eventos con formulario inline **"Planificar Nueva Auditoría"** persistiendo en `auditoria`, `equipo_auditor` y `sitios_por_auditoria`; calendario cronológico; directorio de competencias técnicas (Normas + Sectores IAF) por auditor; desglose de **Alcance** por auditoría (sedes, turnos y procesos); y módulo **Hallazgos** con KPIs por severidad, filtros por tipo/estado, creación inline en `hallazgo` y alternancia abierto/cerrado. |
| `certificacionView.ts` | `certificacion` (`certificates`, `organizations`, `sites`, `processes`, `shifts`) | Subfase 4.3: Reutiliza `searchControlsView` para certificados; directorio de organizaciones con RIF y dirección fiscal; sedes multi-sitio vinculadas a certificados; mapa de procesos con cláusulas ISO asignadas; y matriz de turnos horarios (restringida a `ADMIN`/`WORKER`). |
| `extraView.ts` | `extra` (`standards`, `requirements`, `iaf`, `catalogs`) | Subfase 4.3: Esquemas y normas ISO, tabla de requisitos jerárquicos con rutas `LTREE` (`4`, `4.4_1`, etc.), clasificación de sectores IAF y catálogos operativos (`estatus`, `tipo_auditoria`, `metodologia_auditoria`). |
| `drillDownView.ts` | `drilldown` | Fase 5: Cascada interactiva guiada por breadcrumbs: **Paso 1** Selección de Organización (con buscador en tiempo real) → **Paso 2** Selección de Certificado (con pills de cambio rápido y barra de progreso `ltree`) → **Paso 3** 4 sub-pestañas de detalle (`Sedes y Turnos`, `Mapa de Procesos`, `Matriz Normativa (ltree)`, y `Auditorías y Hallazgos` con filtros, alta inline y cierre/reapertura de hallazgos). |
| `approvalsView.ts` | `approvals` | Solo `ADMIN`: Filtros (`Pending`, `Approved`, `Rejected`, `All`), aprobación/rechazo de cuentas nuevas, revocación de acceso y **cambio de rol en vivo** (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`) sobre usuarios aprobados, bloqueando la auto-modificación de la sesión admin actual. |
| `databaseStatusView.ts` | `database` | Solo `ADMIN`: Panel diagnóstico de 5 comprobaciones en vivo (`/auth/v1/health`, `profiles`, tablas de negocio, RPC `cobertura_normativa_certificado`, y `audit_log` + `client_organization_access`) con latencia en `ms` y resumen de disponibilidad. |
