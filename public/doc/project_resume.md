# Resumen del Proyecto: `programa_aud`

**Repositorio GitHub:** [https://github.com/certificacionfn/programa_aud](https://github.com/certificacionfn/programa_aud)  
**Organización / Coordinación:** Certificación FN (`coord.operativacertificacionfn@gmail.com`)  
**Base de Datos Supabase:**
- **Project URL:** `https://ufowtgmpaahyshdxlnlq.supabase.co`
- **Publishable Key:** `sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`

---

## 1. Visión General del Proyecto

`programa_aud` es una plataforma integral orientada a la **gestión, planificación, asignación y seguimiento técnico de programas y planes de auditoría de certificación de sistemas de gestión**. Su diseño responde a los estándares internacionales de acreditación y evaluación de la conformidad, principalmente:

- **ISO 19011:2018:** Directrices para la auditoría de los sistemas de gestión.
- **ISO/IEC 17021-1:2015:** Requisitos para los organismos que realizan auditoría y certificación de sistemas de gestión.
- **Clasificación de Sectores IAF (International Accreditation Forum):** Asignación de competencias técnicas y códigos de alcance por sector productivo.

El sistema permite vincular de manera estricta y trazable los certificados emitidos, las sedes/sitios auditados, los turnos operativos, los procesos empresariales y la cobertura exhaustiva de los requisitos normativos aplicables frente al cuadro de auditores calificados.

---

## 2. Arquitectura de Almacenamiento y Base de Datos (Storage / Database)

La capa de persistencia se implementa sobre un motor relacional **PostgreSQL administrado mediante Supabase**, estructurado en tres dominios conceptuales normalizados y optimizados para consultas jerárquicas e integridad referencial.

### 2.1 Extensiones PostgreSQL
- `uuid-ossp`: Generación de identificadores únicos universales (UUID v4) como claves primarias no secuenciales y seguras.
- `ltree`: Soporte para rutas jerárquicas materializadas en la estructura de requisitos y cláusulas normativas (e.g., `4.1`, `4.1.2`, `8.5.1`).

### 2.2 Modelo de Datos por Dominios (`public/supabase/queries/creacion.sql`)

#### Dominio 1: Catálogos Base y Competencias de Auditores
Centraliza los referenciales de certificación, sectores técnicos y la matriz de calificación del personal auditor:
- `norma`: Esquemas y normas certificables (ISO 9001, ISO 14001, ISO 45001, etc.).
- `requisito`: Estructura jerárquica de cláusulas y requisitos normativos, vinculados recursivamente mediante `id_requisito_padre` y clasificados con `ruta_materializada` (`ltree`).
- `sector_iaf`: Catálogo oficial de sectores de acreditación IAF (e.g., Sector 14 Química, Sector 17 Metales, Sector 28 Construcción, Sector 33 TI).
- `estatus`: Estados del ciclo de vida de certificados y procesos (Vigente, Suspendido, En proceso, etc.).
- `tipo_auditoria`: Tipologías operativas (Inicial Etapa 1, Inicial Etapa 2, Vigilancia 1, Vigilancia 2, Recertificación, Extraordinaria).
- `metodologia_auditoria`: Modalidades de auditoría (Presencial in situ, Remota, Híbrida).
- `auditor`: Registro del personal evaluador.
- `norma_auditor`: Tabla de relación muchos-a-muchos que valida en qué normas está calificado cada auditor.
- `sector_iaf_auditor`: Matriz de competencia técnica por sector IAF que autoriza la asignación de un auditor a un sector productivo determinado.

#### Dominio 2: Certificados, Sitios, Procesos y Turnos
Modela la entidad auditada, su estructura física, productiva y temporal:
- `certificado`: Datos de la empresa titular, número único de certificado, norma base, sector IAF, estado y bandera de multisitio (`multisitio BOOLEAN`).
- `sitio`: Sedes, plantas o ubicaciones físicas amparadas bajo el certificado, numeradas correlativamente por cliente.
- `proceso`: Mapa de procesos auditables de la organización (e.g., Compras, Operaciones, Mantenimiento, Dirección).
- `requisitos_por_proceso`: Matriz de correspondencia entre los procesos de la empresa y los requisitos normativos que les aplican.
- `requisitos_no_aplicables_certificado`: Registro de exclusiones o requisitos normativos declarados formalmente no aplicables y justificados en el alcance.
- `turno`: Horarios laborales de operación (hora de entrada y hora de salida).
- `turnos_por_sitio`: Asignación de turnos productivos vigentes por cada sede física.

#### Dominio 3: Planificación y Ejecución de Auditorías
Estructura la agenda, el equipo auditor y el detalle de campo:
- `auditoria`: Evento de auditoría programado para un certificado, con tipo, metodología, fecha programada y fecha de reprogramación si aplica.
- `equipo_auditor`: Asignación de auditores (Líder, Equipo, Expertos Técnicos) al evento de auditoría.
- `sitios_por_auditoria`: Selección de los sitios que serán inspeccionados durante el evento específico.
- `turnos_sitio_auditoria`: Turnos laborales que serán cubiertos durante la visita a cada sitio (indispensable para verificar turnos nocturnos o especiales).
- `procesos_sitio_auditoria`: Plan detallado que cruza qué procesos serán evaluados en qué sitio y durante qué turno específico.
- `comentarios_por_auditoria`: Bitácora y notas de seguimiento técnico de la auditoría.

#### Automatización con Triggers
Se implementa la función plpgsql `update_updated_at_column()` vinculada a disparadores (`BEFORE UPDATE`) en las tablas `norma`, `requisito`, `certificado`, `sitio`, `proceso` y `auditoria` para mantener la trazabilidad temporal automática.

### 2.3 Lógica Avanzada: Cálculo de Cobertura Normativa (`cobertura_normativa.sql`)
Se dispone de una función SQL almacenada recursiva:
```sql
cobertura_normativa_certificado(p_id_certificado UUID)
RETURNS TABLE (id_requisito UUID, codigo VARCHAR(30), estado_cobertura TEXT)
```
Esta función recorre recursivamente el árbol de requisitos cubiertos por los procesos y los requisitos declarados no aplicables, clasificando cada requisito del estándar evaluado en:
- `CUBIERTO`: Requisito auditado a través de uno o más procesos.
- `NO_APLICABLE`: Requisito formalmente excluido.
- `PENDIENTE`: Requisito de la norma que aún no cuenta con asignación a procesos o justificación de no aplicabilidad.

### 2.4 Índices de Optimización (`indices_optimizacion.sql`)
Para garantizar tiempos de respuesta en milisegundos aun con grandes volúmenes de datos:
- `idx_requisito_ruta_gist`: Índice GiST sobre `requisito(ruta_materializada)` para búsquedas instantáneas en subárboles de requisitos con operadores `ltree`.
- `idx_requisito_padre`: Búsquedas rápidas en relaciones jerárquicas padre-hijo.
- `idx_certificado_numero` y `idx_certificado_norma_iaf`: Filtrado veloz de expedientes por código y taxonomía.
- `idx_norma_auditor_compuesta` y `idx_sector_iaf_auditor_compuesta`: Validación inmediata de competencia técnica del auditor.
- `idx_procesos_sitio_auditoria_compuesto` y `idx_auditoria_fecha`: Aceleración de cronogramas y calendarios operativos.

### 2.5 Seguridad y Políticas RLS (`rls.sql`)
La base de datos cuenta con **Row Level Security (RLS)** activado en entidades clave:
- `certificado`, `auditoria`, `auditor`: Políticas `SELECT` abiertas que permiten la lectura general para reporting y verificación de programas.
- `auditoria`: Política de mutaciones (`INSERT`, `UPDATE`, `DELETE`) restringida exclusivamente a usuarios autenticados (`TO authenticated`).

---

## 3. Arquitectura del Backend

El backend se apoya en los servicios integrados de la infraestructura de Supabase:

1. **API PostgREST Automática:**
   - Supabase expone automáticamente una API RESTful de alto rendimiento sobre el esquema `public`.
   - Permite consultas estructuradas, paginación, filtros relacionales, conteo exacto (`Prefer: count=exact`) y resolución de relaciones foráneas mediante sintaxis declarativa.
   - Endpoint base: `https://ufowtgmpaahyshdxlnlq.supabase.co/rest/v1/`
   
2. **Servicio de Autenticación (GoTrue v2):**
   - Gestión de identidades, sesiones JWT y control de acceso basado en tokens de autorización.
   - Endpoint de salud y diagnóstico: `https://ufowtgmpaahyshdxlnlq.supabase.co/auth/v1/health`

3. **Mecanismos de Autenticación y Autorización en API:**
   - Envío de credenciales a través de encabezados HTTP estándar:
     - `apikey: sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
     - `Authorization: Bearer sb_publishable_p8Gu4e4nS2DgPG-BqS6vAw_V_5owfv4`
   - Validación nativa de RLS en cada petición HTTP antes de ejecutar cualquier transacción en PostgreSQL.

---

## 4. Arquitectura del Frontend

El frontend está desarrollado bajo el estándar de **Single-Page Application (SPA)** de arquitectura minimalista, ligera y sin dependencias superfluas:

### 4.1 Tecnologías Utilizadas
- **HTML5 Semántico:** Estructura limpia y accesible.
- **Tailwind CSS (vía CDN):** Sistema de utilidades para un diseño moderno, responsivo y ordenado con paleta de colores corporativa (Slate, Emerald, Amber, Rose).
- **Supabase JavaScript Client SDK (v2 vía CDN):** Consumo oficial de la API de Supabase (`@supabase/supabase-js`) con tipado y manejo asíncrono nativo (`async/await`).
- **Servidor de Desarrollo / Distribución:** Vite en puerto `3000` (host `0.0.0.0`), permitiendo arranque instantáneo y despliegue estático.

### 4.2 Módulos y Capacidades del Frontend
1. **Indicador de Conexión en Tiempo Real:**
   - Ejecuta una comprobación automática de enlace al cargar el documento (`DOMContentLoaded`).
   - Muestra un badge visual de estado (*Testing...*, *Connected 200 OK*, *Connection Failed*) y mide la latencia de ida y vuelta (RTT) en milisegundos.
2. **Panel de Métricas y Diagnóstico:**
   - Métricas en vivo de latencia de red.
   - Estado del servicio PostgREST.
   - Estado del motor de autenticación GoTrue.
   - Contador y validación de tablas accesibles en el esquema.
3. **Explorador y Consultor de Tablas:**
   - Botón maestro **"Test Connection & Fetch Tables"** para auditar la conectividad global y el acceso al esquema.
   - Accesos directos a tablas primarias (`auditoria`, `auditor`, `norma`, `proceso`, `certificado`).
   - Selector dinámico de límite de filas (`limit`).
   - Alternancia de visualización entre **Vista de Tabla HTML** estructurada y **Vista JSON** con resaltado para inspección técnica detallada.
4. **Terminal de Logs de Actividad en Vivo:**
   - Consola oscura integrada que documenta cronológicamente cada petición HTTP, código de respuesta, tiempo de ejecución, advertencias y mensajes de error detallados provistos por el backend.

---

## 5. Estructura de Archivos del Proyecto

```text
├── .gitignore
├── README.md
├── index.html                               # Aplicación frontend SPA (HTML5 + Tailwind + Supabase SDK)
├── metadata.json                            # Configuración del proyecto y metadatos
├── package.json                             # Scripts de ejecución (dev, build, lint, preview)
├── tsconfig.json                            # Configuración de compilación
├── vite.config.ts                           # Configuración del servidor Vite (0.0.0.0:3000)
└── public/
    ├── doc/
    │   └── project_resume.md                # Este documento de arquitectura y resumen técnico
    └── supabase/
        └── queries/
            ├── creacion.sql                 # DDL de tablas, relaciones, catálogos y triggers
            ├── cobertura_normativa.sql      # Procedimiento almacenado recursivo de cobertura ISO
            ├── indices_optimizacion.sql     # Índices B-tree y GiST (ltree) para alto rendimiento
            └── rls.sql                      # Políticas de seguridad a nivel de fila (Row Level Security)
```

---

## 6. Sincronización y Referencias

- **Repositorio Remoto Oficial:** `https://github.com/certificacionfn/programa_aud`
- **Proyecto Supabase Vinculado:** `ufowtgmpaahyshdxlnlq`
- **Esquema de Consultas:** Todo cambio en la estructura de base de datos se mantiene versionado bajo la ruta `public/supabase/queries/` asegurando paridad exacta entre el código fuente y el entorno de base de datos en la nube.
