-- =====================================================
-- ELIMINAR TODO LO RELACIONADO CON PREGUNTAS DE SEGURIDAD
-- =====================================================
-- Ejecutar en el SQL Editor de Supabase.
-- No modifica otras tablas ni columnas; solo elimina:
--   - Funciones RPC de preguntas de seguridad
--   - Índice y columna preguntas_seguridad en usuarios
--
-- Después de ejecutar este script, la recuperación de contraseña
-- se hace solo con el código de recuperación (columna codigo_recuperacion).
-- Asegúrate de tener aplicado sql/agregar_codigo_recuperacion.sql
-- y de que el registro genere y guarde codigo_recuperacion al crear usuarios.
-- =====================================================

-- 1. Eliminar funciones RPC (si existen)
DROP FUNCTION IF EXISTS public.get_preguntas_seguridad_por_correo(TEXT);
DROP FUNCTION IF EXISTS public.reset_password_con_preguntas(TEXT, TEXT, JSONB);

-- 2. Eliminar índice sobre preguntas_seguridad (si existe)
DROP INDEX IF EXISTS idx_usuarios_preguntas_seguridad;

-- 3. Eliminar columna preguntas_seguridad de la tabla usuarios
ALTER TABLE usuarios
DROP COLUMN IF EXISTS preguntas_seguridad;

-- Verificación: no debe existir la columna
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'preguntas_seguridad';
-- Resultado esperado: 0 filas
