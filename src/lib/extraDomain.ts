/**
 * Domain "Extra" (Block 3) Core Data Models and Logic
 * Aligned with ISO/IEC 17021-1:2015, ISO 19011:2018, and IAF Mandatory Documents.
 */

export interface NormaEntity {
  id: string;
  codigo: string;
  titulo: string;
  estatus: 'Vigente' | 'En Revisión' | 'Obsoleta';
  esquema: string;
  fecha_publicacion: string;
  norma: string;
  clausulas_count: number;
  acreditaciones_count: number;
}

export interface OrganismoAcreditacion {
  id: string;
  codigo: string;
  nombre: string;
  pais: string;
  sitio_web?: string;
}

export interface AcreditacionNormaIaf {
  id: string;
  id_organismo: string;
  organismo_codigo: string;
  organismo_nombre: string;
  organismo_pais: string;
  id_norma: string;
  norma_codigo: string;
  id_sector_iaf?: string;
  sector_iaf_numero?: number;
  sector_iaf_descripcion?: string;
  numero_acreditacion: string;
  fecha_concesion: string;
  fecha_vencimiento?: string;
  estatus: 'Activa' | 'En Renovación' | 'Suspendida';
}

export interface RequisitoLtree {
  id: string;
  id_norma: string;
  norma_codigo: string;
  id_requisito_padre?: string | null;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ruta_materializada: string;
  nivel: number;
  es_padre: boolean;
}

export interface SectorIafEntity {
  id: string;
  sector: number;
  descripcion: string;
  subsectores_count: number;
  auditores_count: number;
}

export interface SubsectorIafEntity {
  id: string;
  id_sector_iaf: string;
  sector_numero: number;
  codigo: string;
  descripcion: string;
  categoria_riesgo: 'ALTO' | 'MEDIO' | 'BAJO';
  auditores_nombres: string[];
}

export interface EstatusCatalogItem {
  id: string;
  estatus: string;
  descripcion: string;
  categoria_aplicable: string;
  color_token: string;
  usage_count: number;
}

export interface TipoAuditoriaCatalogItem {
  id: string;
  tipo: string;
  etapa_ciclo: string;
  descripcion: string;
  duracion_formula: string;
  reporte_requerido: string;
  usage_count: number;
}

export interface MetodologiaAuditoriaCatalogItem {
  id: string;
  metodologia: string;
  descripcion: string;
  protocolo_tic: string;
  regla_muestreo: string;
  seguridad_confidencialidad: string;
  usage_count: number;
}

// ---------------------------------------------------------------------------
// Seed Data (Synchronized with 06_datos_prueba.sql and ISO normative models)
// ---------------------------------------------------------------------------

export const INITIAL_ORGANISMOS: OrganismoAcreditacion[] = [
  {
    id: 'db000000-0000-0000-0000-000000000001',
    codigo: 'ENAC',
    nombre: 'Entidad Nacional de Acreditación',
    pais: 'España',
    sitio_web: 'https://www.enac.es',
  },
  {
    id: 'db000000-0000-0000-0000-000000000002',
    codigo: 'UKAS',
    nombre: 'United Kingdom Accreditation Service',
    pais: 'Reino Unido',
    sitio_web: 'https://www.ukas.com',
  },
  {
    id: 'db000000-0000-0000-0000-000000000003',
    codigo: 'ANAB',
    nombre: 'ANSI National Accreditation Board',
    pais: 'Estados Unidos',
    sitio_web: 'https://anab.ansi.org',
  },
];

