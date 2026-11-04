-- =============================================================================
-- CREACIÓN DE EXTENSIONES REQUERIDAS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- =============================================================================
-- DOMINIO 1: CATÁLOGOS BASE Y COMPETENCIAS DE AUDITORES
-- =============================================================================

CREATE TABLE norma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    esquema VARCHAR(50) NOT NULL,
    norma VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE requisito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE CASCADE,
    id_requisito_padre UUID REFERENCES requisito(id) ON DELETE RESTRICT,
    codigo VARCHAR(30) NOT NULL,
    ruta_materializada LTREE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sector_iaf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estatus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estatus VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tipo_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE metodologia_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metodologia VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auditor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE norma_auditor (
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE CASCADE,
    PRIMARY KEY (id_auditor, id_norma)
);

CREATE TABLE sector_iaf_auditor (
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    id_sector_iaf UUID NOT NULL REFERENCES sector_iaf(id) ON DELETE CASCADE,
    PRIMARY KEY (id_auditor, id_sector_iaf)
);

-- =============================================================================
-- DOMINIO 2: CERTIFICADOS, SITIOS, PROCESOS Y TURNOS
-- =============================================================================

CREATE TABLE certificado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_norma UUID NOT NULL REFERENCES norma(id) ON DELETE RESTRICT,
    id_estatus UUID NOT NULL REFERENCES estatus(id) ON DELETE RESTRICT,
    id_sector_iaf UUID NOT NULL REFERENCES sector_iaf(id) ON DELETE RESTRICT,
    numero_certificado VARCHAR(100) NOT NULL UNIQUE,
    nombre_empresa VARCHAR(200) NOT NULL,
    multisitio BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sitio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    numero_sitio INTEGER NOT NULL,
    nombre_sitio VARCHAR(150) NOT NULL,
    direccion_sitio TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sitio_certificado UNIQUE (id_certificado, numero_sitio)
);

CREATE TABLE proceso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    nombre_proceso VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE requisitos_por_proceso (
    id_proceso UUID NOT NULL REFERENCES proceso(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES requisito(id) ON DELETE CASCADE,
    PRIMARY KEY (id_proceso, id_requisito)
);

CREATE TABLE requisitos_no_aplicables_certificado (
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE CASCADE,
    id_requisito UUID NOT NULL REFERENCES requisito(id) ON DELETE CASCADE,
    PRIMARY KEY (id_certificado, id_requisito)
);

CREATE TABLE turno (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_horario_turno UNIQUE (hora_entrada, hora_salida)
);

CREATE TABLE turnos_por_sitio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitio UUID NOT NULL REFERENCES sitio(id) ON DELETE CASCADE,
    id_turno UUID NOT NULL REFERENCES turno(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sitio_turno UNIQUE (id_sitio, id_turno)
);

-- =============================================================================
-- DOMINIO 3: PLANIFICACIÓN Y EJECUCIÓN DE AUDITORÍAS
-- =============================================================================

CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_certificado UUID NOT NULL REFERENCES certificado(id) ON DELETE RESTRICT,
    id_tipo_auditoria UUID NOT NULL REFERENCES tipo_auditoria(id) ON DELETE RESTRICT,
    id_metodologia UUID NOT NULL REFERENCES metodologia_auditoria(id) ON DELETE RESTRICT,
    fecha_programacion DATE NOT NULL,
    fecha_reprogramacion DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comentarios_por_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE equipo_auditor (
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    id_auditor UUID NOT NULL REFERENCES auditor(id) ON DELETE CASCADE,
    PRIMARY KEY (id_auditoria, id_auditor)
);

CREATE TABLE sitios_por_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_auditoria UUID NOT NULL REFERENCES auditoria(id) ON DELETE CASCADE,
    id_sitio UUID NOT NULL REFERENCES sitio(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_auditoria_sitio UNIQUE (id_auditoria, id_sitio)
);

CREATE TABLE turnos_sitio_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitios_por_auditoria UUID NOT NULL REFERENCES sitios_por_auditoria(id) ON DELETE CASCADE,
    id_turnos_por_sitio UUID NOT NULL REFERENCES turnos_por_sitio(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE procesos_sitio_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sitios_por_auditoria UUID NOT NULL REFERENCES sitios_por_auditoria(id) ON DELETE CASCADE,
    id_proceso UUID NOT NULL REFERENCES proceso(id) ON DELETE RESTRICT,
    id_turnos_sitio_auditoria UUID NOT NULL REFERENCES turnos_sitio_auditoria(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DISPARADORES (TRIGGERS) PARA ACTUALIZACIÓN AUTOMÁTICA DE TIMESTAMP
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_norma_modtime BEFORE UPDATE ON norma FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requisito_modtime BEFORE UPDATE ON requisito FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certificado_modtime BEFORE UPDATE ON certificado FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sitio_modtime BEFORE UPDATE ON sitio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proceso_modtime BEFORE UPDATE ON proceso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_modtime BEFORE UPDATE ON auditoria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();