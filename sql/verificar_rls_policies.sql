-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE POLÍTICAS RLS
-- Sistema Gestión Condominial - Ciudad Colonial
-- =====================================================
-- Este script verifica que las políticas RLS estén correctamente configuradas

\echo '========================================'
\echo 'VERIFICACIÓN DE POLÍTICAS RLS'
\echo '========================================'
\echo ''

-- =====================================================
-- 1. VERIFICAR QUE LAS FUNCIONES EXISTEN
-- =====================================================
\echo '1. Verificando funciones auxiliares...'
\echo ''

DO $$
BEGIN
    -- Verificar get_current_user_id()
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_id') THEN
        RAISE NOTICE '✅ Función get_current_user_id() existe';
    ELSE
        RAISE WARNING '❌ Función get_current_user_id() NO existe';
    END IF;

    -- Verificar is_admin()
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        RAISE NOTICE '✅ Función is_admin() existe';
    ELSE
        RAISE WARNING '❌ Función is_admin() NO existe';
    END IF;

    -- Verificar same_condominio()
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'same_condominio') THEN
        RAISE NOTICE '✅ Función same_condominio() existe';
    ELSE
        RAISE WARNING '❌ Función same_condominio() NO existe';
    END IF;
END $$;

\echo ''

-- =====================================================
-- 2. VERIFICAR QUE RLS ESTÁ HABILITADO EN TABLAS
-- =====================================================
\echo '2. Verificando que RLS está habilitado...'
\echo ''

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Habilitado'
        ELSE '❌ Deshabilitado'
    END as estado_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'usuarios', 'condominios', 'viviendas', 'usuario_vivienda',
    'pagos', 'historial_pagos', 'anuncios', 'espacios_comunes',
    'reservas_espacios', 'solicitudes_mantenimiento', 'archivos',
    'notificaciones', 'ordenes', 'tipos_residencia'
)
ORDER BY tablename;

\echo ''

-- =====================================================
-- 3. VERIFICAR QUE LAS POLÍTICAS EXISTEN
-- =====================================================
\echo '3. Verificando políticas creadas...'
\echo ''

SELECT 
    tablename,
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE cmd::text
    END as operacion,
    CASE permissive
        WHEN true THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END as tipo
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo 'Conteo de políticas por tabla:'
SELECT 
    tablename,
    COUNT(*) as total_politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- =====================================================
-- 4. VERIFICAR ESTRUCTURA DE TABLA usuarios
-- =====================================================
\echo '4. Verificando estructura de tabla usuarios...'
\echo ''

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'usuarios'
AND column_name IN ('id', 'auth_uid', 'rol', 'condominio_id', 'correo')
ORDER BY ordinal_position;

\echo ''

-- Verificar si auth_uid es UUID (si estás usando Supabase Auth)
DO $$
DECLARE
    auth_uid_type text;
BEGIN
    SELECT data_type INTO auth_uid_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usuarios'
    AND column_name = 'auth_uid';
    
    IF auth_uid_type IS NULL THEN
        RAISE WARNING '⚠️ Columna auth_uid no existe en tabla usuarios';
    ELSIF auth_uid_type = 'uuid' THEN
        RAISE NOTICE '✅ auth_uid es tipo UUID (correcto para Supabase Auth)';
    ELSE
        RAISE WARNING '⚠️ auth_uid es tipo % (debería ser UUID para Supabase Auth)', auth_uid_type;
    END IF;
END $$;

\echo ''

-- =====================================================
-- 5. VERIFICAR QUE EXISTEN USUARIOS DE PRUEBA
-- =====================================================
\echo '5. Verificando usuarios en la base de datos...'
\echo ''

SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN rol = 'admin' THEN 1 END) as total_admins,
    COUNT(CASE WHEN rol IS NULL THEN 1 END) as usuarios_pendientes,
    COUNT(CASE WHEN auth_uid IS NOT NULL THEN 1 END) as usuarios_con_auth_uid
FROM usuarios;

\echo ''
\echo 'Ejemplos de usuarios (primeros 5):'
SELECT id, nombre, correo, rol, 
    CASE WHEN auth_uid IS NOT NULL THEN '✅' ELSE '❌' END as tiene_auth_uid
FROM usuarios
ORDER BY id
LIMIT 5;

\echo ''

-- =====================================================
-- 6. PROBAR FUNCIONES AUXILIARES
-- =====================================================
\echo '6. Probando funciones auxiliares...'
\echo ''

