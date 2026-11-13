# Arquitectura del Frontend SPA (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Describe la aplicación **Single-Page Application (SPA)** en TypeScript estricto (`strict: true`, `0 any`) con renderizado declarativo sin framework externo en vistas, compilada con Vite (`manualChunks`) y estilizada con Tailwind CSS v4.

---

## 1. Orquestación de Estado, Rutas y Seguridad en Cliente (`src/main.ts`)

### 1.1 Contenedor Central de Estado (`AppState`)
`src/main.ts` mantiene un estado tipado único en `AppState`, preserva foco y selección de cursor al re-renderizar inputs activos, y actualiza el DOM mediante funciones puras de vista:
- **Sesión e Identidad:** `booting`, `user`, `profile`, `authorizedClientOrgIds`, `activeRoute`, `activeSubSection`, `openMenu`.
- **Navegación Jerárquica:** `breadcrumbs` (`BreadcrumbSegment[]`) y estado del modal forense `auditLogModal` (`isOpen`, `entityName`, `tableName`, `recordId`, `entries`, `actorDirectory`, `loading`, `errorMessage`).
- **Autenticación y Diagnóstico:** `auth` (`mode`: `'login' | 'signup'`, modal de confirmación Reset DB) y `dbCheck` (5 comprobaciones en vivo contra Supabase).
- **Aprobaciones Administrativas:** `approvals` (listado de perfiles, filtro `PENDING`/`APPROVED`/`REJECTED`/`ALL`, control de actualizaciones).
- **Exploración y Dominios Operativos:**
  - `exploration`: buscador y filtros de certificados en Dashboard/Explorador (`viewMode` persistido en `localStorage`).
  - `programacionDomain`, `calendarioDomain` (`month` | `quarter` | `gantt`) y `resultadoDomain` (`list` | `kanban` + motor de recomendación ISO/IEC 17021-1).
  - `organizacionDomain`, `certificadoDomain`, `auditorDomain` y `drilldown`.
  - `extraDomain`: estado independiente de búsqueda, facetas, ordenamiento y detalle para `Norma`, `Sector IAF`, `Estatus`, `Tipo` y `Metodología`.

### 1.2 Enrutamiento Hash SPA y Guardias RBAC
- **Rutas soportadas (`ActiveRoute`):** `'dashboard'`, `'approvals'`, `'database'`, `'auditorias'`, `'certificacion'`, `'extra'`, `'drilldown'`.
- **Sincronización Hash (`#/{route}` o `#/{route}/{subview}`):** Escucha `hashchange` y `popstate` evitando recargas completas del documento.
- **Guardia `canAccessRoute(profile, route)`:**
  - Si el perfil está `PENDING` o `REJECTED`, bloquea cualquier ruta operativa (solo permite `dashboard`, donde se muestra el estado de cuenta pendiente/rechazada).
  - Restringe `database` exclusivamente a `ADMIN` aprobado (`evaluateAdminAccess`).
  - Restringe `approvals` a `ADMIN` (gestión) y `WORKER` (solo lectura).
  - Restringe visibilidad de menús de dominio mediante `getVisibleDomainMenus(profile)`:
    - **Bloque 1 (`Auditorías`):** Visible para `ADMIN`, `WORKER`, `AUDITOR`, `CLIENT` (`Programación`, `Calendario`, `Resultado`).
    - **Bloque 2 (`Certificación`):** Visible para `ADMIN`, `WORKER`, `CLIENT` (`Organización`, `Certificado`, `Auditor`, `Drill-Down`, `Sedes Multisitio`, `Mapa de Procesos`, y `Turnos` exclusivo para `ADMIN`/`WORKER`).
    - **Bloque 3 (`Extra`):** Visible para usuarios `APPROVED` (`Norma`, `Sector IAF`, `Estatus`, `Tipo`, `Metodología`, `Requisitos LTREE`, `Todos los Catálogos`), con edición restringida a personal interno (`ADMIN`/`WORKER`).

