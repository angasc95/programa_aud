## **📌 Fase 3: Dominio de Certificación, Estructuras Operativas y Motor de Cobertura ISO**

### **Objetivo Arquitectónico**

Esta fase consolida la representación conceptual del negocio de certificación, modelando la estructura de las empresas clientes, sus sedes físicas o virtuales, sus mapas de procesos y sus regímenes de turnos productivos1. Asimismo, incorpora el algoritmo central del backend: un motor automatizado de cálculo de cobertura normativa capaz de verificar recursivamente si el alcance de un certificado cumple con la totalidad de los requisitos exigidos por la norma evaluada1.

### **Lógica de Operación y Cobertura**

El Dominio de Certificación articula la relación relacional entre la organización titular y sus componentes operativos1:

* **Modelado Multisitio y Estructura Operativa:** Un certificado de evaluación de la conformidad pertenece a una organización cliente y se encuentra vinculado a un sector IAF, un estatus operativo y una norma certificable2. Para soportar esquemas organizacionales complejos, el sistema modela el concepto multisitio, permitiendo asociar múltiples sedes o plantas físicas bajo un único certificado1. Adicionalmente, se registran los procesos globales de la empresa y se asignan los turnos de trabajo específicos que operan en cada sitio, asegurando la trazabilidad operacional exigida para la planificación de auditorías1.  
* **Asignación de Requisitos y Exclusiones Formales:** La plataforma vincula cada proceso operativo con las cláusulas normativas que gestiona directamente2. Para aquellas cláusulas que admiten exclusión justificada (como requisitos de diseño cuando la organización no desarrolla productos), el sistema almacena dichos elementos en una tabla de requisitos no aplicables vinculada al certificado2.  
* **Motor Recursivo de Cobertura Normativa (evaluar\_cobertura\_certificado):** Para evaluar si el alcance de un certificado cumple con la norma ISO aplicable, se implementa una función almacenada basada en expresiones de tabla comunes (CTE) que analiza la jerarquía ltree de requisitos y clasifica cada cláusula en tres estados lógicos1:  
  * **Estado CUBIERTO:** Se otorga a un requisito cuando está directamente mapeado a uno o más procesos declarados en el certificado1. Este estado se propaga automáticamente hacia las cláusulas padre en la jerarquía mediante el operador de ancestro (@\>), haciendo que si todas las sub-cláusulas de una sección están cubiertas, la sección superior se considere plenamente atendida2.  
  * **Estado NO\_APLICABLE:** Se asigna cuando el requisito cuenta con un registro explícito en la tabla de exclusiones formalmente documentadas para ese certificado1. Al igual que en la cobertura directa, el estado propaga la no aplicabilidad a la cadena jerárquica ascendente4.  
  * **Estado PENDIENTE:** Se asigna por defecto a cualquier requisito o sub-cláusula que no esté vinculado a un proceso activo ni cuente con una justificación formal de exclusión1.

El motor evalúa de forma transparente el grado de cumplimiento de un certificado, impidiendo la emisión o cierre de programas de auditoría cuando existen requisitos normativos en estado pendiente1.

### **Criterios de Aceptación Técnica**

| Componente Operativo | Requisito de Integridad Técnica | Mecanismo de Validación |
| :---- | :---- | :---- |
| **Evaluación de Cobertura ISO** | Resolución exacta e instantánea de estados (CUBIERTO, NO\_APLICABLE, PENDIENTE) para cada cláusula de la norma1. | Invocación de la función de cobertura evaluando los resultados devueltos para un certificado activo1. |
| **Integridad Relacional Multisitio** | Vinculación coherente entre organización cliente, certificados emitidos, sedes físicas, procesos y turnos1. | Verificación de restricciones de clave foránea y claves compuestas únicas sobre la estructura del certificado2. |
| **Integridad Subconjunto ISO** | Imposibilidad de asignar sitios o procesos pertenecientes a un certificado diferente durante la planificación2. | Ejecución de disparadores de integridad que validan la coherencia entre el certificado de la auditoría y sus componentes2. |