export const INITIAL_NORMAS: NormaEntity[] = [
  {
    id: 'e0000000-0000-0000-0000-000000009001',
    esquema: 'SGC - Calidad',
    codigo: 'ISO 9001:2015',
    titulo: 'Sistemas de Gestión de la Calidad — Requisitos',
    estatus: 'Vigente',
    fecha_publicacion: '2015-09-15',
    norma: 'ISO 9001:2015',
    clausulas_count: 7,
    acreditaciones_count: 2,
  },
  {
    id: 'e0000000-0000-0000-0000-000000014001',
    esquema: 'SGA - Gestión Ambiental',
    codigo: 'ISO 14001:2015',
    titulo: 'Sistemas de Gestión Ambiental — Requisitos con orientación para su uso',
    estatus: 'Vigente',
    fecha_publicacion: '2015-09-15',
    norma: 'ISO 14001:2015',
    clausulas_count: 5,
    acreditaciones_count: 1,
  },
  {
    id: 'e0000000-0000-0000-0000-000000045001',
    esquema: 'SST - Seguridad y Salud Laboral',
    codigo: 'ISO 45001:2018',
    titulo: 'Sistemas de Gestión de la Seguridad y Salud en el Trabajo — Requisitos',
    estatus: 'Vigente',
    fecha_publicacion: '2018-03-12',
    norma: 'ISO 45001:2018',
    clausulas_count: 6,
    acreditaciones_count: 1,
  },
  {
    id: 'e0000000-0000-0000-0000-000000027001',
    esquema: 'SGSI - Seguridad de la Información',
    codigo: 'ISO/IEC 27001:2022',
    titulo: 'Seguridad de la información, ciberseguridad y protección de la privacidad — Sistemas de gestión',
    estatus: 'Vigente',
    fecha_publicacion: '2022-10-25',
    norma: 'ISO/IEC 27001:2022',
    clausulas_count: 8,
    acreditaciones_count: 1,
  },
];

export const INITIAL_ACREDITACIONES: AcreditacionNormaIaf[] = [
  {
    id: 'dc000000-0000-0000-0000-000000000001',
    id_organismo: 'db000000-0000-0000-0000-000000000001',
    organismo_codigo: 'ENAC',
    organismo_nombre: 'Entidad Nacional de Acreditación',
    organismo_pais: 'España',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
    sector_iaf_numero: 17,
    sector_iaf_descripcion: 'Metales básicos y productos metálicos elaborados',
    numero_acreditacion: '01/C-SC001',
    fecha_concesion: '2020-01-15',
    fecha_vencimiento: '2028-01-14',
    estatus: 'Activa',
  },
  {
    id: 'dc000000-0000-0000-0000-000000000002',
    id_organismo: 'db000000-0000-0000-0000-000000000002',
    organismo_codigo: 'UKAS',
    organismo_nombre: 'United Kingdom Accreditation Service',
    organismo_pais: 'Reino Unido',
    id_norma: 'e0000000-0000-0000-0000-000000014001',
    norma_codigo: 'ISO 14001:2015',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
    sector_iaf_numero: 17,
    sector_iaf_descripcion: 'Metales básicos y productos metálicos elaborados',
    numero_acreditacion: '0044-EMS',
    fecha_concesion: '2021-06-01',
    fecha_vencimiento: '2027-05-31',
    estatus: 'Activa',
  },
  {
    id: 'dc000000-0000-0000-0000-000000000003',
    id_organismo: 'db000000-0000-0000-0000-000000000003',
    organismo_codigo: 'ANAB',
    organismo_nombre: 'ANSI National Accreditation Board',
    organismo_pais: 'Estados Unidos',
    id_norma: 'e0000000-0000-0000-0000-000000027001',
    norma_codigo: 'ISO/IEC 27001:2022',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000033',
    sector_iaf_numero: 33,
    sector_iaf_descripcion: 'Tecnología de la información y comunicaciones',
    numero_acreditacion: 'ANAB-ISMS-089',
    fecha_concesion: '2023-02-10',
    fecha_vencimiento: '2029-02-09',
    estatus: 'Activa',
  },
];