### 1.3 Hidratación en Vivo, Sanitización y Atajos
- Al autenticar un usuario `APPROVED`, `main.ts` ejecuta en paralelo `loadLiveCertificates()` (incluyendo RPC `cobertura_normativa_certificado`) y `loadDomainData()` contra Supabase bajo las políticas RLS activas, manteniendo coherencia inmediata en memoria.
- **Anti-XSS y Zero-UUID:** Toda interpolación dinámica pasa por `escapeHtml()` (`src/lib/html.ts`), y las vistas prohíben mostrar UUIDs crudos en texto visible, `title`, `aria-label`, `placeholder` o `<input>` visibles (`src/lib/zeroUuid.ts`).
- **Atajos de teclado:** `/` enfoca el campo de búsqueda activo de la vista actual; `Escape` cierra modales abiertos, menús desplegables de cabecera o limpia la búsqueda activa.

---

## 2. Patrones UI/UX Estandarizados (Fases 2–6)

### 2.1 Iconografía Minimalista de Rol y Estado (`healthCheck.ts` + `header.ts`)
- **Usuarios aprobados (`APPROVED`):** Se omiten etiquetas ruidosas de texto y se renderiza un símbolo minimalista a la izquierda del nombre:
  - `ADMIN`: `🛡️` | `WORKER`: `⚙️` | `AUDITOR`: `📋` | `CLIENT`: `🏢`.
- **Usuarios no aprobados:** El icono de rol se suprime estrictamente (`suppressRoleIcon: true`), mostrando únicamente el indicador de estado: `PENDING` (`⏳`) o `REJECTED` (`❌`).

### 2.2 Cabecera en 3 Bloques y Motor de Breadcrumbs (`header.ts` + `breadcrumb.ts` + `breadcrumbView.ts`)
- **Regla de Reseteo en Cabecera:** Todos los enlaces y elementos de los 3 bloques de la barra superior (`Auditorías`, `Certificación`, `Extra`) incluyen `data-nav-reset="true"`. Al hacer clic, `resetBreadcrumbToDomain()` limpia la pila jerárquica y sitúa al usuario en la raíz del dominio elegido.
- **Pila Interactiva y Truncamiento:**
  - `pushBreadcrumb()` evita duplicados retrocediendo de forma idempotente si el `id` o `entityId` ya existe en la ruta.
  - `popToBreadcrumb()` permite regresar instantáneamente a cualquier nivel padre desde la barra superior del lienzo.
  - `truncateBreadcrumbLabel()` recorta etiquetas superiores a **24 caracteres** añadiendo elipsis (`…`) y conservando el texto completo en `title` (tooltip).

### 2.3 Plantilla Universal List/Grid (`src/lib/universalTemplate.ts` + `src/views/universalTemplate.ts`)
Compartida por los directorios de catálogos, organizaciones, certificados, auditores y programación:
1. **Cabecera Semántica + Buscador en Vivo:** Título, subtítulo, conteo de coincidencias y entrada con atajo `/`.
2. **Conmutador de Presentación (`⊞ Cuadrícula | ☰ Lista`):** Cambio inmediato entre tarjetas relacionales y tabla densa.
3. **Barra Lateral de Facetas con Conteos:** Filtros laterales calculados en vivo (`calculateFacetCounts`, `buildFacetOptions`) por estatus, norma, esquema, sector IAF, riesgo o calificación.
4. **Ordenamiento Tipo Excel:** Encabezados ordenables en ciclo determinista `none → asc → desc → none` (`cycleSortDirection`, `sortItems` con `localeCompare('es', { numeric: true })` e indicadores `▲`/`▼`/`▲▼`).

