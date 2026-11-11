# Arquitectura de Base de Datos y Motor Normativo (`programa_aud`)

> Documento técnico complementario de [`project_resume.md`](../project_resume.md). Detalla la capa de persistencia en **PostgreSQL (Supabase)** implementada en `public/supabase/queries/` (`00_delete_tables.sql` a `06_datos_prueba.sql`).

---

## 1. Secuencia de Despliegue SQL

Los scripts en `public/supabase/queries/` están numerados para ejecutarse de forma determinista y ordenada (tanto manualmente en el SQL Editor de Supabase como automáticamente desde `POST /api/reset-db`):

| Orden | Archivo | Propósito Principal |
| :---: | :--- | :--- |
| 0 | `00_delete_tables.sql` | Reinicio limpio del esquema `public` (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) y restauración de permisos base para `postgres`, `anon`, `authenticated`, `service_role` y `public`. |
| 1 | `01_creacion.sql` | Extensiones, tipos `ENUM`, 27 tablas relacionales, disparador de registro (`handle_new_user`), triggers de integridad ISO/IEC 17021-1, `audit_log` inmutable y timestamps automáticos. |
| 2 | `02_cobertura_normativa.sql` | Motor jerárquico de cobertura `LTREE` y funciones de validación de competencias técnicas de auditores. |
| 3 | `03_indices_optimizacion.sql` | 27 índices especializados (`GiST` y `B-tree` compuestos/filtrados) sobre los tres dominios y la bitácora de auditoría. |
| 4 | `04_rls.sql` | Doble capa DCL (`GRANT`) + Row Level Security (`ENABLE ROW LEVEL SECURITY`) en las 27 tablas, 7 funciones `SECURITY DEFINER` y políticas granulares por rol. |
| 5 | `05_usuarios.sql` | Limpieza e inserción de las 4 cuentas de prueba confirmadas en `auth.users` y `public.profiles` (`ADMIN`, `WORKER`, `AUDITOR`, `CLIENT`). |
| 6 | `06_datos_prueba.sql` | Semillero idempotente de normas, cláusulas `ltree`, sectores IAF, estatus, tipos, metodologías, auditores, organizaciones, certificados, sedes, procesos, turnos, auditorías y hallazgos. |

---

## 2. Infraestructura Base, Extensiones y Tipos Enumerados (`01_creacion.sql`)

### 2.1 Extensiones PostgreSQL
- **`uuid-ossp`:** Generación de claves primarias UUID v4 mediante `uuid_generate_v4()`.
- **`ltree`:** Almacenamiento e indexación de rutas jerárquicas materializadas para cláusulas normativas ISO (ej. `4`, `4.4_1`, `8.8_5`).

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

## 3. Modelo Entidad-Relación: 27 Tablas por Dominio

### 3.1 Gobernanza e Identidad (2 tablas)
| Tabla | Propósito |
| :--- | :--- |
| `public.profiles` | Perfil operativo, rol RBAC y estado de aprobación del usuario autenticado. |
| `public.audit_log` | Bitácora forense inmutable de mutaciones DML (`INSERT`, `UPDATE`, `DELETE`) con `old_data` / `new_data` en `JSONB`, `performed_by` y `performed_at`. |

### 3.2 Dominio 1: Catálogos Maestros y Competencias de Auditores (9 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `norma` | Esquemas y normas certificables (`ISO 9001:2015`, `14001:2015`, `45001:2018`, `27001:2022`). | `norma UNIQUE` |
| `requisito` | Cláusulas normativas jerárquicas por norma. | `id_requisito_padre` (`ON DELETE RESTRICT`), `ruta_materializada LTREE`, `unique_norma_requisito_codigo` |
| `sector_iaf` | Sectores productivos IAF (`sector INTEGER UNIQUE`). | `sector UNIQUE` |
| `estatus` | Estados operativos (`ACTIVO`, `EN_PROCESO`, `SUSPENDIDO`, `CANCELADO`, `PLANIFICADA`, `EN_EJECUCION`, `CERRADA`). | `estatus UNIQUE` |
| `tipo_auditoria` | Modalidades de ciclo (`ETAPA_1`, `ETAPA_2`, `VIGILANCIA_1`, `VIGILANCIA_2`, `RECERTIFICACION`, `EXTRAORDINARIA`). | `tipo UNIQUE` |
| `metodologia_auditoria` | Modalidades de ejecución (`PRESENCIAL`, `REMOTA`, `HIBRIDA`). | `metodologia UNIQUE` |
| `auditor` | Registro nominal de auditores del organismo. | `id UUID PK` |
| `norma_auditor` | Matriz de normas en las que cada auditor está calificado. | `PK (id_auditor, id_norma)` |
| `sector_iaf_auditor` | Matriz de sectores IAF aprobados por auditor. | `PK (id_auditor, id_sector_iaf)` |

