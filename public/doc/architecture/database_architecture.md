# Arquitectura de Base de Datos y Motor Normativo (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Detalla la capa de persistencia en **PostgreSQL (Supabase)** implementada en `public/supabase/queries/` (`00_delete_tables.sql` a `06_datos_prueba.sql`), incorporando la arquitectura de retención **Soft-Delete**, bloqueo de borrado físico, guardias de dependencias y protección anti-escalamiento RBAC.

---

## 1. Secuencia de Despliegue SQL

Los scripts en `public/supabase/queries/` están numerados para ejecutarse de forma determinista y en orden lexicográfico estricto (tanto manualmente en el SQL Editor de Supabase como automáticamente desde `POST /api/reset-db`):

| Orden | Archivo | Propósito Principal |
| :---: | :--- | :--- |
| 0 | `00_delete_tables.sql` | Reinicio limpio del esquema `public` (`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`) y restauración de privilegios base para `postgres`, `anon`, `authenticated`, `service_role` y `public`. |
| 1 | `01_creacion.sql` | Extensiones (`uuid-ossp`, `ltree`), tipos `ENUM`, **31 tablas relacionales**, columnas de retención `deleted_at`/`deleted_by`/`delete_reason`, `handle_new_user()`, disparadores de prevención de hard-delete, `get_archive_dependency_summary()`, `fn_guard_parent_archival()`, `fn_protect_profile_rbac_fields()`, triggers de integridad ISO/IEC 17021-1, `audit_log` inmutable y triggers `updated_at`. |
| 2 | `02_cobertura_normativa.sql` | Motor jerárquico de cobertura `LTREE` (`evaluar_cobertura_certificado`, `cobertura_normativa_certificado`) y funciones de validación de competencias técnicas de auditores (`auditor_esta_calificado`, `auditores_calificados_para_certificado`) filtrando registros archivados (`deleted_at IS NULL`). |
| 3 | `03_indices_optimizacion.sql` | **52 índices especializados**: reemplaza restricciones `UNIQUE` globales por **15 índices únicos parciales** (`WHERE deleted_at IS NULL`) más **37 índices `GiST` y `B-tree` parciales/compuestos** sobre los tres dominios, jerarquía `LTREE`, Sitio 0, sub-sectores IAF y bitácora forense. |
| 4 | `04_rls.sql` | Doble capa DCL (`REVOKE DELETE` en 26 tablas + `GRANT`) y Row Level Security (`ENABLE ROW LEVEL SECURITY`) en las **31 tablas**, 7 funciones auxiliares `SECURITY DEFINER`, RPC `archive_record(p_table, p_record_id, p_reason)` y **92 políticas granulares** por rol y retención lógica. |
| 5 | `05_usuarios.sql` | Limpieza e inserción de las 4 cuentas de prueba confirmadas en `auth.users` y `public.profiles` (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`). |
| 6 | `06_datos_prueba.sql` | Semillero idempotente compatible con índices únicos parciales (`ON CONFLICT (...) WHERE deleted_at IS NULL`) para catálogos, sub-sectores IAF, acreditaciones (`ENAC`, `UKAS`, `ANAB`), normas, cláusulas `ltree`, auditores, organizaciones, certificados con `alcance`, Sitios con Sitio 0, procesos, turnos, exclusiones justificadas, auditorías y hallazgos. |

---

## 2. Infraestructura Base, Extensiones y Tipos Enumerados (`01_creacion.sql`)

### 2.1 Extensiones PostgreSQL
- **`uuid-ossp`:** Generación de claves primarias UUID v4 mediante `uuid_generate_v4()`.
- **`ltree`:** Almacenamiento e indexación `GiST` de rutas jerárquicas materializadas para cláusulas normativas ISO (ej. `4`, `4.4_1`, `5.5_1`, `8.8_5`).

### 2.2 Tipos Enumerados (`public.*`)
- **`public.user_status`:** `'PENDING'`, `'APPROVED'`, `'REJECTED'`.
- **`public.user_role`:** `'ADMIN'`, `'WORKER'`, `'AUDITOR'`, `'CLIENT'`.
- **`public.tipo_hallazgo`:** `'NC_MAYOR'`, `'NC_MENOR'`, `'OBSERVACION'`, `'OPORTUNIDAD_MEJORA'`.

### 2.3 Identidad de Usuarios, Máquina de Estados y Protección RBAC
- **`public.profiles`:** Extiende `auth.users(id)` (`ON DELETE CASCADE`) con `nombre`, `role` (`DEFAULT 'CLIENT'`), `status` (`DEFAULT 'APPROVED'`), `created_at` y `updated_at`.
- **Trigger `on_auth_user_created` (`public.handle_new_user()`):** Se ejecuta `AFTER INSERT ON auth.users`:
  - Lee `raw_user_meta_data->>'role'` y valida el cast a `public.user_role` (fallback seguro a `'CLIENT'`).
  - Si el rol es `'CLIENT'`, asigna `status = 'APPROVED'` de forma inmediata.
  - Si el rol es `'ADMIN'`, `'WORKER'` o `'AUDITOR'`, fuerza `status = 'PENDING'` para exigir aprobación administrativa manual.
  - Utiliza `ON CONFLICT (id) DO UPDATE` para garantizar idempotencia.
- **Guardia anti-escalamiento `trg_protect_profile_rbac_fields` (`public.fn_protect_profile_rbac_fields()`):** Trigger `BEFORE UPDATE ON public.profiles` que bloquea cualquier cambio en `role` o `status` si el usuario autenticado no cumple `public.is_approved_admin()`, permitiendo únicamente la auto-edición segura de `nombre` (y la ejecución de migraciones/semilleros bajo `postgres`/`service_role` sin JWT de usuario).

---

## 3. Modelo Entidad-Relación: 31 Tablas y Gobernanza Soft-Delete

Todas las entidades operativas, de catálogos y de vínculo con trazabilidad implementan **retención lógica (`soft-delete`)** en lugar de eliminación física:

- **17 tablas principales/catálogo con retención completa (`deleted_at`, `deleted_by`, `delete_reason`):**  
  `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `hallazgo`.
- **7 tablas secundarias/acceso con retención (`deleted_at`, `deleted_by`):**  
  `requisitos_no_aplicables_certificado`, `turnos_por_sitio`, `comentarios_por_auditoria`, `sitios_por_auditoria`, `turnos_sitio_auditoria`, `procesos_sitio_auditoria` (integrantes de las **23 tablas protegidas por soft-delete** con bloqueo de `DELETE` físico), más `client_organization_access`.
- **5 tablas de enlace M:N puras (sin `deleted_at`, habilitadas únicamente para desasignación controlada):**  
  `norma_auditor`, `sector_iaf_auditor`, `subsector_iaf_auditor`, `requisitos_por_proceso`, `equipo_auditor`.

### 3.1 Gobernanza e Identidad (2 tablas)
| Tabla | Propósito | Claves / Gobernanza Destacada |
| :--- | :--- | :--- |
| `public.profiles` | Perfil operativo, rol RBAC y estado de aprobación del usuario autenticado. | `id PK FK auth.users(id)`, `trg_protect_profile_rbac_fields`, `audit_profiles_trigger`, `REVOKE DELETE` |
| `public.audit_log` | Bitácora forense inmutable de mutaciones DML (`INSERT`, `UPDATE`, `DELETE`) con `old_data` / `new_data` en `JSONB`, `performed_by` y `performed_at`. | `id BIGINT IDENTITY PK`, `trg_audit_log_immutable`, `REVOKE DELETE` |

### 3.2 Dominio 1: Catálogos Maestros, Acreditación y Competencias (13 tablas)
| Tabla | Propósito | Retención / Claves Destacadas |
| :--- | :--- | :--- |
| `norma` | Normas certificables (`codigo`, `titulo`, `esquema`, fecha de publicación, `estatus`). | Soft-delete completo + guardia de archivo; `uq_norma_codigo_active`; `trg_norma_sync_codigo_titulo` |
| `requisito` | Cláusulas normativas jerárquicas por norma. | Soft-delete completo + guardia de archivo; `id_requisito_padre`; `ruta_materializada LTREE`; `uq_requisito_norma_codigo_active` |
| `sector_iaf` | Sectores productivos IAF principales. | Soft-delete completo + guardia de archivo; `uq_sector_iaf_numero_active` |
| `subsector_iaf` | Sub-sectores IAF jerárquicos (`17.1`, `17.2`, `28.1`, `33.1`) con categoría de riesgo (`ALTO`, `MEDIO`, `BAJO`). | Soft-delete completo; `id_sector_iaf FK RESTRICT`; `uq_subsector_codigo_active` |
| `organismo_acreditacion` | Entidades acreditadoras (`ENAC`, `UKAS`, `ANAB`). | Soft-delete completo + guardia de archivo; `uq_organismo_codigo_active` |
| `acreditacion_norma_iaf` | Alcances de acreditación otorgados a normas y sectores IAF (`numero_acreditacion`, fechas, estatus). | Soft-delete completo (entidad hoja archivable sin hijos bloqueantes) |
| `estatus` | Estados operativos canónicos (`Activo`, `Estudio`, `Suspendido`, `Cancelado`, `Planificado`, `En Ejecución`, `En Espera`, `Inactivo`). | Soft-delete completo + guardia de archivo; `uq_estatus_nombre_active` |
| `tipo_auditoria` | Modalidades de ciclo canónicas (`Etapa 1`, `Etapa 2`, `Seguimiento 1`, `Seguimiento 2`, `Renovación`, `Diagnóstico`, `Extraordinaria`, `Especial`, `Otro`). | Soft-delete completo + guardia de archivo; `uq_tipo_auditoria_nombre_active` |
| `metodologia_auditoria` | Modalidades de ejecución (`Presencial`, `Remota`, `Mixta`). | Soft-delete completo + guardia de archivo; `uq_metodologia_nombre_active` |
| `auditor` | Registro nominal de auditores del organismo. | Soft-delete completo; `id UUID PK` |
| `norma_auditor` | Matriz M:N de normas en las que cada auditor está calificado. | Enlace M:N puro `PK (id_auditor, id_norma)` |
| `sector_iaf_auditor` | Matriz M:N de sectores IAF aprobados por auditor. | Enlace M:N puro `PK (id_auditor, id_sector_iaf)` |
| `subsector_iaf_auditor` | Matriz M:N granular de sub-sectores IAF calificados por auditor. | Enlace M:N puro `PK (id_auditor, id_subsector_iaf)` |

### 3.3 Dominio 2: Organizaciones, Certificados, Estructuras Operativas y Acceso Cliente (9 tablas)
| Tabla | Propósito | Retención / Claves Destacadas |
| :--- | :--- | :--- |
| `organizacion` | Empresas titulares sujetas a certificación (`nombre`, `rif`, `direccion_fiscal`). | Soft-delete completo + guardia de archivo (`trg_guard_archival_organizacion`) |
| `client_organization_access` | Vinculación aprobada entre usuarios `CLIENT` y organizaciones (`estado`, `aprobado_por`, `motivo_rechazo`). | Soft-delete (`deleted_at`, `deleted_by`) + `REVOKE DELETE` |
| `certificado` | Certificados emitidos por norma, estatus, sector IAF y organización, con `alcance` (`VARCHAR(1000)`) y bandera `multisitio`. | Soft-delete completo + guardia de archivo; `uq_certificado_numero_active` |
| `sitio` | Sedes físicas o virtuales bajo la **Convención Sitio 0**. | Soft-delete completo + guardia de archivo (protección de Sitio 0 ante sedes secundarias o auditorías activas); `CHECK (numero_sitio >= 0)`; `uq_sitio_cert_numero_active` |
| `proceso` | Procesos auditables clasificados (`Estratégico`, `Medular`, `De Apoyo`, `Otro`). | Soft-delete completo + guardia de archivo; `uq_proceso_cert_nombre_active` |
| `requisitos_por_proceso` | Mapeo M:N de cláusulas ISO auditadas en cada proceso. | Enlace M:N puro `PK (id_proceso, id_requisito)` |
| `requisitos_no_aplicables_certificado` | Exclusiones formales justificadas a nivel de certificado (ISO 9001 Cláusula 4.3). | Soft-delete (`deleted_at`, `deleted_by`); `uq_req_no_aplicable_cert_req_active` |
| `turno` | Catálogo de horarios laborales (`hora_entrada`, `hora_salida`, `descripcion`). | Soft-delete completo + guardia de archivo; `uq_turno_horario_active` |
| `turnos_por_sitio` | Asignación de turnos operativos a cada sede. | Soft-delete (`deleted_at`, `deleted_by`) + guardia de archivo; `uq_turnos_por_sitio_active` |

### 3.4 Dominio 3: Planificación, Ejecución y Hallazgos de Auditoría (7 tablas)
| Tabla | Propósito | Retención / Claves Destacadas |
| :--- | :--- | :--- |
| `auditoria` | Eventos de auditoría programados/reprogramados vinculados a certificado, tipo y metodología. | Soft-delete completo + guardia de archivo |
| `comentarios_por_auditoria` | Bitácora técnica de observaciones y seguimiento por evento de auditoría. | Soft-delete (`deleted_at`, `deleted_by`) |
| `equipo_auditor` | Auditores asignados a una auditoría y su rol (`AUDITOR_LIDER`, `AUDITOR`, etc.). | Enlace M:N puro `PK (id_auditoria, id_auditor)` |
| `sitios_por_auditoria` | Sedes incluidas en el plan específico de auditoría. | Soft-delete (`deleted_at`, `deleted_by`) + guardia de archivo; `uq_sitios_por_auditoria_active`; `trg_validar_sitio_auditoria_certificado` |
| `turnos_sitio_auditoria` | Turnos específicos evaluados en cada sede durante la auditoría. | Soft-delete (`deleted_at`, `deleted_by`) + guardia de archivo; `trg_validar_turno_sitio_auditoria` |
| `procesos_sitio_auditoria` | Procesos auditados por sede y turno asignado en la auditoría. | Soft-delete (`deleted_at`, `deleted_by`); `trg_validar_proceso_sitio_auditoria_certificado` |
| `hallazgo` | No conformidades y observaciones ISO (`tipo_hallazgo`), evidencia, proceso, requisito y cierre (`cerrado`). | Soft-delete completo; `id_auditoria FK CASCADE` |

---

## 4. Triggers de Retención Lógica, Dependencias e Integridad

### 4.1 Mecanismo Soft-Delete y Prevención de Hard-Delete (`01_creacion.sql`)
1. **Bloqueo de `DELETE` Físico (`fn_prevent_hard_delete()`):** Instalado `BEFORE DELETE` sobre las **23 tablas protegidas** (`17` principales + `6` operativas hijas). Lanza una excepción inmediata si alguna sesión intenta ejecutar un `DELETE` físico en lugar de archivar mediante `deleted_at`.
2. **Sincronización Automática de Metadatos (`fn_sync_soft_delete_metadata()` / `fn_sync_soft_delete_child_metadata()`):** Al transicionar `deleted_at` de `NULL` a un timestamp, registra automáticamente `deleted_by = COALESCE(NEW.deleted_by, auth.uid())`. Al restaurar (`deleted_at` regresa a `NULL`), limpia `deleted_by = NULL` y `delete_reason = NULL`. Aplicado en **24 tablas** (las 23 protegidas + `client_organization_access`).
3. **RPC `public.get_archive_dependency_summary(p_table TEXT, p_record_id UUID) RETURNS JSONB`:**
   Inspecciona en vivo las dependencias activas (`WHERE deleted_at IS NULL`) para **16 tablas padre** (`organizacion`, `certificado`, `sitio` —incluyendo la validación especial de **Sitio 0** ante sedes secundarias `numero_sitio > 0`—, `proceso`, `turno`, `auditoria`, `norma`, `requisito`, `sector_iaf`, `organismo_acreditacion`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `sitios_por_auditoria`, `turnos_por_sitio`, `turnos_sitio_auditoria`). Devuelve `{ can_archive, total_active_dependencies, dependencies: [{ table, label, count }] }`.
4. **Guardia Transaccional de Archivo en Padres (`fn_guard_parent_archival()`):** Instalado `BEFORE UPDATE` sobre las **16 tablas padre protegidas**. Invoca `get_archive_dependency_summary` al intentar archivar (`OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`) y aborta la transacción si `total_active_dependencies > 0`, garantizando consistencia referencial incluso ante llamadas directas a PostgREST.

### 4.2 Convención Sitio 0, Clasificación de Procesos y Alcance Documental
- **Convención Sitio 0 (`sitio.numero_sitio`):** La sede principal corporativa (HQ) recibe obligatoriamente `numero_sitio = 0`, respaldada por `CHECK (numero_sitio >= 0)` y el índice `idx_sitio_cert_numero (id_certificado, numero_sitio) WHERE deleted_at IS NULL`. `get_archive_dependency_summary` bloquea el archivo del Sitio 0 mientras existan sedes secundarias activas (`numero_sitio > 0`), turnos asignados o auditorías vinculadas.
- **Clasificación de Procesos (`proceso.tipo`):** Restringida mediante `check_proceso_tipo` exclusivamente a `'Estratégico'`, `'Medular'`, `'De Apoyo'` u `'Otro'`.
- **Declaración de Alcance (`certificado.alcance`):** Columna `VARCHAR(1000)` para declaraciones auditables conforme a ISO/IEC 17021-1 Cláusula 8.2 (validación en cliente de 10 a 1000 caracteres).
- **Exclusiones Justificadas (`requisitos_no_aplicables_certificado.justificacion`):** Almacena la justificación técnica exigida por ISO 9001 Cláusula 4.3.

### 4.3 Triggers de Integridad de Subconjunto (ISO/IEC 17021-1)
1. **`trg_validar_sitio_auditoria_certificado`:** Verifica en `sitios_por_auditoria` que `sitio.id_certificado = auditoria.id_certificado`.
2. **`trg_validar_turno_sitio_auditoria`:** Verifica en `turnos_sitio_auditoria` que `turnos_por_sitio.id_sitio` coincida con el `sitio` en `sitios_por_auditoria`.
3. **`trg_validar_proceso_sitio_auditoria_certificado`:** Valida simultáneamente en `procesos_sitio_auditoria` la pertenencia de `proceso` al certificado de la auditoría y la coherencia con `turnos_sitio_auditoria`.

### 4.4 Audit Log Inmutable y Timestamps Automáticos
- **`trg_audit_log_immutable` (`prevent_audit_log_mutation()`):** Trigger `BEFORE UPDATE OR DELETE ON public.audit_log` que bloquea cualquier alteración histórica.
- **`audit_trigger_func()`:** Registra `INSERT`, `UPDATE` (incluyendo eventos de archivo/restauración vía `deleted_at`/`delete_reason`) y `DELETE` con `auth.uid()`, `record_id` y snapshots `old_data`/`new_data` (`JSONB`) mediante **25 triggers de auditoría** (`profiles`, `client_organization_access`, las 17 tablas principales/catálogo y las 6 tablas operativas hijas).
- **`trg_norma_sync_codigo_titulo`:** Mantiene sincronizados `codigo`, `norma` y `titulo` en `public.norma`.
- **`update_updated_at_column()`:** Actualiza `NEW.updated_at = NOW()` mediante **19 triggers `BEFORE UPDATE`**.

---

## 5. Motor de Cobertura Normativa LTREE y Competencias (`02_cobertura_normativa.sql`)

Todas las funciones se ejecutan como `STABLE SECURITY DEFINER SET search_path = public, pg_temp` y excluyen estrictamente registros archivados (`deleted_at IS NULL`):

- **`public.evaluar_cobertura_certificado(p_id_certificado UUID)`:** Retorna `(id_requisito, codigo, ruta_materializada, estado_cobertura)`. Propaga con `@>` de `ltree` la cobertura desde requisitos hoja hacia cláusulas ancestro (`CUBIERTO` > `NO_APLICABLE` > `PENDIENTE`) ignorando requisitos, procesos o exclusiones con `deleted_at IS NOT NULL`.
- **`public.cobertura_normativa_certificado(p_id_certificado UUID)`:** Wrapper RPC empleado desde PostgREST (`/rest/v1/rpc/cobertura_normativa_certificado`).
- **`public.auditor_esta_calificado(p_id_auditor UUID, p_id_norma UUID, p_id_sector_iaf UUID, p_id_subsector_iaf UUID DEFAULT NULL) RETURNS BOOLEAN`:** Valida vigencia activa del auditor (`deleted_at IS NULL`) y calificación simultánea en `norma_auditor`, `sector_iaf_auditor` y opcionalmente `subsector_iaf_auditor`.
- **`public.auditores_calificados_para_certificado(p_id_certificado UUID)`:** Lista auditores activos elegibles `(id_auditor, nombre)` compatibles con la norma y sector IAF del certificado.

---

## 6. Índices Únicos Parciales y Optimización (`03_indices_optimizacion.sql`)

Se definen **52 índices** especializados para compatibilidad plena con soft-delete y rendimiento en consultas:

- **15 Índices Únicos Parciales (`WHERE deleted_at IS NULL`):** Reemplazan las restricciones `UNIQUE` globales heredadas para permitir la reutilización de códigos/nombres cuando el registro previo ha sido archivado:
  - `uq_norma_codigo_active`, `uq_requisito_norma_codigo_active`, `uq_sector_iaf_numero_active`, `uq_subsector_codigo_active`, `uq_organismo_codigo_active`, `uq_estatus_nombre_active`, `uq_tipo_auditoria_nombre_active`, `uq_metodologia_nombre_active`, `uq_certificado_numero_active`, `uq_sitio_cert_numero_active`, `uq_proceso_cert_nombre_active`, `uq_req_no_aplicable_cert_req_active`, `uq_turno_horario_active`, `uq_turnos_por_sitio_active`, `uq_sitios_por_auditoria_active`.
- **37 Índices de Consulta y Cobertura (`GiST` y `B-tree` parciales):**
  - Jerarquía `LTREE` y requisitos (4): `idx_requisito_ruta_gist` (`USING GIST`), `idx_requisito_padre`, `idx_requisito_norma_padre`, `idx_requisito_norma_codigo`.
  - Organizaciones, acceso cliente y certificados (8): `idx_organizacion_nombre`, `idx_organizacion_rif`, `idx_organizacion_active`, `idx_client_org_access_lookup`, `idx_certificado_numero`, `idx_certificado_organizacion`, `idx_certificado_norma_iaf`, `idx_certificado_active`.
  - Competencias y acreditaciones (11): `idx_auditor_nombre`, `idx_norma_auditor_*`, `idx_sector_iaf_auditor_*`, `idx_subsector_*`, `idx_acreditacion_norma_org`, `idx_acreditacion_norma_iaf_active`, `idx_organismo_codigo`.
  - Sitios, procesos, auditorías, hallazgos y bitácora forense (14): `idx_sitio_cert_numero`, `idx_proceso_cert_tipo`, `idx_proceso_certificado`, `idx_turnos_por_sitio_lookup`, `idx_req_proceso_lookup`, `idx_req_no_aplicables_certificado`, `idx_equipo_auditor_lookup`, `idx_sitios_auditoria_compuesto`, `idx_proc_sitio_aud_compuesto`, `idx_procesos_sitio_auditoria_compuesto`, `idx_auditoria_fecha`, `idx_auditoria_certificado_active`, `idx_hallazgo_auditoria`, `idx_audit_log_entity_lookup`.

---

## 7. Datos de Prueba e Identidades (`05_usuarios.sql` y `06_datos_prueba.sql`)

- **`05_usuarios.sql`:** Inserta 4 cuentas confirmadas en `auth.users` y `public.profiles` con contraseña `Password123*` (usando `crypt(..., gen_salt('bf'))` y cadenas vacías `''` en campos de token de GoTrue):
  - `admin@fondonorma.test` (`ADMIN`, `APPROVED`, UUID `11111111-1111-1111-1111-111111111111`)
  - `worker@fondonorma.test` (`WORKER`, `APPROVED`, UUID `22222222-2222-2222-2222-222222222222`)
  - `auditor@fondonorma.test` (`AUDITOR`, `APPROVED`, UUID `33333333-3333-3333-3333-333333333333`)
  - `client@fondonorma.test` (`CLIENT`, `APPROVED`, UUID `44444444-4444-4444-4444-444444444444`)
- **`06_datos_prueba.sql`:** Siembra de forma idempotente (compatible con `ON CONFLICT (...) WHERE deleted_at IS NULL`) 8 estatus canónicos, 9 modalidades de auditoría, 3 metodologías, 5 sectores IAF, 4 sub-sectores IAF (`17.1`, `17.2`, `28.1`, `33.1`), 3 organismos acreditadores (`ENAC`, `UKAS`, `ANAB`), 4 normas ISO, acreditaciones activas, cláusulas `ltree`, auditores con competencias cruzadas, organizaciones (`Iberometal Componentes S.A.` y `CyberCloud Solutions S.L.`), acceso cliente aprobado, certificado `FN-QMS-2024-001` con `alcance`, Sitios (`0` `Sede Principal HQ` y `1` `Planta Valencia`), turnos, 3 procesos tipificados, exclusión justificada de cláusula `5.1`, auditoría de `Renovación` (`Presencial`), equipo auditor y hallazgo `NC_MENOR` abierto.