-- Probar is_admin con diferentes IDs
DO $$
DECLARE
    test_user_id INTEGER;
    test_result BOOLEAN;
BEGIN
    -- Obtener primer usuario admin
    SELECT id INTO test_user_id FROM usuarios WHERE rol = 'admin' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        SELECT is_admin(test_user_id) INTO test_result;
        IF test_result THEN
            RAISE NOTICE '✅ is_admin(%) retorna TRUE (correcto)', test_user_id;
        ELSE
            RAISE WARNING '❌ is_admin(%) retorna FALSE (incorrecto)', test_user_id;
        END IF;
    ELSE
        RAISE WARNING '⚠️ No se encontró usuario admin para probar';
    END IF;
    
    -- Probar con usuario no admin
    SELECT id INTO test_user_id FROM usuarios WHERE rol != 'admin' OR rol IS NULL LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        SELECT is_admin(test_user_id) INTO test_result;
        IF NOT test_result THEN
            RAISE NOTICE '✅ is_admin(%) retorna FALSE para usuario no-admin (correcto)', test_user_id;
        ELSE
            RAISE WARNING '❌ is_admin(%) retorna TRUE para usuario no-admin (incorrecto)', test_user_id;
        END IF;
    END IF;
END $$;

\echo ''

-- =====================================================
-- 7. VERIFICAR POLÍTICAS ESPECÍFICAS POR TABLA
-- =====================================================
\echo '7. Verificando políticas específicas...'
\echo ''

-- Verificar que cada tabla tiene políticas necesarias
DO $$
DECLARE
    tabla_record RECORD;
    politica_count INTEGER;
    tablas_esperadas TEXT[] := ARRAY[
        'usuarios', 'condominios', 'viviendas', 'usuario_vivienda',
        'pagos', 'historial_pagos', 'anuncios', 'espacios_comunes',
        'reservas_espacios', 'solicitudes_mantenimiento', 'archivos',
        'notificaciones', 'ordenes', 'tipos_residencia'
    ];
    tabla TEXT;
BEGIN
    FOREACH tabla IN ARRAY tablas_esperadas
    LOOP
        SELECT COUNT(*) INTO politica_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = tabla;
        
        IF politica_count > 0 THEN
            RAISE NOTICE '✅ Tabla % tiene % políticas', tabla, politica_count;
        ELSE
            RAISE WARNING '❌ Tabla % NO tiene políticas', tabla;
        END IF;
    END LOOP;
END $$;

\echo ''

-- =====================================================
-- 8. RESUMEN FINAL
-- =====================================================
\echo '========================================'
\echo 'RESUMEN DE VERIFICACIÓN'
\echo '========================================'
\echo ''

-- Contar total de políticas
DO $$
DECLARE
    total_politicas INTEGER;
    total_tablas_rls INTEGER;
    total_funciones INTEGER;
BEGIN
    SELECT COUNT(DISTINCT tablename) INTO total_tablas_rls
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true
    AND tablename IN (
        'usuarios', 'condominios', 'viviendas', 'usuario_vivienda',
        'pagos', 'historial_pagos', 'anuncios', 'espacios_comunes',
        'reservas_espacios', 'solicitudes_mantenimiento', 'archivos',
        'notificaciones', 'ordenes', 'tipos_residencia'
    );
    
    SELECT COUNT(*) INTO total_politicas
    FROM pg_policies
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO total_funciones
    FROM pg_proc
    WHERE proname IN ('get_current_user_id', 'is_admin', 'same_condominio');
    
    RAISE NOTICE 'Tablas con RLS habilitado: %', total_tablas_rls;
    RAISE NOTICE 'Total de políticas creadas: %', total_politicas;
    RAISE NOTICE 'Funciones auxiliares encontradas: %', total_funciones;
    
    IF total_tablas_rls >= 14 AND total_politicas >= 40 AND total_funciones = 3 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ VERIFICACIÓN EXITOSA: Las políticas RLS están correctamente configuradas';
    ELSE
        RAISE WARNING '';
        RAISE WARNING '⚠️ VERIFICACIÓN INCOMPLETA: Revisa los resultados anteriores';
    END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'VERIFICACIÓN COMPLETA'
\echo '========================================'
\echo ''
\echo 'NOTA: Para probar las políticas con usuarios reales, necesitas:'
\echo '1. Estar autenticado con Supabase Auth'
\echo '2. Que auth_uid en usuarios coincida con auth.uid()'
\echo '3. Ejecutar consultas desde tu aplicación (no desde SQL directo)'
\echo ''

