# Arquitectura de Base de Datos y Motor Normativo (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Detalla la capa de persistencia en **PostgreSQL (Supabase)** implementada en `public/supabase/queries/` (`00_delete_tables.sql` a `06_datos_prueba.sql`).

---

## 1. Secuencia de Despliegue SQL

Los scripts en `public/supabase/queries/` están numerados para ejecutarse de forma determinista y en orden lexicográfico estricto (tanto manualmente en el SQL Editor de Supabase como automáticamente desde `POST /api/reset-db`):

| Orden | Archivo | Propósito Principal |
| :---: | :--- | :--- |
| 0 | `00_delete_tables.sql` | Reinicio limpio del esquema `public` (`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`) y restauración de privilegios base para `postgres`, `anon`, `authenticated`, `service_role` y `public`. |
| 1 | `01_creacion.sql` | Extensiones (`uuid-ossp`, `ltree`), tipos `ENUM`, **31 tablas relacionales**, disparador `handle_new_user()`, triggers de integridad ISO/IEC 17021-1, `audit_log` inmutable (13 triggers) y 19 triggers `updated_at`. |
| 2 | `02_cobertura_normativa.sql` | Motor jerárquico de cobertura `LTREE` (`evaluar_cobertura_certificado`, `cobertura_normativa_certificado`) y funciones de validación de competencias técnicas de auditores. |
| 3 | `03_indices_optimizacion.sql` | **33 índices especializados** (`GiST` y `B-tree` compuestos/parciales) sobre los tres dominios, jerarquía `LTREE`, Convención Sitio 0, sub-sectores IAF y bitácora forense. |
| 4 | `04_rls.sql` | Doble capa DCL (`GRANT`) + Row Level Security (`ENABLE ROW LEVEL SECURITY`) en las **31 tablas**, 7 funciones `SECURITY DEFINER` y políticas granulares por rol. |
| 5 | `05_usuarios.sql` | Limpieza e inserción de las 4 cuentas de prueba confirmadas en `auth.users` y `public.profiles` (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`). |
| 6 | `06_datos_prueba.sql` | Semillero idempotente de estatus, modalidades, metodologías, sectores y sub-sectores IAF, organismos acreditadores (`ENAC`, `UKAS`, `ANAB`), normas, cláusulas `ltree`, auditores, organizaciones, acceso cliente, certificados con `alcance`, Sitios con Sitio 0, procesos tipificados, turnos, exclusiones justificadas, auditorías y hallazgos. |

---

## 2. Infraestructura Base, Extensiones y Tipos Enumerados (`01_creacion.sql`)

### 2.1 Extensiones PostgreSQL
- **`uuid-ossp`:** Generación de claves primarias UUID v4 mediante `uuid_generate_v4()`.
- **`ltree`:** Almacenamiento e indexación `GiST` de rutas jerárquicas materializadas para cláusulas normativas ISO (ej. `4`, `4.4_1`, `5.5_1`, `8.8_5`).

### 2.2 Tipos Enumerados (`public.*`)
- **`public.user_status`:** `'PENDING'`, `'APPROVED'`, `'REJECTED'`.
- **`public.user_role`:** `'ADMIN'`, `'WORKER'`, `'AUDITOR'`, `'CLIENT'`.
- **`public.tipo_hallazgo`:** `'NC_MAYOR'`, `'NC_MENOR'`, `'OBSERVACION'`, `'OPORTUNIDAD_MEJORA'`.

### 2.3 Identidad de Usuarios y Máquina de Estados de Registro
- **`public.profiles`:** Extiende `auth.users(id)` (`ON DELETE CASCADE`) con `nombre`, `role` (`DEFAULT 'CLIENT'`), `status` (`DEFAULT 'APPROVED'`), `created_at` y `updated_at`.
- **Trigger `on_auth_user_created` (`public.handle_new_user()`):** Se ejecuta `AFTER INSERT ON auth.users`:
  - Lee `raw_user_meta_data->>'role'` y valida el cast a `public.user_role` (fallback seguro a `'CLIENT'`).
  - Si el rol es `'CLIENT'`, asigna `status = 'APPROVED'` de forma inmediata.
  - Si el rol es `'ADMIN'`, `'WORKER'` o `'AUDITOR'`, fuerza `status = 'PENDING'` para exigir aprobación administrativa manual.
  - Utiliza `ON CONFLICT (id) DO UPDATE` para garantizar idempotencia.

---

## 3. Modelo Entidad-Relación: 31 Tablas por Dominio

> Sobre la arquitectura base inicial de 27 tablas, la modernización de Fase 1 incorporó 4 entidades de acreditación y sub-sectores IAF (`subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf` y `subsector_iaf_auditor`), totalizando **31 tablas protegidas en `public`**.

### 3.1 Gobernanza e Identidad (2 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `public.profiles` | Perfil operativo, rol RBAC y estado de aprobación del usuario autenticado. | `id PK FK auth.users(id) ON DELETE CASCADE` |
| `public.audit_log` | Bitácora forense inmutable de mutaciones DML (`INSERT`, `UPDATE`, `DELETE`) con `old_data` / `new_data` en `JSONB`, `performed_by` y `performed_at`. | `id BIGINT IDENTITY PK`, `trg_audit_log_immutable` |

### 3.2 Dominio 1: Catálogos Maestros, Acreditación y Competencias (13 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `norma` | Normas certificables con código desacoplado (`codigo`), título formal (`titulo`), esquema (`esquema`), fecha de publicación y ciclo de vida (`estatus`). | `codigo UNIQUE`, `CHECK (estatus IN ('Vigente', 'En Revisión', 'Obsoleta'))`, `trg_norma_sync_codigo_titulo`, `audit_norma_trigger` |
| `requisito` | Cláusulas normativas jerárquicas por norma. | `id_requisito_padre` (`ON DELETE RESTRICT`), `ruta_materializada LTREE`, `unique_norma_requisito_codigo` |
| `sector_iaf` | Sectores productivos IAF principales. | `sector INTEGER NOT NULL UNIQUE` |
| `subsector_iaf` | Sub-sectores IAF jerárquicos (ej. `17.1`, `17.2`, `28.1`, `33.1`) con categoría de riesgo técnico. | `id_sector_iaf FK RESTRICT`, `unique_subsector_codigo (codigo)`, `CHECK (categoria_riesgo IN ('ALTO', 'MEDIO', 'BAJO'))`, `audit_subsector_iaf_trigger` |
| `organismo_acreditacion` | Entidades acreditadoras (`ENAC`, `UKAS`, `ANAB`). | `codigo UNIQUE`, `audit_organismo_acreditacion_trigger` |
| `acreditacion_norma_iaf` | Alcances de acreditación otorgados a normas y sectores IAF (`numero_acreditacion`, fechas, estatus). | `id_organismo FK CASCADE`, `id_norma FK CASCADE`, `id_sector_iaf FK SET NULL`, `audit_acreditacion_norma_iaf_trigger` |
| `estatus` | Estados operativos canónicos (`Activo`, `Estudio`, `Suspendido`, `Cancelado`, `Planificado`, `En Ejecución`, `En Espera`, `Inactivo`). | `estatus UNIQUE` |
| `tipo_auditoria` | Modalidades de ciclo canónicas (`Etapa 1`, `Etapa 2`, `Seguimiento 1`, `Seguimiento 2`, `Renovación`, `Diagnóstico`, `Extraordinaria`, `Especial`, `Otro`). | `tipo UNIQUE` |
| `metodologia_auditoria` | Modalidades de ejecución (`Presencial`, `Remota`, `Mixta`). | `metodologia UNIQUE` |
| `auditor` | Registro nominal de auditores del organismo. | `id UUID PK` |
| `norma_auditor` | Matriz de normas en las que cada auditor está calificado. | `PK (id_auditor, id_norma)` |
| `sector_iaf_auditor` | Matriz de sectores IAF aprobados por auditor. | `PK (id_auditor, id_sector_iaf)` |
| `subsector_iaf_auditor` | Matriz granular de sub-sectores IAF calificados por auditor. | `PK (id_auditor, id_subsector_iaf)` |

### 3.3 Dominio 2: Organizaciones, Certificados, Estructuras Operativas y Acceso Cliente (9 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `organizacion` | Empresas titulares sujetas a certificación (`nombre`, `rif`, `direccion_fiscal`). | `audit_organizacion_trigger` |
| `client_organization_access` | Vinculación aprobada entre usuarios `CLIENT` y organizaciones específicas (`estado`, `aprobado_por`, `motivo_rechazo`). | `unique_usuario_organizacion`, `audit_client_access_trigger` |
| `certificado` | Certificados emitidos por norma, estatus, sector IAF y organización, con declaración narrativa `alcance` y bandera `multisitio`. | `numero_certificado UNIQUE`, `alcance VARCHAR(1000) NOT NULL DEFAULT ''`, `audit_certificado_trigger` |
| `sitio` | Sedes físicas o virtuales cubiertas por un certificado bajo la **Convención Sitio 0**. | `CHECK (numero_sitio >= 0)`, `unique_sitio_certificado (id_certificado, numero_sitio)`, `audit_sitio_trigger` |
| `proceso` | Procesos auditables clasificados dentro del alcance del certificado. | `tipo VARCHAR(30) NOT NULL DEFAULT 'Medular'`, `check_proceso_tipo CHECK (tipo IN ('Estratégico', 'Medular', 'De Apoyo', 'Otro'))`, `unique_proceso_certificado`, `audit_proceso_trigger` |
| `requisitos_por_proceso` | Mapeo N:M de cláusulas ISO auditadas en cada proceso. | `PK (id_proceso, id_requisito)` |
| `requisitos_no_aplicables_certificado` | Exclusiones formales justificadas a nivel de certificado (ISO 9001 Cláusula 4.3). | `id UUID PK`, `justificacion TEXT NOT NULL DEFAULT ''`, `unique_cert_requisito_no_aplicable (id_certificado, id_requisito)`, `audit_req_no_aplicables_trigger` |
| `turno` | Catálogo de horarios laborales (`hora_entrada`, `hora_salida`). | `unique_horario_turno`, `audit_turno_trigger` |
| `turnos_por_sitio` | Asignación de turnos operativos a cada sede. | `unique_sitio_turno (id_sitio, id_turno)` |

### 3.4 Dominio 3: Planificación, Ejecución y Hallazgos de Auditoría (7 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `auditoria` | Eventos de auditoría programados/reprogramados vinculados a certificado, tipo y metodología. | `audit_auditoria_trigger` |
| `comentarios_por_auditoria` | Bitácora técnica de observaciones y seguimiento por evento de auditoría. | `id_auditoria FK CASCADE` |
| `equipo_auditor` | Auditores asignados a una auditoría y su rol (`AUDITOR_LIDER`, `AUDITOR`, etc.). | `PK (id_auditoria, id_auditor)` |
| `sitios_por_auditoria` | Sedes incluidas en el plan específico de auditoría. | `unique_auditoria_sitio`, `trg_validar_sitio_auditoria_certificado` |
| `turnos_sitio_auditoria` | Turnos específicos evaluados en cada sede durante la auditoría. | `trg_validar_turno_sitio_auditoria` |
| `procesos_sitio_auditoria` | Procesos auditados por sede y turno asignado en la auditoría. | `trg_validar_proceso_sitio_auditoria_certificado` |
| `hallazgo` | No conformidades y observaciones ISO (`tipo_hallazgo`), evidencia, proceso, requisito y cierre (`cerrado`). | `id_auditoria FK CASCADE`, `audit_hallazgo_trigger` |

---

## 4. Reglas Estructurales y Triggers de Integridad

### 4.1 Convención Sitio 0, Clasificación de Procesos y Alcance Documental
- **Convención Sitio 0 (`sitio.numero_sitio`):** La sede principal corporativa (HQ) recibe obligatoriamente `numero_sitio = 0`, respaldada por `CHECK (numero_sitio >= 0)` y el índice `idx_sitio_cert_numero (id_certificado, numero_sitio)`. Las plantas o sucursales adicionales usan enteros `>= 1`. Tanto el cálculo de muestreo multisitio (`countMultisiteBranches`) como la presentación en UI sitúan siempre la Sede 0 al inicio y excluyen la Sede 0 del conteo de sucursales multisitio.
- **Clasificación de Procesos (`proceso.tipo`):** Restringida mediante `check_proceso_tipo` exclusivamente a `'Estratégico'`, `'Medular'`, `'De Apoyo'` u `'Otro'` (valor por defecto `'Medular'`), indexada por `idx_proceso_cert_tipo`.
- **Declaración de Alcance (`certificado.alcance`):** Columna `VARCHAR(1000)` diseñada para redactar declaraciones formales de alcance de 500 a 1000 caracteres conforme a ISO/IEC 17021-1 Cláusula 8.2 (validada en cliente entre 10 y 1000 caracteres).
- **Exclusiones Justificadas (`requisitos_no_aplicables_certificado.justificacion`):** Almacena la justificación técnica auditable exigida por ISO 9001 Cláusula 4.3 cuando se excluye un requisito del sistema de gestión.

### 4.2 Triggers de Integridad de Subconjunto (ISO/IEC 17021-1)
Impiden inconsistencias relacionales entre el certificado de la auditoría y los elementos planificados:
1. **`trg_validar_sitio_auditoria_certificado` (`fn_validar_sitio_auditoria_certificado()`):** En `sitios_por_auditoria`, verifica que `sitio.id_certificado` coincida exactamente con `auditoria.id_certificado`.
2. **`trg_validar_turno_sitio_auditoria` (`fn_validar_turno_sitio_auditoria()`):** En `turnos_sitio_auditoria`, verifica que `turnos_por_sitio.id_sitio` corresponda al mismo `sitio` registrado en `sitios_por_auditoria`.
3. **`trg_validar_proceso_sitio_auditoria_certificado` (`fn_validar_proceso_sitio_auditoria_certificado()`):** En `procesos_sitio_auditoria`, valida simultáneamente que `proceso.id_certificado` coincida con `auditoria.id_certificado` y que `turnos_sitio_auditoria` pertenezca al mismo `id_sitios_por_auditoria`.

### 4.3 Audit Log Inmutable (`public.audit_log`)
- **`trg_audit_log_immutable` (`prevent_audit_log_mutation()`):** Trigger `BEFORE UPDATE OR DELETE ON public.audit_log` que bloquea cualquier alteración o borrado histórico lanzando una excepción `Violación de Inmutabilidad`.
- **`audit_trigger_func()`:** Registra automáticamente `INSERT`, `UPDATE` y `DELETE` con `auth.uid()`, `record_id` y snapshots `old_data`/`new_data` (`JSONB`) en **13 tablas críticas**:
  - `organizacion`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria`, `client_organization_access`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `requisitos_no_aplicables_certificado`, `norma` y `hallazgo`.

### 4.4 Timestamps Automáticos y Sincronización de Normas
- **`trg_norma_sync_codigo_titulo` (`fn_norma_sync_codigo_titulo()`):** Mantiene sincronizados `codigo`, `norma` y `titulo` ante inserciones o actualizaciones parciales en `public.norma`.
- **`update_updated_at_column()`:** Actualiza `NEW.updated_at = NOW()` mediante **19 triggers `BEFORE UPDATE`** en `profiles`, `organizacion`, `norma`, `requisito`, `sector_iaf`, `subsector_iaf`, `organismo_acreditacion`, `acreditacion_norma_iaf`, `requisitos_no_aplicables_certificado`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria` y `hallazgo`.

---

## 5. Motor de Cobertura Normativa LTREE y Competencias (`02_cobertura_normativa.sql`)

Todas las funciones se ejecutan como `STABLE SECURITY DEFINER SET search_path = public, pg_temp`:

### 5.1 Evaluación Recursiva de Cobertura
- **`public.evaluar_cobertura_certificado(p_id_certificado UUID)`**  
  Retorna `(id_requisito, codigo, ruta_materializada, estado_cobertura)`. Emplea CTEs (`CertNorma`, `RequisitosCubiertosDirectos`, `RequisitosNoAplicablesDirectos`, `AncestrosCubiertos`, `AncestrosNoAplicables`, `EstadoPriorizado`) usando el operador jerárquico `@>` de `ltree` para propagar la cobertura desde requisitos hoja hacia sus cláusulas padre con prioridad estricta:
  1. `CUBIERTO` (asignado a al menos un `proceso` vía `requisitos_por_proceso`, o ancestro `ltree` de un requisito cubierto).
  2. `NO_APLICABLE` (marcado en `requisitos_no_aplicables_certificado` o ancestro no cubierto).
  3. `PENDIENTE` (resto de cláusulas de la norma sin asignar).
- **`public.cobertura_normativa_certificado(p_id_certificado UUID)`**  
  Wrapper SQL directo utilizado vía RPC desde el frontend (`/rest/v1/rpc/cobertura_normativa_certificado`) que expone `(id_requisito, codigo, estado_cobertura)`.

### 5.2 Cruce de Competencia Técnica de Auditores
- **`public.auditor_esta_calificado(p_id_auditor UUID, p_id_norma UUID, p_id_sector_iaf UUID, p_id_subsector_iaf UUID DEFAULT NULL) RETURNS BOOLEAN`**  
  Comprueba simultáneamente la calificación en `norma_auditor`, `sector_iaf_auditor` y, cuando se especifica `p_id_subsector_iaf`, la calificación específica en `subsector_iaf_auditor`.
- **`public.auditores_calificados_para_certificado(p_id_certificado UUID)`**  
  Lista los auditores elegibles `(id_auditor, nombre)` que cumplen norma + sector IAF del certificado evaluado.

---

## 6. Índices de Optimización (`03_indices_optimizacion.sql`)

Se definen **33 índices** especializados para acelerar consultas jerárquicas `ltree`, búsquedas administrativas, joins RLS y trazabilidad forense:

- **Jerarquía LTREE y Requisitos (4):** `idx_requisito_ruta_gist` (`USING GIST (ruta_materializada)`), `idx_requisito_padre`, `idx_requisito_norma_padre`, `idx_requisito_norma_codigo`.
- **Organizaciones y Acceso Cliente (3):** `idx_organizacion_nombre`, `idx_organizacion_rif` (parcial `WHERE rif IS NOT NULL`), `idx_client_org_access_lookup`.
- **Certificados (3):** `idx_certificado_numero`, `idx_certificado_organizacion`, `idx_certificado_norma_iaf`.
- **Competencias de Auditores (5):** `idx_auditor_nombre`, `idx_norma_auditor_compuesta`, `idx_norma_auditor_norma_lookup`, `idx_sector_iaf_auditor_compuesta`, `idx_sector_iaf_auditor_sector_lookup`.
- **Sub-Sectores IAF y Acreditaciones (5):** `idx_subsector_sector`, `idx_subsector_codigo`, `idx_subsector_auditor`, `idx_acreditacion_norma_org`, `idx_organismo_codigo`.
- **Sitios, Procesos y Cobertura (6):** `idx_sitio_cert_numero` (`id_certificado, numero_sitio`), `idx_proceso_cert_tipo` (`id_certificado, tipo`), `idx_proceso_certificado`, `idx_turnos_por_sitio_lookup`, `idx_req_proceso_lookup`, `idx_req_no_aplicables_certificado`.
- **Auditorías, Hallazgos y Bitácora Forense (7):** `idx_equipo_auditor_lookup`, `idx_sitios_auditoria_compuesto`, `idx_proc_sitio_aud_compuesto`, `idx_procesos_sitio_auditoria_compuesto`, `idx_auditoria_fecha`, `idx_hallazgo_auditoria`, `idx_audit_log_entity_lookup` (`table_name, record_id`).

---

## 7. Datos de Prueba e Identidades (`05_usuarios.sql` y `06_datos_prueba.sql`)

- **`05_usuarios.sql`:** Purga usuarios de prueba previos e inserta 4 cuentas confirmadas en `auth.users` y `public.profiles` con contraseña `Password123*` (usando `crypt(..., gen_salt('bf'))` y cadenas vacías `''` en los campos de token de GoTrue):
  - `admin@fondonorma.test` (`ADMIN`, `APPROVED`, UUID `11111111-1111-1111-1111-111111111111`)
  - `worker@fondonorma.test` (`WORKER`, `APPROVED`, UUID `22222222-2222-2222-2222-222222222222`)
  - `auditor@fondonorma.test` (`AUDITOR`, `APPROVED`, UUID `33333333-3333-3333-3333-333333333333`)
  - `client@fondonorma.test` (`CLIENT`, `APPROVED`, UUID `44444444-4444-4444-4444-444444444444`)
- **`06_datos_prueba.sql`:** Siembra de forma idempotente 8 estatus canónicos, 9 modalidades de auditoría, 3 metodologías, 5 sectores IAF (`14`, `17`, `28`, `33`, `35`), 4 sub-sectores IAF (`17.1`, `17.2`, `28.1`, `33.1`), 3 organismos de acreditación (`ENAC`, `UKAS`, `ANAB`), 4 normas expandidas (`ISO 9001:2015`, `ISO 14001:2015`, `ISO 45001:2018`, `ISO/IEC 27001:2022`), 2 acreditaciones activas, cláusulas `ltree`, auditores con competencias cruzadas, 2 organizaciones (`Iberometal Componentes S.A.` RIF `J-30492817-0` y `CyberCloud Solutions S.L.` RIF `J-40819234-5`), acceso cliente aprobado, certificado `FN-QMS-2024-001` con declaración `alcance`, Sitios (`0` `Sede Principal HQ` y `1` `Planta Valencia`), turnos, 3 procesos (`Medular`, `Estratégico`, `De Apoyo`), exclusión justificada de cláusula `5.1`, auditoría de `Renovación` (`Presencial`), equipo auditor y hallazgo `NC_MENOR` abierto.
