-- =====================================================
-- ELIMINAR POLÍTICAS RLS DE MANTENIMIENTO
-- Este script elimina todas las políticas RLS creadas
-- para las tablas de mantenimiento
-- =====================================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script en Supabase SQL Editor
-- 2. Ejecuta el script completo
-- 3. Verifica que las políticas se hayan eliminado

-- =====================================================
-- ELIMINAR POLÍTICAS DE solicitudes_mantenimiento
-- =====================================================

-- Política SELECT
DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;

-- Política INSERT
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON solicitudes_mantenimiento;

-- Política UPDATE
DROP POLICY IF EXISTS "Usuarios y conserjes pueden actualizar solicitudes" ON solicitudes_mantenimiento;

-- Política DELETE
DROP POLICY IF EXISTS "Solo admins pueden eliminar solicitudes" ON solicitudes_mantenimiento;

-- =====================================================
-- ELIMINAR POLÍTICAS DE avances_mantenimiento (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    -- Política SELECT
    DROP POLICY IF EXISTS "Usuarios ven avances de sus solicitudes" ON avances_mantenimiento;
    
    -- Política INSERT
    DROP POLICY IF EXISTS "Responsables y admins pueden crear avances" ON avances_mantenimiento;
    
    -- Política UPDATE
    DROP POLICY IF EXISTS "Responsables y admins pueden actualizar avances" ON avances_mantenimiento;
    
    -- Política DELETE
    DROP POLICY IF EXISTS "Solo admins pueden eliminar avances" ON avances_mantenimiento;
    
    RAISE NOTICE 'Políticas de avances_mantenimiento eliminadas';
  ELSE
    RAISE NOTICE 'Tabla avances_mantenimiento no existe, se omite';
  END IF;
END $$;

-- =====================================================
-- OPCIONAL: Deshabilitar RLS en las tablas
-- =====================================================
-- Descomenta las siguientes líneas si también quieres
-- deshabilitar RLS completamente en las tablas:

-- ALTER TABLE solicitudes_mantenimiento DISABLE ROW LEVEL SECURITY;

-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_schema = 'public' 
--     AND table_name = 'avances_mantenimiento'
--   ) THEN
--     ALTER TABLE avances_mantenimiento DISABLE ROW LEVEL SECURITY;
--     RAISE NOTICE 'RLS deshabilitado en avances_mantenimiento';
--   END IF;
-- END $$;

-- =====================================================
-- VERIFICACIÓN: Mostrar políticas restantes
-- =====================================================

-- Verificar políticas de solicitudes_mantenimiento
SELECT 
  'Políticas Restantes - solicitudes_mantenimiento' as "Verificación",
  COUNT(*) as "Total Políticas"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento';

-- Si hay políticas restantes, mostrarlas
SELECT 
  'Políticas Restantes' as "Categoría",
  tablename as "Tabla",
  policyname as "Política",
  cmd as "Operación"
FROM pg_policies
WHERE tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
ORDER BY tablename, policyname;

-- =====================================================
-- VERIFICACIÓN: Estado de RLS
-- =====================================================

SELECT 
  'Estado RLS' as "Verificación",
  tablename as "Tabla",
  CASE 
    WHEN rowsecurity THEN '✅ Habilitado'
    ELSE '❌ Deshabilitado'
  END as "Estado"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
ORDER BY tablename;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ Todas las políticas RLS han sido eliminadas
-- 
-- NOTA: Las funciones auxiliares (get_current_user_id, is_admin, is_conserje)
-- NO se eliminan con este script. Si quieres eliminarlas también, ejecuta:
--
-- DROP FUNCTION IF EXISTS get_current_user_id();
-- DROP FUNCTION IF EXISTS is_admin(INTEGER);
-- DROP FUNCTION IF EXISTS is_conserje(INTEGER);

