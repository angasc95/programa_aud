## **📌 Fase 4: Layout Global Frontend SPA y Sistema de Navegación por Dominios**

### **Objetivo ArquITECTónico**

Con la base de datos relacional y las reglas de negocio operativas en el backend, la cuarta fase se centra en la maquetación y estructuración de la interfaz de usuario utilizando el patrón de Single-Page Application (SPA)1. El objetivo es proporcionar una experiencia de usuario interactiva y fluida que traduzca el modelo relacional subyacente en una interfaz visual dividida por dominios operacionales, permitiendo la conmutación entre módulos sin recargas de página y ofreciendo herramientas avanzadas de búsqueda y presentación de datos1.

### **Diseño de Navegación e Interacción**

El diseño de la aplicación organiza los componentes de interfaz en una estructura fija de navegación y un área de trabajo dinámica1:

* **Cabecera Global (Header SPA) y Perfil de Usuario:** Se maqueta una barra superior fija que presenta la identidad del usuario activo, su rol asignado y una etiqueta visual que refleja su estado de aprobación1. En la esquina superior derecha se ubica un menú desplegable interactivo accesible al pasar el cursor (*hover dropdown*) o mediante eventos de toque y teclado1. Este menú ofrece opciones para la gestión del perfil personal, cierre de sesión y, en el caso de administradores aprobados, accesos directos al panel de aprobación de nuevos registros y al verificador de estado de la base de datos1.  
* **Navegación Desplegable por Dominios Operativos:** Ubicada estratégicamente a la izquierda del menú de usuario, la barra de navegación agrupa las funcionalidades del sistema en tres menús desplegables principales (*hover dropdowns*)1:  
  1. *Dominio Auditorías:* Proporciona acceso a la programación de eventos de auditoría, selección de fechas y visualización del cuerpo de evaluadores1.  
  2. *Dominio Certificación:* Concentra la administración de organizaciones clientes, certificados otorgados, sedes multisitio, mapa de procesos y esquemas de turnos1.  
  3. *Dominio Extra:* Permite la consulta y mantenimiento de catálogos base (normas, requisitos ltree, sectores IAF, estados, tipos de auditoría y metodologías)1.  
* **Controles de Búsqueda y Alternancia de Vistas:** El contenedor dinámico principal integra una barra de búsqueda multi-criterio en tiempo real1. El filtro procesa simultáneamente múltiples atributos, permitiendo localizar datos al escribir números de certificado, nombres de empresas o identificaciones fiscales1. Adicionalmente, se implementa un conmutador de presentación que permite alternar la visualización entre dos vistas principales1:  
  * *Vista Grid (Tarjetas Relacionales):* Muestra los registros en forma de tarjetas que resumen visualmente el estado del certificado, sus sitios cubiertos y el nivel de avance normativo1.  
  * *Vista de Lista (Tabla Compacta):* Organiza la información en una tabla de alta densidad de datos, ideal para la revisión masiva de entidades y análisis comparativo rápido1.

### **Criterios de Aceptación Técnica**

* Navegación reactiva entre los tres dominios funcionales y actualización del área de trabajo sin recargar el documento HTML1.  
* Filtrado en tiempo real mediante la barra de búsqueda multi-criterio sobre colecciones de certificados y organizaciones con respuesta inmediata en el cliente1.  
* Comportamiento responsivo del layout global, garantizando la correcta adaptación visual en diversas resoluciones y el funcionamiento de menús interactivos por eventos de cursor, toque o teclado1.