export const INITIAL_REQUISITOS_LTREE: RequisitoLtree[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000004',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: null,
    codigo: '4',
    titulo: 'Contexto de la Organización',
    descripcion: 'Comprensión de la organización, factores externos e internos y alcance del sistema.',
    ruta_materializada: '4',
    nivel: 1,
    es_padre: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000041',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: 'f0000000-0000-0000-0000-000000000004',
    codigo: '4.1',
    titulo: 'Comprensión de la Organización y de su Contexto',
    descripcion: 'Determinación de cuestiones externas e internas pertinentes para su propósito y dirección estratégica.',
    ruta_materializada: '4.4_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000042',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: 'f0000000-0000-0000-0000-000000000004',
    codigo: '4.2',
    titulo: 'Comprensión de las Necesidades y Expectativas de las Partes Interesadas',
    descripcion: 'Determinación de partes interesadas pertinentes y sus requisitos aplicables.',
    ruta_materializada: '4.4_2',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000005',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: null,
    codigo: '5',
    titulo: 'Liderazgo',
    descripcion: 'Compromiso de la alta dirección, enfoque al cliente y política de la calidad.',
    ruta_materializada: '5',
    nivel: 1,
    es_padre: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000051',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: 'f0000000-0000-0000-0000-000000000005',
    codigo: '5.1',
    titulo: 'Liderazgo y Compromiso General',
    descripcion: 'Rendición de cuentas respecto a la eficacia del sistema de gestión y provisión de recursos.',
    ruta_materializada: '5.5_1',
    nivel: 2,
    es_padre: false,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000008',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: null,
    codigo: '8',
    titulo: 'Operación',
    descripcion: 'Planificación, control operacional y requisitos para los productos y servicios.',
    ruta_materializada: '8',
    nivel: 1,
    es_padre: true,
  },
  {
    id: 'f0000000-0000-0000-0000-000000000085',
    id_norma: 'e0000000-0000-0000-0000-000000009001',
    norma_codigo: 'ISO 9001:2015',
    id_requisito_padre: 'f0000000-0000-0000-0000-000000000008',
    codigo: '8.5',
    titulo: 'Producción y Provisión del Servicio',
    descripcion: 'Control de la producción, identificación y trazabilidad, y actividades posteriores a la entrega.',
    ruta_materializada: '8.8_5',
    nivel: 2,
    es_padre: false,
  },
];

export const INITIAL_SECTORES_IAF: SectorIafEntity[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000014',
    sector: 14,
    descripcion: 'Productos químicos, fibras sintéticas y farmacéuticos',
    subsectores_count: 1,
    auditores_count: 1,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000017',
    sector: 17,
    descripcion: 'Metales básicos y productos metálicos elaborados',
    subsectores_count: 2,
    auditores_count: 2,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000028',
    sector: 28,
    descripcion: 'Construcción e ingeniería civil',
    subsectores_count: 1,
    auditores_count: 1,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000033',
    sector: 33,
    descripcion: 'Tecnología de la información y comunicaciones',
    subsectores_count: 1,
    auditores_count: 2,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000035',
    sector: 35,
    descripcion: 'Otros servicios profesionales y de ensayo',
    subsectores_count: 0,
    auditores_count: 1,
  },
];

export const INITIAL_SUBSECTORES_IAF: SubsectorIafEntity[] = [
  {
    id: 'da000000-0000-0000-0000-000000000171',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
    sector_numero: 17,
    codigo: '17.1',
    descripcion: 'Fabricación de metales básicos, fundición y siderurgia',
    categoria_riesgo: 'ALTO',
    auditores_nombres: ['Ing. Carlos Mendoza (Auditor Líder)'],
  },
  {
    id: 'da000000-0000-0000-0000-000000000172',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000017',
    sector_numero: 17,
    codigo: '17.2',
    descripcion: 'Fabricación de productos metálicos elaborados, troquelado y conformado',
    categoria_riesgo: 'MEDIO',
    auditores_nombres: [
      'Ing. Carlos Mendoza (Auditor Líder)',
      'Auditor Técnico Evaluador',
    ],
  },
  {
    id: 'da000000-0000-0000-0000-000000000281',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000028',
    sector_numero: 28,
    codigo: '28.1',
    descripcion: 'Construcción de edificios y obras de ingeniería civil',
    categoria_riesgo: 'MEDIO',
    auditores_nombres: ['Ing. Carlos Mendoza (Auditor Líder)'],
  },
  {
    id: 'da000000-0000-0000-0000-000000000331',
    id_sector_iaf: 'd0000000-0000-0000-0000-000000000033',
    sector_numero: 33,
    codigo: '33.1',
    descripcion: 'Servicios de tecnologías de información y desarrollo de software',
    categoria_riesgo: 'BAJO',
    auditores_nombres: ['Auditor Técnico Evaluador'],
  },
];

