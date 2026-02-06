-- =====================================================
-- CORREGIR POLÍTICA SELECT - VERSIÓN COMPLETA
-- Este script verifica y corrige la política SELECT
-- para incluir todas las condiciones necesarias
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica los mensajes de confirmación
-- 3. La política se recreará con todas las condiciones

-- Primero, verificar la condición actual completa
SELECT 
  'Condición Actual' as "Verificación",
  qual::text as "Condición USING Completa"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

-- Verificar si falta alguna condición
DO $$
DECLARE
  current_condition TEXT;
  has_conserje BOOLEAN;
  has_admin BOOLEAN;
BEGIN
  -- Obtener la condición actual
  SELECT qual::text INTO current_condition
  FROM pg_policies
  WHERE tablename = 'solicitudes_mantenimiento'
  AND cmd = 'SELECT'
  AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';
  
  -- Verificar si incluye condición de conserje
  has_conserje := current_condition LIKE '%conserje%' OR current_condition LIKE '%rol%';
  
  -- Verificar si incluye condición de admin
  has_admin := current_condition LIKE '%is_admin%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE POLÍTICA SELECT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Condición actual: %', LEFT(current_condition, 200);
  RAISE NOTICE 'Incluye conserje: %', has_conserje;
  RAISE NOTICE 'Incluye admin: %', has_admin;
  
  -- Si falta alguna condición, recrear la política
  IF NOT has_conserje OR NOT has_admin THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  La política SELECT está incompleta';
    RAISE NOTICE 'Eliminando y recreando la política...';
    
    -- Eliminar política existente
    DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;
    
    -- Recrear con todas las condiciones
    CREATE POLICY "Usuarios ven sus solicitudes de mantenimiento"
    ON solicitudes_mantenimiento FOR SELECT
    USING (
      usuario_solicitante_id = get_current_user_id() 
      OR
      responsable_id = get_current_user_id()
      OR
      (
        EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = get_current_user_id()
          AND u.rol = 'conserje'
          AND u.condominio_id = solicitudes_mantenimiento.condominio_id
        )
      )
      OR
      is_admin(get_current_user_id())
    );
    
    RAISE NOTICE '✅ Política SELECT recreada con todas las condiciones';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ La política SELECT está completa';
  END IF;
END $$;

-- Verificar la condición después de la corrección
SELECT 
  'Condición Después de Corrección' as "Verificación",
  qual::text as "Condición USING Completa",
  CASE 
    WHEN qual::text LIKE '%usuario_solicitante_id%' 
         AND qual::text LIKE '%responsable_id%'
         AND (qual::text LIKE '%conserje%' OR qual::text LIKE '%rol%')
         AND qual::text LIKE '%is_admin%' 
    THEN '✅ Política completa'
    ELSE '❌ Política incompleta'
  END as "Estado"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

