-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE RLS PARA MANTENIMIENTO
-- Este script verifica que todas las políticas RLS están
-- correctamente configuradas y funcionando
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Revisa los resultados de cada sección
-- 3. Si hay errores, revisa la sección de solución de problemas

-- =====================================================
-- SECCIÓN 1: Verificar Funciones Auxiliares
-- =====================================================

DO $$
DECLARE
  func_exists BOOLEAN;
  func_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. VERIFICANDO FUNCIONES AUXILIARES';
  RAISE NOTICE '========================================';
  
  -- Verificar get_current_user_id()
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_current_user_id'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Función get_current_user_id() existe';
  ELSE
    RAISE WARNING '❌ Función get_current_user_id() NO existe';
  END IF;
  
  -- Verificar is_admin()
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Función is_admin() existe';
  ELSE
    RAISE WARNING '❌ Función is_admin() NO existe';
  END IF;
  
  -- Verificar is_conserje()
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_conserje'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Función is_conserje() existe';
  ELSE
    RAISE WARNING '❌ Función is_conserje() NO existe';
  END IF;
  
  -- Contar funciones creadas
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN ('get_current_user_id', 'is_admin', 'is_conserje');
  
  RAISE NOTICE 'Total de funciones auxiliares encontradas: %', func_count;
  
END $$;

-- =====================================================
-- SECCIÓN 2: Verificar que RLS está Habilitado
-- =====================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '2. VERIFICANDO RLS HABILITADO';
  RAISE NOTICE '========================================';
  
  -- Verificar solicitudes_mantenimiento
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'solicitudes_mantenimiento';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS habilitado en solicitudes_mantenimiento';
  ELSE
    RAISE WARNING '❌ RLS NO habilitado en solicitudes_mantenimiento';
  END IF;
  
  -- Verificar avances_mantenimiento (si existe)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'avances_mantenimiento';
    
    IF rls_enabled THEN
      RAISE NOTICE '✅ RLS habilitado en avances_mantenimiento';
    ELSE
      RAISE WARNING '❌ RLS NO habilitado en avances_mantenimiento';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Tabla avances_mantenimiento no existe (se omite)';
  END IF;
  
END $$;

-- =====================================================
-- SECCIÓN 3: Verificar Políticas Creadas
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
  expected_policies TEXT[] := ARRAY[
    'Usuarios ven sus solicitudes de mantenimiento',
    'Usuarios pueden crear solicitudes',
    'Usuarios y conserjes pueden actualizar solicitudes',
    'Solo admins pueden eliminar solicitudes'
  ];
  policy_name TEXT;
  found_policies TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '3. VERIFICANDO POLÍTICAS DE solicitudes_mantenimiento';
  RAISE NOTICE '========================================';
  
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'solicitudes_mantenimiento';
  
  RAISE NOTICE 'Total de políticas encontradas: %', policy_count;
  
  -- Verificar cada política esperada
  FOREACH policy_name IN ARRAY expected_policies
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'solicitudes_mantenimiento'
      AND policyname = policy_name
    ) THEN
      RAISE NOTICE '✅ Política "%" existe', policy_name;
      found_policies := array_append(found_policies, policy_name);
    ELSE
      RAISE WARNING '❌ Política "%" NO existe', policy_name;
    END IF;
  END LOOP;
  
  -- Mostrar todas las políticas (por si hay extras)
  RAISE NOTICE '';
  RAISE NOTICE 'Todas las políticas en solicitudes_mantenimiento:';
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'solicitudes_mantenimiento'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %', policy_name;
  END LOOP;
  
END $$;

-- Verificar políticas de avances_mantenimiento (si existe)
DO $$
DECLARE
  policy_count INTEGER;
  expected_policies TEXT[] := ARRAY[
    'Usuarios ven avances de sus solicitudes',
    'Responsables y admins pueden crear avances',
    'Responsables y admins pueden actualizar avances',
    'Solo admins pueden eliminar avances'
  ];
  policy_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '4. VERIFICANDO POLÍTICAS DE avances_mantenimiento';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'avances_mantenimiento';
    
    RAISE NOTICE 'Total de políticas encontradas: %', policy_count;
    
    FOREACH policy_name IN ARRAY expected_policies
    LOOP
      IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'avances_mantenimiento'
        AND policyname = policy_name
      ) THEN
        RAISE NOTICE '✅ Política "%" existe', policy_name;
      ELSE
        RAISE WARNING '❌ Política "%" NO existe', policy_name;
      END IF;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- SECCIÓN 4: Detalles de las Políticas
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '5. DETALLES DE POLÍTICAS (solicitudes_mantenimiento)';
RAISE NOTICE '========================================';