export const INITIAL_ESTATUS_CATALOG: EstatusCatalogItem[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    estatus: 'Activo',
    descripcion: 'Entidad, certificado o usuario formalmente válido y en operación regular.',
    categoria_aplicable: 'Certificados, Organizaciones, Usuarios',
    color_token: 'emerald',
    usage_count: 14,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    estatus: 'Estudio',
    descripcion: 'Solicitud inicial, alcance técnico o documentación en fase de revisión documental previa.',
    categoria_aplicable: 'Solicitudes, Expedientes Técnicos',
    color_token: 'sky',
    usage_count: 3,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    estatus: 'Suspendido',
    descripcion: 'Suspensión temporal de la certificación por no conformidades mayores no subsanadas.',
    categoria_aplicable: 'Certificados, Acreditaciones',
    color_token: 'amber',
    usage_count: 2,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    estatus: 'Cancelado',
    descripcion: 'Certificación formally revocada o cancelada definitivamente a solicitud o sanción.',
    categoria_aplicable: 'Certificados, Auditorías Anuladas',
    color_token: 'rose',
    usage_count: 1,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    estatus: 'Planificado',
    descripcion: 'Evento de auditoría programado en el calendario con fechas y equipo acordado.',
    categoria_aplicable: 'Auditorías, Visitas de Campo',
    color_token: 'indigo',
    usage_count: 5,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    estatus: 'En Ejecución',
    descripcion: 'Auditoría en desarrollo activo durante las fechas de trabajo de campo in situ o remota.',
    categoria_aplicable: 'Auditorías en Curso',
    color_token: 'teal',
    usage_count: 2,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    estatus: 'En Espera',
    descripcion: 'Trámite detenido temporalmente en espera de entrega de evidencias o respuesta de la parte.',
    categoria_aplicable: 'Hallazgos, Solicitudes Administrativas',
    color_token: 'orange',
    usage_count: 4,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000008',
    estatus: 'Inactivo',
    descripcion: 'Registro archivado o concluido históricamente en el sistema sin vigencia operativa.',
    categoria_aplicable: 'Histórico, Cuentas Desactivadas',
    color_token: 'slate',
    usage_count: 6,
  },
];

export const INITIAL_TIPOS_AUDITORIA_CATALOG: TipoAuditoriaCatalogItem[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    tipo: 'Etapa 1',
    etapa_ciclo: 'Ciclo Inicial (Año 0)',
    descripcion: 'Revisión documental preliminar, idoneidad de la política y preparación para Etapa 2 (ISO 17021-1 cl. 9.3).',
    duracion_formula: '1.0 - 2.0 días auditor según complejidad y tamaño del cliente',
    reporte_requerido: 'Informe de Etapa 1 con determinación de aptitud para Etapa 2',
    usage_count: 4,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    tipo: 'Etapa 2',
    etapa_ciclo: 'Ciclo Inicial (Año 0)',
    descripcion: 'Evaluación integral de la implementación efectiva y conformidad de todos los procesos in situ (ISO 17021-1 cl. 9.4).',
    duracion_formula: 'Cálculo de días auditor conforme a tablas IAF MD 5 según personal efectivo',
    reporte_requerido: 'Informe integral con registro de hallazgos y recomendación del comité',
    usage_count: 6,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    tipo: 'Seguimiento 1',
    etapa_ciclo: 'Vigilancia (Año 1)',
    descripcion: 'Primera auditoría periódica dentro de los 12 meses siguientes a la concesión de certificación (ISO 17021-1 cl. 9.6.2).',
    duracion_formula: 'Aprox. 1/3 del tiempo total de la auditoría inicial de certificación',
    reporte_requerido: 'Informe de seguimiento con evaluación de acciones correctivas previas',
    usage_count: 8,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    tipo: 'Seguimiento 2',
    etapa_ciclo: 'Vigilancia (Año 2)',
    descripcion: 'Segunda auditoría periódica para verificar el mantenimiento continuo de la eficacia (Año 2 del ciclo trienal).',
    duracion_formula: 'Aprox. 1/3 del tiempo total de la auditoría inicial de certificación',
    reporte_requerido: 'Informe de seguimiento y confirmación de vigencia del certificado',
    usage_count: 7,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    tipo: 'Renovación',
    etapa_ciclo: 'Recertificación (Año 3)',
    descripcion: 'Auditoría integral previa al vencimiento del certificado para renovar el ciclo trienal (ISO 17021-1 cl. 9.6.3).',
    duracion_formula: 'Aprox. 2/3 del tiempo requerido para la auditoría inicial de certificación',
    reporte_requerido: 'Informe de recertificación y dictamen favorable de emisión por 3 años',
    usage_count: 9,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    tipo: 'Diagnóstico',
    etapa_ciclo: 'Pre-evaluación',
    descripcion: 'Evaluación voluntaria de brechas (GAP Analysis) sin emisión formal de certificado.',
    duracion_formula: 'Acordado puntualmente entre el cliente y el organismo certificador',
    reporte_requerido: 'Informe diagnóstico de oportunidades y madurez del sistema',
    usage_count: 2,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    tipo: 'Extraordinaria',
    etapa_ciclo: 'Inspección Especial',
    descripcion: 'Auditoría a corto plazo motivada por quejas graves, accidentes o cambios estructurales sustantivos.',
    duracion_formula: 'Enfocada puntualmente en las cláusulas y procesos objeto de investigación',
    reporte_requerido: 'Informe pericial extraordinario con medidas cautelares o suspensión',
    usage_count: 1,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    tipo: 'Especial',
    etapa_ciclo: 'Ampliación / Transferencia',
    descripcion: 'Auditoría para ampliación del alcance de certificación o transferencia desde otro organismo acreditado.',
    duracion_formula: 'Proporcional a los nuevos procesos o sedes incorporados al certificado',
    reporte_requerido: 'Informe de ampliación de alcance y endoso de nuevo certificado',
    usage_count: 3,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000009',
    tipo: 'Otro',
    etapa_ciclo: 'Modalidad Específica',
    descripcion: 'Evaluaciones técnicas combinadas, auditorías conjuntas o esquemas privados específicos.',
    duracion_formula: 'Definida contractualmente según especificación técnica',
    reporte_requerido: 'Reporte técnico conforme a los términos de referencia del encargo',
    usage_count: 1,
  },
];

