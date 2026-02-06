-- =====================================================
-- CORREGIR POLÍTICA INSERT PARA MANTENIMIENTO
-- Esta corrección permite que la política funcione
-- incluso cuando get_current_user_id() retorna NULL
-- (cuando no hay sesión de Supabase Auth activa)
-- =====================================================

-- Eliminar política existente
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON solicitudes_mantenimiento;

-- Crear política INSERT mejorada
-- Esta política es más permisiva para funcionar con el sistema actual
-- que no usa Supabase Auth completo
-- 
-- IMPORTANTE: Esta política es menos restrictiva porque el sistema actual
-- no tiene sesiones de Supabase Auth activas. Para mayor seguridad,
-- considera migrar a Supabase Auth completo.
CREATE POLICY "Usuarios pueden crear solicitudes"
ON solicitudes_mantenimiento FOR INSERT
WITH CHECK (
  -- El estado inicial debe ser 'pendiente' (requisito principal)
  estado = 'pendiente'
  AND
  -- Verificar que el usuario_solicitante_id existe en la tabla usuarios
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = usuario_solicitante_id
  )
  AND
  -- Si hay usuario autenticado en Supabase Auth, verificar que coincida
  (
    get_current_user_id() IS NULL 
    OR 
    usuario_solicitante_id = get_current_user_id()
  )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que la política se creó correctamente
SELECT 
  'Política INSERT Actualizada' as "Estado",
  policyname as "Política",
  cmd as "Operación",
  with_check::text as "Condición WITH CHECK"
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
AND cmd = 'INSERT'
AND policyname = 'Usuarios pueden crear solicitudes';

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Esta política es más permisiva para permitir que funcione
-- con el sistema de autenticación actual (localStorage).
-- 
-- Para mayor seguridad, considera:
-- 1. Migrar a Supabase Auth completo
-- 2. O implementar un sistema de sesiones que funcione con RLS
-- 
-- Por ahora, esta política permite crear solicitudes siempre que:
-- - El estado sea 'pendiente'
-- - Y si hay usuario autenticado en Supabase Auth, que coincida el ID

