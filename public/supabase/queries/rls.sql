-- Activación de Row Level Security en entidades críticas
ALTER TABLE certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura abierta para consultas desde el backend
CREATE POLICY "Permitir lectura general de certificados" 
ON certificado FOR SELECT 
USING (true);

CREATE POLICY "Permitir lectura general de auditorias" 
ON auditoria FOR SELECT 
USING (true);

CREATE POLICY "Permitir lectura general de auditores" 
ON auditor FOR SELECT 
USING (true);

-- Política de escritura restringida a peticiones autenticadas
CREATE POLICY "Permitir mutaciones solo a usuarios autenticados" 
ON auditoria FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);