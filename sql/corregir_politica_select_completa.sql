-- =====================================================
-- CORREGIR POLÍTICA SELECT - VERSIÓN DIRECTA
-- Este script elimina y recrea la política SELECT
-- con TODAS las condiciones necesarias
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica que no haya errores
-- 3. Ejecuta el script de verificación nuevamente

-- =====================================================
-- PASO 1: Verificar condición actual
-- =====================================================

SELECT 
  'ANTES DE CORRECCIÓN' as "Estado",
  qual::text as "Condición USING Actual"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

-- =====================================================
-- PASO 2: Eliminar política existente
-- =====================================================

DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;

-- =====================================================
-- PASO 3: Recrear política con TODAS las condiciones
-- =====================================================

CREATE POLICY "Usuarios ven sus solicitudes de mantenimiento"
ON solicitudes_mantenimiento FOR SELECT
USING (
  -- 1. El usuario puede ver sus propias solicitudes
  usuario_solicitante_id = get_current_user_id() 
  OR
  -- 2. El responsable puede ver solicitudes asignadas a él
  responsable_id = get_current_user_id()
  OR
  -- 3. Conserjes pueden ver solicitudes de su condominio
  (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = get_current_user_id()
      AND u.rol = 'conserje'
      AND u.condominio_id = solicitudes_mantenimiento.condominio_id
    )
  )
  OR
  -- 4. Administradores pueden ver todas las solicitudes
  is_admin(get_current_user_id())
);

-- =====================================================
-- PASO 4: Verificar condición después de corrección
-- =====================================================

SELECT 
  'DESPUÉS DE CORRECCIÓN' as "Estado",
  qual::text as "Condición USING Completa",
  CASE 
    WHEN qual::text LIKE '%usuario_solicitante_id%' 
         AND qual::text LIKE '%responsable_id%'
         AND qual::text LIKE '%conserje%'
         AND qual::text LIKE '%is_admin%' 
    THEN '✅ Política COMPLETA - Todas las condiciones incluidas'
    ELSE '❌ Política INCOMPLETA - Revisar condiciones'
  END as "Verificación"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

-- =====================================================
-- PASO 5: Mostrar todas las políticas para confirmación
-- =====================================================

SELECT 
  'TODAS LAS POLÍTICAS' as "Resumen",
  policyname as "Política",
  cmd as "Operación",
  CASE 
    WHEN cmd = 'SELECT' AND policyname = 'Usuarios ven sus solicitudes de mantenimiento' THEN
      CASE 
        WHEN qual::text LIKE '%usuario_solicitante_id%' 
             AND qual::text LIKE '%responsable_id%'
             AND qual::text LIKE '%conserje%'
             AND qual::text LIKE '%is_admin%' 
        THEN '✅ Completa'
        ELSE '❌ Incompleta'
      END
    ELSE '✅ OK'
  END as "Estado"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ La política SELECT ahora incluye:
--    - Usuarios ven sus propias solicitudes
--    - Responsables ven solicitudes asignadas
--    - Conserjes ven solicitudes de su condominio
--    - Administradores ven todas las solicitudes





