-- =====================================================
-- APLICAR POLÍTICAS RLS PARA MANTENIMIENTO
-- Script simplificado para ejecutar directamente en Supabase
-- =====================================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script completo en el SQL Editor de Supabase
-- 2. Ejecuta el script completo
-- 3. Verifica que no haya errores

-- =====================================================
-- PASO 1: Crear/Actualizar Funciones Auxiliares
-- =====================================================

-- Función para obtener el ID del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM usuarios 
    WHERE auth_uid = auth.uid() 
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es administrador
CREATE OR REPLACE FUNCTION is_admin(user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_id IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id AND rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es conserje
CREATE OR REPLACE FUNCTION is_conserje(user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_id IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id AND rol = 'conserje'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 2: Habilitar RLS en las Tablas
-- =====================================================

ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en avances_mantenimiento si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    ALTER TABLE avances_mantenimiento ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado en avances_mantenimiento';
  ELSE
    RAISE NOTICE 'Tabla avances_mantenimiento no existe, se omitirá';
  END IF;
END $$;

-- =====================================================
-- PASO 3: Eliminar Políticas Existentes (si existen)
-- =====================================================

DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Usuarios y conserjes pueden actualizar solicitudes" ON solicitudes_mantenimiento;
DROP POLICY IF EXISTS "Solo admins pueden eliminar solicitudes" ON solicitudes_mantenimiento;

-- Eliminar políticas de avances si existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    DROP POLICY IF EXISTS "Usuarios ven avances de sus solicitudes" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Responsables y admins pueden crear avances" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Responsables y admins pueden actualizar avances" ON avances_mantenimiento;
    DROP POLICY IF EXISTS "Solo admins pueden eliminar avances" ON avances_mantenimiento;
  END IF;
END $$;

-- =====================================================
-- PASO 4: Crear Políticas para solicitudes_mantenimiento
-- =====================================================

-- SELECT: Ver solicitudes
CREATE POLICY "Usuarios ven sus solicitudes de mantenimiento"
ON solicitudes_mantenimiento FOR SELECT
USING (
  -- El usuario puede ver sus propias solicitudes
  usuario_solicitante_id = get_current_user_id() 
  OR
  -- El responsable puede ver solicitudes asignadas a él
  responsable_id = get_current_user_id()
  OR
  -- Conserjes pueden ver solicitudes de su condominio
  (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = get_current_user_id()
      AND u.rol = 'conserje'
      AND u.condominio_id = solicitudes_mantenimiento.condominio_id
    )
  )
  OR
  -- Administradores pueden ver todas
  is_admin(get_current_user_id())
);

-- INSERT: Crear solicitudes
CREATE POLICY "Usuarios pueden crear solicitudes"
ON solicitudes_mantenimiento FOR INSERT
WITH CHECK (
  -- Solo puede crear solicitudes para sí mismo
  usuario_solicitante_id = get_current_user_id() 
  AND 
  -- El estado inicial debe ser 'pendiente'
  estado = 'pendiente'
);

-- UPDATE: Actualizar solicitudes
CREATE POLICY "Usuarios y conserjes pueden actualizar solicitudes"
ON solicitudes_mantenimiento FOR UPDATE
USING (
  -- Usuario puede actualizar sus solicitudes pendientes
  (usuario_solicitante_id = get_current_user_id() AND estado = 'pendiente')
  OR
  -- Responsable puede actualizar solicitudes asignadas
  responsable_id = get_current_user_id()
  OR
  -- Conserjes pueden actualizar solicitudes de su condominio
  (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = get_current_user_id()
      AND u.rol = 'conserje'
      AND u.condominio_id = solicitudes_mantenimiento.condominio_id
    )
  )
  OR
  -- Administradores pueden actualizar cualquier solicitud
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Mismas reglas para validar los cambios
  (usuario_solicitante_id = get_current_user_id() AND estado = 'pendiente')
  OR
  responsable_id = get_current_user_id()
  OR
  (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = get_current_user_id()
      AND u.rol = 'conserje'
      AND u.condominio_id = solicitudes_mantenimiento.condominio_id
    )
  )
  OR
  is_admin(get_current_user_id())
);

-- DELETE: Eliminar solicitudes
CREATE POLICY "Solo admins pueden eliminar solicitudes"
ON solicitudes_mantenimiento FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- PASO 5: Crear Políticas para avances_mantenimiento (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    
    -- SELECT: Ver avances
    CREATE POLICY "Usuarios ven avances de sus solicitudes"
    ON avances_mantenimiento FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM solicitudes_mantenimiento sm
        WHERE sm.id = avances_mantenimiento.solicitud_id
        AND (
          sm.usuario_solicitante_id = get_current_user_id()
          OR
          sm.responsable_id = get_current_user_id()
          OR
          is_admin(get_current_user_id())
        )
      )
    );

    -- INSERT: Crear avances
    CREATE POLICY "Responsables y admins pueden crear avances"
    ON avances_mantenimiento FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM solicitudes_mantenimiento sm
        WHERE sm.id = avances_mantenimiento.solicitud_id
        AND (
          sm.responsable_id = get_current_user_id()
          OR
          is_admin(get_current_user_id())
        )
      )
      AND
      creado_por = get_current_user_id()
    );

    -- UPDATE: Actualizar avances
    CREATE POLICY "Responsables y admins pueden actualizar avances"
    ON avances_mantenimiento FOR UPDATE
    USING (
      creado_por = get_current_user_id()
      OR
      is_admin(get_current_user_id())
    )
    WITH CHECK (
      creado_por = get_current_user_id()
      OR
      is_admin(get_current_user_id())
    );

    -- DELETE: Eliminar avances
    CREATE POLICY "Solo admins pueden eliminar avances"
    ON avances_mantenimiento FOR DELETE
    USING (is_admin(get_current_user_id()));

    RAISE NOTICE 'Políticas creadas para avances_mantenimiento';
  END IF;
END $$;

-- =====================================================
-- PASO 6: Verificación
-- =====================================================

-- Mostrar políticas creadas para solicitudes_mantenimiento
SELECT 
  'solicitudes_mantenimiento' as tabla,
  policyname as politica,
  cmd as operacion
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento'
ORDER BY policyname;

-- Mostrar políticas creadas para avances_mantenimiento (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'avances_mantenimiento'
  ) THEN
    RAISE NOTICE 'Verificando políticas de avances_mantenimiento...';
  END IF;
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ Las políticas RLS están ahora activas
-- ✅ Los usuarios solo pueden ver/modificar sus propias solicitudes
-- ✅ Los administradores tienen acceso completo
-- ✅ Los conserjes pueden gestionar solicitudes de su condominio