### 2.4 Fichas de Detalle en 4 Zonas y Modal Forense (`detailTemplate.ts` + `auditLogModal.ts`)
1. **Zona 0 — Barra de Acción:** Botón de retorno y disparador **`🕒 Historial de Cambios`** en la esquina superior derecha (`data-action="open-changelog"`), controlado por `canViewAuditLogForEntity()`.
2. **Zona 1 — Banner Principal y Enlaces Padre-Hijo:** Nombre legible, insignia de estado y enlaces navegables hacia entidades padre (ej. Organización o Certificado) sin exposición de UUIDs.
3. **Zona 2 — Separador Visual.**
4. **Zona 3 — Atributos Directos y Edición Controlada:** Tarjetas de atributos y formularios en línea para roles autorizados (incluyendo contador `10–1000` caracteres para `certificado.alcance` y validación de RIF/NIF en organizaciones).
5. **Zona 4 — Pestañas Relacionales Especializadas (`multipage`):**
   - `Norma`: `Acreditación` y `Requisitos LTREE` (con árbol jerárquico e inspección de cláusula).
   - `Sector IAF`: `Sub-Sectores` (con nivel de riesgo `ALTO`/`MEDIO`/`BAJO`) y `Auditores`.
   - `Organización`: `Certificados` (con métrica estricta de certificados activos excluyendo `En Espera`, `Cancelado`, `Inactivo` y `Suspendido`).
   - `Certificado`: **5 pestañas** — `Sitios` (**Sitio 0** principal siempre primero y excluido del conteo de sucursales multisitio), `Procesos` (con etiquetas `Estratégico`, `Medular`, `De Apoyo`, `Otro`), `Turnos`, `No Aplicables` (con justificación obligatoria `>= 5` caracteres) y `Auditorías`.
   - `Auditor`: `Competencias` (con vigencia `Vigente` / `Por Vencer` / `Vencido`) e `Historial de Auditorías`.
   - `Programación`: **3 pestañas** — `Equipo Evaluador`, `Sedes y Muestreo` y `Matriz de Verificación Normativa`.
- **Modal Forense (`auditLogModal.ts`):** Consulta `public.audit_log` (y mutaciones de sesión), resuelve actores legibles mediante `resolveAuditActorDisplay()` (sin UUIDs) y renderiza diffs campo a campo (`old_data` vs. `new_data`).

---

## 3. Inventario de Módulos de Lógica Pura (`src/lib/` — 16 módulos)

| Módulo | Responsabilidades Principales |
| :--- | :--- |
| `supabase.ts` | Cliente singleton `@supabase/supabase-js` usando únicamente URL pública y Anon Key. |
| `html.ts` | Escape HTML anti-XSS (`escapeHtml`). |
| `healthCheck.ts` | Guardias RBAC (`evaluateAdminAccess`, `canAccessRoute`, `canModifyProfileStatus`, `canModifyProfileRole`), menús en 3 bloques (`getVisibleDomainMenus`), iconografía de identidad (`getUserIdentityDisplay`), salud DB y traducción de errores. |
| `accessControl.ts` | Aislamiento por rol para auditorías, hallazgos, certificados y organizaciones; control de escritura (`canEditAuditScheduleOrTeam`, `canMutateAuditExecution`) y acceso a `audit_log` (`canViewAuditLogForEntity`). |
| `searchControls.ts` | Normalización Unicode sin acentos, búsqueda multi-token (código, empresa, RIF, norma), filtros combinados, extracción de facetas y barras de cobertura ISO. |
| `activeCertificates.ts` | Conteo preciso de certificados activos (`countActiveCertificates`) excluyendo estatus inactivos/cancelados/suspendidos/en espera, validación de RIF/NIF (`validateRifFormat`) y filtrado de organizaciones. |
| `multisiteSampling.ts` | Convención Sitio 0 (`sortSitesWithPrincipalFirst`, `countMultisiteBranches`), validación de `alcance` (`validateAlcance`, 10–1000 chars), justificación de exclusiones (`validateJustificacionNoAplicable`, `>= 5` chars) y clasificación visual de procesos. |
| `competencyMatrix.ts` | Emparejamiento de competencias técnicas de auditores contra norma ISO, sector IAF y sub-sector (`isAuditorQualifiedForScope`), más evaluación de expiración de credenciales (`getCredentialValidityState`). |
| `auditDomain.ts` | Tipos base y utilidades estructurales compartidas del dominio Auditorías. |
| `auditExecution.ts` | Programación, generación de grilla de calendario, detección de conflictos de solapamiento de auditores (`detectAuditorConflicts`), ciclo de vida CAPA en 5 estados y motor de recomendación ISO/IEC 17021-1 Cláusulas 9.5/9.6 (`evaluateIso17021Recommendation`). |
| `drillDown.ts` | Lógica del explorador jerárquico en cascada, estadísticas y filtros de hallazgos, validación de planificación de auditorías y elegibilidad de emisión. |
| `extraDomain.ts` | Modelos, datos semilla y utilidades para normas ISO, organismos acreditadores, acreditaciones Norma-IAF, árbol `LTREE`, sectores/sub-sectores IAF, estatus, tipos y metodologías. |
| `breadcrumb.ts` | Pila inmutable de *breadcrumbs*, mapeo de etiquetas por dominio/subvista, retroceso (`pushBreadcrumb`, `popToBreadcrumb`), reseteo (`resetBreadcrumbToDomain`) y truncamiento a 24 caracteres (`truncateBreadcrumbLabel`). |
| `universalTemplate.ts` | Ordenamiento determinista (`cycleSortDirection`, `sortItems`) y cálculo de facetas (`calculateFacetCounts`, `buildFacetOptions`, `renderSortIndicator`). |
| `auditLog.ts` | Resolución de identidad de actores sin UUIDs (`resolveAuditActorDisplay`), formateo de fechas locales y cálculo de diferencias campo a campo (`computeFieldDiffs`). |
| `zeroUuid.ts` | Auditoría estática de cumplimiento Zero-UUID en texto visible y atributos accesibles HTML (`findExposedUuidsInHtml`, `assertZeroUuidExposure`), ignorando atributos internos `data-*`. |