export const INITIAL_METODOLOGIAS_CATALOG: MetodologiaAuditoriaCatalogItem[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    metodologia: 'Presencial',
    descripcion: 'El equipo evaluador se desplaza físicamente a las instalaciones, plantas, oficinas y sedes multisitio del cliente.',
    protocolo_tic: 'Uso de dispositivos móviles para toma de evidencias fotográficas in situ y entrevistas directas.',
    regla_muestreo: 'Inspección física obligatoria de líneas productivas, almacenes, registros en papel y condiciones ambientales.',
    seguridad_confidencialidad: 'Cumplimiento estricto de normas de seguridad industrial (EPP) y acuerdos de confidencialidad física.',
    usage_count: 15,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    metodologia: 'Remota',
    descripcion: 'Auditoría conducida 100% mediante Tecnologías de Información y Comunicación (TIC) de conformidad con IAF MD 4.',
    protocolo_tic: 'Videoconferencia bidireccional en alta definición, uso compartido seguro de pantalla y entrevistas guiadas.',
    regla_muestreo: 'Validación previa de viabilidad técnica y conectividad en cada sede remota antes de la auditoría.',
    seguridad_confidencialidad: 'Canales cifrados TLS 1.3, prohibición de grabaciones no consentidas y destrucción de archivos temporales.',
    usage_count: 5,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    metodologia: 'Mixta',
    descripcion: 'Formato híbrido que combina verificación in situ para procesos medulares con muestreo documental remoto.',
    protocolo_tic: 'Combinación de visitas de campo presenciales con sesiones remotas de revisión de liderazgo y políticas.',
    regla_muestreo: 'Los procesos operacionales de alto riesgo deben evaluarse presencialmente (mínimo 50% de días auditor).',
    seguridad_confidencialidad: 'Protocolo dual que integra seguridad física en planta con ciberseguridad en intercambio de archivos.',
    usage_count: 8,
  },
];

// ---------------------------------------------------------------------------
// Pure Domain Helper Functions
// ---------------------------------------------------------------------------

