-- =====================================================
-- VERIFICACIÓN FINAL DE RLS - DESPUÉS DE CORRECCIÓN
-- Este script verifica que todas las políticas están
-- correctamente configuradas después de la corrección
-- =====================================================

-- =====================================================
-- 1. VERIFICAR QUE LA POLÍTICA SELECT ESTÁ COMPLETA
-- =====================================================

SELECT 
  'Verificación SELECT' as "Categoría",
  policyname as "Política",
  CASE 
    WHEN qual::text LIKE '%usuario_solicitante_id%' 
         AND qual::text LIKE '%responsable_id%'
         AND qual::text LIKE '%conserje%'
         AND qual::text LIKE '%is_admin%' 
    THEN '✅ COMPLETA - Todas las condiciones incluidas'
    ELSE '❌ INCOMPLETA - Faltan condiciones'
  END as "Estado",
  'Usuarios, Responsables, Conserjes y Admins' as "Permisos"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

-- =====================================================
-- 2. RESUMEN COMPLETO DE TODAS LAS POLÍTICAS
-- =====================================================

SELECT 
  'Resumen de Políticas' as "Categoría",
  cmd as "Operación",
  policyname as "Política",
  CASE 
    WHEN cmd = 'SELECT' THEN
      CASE 
        WHEN qual::text LIKE '%usuario_solicitante_id%' 
             AND qual::text LIKE '%responsable_id%'
             AND qual::text LIKE '%conserje%'
             AND qual::text LIKE '%is_admin%' 
        THEN '✅ Completa'
        ELSE '❌ Incompleta'
      END
    WHEN cmd = 'INSERT' THEN
      CASE 
        WHEN with_check::text LIKE '%usuario_solicitante_id%' 
             AND with_check::text LIKE '%estado%'
        THEN '✅ Completa'
        ELSE '❌ Incompleta'
      END
    WHEN cmd = 'UPDATE' THEN
      CASE 
        WHEN qual::text LIKE '%usuario_solicitante_id%' 
             AND qual::text LIKE '%responsable_id%'
             AND (qual::text LIKE '%conserje%' OR qual::text LIKE '%is_admin%')
        THEN '✅ Completa'
        ELSE '❌ Incompleta'
      END
    WHEN cmd = 'DELETE' THEN
      CASE 
        WHEN qual::text LIKE '%is_admin%'
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
-- 3. VERIFICAR FUNCIONES AUXILIARES
-- =====================================================

SELECT 
  'Funciones Auxiliares' as "Categoría",
  proname as "Función",
  '✅ Existe' as "Estado"
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'is_conserje')
ORDER BY proname;

-- =====================================================
-- 4. VERIFICAR RLS HABILITADO
-- =====================================================

SELECT 
  'RLS Habilitado' as "Categoría",
  tablename as "Tabla",
  CASE 
    WHEN rowsecurity THEN '✅ Habilitado'
    ELSE '❌ Deshabilitado'
  END as "Estado"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'solicitudes_mantenimiento';

-- =====================================================
-- 5. RESUMEN FINAL
-- =====================================================

SELECT 
  'RESUMEN FINAL' as "Verificación",
  (
    SELECT COUNT(*) 
    FROM pg_proc
    WHERE proname IN ('get_current_user_id', 'is_admin', 'is_conserje')
  ) as "Funciones (3 esperadas)",
  (
    SELECT COUNT(*) 
    FROM pg_policies
    WHERE tablename = 'solicitudes_mantenimiento'
  ) as "Políticas (4 esperadas)",
  (
    SELECT COUNT(*) 
    FROM pg_policies
    WHERE tablename = 'solicitudes_mantenimiento'
    AND cmd = 'SELECT'
    AND qual::text LIKE '%is_admin%'
    AND qual::text LIKE '%conserje%'
  ) as "SELECT Completa (1 esperada)",
  (
    SELECT CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'solicitudes_mantenimiento'
        AND rowsecurity = true
      ) THEN 1
      ELSE 0
    END
  ) as "RLS Habilitado (1 esperado)";

-- =====================================================
-- 6. DETALLES DE LA POLÍTICA SELECT CORREGIDA
-- =====================================================

SELECT 
  'Detalles SELECT' as "Categoría",
  'Condición completa' as "Descripción",
  qual::text as "Condición USING"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ Si todas las verificaciones muestran los valores esperados,
--    las políticas RLS están correctamente configuradas




