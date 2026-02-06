-- Script para agregar la columna 'estado' a la tabla 'usuarios' si no existe
-- Esta columna se usa para indicar el estado del usuario: 'Activo', 'Moroso', 'Inactivo'
-- NOTA: En PostgreSQL, los nombres de columnas sin comillas se convierten automáticamente a minúsculas

-- Verificar si la columna existe antes de agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'estado'
    ) THEN
        -- Agregar la columna estado (PostgreSQL la convertirá a minúsculas automáticamente)
        ALTER TABLE usuarios 
        ADD COLUMN estado TEXT DEFAULT 'Activo';
        
        -- Crear índice para mejorar el rendimiento de consultas por estado
        CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
        
        RAISE NOTICE 'Columna estado agregada exitosamente a la tabla usuarios';
    ELSE
        RAISE NOTICE 'La columna estado ya existe en la tabla usuarios';
    END IF;
END $$;

-- Actualizar usuarios existentes sin estado a 'Activo' por defecto
UPDATE usuarios 
SET estado = 'Activo' 
WHERE estado IS NULL;

