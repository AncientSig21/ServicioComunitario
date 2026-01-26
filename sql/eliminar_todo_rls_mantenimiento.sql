-- =====================================================
-- ELIMINAR TODO: POLÍTICAS RLS Y FUNCIONES AUXILIARES
-- Este script elimina TODAS las políticas RLS Y las funciones
-- auxiliares relacionadas con mantenimiento
-- =====================================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script en Supabase SQL Editor
-- 2. Ejecuta el script completo
-- 3. Esto eliminará TODO lo relacionado con RLS de mantenimiento

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS
-- =====================================================

-- Políticas de solicitudes_mantenimiento
DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Usuarios y conserjes pueden actualizar solicitudes" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Solo admins pueden eliminar solicitudes" ON solicitudes_mantenimiento;

-- Políticas de avances_mantenimiento (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    DROP POLICY IF EXISTS "Usuarios ven avances de sus solicitudes" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Responsables y admins pueden crear avances" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Responsables y admins pueden actualizar avances" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Solo admins pueden eliminar avances" ON avances_mantenimiento;
  END IF;
END $$;

-- =====================================================
-- PASO 2: DESHABILITAR RLS EN LAS TABLAS
-- =====================================================

ALTER TABLE solicitudes_mantenimiento DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    ALTER TABLE avances_mantenimiento DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- PASO 3: ELIMINAR FUNCIONES AUXILIARES (OPCIONAL)
-- =====================================================
-- ⚠️ ADVERTENCIA: Estas funciones pueden ser usadas por otras políticas RLS
-- Solo elimínalas si estás seguro de que no se usan en otros lugares

-- Descomenta las siguientes líneas si quieres eliminar las funciones también:

-- DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
-- DROP FUNCTION IF EXISTS is_admin(INTEGER) CASCADE;
-- DROP FUNCTION IF EXISTS is_conserje(INTEGER) CASCADE;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que no quedan políticas
SELECT 
  'Verificación Final' as "Estado",
  tablename as "Tabla",
  COUNT(*) as "Políticas Restantes"
FROM pg_policies
WHERE tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
GROUP BY tablename;

-- Verificar estado de RLS
SELECT 
  'Estado RLS' as "Verificación",
  tablename as "Tabla",
  CASE 
    WHEN rowsecurity THEN '⚠️ AÚN HABILITADO'
    ELSE '✅ DESHABILITADO'
  END as "Estado"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
ORDER BY tablename;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ Todas las políticas RLS han sido eliminadas
-- ✅ RLS ha sido deshabilitado en las tablas
-- 
-- Si quieres volver a crear las políticas, ejecuta:
-- sql/aplicar_rls_mantenimiento.sql




