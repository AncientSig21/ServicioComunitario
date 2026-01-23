-- =====================================================
-- POLÍTICAS RLS (Row Level Security) - SISTEMA GESTIÓN CONDOMINIAL
-- Ciudad Colonial
-- =====================================================
-- Este script habilita RLS y crea políticas de seguridad para todas las tablas
-- IMPORTANTE: Ejecutar este script DESPUÉS de crear todas las tablas y funciones

-- =====================================================
-- FUNCIÓN AUXILIAR: Obtener ID de usuario actual
-- =====================================================
-- Esta función obtiene el ID del usuario actual desde la sesión
-- NOTA: Asumimos que el ID del usuario se almacena en auth.uid() o se pasa como parámetro
-- Para simplificar, usaremos una función que obtiene el usuario_id desde la sesión actual
-- Si usas Supabase Auth, puedes usar auth.uid() directamente

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  -- Si usas Supabase Auth con auth.uid(), descomenta la siguiente línea:
  -- RETURN (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1);
  
  -- Alternativa: Si almacenas el user_id en una variable de sesión
  -- RETURN current_setting('app.current_user_id', true)::integer;
  
  -- Por ahora, retornamos NULL (se manejará en las políticas)
  RETURN NULL;
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
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON usuarios FOR SELECT
USING (
  id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Cualquiera puede registrarse (pero sin rol, pendiente de aprobación)
CREATE POLICY "Cualquiera puede registrarse"
ON usuarios FOR INSERT
WITH CHECK (true);

-- Política: UPDATE - Usuarios pueden actualizar su propio perfil (excepto rol), admins pueden actualizar todo
CREATE POLICY "Usuarios pueden actualizar su perfil"
ON usuarios FOR UPDATE
USING (
  id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Si no es admin, no puede cambiar su rol
  (id = get_current_user_id() AND NOT is_admin(get_current_user_id()) AND rol IS NOT DISTINCT FROM (SELECT rol FROM usuarios WHERE id = get_current_user_id())) OR
  is_admin(get_current_user_id())
);

-- Política: DELETE - Solo administradores pueden eliminar usuarios
CREATE POLICY "Solo admins pueden eliminar usuarios"
ON usuarios FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 2. TABLA: condominios
-- =====================================================
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Todos pueden ver condominios
CREATE POLICY "Todos pueden ver condominios"
ON condominios FOR SELECT
USING (true);

-- Política: INSERT/UPDATE/DELETE - Solo administradores
CREATE POLICY "Solo admins gestionan condominios"
ON condominios FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 3. TABLA: viviendas
-- =====================================================
ALTER TABLE viviendas ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven viviendas de su condominio, admins ven todas
CREATE POLICY "Usuarios ven viviendas de su condominio"
ON viviendas FOR SELECT
USING (
  condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id()) OR
  is_admin(get_current_user_id())
);

-- Política: INSERT/UPDATE/DELETE - Solo administradores
CREATE POLICY "Solo admins gestionan viviendas"
ON viviendas FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 4. TABLA: usuario_vivienda
-- =====================================================
ALTER TABLE usuario_vivienda ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven sus propias relaciones, admins ven todas
CREATE POLICY "Usuarios ven sus relaciones vivienda"
ON usuario_vivienda FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: INSERT/UPDATE/DELETE - Solo administradores
CREATE POLICY "Solo admins gestionan relaciones vivienda"
ON usuario_vivienda FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 5. TABLA: pagos
-- =====================================================
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven sus propios pagos, admins ven todos
CREATE POLICY "Usuarios ven sus propios pagos"
ON pagos FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Usuarios pueden crear solicitudes de pago (estado pendiente), admins pueden crear cualquier pago
CREATE POLICY "Usuarios pueden solicitar pagos"
ON pagos FOR INSERT
WITH CHECK (
  (usuario_id = get_current_user_id() AND estado = 'pendiente') OR
  is_admin(get_current_user_id())
);

-- Política: UPDATE - Usuarios pueden actualizar sus pagos pendientes (subir comprobantes), admins pueden actualizar todos
CREATE POLICY "Usuarios pueden actualizar sus pagos pendientes"
ON pagos FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Si no es admin, solo puede actualizar campos específicos y mantener estado pendiente
  (usuario_id = get_current_user_id() AND estado = 'pendiente') OR
  is_admin(get_current_user_id())
);