SELECT 
  policyname as "Política",
  cmd as "Operación",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN 'Permisiva'
    ELSE 'Restrictiva'
  END as "Tipo",
  roles as "Roles Aplicados"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  policyname;

-- =====================================================
-- SECCIÓN 5: Verificar Estructura de Tablas
-- =====================================================

DO $$
DECLARE
  col_count INTEGER;
  required_cols TEXT[] := ARRAY[
    'id',
    'usuario_solicitante_id',
    'titulo',
    'descripcion',
    'estado',
    'prioridad',
    'condominio_id'
  ];
  col_name TEXT;
  col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '6. VERIFICANDO ESTRUCTURA DE solicitudes_mantenimiento';
  RAISE NOTICE '========================================';
  
  -- Verificar que la tabla existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'solicitudes_mantenimiento'
  ) THEN
    RAISE NOTICE '✅ Tabla solicitudes_mantenimiento existe';
    
    -- Verificar columnas requeridas
    FOREACH col_name IN ARRAY required_cols
    LOOP
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'solicitudes_mantenimiento'
        AND column_name = col_name
      ) INTO col_exists;
      
      IF col_exists THEN
        RAISE NOTICE '✅ Columna "%" existe', col_name;
      ELSE
        RAISE WARNING '❌ Columna "%" NO existe', col_name;
      END IF;
    END LOOP;
    
    -- Contar total de columnas
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'solicitudes_mantenimiento';
    
    RAISE NOTICE 'Total de columnas en la tabla: %', col_count;
  ELSE
    RAISE WARNING '❌ Tabla solicitudes_mantenimiento NO existe';
  END IF;
END $$;

-- =====================================================
-- SECCIÓN 6: Verificar Campo auth_uid en usuarios
-- =====================================================

DO $$
DECLARE
  auth_uid_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '7. VERIFICANDO CAMPO auth_uid EN usuarios';
  RAISE NOTICE '========================================';
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usuarios'
    AND column_name = 'auth_uid'
  ) INTO auth_uid_exists;
  
  IF auth_uid_exists THEN
    RAISE NOTICE '✅ Columna auth_uid existe en tabla usuarios';
    
    -- Verificar si hay usuarios con auth_uid
    DECLARE
      users_with_auth INTEGER;
    BEGIN
      SELECT COUNT(*) INTO users_with_auth
      FROM usuarios
      WHERE auth_uid IS NOT NULL;
      
      RAISE NOTICE 'Usuarios con auth_uid configurado: %', users_with_auth;
      
      IF users_with_auth = 0 THEN
        RAISE WARNING '⚠️  No hay usuarios con auth_uid configurado';
      END IF;
    END;
  ELSE
    RAISE WARNING '❌ Columna auth_uid NO existe en tabla usuarios';
    RAISE NOTICE '   Necesitas agregarla con: ALTER TABLE usuarios ADD COLUMN auth_uid UUID;';
  END IF;
END $$;

-- =====================================================
-- SECCIÓN 7: Prueba de Funciones (si hay usuario autenticado)
-- =====================================================

