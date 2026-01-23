-- =====================================================
-- VERIFICACIÓN SIMPLE DE RLS PARA MANTENIMIENTO
-- Versión simplificada con resultados en formato tabla
-- =====================================================

-- =====================================================
-- 1. VERIFICAR FUNCIONES AUXILIARES
-- =====================================================

SELECT 
  'Funciones Auxiliares' as "Categoría",
  proname as "Función",
  CASE 
    WHEN proname IN ('get_current_user_id', 'is_admin', 'is_conserje') THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as "Estado"
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'is_conserje')
ORDER BY proname;

-- =====================================================
-- 2. VERIFICAR RLS HABILITADO
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
AND tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
ORDER BY tablename;

-- =====================================================
-- 3. VERIFICAR POLÍTICAS CREADAS
-- =====================================================

SELECT 
  'Políticas RLS' as "Categoría",
  tablename as "Tabla",
  policyname as "Política",
  cmd as "Operación",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN 'Permisiva'
    ELSE 'Restrictiva'
  END as "Tipo"
FROM pg_policies
WHERE tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
ORDER BY tablename, 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- =====================================================
-- 4. CONTAR POLÍTICAS POR TABLA
-- =====================================================

SELECT 
  'Resumen de Políticas' as "Categoría",
  tablename as "Tabla",
  COUNT(*) as "Total Políticas",
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as "SELECT",
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as "INSERT",
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as "UPDATE",
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as "DELETE"
FROM pg_policies
WHERE tablename IN ('solicitudes_mantenimiento', 'avances_mantenimiento')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 5. VERIFICAR ESTRUCTURA DE TABLAS
-- =====================================================

SELECT 
  'Estructura de Tabla' as "Categoría",
  table_name as "Tabla",
  column_name as "Columna",
  data_type as "Tipo",
  is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'solicitudes_mantenimiento'
AND column_name IN (
  'id', 
  'usuario_solicitante_id', 
  'titulo', 
  'descripcion', 
  'estado', 
  'prioridad',
  'condominio_id',
  'responsable_id'
)
ORDER BY ordinal_position;

-- =====================================================
-- 6. VERIFICAR CAMPO auth_uid EN usuarios
-- =====================================================

SELECT 
  'Configuración de Usuarios' as "Categoría",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'auth_uid'
    ) THEN '✅ Campo auth_uid existe'
    ELSE '❌ Campo auth_uid NO existe'
  END as "Estado",
  (
    SELECT COUNT(*) 
    FROM usuarios 
    WHERE auth_uid IS NOT NULL
  ) as "Usuarios con auth_uid"
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'usuarios'
LIMIT 1;

-- =====================================================
-- 7. RESUMEN GENERAL
-- =====================================================

SELECT 
  'RESUMEN GENERAL' as "Verificación",
  (
    SELECT COUNT(*) 
    FROM pg_proc
    WHERE proname IN ('get_current_user_id', 'is_admin', 'is_conserje')
  ) as "Funciones (3 esperadas)",
  (
    SELECT COUNT(*) 
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'solicitudes_mantenimiento'
    AND rowsecurity = true
  ) as "RLS Habilitado (1 esperado)",
  (
    SELECT COUNT(*) 
    FROM pg_policies
    WHERE tablename = 'solicitudes_mantenimiento'
  ) as "Políticas (4 esperadas)",
  (
    SELECT CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'usuarios'
        AND column_name = 'auth_uid'
      ) THEN 1
      ELSE 0
    END
  ) as "auth_uid Existe (1 esperado)";

-- =====================================================
-- 8. DETALLES DE CONDICIONES DE POLÍTICAS
-- =====================================================

SELECT 
  'Detalles de Políticas' as "Categoría",
  policyname as "Política",
  cmd as "Operación",
  LEFT(qual::text, 200) as "Condición USING (primeros 200 caracteres)",
  LEFT(with_check::text, 200) as "Condición WITH CHECK (primeros 200 caracteres)"
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

-- Ver condición COMPLETA de la política SELECT (sin truncar)
SELECT 
  'Condición Completa SELECT' as "Verificación",
  qual::text as "Condición USING (COMPLETA)",
  CASE 
    WHEN qual::text LIKE '%usuario_solicitante_id%' 
         AND qual::text LIKE '%responsable_id%'
         AND (qual::text LIKE '%conserje%' OR qual::text LIKE '%rol%')
         AND qual::text LIKE '%is_admin%' 
    THEN '✅ Política completa con todas las condiciones'
    ELSE '⚠️ Política puede estar incompleta'
  END as "Estado"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'SELECT'
AND policyname = 'Usuarios ven sus solicitudes de mantenimiento';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Revisa los resultados anteriores
-- Si todos los valores esperados coinciden, RLS está correctamente configurado

