-- =====================================================
-- POLÍTICAS RLS (Row Level Security) - VERSIÓN SUPABASE AUTH
-- Sistema Gestión Condominial - Ciudad Colonial
-- =====================================================
-- Esta versión usa auth.uid() directamente para identificar usuarios autenticados
-- REQUIERE: Que la tabla usuarios tenga un campo auth_uid que coincida con auth.uid()

-- =====================================================
-- FUNCIÓN AUXILIAR: Obtener ID de usuario actual desde auth.uid()
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT id FROM usuarios 
    WHERE auth_uid = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN AUXILIAR: Verificar si usuario es admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin(user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id AND rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN AUXILIAR: Verificar si usuario pertenece al mismo condominio
-- =====================================================
CREATE OR REPLACE FUNCTION same_condominio(user_id INTEGER, condominio_id_check INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id AND condominio_id = condominio_id_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. TABLA: usuarios
-- =====================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios pueden ver su propio perfil y administradores pueden ver todos
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON usuarios;
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON usuarios FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND id = get_current_user_id()) OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Cualquiera puede registrarse (pero sin rol, pendiente de aprobación)
DROP POLICY IF EXISTS "Cualquiera puede registrarse" ON usuarios;
CREATE POLICY "Cualquiera puede registrarse"
ON usuarios FOR INSERT
WITH CHECK (true);

-- Política: UPDATE - Usuarios pueden actualizar su propio perfil (excepto rol), admins pueden actualizar todo
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON usuarios;
CREATE POLICY "Usuarios pueden actualizar su perfil"
ON usuarios FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND id = get_current_user_id()) OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Si no es admin, no puede cambiar su rol
  (id = get_current_user_id() AND NOT is_admin(get_current_user_id()) AND rol IS NOT DISTINCT FROM (SELECT rol FROM usuarios WHERE id = get_current_user_id())) OR
  is_admin(get_current_user_id())
);

-- Política: DELETE - Solo administradores pueden eliminar usuarios
DROP POLICY IF EXISTS "Solo admins pueden eliminar usuarios" ON usuarios;
CREATE POLICY "Solo admins pueden eliminar usuarios"
ON usuarios FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 2. TABLA: condominios
-- =====================================================
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver condominios" ON condominios;
CREATE POLICY "Todos pueden ver condominios"
ON condominios FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Solo admins gestionan condominios" ON condominios;
CREATE POLICY "Solo admins gestionan condominios"
ON condominios FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 3. TABLA: viviendas
-- =====================================================
ALTER TABLE viviendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven viviendas de su condominio" ON viviendas;
CREATE POLICY "Usuarios ven viviendas de su condominio"
ON viviendas FOR SELECT
USING (
  condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id()) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins gestionan viviendas" ON viviendas;
