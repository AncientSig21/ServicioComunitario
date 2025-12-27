-- =====================================================
-- SCRIPT DE PRUEBA DE RLS CON USUARIOS REALES
-- Sistema Gestión Condominial - Ciudad Colonial
-- =====================================================
-- Este script simula consultas como diferentes usuarios para probar RLS
-- IMPORTANTE: Estas pruebas requieren que tengas usuarios en la base de datos

\echo '========================================'
\echo 'PRUEBAS DE RLS CON USUARIOS'
\echo '========================================'
\echo ''

-- =====================================================
-- CONFIGURACIÓN: IDENTIFICAR USUARIOS DE PRUEBA
-- =====================================================

-- Crear variables temporales con IDs de usuarios de prueba
DO $$
DECLARE
    admin_id INTEGER;
    usuario_id INTEGER;
    total_usuarios INTEGER;
BEGIN
    -- Obtener un usuario admin
    SELECT id INTO admin_id 
    FROM usuarios 
    WHERE rol = 'admin' 
    LIMIT 1;
    
    -- Obtener un usuario normal
    SELECT id INTO usuario_id 
    FROM usuarios 
    WHERE (rol != 'admin' OR rol IS NULL) 
    AND rol IS NOT NULL
    LIMIT 1;
    
    SELECT COUNT(*) INTO total_usuarios FROM usuarios;
    
    RAISE NOTICE 'Total de usuarios en BD: %', total_usuarios;
    
    IF admin_id IS NOT NULL THEN
        RAISE NOTICE 'Usuario admin encontrado: ID %', admin_id;
    ELSE
        RAISE WARNING 'No se encontró usuario admin para pruebas';
    END IF;
    
    IF usuario_id IS NOT NULL THEN
        RAISE NOTICE 'Usuario normal encontrado: ID %', usuario_id;
    ELSE
        RAISE WARNING 'No se encontró usuario normal para pruebas';
    END IF;
END $$;

\echo ''

-- =====================================================
-- NOTA IMPORTANTE SOBRE PRUEBAS DE RLS
-- =====================================================
\echo '⚠️  NOTA IMPORTANTE:'
\echo ''
\echo 'Las políticas RLS funcionan en el contexto de una sesión autenticada.'
\echo 'Para probar completamente las políticas, necesitas:'
\echo ''
\echo '1. Si usas Supabase Auth:'
\echo '   - Estar autenticado con supabase.auth.signInWithPassword()'
\echo '   - Las consultas automáticamente usarán auth.uid()'
\echo '   - Probar desde tu aplicación, no desde SQL directo'
\echo ''
\echo '2. Si usas autenticación personalizada:'
\echo '   - Establecer app.current_user_id antes de cada consulta'
\echo '   - Ejemplo: SET LOCAL app.current_user_id = ''123'';'
\echo ''
\echo 'Las siguientes pruebas verifican la estructura, no el comportamiento'
\echo 'completo (para eso necesitas probar desde tu aplicación).'
\echo ''

-- =====================================================
-- VERIFICAR QUE LAS POLÍTICAS ESTÁN ACTIVAS
-- =====================================================
\echo 'Verificando que las políticas están activas...'
\echo ''

SELECT 
    'Tablas con RLS' as categoria,
    COUNT(*) as cantidad
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
AND tablename IN (
    'usuarios', 'condominios', 'viviendas', 'usuario_vivienda',
    'pagos', 'historial_pagos', 'anuncios', 'espacios_comunes',
    'reservas_espacios', 'solicitudes_mantenimiento', 'archivos',
    'notificaciones', 'ordenes', 'tipos_residencia'
)

UNION ALL

SELECT 
    'Políticas totales' as categoria,
    COUNT(*) as cantidad
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Funciones auxiliares' as categoria,
    COUNT(*) as cantidad
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'same_condominio');

\echo ''

-- =====================================================
-- VERIFICAR INTEGRIDAD DE DATOS
-- =====================================================
\echo 'Verificando integridad de datos...'
\echo ''

-- Verificar que hay relaciones válidas
DO $$
DECLARE
    usuarios_con_condominio INTEGER;
    pagos_con_usuario INTEGER;
    reservas_con_usuario INTEGER;
BEGIN
    SELECT COUNT(*) INTO usuarios_con_condominio
    FROM usuarios u
    WHERE u.condominio_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM condominios c WHERE c.id = u.condominio_id);
    
    SELECT COUNT(*) INTO pagos_con_usuario
    FROM pagos p
    WHERE p.usuario_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = p.usuario_id);
    
    SELECT COUNT(*) INTO reservas_con_usuario
    FROM reservas_espacios r
    WHERE r.usuario_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = r.usuario_id);
    
    RAISE NOTICE 'Usuarios con condominio válido: %', usuarios_con_condominio;
    RAISE NOTICE 'Pagos con usuario válido: %', pagos_con_usuario;
    RAISE NOTICE 'Reservas con usuario válido: %', reservas_con_usuario;
END $$;

\echo ''

-- =====================================================
-- EJEMPLO DE CÓMO PROBAR DESDE LA APLICACIÓN
-- =====================================================
\echo '========================================'
\echo 'CÓMO PROBAR DESDE TU APLICACIÓN'
\echo '========================================'
\echo ''
\echo 'Ejemplo 1: Probar que usuario solo ve sus propios pagos'
\echo '--------------------------------------------------------'
\echo '// En tu aplicación TypeScript/JavaScript:'
\echo ''
\echo '// 1. Autenticar usuario'
\echo 'const { data: authData } = await supabase.auth.signInWithPassword({'
\echo '  email: "usuario@ejemplo.com",'
\echo '  password: "password123"'
\echo '});'
\echo ''
\echo '// 2. Intentar leer todos los pagos'
\echo 'const { data: pagos, error } = await supabase'
\echo '  .from("pagos")'
\echo '  .select("*");'
\echo ''
\echo '// Debería retornar SOLO los pagos del usuario autenticado'
\echo '// Si el usuario intenta ver pagos de otros, RLS los bloqueará'
\echo ''
\echo 'Ejemplo 2: Probar que admin ve todos los pagos'
\echo '--------------------------------------------------------'
\echo '// Autenticar como admin'
\echo 'const { data: authData } = await supabase.auth.signInWithPassword({'
\echo '  email: "admin@ejemplo.com",'
\echo '  password: "admin123"'
\echo '});'
\echo ''
\echo '// Admin debería ver TODOS los pagos'
\echo 'const { data: todosPagos } = await supabase'
\echo '  .from("pagos")'
\echo '  .select("*");'
\echo ''
\echo '========================================'
\echo ''

