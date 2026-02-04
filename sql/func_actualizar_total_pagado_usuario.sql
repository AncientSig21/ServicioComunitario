-- =====================================================
-- Función: actualizar_total_pagado_usuario
-- Actualiza usuarios.total_pagado con la suma (abono + excedente)
-- de TODOS los pagos del usuario. Ejecuta con SECURITY DEFINER
-- para que RLS no bloquee la actualización cuando un admin valida.
-- =====================================================
-- Requiere: columnas pagos.abono, pagos.excedente (opcional),
--           usuarios.total_pagado.
-- Uso desde la app: supabase.rpc('actualizar_total_pagado_usuario', { usuario_id: 123 })
-- =====================================================

-- Asegurar columna total_pagado en usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'total_pagado'
  ) THEN
    ALTER TABLE public.usuarios
    ADD COLUMN total_pagado DECIMAL(14, 2) DEFAULT 0;
    COMMENT ON COLUMN public.usuarios.total_pagado IS 'Suma de (abono + excedente) de todos los pagos del usuario.';
  END IF;
END $$;

-- Función que actualiza total_pagado para un usuario (SECURITY DEFINER = no aplica RLS)
CREATE OR REPLACE FUNCTION public.actualizar_total_pagado_usuario(p_usuario_id INTEGER)
RETURNS DECIMAL(14, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total DECIMAL(14, 2);
BEGIN
  IF p_usuario_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Suma (abono + excedente) de todos los pagos del usuario (misma lógica que obtenerTotalPagadoDesdePagos)
  BEGIN
    SELECT COALESCE(SUM(
      COALESCE(CAST(abono AS DECIMAL(14, 2)), COALESCE(CAST(monto_pagado AS DECIMAL(14, 2)), 0)) +
      COALESCE(CAST(excedente AS DECIMAL(14, 2)), 0)
    ), 0)
    INTO v_total
    FROM public.pagos
    WHERE usuario_id = p_usuario_id;
  EXCEPTION
    WHEN SQLSTATE '42703' THEN  -- undefined_column
      -- Columna excedente no existe: sumar solo abono/monto_pagado
      SELECT COALESCE(SUM(COALESCE(CAST(abono AS DECIMAL(14, 2)), COALESCE(CAST(monto_pagado AS DECIMAL(14, 2)), 0)), 0)
      INTO v_total
      FROM public.pagos
      WHERE usuario_id = p_usuario_id;
  END;

  v_total := ROUND(COALESCE(v_total, 0)::numeric, 2);

  UPDATE public.usuarios
  SET total_pagado = v_total,
      updated_at = COALESCE(updated_at, NOW())
  WHERE id = p_usuario_id;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.actualizar_total_pagado_usuario(INTEGER) IS
  'Actualiza usuarios.total_pagado con la suma (abono+excedente) de todos los pagos del usuario. SECURITY DEFINER para evitar bloqueo por RLS.';

-- Permitir que usuarios autenticados (incl. admin) llamen la función
GRANT EXECUTE ON FUNCTION public.actualizar_total_pagado_usuario(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_total_pagado_usuario(INTEGER) TO service_role;