CREATE POLICY "Solo admins gestionan viviendas"
ON viviendas FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 4. TABLA: usuario_vivienda
-- =====================================================
ALTER TABLE usuario_vivienda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus relaciones vivienda" ON usuario_vivienda;
CREATE POLICY "Usuarios ven sus relaciones vivienda"
ON usuario_vivienda FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins gestionan relaciones vivienda" ON usuario_vivienda;
CREATE POLICY "Solo admins gestionan relaciones vivienda"
ON usuario_vivienda FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 5. TABLA: pagos
-- =====================================================
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus propios pagos" ON pagos;
CREATE POLICY "Usuarios ven sus propios pagos"
ON pagos FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden solicitar pagos" ON pagos;
CREATE POLICY "Usuarios pueden solicitar pagos"
ON pagos FOR INSERT
WITH CHECK (
  (usuario_id = get_current_user_id() AND estado = 'pendiente') OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus pagos pendientes" ON pagos;
CREATE POLICY "Usuarios pueden actualizar sus pagos pendientes"
ON pagos FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  (usuario_id = get_current_user_id() AND estado = 'pendiente') OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins pueden eliminar pagos" ON pagos;
CREATE POLICY "Solo admins pueden eliminar pagos"
ON pagos FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 6. TABLA: historial_pagos
-- =====================================================
ALTER TABLE historial_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven historial de sus pagos" ON historial_pagos;
CREATE POLICY "Usuarios ven historial de sus pagos"
ON historial_pagos FOR SELECT
USING (
  pago_id IN (SELECT id FROM pagos WHERE usuario_id = get_current_user_id()) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo sistema y admins insertan historial" ON historial_pagos;
CREATE POLICY "Solo sistema y admins insertan historial"
ON historial_pagos FOR INSERT
WITH CHECK (
  usuario_actor_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins modifican historial" ON historial_pagos;
CREATE POLICY "Solo admins modifican historial"
ON historial_pagos FOR UPDATE
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

DROP POLICY IF EXISTS "Solo admins eliminan historial" ON historial_pagos;
CREATE POLICY "Solo admins eliminan historial"
ON historial_pagos FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 7. TABLA: anuncios
-- =====================================================
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven anuncios relevantes" ON anuncios;
CREATE POLICY "Usuarios ven anuncios relevantes"
ON anuncios FOR SELECT
USING (
  (activo = true AND (
    condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id()) OR
    condominio_id IS NULL
  )) OR
  autor_usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden crear anuncios" ON anuncios;
CREATE POLICY "Usuarios pueden crear anuncios"
ON anuncios FOR INSERT
WITH CHECK (
  (autor_usuario_id = get_current_user_id() AND 
   condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id())) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Autor o admin puede actualizar anuncio" ON anuncios;
CREATE POLICY "Autor o admin puede actualizar anuncio"
ON anuncios FOR UPDATE
USING (
  autor_usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  autor_usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Autor o admin puede eliminar anuncio" ON anuncios;
CREATE POLICY "Autor o admin puede eliminar anuncio"
ON anuncios FOR DELETE
USING (
  autor_usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- =====================================================
-- 8. TABLA: espacios_comunes
-- =====================================================
ALTER TABLE espacios_comunes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven espacios comunes" ON espacios_comunes;
CREATE POLICY "Usuarios ven espacios comunes"
ON espacios_comunes FOR SELECT
USING (
  (activo = true AND (
    condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id()) OR
    condominio_id IS NULL
  )) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins gestionan espacios comunes" ON espacios_comunes;
CREATE POLICY "Solo admins gestionan espacios comunes"
ON espacios_comunes FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 9. TABLA: reservas_espacios
-- =====================================================
ALTER TABLE reservas_espacios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus reservas y reservas públicas" ON reservas_espacios;
CREATE POLICY "Usuarios ven sus reservas y reservas públicas"
ON reservas_espacios FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  (estado = 'aprobado' AND espacio_id IN (
    SELECT id FROM espacios_comunes 
    WHERE condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id())
  )) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden crear reservas" ON reservas_espacios;
CREATE POLICY "Usuarios pueden crear reservas"
ON reservas_espacios FOR INSERT
WITH CHECK (
  usuario_id = get_current_user_id() AND
  estado = 'pendiente'
);

DROP POLICY IF EXISTS "Usuarios pueden gestionar sus reservas" ON reservas_espacios;
CREATE POLICY "Usuarios pueden gestionar sus reservas"
ON reservas_espacios FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  (usuario_id = get_current_user_id() AND estado = 'cancelado') OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins pueden eliminar reservas" ON reservas_espacios;
CREATE POLICY "Solo admins pueden eliminar reservas"
ON reservas_espacios FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 10. TABLA: solicitudes_mantenimiento
-- =====================================================
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus solicitudes de mantenimiento" ON solicitudes_mantenimiento;
CREATE POLICY "Usuarios ven sus solicitudes de mantenimiento"
ON solicitudes_mantenimiento FOR SELECT
USING (
  usuario_solicitante_id = get_current_user_id() OR
  responsable_id = get_current_user_id() OR
  (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = get_current_user_id() 
    AND rol = 'conserje' 
    AND condominio_id = solicitudes_mantenimiento.condominio_id
  )) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes" ON solicitudes_mantenimiento;
CREATE POLICY "Usuarios pueden crear solicitudes"
ON solicitudes_mantenimiento FOR INSERT
WITH CHECK (
  usuario_solicitante_id = get_current_user_id() AND
  estado = 'pendiente'
);

DROP POLICY IF EXISTS "Usuarios y conserjes pueden actualizar solicitudes" ON solicitudes_mantenimiento;
CREATE POLICY "Usuarios y conserjes pueden actualizar solicitudes"
ON solicitudes_mantenimiento FOR UPDATE
USING (
  usuario_solicitante_id = get_current_user_id() OR
  responsable_id = get_current_user_id() OR
  (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = get_current_user_id() 
    AND rol = 'conserje' 
    AND condominio_id = solicitudes_mantenimiento.condominio_id
  )) OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  (usuario_solicitante_id = get_current_user_id() AND estado = 'pendiente') OR
  responsable_id = get_current_user_id() OR
  (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = get_current_user_id() 
    AND rol = 'conserje' 
    AND condominio_id = solicitudes_mantenimiento.condominio_id
  )) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins pueden eliminar solicitudes" ON solicitudes_mantenimiento;
CREATE POLICY "Solo admins pueden eliminar solicitudes"
ON solicitudes_mantenimiento FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 11. TABLA: archivos
-- =====================================================
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus archivos" ON archivos;
CREATE POLICY "Usuarios ven sus archivos"
ON archivos FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden subir archivos" ON archivos;
CREATE POLICY "Usuarios pueden subir archivos"
ON archivos FOR INSERT
WITH CHECK (usuario_id = get_current_user_id());

DROP POLICY IF EXISTS "Propietario o admin puede actualizar archivo" ON archivos;
CREATE POLICY "Propietario o admin puede actualizar archivo"
ON archivos FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Propietario o admin puede eliminar archivo" ON archivos;
CREATE POLICY "Propietario o admin puede eliminar archivo"
ON archivos FOR DELETE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- =====================================================
-- 12. TABLA: notificaciones
-- =====================================================
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven solo sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven solo sus notificaciones"
ON notificaciones FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Sistema y admins pueden crear notificaciones" ON notificaciones;
CREATE POLICY "Sistema y admins pueden crear notificaciones"
ON notificaciones FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios pueden actualizar sus notificaciones"
ON notificaciones FOR UPDATE
USING (usuario_id = get_current_user_id())
WITH CHECK (usuario_id = get_current_user_id());

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios pueden eliminar sus notificaciones"
ON notificaciones FOR DELETE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- =====================================================
-- 13. TABLA: ordenes
-- =====================================================
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus órdenes" ON ordenes;
CREATE POLICY "Usuarios ven sus órdenes"
ON ordenes FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Usuarios pueden crear órdenes" ON ordenes;
CREATE POLICY "Usuarios pueden crear órdenes"
ON ordenes FOR INSERT
WITH CHECK (usuario_id = get_current_user_id());

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus órdenes" ON ordenes;
CREATE POLICY "Usuarios pueden actualizar sus órdenes"
ON ordenes FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  (usuario_id = get_current_user_id() AND estado IN ('pendiente', 'cancelado')) OR
  is_admin(get_current_user_id())
);

DROP POLICY IF EXISTS "Solo admins pueden eliminar órdenes" ON ordenes;
CREATE POLICY "Solo admins pueden eliminar órdenes"
ON ordenes FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 14. TABLA: tipos_residencia
-- =====================================================
ALTER TABLE tipos_residencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver tipos de residencia" ON tipos_residencia;
CREATE POLICY "Todos pueden ver tipos de residencia"
ON tipos_residencia FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Solo admins gestionan tipos de residencia" ON tipos_residencia;
CREATE POLICY "Solo admins gestionan tipos de residencia"
ON tipos_residencia FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- NOTAS FINALES
-- =====================================================
-- 1. Este script usa auth.uid() de Supabase Auth para identificar usuarios.
-- 2. Asegúrate de que la tabla usuarios tenga un campo auth_uid que coincida con auth.uid().
-- 3. Las funciones SECURITY DEFINER se ejecutan con permisos elevados.
-- 4. Prueba las políticas en desarrollo antes de producción.
-- 5. Para deshabilitar RLS temporalmente: ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;