-- Política: DELETE - Solo administradores pueden eliminar pagos
CREATE POLICY "Solo admins pueden eliminar pagos"
ON pagos FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 6. TABLA: historial_pagos
-- =====================================================
ALTER TABLE historial_pagos ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven historial de sus pagos, admins ven todo
CREATE POLICY "Usuarios ven historial de sus pagos"
ON historial_pagos FOR SELECT
USING (
  pago_id IN (SELECT id FROM pagos WHERE usuario_id = get_current_user_id()) OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Solo sistema (via triggers) y administradores
CREATE POLICY "Solo sistema y admins insertan historial"
ON historial_pagos FOR INSERT
WITH CHECK (
  usuario_actor_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: UPDATE/DELETE - Solo administradores
CREATE POLICY "Solo admins modifican historial"
ON historial_pagos FOR UPDATE
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

CREATE POLICY "Solo admins eliminan historial"
ON historial_pagos FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 7. TABLA: anuncios
-- =====================================================
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven anuncios de su condominio y anuncios públicos, admins ven todos
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

-- Política: INSERT - Usuarios pueden crear anuncios en su condominio, admins en cualquier lado
CREATE POLICY "Usuarios pueden crear anuncios"
ON anuncios FOR INSERT
WITH CHECK (
  (autor_usuario_id = get_current_user_id() AND 
   condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id())) OR
  is_admin(get_current_user_id())
);

-- Política: UPDATE - Solo autor o administrador pueden actualizar
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

-- Política: DELETE - Solo autor o administrador pueden eliminar
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

-- Política: SELECT - Todos pueden ver espacios comunes activos de su condominio
CREATE POLICY "Usuarios ven espacios comunes"
ON espacios_comunes FOR SELECT
USING (
  (activo = true AND (
    condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = get_current_user_id()) OR
    condominio_id IS NULL
  )) OR
  is_admin(get_current_user_id())
);

-- Política: INSERT/UPDATE/DELETE - Solo administradores
CREATE POLICY "Solo admins gestionan espacios comunes"
ON espacios_comunes FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- 9. TABLA: reservas_espacios
-- =====================================================
ALTER TABLE reservas_espacios ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven sus reservas y reservas aprobadas del mismo espacio, admins ven todas
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

-- Política: INSERT - Usuarios pueden crear reservas
CREATE POLICY "Usuarios pueden crear reservas"
ON reservas_espacios FOR INSERT
WITH CHECK (
  usuario_id = get_current_user_id() AND
  estado = 'pendiente'
);

-- Política: UPDATE - Usuarios pueden actualizar/cancelar sus reservas pendientes, admins pueden aprobar/rechazar
CREATE POLICY "Usuarios pueden gestionar sus reservas"
ON reservas_espacios FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Si es el usuario, solo puede cancelar (estado = 'cancelado')
  (usuario_id = get_current_user_id() AND estado = 'cancelado') OR
  is_admin(get_current_user_id())
);

-- Política: DELETE - Solo administradores pueden eliminar reservas
CREATE POLICY "Solo admins pueden eliminar reservas"
ON reservas_espacios FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 10. TABLA: solicitudes_mantenimiento
-- =====================================================
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven sus solicitudes, conserjes ven todas del condominio, admins ven todas
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

-- Política: INSERT - Usuarios pueden crear solicitudes
CREATE POLICY "Usuarios pueden crear solicitudes"
ON solicitudes_mantenimiento FOR INSERT
WITH CHECK (
  usuario_solicitante_id = get_current_user_id() AND
  estado = 'pendiente'
);

-- Política: UPDATE - Usuarios pueden actualizar sus solicitudes pendientes, conserjes y admins pueden actualizar todas
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
  -- Si es el usuario solicitante, solo puede actualizar campos específicos mientras está pendiente
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

-- Política: DELETE - Solo administradores pueden eliminar solicitudes
CREATE POLICY "Solo admins pueden eliminar solicitudes"
ON solicitudes_mantenimiento FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 11. TABLA: archivos
-- =====================================================
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven sus propios archivos, admins ven todos
CREATE POLICY "Usuarios ven sus archivos"
ON archivos FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Usuarios pueden subir sus propios archivos
CREATE POLICY "Usuarios pueden subir archivos"
ON archivos FOR INSERT
WITH CHECK (usuario_id = get_current_user_id());

