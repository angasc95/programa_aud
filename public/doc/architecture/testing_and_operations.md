# Pruebas, Operación y Despliegue (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Resume la suite completa de verificación automatizada (`node:test` vía `tsx`), verificación estática estricta, compilación modular con Vite, pruebas responsivas en navegador real y operación en producción.

---

## 1. Suite de Pruebas Unitarias (`node:test` + `tsx`)

Todas las reglas de negocio, validaciones ISO/IEC 17021-1, políticas RBAC en frontend, sanitización Zero-UUID y plantillas de vistas se verifican mediante **16 suites deterministas (`src/lib/*.test.ts`)** ejecutadas con el corredor nativo `node:test`:

| Archivo de Pruebas | Módulo Evaluado | Cobertura Principal |
| :--- | :--- | :--- |
| `src/lib/accessControl.test.ts` | `src/lib/accessControl.ts`, vistas | Matrices RBAC (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`), alcance estricto en auditorías asignadas, mutación de hallazgos y acceso a `audit_log`. |
| `src/lib/activeCertificates.test.ts` | `src/lib/activeCertificates.ts`, `organizacionView.ts` | Conteo de certificados activos por organización y globalmente, exclusión de estatus inactivos/cancelados/suspendidos/en espera y alias de clave de organización. |
| `src/lib/auditDomain.test.ts` | `src/lib/auditDomain.ts` | Reglas de negocio base del dominio Auditorías, estados operativos y metadatos iniciales. |
| `src/lib/auditExecution.test.ts` | `src/lib/auditExecution.ts`, vistas de auditoría | Motor de recomendación ISO/IEC 17021-1 Cláusula 9.5/9.6 (bloqueo por `NC_MAYOR` abierta o `NC_MENOR` sin plan de acción), validación de firma electrónica, ciclo CAPA y detección de solapamiento de auditores. |
| `src/lib/auditLog.test.ts` | `src/lib/auditLog.ts` | Resolución de nombres legibles de actores, formateo cronológico de cambios `JSONB` y cumplimiento Zero-UUID en bitácora forense. |
| `src/lib/auditPhase5Views.test.ts` | `programacionView.ts`, `calendarioView.ts`, `resultadoView.ts`, `auditoriasView.ts` | Integración de vistas de Fase 5, aislamiento de roles en renderizado y presencia de controles clave. |
| `src/lib/breadcrumb.test.ts` | `src/lib/breadcrumb.ts`, `breadcrumbView.ts`, `header.ts` | Transiciones de pila de *breadcrumbs*, retroceso por `entityId`, truncamiento exacto a 24 caracteres con elipsis (`…`) y verificación de atributos `data-nav-reset="true"` en la cabecera global. |
| `src/lib/competencyMatrix.test.ts` | `src/lib/competencyMatrix.ts` | Emparejamiento de competencias técnicas de auditores (`norma` + `sector_iaf`), manejo de certificaciones vencidas frente a vigentes y coerción de identificadores. |
| `src/lib/drillDown.test.ts` | `src/lib/drillDown.ts` | Modalidades ISO, estadísticas y filtros de hallazgos, validación de planificación de auditorías y elegibilidad de emisión de certificados. |
| `src/lib/extraDomain.test.ts` | `src/lib/extraDomain.ts`, vistas de Dominio Extra | Catálogos maestros (`norma`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`), acreditaciones y renderizado de vistas Extra. |
| `src/lib/healthCheck.test.ts` | `src/lib/healthCheck.ts` | Guardias RBAC de rutas y administración, menús por rol/estado, protección contra auto-revocación de administradores, métricas de salud DB y traducción de errores. |
| `src/lib/multisiteSampling.test.ts` | `src/lib/multisiteSampling.ts` | Ordenamiento multisitio garantizando Sede 0 principal al inicio, conteo de sedes sucursales y validación estricta de justificaciones de no aplicabilidad (`validateJustificacionNoAplicable`, umbral mínimo de 5 caracteres). |
| `src/lib/phase62UiIntegrity.test.ts` | Vistas de Fases 4–6.2 | Verificación transversal de integridad UI, accesibilidad, ausencia de texto roto y exposición Zero-UUID en todas las vistas renderizadas. |
| `src/lib/searchControls.test.ts` | `src/lib/searchControls.ts` | Normalización Unicode sin acentos, búsqueda multi-token (código, empresa, RIF, norma), filtros combinados, extracción de facetas y cobertura visual. |
| `src/lib/universalTemplate.test.ts` | `src/lib/universalTemplate.ts` | Ciclos de ordenamiento (`none → asc → desc`), ordenamiento con locale español, cálculo de conteos para facetas y construcción de opciones. |
| `src/lib/zeroUuid.test.ts` | `src/lib/zeroUuid.ts` | Detección de UUIDs expuestos en texto visible HTML, atributos `title`/`aria-label`/`placeholder` e inputs visibles, ignorando atributos internos `data-*`. |

### Comandos de Verificación

```bash
# Ejecutar todas las suites unitarias (16 archivos de prueba)
npm test
# Equivalente directo:
npx tsx --test src/lib/*.test.ts

# Verificación estricta de tipos TypeScript (tsc --noEmit, zero any)
npm run lint

# Compilación de producción optimizada con Vite (genera dist/)
npm run build
```

> **Notas técnicas:**
> - `tsconfig.json` aplica `"strict": true`, `"noEmit": true` y excluye `src/**/*.test.ts` del chequeo de cliente.
> - `vite.config.ts` configura `build.rollupOptions.output.manualChunks` separando `supabase`, `domain-lib`, `views-audit`, `views-domains`, `views-shell` y el entrypoint `index`, manteniendo cada chunk por debajo de `500 kB` sin advertencias de empaquetado.
> - Las pruebas responsivas con Chromium verifican ausencia de desbordamiento horizontal (`scrollWidth <= innerWidth`) en `375px` (móvil), `768px` (tableta), `1440px` (escritorio) y `1920px` (Full HD) en las vistas de Autenticación, Panel/Explorador, Organizaciones, Detalle de Certificado, Auditorías (Programación, Calendario Mensual/Gantt, Resultado), Dominio Extra y Consola Admin.

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

| Rol | Email | Estado Inicial | Alcance Principal |
| :--- | :--- | :---: | :--- |
| `ADMIN` | `admin@fondonorma.test` | `APPROVED` | Control total, aprobación/cambio de rol de usuarios, catálogos, Reset DB y `Database Status`. |
| `WORKER` | `worker@fondonorma.test` | `APPROVED` | Gestión operativa completa de organizaciones, certificados, sitios, procesos, turnos y planificación de auditorías. |
| `AUDITOR` | `auditor@fondonorma.test` | `APPROVED` | Lectura de alcance asignado, ejecución de auditorías asignadas y registro/cierre de hallazgos. |
| `CLIENT` | `client@fondonorma.test` | `APPROVED` | Lectura acotada exclusivamente a organizaciones con solicitud `APPROVED` en `client_organization_access`. |

---

## 4. Flujo de Ejecución y Despliegue en Producción

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