export function normalizeSearchString(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Filters standards by search query and sidebar facets.
 */
export function filterNormas(
  normas: NormaEntity[],
  query: string,
  selectedStatus: string = 'ALL',
  selectedScheme: string = 'ALL'
): NormaEntity[] {
  const cleanQ = normalizeSearchString(query);

  return normas.filter((norma) => {
    // 1. Text search on code, title, scheme
    if (cleanQ) {
      const codeMatch = normalizeSearchString(norma.codigo).includes(cleanQ);
      const titleMatch = normalizeSearchString(norma.titulo).includes(cleanQ);
      const schemeMatch = normalizeSearchString(norma.esquema).includes(cleanQ);
      if (!codeMatch && !titleMatch && !schemeMatch) {
        return false;
      }
    }

    // 2. Status facet
    if (
      selectedStatus &&
      selectedStatus !== 'ALL' &&
      norma.estatus.toLowerCase() !== selectedStatus.toLowerCase()
    ) {
      return false;
    }

    // 3. Scheme facet
    if (
      selectedScheme &&
      selectedScheme !== 'ALL' &&
      norma.esquema.toLowerCase() !== selectedScheme.toLowerCase()
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Filters IAF sectors by text search and risk category.
 */
export function filterSectoresIaf(
  sectors: SectorIafEntity[],
  subsectors: SubsectorIafEntity[],
  query: string,
  selectedRisk: string = 'ALL'
): SectorIafEntity[] {
  const cleanQ = normalizeSearchString(query);

  return sectors.filter((sec) => {
    // 1. Text search on sector number and description
    if (cleanQ) {
      const numMatch = String(sec.sector).includes(cleanQ);
      const descMatch = normalizeSearchString(sec.descripcion).includes(cleanQ);
      if (!numMatch && !descMatch) {
        return false;
      }
    }

    // 2. Risk facet based on child sub-sectors
    if (selectedRisk && selectedRisk !== 'ALL') {
      const relatedSub = subsectors.filter((s) => s.sector_numero === sec.sector);
      const hasRisk = relatedSub.some(
        (s) => s.categoria_riesgo.toUpperCase() === selectedRisk.toUpperCase()
      );
      if (!hasRisk) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filters sub-sectors by sector number and optional search query.
 */
export function filterSubsectoresBySector(
  subsectors: SubsectorIafEntity[],
  sectorNumber: number,
  query?: string
): SubsectorIafEntity[] {
  const cleanQ = normalizeSearchString(query);

  return subsectors.filter((sub) => {
    if (sub.sector_numero !== sectorNumber) return false;
    if (cleanQ) {
      const codeMatch = normalizeSearchString(sub.codigo).includes(cleanQ);
      const descMatch = normalizeSearchString(sub.descripcion).includes(cleanQ);
      const riskMatch = normalizeSearchString(sub.categoria_riesgo).includes(cleanQ);
      return codeMatch || descMatch || riskMatch;
    }
    return true;
  });
}

/**
 * Calculates ltree requirement indentation based on materialized path or dots.
 */
export function calculateLtreeIndentation(
  rutaMaterializada: string | null | undefined,
  codigo: string
): { level: number; indentPx: number; isParent: boolean } {
  if (rutaMaterializada && rutaMaterializada.includes('.')) {
    const segments = rutaMaterializada.split('.');
    const level = segments.length;
    return {
      level,
      indentPx: (level - 1) * 20,
      isParent: level === 1,
    };
  }

  const dotCount = (codigo.match(/\./g) || []).length;
  const level = dotCount + 1;
  return {
    level,
    indentPx: dotCount * 20,
    isParent: dotCount === 0,
  };
}

/**
 * Visual badge formatting for Risk Categories.
 */
export function formatRiskCategoryBadge(riesgo: 'ALTO' | 'MEDIO' | 'BAJO' | string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (riesgo.toUpperCase()) {
    case 'ALTO':
      return {
        label: 'ALTO RIESGO',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        symbol: '🔴',
      };
    case 'MEDIO':
      return {
        label: 'RIESGO MEDIO',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        symbol: '🟡',
      };
    case 'BAJO':
    default:
      return {
        label: 'BAJO RIESGO',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '🟢',
      };
  }
}

/**
 * Visual badge formatting for standard validity status.
 */
export function formatNormaStatusBadge(estatus: string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (estatus.toLowerCase()) {
    case 'vigente':
      return {
        label: 'VIGENTE',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '✓',
      };
    case 'en revisión':
    case 'en revision':
      return {
        label: 'EN REVISIÓN',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        symbol: '⏳',
      };
    case 'obsoleta':
    default:
      return {
        label: 'OBSOLETA',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        symbol: '✕',
      };
  }
}

/**
 * Visual badge formatting for accreditation status.
 */
export function formatAcreditacionStatusBadge(estatus: string): {
  label: string;
  badgeClass: string;
  symbol: string;
} {
  switch (estatus.toLowerCase()) {
    case 'activa':
      return {
        label: 'ACREDITACIÓN ACTIVA',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        symbol: '✓',
      };
    case 'en renovación':
    case 'en renovacion':
      return {
        label: 'EN RENOVACIÓN',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        symbol: '⏳',
      };
    case 'suspendida':
    default:
      return {
        label: 'SUSPENDIDA',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        symbol: '✕',
      };
  }
}
