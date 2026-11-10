## **📌 Fase 5: Vistas Relacionales Jerárquicas (Drill-Down), Dominio de Auditorías y RLS Final**

### **Objetivo Arquitectónico**

La quinta y última fase completa la arquitectura del sistema integrando el módulo de auditorías de campo, la navegación relacional en profundidad (*Drill-Down*) y el endurecimiento definitivo de la seguridad a nivel de datos mediante políticas de Row Level Security (RLS)1. Esta etapa garantiza que los usuarios puedan transicionar desde datos generales hasta registros operativos específicos, blindando la información para que cada rol solo acceda a los datos que le corresponden según la normativa de acreditación1.

### **Flujo Drill-Down y Control de Acceso Granular**

* **Navegación en Cascada (*Drill-Down*):** El sistema proporciona una experiencia de exploración jerárquica1. Un usuario puede iniciar su análisis en la ficha consolidada de una organización cliente y profundizar gradualmente hacia sus certificados activos; desde allí, expandir las sedes multisitio amparadas, los turnos operativos y los procesos mapeados, alcanzando finalmente la matriz de requisitos vinculados y el historial de hallazgos detectados1. Esta navegación preserva el contexto de los componentes hijo en todo momento1.  
* **Dominio de Auditorías y Registro de Hallazgos:** Se implementa el flujo operativo para las evaluaciones de campo1:  
  1. *Planificación del Evento:* Registro del certificado a auditar, tipo de auditoría (Etapa 1, Etapa 2, Vigilancia, Recertificación), metodología de ejecución y fechas programadas2.  
  2. *Designación del Equipo Evaluador:* Asignación de auditores cualificados especificando su rol en la auditoría (Auditor Líder o Auditor)2.  
  3. *Alcance de Campo:* Selección de las sedes, turnos y procesos específicos a evaluar durante la auditoría2.  
  4. *Levantamiento de Hallazgos:* Registro de desviaciones o evidencias clasificadas bajo las categorías estándar: No Conformidad Mayor (NC\_MAYOR), No Conformidad Menor (NC\_MENOR), Observación (OBSERVACION) u Oportunidad de Mejora (OPORTUNIDAD\_MEJORA), vinculadas a un requisito y a un proceso determinado2.  
* **Endurecimiento RLS por Rol:** La base de datos aplica políticas de seguridad a nivel de filas sustentadas en funciones auxiliares ejecutadas en contexto privilegiado (SECURITY DEFINER), garantizando el aislamiento de datos por rol2:

| Rol de Usuario | Permisos sobre Catálogos y Perfiles | Permisos sobre Negocio y Auditorías |
| :---- | :---- | :---- |
| **Administrador (ADMIN)** | Lectura y modificación total de catálogos maestros, perfiles de usuario y lectura de la bitácora (audit\_log)2. | Acceso global de lectura, modificación y eliminación sobre todas las entidades del negocio2. |
| **Gestor Operativo (WORKER)** | Lectura de catálogos maestros y lectura de perfiles de usuario del sistema2. | Lectura y escritura operacional global sobre organizaciones, certificados, sitios, procesos y auditorías2. |
| **Auditor Técnico (AUDITOR)** | Lectura de catálogos maestros de referencia y perfiles de usuarios asignados2. | Lectura restringida a auditorías donde figura en el equipo evaluador; creación y edición de hallazgos en sus auditorías6. |
| **Cliente Empresa (CLIENT)** | Lectura pública de catálogos maestros de referencia2. | Lectura acotada exclusivamente a la organización cliente para la cual posea una solicitud autorizada (APPROVED)2. |

### **Criterios de Aceptación Técnica**

* Navegación relacional multinivel funcional (*Drill-Down*) que permite inspeccionar la jerarquía completa de datos sin pérdida de contexto ni fallos de renderizado en la SPA1.  
* Aislamiento estricto de lecturas y escrituras mediante políticas RLS verificadas individualmente para los roles ADMIN, WORKER, AUDITOR y CLIENT2.  
* Cumplimiento de las reglas de imparcialidad y confidencialidad ISO: imposibilidad de que un auditor modifique hallazgos de auditorías en las que no esté asignado o de que un cliente acceda a información de otras empresas2.
