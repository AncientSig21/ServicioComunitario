-- =====================================================
-- SCRIPT DE VERIFICACIÓN DESPUÉS DE ACTIVAR RLS
-- Ejecuta esto después de aplicar las políticas
-- =====================================================

-- 1. Verificar funciones
SELECT 
    '✅ Funciones' as categoria,
    COUNT(*) as cantidad
FROM pg_proc
WHERE proname IN ('get_current_user_id', 'is_admin', 'same_condominio')

UNION ALL

-- 2. Verificar tablas con RLS
SELECT 
    '✅ Tablas con RLS' as categoria,
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

-- 3. Contar políticas totales
SELECT 
    '✅ Políticas creadas' as categoria,
    COUNT(*) as cantidad
FROM pg_policies
WHERE schemaname = 'public';

-- 4. Detalle de políticas por tabla
SELECT 
    tablename as tabla,
    COUNT(*) as politicas,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ OK'
        WHEN COUNT(*) > 0 THEN '⚠️  Incompleto'
        ELSE '❌ Sin políticas'
    END as estado
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 5. Estado RLS por tabla
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

