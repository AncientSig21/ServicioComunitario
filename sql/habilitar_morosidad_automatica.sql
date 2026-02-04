-- =====================================================
-- Morosidad automática: permitir que la app llame
-- actualizar_usuarios_morosos() al cargar.
-- Así, cuando pasa la fecha de vencimiento de una cuota,
-- el usuario queda Moroso en la siguiente carga de la app.
-- =====================================================
-- La función actualizar_usuarios_morosos() debe existir
-- (está en database_schema.sql). Si tu tabla usuarios usa
-- la columna "Estado" (E mayúscula), actualiza la función
-- para usar SET "Estado" = 'Moroso' en lugar de estado.
-- =====================================================

-- Permitir que usuarios autenticados y el servicio llamen la función
GRANT EXECUTE ON FUNCTION public.actualizar_usuarios_morosos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_usuarios_morosos() TO service_role;