DO $$
DECLARE
  current_user_id INTEGER;
  is_user_admin BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '8. PRUEBA DE FUNCIONES (requiere usuario autenticado)';
  RAISE NOTICE '========================================';
  
  BEGIN
    -- Intentar obtener el usuario actual
    SELECT get_current_user_id() INTO current_user_id;
    
    IF current_user_id IS NOT NULL THEN
      RAISE NOTICE '✅ get_current_user_id() retorna: %', current_user_id;
      
      -- Verificar si es admin
      SELECT is_admin(current_user_id) INTO is_user_admin;
      RAISE NOTICE 'Usuario es administrador: %', is_user_admin;
      
      -- Verificar si es conserje
      DECLARE
        is_user_conserje BOOLEAN;
      BEGIN
        SELECT is_conserje(current_user_id) INTO is_user_conserje;
        RAISE NOTICE 'Usuario es conserje: %', is_user_conserje;
      END;
    ELSE
      RAISE NOTICE 'ℹ️  get_current_user_id() retorna NULL (no hay usuario autenticado)';
      RAISE NOTICE '   Esto es normal si ejecutas el script sin estar autenticado';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Error al probar funciones: %', SQLERRM;
  END;
END $$;

-- =====================================================
-- SECCIÓN 8: Resumen de Verificación
-- =====================================================

DO $$
DECLARE
  total_checks INTEGER := 0;
  passed_checks INTEGER := 0;
  func_count INTEGER;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  auth_uid_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '9. RESUMEN DE VERIFICACIÓN';
  RAISE NOTICE '========================================';
  
  -- Verificar funciones
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN ('get_current_user_id', 'is_admin', 'is_conserje');
  
  total_checks := total_checks + 1;
  IF func_count = 3 THEN
    passed_checks := passed_checks + 1;
    RAISE NOTICE '✅ Funciones auxiliares: OK (3/3)';
  ELSE
    RAISE WARNING '❌ Funciones auxiliares: FALTA (solo %/3)', func_count;
  END IF;
  
  -- Verificar RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'solicitudes_mantenimiento';
  
  total_checks := total_checks + 1;
  IF rls_enabled THEN
    passed_checks := passed_checks + 1;
    RAISE NOTICE '✅ RLS habilitado: OK';
  ELSE
    RAISE WARNING '❌ RLS habilitado: FALTA';
  END IF;
  
  -- Verificar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'solicitudes_mantenimiento';
  
  total_checks := total_checks + 1;
  IF policy_count >= 4 THEN
    passed_checks := passed_checks + 1;
    RAISE NOTICE '✅ Políticas creadas: OK (% políticas)', policy_count;
  ELSE
    RAISE WARNING '❌ Políticas creadas: FALTA (solo %/4)', policy_count;
  END IF;
  
  -- Verificar auth_uid
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usuarios'
    AND column_name = 'auth_uid'
  ) INTO auth_uid_exists;
  
  total_checks := total_checks + 1;
  IF auth_uid_exists THEN
    passed_checks := passed_checks + 1;
    RAISE NOTICE '✅ Campo auth_uid: OK';
  ELSE
    RAISE WARNING '❌ Campo auth_uid: FALTA';
  END IF;
  
  -- Resumen final
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO FINAL: %/% verificaciones pasaron', passed_checks, total_checks;
  RAISE NOTICE '========================================';
  
  IF passed_checks = total_checks THEN
    RAISE NOTICE '✅ TODO ESTÁ CORRECTAMENTE CONFIGURADO';
  ELSE
    RAISE WARNING '⚠️  HAY PROBLEMAS QUE DEBEN RESOLVERSE';
    RAISE NOTICE 'Revisa las secciones anteriores para más detalles';
  END IF;
  
END $$;

-- =====================================================
-- SECCIÓN 9: Consultas Útiles para Debugging
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '10. CONSULTAS ÚTILES PARA DEBUGGING';
RAISE NOTICE '========================================';
RAISE NOTICE '';
RAISE NOTICE 'Para ver todas las políticas con sus condiciones:';
RAISE NOTICE 'SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = ''solicitudes_mantenimiento'';';
RAISE NOTICE '';
RAISE NOTICE 'Para ver el usuario actual:';
RAISE NOTICE 'SELECT get_current_user_id(), auth.uid();';
RAISE NOTICE '';
RAISE NOTICE 'Para verificar si un usuario es admin:';
RAISE NOTICE 'SELECT is_admin(get_current_user_id());';
RAISE NOTICE '';
RAISE NOTICE 'Para contar solicitudes visibles (requiere usuario autenticado):';
RAISE NOTICE 'SELECT COUNT(*) FROM solicitudes_mantenimiento;';
RAISE NOTICE '';

-- =====================================================
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- =====================================================


