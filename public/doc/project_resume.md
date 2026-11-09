# Resumen del Proyecto: `programa_aud`

** Google AI Studio Public Link:** [programa_aud](https://ai.studio/apps/f5f27961-b10a-4b29-a8c7-6153e393aa1f)
**Repositorio GitHub:** [programa_aud](https://github.com/certificacionfn/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Base de Datos Supabase:**
- **Project URL:** `https://ufowtgmpaahyshdxlnlq.supabase.co`
- **Publishable Key:** `sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
- **Variables de Entorno:** Disponibles en `.env` y `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

---

## 1. Visión General del Proyecto

`programa_aud` es una plataforma integral orientada a la **gestión, planificación, asignación y seguimiento técnico de programas y planes de auditoría de certificación de sistemas de gestión**. Su diseño responde a los estándares internacionales de acreditación y evaluación de la conformidad, principalmente:

- **ISO 19011:2018:** Directrices para la auditoría de los sistemas de gestión.
- **ISO/IEC 17021-1:2015:** Requisitos para los organismos que realizan auditoría y certificación de sistemas de gestión.
- **Clasificación de Sectores IAF (International Accreditation Forum):** Asignación de competencias técnicas y códigos de alcance por sector productivo.

El sistema permite vincular de manera estricta y trazable a las organizaciones clientes, los certificados emitidos, las sedes/sitios auditados, los turnos operativos, los procesos empresariales, la cobertura exhaustiva de los requisitos normativos aplicables, el registro de hallazgos y desviaciones, y el cuadro de auditores calificados, bajo un modelo riguroso de gobernanza de datos y control de acceso basado en roles (RBAC).

---

## 2. Arquitectura de Almacenamiento y Base de Datos (Storage / Database)

La capa de persistencia se implementa sobre un motor relacional **PostgreSQL administrado mediante Supabase**, estructurado en dominios conceptuales normalizados y optimizados para consultas jerárquicas, auditoría inmutable e integridad referencial estricta.

### 2.1 Extensiones y Tipos Enumerados PostgreSQL (`creacion.sql`)
- `uuid-ossp`: Generación de identificadores únicos universales (UUID v4) como claves primarias no secuenciales y seguras.
- `ltree`: Soporte para rutas jerárquicas materializadas en la estructura de requisitos y cláusulas normativas (e.g., `4.1`, `4.1.2`, `8.5.1`).
- **Tipos Enumerados Personalizados (`ENUM`):**
  - `public.user_status`: Estados de aprobación de usuarios del sistema (`PENDING`, `APPROVED`, `REJECTED`).
  - `public.user_role`: Roles de acceso del sistema (`ADMIN`, `AUDITOR`, `USER`).
  - `public.tipo_hallazgo`: Clasificación estandarizada de hallazgos ISO (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`).

### 2.2 Modelo de Datos por Dominios (`public/supabase/queries/creacion.sql`)

#### Gestión de Perfiles y Autenticación
- `public.profiles`: Extensión de la tabla de usuarios de Supabase (`auth.users(id)`), conteniendo el nombre, rol (`user_role`) y estado de aprobación (`user_status`).
- `handle_new_user()`: Disparador en `auth.users` que auto-provisiona el perfil de usuario en estado `PENDING` con rol `USER` al registrarse en la plataforma.

#### Dominio 1: Catálogos Base y Competencias de Auditores
Centraliza los referenciales de certificación, sectores técnicos y la matriz de calificación del personal auditor:
- `norma`: Esquemas y normas certificables (ISO 9001, ISO 14001, ISO 45001, ISO/IEC 27001, etc.).
- `requisito`: Estructura jerárquica de cláusulas y requisitos normativos, vinculados recursivamente mediante `id_requisito_padre` y clasificados con `ruta_materializada` (`ltree`).
- `sector_iaf`: Catálogo oficial de sectores de acreditación IAF (e.g., Sector 14 Química y Plásticos, Sector 17 Metales, Sector 28 Construcción, Sector 33 TI).
- `estatus`: Estados del ciclo de vida de certificados y procesos (Vigente/Activo, Suspendido, En proceso, etc.).
- `tipo_auditoria`: Tipologías operativas (Inicial Etapa 1, Inicial Etapa 2, Vigilancia 1, Vigilancia 2, Recertificación, Extraordinaria).
- `metodologia_auditoria`: Modalidades de auditoría (Presencial in situ, Remota, Híbrida).
- `auditor`: Registro del personal evaluador.
- `norma_auditor`: Matriz de calificación por norma para cada auditor.
- `sector_iaf_auditor`: Matriz de competencia técnica por sector IAF que autoriza la asignación de un auditor a un sector productivo determinado.

#### Dominio 2: Organizaciones, Certificados, Sitios, Procesos y Turnos
Modela a la persona jurídica titular, su estructura física, productiva y temporal:
- `organizacion`: Entidad corporativa / empresa cliente titular de los servicios de certificación (`id`, `nombre`, `rif`, `direccion_fiscal`).
- `certificado`: Título de certificación emitido, vinculado formalmente a la empresa mediante `id_organizacion REFERENCES organizacion(id) ON DELETE RESTRICT`, relacionando norma base, estado, sector IAF, número único y bandera de multisitio.
- `sitio`: Sedes, plantas o ubicaciones físicas amparadas bajo el certificado, numeradas correlativamente por cliente (`unique_sitio_certificado`).
- `proceso`: Mapa de procesos auditables de la organización (e.g., Dirección, Fundición y Mecanizado, Control de Calidad, Ciberseguridad).
- `requisitos_por_proceso`: Matriz de correspondencia entre los procesos de la empresa y los requisitos normativos que les aplican.
- `requisitos_no_aplicables_certificado`: Registro de exclusiones o requisitos normativos declarados formalmente no aplicables y justificados en el alcance.
- `turno`: Horarios laborales de operación (hora de entrada y hora de salida).
- `turnos_por_sitio`: Asignación de turnos productivos vigentes por cada sede física.

#### Dominio 3: Planificación, Ejecución y Hallazgos de Auditorías
Estructura la agenda, el equipo auditor, el detalle de campo y las desviaciones detectadas:
- `auditoria`: Evento de auditoría programado para un certificado, con tipo, metodología, fecha programada y fecha de reprogramación si aplica.
- `equipo_auditor`: Asignación de auditores al evento de auditoría con especificación explícita de `rol_auditor` (e.g., Auditor Líder, Auditor de Equipo, Observador, Experto Técnico).
- `sitios_por_auditoria`: Selección de los sitios que serán inspeccionados durante el evento específico.
- `turnos_sitio_auditoria`: Turnos laborales que serán cubiertos durante la visita a cada sitio.
- `procesos_sitio_auditoria`: Plan detallado que cruza qué procesos serán evaluados en qué sitio y durante qué turno específico.
- `comentarios_por_auditoria`: Bitácora y notas de seguimiento técnico de la auditoría.
- `hallazgo`: Registro oficial de no conformidades y oportunidades de mejora ISO (`NC_MAYOR`, `NC_MENOR`, `OBSERVACION`, `OPORTUNIDAD_MEJORA`), vinculando la auditoría, el requisito normativo incumplido, el proceso evaluado, la descripción del hallazgo, la evidencia objetiva y la bandera de cierre (`cerrado`).

#### Registro de Auditoría Inmutable (Audit Log)
- `public.audit_log`: Historial inmutable de auditoría para cambios en entidades críticas (`id`, `table_name`, `operation`, `record_id`, `old_data`, `new_data`, `performed_by`, `performed_at`).
- `audit_trigger_func()`: Función disparadora plpgsql que captura automáticamente inserciones, actualizaciones y eliminaciones en `organizacion`, `certificado` y `auditoria`.

#### Automatización con Triggers
Se implementa la función plpgsql `update_updated_at_column()` vinculada a disparadores (`BEFORE UPDATE`) en las tablas `organizacion`, `norma`, `requisito`, `certificado`, `sitio`, `proceso`, `auditoria` y `hallazgo` para mantener la trazabilidad temporal automática de modificaciones.

---

### 2.3 Lógica Avanzada: Cálculo de Cobertura Normativa con LTREE (`cobertura_normativa.sql`)

El sistema cuenta con un motor optimizado en PostgreSQL para evaluar la cobertura de requisitos en el árbol jerárquico del estándar:
```sql
public.evaluar_cobertura_certificado(p_id_certificado UUID)
RETURNS TABLE (id_requisito UUID, codigo VARCHAR, ruta_materializada LTREE, estado_cobertura TEXT)

public.cobertura_normativa_certificado(p_id_certificado UUID)
RETURNS TABLE (id_requisito UUID, codigo VARCHAR, estado_cobertura TEXT)
```
- **Aprovechamiento de `ltree`:** Utiliza el operador ancestro-descendiente `@>` para propagar automáticamente la cobertura hacia los requisitos padre e identificar de forma instantánea qué ramas normativas han sido evaluadas en los procesos del cliente o declaradas no aplicables.
- **Clasificación:** Devuelve para cada requisito de la norma si se encuentra `CUBIERTO`, `NO_APLICABLE` o `PENDIENTE`.
- **Seguridad:** Ambas funciones ejecutan con `SECURITY DEFINER SET search_path = public, pg_temp` para acceso seguro y hermético.

---

### 2.4 Índices de Optimización (`indices_optimizacion.sql`)

Para garantizar tiempos de respuesta en milisegundos aun con grandes volúmenes de datos:
1. **Índices Jerárquicos y Árbol de Requisitos:**
   - `idx_requisito_ruta_gist`: Índice GiST sobre `requisito(ruta_materializada)` para búsquedas instantáneas en subárboles de requisitos con operadores `ltree`.
   - `idx_requisito_padre`: Búsquedas en relaciones directas padre-hijo.
   - `idx_requisito_norma_padre`: Índice compuesto para filtrado por norma y requisito padre.
2. **Índices de Búsqueda y Localización:**
   - `idx_organizacion_nombre`: Acelera la búsqueda y filtrado por razón social de la empresa cliente.
   - `idx_organizacion_rif`: Índice parcial condicional (`WHERE rif IS NOT NULL`) para validaciones unívocas tributarias.
   - `idx_certificado_numero`: Localización unívoca de expedientes por código oficial.
   - `idx_certificado_organizacion`: Optimiza la resolución de la clave foránea entre certificado y organización.
   - `idx_certificado_norma_iaf`: Búsqueda compuesta por norma y sector IAF.
3. **Mapeos Relacionales y Tablas Intermedias:**
   - `idx_norma_auditor_compuesta`: Validación inmediata de competencia técnica del auditor.
   - `idx_sector_iaf_auditor_compuesta`: Verificación de cualificación técnica por sector IAF.
   - `idx_req_proceso_lookup`: Cruce ágil entre requisitos y procesos.
   - `idx_equipo_auditor_lookup`: Asignaciones de personal en auditorías.
   - `idx_sitios_auditoria_compuesto`, `idx_proc_sitio_aud_compuesto`, `idx_procesos_sitio_auditoria_compuesto`: Reconstrucción veloz del plan de auditoría por sede, proceso y turno.
   - `idx_auditoria_fecha`: Aceleración de cronogramas y calendarios de planificación.
   - `idx_hallazgo_auditoria`: Filtrado de hallazgos por auditoría y tipología.
4. **Log de Auditoría:**
   - `idx_audit_log_record`: Búsqueda ultrarrápida del historial de cambios por nombre de tabla y UUID del registro.

---

### 2.5 Seguridad y Permisos: Doble Capa DCL + RLS (`rls.sql`)

Para el correcto funcionamiento de PostgREST en Supabase, el sistema opera bajo una **arquitectura de seguridad en dos fases**:

#### Fase 1: Asignación de Privilegios Base de PostgreSQL (DCL)
PostgreSQL evalúa primero si el rol de conexión (`authenticated` o `anon`) posee privilegios de tabla. Sin estos `GRANT`, el motor rechaza la petición con código `42501 permission denied for table <tabla>` antes de examinar RLS:
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;
```

#### Fase 2: Políticas Granulares de Fila (Row Level Security - RLS)
Una vez otorgado el privilegio base, las políticas en `rls.sql` gobiernan el acceso registro por registro:

- **Funciones Auxiliares `SECURITY DEFINER`:**
  - `public.get_auth_user_role()`: Retorna el rol del usuario autenticado si su estado es `APPROVED`.
  - `public.is_approved_admin()`: Valida si el usuario es `ADMIN` y está `APPROVED`.
  - `public.is_approved_auditor()`: Valida si el usuario es `ADMIN` o `AUDITOR` y está `APPROVED`.
  - `public.is_approved_user()`: Valida si el usuario posee estado `APPROVED`.

- **Políticas por Entidad:**
  - **`profiles`:** Cada usuario puede ver su propio registro; administradores aprobados pueden ver y actualizar todos.
  - **`organizacion`, `certificado`, `auditoria`:** Lectura para cualquier usuario autenticado en estado `APPROVED`; mutaciones (`INSERT`, `UPDATE`, `DELETE`) reservadas para `ADMIN` y `AUDITOR`.
  - **`hallazgo`:** Lectura para usuarios aprobados; registro y edición contextual para miembros del equipo auditor asignado a esa auditoría específica o administradores.
  - **`audit_log`:** Lectura exclusiva para `ADMIN` aprobado; inmutable contra modificaciones externas.
  - **Catálogos Base:** Lectura abierta tanto para usuarios autenticados como anónimos.

---

### 2.6 Conjunto de Datos de Prueba Idempotente (`datos_prueba.sql`)

El archivo `public/supabase/queries/datos_prueba.sql` proporciona un conjunto de datos realistas con UUIDs deterministas e inserciones `ON CONFLICT DO NOTHING / DO UPDATE`:
- **Catálogos:** Estatus (`ACTIVO`, `EN_PROCESO`, `PLANIFICADA`, etc.), Tipos de Auditoría (`ETAPA_1`, `ETAPA_2`, `RECERTIFICACION`), Metodologías (`PRESENCIAL`, `REMOTA`, `HIBRIDA`), Sectores IAF (14, 17, 28, 33, 35) y Normas (ISO 9001, ISO 14001, ISO 45001, ISO/IEC 27001).
- **Estructura LTREE:** Cláusulas jerárquicas completas para ISO 9001:2015 (Cláusulas 4, 4.1, 4.2, 5, 5.1, 6, 7, 8, 8.1, 8.5, 9, 9.2, 10).
- **Organizaciones:**
  - `Iberometal Componentes S.A.` (RIF: `J-30492817-0`, Valencia, Carabobo)
  - `CyberCloud Solutions S.L.` (RIF: `J-40819234-5`, Caracas, Miranda)
  - `AgroIndustrias del Centro C.A.` (RIF: `J-29837461-2`, Maracay, Aragua)
- **Certificados y Operaciones:** Certificados vinculados (`FN-QMS-2024-001`, `FN-ISMS-2024-002`), plantas fabriles en Valencia y Puerto Cabello, procesos productivos, mapeo de requisitos por proceso, turnos diurnos y vespertinos, auditorías planificadas, equipos auditores asignados y hallazgos registrados.

---

### 2.7 Usuarios de Prueba (`usuarios.sql`)

Permite la creación controlada de tres identidades para validación de roles en `auth.users` y `public.profiles` (con contraseña `Password123*`):
1. `admin@fondonorma.test` (Rol: `ADMIN`, Estado: `APPROVED`, UID: `11111111-1111-1111-1111-111111111111`)
2. `auditor@fondonorma.test` (Rol: `AUDITOR`, Estado: `APPROVED`, UID: `22222222-2222-2222-2222-222222222222`)
3. `user@fondonorma.test` (Rol: `USER`, Estado: `APPROVED`, UID: `33333333-3333-3333-3333-333333333333`)

---

## 3. Arquitectura del Backend

El backend se apoya en los servicios integrados de la infraestructura de Supabase:

1. **API PostgREST Automática:**
   - Supabase expone automáticamente una API RESTful de alto rendimiento sobre el esquema `public`.
   - Permite consultas estructuradas, paginación, filtros relacionales, conteo exacto (`Prefer: count=exact`) y resolución de relaciones foráneas (e.g., `organizacion` ↔ `certificado` ↔ `auditoria` ↔ `hallazgo`).
   - Endpoint base: `https://ufowtgmpaahyshdxlnlq.supabase.co/rest/v1/`
   
2. **Servicio de Autenticación (GoTrue v2):**
   - Gestión de identidades, sesiones JWT y control de acceso basado en tokens de autorización.
   - Endpoint de salud y diagnóstico: `https://ufowtgmpaahyshdxlnlq.supabase.co/auth/v1/health`

3. **Mecanismos de Autenticación y Autorización en API:**
   - Envío de credenciales a través de encabezados HTTP estándar:
     - `apikey: sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
     - `Authorization: Bearer <jwt_token_or_publishable_key>`
   - Evaluación nativa de RLS en cada petición HTTP contra el contexto del usuario autenticado (`auth.uid()`).

4. **Remote Procedure Calls (RPC):**
   - Invocación remota de procedimientos almacenados como `cobertura_normativa_certificado` vía `POST /rest/v1/rpc/<function_name>`.

---

## 4. Arquitectura del Frontend

El frontend está desarrollado bajo el estándar de **Single-Page Application (SPA)** de arquitectura minimalista, ligera y sin dependencias superfluas:

### 4.1 Tecnologías Utilizadas
- **HTML5 Semántico:** Estructura limpia y accesible.
- **Tailwind CSS (vía CDN):** Sistema de utilidades para un diseño moderno, responsivo y ordenado.
- **Supabase JavaScript Client SDK (v2 vía CDN):** Consumo oficial de la API de Supabase (`@supabase/supabase-js`) con tipado y manejo asíncrono nativo (`async/await`).
- **Integración con Variables de Entorno (`.env`):** Lectura dinámica de `import.meta.env.VITE_SUPABASE_URL` y `import.meta.env.VITE_SUPABASE_ANON_KEY` con fallback automático.
- **Servidor de Desarrollo / Distribución:** Vite en puerto `3000` (host `0.0.0.0`).

### 4.2 Módulos y Capacidades del Frontend
1. **Indicador de Conexión en Tiempo Real:**
   - Comprobación automática de enlace al cargar el documento (`DOMContentLoaded`).
   - Muestra un badge visual de estado y mide la latencia de ida y vuelta (RTT) en milisegundos.
2. **Panel de Métricas y Diagnóstico:**
   - Métricas en vivo de latencia de red, estado PostgREST, GoTrue Auth API, función RPC de Cobertura LTREE y conteo de entidades accesibles.
3. **Explorador y Consultor de Tablas:**
   - Botón maestro **"Test Connection & Fetch Tables"** para auditar la conectividad global y el acceso al esquema.
   - Accesos directos a todas las tablas del modelo: `organizacion`, `certificado`, `auditoria`, `hallazgo`, `sitio`, `proceso`, `norma`, `requisito`, `auditor`, `profiles`, `audit_log`.
   - Ejecutor de consultas con límite ajustable y alternancia entre **Vista de Tabla HTML** y **Vista JSON**.
4. **Diagnóstico Activo de Permisos DCL (Error 42501):**
   - Si una consulta falla por falta de permisos base en PostgreSQL, la app despliega un banner de diagnóstico con la solución exacta y el botón de copiado del script `GRANT`.
5. **Modal "SQL Scripts & DCL Fixes Hub":**
   - Ventana modal integrada para consultar y copiar con un clic:
     1. El script de solución de permisos DCL (`GRANT USAGE...`, `GRANT ALL...`).
     2. El semillero completo de datos de prueba (`datos_prueba.sql`).
     3. El script de creación de usuarios de prueba (`usuarios.sql`).
6. **Simulador de Autenticación / RBAC:**
   - Selector rápido para inicio de sesión con cuentas de prueba (`Admin`, `Auditor`, `User`).
   - Inspección automática de rol y estado en `public.profiles`.
7. **Evaluador RPC de Cobertura Normativa:**
   - Herramienta para probar la ejecución de la función `cobertura_normativa_certificado` contra un ID de certificado.
8. **Terminal de Logs de Actividad en Vivo:**
   - Consola oscura integrada que documenta cronológicamente cada petición HTTP, código de respuesta, tiempo de ejecución, advertencias y mensajes de error detallados provistos por el backend.

---

## 5. Estructura de Archivos del Proyecto

```text
├── .env                                     # Configuración de variables de entorno (URL y Key de Supabase)
├── .env.example                             # Plantilla de ejemplo de variables de entorno
├── .gitignore
├── README.md
├── index.html                               # Aplicación frontend SPA (HTML5 + Tailwind + Supabase SDK)
├── metadata.json                            # Configuración del proyecto y metadatos
├── package.json                             # Scripts de ejecución (dev, build, lint, preview)
├── tsconfig.json                            # Configuración de TypeScript
├── vite.config.ts                           # Configuración del servidor Vite (0.0.0.0:3000)
└── public/
    ├── doc/
    │   └── project_resume.md                # Documento maestro de arquitectura y gobernanza
    └── supabase/
        └── queries/
            ├── creacion.sql                 # DDL de tablas, perfiles, hallazgos, audit log y triggers
            ├── cobertura_normativa.sql      # Motor LTREE recursivo de evaluación de cobertura ISO
            ├── indices_optimizacion.sql     # Índices B-tree y GiST (ltree) para alto rendimiento
            ├── rls.sql                      # DCL base (GRANTs) y políticas de seguridad granular RBAC
            ├── datos_prueba.sql             # Semillero con datos de prueba realistas para todos los dominios
            └── usuarios.sql                 # Semillero y pruebas de usuarios Auth & Profiles (ADMIN, AUDITOR, USER)
```

---

## 6. Sincronización y Referencias

- **Repositorio Remoto Oficial:** `https://github.com/certificacionfn/programa_aud`
- **Proyecto Supabase Vinculado:** `ufowtgmpaahyshdxlnlq`
- **Flujo de Despliegue en Supabase SQL Editor:**
  1. Ejecutar `creacion.sql` (creación de tipos, tablas, triggers y audit log).
  2. Ejecutar `indices_optimizacion.sql` (índices B-tree y GiST).
  3. Ejecutar `cobertura_normativa.sql` (funciones y procedimiento RPC LTREE).
  4. Ejecutar `rls.sql` (privilegios DCL base y políticas de seguridad RLS).
  5. Ejecutar `usuarios.sql` (usuarios de prueba con roles y perfiles aprobados).
  6. Ejecutar `datos_prueba.sql` (organizaciones, certificados, sitios, procesos, auditorías y hallazgos).
