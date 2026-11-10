## **📌 Fase 2: Catálogos Maestros y Competencias Técnicas (Dominio Extra y Auditores)**

### **Objetivo Arquitectónico**

La segunda fase aborda el desacoplamiento formal de los catálogos estáticos y de referencia del sistema, así como el modelado relacional de la matriz de competencias técnicas del cuerpo auditor1. El propósito de esta fase es aislar la información normativa parametrizable del núcleo operacional de certificación, construyendo una estructura de datos capaz de validar automáticamente si un auditor posee las cualificaciones requeridas antes de ser asignado a un evento de auditoría1.

### **Lógica de Modelado y Competencias**

El Dominio Extra concentra las entidades maestras que definen el marco normativo e industrial sobre el cual opera el organismo de certificación1:

* **Jerarquía Normativa y Rutas Materializadas (ltree):** Las normas de sistemas de gestión (tales como ISO 9001, ISO 14001, ISO 45001 e ISO/IEC 27001\) se estructuran en el nivel superior de los catálogos2. Sin embargo, sus cláusulas y sub-requisitos normativos requieren una representación jerárquica detallada2. Para evitar consultas recursivas lentas mediante uniones repetitivas de claves relacionales, el sistema adopta la extensión ltree1. Cada requisito almacena una ruta materializada codificada que representa su posición exacta en el árbol normativo (por ejemplo, rutas que enlazan cláusulas principales con sub-cláusulas operativas específicas)2. Esta abstracción permite ejecutar búsquedas de jerarquía completa, filtrado de ancestros y consultas de descendencia directa mediante operadores de coincidencia de rutas altamente eficientes2.  
* **Sectores IAF y Catálogos de Soporte:** Se modelan los sectores de acreditación definidos por el Foro Internacional de Acreditación (IAF), los estados del ciclo de vida del certificado, las modalidades de auditoría (Etapa 1, Etapa 2, Vigilancia 1, Vigilancia 2, Recertificación y Extraordinaria) y las metodologías de evaluación (presencial, remota o híbrida)2.  
* **Matriz Cruzada de Competencias de Auditores:** La cualificación del personal auditor no se almacena como texto libre, sino como una estructura de tablas relacionales cruzadas1. La entidad del auditor se vincula mediante tablas de unión compuestas con las normas en las que está cualificado y con los sectores IAF en los que posee experiencia técnica demostrada2.

Para optimizar las consultas que verifican la disponibilidad de evaluadores calificados, se despliega una estrategia de indexación especializada: se utilizan índices GiST sobre las rutas materializadas de los requisitos y se combinan con índices B-Tree sobre las claves compuestas de las tablas de competencia de auditores1. Esta configuración permite resolver la validación de aptitudes técnicas en tiempos inferiores a 10 milisegundos, garantizando que el motor de asignación opere sin latencia1.

### **Criterios de Aceptación Técnica**

* Representación jerárquica de cláusulas y sub-requisitos normativos indexada correctamente mediante el tipo de dato ltree y árboles de búsqueda GiST1.  
* Ejecución de consultas de validación de competencia de auditores (cruce compuesto entre auditor, norma ISO y sector IAF) con tiempos de respuesta confirmados por debajo de los 10 milisegundos1.  
* Aislamiento de los catálogos maestros mediante políticas de seguridad que permiten lectura a usuarios autenticados pero restringen la modificación de normas y requisitos exclusivamente a administradores aprobados2.
