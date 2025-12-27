-- =====================================================
-- Agregar campo de preguntas de seguridad a la tabla usuarios
-- =====================================================

-- Agregar columna preguntas_seguridad como JSONB
-- Estructura esperada:
-- {
--   "preguntas": [
--     {
--       "pregunta": "texto de la pregunta o id si es predefinida",
--       "respuesta_hash": "hash de la respuesta",
--       "tipo": "predefinida" | "personalizada",
--       "created_at": "timestamp"
--     }
--   ]
-- }

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS preguntas_seguridad JSONB DEFAULT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN usuarios.preguntas_seguridad IS 
'Campo JSONB que almacena las preguntas de seguridad y respuestas hasheadas para recuperación de contraseña. 
Estructura: {"preguntas": [{"pregunta": "texto", "respuesta_hash": "hash", "tipo": "predefinida|personalizada", "created_at": "timestamp"}]}';

-- Crear índice GIN para búsquedas eficientes en el campo JSONB (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_usuarios_preguntas_seguridad 
ON usuarios USING GIN (preguntas_seguridad);

-- Verificar que la columna se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'usuarios' 
AND column_name = 'preguntas_seguridad';