-- Política: UPDATE - Solo propietario o admin pueden actualizar
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

-- Política: DELETE - Solo propietario o admin pueden eliminar
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

-- Política: SELECT - Usuarios ven solo sus notificaciones
CREATE POLICY "Usuarios ven solo sus notificaciones"
ON notificaciones FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Sistema y administradores pueden crear notificaciones
CREATE POLICY "Sistema y admins pueden crear notificaciones"
ON notificaciones FOR INSERT
WITH CHECK (true);

-- Política: UPDATE - Usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Usuarios pueden actualizar sus notificaciones"
ON notificaciones FOR UPDATE
USING (usuario_id = get_current_user_id())
WITH CHECK (usuario_id = get_current_user_id());

-- Política: DELETE - Usuarios pueden eliminar sus notificaciones, admins pueden eliminar todas
CREATE POLICY "Usuarios pueden eliminar sus notificaciones"
ON notificaciones FOR DELETE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- =====================================================
-- 13. TABLA: ordenes (si existe para reservas de libros/documentos)
-- =====================================================
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Usuarios ven sus propias órdenes, admins ven todas
CREATE POLICY "Usuarios ven sus órdenes"
ON ordenes FOR SELECT
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
);

-- Política: INSERT - Usuarios pueden crear órdenes
CREATE POLICY "Usuarios pueden crear órdenes"
ON ordenes FOR INSERT
WITH CHECK (usuario_id = get_current_user_id());

-- Política: UPDATE - Usuarios pueden actualizar sus órdenes pendientes, admins pueden actualizar todas
CREATE POLICY "Usuarios pueden actualizar sus órdenes"
ON ordenes FOR UPDATE
USING (
  usuario_id = get_current_user_id() OR
  is_admin(get_current_user_id())
)
WITH CHECK (
  -- Si no es admin, solo puede actualizar órdenes propias con estado pendiente
  (usuario_id = get_current_user_id() AND estado IN ('pendiente', 'cancelado')) OR
  is_admin(get_current_user_id())
);

-- Política: DELETE - Solo administradores pueden eliminar órdenes
CREATE POLICY "Solo admins pueden eliminar órdenes"
ON ordenes FOR DELETE
USING (is_admin(get_current_user_id()));

-- =====================================================
-- 14. TABLA: tipos_residencia
-- =====================================================
ALTER TABLE tipos_residencia ENABLE ROW LEVEL SECURITY;

-- Política: SELECT - Todos pueden ver tipos de residencia
CREATE POLICY "Todos pueden ver tipos de residencia"
ON tipos_residencia FOR SELECT
USING (true);

-- Política: INSERT/UPDATE/DELETE - Solo administradores
CREATE POLICY "Solo admins gestionan tipos de residencia"
ON tipos_residencia FOR ALL
USING (is_admin(get_current_user_id()))
WITH CHECK (is_admin(get_current_user_id()));

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Las funciones get_current_user_id(), is_admin(), y same_condominio() 
--    necesitan ser adaptadas según tu método de autenticación.
--
-- 2. Si usas Supabase Auth con auth.uid(), puedes reemplazar get_current_user_id() 
--    con: (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)
--
-- 3. Si almacenas el user_id en una variable de sesión, usa:
--    current_setting('app.current_user_id', true)::integer
--
-- 4. Para probar las políticas, puedes usar:
--    SET LOCAL app.current_user_id = '123';
--    SELECT * FROM usuarios;
--
-- 5. Asegúrate de que las funciones auxiliares tengan SECURITY DEFINER 
--    para que puedan ejecutarse con permisos elevados.
--
-- 6. Estas políticas asumen que:
--    - Los usuarios tienen un campo 'rol' que puede ser: admin, propietario, residente, conserje, invitado
--    - Los usuarios tienen un campo 'condominio_id' que los relaciona con un condominio
--    - Los usuarios autenticados pueden ser identificados mediante get_current_user_id()
--
-- 7. RECOMENDACIÓN: Prueba las políticas en un entorno de desarrollo antes de 
--    aplicarlas en producción. Puedes deshabilitar RLS temporalmente si es necesario:
--    ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;

