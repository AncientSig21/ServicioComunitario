-- =====================================================
-- ELIMINAR CAMPO 'ciudad' DE LA TABLA 'condominios'
-- =====================================================
-- 
-- Este script elimina el campo 'ciudad' de la tabla 'condominios'
-- porque todos los condominios pertenecen a "Ciudad Colonial",
-- por lo que este campo es redundante.
--
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase Dashboard
-- =====================================================

-- Eliminar el campo ciudad de la tabla condominios
ALTER TABLE condominios
DROP COLUMN IF EXISTS ciudad;

-- Verificar que la columna fue eliminada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'condominios'
ORDER BY ordinal_position;

