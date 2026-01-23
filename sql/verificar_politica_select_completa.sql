-- =====================================================
-- VERIFICAR CONDICIÓN COMPLETA DE POLÍTICA SELECT
-- Este script muestra la condición completa sin truncar
-- =====================================================

-- Ver la condición completa de la política SELECT
SELECT 
  policyname as "Política",
  cmd as "Operación",
  qual::text as "Condición USING (COMPLETA)",
  with_check::text as "Condición WITH CHECK (COMPLETA)"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT';

-- Ver todas las políticas con condiciones completas
SELECT 
  policyname as "Política",
  cmd as "Operación",
  qual::text as "Condición USING",
  with_check::text as "Condición WITH CHECK"
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

-- Verificar que la política SELECT incluye todas las condiciones necesarias
SELECT 
  'Verificación de Política SELECT' as "Verificación",
  CASE 
    WHEN qual::text LIKE '%usuario_solicitante_id%' THEN '✅ Incluye usuario_solicitante_id'
    ELSE '❌ Falta usuario_solicitante_id'
  END as "Usuario Solicitante",
  CASE 
    WHEN qual::text LIKE '%responsable_id%' THEN '✅ Incluye responsable_id'
    ELSE '❌ Falta responsable_id'
  END as "Responsable",
  CASE 
    WHEN qual::text LIKE '%conserje%' OR qual::text LIKE '%rol%' THEN '✅ Incluye condición de conserje'
    ELSE '❌ Falta condición de conserje'
  END as "Conserje",
  CASE 
    WHEN qual::text LIKE '%is_admin%' THEN '✅ Incluye condición de admin'
    ELSE '❌ Falta condición de admin'
  END as "Administrador"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

