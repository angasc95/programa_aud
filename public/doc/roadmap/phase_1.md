## **📌 Fase 1: Infraestructura Base, Autenticación y Trazabilidad Absoluta**

### **Objetivo Arquitectónico**

La primera fase tiene como propósito fundamental establecer los cimientos de infraestructura, seguridad e inmutabilidad sobre los cuales se soporta todo el ecosistema transaccional del sistema1. A nivel de base de datos, esta etapa resuelve la instalación de extensiones clave en PostgreSQL, la definición del modelo de identidad de usuarios integrado con el servicio de autenticación nativo y la creación de un motor global de trazabilidad inmutable1. El objetivo primario es impedir de forma absoluta que cualquier usuario no autenticado o no autorizado administrativamente pueda interactuar con las entidades del negocio, garantizando la no repudiación de cada mutación de datos desde el inicio del ciclo de vida de la aplicación1.

### **Componentes y Mecanismos Clave**

La infraestructura de datos se inicia con el aprovisionamiento de extensiones del motor relacional: la extensión para la generación de identificadores únicos universales (UUID versión 4\) y la extensión de rutas jerárquicas (ltree), preparadas para la gestión de datos normativos en etapas posteriores1. Sobre esta capa se despliega el modelo de control de acceso basado en roles (RBAC) y la gestión de estados de cuenta2.

* **Mecanismo de Registro y Máquina de Estados de Usuario:** El flujo de incorporación de usuarios vincula la tabla nativa de autenticación de la plataforma con la entidad de perfiles de usuario2. Cada vez que se genera un nuevo registro en el sistema, un disparador automático procesa la transacción y asigna el estado inicial del perfil en función del rol solicitado2. Si el usuario solicita el rol de cliente (CLIENT), su perfil se aprueba automáticamente (APPROVED), otorgándole acceso inmediato a las vistas públicas y a la solicitud de vinculación con empresas titulares2. Por el contrario, si la cuenta solicita roles privilegiados como administrador (ADMIN), gestor operativo (WORKER) o auditor técnico (AUDITOR), el sistema fuerza el estado pendiente (PENDING)2. Esta regla restrictiva exige que un administrador autorice o rechace (REJECTED) manualmente la cuenta antes de otorgar privilegios operativos1.  
* **Sistema de Bitácora y Auditoría Inmutable (audit\_log):** Para dar cumplimiento a las exigencias de imparcialidad y auditabilidad exigidas por la norma ISO/IEC 17021-1:2015, se implementa una central de trazabilidad en la capa de datos1. Mediante una entidad de auditoría dedicada y una función disparadora genérica asociada a las tablas clave del negocio, cualquier operación de inserción, actualización o eliminación captura automáticamente tres dimensiones informativas1:  
  1. El identificador único del usuario responsable derivado directamente del contexto cifrado de la sesión activa (auth.uid())1.  
  2. El sello de tiempo exacto de la transacción con precisión de zona horaria1.  
  3. El diferencial completo de datos, almacenando el estado previo de los datos (en operaciones de modificación o borrado) y el estado posterior (en operaciones de inserción o modificación) en formato JSONB1.

Este mecanismo opera de forma transparente e independiente del código de la aplicación frontend, garantizando una trazabilidad inalterable1.

### **Criterios de Aceptación Técnica**

| Componente Arquitectónico | Condición de Aceptación Técnica | Mecanismo de Verificación |
| :---- | :---- | :---- |
| **Control de Registro de Usuarios** | Todo registro para roles operativos o administrativos debe crearse obligatoriamente en estado de espera (PENDING)1. | Inspección de perfiles creados mediante registro nativo verificando el estado retenido1. |
| **Trazabilidad Inmutable** | Toda mutación DML sobre entidades monitoreadas debe registrar el identificador del usuario (auth.uid()) y el diferencial JSONB1. | Verificación de registros generados en la bitácora de auditoría tras operaciones de prueba1. |
| **Tipos Enumerados del Esquema** | Los tipos enumerados para roles, estados de cuenta y clasificaciones de hallazgos deben estar compilados y aislados2. | Validación de integridad en el esquema relacional sobre los enumerados de usuario y hallazgos2. |
