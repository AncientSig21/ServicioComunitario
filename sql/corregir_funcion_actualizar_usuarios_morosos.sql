-- =====================================================
-- Corregir función actualizar_usuarios_morosos
-- Para que el mantenimiento marque correctamente usuarios morosos
-- =====================================================
-- Problemas que corrige:
-- 1. SECURITY DEFINER: la función se ejecuta con privilegios del dueño
--    y no depende de RLS (así el admin puede actualizar todos los usuarios
--    aunque su rol no sea exactamente 'admin').
-- 2. Columna "Estado": si tu tabla usuarios tiene la columna con E mayúscula
--    (Estado), esta versión la usa. Si tu columna es minúscula (estado),
--    al final del archivo hay una versión alternativa comentada.
-- =====================================================

CREATE OR REPLACE FUNCTION public.actualizar_usuarios_morosos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Marcar como Moroso a usuarios con al menos un pago vencido o pendiente vencido
    UPDATE usuarios
    SET "Estado" = 'Moroso'
    WHERE id IN (
        SELECT DISTINCT p.usuario_id
        FROM pagos p
        WHERE p.estado IN ('vencido', 'pendiente')
          AND p.fecha_vencimiento < CURRENT_DATE
    )
    AND COALESCE("Estado", '') IS DISTINCT FROM 'Moroso';

    -- Marcar como Activo a quienes ya no tienen pagos vencidos
    UPDATE usuarios
    SET "Estado" = 'Activo'
    WHERE id NOT IN (
        SELECT DISTINCT p.usuario_id
        FROM pagos p
        WHERE p.estado IN ('vencido', 'pendiente')
          AND p.fecha_vencimiento < CURRENT_DATE
    )
    AND "Estado" = 'Moroso';
END;
$$;

-- Si tu columna es minúscula (estado), comenta el bloque anterior y ejecuta este:
/*
CREATE OR REPLACE FUNCTION public.actualizar_usuarios_morosos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE usuarios
    SET estado = 'Moroso'
    WHERE id IN (
        SELECT DISTINCT p.usuario_id
        FROM pagos p
        WHERE p.estado IN ('vencido', 'pendiente')
          AND p.fecha_vencimiento < CURRENT_DATE
    )
    AND estado IS DISTINCT FROM 'Moroso';

    UPDATE usuarios
    SET estado = 'Activo'
    WHERE id NOT IN (
        SELECT DISTINCT p.usuario_id
        FROM pagos p
        WHERE p.estado IN ('vencido', 'pendiente')
          AND p.fecha_vencimiento < CURRENT_DATE
    )
    AND estado = 'Moroso';
END;
$$;
*/

-- Mantener permisos para que la app pueda llamar la función
GRANT EXECUTE ON FUNCTION public.actualizar_usuarios_morosos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_usuarios_morosos() TO service_role;