### 3.3 Dominio 2: Organizaciones, Certificados, Estructuras Operativas y Acceso Cliente (9 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `organizacion` | Empresas titulares sujetas a certificación (`nombre`, `rif`, `direccion_fiscal`). | `audit_organizacion_trigger` |
| `client_organization_access` | Vinculación aprobada entre usuarios `CLIENT` y organizaciones específicas. | `unique_usuario_organizacion`, `audit_client_access_trigger` |
| `certificado` | Certificados emitidos por norma, estatus, sector IAF y organización, con bandera `multisitio`. | `numero_certificado UNIQUE`, `audit_certificado_trigger` |
| `sitio` | Sedes físicas o virtuales cubiertas por un certificado. | `unique_sitio_certificado (id_certificado, numero_sitio)` |
| `proceso` | Procesos auditables declarados dentro del alcance de un certificado. | `unique_proceso_certificado (id_certificado, nombre_proceso)` |
| `requisitos_por_proceso` | Mapeo N:M de cláusulas ISO auditadas en cada proceso. | `PK (id_proceso, id_requisito)` |
| `requisitos_no_aplicables_certificado` | Exclusiones formales justificadas a nivel de certificado. | `PK (id_certificado, id_requisito)` |
| `turno` | Catálogo de horarios laborales (`hora_entrada`, `hora_salida`). | `unique_horario_turno` |
| `turnos_por_sitio` | Asignación de turnos operativos a cada sede. | `unique_sitio_turno (id_sitio, id_turno)` |

### 3.4 Dominio 3: Planificación, Ejecución y Hallazgos de Auditoría (7 tablas)
| Tabla | Propósito | Claves / Restricciones Destacadas |
| :--- | :--- | :--- |
| `auditoria` | Eventos de auditoría programados/reprogramados vinculados a certificado, tipo y metodología. | `audit_auditoria_trigger` |
| `comentarios_por_auditoria` | Bitácora técnica de observaciones y seguimiento por evento de auditoría. | `id_auditoria FK CASCADE` |
| `equipo_auditor` | Auditores asignados a una auditoría y su rol (`AUDITOR LIDER`, `AUDITOR`, etc.). | `PK (id_auditoria, id_auditor)` |
| `sitios_por_auditoria` | Sedes incluidas en el plan específico de auditoría. | `unique_auditoria_sitio`, trigger de integridad |
| `turnos_sitio_auditoria` | Turnos específicos evaluados en cada sede durante la auditoría. | trigger de integridad |
| `procesos_sitio_auditoria` | Procesos auditados por sede y turno asignado en la auditoría. | trigger de integridad |
| `hallazgo` | No conformidades y observaciones ISO (`tipo_hallazgo`), evidencia, proceso, requisito y cierre (`cerrado`). | `id_auditoria FK CASCADE` |

---

## 4. Triggers de Integridad, Trazabilidad y Timestamps

### 4.1 Triggers de Integridad de Subconjunto (ISO/IEC 17021-1)
Impiden inconsistencias relacionales entre el certificado de la auditoría y los elementos planificados:
1. **`trg_validar_sitio_auditoria_certificado` (`fn_validar_sitio_auditoria_certificado()`):** En `sitios_por_auditoria`, verifica que `sitio.id_certificado` coincida exactamente con `auditoria.id_certificado`.
2. **`trg_validar_turno_sitio_auditoria` (`fn_validar_turno_sitio_auditoria()`):** En `turnos_sitio_auditoria`, verifica que `turnos_por_sitio.id_sitio` corresponda al mismo `sitio` registrado en `sitios_por_auditoria`.
3. **`trg_validar_proceso_sitio_auditoria_certificado` (`fn_validar_proceso_sitio_auditoria_certificado()`):** En `procesos_sitio_auditoria`, valida dos invariantes simultáneamente: que `proceso.id_certificado` coincida con `auditoria.id_certificado` y que `turnos_sitio_auditoria` pertenezca al mismo `id_sitios_por_auditoria`.

### 4.2 Audit Log Inmutable (`public.audit_log`)
- **`trg_audit_log_immutable` (`prevent_audit_log_mutation()`):** Bloquea cualquier `UPDATE` o `DELETE` sobre `public.audit_log` lanzando una excepción de violación de inmutabilidad.
- **`audit_trigger_func()`:** Registra automáticamente `INSERT`, `UPDATE` y `DELETE` con `auth.uid()` y snapshots JSONB en 4 tablas críticas: `organizacion`, `certificado`, `auditoria` y `client_organization_access`.

