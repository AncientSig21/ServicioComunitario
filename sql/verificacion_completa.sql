-- =====================================================
-- VERIFICACIÓN COMPLETA DE POLÍTICAS RLS
-- Ejecuta esto en Supabase SQL Editor para verificación detallada
-- =====================================================

-- 1. VERIFICAR FUNCIONES
SELECT 
    'Funciones Auxiliares' as categoria,
    proname as nombre,
    '✅ Existe' as estado
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'same_condominio')
ORDER BY proname;

-- Si no aparecen 3 funciones, las funciones no están creadas

\echo ''
\echo '========================================'
\echo ''

-- 2. VERIFICAR RLS EN TABLAS
SELECT 
    tablename as tabla,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Deshabilitado'
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
\echo '========================================'
\echo ''

-- 3. CONTAR POLÍTICAS POR TABLA
SELECT 
    tablename as tabla,
    COUNT(*) as total_politicas,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ OK'
        WHEN COUNT(*) > 0 THEN '⚠️  Incompleto'
        ELSE '❌ Sin políticas'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '========================================'
\echo ''

-- 4. RESUMEN GENERAL
SELECT 
    'Total de Políticas' as item,
    COUNT(*)::text as valor
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Tablas con RLS' as item,
    COUNT(*)::text as valor
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
    'Funciones Auxiliares' as item,
    COUNT(*)::text as valor
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'same_condominio');

\echo ''
\echo '========================================'
\echo 'VERIFICACIÓN COMPLETA'
\echo '========================================'
\echo ''
\echo '✅ Si ves:'
\echo '   - 3 Funciones creadas'
\echo '   - 14 Tablas con RLS habilitado'
\echo '   - 40+ Políticas creadas'
\echo ''
\echo 'Entonces todo está correcto! 🎉'
\echo ''

