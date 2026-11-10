## **4\. Resumen de Cierre: Mitigación de Deuda Técnica y Alineación Normativa**

La adopción estrictamente secuencial de estas 5 fases garantiza el cumplimiento integral de las normas **ISO/IEC 17021-1:2015** e **ISO 19011:2018**, previniendo la acumulación de deuda técnica a lo largo del desarrollo de la plataforma1.  
La estrategia metodológica de construir progresivamente el sistema asegura que la estabilidad del esquema relacional sea validada en cada etapa antes de desplegar las capas de interfaz1. Al resolver en primer lugar la infraestructura de seguridad, la autenticación y la trazabilidad inmutable (Fase 1), el proyecto garantiza que ninguna mutación de datos ocurra sin el debido registro forense en la bitácora (audit\_log), satisfaciendo el requisito de imparcialidad y control de cambios exigido a los organismos de certificación1.  
La posterior estructuración de los catálogos maestros y la matriz de competencias (Fase 2\) establece el marco normativo necesario para verificar objetivamente la calificación del personal auditor mediante consultas de alta velocidad sobre rutas ltree e índices especializados1. Por su parte, el modelado del dominio de certificación y el desarrollo del motor recursivo de cobertura (Fase 3\) resuelven la validación técnica del alcance normativo directamente en el backend, impidiendo la emisión de certificados con cláusulas ISO desatendidas1.  
Finalmente, la integración de la interfaz SPA (Fase 4\) y la implementación de la navegación profunda (*Drill-Down*) junto con el modelo definitivo de Row Level Security (Fase 5\) ofrecen una experiencia de usuario moderna y fluida sin comprometer la seguridad1. Esta separación de responsabilidades garantiza que la confidencialidad de las empresas evaluadas quede blindada a nivel de base de datos2. El resultado es un sistema técnicamente mantenible, auditable ante organismos de acreditación y preparado para escalar operativamente sin requerir reestructuraciones drásticas en su arquitectura subyacente1.

#### **Obras citadas**

> 1. [https\://drive.google.com/open?id=1jLBwmb-GiI4kwlaft0NH-sweQzT\_P7SCDBOliu8JtcI](https://drive.google.com/open?id=1jLBwmb-GiI4kwlaft0NH-sweQzT_P7SCDBOliu8JtcI)  
> 2. `public/doc/project_resume.md`
> 3. `public/supabase/queries/01_creacion.sql`
> 4. `public/supabase/queries/02_cobertura_normativa.sql`
> 5. `public/supabase/queries/03_indices_optimizacion.sql`
> 6. `public/supabase/queries/04_rls.sql`
> 7. `public/supabase/queries/05_usuarios.sql`
> 8. `public/supabase/queries/06_datos_prueba.sql`