-- =====================================================
-- Sincronizar total_pagado para TODOS los usuarios
-- Recalcula usuarios.total_pagado con la suma (abono + excedente)
-- de TODOS los pagos de cada usuario. Ejecutar UNA VEZ para
-- corregir datos existentes o después de migraciones.
-- =====================================================
-- Requiere: func_actualizar_total_pagado_usuario.sql ya ejecutado,
--           o que existan columnas pagos.abono, pagos.excedente (opcional),
--           usuarios.total_pagado.
-- =====================================================

-- Opción A: Si ya tienes la función actualizar_total_pagado_usuario, llamarla para cada usuario
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.usuarios
  LOOP
    PERFORM public.actualizar_total_pagado_usuario(r.id);
  END LOOP;
END $$;

-- Opción B (alternativa si la función no existe): UPDATE directo
-- Descomenta y ejecuta solo si NO tienes la función actualizar_total_pagado_usuario:
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'excedente'
  ) THEN
    UPDATE public.usuarios u
    SET total_pagado = COALESCE(ROUND((
      SELECT SUM(COALESCE(CAST(p.abono AS DECIMAL(14,2)), COALESCE(CAST(p.monto_pagado AS DECIMAL(14,2)), 0)) + COALESCE(CAST(p.excedente AS DECIMAL(14,2)), 0))
      FROM public.pagos p WHERE p.usuario_id = u.id
    )::numeric, 2), 0),
    updated_at = COALESCE(updated_at, NOW());
  ELSE
    UPDATE public.usuarios u
    SET total_pagado = COALESCE(ROUND((
      SELECT SUM(COALESCE(CAST(p.abono AS DECIMAL(14,2)), COALESCE(CAST(p.monto_pagado AS DECIMAL(14,2)), 0)))
      FROM public.pagos p WHERE p.usuario_id = u.id
    )::numeric, 2), 0),
    updated_at = COALESCE(updated_at, NOW());
  END IF;
END $$;
*/