---

## 4. Inventario de Vistas Modulares (`src/views/` — 25 módulos)

| Grupo Funcional | Vistas (`src/views/*.ts`) | Responsabilidad Principal |
| :--- | :--- | :--- |
| **Shell, Plantillas y Autenticación (8)** | `authView.ts`, `header.ts`, `breadcrumbView.ts`, `dashboardView.ts`, `searchControlsView.ts`, `universalTemplate.ts`, `detailTemplate.ts`, `auditLogModal.ts` | Login/Sign up/Quick Login + modal Reset DB; cabecera sticky en 3 bloques con `data-nav-reset="true"`; barra de *breadcrumbs*; dashboard con explorador de certificados; plantillas reutilizables de tabla/facetas y ficha en 4 zonas; modal forense `audit_log`. |
| **Consola Administrativa (2)** | `approvalsView.ts`, `databaseStatusView.ts` | Aprobación/rechazo y cambio de rol en vivo (`ADMIN`, solo lectura para `WORKER`), más diagnóstico en 5 comprobaciones en vivo contra Supabase. |
| **Dominio Auditorías (4)** | `auditoriasView.ts`, `programacionView.ts`, `calendarioView.ts`, `resultadoView.ts` | Conmutador de bloque; **Programación** (List/Grid, modal de planificación, ficha en 3 pestañas); **Calendario** (Mensual, Trimestral, Timeline Gantt, cajón de detalle y conflictos); **Resultado** (tablero Tabla/Kanban de hallazgos, flujo CAPA y motor de recomendación ISO 17021-1). |
| **Dominio Certificación y Drill-Down (5)** | `certificacionView.ts`, `organizacionView.ts`, `certificadoView.ts`, `auditorView.ts`, `drillDownView.ts` | **Organización** con conteo de certificados activos y edición de atributos; **Certificado** (tabla limpia sin barra de cobertura y ficha en 5 pestañas con Sitio 0 primero y editor de `alcance`); **Auditor** (directorio y matriz de competencias); cascada jerárquica **Drill-Down**. |
| **Dominio Extra — Catálogos (6)** | `extraView.ts`, `normaView.ts`, `sectorIafView.ts`, `estatusView.ts`, `tipoAuditoriaView.ts`, `metodologiaAuditoriaView.ts` | Vistas universales ordenables/facetadas y fichas en 4 zonas para normas ISO (acreditaciones + árbol `LTREE`), sectores y sub-sectores IAF, 8 estatus canónicos, 9 tipos de auditoría y 3 metodologías. |
