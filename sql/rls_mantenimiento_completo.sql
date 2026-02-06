-- =====================================================
-- POLÍTICAS RLS (Row Level Security) PARA MANTENIMIENTO
-- Sistema de Gestión Condominial
-- =====================================================
-- Este script crea todas las políticas RLS necesarias para
-- garantizar la seguridad del sistema de mantenimiento
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor

-- =====================================================
-- 1. FUNCIONES AUXILIARES (si no existen)
-- =====================================================

-- Función para obtener el ID del usuario actual desde Supabase Auth
-- IMPORTANTE: Esta función asume que la tabla usuarios tiene un campo auth_uid
-- que coincide con auth.uid() de Supabase
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  -- Obtener el ID del usuario desde la tabla usuarios usando auth.uid()
  RETURN (
    SELECT id 
    FROM usuarios 
    WHERE auth_uid = auth.uid() 
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay algún error, retornar NULL
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION is_admin(user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id AND rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es conserje
CREATE OR REPLACE FUNCTION is_conserje(user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id AND rol = 'conserje'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. HABILITAR RLS EN TABLAS
-- =====================================================

-- Habilitar RLS en solicitudes_mantenimiento
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en avances_mantenimiento (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avances_mantenimiento') THEN
    ALTER TABLE avances_mantenimiento ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- 3. POLÍTICAS PARA solicitudes_mantenimiento
-- =====================================================

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Usuarios y conserjes pueden actualizar solicitudes" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Solo admins pueden eliminar solicitudes" ON solicitudes_mantenimiento;

-- Política SELECT: 
-- - Usuarios ven sus propias solicitudes
-- - Responsables ven solicitudes asignadas a ellos
-- - Conserjes ven todas las solicitudes de su condominio
-- - Administradores ven todas las solicitudes
CREATE POLICY "Usuarios ven sus solicitudes de mantenimiento"
ON solicitudes_mantenimiento FOR SELECT
USING (
  usuario_solicitante_id = get_current_user_id() OR
  responsable_id = get_current_user_id() OR
  (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = get_current_user_id() 
      AND rol = 'conserje' 
      AND condominio_id = solicitudes_mantenimiento.condominio_id
    )
  ) OR
  is_admin(get_current_user_id())
);

-- Política INSERT:
-- - Usuarios pueden crear solicitudes solo para sí mismos
-- - El estado inicial debe ser 'pendiente'
CREATE POLICY "Usuarios pueden crear solicitudes"
ON solicitudes_mantenimiento FOR INSERT
WITH CHECK (
  usuario_solicitante_id = get_current_user_id() AND
  estado = 'pendiente'
);

-- Política UPDATE:
-- - Usuarios pueden actualizar solo sus solicitudes pendientes
-- - Responsables pueden actualizar solicitudes asignadas a ellos
-- - Conserjes pueden actualizar solicitudes de su condominio
-- - Administradores pueden actualizar cualquier solicitud
CREATE POLICY "Usuarios y conserjes pueden actualizar solicitudes"
ON solicitudes_mantenimiento FOR UPDATE
USING (
  usuario_solicitante_id = get_current_user_id() OR
  responsable_id = get_current_user_id() OR
  (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = get_current_user_id() 
      AND rol = 'conserje' 
      AND condominio_id = solicitudes_mantenimiento.condominio_id
    )
  ) OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Si es el usuario solicitante, solo puede actualizar si está pendiente
  (usuario_solicitante_id = get_current_user_id() AND estado = 'pendiente') OR
  responsable_id = get_current_user_id() OR
  (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = get_current_user_id() 
      AND rol = 'conserje' 
      AND condominio_id = solicitudes_mantenimiento.condominio_id
    )
  ) OR
  is_admin(get_current_user_id())
);

-- Política DELETE:
-- - Solo administradores pueden eliminar solicitudes
CREATE POLICY "Solo admins pueden eliminar solicitudes"
ON solicitudes_mantenimiento FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 4. POLÍTICAS PARA avances_mantenimiento (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avances_mantenimiento') THEN
    
    -- Eliminar políticas existentes si existen
    DROP POLICY IF EXISTS "Usuarios ven avances de sus solicitudes" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Responsables y admins pueden crear avances" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Responsables y admins pueden actualizar avances" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Solo admins pueden eliminar avances" ON avances_mantenimiento;

    -- Política SELECT:
    -- - Usuarios ven avances de sus propias solicitudes
    -- - Responsables ven avances de solicitudes asignadas
    -- - Administradores ven todos los avances
    CREATE POLICY "Usuarios ven avances de sus solicitudes"
    ON avances_mantenimiento FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM solicitudes_mantenimiento sm
        WHERE sm.id = avances_mantenimiento.solicitud_id
        AND (
          sm.usuario_solicitante_id = get_current_user_id() OR
          sm.responsable_id = get_current_user_id() OR
          is_admin(get_current_user_id())
        )
      )
    );

    -- Política INSERT:
    -- - Responsables pueden crear avances en solicitudes asignadas
    -- - Administradores pueden crear avances en cualquier solicitud
    CREATE POLICY "Responsables y admins pueden crear avances"
    ON avances_mantenimiento FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM solicitudes_mantenimiento sm
        WHERE sm.id = avances_mantenimiento.solicitud_id
        AND (
          sm.responsable_id = get_current_user_id() OR
          is_admin(get_current_user_id())
        )
      )
      AND creado_por = get_current_user_id()
    );

    -- Política UPDATE:
    -- - Solo quien creó el avance o un administrador puede actualizarlo
    CREATE POLICY "Responsables y admins pueden actualizar avances"
    ON avances_mantenimiento FOR UPDATE
    USING (
      creado_por = get_current_user_id() OR
      is_admin(get_current_user_id())
    )
    WITH CHECK (
      creado_por = get_current_user_id() OR
      is_admin(get_current_user_id())
    );

    -- Política DELETE:
    -- - Solo administradores pueden eliminar avances
    CREATE POLICY "Solo admins pueden eliminar avances"
    ON avances_mantenimiento FOR DELETE
    USING (is_admin(get_current_user_id()));

  END IF;
END $$;

-- =====================================================
-- 5. VERIFICACIÓN DE POLÍTICAS CREADAS
-- =====================================================

-- Verificar políticas de solicitudes_mantenimiento
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
ORDER BY policyname;

-- Verificar políticas de avances_mantenimiento (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avances_mantenimiento') THEN
    RAISE NOTICE 'Verificando políticas de avances_mantenimiento...';
    PERFORM 1;
  END IF;
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Las políticas RLS están ahora activas y protegiendo el acceso a los datos
-- de mantenimiento según los roles y permisos de los usuarios.

