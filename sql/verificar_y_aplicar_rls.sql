-- =====================================================
-- VERIFICACIÓN RÁPIDA DE POLÍTICAS RLS
-- Ejecuta esto en Supabase SQL Editor para verificar el estado
-- =====================================================

-- 1. Verificar si las funciones existen
SELECT 
    'Funciones' as tipo,
    proname as nombre,
    CASE 
        WHEN proname IN ('get_current_user_id', 'is_admin', 'same_condominio') 
        THEN '✅ Existe'
        ELSE '❌ No encontrada'
    END as estado
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'same_condominio')
ORDER BY proname;

-- Si no aparecen resultados, las funciones no están creadas
-- Necesitas ejecutar: sql/rls_policies_supabase_auth.sql

\echo ''
\echo '========================================'
\echo ''

-- 2. Verificar RLS en tablas principales
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

-- 3. Contar políticas por tabla
SELECT 
    tablename as tabla,
    COUNT(*) as total_politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '========================================'
\echo ''

-- 4. Verificar tipo de auth_uid
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN '✅ Correcto (UUID)'
        WHEN data_type IS NULL THEN '❌ Columna no existe'
        ELSE '⚠️  Tipo: ' || data_type || ' (debería ser UUID)'
    END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'usuarios'
AND column_name = 'auth_uid';

\echo ''
\echo '========================================'
\echo ''
\echo 'RESUMEN:'
\echo ''
\echo 'Si ves:'
\echo '  ✅ = Correcto'
\echo '  ❌ = Necesita corrección'
\echo '  ⚠️  = Advertencia'
\echo ''
\echo 'Si alguna tabla no tiene RLS habilitado o no tiene políticas:'
\echo '  Ejecuta: sql/rls_policies_supabase_auth.sql'
\echo ''