### 4.3 Timestamps Automáticos
- **`update_updated_at_column()`** actualiza `NEW.updated_at = NOW()` mediante triggers `BEFORE UPDATE` en 15 tablas: `profiles`, `organizacion`, `norma`, `requisito`, `sector_iaf`, `estatus`, `tipo_auditoria`, `metodologia_auditoria`, `auditor`, `certificado`, `sitio`, `proceso`, `turno`, `auditoria` y `hallazgo`.

---

## 5. Motor de Cobertura Normativa LTREE y Validación de Competencias (`02_cobertura_normativa.sql`)

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
- **`public.auditor_esta_calificado(p_id_auditor UUID, p_id_norma UUID, p_id_sector_iaf UUID) RETURNS BOOLEAN`**  
  Comprueba en sub-10ms si un auditor posee simultáneamente calificación en `norma_auditor` y `sector_iaf_auditor`.
- **`public.auditores_calificados_para_certificado(p_id_certificado UUID)`**  
  Lista los auditores elegibles `(id_auditor, nombre)` que cumplen norma + sector IAF del certificado evaluado.

---

## 6. Índices de Optimización (`03_indices_optimizacion.sql`)

Se definen **27 índices** para acelerar consultas jerárquicas, búsquedas administrativas y joins RLS:
- **Jerarquía LTREE y Requisitos:** `idx_requisito_ruta_gist` (`USING GIST (ruta_materializada)`), `idx_requisito_padre`, `idx_requisito_norma_padre`, `idx_requisito_norma_codigo`.
- **Organizaciones y Acceso Cliente:** `idx_organizacion_nombre`, `idx_organizacion_rif` (parcial `WHERE rif IS NOT NULL`), `idx_client_org_access_lookup`.
- **Certificados:** `idx_certificado_numero`, `idx_certificado_organizacion`, `idx_certificado_norma_iaf`.
- **Competencias de Auditores:** `idx_auditor_nombre`, `idx_norma_auditor_compuesta`, `idx_norma_auditor_norma_lookup`, `idx_sector_iaf_auditor_compuesta`, `idx_sector_iaf_auditor_sector_lookup`.
- **Estructuras de Planta y Cobertura:** `idx_sitio_certificado`, `idx_proceso_certificado`, `idx_turnos_por_sitio_lookup`, `idx_req_proceso_lookup`, `idx_req_no_aplicables_certificado`.
- **Programación y Hallazgos:** `idx_equipo_auditor_lookup`, `idx_sitios_auditoria_compuesto`, `idx_proc_sitio_aud_compuesto`, `idx_procesos_sitio_auditoria_compuesto`, `idx_auditoria_fecha`, `idx_hallazgo_auditoria`, `idx_audit_log_record`.

---

## 7. Datos de Prueba e Identidades (`05_usuarios.sql` y `06_datos_prueba.sql`)

- **`05_usuarios.sql`:** Purga usuarios de prueba previos e inserta 4 cuentas confirmadas en `auth.users` y `public.profiles` con contraseña `Password123*` (usando `crypt(..., gen_salt('bf'))` y cadenas vacías `''` en los campos de token de GoTrue):
  - `admin@fondonorma.test` (`ADMIN`, `APPROVED`, UUID `11111111-1111-1111-1111-111111111111`)
  - `worker@fondonorma.test` (`WORKER`, `APPROVED`, UUID `22222222-2222-2222-2222-222222222222`)
  - `auditor@fondonorma.test` (`AUDITOR`, `APPROVED`, UUID `33333333-3333-3333-3333-333333333333`)
  - `client@fondonorma.test` (`CLIENT`, `APPROVED`, UUID `44444444-4444-4444-4444-444444444444`)
- **`06_datos_prueba.sql`:** Siembra de forma idempotente normas (`ISO 9001:2015`, `ISO 14001:2015`, `ISO 45001:2018`, `ISO/IEC 27001:2022`), cláusulas jerárquicas `ltree`, sectores IAF (`17`, `28`, `33`), estatus, tipos, metodologías, auditores (incluyendo al `auditor@fondonorma.test`), organizaciones (`Iberometal Componentes S.A.` RIF `J-30492817-0` y `CyberCloud Solutions S.L.` RIF `J-91827364-5`), acceso cliente aprobado, certificado `FN-QMS-2024-001`, sede `Planta Valencia`, proceso `Troquelado y Fundición`, turno diurno, auditoría de recertificación, equipo auditor y un hallazgo `NC_MENOR` abierto.
